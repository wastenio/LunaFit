'use client';

import { AlertCircle, CheckCircle2, ExternalLink, Loader2, QrCode } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

type PaymentStatus =
  | 'PENDING'
  | 'IN_PROCESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REFUND_IN_PROCESS'
  | 'REFUNDED'
  | 'CHARGED_BACK'
  | 'UNKNOWN';

type PaymentResult = {
  orderNumber: string;
  orderUrl: string;
  paymentId: string | null;
  paymentStatus: PaymentStatus;
  providerStatus: string | null;
  statusDetail: string | null;
  qrCode: string;
  qrCodeBase64: string;
  ticketUrl: string;
  redirectUrl: string;
};

type MercadoPagoBrick = {
  unmount?: () => void;
};

type PaymentBrickSubmitData = {
  selectedPaymentMethod?: string;
  formData?: Record<string, unknown>;
};

type PaymentBrickOptions = {
  initialization: {
    amount: number;
    payer?: {
      email?: string;
    };
  };
  customization: {
    paymentMethods: {
      bankTransfer: 'all';
      creditCard: 'all';
      debitCard: 'all';
      mercadoPago: 'all';
      prepaidCard: 'all';
      ticket: 'all';
    };
  };
  callbacks: {
    onReady: () => void;
    onSubmit: (paymentData: PaymentBrickSubmitData) => Promise<void>;
    onError: (error: unknown) => void;
  };
};

type MercadoPagoBricksBuilder = {
  create: (
    type: 'payment',
    containerId: string,
    options: PaymentBrickOptions
  ) => Promise<MercadoPagoBrick>;
};

type MercadoPagoInstance = {
  bricks: () => MercadoPagoBricksBuilder;
};

declare global {
  interface Window {
    MercadoPago?: new (
      publicKey: string,
      options?: { locale?: string }
    ) => MercadoPagoInstance;
  }
}

const mercadoPagoSdkUrl = 'https://sdk.mercadopago.com/js/v2';
let mercadoPagoScriptPromise: Promise<void> | null = null;

function loadMercadoPagoSdk() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (window.MercadoPago) {
    return Promise.resolve();
  }

  if (!mercadoPagoScriptPromise) {
    mercadoPagoScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src="${mercadoPagoSdkUrl}"]`
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('SDK_LOAD_FAILED')), {
          once: true,
        });
        return;
      }

      const script = document.createElement('script');
      script.src = mercadoPagoSdkUrl;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('SDK_LOAD_FAILED'));
      document.body.appendChild(script);
    });
  }

  return mercadoPagoScriptPromise;
}

function getResultTitle(result: PaymentResult) {
  switch (result.paymentStatus) {
    case 'APPROVED':
      return 'Pagamento aprovado';
    case 'IN_PROCESS':
      return 'Pagamento em analise';
    case 'REJECTED':
      return 'Pagamento recusado';
    case 'CANCELLED':
      return 'Pagamento cancelado';
    case 'PENDING':
      return 'Pagamento gerado';
    default:
      return 'Pagamento registrado';
  }
}

function getResultMessage(result: PaymentResult) {
  switch (result.paymentStatus) {
    case 'APPROVED':
      return 'Recebemos a confirmacao do Mercado Pago. Voce ja pode acompanhar o pedido.';
    case 'IN_PROCESS':
      return 'O Mercado Pago esta analisando a transacao. O pedido sera atualizado automaticamente.';
    case 'REJECTED':
      return 'Nao foi possivel aprovar esse pagamento. Tente novamente com outro metodo.';
    case 'CANCELLED':
      return 'Esse pagamento foi cancelado. Voce pode tentar novamente com outro metodo.';
    case 'PENDING':
      return 'Conclua o pagamento no metodo escolhido. Assim que o Mercado Pago confirmar, o pedido sera atualizado.';
    default:
      return 'O status foi recebido do Mercado Pago. Acompanhe a atualizacao do pedido.';
  }
}

function canRetryPayment(result: PaymentResult | null) {
  return (
    result?.paymentStatus === 'REJECTED' ||
    result?.paymentStatus === 'CANCELLED' ||
    result?.paymentStatus === 'UNKNOWN'
  );
}

function getSubmitFormData(paymentData: PaymentBrickSubmitData) {
  return paymentData.formData ?? (paymentData as Record<string, unknown>);
}

function asString(value: unknown) {
  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}

function getPaymentMethodId(formData: Record<string, unknown>, selectedPaymentMethod?: string) {
  return (
    asString(formData.payment_method_id) ||
    asString(formData.paymentMethodId) ||
    asString(selectedPaymentMethod)
  );
}

export function MercadoPagoPaymentBrick({
  amount,
  customerEmail,
  orderNumber,
  publicKey,
}: {
  amount: number;
  customerEmail: string;
  orderNumber: string;
  publicKey: string;
}) {
  const reactId = useId();
  const containerId = useMemo(
    () => `mercado-pago-payment-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [reactId]
  );
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [identificationType, setIdentificationType] = useState<'CPF' | 'CNPJ'>('CPF');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const identificationTypeRef = useRef(identificationType);
  const identificationNumberRef = useRef(identificationNumber);
  const shouldHideBrick = Boolean(result && !canRetryPayment(result));

  useEffect(() => {
    identificationTypeRef.current = identificationType;
    identificationNumberRef.current = identificationNumber;
  }, [identificationNumber, identificationType]);

  useEffect(() => {
    let isMounted = true;
    let brick: MercadoPagoBrick | null = null;

    async function renderPaymentBrick() {
      setStatus('loading');

      try {
        await loadMercadoPagoSdk();

        if (!isMounted || !window.MercadoPago) {
          return;
        }

        const mercadoPago = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        const bricksBuilder = mercadoPago.bricks();
        brick = await bricksBuilder.create('payment', containerId, {
          callbacks: {
            onError: () => {
              if (isMounted) {
                setStatus('error');
              }
            },
            onReady: () => {
              if (isMounted) {
                setStatus('ready');
              }
            },
            onSubmit: async (paymentData) => {
              setSubmitError(null);
              setIsSubmitting(true);

              try {
                const formData = getSubmitFormData(paymentData);
                const paymentMethodId = getPaymentMethodId(
                  formData,
                  paymentData.selectedPaymentMethod
                );
                const currentIdentificationType = identificationTypeRef.current;
                const cleanIdentificationNumber =
                  identificationNumberRef.current.replace(/\D/g, '');

                if (paymentMethodId === 'pix' && !cleanIdentificationNumber) {
                  throw new Error('Informe o CPF ou CNPJ do titular para gerar o Pix.');
                }

                const response = await fetch(
                  `/api/orders/${encodeURIComponent(orderNumber)}/payments`,
                  {
                    body: JSON.stringify({
                      formData,
                      payerIdentification: cleanIdentificationNumber
                        ? {
                            number: cleanIdentificationNumber,
                            type: currentIdentificationType,
                          }
                        : undefined,
                      selectedPaymentMethod: paymentData.selectedPaymentMethod,
                    }),
                    headers: { 'Content-Type': 'application/json' },
                    method: 'POST',
                  }
                );
                const data = (await response.json().catch(() => null)) as
                  | PaymentResult
                  | { error?: string }
                  | null;

                if (!response.ok) {
                  throw new Error(data && 'error' in data ? data.error : undefined);
                }

                if (isMounted) {
                  setResult(data as PaymentResult);
                }
              } catch (error) {
                const message =
                  error instanceof Error && error.message
                    ? error.message
                    : 'Nao foi possivel processar o pagamento agora.';

                if (isMounted) {
                  setSubmitError(message);
                }

                throw error;
              } finally {
                if (isMounted) {
                  setIsSubmitting(false);
                }
              }
            },
          },
          customization: {
            paymentMethods: {
              bankTransfer: 'all',
              creditCard: 'all',
              debitCard: 'all',
              mercadoPago: 'all',
              prepaidCard: 'all',
              ticket: 'all',
            },
          },
          initialization: {
            amount,
            payer: customerEmail ? { email: customerEmail } : undefined,
          },
        });

        if (!isMounted) {
          brick.unmount?.();
        }
      } catch {
        if (isMounted) {
          setStatus('error');
        }
      }
    }

    renderPaymentBrick();

    return () => {
      isMounted = false;
      brick?.unmount?.();
    };
  }, [amount, containerId, customerEmail, orderNumber, publicKey]);

  return (
    <div className="min-h-[380px]">
      {result ? (
        <div
          className={`mb-5 border px-4 py-4 text-sm ${
            canRetryPayment(result)
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          <div className="flex items-start gap-3">
            {canRetryPayment(result) ? (
              <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{getResultTitle(result)}</p>
              <p className="mt-1 leading-6">{getResultMessage(result)}</p>
              <a
                href={result.orderUrl}
                className="mt-3 inline-flex font-semibold text-zinc-900 hover:text-rose-700"
              >
                Acompanhar pedido
              </a>
            </div>
          </div>

          {result.qrCodeBase64 || result.qrCode || result.ticketUrl ? (
            <div className="mt-5 border-t border-current/20 pt-5">
              {result.qrCodeBase64 ? (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Image
                    src={`data:image/png;base64,${result.qrCodeBase64}`}
                    alt="QR Code Pix"
                    height={160}
                    unoptimized
                    width={160}
                    className="h-40 w-40 border border-white bg-white object-contain p-2"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      <QrCode aria-hidden="true" className="h-5 w-5" />
                      Pix copia e cola
                    </div>
                    {result.qrCode ? (
                      <textarea
                        aria-label="Codigo Pix copia e cola"
                        className="mt-3 h-24 w-full min-w-0 resize-none border border-zinc-300 bg-white p-3 font-mono text-xs text-zinc-700 sm:w-80"
                        readOnly
                        value={result.qrCode}
                      />
                    ) : null}
                  </div>
                </div>
              ) : null}

              {result.ticketUrl ? (
                <a
                  href={result.ticketUrl}
                  rel="noreferrer"
                  target="_blank"
                  className="mt-4 inline-flex items-center gap-2 border border-zinc-900 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  Abrir boleto ou comprovante
                  <ExternalLink aria-hidden="true" className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {status === 'loading' ? (
        <div className="flex min-h-[96px] items-center justify-center gap-2 border border-zinc-200 bg-white px-4 py-5 text-sm font-semibold text-zinc-600">
          <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-rose-600" />
          Carregando formas de pagamento...
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Nao foi possivel carregar o Mercado Pago agora. Atualize a pagina e tente novamente.
          </p>
        </div>
      ) : null}
      {submitError ? (
        <div className="mb-4 flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{submitError}</p>
        </div>
      ) : null}
      {!shouldHideBrick ? (
        <div className="mb-5 grid gap-3 border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-[120px_1fr]">
          <label className="text-sm font-semibold text-zinc-950">
            Documento
            <select
              className="mt-2 h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-950"
              onChange={(event) => setIdentificationType(event.target.value as 'CPF' | 'CNPJ')}
              value={identificationType}
            >
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
            </select>
          </label>
          <label className="text-sm font-semibold text-zinc-950">
            CPF ou CNPJ do titular
            <input
              className="mt-2 h-11 w-full border border-zinc-300 bg-white px-3 text-sm text-zinc-950"
              inputMode="numeric"
              maxLength={18}
              onChange={(event) => setIdentificationNumber(event.target.value)}
              placeholder="Somente numeros"
              value={identificationNumber}
            />
          </label>
        </div>
      ) : null}
      {isSubmitting ? (
        <div className="mb-4 flex items-center gap-2 border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-600">
          <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin text-rose-600" />
          Processando com o Mercado Pago...
        </div>
      ) : null}
      <div
        id={containerId}
        className={status === 'error' || shouldHideBrick ? 'hidden' : undefined}
      />
    </div>
  );
}
