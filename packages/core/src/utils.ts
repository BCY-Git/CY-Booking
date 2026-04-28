export function createSourceHash(parts: Array<string | number | undefined>): string {
  const input = parts
    .map((part) => String(part ?? '').trim().toLowerCase())
    .join('|');

  let hash = 5381;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 33) ^ input.charCodeAt(index);
  }

  return `h_${(hash >>> 0).toString(16)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatSignedAmount(direction: string, amount: number): string {
  const prefix = direction === 'income' ? '+' : direction === 'expense' ? '-' : '';
  return `${prefix}${formatCurrency(amount)}`;
}
