/* ============================================================================
   TESTES/NAVEGADOR/H03-TRILHAS-DA-EMPRESA.MJS
   O que é: confere que a EMPRESA (Marcos, da Vértice) (1) vê no painel QUEM concluiu, está em andamento
     ou não iniciou cada trilha do time; (2) abre /trilhas só com as trilhas dela; (3) cria uma trilha,
     escolhe entre os colaboradores dela quem recebe e vê a pessoa escolhida no progresso; (4) não abre
     a trilha do administrador pela URL (/sem-permissao).
   Onde é usado: rodado à mão: node testes/navegador/h03-trilhas-da-empresa.mjs
     (com o `npm run dev` aberto em http://localhost:3000).
   Depende de: testes/navegador/cdp.mjs e do seed de lib/seed.ts (trilha tri_vertice, projetos da Vértice).
   Contexto: pedido de 13/10/2026: a empresa não via nem alocava o time nas trilhas e não criava trilhas.
   ============================================================================ */
import { abrirNavegador, conferir, CONTAS, espera } from './cdp.mjs';

const c = conferir();
const nav = await abrirNavegador('h03', 9375);
const { ev, ir, entrar } = nav;
/** Caminho atual da página. */
const rota = () => ev('location.pathname');
/** Texto visível da área principal. */
const texto = () => ev(`document.querySelector('main')?.innerText ?? ''`);
/** Trilhas salvas na store (localStorage). */
const trilhasSalvas = () => ev(`JSON.parse(localStorage.getItem('cais-dados-v6') || '{"trilhas":[]}').trilhas`);

await entrar(CONTAS.marcos);

// 1) Painel: "Ver quem" mostra os nomes do time na trilha da Vértice.
await ir('/painel', 2500);
await ev(`document.querySelector('main details summary')?.click()`);
await espera(400);
const painel = await texto();
c('painel da empresa tem "Ver quem" com nomes (Carla, da trilha da Vértice)', painel.includes('Ver quem') && painel.includes('Carla'), painel.slice(0, 80));

// 2) /trilhas: só as da empresa.
await ir('/trilhas', 2200);
const lista = await texto();
c('empresa abre /trilhas e vê "Processos da Vértice"', (await rota()) === '/trilhas' && lista.includes('Processos da Vértice'), await rota());
c('empresa NÃO vê a trilha geral do administrador na lista', !lista.includes('Boas-vindas'), lista.slice(0, 120));

// 3) Criar trilha, escolher pessoas.
// NAVEGA: o botão Nova trilha abre o editor da trilha criada.
await ev(`[...document.querySelectorAll('main button')].find((b) => b.textContent.includes('Nova trilha'))?.click()`);
await espera(1500);
c('"Nova trilha" abre o editor (/trilhas/tri_...)', (await rota()).startsWith('/trilhas/tri_'), await rota());
const idNova = (await rota()).split('/')[2];
const salva = (await trilhasSalvas()).find((t) => t.id === idNova);
c('trilha nasce da empresa (alcance empresa, dona Vértice)', salva?.alcance === 'empresa' && salva?.donaEmpresaId === 'emp_vertice' && salva?.empresaId === 'emp_vertice', JSON.stringify(salva));

await ev(`[...document.querySelectorAll('main [role=tab]')].find((t) => t.textContent.includes('Público'))?.click()`);
await espera(500);
const abaPublico = await texto();
c('alcance da empresa não oferece "Geral"', !abaPublico.includes('Geral') && abaPublico.includes('Pessoas escolhidas'), abaPublico.slice(0, 160));
await ev(`[...document.querySelectorAll('main button')].find((b) => b.textContent.trim() === 'Pessoas escolhidas')?.click()`);
await espera(500);
const caixas = await ev(`document.querySelectorAll('main ul input[type=checkbox]').length`);
c('lista só os colaboradores alocados nos projetos da Vértice (Ana, Bruno...)', caixas >= 2 && caixas <= 6, String(caixas));
c('não lista profissional fora dos projetos da Vértice (Felipe, convidado sem projeto)', !(await texto()).includes('Felipe'), '');
await ev(`document.querySelector('main ul input[type=checkbox]')?.click()`);
await espera(500);
const depois = (await trilhasSalvas()).find((t) => t.id === idNova);
c('marcar uma pessoa grava em pessoaIds', depois?.alcance === 'profissional' && depois?.pessoaIds?.length === 1, JSON.stringify(depois?.pessoaIds));

// 4) Trilha do administrador pela URL.
await ir('/trilhas/tri_boasvindas', 2500);
for (let i = 0; i < 10 && (await rota()) !== '/sem-permissao'; i++) await espera(500);
c('trilha do administrador pela URL → /sem-permissao', (await rota()) === '/sem-permissao', await rota());

c.resumo();
process.exit(process.exitCode ?? 0);
