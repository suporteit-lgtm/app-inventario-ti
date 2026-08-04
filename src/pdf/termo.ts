import { todayBR } from '../state/AppContext';
import { termoTitulo } from '../types';
import { LOGO_BASE64 } from './logo';

export interface TermoData {
  nome: string;
  cpf?: string;
  departamento?: string;
  linhas: string[];
  empresa?: string;
  endereco?: string;
  cnpjEmpresa?: string;
  responsavelTi?: string;
  cpfResponsavelTi?: string;
  cidadeUf?: string;
  // Específicos do termo de devolução
  emailEx?: string;
  estadoPerfeito?: boolean;
  avarias?: string;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export const dataExtenso = () => {
  const d = new Date();
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};

// Substitui os placeholders do template e divide o texto em
// antes/depois do bloco {EQUIPAMENTOS}
export function splitTemplate(content: string, d: TermoData): { titulo: string | null; pre: string; pos: string } {
  const replaced = content
    .replace(/\{NOME\}/g, d.nome)
    .replace(/\{CPF\}/g, d.cpf || '______________')
    .replace(/\{DEPARTAMENTO\}/g, d.departamento || '—')
    .replace(/\{DATA\}/g, todayBR())
    .replace(/\{DATA_EXTENSO\}/g, dataExtenso())
    .replace(/\{EMPRESA\}/g, d.empresa || 'Locagora — Grupo LOC')
    .replace(/\{ENDERECO\}/g, d.endereco || '______________________________')
    .replace(/\{CNPJ_EMPRESA\}/g, d.cnpjEmpresa || '__.___.___/____-__')
    .replace(/\{RESPONSAVEL_TI\}/g, d.responsavelTi || '______________________________')
    .replace(/\{CPF_RESPONSAVEL_TI\}/g, d.cpfResponsavelTi || '______________')
    .replace(/\{CIDADE_UF\}/g, d.cidadeUf || 'Belo Horizonte/MG')
    .replace(/\{CHECK_PERFEITO\}/g, d.estadoPerfeito === false ? '(   )' : '( X )')
    .replace(/\{CHECK_AVARIAS\}/g, d.estadoPerfeito === false ? '( X )' : '(   )')
    .replace(/\{AVARIAS\}/g, d.avarias?.trim() || '________________________________________')
    .replace(/\{EMAIL_EX\}/g, d.emailEx?.trim() || '________________________________');

  // Se a primeira linha for o título do documento (começa com "TERMO"),
  // ela vira o cabeçalho e sai do corpo
  let titulo: string | null = null;
  let body = replaced.trim();
  const firstNl = body.indexOf('\n');
  const firstLine = (firstNl < 0 ? body : body.slice(0, firstNl)).trim();
  if (/^TERMO/i.test(firstLine)) {
    titulo = firstLine;
    body = firstNl < 0 ? '' : body.slice(firstNl + 1).trim();
  }

  const idx = body.indexOf('{EQUIPAMENTOS}');
  if (idx < 0) return { titulo, pre: body, pos: '' };
  return { titulo, pre: body.slice(0, idx).trim(), pos: body.slice(idx + '{EQUIPAMENTOS}'.length).trim() };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Texto simples → parágrafos HTML; linhas "CLÁUSULA ..." ficam em negrito
const toParagraphs = (s: string) =>
  s
    .split(/\n{2,}/)
    .map((par) => {
      const lines = par.split('\n').map((l) => {
        const t = esc(l.trim());
        return /^(CL[ÁA]USULA|CONSIDERANDO)/i.test(l.trim()) ? `<b>${t}</b>` : t;
      });
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('');

export function termoHtml(templateName: string, templateContent: string, d: TermoData) {
  const { titulo, pre, pos } = splitTemplate(templateContent, d);
  return `
  <html><head><meta charset="utf-8"><style>
    @page { margin: 40px 48px }
    body{font-family:Helvetica,Arial,sans-serif;color:#0f172a;font-size:11.5px;line-height:1.55;margin:0;padding:24px 8px}
    .logo{display:block;margin:0 auto 18px;width:190px}
    h1{text-align:center;font-size:13px;letter-spacing:.4px;margin:0 0 18px}
    p{text-align:justify;margin:0 0 10px}
    .items{margin:12px 0;padding:12px 14px;background:#f6f8fb;border-radius:8px;font-family:Menlo,Consolas,monospace;font-size:10.5px;white-space:pre-line}
    .footer{margin-top:28px;color:#64748b;font-size:9.5px;text-align:center}
  </style></head><body>
    <img class="logo" src="${LOGO_BASE64}" />
    <h1>${esc(titulo || termoTitulo(templateName))}</h1>
    ${toParagraphs(pre)}
    <div class="items">${esc(d.linhas.join('\n'))}</div>
    ${pos ? toParagraphs(pos) : ''}
    <div class="footer">Locagora — Grupo LOC · Inventário de Equipamentos</div>
  </body></html>`;
}
