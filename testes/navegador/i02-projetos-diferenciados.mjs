/* ============================================================================
   TESTES/NAVEGADOR/I02-PROJETOS-DIFERENCIADOS.MJS
   O que é: confere a diferenciação visual dos projetos na visão geral das tarefas (/projetos?visao=tarefas):
     (1) a legenda tem um chip por projeto, com nome, contagem e a soma batendo com o resumo; (2) cada cartão do
     quadro tem faixa e bolinha na cor do projeto, o nome escrito e cores diferentes para projetos diferentes;
     (3) clicar no chip filtra (?projeto=), marca aria-pressed e clicar de novo desfaz; o teclado alcança o chip com
     foco visível; (4) a lista e o cronograma mostram a bolinha, e o cronograma tem uma linha de entrega colorida por
     projeto; (5) no tema escuro a cor clareia; (6) em 375 px nada estoura a largura; (7) o profissional só vê a
     legenda dos projetos dele.
   Onde é usado: rodado à mão: node testes/navegador/i02-projetos-diferenciados.mjs
     (com o `npm run dev` aberto em http://localhost:3000).
   Depende de: testes/navegador/cdp.mjs e do seed de lib/seed.ts (Vértice: prj_portal roxo, prj_estoque verde e
     prj_sprint azul).
   Contexto: pedido de 14/10/2026 (diferenciar os projetos na visão geral das tarefas).
   ============================================================================ */
import { abrirNavegador, conferir, CONTAS, espera } from './cdp.mjs';

const c = conferir();
const nav = await abrirNavegador('i02', 9391);
const { ev, ir, entrar, tab, largura } = nav;
/** Caminho + query atuais. */
const url = () => ev('location.pathname + location.search');
/** Seletor da lista de chips da legenda. */
const LEGENDA = 'ul[aria-label="Projetos: legenda e filtro"]';
/** Chips da legenda: nome, contagem, estado e posição na tela. */
const chips = () => ev(`[...document.querySelectorAll('${LEGENDA} button')].map((b) => ({ nome: b.querySelector('span.truncate').textContent, total: Number(b.querySelector('.tabular-nums').firstChild.textContent), marcado: b.getAttribute('aria-pressed') === 'true', direita: Math.round(b.getBoundingClientRect().right) }))`);
/** Por cartão do quadro: nome escrito acima do título e cor da faixa (variável --cor-projeto). */
const cartoes = () => ev(`[...document.querySelectorAll('[data-cartao]')].map((el) => ({ nome: el.querySelector('p.uppercase')?.textContent ?? '', cor: el.querySelector('span[aria-hidden][style*="--cor-projeto"]')?.style.getPropertyValue('--cor-projeto') ?? '', bolinhas: el.querySelectorAll('p.uppercase span[aria-hidden]').length, rotulo: el.getAttribute('aria-label') }))`);
/** Clica num chip pelo nome do projeto (clique do React: o .click() do DOM basta). */
const clicarChip = (nome) => ev(`[...document.querySelectorAll('${LEGENDA} button')].find((b) => b.textContent.includes(${JSON.stringify(nome)}))?.click()`);
/** Cor de fundo calculada da primeira bolinha da legenda (muda com o tema). */
const corDaBolinha = () => ev(`getComputedStyle(document.querySelector('${LEGENDA} button span[aria-hidden]')).backgroundColor`);

// 1) Legenda no quadro (empresa Vértice).
await entrar(CONTAS.marcos);
await ir('/projetos?visao=tarefas', 3000);
const legenda = await chips();
c('a legenda tem um chip por projeto da empresa', legenda.length >= 2 && ['Portal de pedidos', 'Painel de estoque'].every((n) => legenda.some((l) => l.nome === n)), JSON.stringify(legenda.map((l) => l.nome)));
const resumo = Number((await ev(`document.querySelector('ul[aria-label="Resumo das tarefas"] li').textContent`)).match(/\d+/)[0]);
c('a soma das contagens dos chips é o total do resumo', legenda.reduce((s, l) => s + l.total, 0) === resumo, `${legenda.map((l) => l.total).join('+')} = ${resumo}`);
c('sem filtro nenhum chip está marcado', legenda.every((l) => !l.marcado), '');

// 2) Cartões do quadro: faixa + bolinha + nome escrito, e cor diferente por projeto.
const cards = await cartoes();
c('todo cartão tem faixa colorida, uma bolinha e o nome do projeto', cards.length > 0 && cards.every((k) => k.cor && k.bolinhas === 1 && k.nome), `${cards.length} cartões`);
const corPorProjeto = new Map(cards.map((k) => [k.nome, k.cor]));
c('projetos diferentes têm cores diferentes nos cartões', corPorProjeto.size >= 2 && new Set(corPorProjeto.values()).size === corPorProjeto.size, JSON.stringify([...corPorProjeto]));
c('o rótulo de acessibilidade do cartão cita o projeto (cor nunca sozinha)', cards.every((k) => k.rotulo.includes(`Projeto: ${k.nome}.`)), cards[0]?.rotulo);

// 3) Clicar no chip filtra; clicar de novo desfaz.
await clicarChip('Painel de estoque');
await espera(1200);
const depois = await chips();
c('clicar no chip marca aria-pressed só nele', depois.filter((l) => l.marcado).map((l) => l.nome).join() === 'Painel de estoque', JSON.stringify(depois.map((l) => l.marcado)));
c('o filtro vai para a URL (?projeto=prj_estoque)', (await url()).includes('projeto=prj_estoque'), await url());
c('só sobram cartões do Painel de estoque', (await cartoes()).length > 0 && (await cartoes()).every((k) => k.nome === 'Painel de estoque'), '');
c('os chips continuam mostrando os outros projetos e as contagens', depois.length === legenda.length && depois.every((l, i) => l.total === legenda[i].total), '');
await clicarChip('Painel de estoque');
await espera(1200);
c('clicar de novo no chip tira o filtro', !(await url()).includes('projeto=') && (await chips()).every((l) => !l.marcado), await url());
await clicarChip('Portal de pedidos');
// Espera a URL atualizar entre os cliques (o router.replace é assíncrono; uma pessoa nunca clica em 0 ms).
await espera(1200);
await clicarChip('Painel de estoque');
await espera(1200);
c('dá para marcar mais de um projeto', (await chips()).filter((l) => l.marcado).length === 2, await url());
await ir('/projetos?visao=tarefas', 2500);

// Teclado: o Tab alcança um chip e o foco fica visível.
let foco = null;
for (let i = 0; i < 40; i++) { foco = await tab(); if (foco?.tag === 'BUTTON' && legenda.some((l) => foco.texto.includes(l.nome))) break; }
c('o Tab chega num chip da legenda com foco visível', !!foco && legenda.some((l) => foco.texto.includes(l.nome)) && foco.visivel, JSON.stringify(foco));

// 4) Lista e cronograma.
await ir('/projetos?visao=tarefas&vista=lista', 3000);
const linhas = await ev(`[...document.querySelectorAll('main tbody tr')].map((tr) => { const td = tr.children[1]; return { nome: td.textContent.trim(), bolinha: !!td.querySelector('span[aria-hidden][style*="--cor-projeto"]') }; })`);
c('na lista cada linha tem bolinha colorida e o nome do projeto', linhas.length > 0 && linhas.every((l) => l.bolinha && l.nome), `${linhas.length} linhas`);
await ir('/projetos?visao=tarefas&vista=cronograma', 3000);
const cron = await ev(`({ nomes: [...document.querySelectorAll('main li button .flex.items-center.gap-1\\\\.5')].filter((s) => s.querySelector('span[aria-hidden]')).length,
  linhas: [...document.querySelectorAll('main span[title^="Entrega prevista de "]')].map((s) => ({ titulo: s.title, cor: s.style.getPropertyValue('--cor-projeto'), etiqueta: s.textContent })) })`);
c('no cronograma cada tarefa tem a bolinha do projeto ao lado do nome', cron.nomes > 0, String(cron.nomes));
c('o cronograma tem uma linha de entrega colorida por projeto, com etiqueta escrita', cron.linhas.length >= 2 && new Set(cron.linhas.map((l) => l.cor)).size === cron.linhas.length && cron.linhas.every((l) => l.etiqueta.startsWith('Entrega · ') && l.titulo.endsWith(l.etiqueta.replace('Entrega · ', ''))), JSON.stringify(cron.linhas));
c('a legenda do cronograma explica as cores', (await ev(`document.querySelector('main').innerText`)).includes('linha vertical de entrega usam a cor de cada projeto'), '');

// 5) Tema escuro: a cor clareia (a bolinha fica diferente da do tema claro).
await ir('/projetos?visao=tarefas', 2500);
// O Chrome headless herda o tema do Windows: força o claro antes de medir.
await ev(`document.documentElement.classList.remove('dark')`);
await espera(300);
const clara = await corDaBolinha();
await ev(`document.documentElement.classList.add('dark')`);
await espera(300);
const escura = await corDaBolinha();
c('no tema escuro a cor do projeto clareia', clara !== escura, `${clara} → ${escura}`);
await ev(`document.documentElement.classList.remove('dark')`);

// 6) Celular (375 px): nada estoura a largura e os chips cabem.
await largura(375, 800);
await ir('/projetos?visao=tarefas', 2500);
c('em 375 px a página não ganha rolagem horizontal', (await ev(`document.documentElement.scrollWidth <= window.innerWidth`)), '');
c('em 375 px todos os chips cabem na tela', (await chips()).every((l) => l.direita <= 375), JSON.stringify((await chips()).map((l) => l.direita)));
await largura(1280, 900);

// 7) Profissional: a legenda só traz os projetos que ele enxerga.
await entrar(CONTAS.carla);
await ir('/projetos?visao=tarefas', 3000);
const nomesCarla = [...new Set((await cartoes()).map((k) => k.nome))];
const legendaCarla = (await chips()).map((l) => l.nome);
c('a legenda do profissional traz os projetos dele (ou some se for um só)', legendaCarla.length === 0 ? nomesCarla.length <= 1 : nomesCarla.every((n) => legendaCarla.includes(n)), `${JSON.stringify(legendaCarla)} · cartões: ${JSON.stringify(nomesCarla)}`);

if (nav.erros.length) console.log('Erros no console da página:', nav.erros.slice(0, 3));
c('sem erros no console', nav.erros.length === 0, nav.erros[0] ?? '');
c.resumo();
nav.fechar();
process.exit(process.exitCode ?? 0);
