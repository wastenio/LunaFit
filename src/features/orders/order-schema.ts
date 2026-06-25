export type CheckoutInput = {
  customerName: string;
  phone: string;
  postalCode: string;
  addressLine: string;
  addressNumber: string;
  addressComplement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  notes: string | null;
};

type CheckoutResult =
  | { success: true; data: CheckoutInput }
  | { success: false; error: string };

function readText(source: Record<string, unknown>, key: string) {
  return typeof source[key] === 'string' ? source[key].trim() : '';
}

export function parseCheckoutInput(source: Record<string, unknown>): CheckoutResult {
  const customerName = readText(source, 'customerName');
  const phone = readText(source, 'phone').replace(/[^\d+]/g, '');
  const postalCode = readText(source, 'postalCode').replace(/\D/g, '');
  const addressLine = readText(source, 'addressLine');
  const addressNumber = readText(source, 'addressNumber');
  const addressComplement = readText(source, 'addressComplement') || null;
  const neighborhood = readText(source, 'neighborhood');
  const city = readText(source, 'city');
  const state = readText(source, 'state').toUpperCase();
  const notes = readText(source, 'notes') || null;

  if (customerName.length < 3) {
    return { success: false, error: 'Informe o nome completo.' };
  }

  if (customerName.length > 120) {
    return { success: false, error: 'O nome informado e muito longo.' };
  }

  if (phone.replace(/\D/g, '').length < 10) {
    return { success: false, error: 'Informe um telefone valido com DDD.' };
  }

  if (postalCode.length !== 8) {
    return { success: false, error: 'Informe um CEP com 8 digitos.' };
  }

  if (addressLine.length < 3 || !addressNumber) {
    return { success: false, error: 'Informe o endereco e o numero.' };
  }

  if (
    addressLine.length > 160 ||
    addressNumber.length > 30 ||
    (addressComplement?.length ?? 0) > 120 ||
    neighborhood.length > 100 ||
    city.length > 100 ||
    (notes?.length ?? 0) > 1000
  ) {
    return { success: false, error: 'Um ou mais campos excedem o tamanho permitido.' };
  }

  if (!neighborhood || !city || !/^[A-Z]{2}$/.test(state)) {
    return { success: false, error: 'Complete bairro, cidade e UF.' };
  }

  return {
    success: true,
    data: {
      customerName,
      phone,
      postalCode,
      addressLine,
      addressNumber,
      addressComplement,
      neighborhood,
      city,
      state,
      notes,
    },
  };
}
