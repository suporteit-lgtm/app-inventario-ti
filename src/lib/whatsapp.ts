// Aviso de termo pelo WhatsApp.
//
// O envio sai do WhatsApp instalado no aparelho de quem mandou o termo —
// ou seja, do número do próprio responsável de T.I., sem precisar
// cadastrar número nenhum. O app só monta a conversa com o texto pronto;
// quem toca em enviar é a pessoa.
//
// Mandar sozinho, sem esse toque, exigiria a Cloud API da Meta: número de
// empresa (um número pessoal migrado deixa de funcionar no app), conta
// verificada, modelo aprovado e cobrança por conversa.

const digitos = (s: string) => (s || '').replace(/\D/g, '');

/**
 * Monta o link wa.me. Devolve string vazia quando o número não dá para
 * usar — quem chama trata isso como "não notificar", não como erro.
 *
 * O wa.me aceita SÓ algarismos, com código do país e sem o zero do DDD.
 */
export const linkWhatsApp = (telefone: string, mensagem: string): string => {
  const d = digitos(telefone);
  // menos que DDD + 8 dígitos não é telefone
  if (d.length < 10) return '';
  // 55 + DDD(2) + 8 ou 9 dígitos = 12 ou 13 algarismos. Só nesse tamanho o
  // "55" inicial é código do país; em 11 dígitos ele é o DDD de Santa Maria.
  const comPais = d.startsWith('55') && (d.length === 12 || d.length === 13) ? d : '55' + d;
  return `https://wa.me/${comPais}?text=${encodeURIComponent(mensagem)}`;
};

/** O texto do aviso. `tema` é o nome do template: Responsabilidade, Comodato… */
export const mensagemTermoEnviado = (tema: string, responsavel: string) =>
  `Olá, o Termo de ${tema} foi enviado para o seu email corporativo, assine o mais breve possível.\n\nAtenciosamente,\n${responsavel}`;
