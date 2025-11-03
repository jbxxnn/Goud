export function formatEuroCents(valueCents: number): string {
  const euros = (valueCents || 0) / 100;
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(euros);
}







