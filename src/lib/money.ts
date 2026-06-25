export function formatCents(valueInCents: number) {
  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    style: 'currency',
  }).format(valueInCents / 100);
}

export function centsToInputValue(valueInCents?: number | null) {
  if (typeof valueInCents !== 'number') {
    return '';
  }

  return (valueInCents / 100).toFixed(2).replace('.', ',');
}
