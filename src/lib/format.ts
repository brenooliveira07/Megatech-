export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export const dateBr = (s: string) =>
  new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const dateTimeBr = (s: string) =>
  new Date(s).toLocaleString("pt-BR");