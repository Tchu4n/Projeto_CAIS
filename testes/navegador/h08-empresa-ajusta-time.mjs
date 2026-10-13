/* ============================================================================
   TESTES/NAVEGADOR/H08-EMPRESA-AJUSTA-TIME.MJS
   O que é: confere que a EMPRESA (Marcos, da Vértice) retira e devolve pessoas do time numa trilha publicada
     pelo administrador (tri_vertice): a pessoa retirada some do progresso e do painel; devolver traz de volta;
     quem já concluiu fica travado; e o administrador vê o aviso de quantas pessoas a empresa retirou.
   Onde é usado: rodado à mão: node testes/navegador/h08-empresa-ajusta-time.mjs
     (com o `npm run dev` aberto em http://localhost:3000).
   Depende de: testes/navegador/cdp.mjs e do seed de lib/seed.ts (trilha tri_vertice, alcance empresa).
   Contexto: pedido de 13/10/2026 (melhoria 1 das trilhas da empresa).
   ============================================================================ */
import { abrirNavegador, conferir, CONTAS, espera } from './cdp.mjs';

const c = conferir();
const nav = await abrirNavegador('h08', 9381);
const { ev, ir, entrar } = nav;
/** Texto visível da área principal. */
const texto = () => ev(`document.querySelector('main')?.innerText ?? ''`);
/** Lista de excluidosIds salva na trilha tri_vertice (vazia se nunca gravou). */
const excluidos = () => ev(`JSON.parse(localStorage.getItem('cais-dados-v6') || '{"trilhas":[]}').trilhas.find((t) => t.id === 'tri_vertice')?.excluidosIds ?? []`);
/** Abre a aba "Quem recebe" do editor e devolve as caixas { id, marcada, travada }. */
const abrirQuemRecebe = async () => {
  await ir('/trilhas/tri_vertice', 2500);
  await ev(`[...document.querySelectorAll('main [role=tab]')].find((t) => t.textContent.includes('Quem recebe'))?.click()`);
  await espera(500);
  return ev(`[...document.querySelectorAll('main ul input[type=checkbox]')].map((i) => ({ id: i.id, marcada: i.checked, travada: i.disabled }))`);
};

await entrar(CONTAS.marcos);
let caixas = await abrirQuemRecebe();
c('a empresa vê caixas para cada colaborador', caixas.length >= 2 && caixas.every((x) => x.marcada || x.travada === false), JSON.stringify(caixas));
const concluidas = caixas.filter((x) => x.travada);
c('quem já concluiu fica travado (retirar apagaria o certificado)', concluidas.length >= 1, `${concluidas.length} travada(s)`);

// Retira a primeira pessoa que não concluiu.
const alvo = caixas.find((x) => !x.travada && x.marcada);
c('há alguém que pode ser retirado', !!alvo, JSON.stringify(alvo));
const idAlvo = alvo.id.replace(/^p-/, '');
await ev(`document.getElementById('${alvo.id}').click()`);
await espera(600);
c('desmarcar grava a pessoa em excluidosIds', (await excluidos()).includes(idAlvo), JSON.stringify(await excluidos()));

// A pessoa some do progresso (aba Progresso).
await ev(`[...document.querySelectorAll('main [role=tab]')].find((t) => t.textContent.includes('Progresso'))?.click()`);
await espera(500);
const nomeAlvo = await ev(`JSON.parse(localStorage.getItem('cais-dados-v6')).pessoas.find((p) => p.id === '${idAlvo}').nome`);
c('a pessoa retirada some da aba Progresso', !(await texto()).includes(nomeAlvo), nomeAlvo);

// O administrador vê o aviso.
await entrar(CONTAS.admin);
await ir('/trilhas/tri_vertice', 2500);
await ev(`[...document.querySelectorAll('main [role=tab]')].find((t) => t.textContent.includes('Público'))?.click()`);
await espera(500);
c('o administrador vê "A empresa retirou 1 pessoa(s)"', (await texto()).includes('A empresa retirou 1 pessoa'), '');

// Devolver traz de volta.
await entrar(CONTAS.marcos);
caixas = await abrirQuemRecebe();
const volta = caixas.find((x) => x.id === `p-${idAlvo}`);
c('a pessoa retirada aparece desmarcada', volta && !volta.marcada, JSON.stringify(volta));
await ev(`document.getElementById('p-${idAlvo}').click()`);
await espera(600);
c('marcar de novo devolve a pessoa ao time', !(await excluidos()).includes(idAlvo), JSON.stringify(await excluidos()));

c.resumo();
process.exit(process.exitCode ?? 0);
