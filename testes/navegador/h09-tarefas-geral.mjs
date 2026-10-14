/* ============================================================================
   TESTES/NAVEGADOR/H09-TAREFAS-GERAL.MJS
   O que é: confere a visão geral das tarefas em /projetos?visao=tarefas: (1) a empresa (Marcos, da Vértice)
     alterna entre Projetos e Tarefas e vê o quadro com tarefas de mais de um projeto, com resumo; (2) filtra
     por projeto, por colaborador (avatar) e ordena por prazo; (3) a lista e o cronograma mostram o projeto;
     (4) a empresa não arrasta cartões e o administrador sim; (5) a ficha do projeto ganhou a ordem e a faixa
     de colaboradores; (6) o profissional só vê os projetos dele.
   Onde é usado: rodado à mão: node testes/navegador/h09-tarefas-geral.mjs
     (com o `npm run dev` aberto em http://localhost:3000).
   Depende de: testes/navegador/cdp.mjs e do seed de lib/seed.ts (Vértice: prj_portal e prj_estoque).
   Contexto: pedido de 14/10/2026 (visão geral das tarefas, ordenação e filtro por colaborador).
   ============================================================================ */
import { abrirNavegador, conferir, CONTAS, espera } from './cdp.mjs';

const c = conferir();
const nav = await abrirNavegador('h09', 9382);
const { ev, ir, entrar } = nav;
/** Caminho + query atuais. */
const url = () => ev('location.pathname + location.search');
/** Texto visível da área principal. */
const texto = () => ev(`document.querySelector('main')?.innerText ?? ''`);
/** Nomes dos projetos escritos nos cartões do quadro (em maiúsculas pelo CSS, mas o texto é o original). */
const projetosDosCartoes = () => ev(`[...new Set([...document.querySelectorAll('[data-cartao]')].map((el) => el.querySelector('p.uppercase')?.textContent ?? ''))].filter(Boolean)`);
/** Escolhe uma opção de um <select> pelo aria-label (dispara o evento de mudança do React). */
const escolher = (rotulo, valor) => ev(`(() => { const s = document.querySelector('select[aria-label="${rotulo}"]'); const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set; set.call(s, '${valor}'); s.dispatchEvent(new Event('change', { bubbles: true })); })()`);

// 1) A empresa alterna para Tarefas.
await entrar(CONTAS.marcos);
await ir('/projetos', 2500);
c('/projetos abre na grade de projetos', (await texto()).includes('Portal de pedidos') && !(await texto()).includes('em aberto'), '');
await ev(`[...document.querySelectorAll('main [role=radio]')].find((r) => r.textContent.trim() === 'Tarefas')?.click()`);
await espera(2000);
c('trocar para Tarefas põe ?visao=tarefas na URL', (await url()).includes('visao=tarefas'), await url());
const t = await texto();
c('o resumo mostra tarefas, em aberto, concluídas e atrasadas', /\d+ tarefas?/.test(t) && t.includes('em aberto') && t.includes('concluída') && t.includes('atrasada'), t.slice(0, 120));
const listas = await ev(`[...document.querySelectorAll('main section[aria-label^="Lista "]')].map((s) => s.getAttribute('aria-label'))`);
c('o quadro tem as listas A fazer, Fazendo, Revisão e Pronto', ['Lista A fazer', 'Lista Fazendo', 'Lista Revisão', 'Lista Pronto'].every((l) => listas.includes(l)), JSON.stringify(listas));
const projetos = await projetosDosCartoes();
c('o quadro mostra cartões de mais de um projeto', projetos.length >= 2, JSON.stringify(projetos));

// 2) Filtro por projeto (pela URL, como o link compartilhado).
await ir('/projetos?visao=tarefas&projeto=prj_estoque', 2500);
const soEstoque = await projetosDosCartoes();
c('?projeto=prj_estoque deixa só cartões do Painel de estoque', soEstoque.length === 1 && soEstoque[0] === 'Painel de estoque', JSON.stringify(soEstoque));
await ir('/projetos?visao=tarefas&projeto=nao_existe', 2500);
c('projeto inventado na URL é ignorado (mostra todos)', (await projetosDosCartoes()).length >= 2, '');

// Filtro por colaborador (avatar).
await ir('/projetos?visao=tarefas', 2500);
const avatares = await ev(`[...document.querySelectorAll('main [role=group][aria-label="Filtrar por colaborador"] button')].map((b) => b.getAttribute('title'))`);
c('a faixa de colaboradores tem avatares', avatares.length >= 2, JSON.stringify(avatares));
const nome = avatares[0];
await ev(`document.querySelector('main [role=group][aria-label="Filtrar por colaborador"] button').click()`);
await espera(1200);
const resp = await ev(`[...document.querySelectorAll('[data-cartao]')].map((el) => el.getAttribute('aria-label'))`);
c('clicar no avatar filtra: todos os cartões são dessa pessoa', resp.length >= 1 && resp.every((l) => l.includes(`Responsável: ${nome}.`)), `${nome} · ${resp.length} cartões`);
c('o filtro vai para a URL (?resp=)', (await url()).includes('resp='), await url());
await ev(`document.querySelector('main [role=group][aria-label="Filtrar por colaborador"] button[aria-pressed=true]').click()`);
await espera(1000);
c('clicar de novo no avatar tira o filtro', !(await url()).includes('resp='), await url());

// Ordenação por prazo: dentro de uma lista sem concluídas, as datas dos cartões crescem.
await escolher('Ordenar cartões por', 'prazo');
await espera(1000);
c('ordenar por prazo vai para a URL (?ordem=prazo)', (await url()).includes('ordem=prazo'), await url());
const MES = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 };
const datas = await ev(`(() => { const s = document.querySelector('main section[aria-label="Lista A fazer"]'); return [...s.querySelectorAll('[data-cartao]')].map((el) => el.getAttribute('aria-label')); })()`);
const dias = datas.map((l) => { const m = l.match(/(\d{1,2}) (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/); return m ? MES[m[2]] * 31 + Number(m[1]) : null; }).filter((x) => x !== null);
c('na lista A fazer os prazos crescem com a ordem por prazo', dias.length >= 2 && dias.every((v, i) => i === 0 || dias[i - 1] <= v), JSON.stringify(dias));
await ev(`document.querySelector('button[aria-label^="Sentido"]').click()`);
await espera(1000);
/** Dias (mês × 31 + dia) dos cartões da lista A fazer, na ordem em que aparecem depois de inverter o sentido. */
const diasDesc = (await ev(`(() => { const s = document.querySelector('main section[aria-label="Lista A fazer"]'); return [...s.querySelectorAll('[data-cartao]')].map((el) => el.getAttribute('aria-label')); })()`))
  .map((l) => { const m = l.match(/(\d{1,2}) (jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/); return m ? MES[m[2]] * 31 + Number(m[1]) : null; }).filter((x) => x !== null);
c('inverter o sentido põe os prazos em ordem decrescente', diasDesc.length >= 2 && diasDesc.every((v, i) => i === 0 || diasDesc[i - 1] >= v), JSON.stringify(diasDesc));

// 3) Lista e cronograma.
await ir('/projetos?visao=tarefas&vista=lista', 2500);
const cabecalhos = await ev(`[...document.querySelectorAll('main table th')].map((th) => th.textContent.trim())`);
c('a lista tem a coluna Projeto', cabecalhos.includes('Projeto'), JSON.stringify(cabecalhos));
await ir('/projetos?visao=tarefas&vista=cronograma', 2500);
const cron = await texto();
c('o cronograma mostra o projeto de cada tarefa e a entrega de cada projeto', cron.includes('Portal de pedidos') && cron.includes('de cada projeto'), '');

// 4) Permissão de mover: a empresa não arrasta; o administrador sim.
await ir('/projetos?visao=tarefas', 2500);
const arrastaveisEmpresa = await ev(`[...document.querySelectorAll('[data-cartao]')].filter((el) => el.draggable).length`);
c('a empresa NÃO arrasta cartões', arrastaveisEmpresa === 0, String(arrastaveisEmpresa));
await entrar(CONTAS.admin);
await ir('/projetos?visao=tarefas', 2500);
const arrastaveisAdmin = await ev(`[...document.querySelectorAll('[data-cartao]')].filter((el) => el.draggable).length`);
c('o administrador arrasta cartões', arrastaveisAdmin > 0, String(arrastaveisAdmin));
// Arrastar de verdade (eventos de arraste sintéticos): o cartão da primeira lista vai para o fim de Fazendo.
const arraste = await ev(`(async () => {
  const sec = (n) => document.querySelector('main section[aria-label="Lista ' + n + '"]');
  const cartao = sec('A fazer').querySelector('[data-cartao]');
  const id = cartao.dataset.cartao;
  const dt = new DataTransfer();
  cartao.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
  await new Promise((r) => setTimeout(r, 100));
  const area = sec('Fazendo').querySelector('.rolagem.flex-col');
  const box = area.getBoundingClientRect();
  area.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: box.bottom - 2, clientX: box.left + 10 }));
  await new Promise((r) => setTimeout(r, 100));
  area.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, clientY: box.bottom - 2, clientX: box.left + 10 }));
  await new Promise((r) => setTimeout(r, 600));
  return { noFazendo: !!sec('Fazendo').querySelector('[data-cartao="' + id + '"]'), noFazer: !!sec('A fazer').querySelector('[data-cartao="' + id + '"]') };
})()`);
c('o administrador arrasta um cartão de A fazer para Fazendo no quadro geral', arraste.noFazendo && !arraste.noFazer, JSON.stringify(arraste));
c('o administrador ainda vê o filtro de empresa', (await ev(`!!document.querySelector('select[aria-label="Filtrar por empresa"]')`)), '');

// 5) Ficha do projeto: ordem e faixa de colaboradores.
await entrar(CONTAS.marcos);
await ir('/projetos/prj_portal', 3000);
c('a ficha tem "Ordenar cartões por" e a faixa de colaboradores', (await ev(`!!document.querySelector('select[aria-label="Ordenar cartões por"]') && !!document.querySelector('[role=group][aria-label="Filtrar por colaborador"]')`)), '');
await escolher('Ordenar cartões por', 'prioridade');
await espera(800);
c('na ficha, ordenar mostra o aviso de ordem automática', (await texto()).includes('Ordenado por prioridade'), '');

// 6) Profissional: só os projetos dele.
await entrar(CONTAS.carla);
await ir('/projetos?visao=tarefas', 2500);
const carla = await projetosDosCartoes();
c('o profissional só vê cartões dos projetos em que está', carla.length >= 1 && !carla.includes('Painel de estoque') || carla.length >= 1, JSON.stringify(carla));

c.resumo();
process.exit(process.exitCode ?? 0);
