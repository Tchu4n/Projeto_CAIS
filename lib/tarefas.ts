/* ============================================================================
   TAREFAS: FILTRO, ORDENAÇÃO E LISTAS UNIFICADAS
   O que é: funções puras para a visão geral de tarefas (/projetos?visao=tarefas) e para o quadro de cada
   projeto: filtrar por projeto, colaborador, prioridade e etiqueta; ordenar por prazo, prioridade,
   responsável ou título; e juntar as listas de vários projetos pelo NOME (A fazer, Fazendo, ...) e contar as tarefas de cada projeto (legenda).
   Onde é usado: components/projetos/VisaoTarefas.tsx (legenda dos projetos), QuadroGeral.tsx, Quadro.tsx (ordenação),
   app/(sistema)/projetos/[id]/page.tsx (filtro e ordem da ficha) e lib/tarefas.casos.ts (testes com Node).
   Depende de: tipos de lib/tipos.ts e normalizar de lib/utils.ts (sem React, para rodar em Node).
   Contexto: §5 (Projetos: quadro, lista e cronograma) e pedido de 14/10/2026 (visão geral das tarefas).
   ============================================================================ */

import type { Prioridade, Projeto, Tarefa } from './tipos.ts';
import { normalizar } from './utils.ts';

// [PV-1] OS CRITÉRIOS DE ORDEM do quadro e o texto de cada um no seletor "Ordenar por". Critério novo entra aqui, em CRITERIOS_ORDEM e no switch de `ordenarTarefas`.
/** Como ordenar os cartões dentro de cada lista. "manual" é a ordem escolhida arrastando. */
export type CriterioOrdem = 'manual' | 'prazo' | 'prioridade' | 'responsavel' | 'titulo';
/** Sentido da ordenação: 'asc' é o natural de cada critério (prazo mais cedo, prioridade alta, A a Z). */
export type Direcao = 'asc' | 'desc';

/** Texto de cada critério no seletor "Ordenar por". */
export const ROTULO_ORDEM: Record<CriterioOrdem, string> = {
  manual: 'Manual',
  prazo: 'Prazo',
  prioridade: 'Prioridade',
  responsavel: 'Responsável',
  titulo: 'Título (A–Z)',
};
/** Os critérios na ordem em que aparecem no seletor. */
export const CRITERIOS_ORDEM = Object.keys(ROTULO_ORDEM) as CriterioOrdem[];

/** Peso de cada prioridade: a alta vem primeiro na ordem natural. */
const PESO_PRIORIDADE: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

/**
 * Diz se o texto é um critério de ordem válido (útil para ler da URL sem confiar nela).
 * @param v - texto vindo da URL.
 * @returns true se for um CriterioOrdem.
 */
export function ehCriterioOrdem(v: string | null | undefined): v is CriterioOrdem {
  return !!v && (CRITERIOS_ORDEM as string[]).includes(v);
}

/**
 * Ordena uma CÓPIA das tarefas pelo critério escolhido.
 * Empate: mantém a ordem manual (`ordem`) e, por fim, o título, para o resultado ser sempre o mesmo.
 * No critério "manual" a direção é ignorada (a ordem manual é a do arrastar).
 * @param tarefas - as tarefas a ordenar.
 * @param criterio - como ordenar.
 * @param direcao - 'asc' (natural) ou 'desc' (inverso).
 * @param nomeDe - devolve o nome da pessoa pelo id (usado no critério "responsável").
 * @returns a lista nova, ordenada.
 * @example ordenarTarefas(tarefas, 'prazo', 'asc', (id) => nomes[id]) // as que vencem antes primeiro
 */
export function ordenarTarefas(tarefas: Tarefa[], criterio: CriterioOrdem, direcao: Direcao, nomeDe: (pessoaId: string) => string): Tarefa[] {
  const sinal = direcao === 'desc' ? -1 : 1;
  const desempate = (a: Tarefa, b: Tarefa) => a.ordem - b.ordem || a.titulo.localeCompare(b.titulo, 'pt-BR') || a.id.localeCompare(b.id);
  return [...tarefas].sort((a, b) => {
    if (criterio === 'manual') return desempate(a, b);
    let cmp = 0;
    if (criterio === 'prazo') cmp = a.prazo.localeCompare(b.prazo);
    else if (criterio === 'prioridade') cmp = PESO_PRIORIDADE[a.prioridade] - PESO_PRIORIDADE[b.prioridade];
    else if (criterio === 'responsavel') cmp = nomeDe(a.responsavelId).localeCompare(nomeDe(b.responsavelId), 'pt-BR');
    else cmp = a.titulo.localeCompare(b.titulo, 'pt-BR');
    return cmp * sinal || desempate(a, b);
  });
}

/** Filtros da visão de tarefas; campo vazio ou ausente = não filtra. */
export interface FiltroTarefas {
  /** Ids dos projetos a mostrar (vazio = todos os do escopo). */
  projetoIds?: string[];
  /** Id do colaborador (responsável). */
  responsavelId?: string;
  prioridade?: string;
  etiqueta?: string;
}

// [PV-2] COMO OS FILTROS SE COMBINAM: todos ao mesmo tempo (e), cada um só vale se estiver preenchido. O de projeto aceita vários.
/**
 * Aplica os filtros juntos.
 * @param tarefas - as tarefas (já dentro do escopo da pessoa).
 * @param f - os filtros.
 * @returns as tarefas que passam em todos.
 * @example filtrarTarefas(tarefas, { responsavelId: 'pes_ana', prioridade: 'alta' })
 */
export function filtrarTarefas(tarefas: Tarefa[], f: FiltroTarefas): Tarefa[] {
  return tarefas.filter((t) =>
    (!f.projetoIds?.length || f.projetoIds.includes(t.projetoId))
    && (!f.responsavelId || t.responsavelId === f.responsavelId)
    && (!f.prioridade || t.prioridade === f.prioridade)
    && (!f.etiqueta || t.etiquetas.includes(f.etiqueta)));
}

/** Uma lista do quadro unificado: junta as listas de mesmo nome de vários projetos. */
export interface ColunaUnificada {
  /** Nome sem acento e em minúsculas (a chave que une as listas). */
  chave: string;
  /** Nome como aparece (o do primeiro projeto que tem a lista). */
  titulo: string;
  /** true se é a ÚLTIMA lista ("Pronto") de algum projeto: tarefa concluída. */
  concluida: boolean;
  /** projetoId → id da lista daquele projeto. */
  porProjeto: Record<string, string>;
}

// [PV-3] COMO AS LISTAS DOS PROJETOS SE JUNTAM no quadro geral: pelo NOME (sem acento nem maiúscula). A lista que é a última de algum projeto ("Pronto") vai sempre para o fim. Lista com nome próprio de um só projeto vira coluna extra.
/**
 * Junta as listas de vários projetos em colunas únicas, pelo nome.
 * A ordem segue a primeira aparição; as que são "Pronto" (última lista de algum projeto) vão para o fim.
 * @param projetos - os projetos do quadro.
 * @returns as colunas unificadas.
 * @example colunasUnificadas([portal, estoque]).map((c) => c.titulo) // ['A fazer', 'Fazendo', 'Revisão', 'Pronto']
 */
export function colunasUnificadas(projetos: Projeto[]): ColunaUnificada[] {
  const mapa = new Map<string, ColunaUnificada>();
  for (const p of projetos) {
    p.colunas.forEach((c, i) => {
      const chave = normalizar(c.titulo.trim());
      const atual = mapa.get(chave) ?? { chave, titulo: c.titulo.trim(), concluida: false, porProjeto: {} };
      atual.porProjeto[p.id] = c.id;
      if (i === p.colunas.length - 1) atual.concluida = true;
      mapa.set(chave, atual);
    });
  }
  const todas = [...mapa.values()];
  return [...todas.filter((c) => !c.concluida), ...todas.filter((c) => c.concluida)];
}

/**
 * Em qual coluna unificada está a tarefa.
 * @param colunas - as colunas unificadas.
 * @param t - a tarefa.
 * @returns a coluna, ou undefined se a lista da tarefa não existe mais.
 */
export function colunaDaTarefa(colunas: ColunaUnificada[], t: Tarefa): ColunaUnificada | undefined {
  return colunas.find((c) => c.porProjeto[t.projetoId] === t.colunaId);
}

// [PV-4] A CONTAGEM DA LEGENDA DE PROJETOS: quantas tarefas cada projeto tem DENTRO dos outros filtros (colaborador, prioridade, etiqueta). Projeto sem tarefa aparece com 0, na ordem recebida.
/** Quantidade de tarefas de um projeto (uma linha da legenda). */
export interface ContagemProjeto {
  projetoId: string;
  total: number;
}

/**
 * Conta as tarefas de cada projeto, para o número ao lado do nome na legenda da visão geral.
 * Percorre as tarefas uma vez só; projeto sem tarefa fica com 0 e a ordem dos projetos é mantida.
 * @param projetos - os projetos da legenda, na ordem em que devem aparecer.
 * @param tarefas - as tarefas já filtradas (sem o filtro de projeto, senão só um projeto teria número).
 * @returns uma linha por projeto, com o total.
 * @example contarPorProjeto([portal, estoque], tarefas) // [{ projetoId: 'prj_portal', total: 14 }, { projetoId: 'prj_estoque', total: 7 }]
 */
export function contarPorProjeto(projetos: Projeto[], tarefas: Tarefa[]): ContagemProjeto[] {
  const total = new Map<string, number>();
  for (const t of tarefas) total.set(t.projetoId, (total.get(t.projetoId) ?? 0) + 1);
  return projetos.map((p) => ({ projetoId: p.id, total: total.get(p.id) ?? 0 }));
}
