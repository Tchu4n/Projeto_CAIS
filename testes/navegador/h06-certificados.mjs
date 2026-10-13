/* ============================================================================
   TESTES/NAVEGADOR/H06-CERTIFICADOS.MJS
   O que é: confere os certificados das trilhas concluídas: (1) Ana, que concluiu trilhas no seed, vê
     "Seus certificados" em Minhas trilhas e abre a folha com o nome, a trilha e o código; (2) Felipe, que
     não concluiu nada, não vê a seção e a folha diz "Certificado indisponível"; (3) o administrador não
     abre /certificados; (4) na impressão o menu, o topo e os botões somem e a folha fica.
   Onde é usado: rodado à mão: node testes/navegador/h06-certificados.mjs
     (com o `npm run dev` aberto em http://localhost:3000).
   Depende de: testes/navegador/cdp.mjs e do seed de lib/seed.ts (Ana concluiu tri_boasvindas).
   Contexto: pedido de 13/10/2026 (emissão de certificados).
   ============================================================================ */
import { abrirNavegador, conferir, CONTAS, espera } from './cdp.mjs';

const c = conferir();
const nav = await abrirNavegador('h06', 9378);
const { ev, ir, entrar, cmd } = nav;
/** Caminho atual da página. */
const rota = () => ev('location.pathname');
/** Texto visível da área principal. */
const texto = () => ev(`document.querySelector('main')?.innerText ?? ''`);

// 1) Ana concluiu a trilha de boas-vindas no seed.
await entrar(CONTAS.ana);
await ir('/minhas-trilhas', 2500);
const lista = await texto();
c('Ana vê a seção "Seus certificados"', lista.includes('Seus certificados') && lista.includes('Ver certificado'), lista.slice(0, 120));
await ir('/certificados/tri_boasvindas', 2500);
const folha = await ev(`document.querySelector('.certificado-folha')?.innerText ?? ''`);
c('a folha traz o nome, a trilha e o código CAIS-', folha.includes('Ana Souza') && folha.includes('Boas-vindas ao programa') && /CAIS-\d{4}-[0-9A-F]{8}/.test(folha), folha.replace(/\n+/g, ' | ').slice(0, 200));
const codigo1 = (folha.match(/CAIS-\d{4}-[0-9A-F]{8}/) ?? [''])[0];
await ir('/certificados/tri_boasvindas', 2000);
const codigo2 = ((await ev(`document.querySelector('.certificado-folha')?.innerText ?? ''`)).match(/CAIS-\d{4}-[0-9A-F]{8}/) ?? [''])[0];
c('o código é o mesmo ao abrir de novo', !!codigo1 && codigo1 === codigo2, `${codigo1} / ${codigo2}`);

// 4) Impressão: menu, topo e botões somem; a folha fica.
await cmd('Emulation.setEmulatedMedia', { media: 'print' });
await espera(300);
const impressao = await ev(`({ aside: [...document.querySelectorAll('aside')].every((a) => getComputedStyle(a).display === 'none'), topo: getComputedStyle(document.querySelector('header')).display === 'none', botoes: getComputedStyle(document.querySelector('.nao-imprimir')).display === 'none', folha: getComputedStyle(document.querySelector('.certificado-folha')).display !== 'none' })`);
c('na impressão o menu, o topo e os botões somem e a folha fica', impressao.aside && impressao.topo && impressao.botoes && impressao.folha, JSON.stringify(impressao));
await cmd('Emulation.setEmulatedMedia', { media: 'screen' });

// Trilha que ela não concluiu (ou inexistente): indisponível.
await ir('/certificados/tri_inexistente', 2000);
c('trilha inexistente → "Certificado indisponível"', (await texto()).includes('Certificado indisponível'), '');

// 2) Felipe não concluiu nada.
await entrar(CONTAS.felipe ?? { pessoaId: 'pes_felipe', nome: 'Felipe Andrade', email: 'felipe.andrade@cais.example', perfil: 'profissional' });
await ir('/minhas-trilhas', 2500);
c('Felipe não vê "Seus certificados"', !(await texto()).includes('Seus certificados'), '');

// 3) Admin não abre.
await entrar(CONTAS.admin);
await ir('/certificados/tri_boasvindas', 2500);
for (let i = 0; i < 10 && (await rota()) !== '/sem-permissao'; i++) await espera(500);
c('admin em /certificados → /sem-permissao', (await rota()) === '/sem-permissao', await rota());

c.resumo();
process.exit(process.exitCode ?? 0);
