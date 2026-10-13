/* ============================================================================
   TESTES/NAVEGADOR/H02-CORRECOES-H01.MJS
   O que é: confere as correções da revisão H01: (1) Elisa, com a trilha obrigatória pendente, abrindo
     um projeto de fora pela URL vai para /sem-permissao (e não vê o aviso da trilha); (2) o filtro de
     período "Personalizado" acompanha o botão Voltar do navegador; (3) o fundo do modal usa token,
     não hex. A carga "de hoje" no fim de semana é coberta por lib/carga.casos.ts.
   Onde é usado: rodado à mão: node testes/navegador/h02-correcoes-h01.mjs
     (com o `npm run dev` aberto em http://localhost:3000).
   Depende de: testes/navegador/cdp.mjs e do seed de lib/seed.ts.
   Contexto: docs/revisoes/H01-blocos-D-E.md e H01-blocos-F-G.md.
   ============================================================================ */
import { abrirNavegador, conferir, CONTAS, espera } from './cdp.mjs';

const c = conferir();
const nav = await abrirNavegador('h02', 9374);
const { ev, ir, entrar } = nav;
/** Caminho atual da página. */
const rota = () => ev('location.pathname');

// 1) Elisa × projeto de fora.
await entrar(CONTAS.elisa);
await ir('/painel', 1500);
// prj_portal é um projeto em que a Elisa não está alocada (lib/seed.ts).
const fora = 'prj_portal';
await ir(`/projetos/${fora}`, 2500);
for (let i = 0; i < 10 && (await rota()) !== '/sem-permissao'; i++) await espera(500);
c('Elisa em projeto de fora → /sem-permissao', (await rota()) === '/sem-permissao', await rota());

// 2) Filtro de período × botão Voltar.
await entrar(CONTAS.admin);
/** Quantos campos de data o filtro mostra (0 = "Personalizado" fechado). */
const campos = () => ev(`document.querySelectorAll('input[type=date]').length`);
await ir('/painel?de=2026-01-01&ate=2026-01-31', 2000);
c('período personalizado da URL abre os campos de data', (await campos()) >= 2, String(await campos()));
// O que o botão Voltar faz: a URL muda por fora (aqui, navegação do próprio Next para o painel sem ?de=&ate=,
// que equivale ao atalho de 30 dias). Os campos de data precisam fechar.
// NAVEGA: troca a URL do painel pelo roteador do Next (as duas chamadas abaixo).
await ev(`window.next.router.push('/painel')`);
await espera(1500);
c('URL muda por fora para um atalho → os campos de data fecham', (await campos()) === 0, String(await campos()));
await ev(`window.next.router.push('/painel?de=2026-01-01&ate=2026-01-31')`);
await espera(1500);
c('URL muda por fora para um período personalizado → os campos abrem', (await campos()) >= 2, String(await campos()));

// 3) Modal sem hex no fundo.
await ir('/acessos', 1800);
await ev(`[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')?.startsWith('Ações de'))?.click()`);
await espera(400);
await ev(`[...document.querySelectorAll('button,[role=menuitem]')].find(b=>b.innerText.trim()==='Redefinir senha')?.click()`);
await espera(700);
const veu = await ev(`(()=>{const el=document.querySelector('.animate-fade-in.absolute.inset-0');return el?el.className:''})()`);
c('fundo do modal usa o token bg-veu', veu.includes('bg-veu'), veu);

c.resumo();
process.exit(process.exitCode ?? 0);
