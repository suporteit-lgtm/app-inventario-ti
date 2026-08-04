// Máscaras de digitação — formatam o texto conforme o usuário escreve.
// Todas são "tolerantes": aceitam apagar, colar valor já formatado e
// nunca travam a digitação (o excesso é simplesmente ignorado).

const dig = (v: string) => (v || '').replace(/\D/g, '');

/** 000.000.000-00 */
export const mascaraCpf = (v: string) => {
  const d = dig(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

/** 00.000.000/0000-00 */
export const mascaraCnpj = (v: string) => {
  const d = dig(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
};

/** (00) 00000-0000 — aceita fixo (8 dígitos) e celular (9 dígitos) */
export const mascaraTelefone = (v: string) => {
  const d = dig(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/** dd/mm/aaaa */
export const mascaraData = (v: string) => {
  const d = dig(v).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

/** 1.234,56 — valor monetário digitado da direita para a esquerda */
export const mascaraMoeda = (v: string) => {
  const d = dig(v).slice(0, 12);
  if (!d) return '';
  const centavos = d.padStart(3, '0');
  const inteiro = centavos.slice(0, -2).replace(/^0+(?=\d)/, '');
  const dec = centavos.slice(-2);
  return `${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec}`;
};

/** AA:BB:CC:DD:EE:FF */
export const mascaraMac = (v: string) => {
  const h = (v || '')
    .toUpperCase()
    .replace(/[^0-9A-F]/g, '')
    .slice(0, 12);
  return (h.match(/.{1,2}/g) || []).join(':');
};

/** 15 dígitos, apenas números */
export const mascaraImei = (v: string) => dig(v).slice(0, 15);

/** CEP: 00000-000 */
export const mascaraCep = (v: string) => {
  const d = dig(v).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
};

/** Deixa em maiúsculas, sem acentos gráficos perdidos (serial, patrimônio) */
export const mascaraMaiuscula = (v: string) => (v || '').toUpperCase();

/** E-mail: sem espaços e sempre minúsculo */
export const mascaraEmail = (v: string) => (v || '').replace(/\s/g, '').toLowerCase();

/* --------------------------- validações auxiliares -------------------------- */

export const cpfValido = (v: string): boolean => {
  const c = dig(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(c[i]) * (10 - i);
  let d1 = (soma * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== Number(c[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(c[i]) * (11 - i);
  let d2 = (soma * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === Number(c[10]);
};

export const cnpjValido = (v: string): boolean => {
  const c = dig(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (base: string, pesos: number[]) => {
    const soma = base.split('').reduce((s, n, i) => s + Number(n) * pesos[i], 0);
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(c.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc(c.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(c[12]) && d2 === Number(c[13]);
};

export const dataValida = (v: string): boolean => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v || '');
  if (!m) return false;
  const [dd, mm, aaaa] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mm < 1 || mm > 12 || dd < 1 || aaaa < 1900) return false;
  return dd <= new Date(aaaa, mm, 0).getDate();
};

export const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim());
