/* ============================================================================
   CASOS DE TESTE DE FILTRO, ORDENAÇÃO E LISTAS UNIFICADAS
   O que é: script simples (sem biblioteca de testes) que confere lib/tarefas.ts com dados fixos.
   Onde é usado: rodado à mão no terminal; nenhuma tela importa este arquivo.
   Depende de: lib/tarefas.ts e lib/tipos.ts (imports com extensão .ts para o Node achar os módulos).
   Contexto: §5 (quadro, lista e cronograma) e pedido de 14/10/2026 (visão geral das tarefas).
   Como rodar: node --experimental-strip-types lib/tarefas.casos.ts
   ============================================================================ */

import { colunaDaTarefa, colunasUnificadas, ehCriterioOrdem, filtrarTarefas, ordenarTarefas } from './tarefas.ts';
import type { Projeto, Tarefa } from './tipos.ts';

/** Tarefa de teste; só o que cada caso precisa muda. */
const tarefa = (id: string, extra: Partial<Tarefa> = {}): Tarefa => ({
  id, projetoId: 'p1', colunaId: 'c1', titulo: id, descricao: '', responsavelId: 'ana', prazo: '2026-10-10', prioridade: 'media',
  etiquetas: [], checklist: [], comentarios: [], ordem: 0, ...extra,
});
/** Projeto de teste com as listas indicadas (id = título em minúsculas). */
const projeto = (id: string, titulos: string[]): Projeto => ({
  id, nome: id, tipo: '', empresaId: 'e', contatoNome: '', descricao: '', inicio: '2026-01-01', entrega: '2026-12-01',
  prioridade: 'media', liderId: '', status: 'andamento', cor: 'roxo', colunas: titulos.map((t) => ({ id: `${id}_${t}`, titulo: t })),
});
const nomes: Record<string, string> = { ana: 'Ana', bruno: 'Bruno', carla: 'Carla' };
/** Nome da pessoa pelo id (o critério "responsável" ordena por nome). */
const nomeDe = (id: string) => nomes[id] ?? '';
/** Ids na ordem obtida, juntos ('a,b,c'). */
const ids = (xs: Tarefa[]) => xs.map((t) => t.id).join(',');

const t1 = tarefa('t1', { prazo: '2026-10-20', prioridade: 'baixa', responsavelId: 'carla', ordem: 0, titulo: 'Beta' });
const t2 = tarefa('t2', { prazo: '2026-10-05', prioridade: 'alta', responsavelId: 'ana', ordem: 1, titulo: 'Alfa', etiquetas: ['Front'] });
const t3 = tarefa('t3', { prazo: '2026-10-12', prioridade: 'media', responsavelId: 'bruno', ordem: 2, titulo: 'Gama', projetoId: 'p2', etiquetas: ['Front', 'Bug'] });
const todas = [t1, t2, t3];

const p1 = projeto('p1', ['A fazer', 'Fazendo', 'Pronto']);
const p2 = projeto('p2', ['A fazer', 'Revisão', 'Em análise', 'Pronto']);
const p3 = projeto('p3', ['a  fazer'.replace('  ', ' '), 'Concluído']);

const casos: { porque: string; obtido: unknown; esperado: unknown }[] = [
  { porque: 'manual: segue o campo ordem', obtido: ids(ordenarTarefas([t3, t1, t2], 'manual', 'asc', nomeDe)), esperado: 't1,t2,t3' },
  { porque: 'manual ignora a direção', obtido: ids(ordenarTarefas([t3, t1, t2], 'manual', 'desc', nomeDe)), esperado: 't1,t2,t3' },
  { porque: 'prazo asc: o que vence antes primeiro', obtido: ids(ordenarTarefas(todas, 'prazo', 'asc', nomeDe)), esperado: 't2,t3,t1' },
  { porque: 'prazo desc: o que vence depois primeiro', obtido: ids(ordenarTarefas(todas, 'prazo', 'desc', nomeDe)), esperado: 't1,t3,t2' },
  { porque: 'prioridade asc: alta, média, baixa', obtido: ids(ordenarTarefas(todas, 'prioridade', 'asc', nomeDe)), esperado: 't2,t3,t1' },
  { porque: 'prioridade desc: baixa primeiro', obtido: ids(ordenarTarefas(todas, 'prioridade', 'desc', nomeDe)), esperado: 't1,t3,t2' },
  { porque: 'responsável asc: Ana, Bruno, Carla', obtido: ids(ordenarTarefas(todas, 'responsavel', 'asc', nomeDe)), esperado: 't2,t3,t1' },
  { porque: 'título asc: Alfa, Beta, Gama', obtido: ids(ordenarTarefas(todas, 'titulo', 'asc', nomeDe)), esperado: 't2,t1,t3' },
  { porque: 'título desc: Gama, Beta, Alfa', obtido: ids(ordenarTarefas(todas, 'titulo', 'desc', nomeDe)), esperado: 't3,t1,t2' },
  { porque: 'empate de prazo cai na ordem manual (e não embaralha)', obtido: ids(ordenarTarefas([tarefa('b', { ordem: 1 }), tarefa('a', { ordem: 0 })], 'prazo', 'asc', nomeDe)), esperado: 'a,b' },
  { porque: 'não altera a lista recebida', obtido: (() => { const orig = [t3, t1, t2]; ordenarTarefas(orig, 'prazo', 'asc', nomeDe); return ids(orig); })(), esperado: 't3,t1,t2' },
  { porque: 'critério válido da URL é aceito', obtido: ehCriterioOrdem('prazo'), esperado: true },
  { porque: 'critério inventado na URL é recusado', obtido: ehCriterioOrdem('xyz') || ehCriterioOrdem(null), esperado: false },

  { porque: 'filtro vazio deixa tudo passar', obtido: ids(filtrarTarefas(todas, {})), esperado: 't1,t2,t3' },
  { porque: 'filtro por projeto (um)', obtido: ids(filtrarTarefas(todas, { projetoIds: ['p2'] })), esperado: 't3' },
  { porque: 'filtro por projeto (vários)', obtido: ids(filtrarTarefas(todas, { projetoIds: ['p1', 'p2'] })), esperado: 't1,t2,t3' },
  { porque: 'filtro por colaborador', obtido: ids(filtrarTarefas(todas, { responsavelId: 'bruno' })), esperado: 't3' },
  { porque: 'filtro por prioridade', obtido: ids(filtrarTarefas(todas, { prioridade: 'alta' })), esperado: 't2' },
  { porque: 'filtro por etiqueta', obtido: ids(filtrarTarefas(todas, { etiqueta: 'Front' })), esperado: 't2,t3' },
  { porque: 'filtros se combinam (e)', obtido: ids(filtrarTarefas(todas, { etiqueta: 'Front', responsavelId: 'ana' })), esperado: 't2' },

  { porque: 'listas de mesmo nome se juntam; "Pronto" vai para o fim; extras ficam no meio', obtido: colunasUnificadas([p1, p2]).map((c) => c.titulo).join(','), esperado: 'A fazer,Fazendo,Revisão,Em análise,Pronto' },
  { porque: 'junta pelo nome sem acento nem maiúscula e a última lista de qualquer projeto é "concluída"', obtido: colunasUnificadas([p1, p3]).map((c) => `${c.titulo}${c.concluida ? '*' : ''}`).join(','), esperado: 'A fazer,Fazendo,Pronto*,Concluído*' },
  { porque: 'cada coluna guarda a lista de cada projeto', obtido: colunasUnificadas([p1, p2]).find((c) => c.chave === 'a fazer')?.porProjeto, esperado: { p1: 'p1_A fazer', p2: 'p2_A fazer' } },
  { porque: 'coluna só de um projeto não tem a lista do outro', obtido: colunasUnificadas([p1, p2]).find((c) => c.chave === 'revisao')?.porProjeto.p1, esperado: undefined },
  { porque: 'acha a coluna da tarefa', obtido: colunaDaTarefa(colunasUnificadas([p1, p2]), tarefa('x', { projetoId: 'p2', colunaId: 'p2_Revisão' }))?.titulo, esperado: 'Revisão' },
  { porque: 'tarefa de lista apagada não tem coluna', obtido: colunaDaTarefa(colunasUnificadas([p1]), tarefa('x', { projetoId: 'p1', colunaId: 'sumiu' })), esperado: undefined },
];

let falhas = 0;
for (const c of casos) {
  const ok = JSON.stringify(c.obtido) === JSON.stringify(c.esperado);
  if (!ok) falhas++;
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${c.porque}${ok ? '' : `\n         obtido:   ${JSON.stringify(c.obtido)}\n         esperado: ${JSON.stringify(c.esperado)}`}`);
}
console.log(`\n${casos.length - falhas} de ${casos.length} casos passaram.`);
process.exitCode = falhas ? 1 : 0;
