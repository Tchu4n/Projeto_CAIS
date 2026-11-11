/* ============================================================================
   CAIQUE.TS — REGRAS DO ASSISTENTE CAIQUE (VERSÃO SIMULADA)
   O que é: funções puras do chat do CAIQUE: de qual trilha o chat está falando, quais perguntas sugerir,
   se a pergunta é válida e a resposta (por enquanto FINGIDA, sem IA).
   Onde é usado: components/caique/ChatWidget.tsx e lib/caique.casos.ts.
   Depende de: nada (sem React, para rodar em Node).
   Contexto: §4 (trilhas); prompts I01 a I05 em docs/prompts.
   ============================================================================ */

/** Uma mensagem do chat. */
export interface MensagemCaique {
  id: string;
  /** Quem escreveu: a pessoa ou o CAIQUE. */
  papel: 'usuario' | 'caique';
  texto: string;
  /** Hora de envio (HH:mm), só para exibir. */
  hora: string;
  /** Só nas respostas do CAIQUE: o que a pessoa achou. undefined = ainda não avaliou. */
  feedback?: 'util' | 'nao-util';
}

// [PV-1] O TAMANHO MÁXIMO da pergunta (em caracteres). O limite protege o custo da IA quando ela for ligada.
export const LIMITE_PERGUNTA = 500;

/**
 * Descobre de qual trilha a tela aberta fala.
 * @param caminho - a rota atual (usePathname).
 * @returns o id da trilha em /trilhas/<id> ou /minhas-trilhas/<id> (inclusive nas etapas); undefined nas outras telas.
 * @example idTrilhaDoCaminho('/minhas-trilhas/t1/etapa/e2') // 't1'
 */
export function idTrilhaDoCaminho(caminho: string): string | undefined {
  const [, raiz, id] = caminho.split('/');
  return (raiz === 'trilhas' || raiz === 'minhas-trilhas') && id ? id : undefined;
}

/**
 * Perguntas prontas mostradas no chat vazio.
 * @param tituloTrilha - título da trilha aberta, se houver.
 * @returns de 3 a 4 sugestões; com trilha, falam dela.
 */
// [PV-2] AS PERGUNTAS SUGERIDAS do chat vazio: com trilha aberta e sem trilha. Troque o texto aqui.
export function sugestoesCaique(tituloTrilha?: string): string[] {
  if (tituloTrilha) {
    return [`Do que trata a trilha "${tituloTrilha}"?`, 'Qual é a próxima etapa?', 'Como funciona o quiz?', 'Quanto tempo tenho para concluir?'];
  }
  return ['Como funcionam as trilhas?', 'Como vejo minhas tarefas?', 'O que é o semáforo de carga?'];
}

/**
 * Confere a pergunta antes de enviar.
 * @param texto - o que a pessoa digitou.
 * @returns a mensagem de erro, ou null se está válida.
 * @example validarPergunta('   ') // 'Escreva a sua pergunta.'
 */
export function validarPergunta(texto: string): string | null {
  const limpo = texto.trim();
  if (!limpo) return 'Escreva a sua pergunta.';
  if (limpo.length > LIMITE_PERGUNTA) return `A pergunta passou de ${LIMITE_PERGUNTA} caracteres. Resuma e envie de novo.`;
  return null;
}

/**
 * Monta a resposta FINGIDA do CAIQUE.
 * @param pergunta - a pergunta já validada.
 * @param tituloTrilha - título da trilha aberta, se houver.
 * @returns um texto de demonstração que deixa claro que a IA ainda não está ligada.
 */
// SIMULADO: não há IA aqui; a resposta é um texto fixo para mostrar o chat funcionando.
// TODO(API): trocar por uma chamada à rota /api/caique/chat (Gemini), enviando a pergunta, o histórico e o contexto da trilha (prompts I02 e I03).
export function montarRespostaSimulada(pergunta: string, tituloTrilha?: string): string {
  const onde = tituloTrilha ? `sobre a trilha "${tituloTrilha}"` : 'sobre o CAIS';
  return `Esta é uma resposta de demonstração ${onde}. Você perguntou: "${pergunta.trim()}". Em breve eu respondo de verdade, com base no conteúdo da trilha.`;
}

/**
 * Pede a resposta ao CAIQUE.
 * @param pergunta - a pergunta já validada.
 * @param tituloTrilha - título da trilha aberta, se houver.
 * @returns a resposta (por enquanto, a simulada).
 * @throws Error se a pergunta contiver "/erro" (só para demonstrar o estado de erro do chat).
 */
// SIMULADO: espera ~900 ms para o chat mostrar o "CAIQUE está digitando"; "/erro" dispara a falha de propósito.
// TODO(API): vira fetch POST para /api/caique/chat; erros de rede, timeout e 429 caem no catch do widget.
export async function perguntarAoCaique(pergunta: string, tituloTrilha?: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 900));
  if (pergunta.includes('/erro')) throw new Error('Falha simulada');
  return montarRespostaSimulada(pergunta, tituloTrilha);
}
