/* ============================================================================
   TESTES/NAVEGADOR/H04-CHECKLIST.MJS
   O que é: confere quem marca o checklist de uma tarefa: o profissional na tarefa DELE (e não na de outro),
     o admin em qualquer uma e a empresa nunca (ela aprova a entrega). O profissional não vê "remover item"
     nem o campo de adicionar (continuam só do admin).
   Onde é usado: rodado à mão: node testes/navegador/h04-checklist.mjs
     (com o `npm run dev` aberto em http://localhost:3000).
   Depende de: testes/navegador/cdp.mjs e do seed de lib/seed.ts (tarefas de prj_portal com checklist).
   Contexto: pedido de 13/10/2026; regra em lib/permissoes.ts (ação marcar_checklist).
   ============================================================================ */
import { abrirNavegador, conferir, CONTAS, espera } from './cdp.mjs';

const c = conferir();
const nav = await abrirNavegador('h04', 9376);
const { ev, ir, entrar } = nav;

/** Abre o detalhe da tarefa e devolve { caixas, habilitadas, remover, adicionar } do checklist. */
const olhar = async (tarefa) => {
  await ir(`/projetos/prj_portal?tarefa=${tarefa}`, 2500);
  return ev(`(() => {
    const secao = [...document.querySelectorAll('section')].find((s) => s.textContent.includes('Checklist'));
    if (!secao) return null;
    const caixas = [...secao.querySelectorAll('input[type=checkbox]')];
    return { caixas: caixas.length, habilitadas: caixas.filter((x) => !x.disabled).length,
      remover: secao.querySelectorAll('button[aria-label^="Remover item"]').length, adicionar: !!secao.querySelector('input[aria-label="Novo item do checklist"]') };
  })()`);
};
// Tarefas do seed (lib/seed.ts, prj_portal) com checklist: tar_3 é da Ana e tar_4 é do Bruno.
const deAna = 'tar_3';
const deBruno = 'tar_4';

await entrar(CONTAS.admin);
const adm = await olhar(deAna);
c('admin marca, adiciona e remove', adm && adm.habilitadas === adm.caixas && adm.caixas > 0 && adm.adicionar && adm.remover > 0, JSON.stringify(adm));

await entrar(CONTAS.ana);
const propria = await olhar(deAna);
c('Ana marca na tarefa dela', propria && propria.caixas > 0 && propria.habilitadas === propria.caixas, JSON.stringify(propria));
c('Ana NÃO vê remover nem adicionar item', propria && propria.remover === 0 && !propria.adicionar, JSON.stringify(propria));
// Marcar de verdade: o número de itens marcados na tela muda.
const secaoChecklist = `[...document.querySelectorAll('section')].find((s) => s.textContent.includes('Checklist'))`;
/** Quantos itens do checklist aparecem marcados na tela. */
const marcados = () => ev(`${secaoChecklist}.querySelectorAll('input[type=checkbox]:checked').length`);
const antes = await marcados();
await ev(`${secaoChecklist}.querySelector('input[type=checkbox]').click()`);
await espera(600);
const depois = await marcados();
c('marcar muda o item', depois !== antes, `${antes} → ${depois}`);

const dela = await olhar(deBruno);
c('Ana NÃO marca na tarefa do Bruno', dela && dela.habilitadas === 0, JSON.stringify(dela));

await entrar(CONTAS.marcos);
const emp = await olhar(deAna);
c('empresa NÃO marca (só vê)', emp && emp.habilitadas === 0 && emp.remover === 0 && !emp.adicionar, JSON.stringify(emp));

c.resumo();
process.exit(process.exitCode ?? 0);
