/* ============================================================================
   TESTES/NAVEGADOR/H07-CERTIFICADOS-LISTA-E-VERIFICACAO.MJS
   O que é: confere (1) a página PÚBLICA /verificar (sem login): código válido mostra nome e trilha,
     código inventado diz "não encontrado", e o link ?codigo= já vem conferido; (2) a lista de certificados
     emitidos: o administrador vê todos e a busca filtra; a empresa abre a lista e só vê o time dela;
     o profissional cai em /sem-permissao.
   Onde é usado: rodado à mão: node testes/navegador/h07-certificados-lista-e-verificacao.mjs
     (com o `npm run dev` aberto em http://localhost:3000).
   Depende de: testes/navegador/cdp.mjs e do seed de lib/seed.ts (Ana concluiu tri_boasvindas).
   Contexto: pedido de 13/10/2026 (certificados, itens 5 e 6 do plano).
   ============================================================================ */
import { abrirNavegador, conferir, CONTAS, espera } from './cdp.mjs';

const c = conferir();
const nav = await abrirNavegador('h07', 9380);
const { ev, ir, entrar } = nav;
/** Caminho atual da página. */
const rota = () => ev('location.pathname');
/** Texto visível da página (a pública não tem <main> do sistema, mas tem <main>). */
const texto = () => ev(`document.querySelector('main')?.innerText ?? document.body.innerText`);

// O código real da Ana: lido da folha dela.
await entrar(CONTAS.ana);
await ir('/certificados/tri_boasvindas', 2500);
const codigo = ((await ev(`document.querySelector('.certificado-folha')?.innerText ?? ''`)).match(/CAIS-\d{4}-[0-9A-F]{8}/) ?? [''])[0];
c('o código da Ana foi lido da folha', !!codigo, codigo);

// 1) Verificação pública: SEM sessão.
await entrar(null);
await ir(`/verificar?codigo=${codigo}`, 2500);
c('/verificar abre sem login', (await rota()) === '/verificar', await rota());
let t = await texto();
c('link com ?codigo= já mostra "Certificado válido" com o nome e a trilha', t.includes('Certificado válido') && t.includes('Ana Souza') && t.includes('Boas-vindas ao programa'), t.slice(0, 160));

await ir('/verificar', 2000);
t = await texto();
c('sem código, a página pede o código', t.includes('Digite o código'), '');
await ev(`(() => { const i = document.querySelector('input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'CAIS-2026-00000000'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await ev(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Conferir'))?.click()`);
await espera(600);
t = await texto();
c('código inventado → "Código não encontrado"', t.includes('Código não encontrado'), t.slice(0, 120));

// 2) Lista de emitidos.
await entrar(CONTAS.admin);
await ir('/certificados/emitidos', 2500);
t = await texto();
const linhas = await ev(`document.querySelectorAll('main tbody tr').length`);
c('admin vê a lista com várias pessoas', linhas >= 3 && t.includes('Ana Souza'), String(linhas));
await ev(`(() => { const i = document.querySelector('main input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'Ana Souza'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await espera(500);
const filtradas = await ev(`[...document.querySelectorAll('main tbody tr')].map((r) => r.innerText)`);
c('a busca filtra pela pessoa', filtradas.length >= 1 && filtradas.every((x) => x.includes('Ana Souza')) && filtradas.length < linhas, `${filtradas.length} de ${linhas}`);

await entrar(CONTAS.marcos);
await ir('/certificados/emitidos', 2500);
const doTime = await ev(`[...document.querySelectorAll('main tbody tr')].map((r) => r.innerText)`);
c('a empresa só vê trilhas dela (a de boas-vindas, geral, não aparece)', (await rota()) === '/certificados/emitidos' && doTime.every((x) => !x.includes('Boas-vindas')), `${doTime.length} linhas`);

await entrar(CONTAS.ana);
await ir('/certificados/emitidos', 2500);
for (let i = 0; i < 10 && (await rota()) !== '/sem-permissao'; i++) await espera(500);
c('profissional em /certificados/emitidos → /sem-permissao', (await rota()) === '/sem-permissao', await rota());

c.resumo();
process.exit(process.exitCode ?? 0);
