// Utilitários de formatação de valores monetários e percentuais

export const formatCurrencyInput = (val: string): string => {
  if (!val || !val.trim()) return '';
  const clean = val.trim().replace('R$', '').trim();
  if (!clean) return '';
  const num = parseFloat(clean.replace(',', '.'));
  if (isNaN(num)) return val;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatPercentInput = (val: string): string => {
  if (!val || !val.trim()) return '';
  const clean = val.trim().replace('%', '').trim();
  if (!clean) return '';
  const num = parseFloat(clean.replace(',', '.'));
  if (isNaN(num)) return val;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
