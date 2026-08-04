import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

// Gera o PDF a partir de HTML e abre o share sheet (web: diálogo de impressão
// isolado num iframe — imprime SÓ o documento, nunca a tela do app)
export async function sharePdf(html: string, filename: string) {
  if (Platform.OS === 'web') {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow!.document;
    doc.open();
    doc.write(html);
    doc.close();
    await new Promise((r) => setTimeout(r, 350));
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => iframe.remove(), 60000);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  const dest = FileSystem.cacheDirectory + filename;
  try {
    await FileSystem.moveAsync({ from: uri, to: dest });
    await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: filename });
  } catch {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: filename });
  }
}

async function shareTextFile(content: string, filename: string, mime: string) {
  if (Platform.OS === 'web') {
    const blob = new Blob(['﻿' + content], { type: mime + ';charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const dest = FileSystem.cacheDirectory + filename;
  await FileSystem.writeAsStringAsync(dest, '﻿' + content, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(dest, { mimeType: mime, dialogTitle: filename });
}

export async function shareCsv(content: string, filename: string) {
  await shareTextFile(content, filename, 'text/csv');
}

// Planilha Excel (.xls no formato SpreadsheetML — abre direto no Excel)
export async function shareXls(content: string, filename: string) {
  await shareTextFile(content, filename, 'application/vnd.ms-excel');
}

const xmlEsc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildXls(sheetName: string, headers: string[], rows: string[][]): string {
  const cell = (v: string) => `<Cell><Data ss:Type="String">${xmlEsc(v ?? '')}</Data></Cell>`;
  const row = (cs: string[]) => `<Row>${cs.map(cell).join('')}</Row>`;
  return (
    '<?xml version="1.0"?>\n<?mso-application progid="Excel.Sheet"?>\n' +
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
    `<Worksheet ss:Name="${xmlEsc(sheetName)}"><Table>` +
    row(headers) +
    rows.map(row).join('') +
    '</Table></Worksheet></Workbook>'
  );
}

// Matriz completa dos equipamentos (backup/exportação — mesmas colunas do web)
export function equipmentsMatrix(list: Equipment[]): { headers: string[]; rows: string[][] } {
  const headers = [
    'Unidade', 'ID do Ativo', 'Tipo', 'Marca', 'Modelo', 'Cor', 'Configuração', 'Número de Série',
    'Número de Patrimônio', 'Status do Ativo', 'Condição', 'Propriedade', 'Película', 'Capa',
    'IMEI 1', 'IMEI 2', 'Endereço MAC', 'Fornecedor', 'Localização', 'Usuário Atual', 'Departamento',
    'Gestor', 'E-mail do Usuário', 'CPF do Usuário', 'Data de Aquisição', 'Data de Entrega ao Usuário',
    'Garantia (Data Final)', 'Última Conferência', 'Valor (R$)', 'Observações', 'Acessórios',
  ];
  const rows = list.map((e) => [
    e.unidade, e.assetId || '', e.tipo, e.marca, e.modelo, e.cor || '', e.configuracao || '',
    e.serial === '—' ? '' : e.serial, e.patrimonio, e.status, e.condicao || '', e.propriedade || '',
    e.pelicula || '', e.capa || '', e.imei1 || '', e.imei2 || '', e.mac || '', e.fornecedor || '',
    e.local === '—' ? '' : e.local, e.usuario === '—' ? '' : e.usuario, e.departamento || '',
    e.gestor || '', e.emailUsuario || '', e.cpfUsuario || '', e.compra === '—' ? '' : e.compra,
    e.entrega || '', e.garantia === '—' ? '' : e.garantia, e.conferencia || '', e.valor || '',
    e.obs || '', e.acessorios || '',
  ]);
  return { headers, rows };
}

export function matrixToCsv(headers: string[], rows: string[][]): string {
  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers.map(esc).join(';')].concat(rows.map((r) => r.map(esc).join(';'))).join('\n');
}

export async function readTextFile(uri: string, webFile?: File): Promise<string> {
  if (Platform.OS === 'web') {
    if (webFile) return webFile.text();
    const res = await fetch(uri);
    return res.text();
  }
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
}

export function parseCsv(text: string): Record<string, string>[] {
  const lines = text
    .replace(/^﻿/, '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const nSemi = (lines[0].match(/;/g) || []).length;
  const nComma = (lines[0].match(/,/g) || []).length;
  const delim = nSemi >= nComma ? ';' : ',';
  const split = (l: string) => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    for (const ch of l) {
      if (ch === '"') inQ = !inQ;
      else if (ch === delim && !inQ) {
        out.push(cur.trim());
        cur = '';
      } else cur += ch;
    }
    out.push(cur.trim());
    return out;
  };
  const headers = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => {
    const vals = split(l);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = vals[i] || ''));
    return row;
  });
}

/* --------- mapeamento de cabeçalhos do CSV (formato do sistema web) --------- */

import { toAppStatus } from '../data/repo';
import { Equipment } from '../types';

const normHeader = (h: string) =>
  h
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const HEADER_MAP: Record<string, keyof Equipment> = {
  'tipo': 'tipo',
  'categoria': 'tipo',
  'tipo categoria': 'tipo',
  'marca': 'marca',
  'modelo': 'modelo',
  'cor': 'cor',
  'configuracao': 'configuracao',
  'numero de serie': 'serial',
  'n de serie': 'serial',
  'serial': 'serial',
  'numero de patrimonio': 'patrimonio',
  'patrimonio': 'patrimonio',
  'status do ativo': 'status',
  'status': 'status',
  'condicao': 'condicao',
  'propriedade': 'propriedade',
  'pelicula': 'pelicula',
  'capa': 'capa',
  'imei 1': 'imei1',
  'imei1': 'imei1',
  'imei 2': 'imei2',
  'imei2': 'imei2',
  'endereco mac': 'mac',
  'mac': 'mac',
  'fornecedor': 'fornecedor',
  'localizacao': 'local',
  'local': 'local',
  'usuario atual': 'usuario',
  'responsavel': 'usuario',
  'usuario': 'usuario',
  'departamento': 'departamento',
  'gestor': 'gestor',
  'e mail do usuario': 'emailUsuario',
  'email do usuario': 'emailUsuario',
  'e mail': 'emailUsuario',
  'email': 'emailUsuario',
  'cpf do usuario': 'cpfUsuario',
  'cpf': 'cpfUsuario',
  'data de aquisicao': 'compra',
  'aquisicao': 'compra',
  'data de compra': 'compra',
  'data de entrega ao usuario': 'entrega',
  'data de entrega': 'entrega',
  'garantia data final': 'garantia',
  'garantia': 'garantia',
  'ultima conferencia': 'conferencia',
  'valor r': 'valor',
  'valor': 'valor',
  'observacoes': 'obs',
  'obs': 'obs',
  'acessorios': 'acessorios',
  'unidade': 'unidade',
  'inventario': 'unidade',
};

// Converte uma linha do CSV (qualquer um dos dois formatos de cabeçalho)
// em campos do equipamento; valores vazios são omitidos
export function csvRowToEquipment(row: Record<string, string>): Partial<Equipment> {
  const out: Partial<Equipment> = {};
  Object.entries(row).forEach(([h, v]) => {
    const key = HEADER_MAP[normHeader(h)];
    const val = (v || '').trim();
    if (!key || !val) return;
    if (key === 'status') (out as any)[key] = toAppStatus(val);
    else (out as any)[key] = val;
  });
  return out;
}
