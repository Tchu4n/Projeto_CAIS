/* ============================================================================
   TESTES/NAVEGADOR/H05-HOME-DINAMICA.MJS
   O que é: confere a homepage dinâmica: (1) o botão "Voltar ao topo" só aparece depois de descer e leva
     ao início; (2) "Quero trazer minha empresa" rola até o formulário TODA vez que é clicado (inclusive
     depois de subir); (3) os passos de "Como funciona" aparecem um a um ao rolar.
   Onde é usado: rodado à mão: node testes/navegador/h05-home-dinamica.mjs
     (com o `npm run dev` aberto em http://localhost:3000).
   Depende de: testes/navegador/cdp.mjs, components/home/ (VoltarAoTopo, LinkRolar, Revelar).
   Contexto: pedido de 13/10/2026 (melhorias da homepage).
   ============================================================================ */
import { abrirNavegador, conferir, espera } from './cdp.mjs';

const c = conferir();
const nav = await abrirNavegador('h05', 9377);
const { ev, ir } = nav;
/** Posição vertical da rolagem. */
const y = () => ev('Math.round(window.scrollY)');
/** O botão "Voltar ao topo" está à mostra? (aria-hidden="false") */
const botaoVisivel = () => ev(`document.querySelector('button[aria-label="Voltar ao topo"]')?.getAttribute('aria-hidden') === 'false'`);

await ir('/', 2500);
c('no topo, o botão "Voltar ao topo" está escondido', !(await botaoVisivel()), '');

// 1) Descer e voltar.
await ev(`document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 1800)`);
await espera(800);
c('depois de descer, o botão aparece', await botaoVisivel(), String(await y()));
await ev(`document.querySelector('button[aria-label="Voltar ao topo"]').click()`);
await espera(2500);
c('clicar no botão volta ao topo', (await y()) < 5, String(await y()));

// 2) O botão do hero rola mais de uma vez.
const clicarHero = () => ev(`[...document.querySelectorAll('a')].find((a) => a.textContent.includes('Quero trazer minha empresa'))?.click()`);
await clicarHero();
await espera(2500);
const primeira = await y();
c('"Quero trazer minha empresa" rola até o formulário', primeira > 1500, String(primeira));
await ev(`document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0)`);
await espera(600);
await clicarHero();
await espera(2500);
const segunda = await y();
c('depois de subir, o mesmo botão rola de novo', segunda > 1500, String(segunda));

// 3) Os passos aparecem um a um.
await ev(`window.scrollTo(0, 0)`);
await espera(500);
await ev(`document.getElementById('como-funciona').scrollIntoView()`);
await espera(3500);
const passos = await ev(`[...document.querySelectorAll('#como-funciona ol > li')].map((li) => li.getAttribute('data-revelar'))`);
c('os 4 passos de "Como funciona" foram revelados', passos.length === 4 && passos.every((p) => p === 'mostra' || p === null), JSON.stringify(passos));

// 4) As barras da prévia do painel carregam enquanto a pessoa desce (e esvaziam ao subir).
/** Cargas (0 a 1) das 4 barras e o texto dos dois percentuais. */
const barras = () => ev(`({ cargas: [...document.querySelectorAll('#empresa [data-carga]')].map((b) => Number(b.style.getPropertyValue('--carga') || 1)), numeros: [...document.querySelectorAll('#empresa [data-contar]')].map((n) => n.textContent) })`);
await ev(`window.scrollTo(0, document.getElementById('empresa').offsetTop - window.innerHeight * 0.9)`);
await espera(600);
const comeco = await barras();
// Põe a primeira barra a 73% da altura da tela: no meio do caminho entre o início (92%) e o fim (55%).
await ev(`window.scrollTo(0, window.scrollY + document.querySelector('#empresa [data-carga]').getBoundingClientRect().top - window.innerHeight * 0.73)`);
await espera(600);
const meio = await barras();
await ev(`window.scrollTo(0, document.getElementById('empresa').offsetTop + 200)`);
await espera(600);
const fim = await barras();
c('barras começam vazias quando a seção está entrando', comeco.cargas.every((x) => x < 0.3), JSON.stringify(comeco.cargas));
c('as barras vão enchendo conforme desce', meio.cargas[0] > 0.2 && meio.cargas[0] < 0.8 && fim.cargas.every((x) => x === 1), `${comeco.cargas[0].toFixed(2)} → ${meio.cargas[0].toFixed(2)} → ${fim.cargas[0]}`);
c('os percentuais contam até 72% e 35%', fim.numeros.join(',') === '72%,35%' && comeco.numeros[0] !== '72%', `${comeco.numeros} → ${fim.numeros}`);

c.resumo();
process.exit(process.exitCode ?? 0);
