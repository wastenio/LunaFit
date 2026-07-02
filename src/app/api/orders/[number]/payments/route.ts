import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { getCustomerSession } from '@/lib/customer-auth';
import { getMercadoPagoPaymentClient, isMercadoPagoConfigured } from '@/lib/mercado-pago';
import { getPrisma } from '@/lib/prisma';
import { applyMercadoPagoPaymentUpdate } from '@/features/payments/payment-updates';
import { mapMercadoPagoStatus } from '@/features/payments/payment-status';

export const runtime = 'nodejs';

type PaymentRouteProps = {
  params: Promise<{
    number: string;
  }>;
};

type MercadoPagoPaymentBody = Parameters<
  ReturnType<typeof getMercadoPagoPaymentClient>['create']
>[0]['body'];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return '';
}

function asNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function centsToAmount(cents: number) {
  return Number((cents / 100).toFixed(2));
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function splitName(fullName: string) {
  const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
  const name = parts.shift() || fullName;

  return {
    name,
    surname: parts.join(' ') || undefined,
  };
}

function splitPhone(phone: string) {
  const digits = onlyDigits(phone);

  if (digits.length >= 10) {
    return {
      area_code: digits.slice(0, 2),
      number: digits.slice(2),
    };
  }

  return { number: digits || phone };
}

function getAppBaseUrl(requestUrl: string) {
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    new URL(requestUrl).origin;

  return configuredUrl.replace(/\/+$/, '');
}

function getNotificationUrl(requestUrl: string) {
  const baseUrl = getAppBaseUrl(requestUrl);

  if (!baseUrl.startsWith('https://')) {
    return undefined;
  }

  return `${baseUrl}/api/webhooks/mercadopago`;
}

function getPaymentMethodId(formData: Record<string, unknown>) {
  return (
    asString(formData.payment_method_id) ||
    asString(formData.paymentMethodId) ||
    asString(formData.selected_payment_method) ||
    asString(formData.selectedPaymentMethod)
  );
}

function getIdentification(formData: Record<string, unknown>) {
  const payer = asRecord(formData.payer) ?? {};
  const identification = asRecord(payer.identification) ?? asRecord(formData.identification) ?? {};
  const type =
    asString(identification.type) ||
    asString(formData.identification_type) ||
    asString(formData.identificationType);
  const number =
    asString(identification.number) ||
    asString(formData.identification_number) ||
    asString(formData.identificationNumber);

  if (!type || !number) {
    return undefined;
  }

  return { type, number: onlyDigits(number) || number };
}

function getPayerIdentification(body: Record<string, unknown> | null) {
  const payerIdentification = asRecord(body?.payerIdentification);
  const type = asString(payerIdentification?.type);
  const number = asString(payerIdentification?.number);

  if (!type || !number) {
    return undefined;
  }

  return { type, number: onlyDigits(number) || number };
}

function getPaymentUrls(payment: Record<string, unknown>) {
  const pointOfInteraction = asRecord(payment.point_of_interaction);
  const transactionData = asRecord(pointOfInteraction?.transaction_data);
  const transactionDetails = asRecord(payment.transaction_details);
  const ticketUrl =
    asString(transactionData?.ticket_url) ||
    asString(transactionDetails?.external_resource_url) ||
    asString(transactionDetails?.ticket_url);

  return {
    qrCode: asString(transactionData?.qr_code),
    qrCodeBase64: asString(transactionData?.qr_code_base64),
    ticketUrl,
    redirectUrl: ticketUrl,
  };
}

function getMercadoPagoErrorMessage(error: unknown) {
  const record = asRecord(error);
  const cause = record?.cause;

  if (Array.isArray(cause)) {
    const descriptions = cause
      .map((item) => {
        const causeItem = asRecord(item);
        return (
          asString(causeItem?.description) ||
          asString(causeItem?.message) ||
          asString(causeItem?.code)
        );
      })
      .filter(Boolean);

    if (descriptions.length > 0) {
      return descriptions.join(' ');
    }
  }

  return error instanceof Error ? error.message : '';
}

export async function POST(request: Request, { params }: PaymentRouteProps) {
  const session = await getCustomerSession();

  if (!session) {
    return NextResponse.json({ error: 'Faca login para pagar o pedido.' }, { status: 401 });
  }

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { error: 'O pagamento online ainda nao esta configurado.' },
      { status: 503 }
    );
  }

  const { number } = await params;
  const body = asRecord(await request.json().catch(() => null));
  const formData = asRecord(body?.formData) ?? body;

  if (!formData) {
    return NextResponse.json({ error: 'Dados de pagamento invalidos.' }, { status: 400 });
  }

  const paymentMethodId =
    getPaymentMethodId(formData) || asString(body?.selectedPaymentMethod);

  if (!paymentMethodId) {
    return NextResponse.json({ error: 'Selecione uma forma de pagamento.' }, { status: 400 });
  }

  const prisma = getPrisma();
  const order = await prisma.order.findFirst({
    include: {
      items: {
        orderBy: { id: 'asc' },
      },
    },
    where: {
      number,
      userId: session.user.id,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Pedido nao encontrado.' }, { status: 404 });
  }

  if (
    order.status === 'CANCELLED' ||
    order.status === 'COMPLETED' ||
    order.paymentStatus === 'APPROVED' ||
    order.paymentStatus === 'REFUNDED' ||
    order.paymentStatus === 'CHARGED_BACK'
  ) {
    return NextResponse.json(
      { error: 'Este pedido nao aceita mais pagamento.' },
      { status: 409 }
    );
  }

  const payerFromBrick = asRecord(formData.payer) ?? {};
  const customerName = splitName(order.customerName);
  const payer: Record<string, unknown> = {
    ...payerFromBrick,
    address: {
      city: order.city,
      federal_unit: order.state,
      neighborhood: order.neighborhood,
      street_name: order.addressLine,
      street_number: order.addressNumber,
      zip_code: onlyDigits(order.postalCode),
      ...(asRecord(payerFromBrick.address) ?? {}),
    },
    email: asString(payerFromBrick.email) || asString(formData.email) || order.customerEmail,
    first_name: asString(payerFromBrick.first_name) || customerName.name,
    last_name: asString(payerFromBrick.last_name) || customerName.surname,
    phone: {
      ...splitPhone(order.phone),
      ...(asRecord(payerFromBrick.phone) ?? {}),
    },
  };
  const identification = getIdentification(formData) ?? getPayerIdentification(body);

  if (identification) {
    payer.identification = identification;
  }

  const paymentBody: Record<string, unknown> = {
    additional_info: {
      items: [
        ...order.items.map((item) => ({
          id: String(item.productId ?? item.id),
          title: item.productName,
          description: `${item.size} - ${item.color}`,
          quantity: item.quantity,
          unit_price: centsToAmount(item.unitPriceInCents),
        })),
        ...(order.shippingInCents > 0
          ? [
              {
                id: 'shipping',
                title: 'Frete',
                description:
                  order.shippingCarrierName && order.shippingServiceName
                    ? `${order.shippingCarrierName} - ${order.shippingServiceName}`
                    : 'Entrega',
                quantity: 1,
                unit_price: centsToAmount(order.shippingInCents),
              },
            ]
          : []),
      ],
      payer: {
        first_name: customerName.name,
        last_name: customerName.surname,
        phone: splitPhone(order.phone),
        address: {
          zip_code: onlyDigits(order.postalCode),
          street_name: order.addressLine,
          street_number: order.addressNumber,
        },
      },
    },
    description: `Pedido ${order.number} LunaFit`,
    external_reference: order.number,
    metadata: {
      order_id: order.id,
      order_number: order.number,
    },
    payer,
    payment_method_id: paymentMethodId,
    transaction_amount: centsToAmount(order.totalInCents),
  };
  const notificationUrl = getNotificationUrl(request.url);
  const token = asString(formData.token);
  const issuerId = asString(formData.issuer_id) || asString(formData.issuerId);
  const installments = asNumber(formData.installments);

  if (notificationUrl) {
    paymentBody.notification_url = notificationUrl;
  }

  if (token) {
    paymentBody.statement_descriptor = 'LUNAFIT';
    paymentBody.token = token;
  }

  if (issuerId) {
    paymentBody.issuer_id = issuerId;
  }

  if (installments) {
    paymentBody.installments = installments;
  }

  try {
    const payment = await getMercadoPagoPaymentClient().create({
      body: paymentBody as MercadoPagoPaymentBody,
      requestOptions: {
        idempotencyKey: `lunafit-payment-${order.number}-${randomUUID()}`,
      },
    });
    const updateResult = await applyMercadoPagoPaymentUpdate(payment);
    const paymentRecord = payment as unknown as Record<string, unknown>;
    const urls = getPaymentUrls(paymentRecord);
    const paymentStatus =
      'paymentStatus' in updateResult
        ? updateResult.paymentStatus
        : mapMercadoPagoStatus(payment.status);

    if (urls.redirectUrl) {
      await prisma.order.update({
        data: { paymentInitPoint: urls.redirectUrl },
        where: { id: order.id },
      });
    }

    return NextResponse.json({
      orderNumber: order.number,
      orderUrl: `/pedidos/${encodeURIComponent(order.number)}`,
      paymentId: payment.id ? String(payment.id) : null,
      paymentStatus,
      providerStatus: payment.status ?? null,
      statusDetail: payment.status_detail ?? null,
      ...urls,
    });
  } catch (error) {
    const mercadoPagoMessage = getMercadoPagoErrorMessage(error);

    console.error('[mercado-pago] payment creation failed', {
      orderNumber: order.number,
      paymentMethodId,
      error: mercadoPagoMessage || 'Unknown error',
    });

    return NextResponse.json(
      {
        error: mercadoPagoMessage
          ? `Mercado Pago: ${mercadoPagoMessage}`
          : 'Nao foi possivel criar o pagamento agora. Tente novamente.',
      },
      { status: 502 }
    );
  }
}
