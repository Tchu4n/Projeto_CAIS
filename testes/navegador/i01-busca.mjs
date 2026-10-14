/* ============================================================================
   TESTES/NAVEGADOR/I01-BUSCA.MJS
   O que é: confere a busca global do topo (Topbar) nos três perfis e em várias telas: (1) o texto do campo só
     promete o que o perfil acha; (2) a lista aparece e dá para clicar em qualquer tela; (3) cada tipo de resultado
     (projeto, tarefa, arquivo, empresa, pessoa, trilha) leva ao destino certo e abre a ficha/detalhe; (4) teclado
     (Ctrl+K, "/", setas, Enter, Esc) e o comportamento com janela aberta; (5) o escopo: a empresa e o profissional
     nunca recebem dado de outra empresa nem link que leve a /sem-permissao; (6) o profissional travado pela trilha
     obrigatória só acha trilhas; (7) celular (375 px): a lista usa a largura da tela.
   Onde é usado: rodado à mão: node testes/navegador/i01-busca.mjs
     (com o `npm run dev` aberto em http://localhost:3000).
   Depende de: testes/navegador/cdp.mjs e do seed de lib/seed.ts (Vértice, Aurora, Ana, Carla, Elisa, Felipe...).
   Contexto: pedido de 14/10/2026 (busca do topo não funcionava como o campo promete).
   ============================================================================ */
import { abrirNavegador, conferir, CONTAS, espera } from './cdp.mjs';

const c = conferir();
const nav = await abrirNavegador('i01', 9390);
const { ev, ir, entrar, clicar, cmd, largura } = nav;

const CAMPO = 'input[aria-label="Busca global"]';
/** Profissional que ainda não fez a trilha obrigatória e está alocado num projeto (travado pelo §12). */
const ELISA = CONTAS.elisa;
/** Profissional convidado (0 de 5 na trilha de boas-vindas), também travado. */
const FELIPE = { pessoaId: 'pes_felipe', nome: 'Felipe Andrade', email: 'felipe.andrade@cais.example', perfil: 'profissional' };

/** Caminho + query atuais. */
const url = () => ev('location.pathname + location.search');
/** Texto visível da área principal. */
const texto = () => ev(`document.querySelector('main')?.innerText ?? ''`);
/** Foca o campo com o mouse, apaga o que houver e digita o texto (digitação de verdade, como a pessoa faria). */
const digitar = async (t) => {
  await clicar(CAMPO);
  await ev(`document.querySelector('${CAMPO}').select()`);
  await cmd('Input.insertText', { text: t });
  await espera(350);
};
/** Códigos de tecla virtual (Windows) das teclas usadas no teste. */
const VK = { ArrowDown: 40, ArrowUp: 38, Enter: 13, Escape: 27, k: 75, '/': 191 };
/** Aperta uma tecla (com modificadores: 2 = Ctrl). `texto` faz a tecla escrever o caractere. */
const tecla = async (key, mods = 0, texto) => {
  const base = { key, code: key.length === 1 ? (key === '/' ? 'Slash' : 'Key' + key.toUpperCase()) : key, windowsVirtualKeyCode: VK[key], modifiers: mods };
  await cmd('Input.dispatchKeyEvent', { type: texto ? 'keyDown' : 'rawKeyDown', ...base, ...(texto ? { text: texto } : {}) });
  await cmd('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  await espera(250);
};
/** As opções da lista, na ordem em que aparecem: [título, sub, tipo]. Lê o textContent (o innerText sairia em maiúsculas por causa do CSS). */
const opcoes = () => ev(`[...document.querySelectorAll('#busca-resultados [role=option]')].map((o) => [o.children[1].children[0].textContent, o.children[1].children[1].textContent, o.children[2].textContent])`);
/** Só os tipos, sem repetição. */
const tipos = async () => [...new Set((await opcoes()).map((o) => o[2]))];
/** Mensagem da lista quando não há opções (carregando, erro ou "nada encontrado"). */
const aviso = () => ev(`document.querySelector('[role=status]')?.innerText ?? ''`);
/** A lista está aberta e a 1ª opção realmente recebe o clique (nenhuma camada cobre a lista)? */
const clicavel = () => ev(`(() => { const ops = [...document.querySelectorAll('#busca-resultados [role=option]')]; if (!ops.length) return false; return ops.every((o) => { const r = o.getBoundingClientRect(); const el = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return o.contains(el); }); })()`);
/** Elemento com foco: aria-label ou nome da tag. */
const foco = () => ev(`(document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName)`);
/** Título da janela aberta (modal), se houver. */
const dialogo = () => ev(`document.querySelector('[role=dialog]')?.innerText ?? ''`);

/**
 * Clica na N-ésima opção de uma busca e devolve onde a pessoa foi parar.
 * @param rota - tela de onde a busca é feita.
 * @param consulta - texto digitado.
 * @param n - índice da opção (0 = primeira).
 */
const escolher = async (rota, consulta, n) => {
  await ir(rota, 2200);
  await digitar(consulta);
  await clicar(`#busca-resultados [role=option]:nth-child(${n + 1})`);
  await espera(2200);
  return { url: await url(), main: await texto(), dialogo: await dialogo() };
};

/**
 * Clica na primeira opção de um TIPO (ex.: "Empresa") numa busca e devolve onde a pessoa foi parar.
 * @param rota - tela de onde a busca é feita.
 * @param consulta - texto digitado.
 * @param tipo - "Projeto", "Empresa", "Pessoa"...
 */
const escolherTipo = async (rota, consulta, tipo) => {
  await ir(rota, 2200);
  await digitar(consulta);
  const i = (await opcoes()).findIndex((o) => o[2] === tipo);
  if (i < 0) return { url: 'sem opção do tipo ' + tipo, main: '', dialogo: '' };
  await clicar(`#busca-resultados [role=option]:nth-child(${i + 1})`);
  await espera(2200);
  return { url: await url(), main: await texto(), dialogo: await dialogo() };
};

/**
 * Percorre TODAS as opções de várias buscas e confere que nenhuma leva a uma tela proibida, vazia ou bloqueada.
 * @param quem - nome do perfil, para as mensagens.
 * @param rota - tela de onde a busca é feita.
 * @param consultas - textos digitados.
 */
const percorrer = async (quem, rota, consultas) => {
  for (const q of consultas) {
    await ir(rota, 2200);
    await digitar(q);
    const lista = await opcoes();
    for (let i = 0; i < lista.length; i++) {
      const r = await escolher(rota, q, i);
      const ruim = r.url.startsWith('/sem-permissao') || r.url.startsWith('/login') || /não encontrad/i.test(r.main) || r.main.includes('Conclua sua trilha de boas-vindas');
      c(`${quem}: "${q}" → ${lista[i][2]} "${lista[i][0]}" abre uma tela válida`, !ruim, r.url);
    }
  }
};

// 1) ADMINISTRADOR ---------------------------------------------------------
await entrar(CONTAS.admin);
await ir('/painel', 2500);
c('admin: o campo promete projeto, tarefa, empresa, pessoa e trilha', /projeto.*tarefa.*empresa.*pessoa.*trilha/.test(await ev(`document.querySelector('${CAMPO}').placeholder`)), await ev(`document.querySelector('${CAMPO}').placeholder`));

// A lista aparece e dá para clicar em qualquer tela (nada cobre a lista).
for (const rota of ['/painel', '/projetos', '/projetos/prj_portal', '/trilhas', '/pessoas', '/empresas', '/carga', '/acessos', '/perfil', '/design-system']) {
  await ir(rota, 2200);
  await digitar('portal');
  const ops = await opcoes();
  c(`admin em ${rota}: "portal" lista o projeto e dá para clicar`, ops.some((o) => o[0] === 'Portal de pedidos' && o[2] === 'Projeto') && (await clicavel()), `${ops.length} opções`);
}

await ir('/painel', 2500);
await digitar('p');
c('uma letra só não abre a lista', (await opcoes()).length === 0 && (await aviso()) === '', '');
await digitar('vertice');
const tiposVertice = await tipos();
c('"vertice" (sem acento) acha projeto, empresa, pessoa e trilha', ['Projeto', 'Empresa', 'Pessoa', 'Trilha'].every((t) => tiposVertice.includes(t)), JSON.stringify(tiposVertice));
await digitar('pedidos portal');
c('várias palavras em qualquer ordem: "pedidos portal" acha o projeto', (await opcoes()).some((o) => o[0] === 'Portal de pedidos'), '');
await digitar('11222333');
c('o CNPJ casa só com os números', (await opcoes()).some((o) => o[2] === 'Empresa' && o[0] === 'Vértice Logística'), '');
await digitar('zzzqq');
c('nada encontrado: a lista explica em vez de ficar vazia', (await aviso()).includes('Nada encontrado para “zzzqq”'), await aviso());

// Cada tipo leva ao destino certo e abre a ficha.
let r = await escolher('/painel', 'cnpj', 0);
c('tarefa: abre o quadro do projeto com o detalhe da tarefa', r.url === '/projetos/prj_portal?tarefa=tar_13' && r.dialogo.includes('Corrigir a validação do CNPJ'), r.url);
r = await escolher('/trilhas', 'fluxo-de-login', 0);
c('arquivo: abre o detalhe da tarefa que tem o anexo', r.url === '/projetos/prj_portal?tarefa=tar_1' && r.dialogo.includes('fluxo-de-login.pdf'), r.url);
r = await escolherTipo('/projetos', 'aurora saude', 'Empresa');
c('empresa: abre a ficha em /empresas?abrir=', r.url === '/empresas?abrir=emp_aurora' && r.dialogo.includes('Aurora Saúde'), r.url);
r = await escolher('/empresas', 'carla', 0);
c('pessoa: abre a ficha em /pessoas?abrir=, mesmo vindo de /empresas', r.url === '/pessoas?abrir=pes_carla' && r.dialogo.includes('Carla Nunes'), r.url);
r = await escolher('/pessoas', 'lgpd', 0);
c('trilha: abre o editor da trilha', r.url === '/trilhas/tri_lgpd' && r.main.includes('LGPD na prática'), r.url);
r = await escolher('/pessoas', 'portal', 0);
c('projeto: abre o quadro', r.url === '/projetos/prj_portal' && r.main.includes('Portal de pedidos'), r.url);

// Limite: as vagas são repartidas e a lista avisa quando há mais.
await ir('/painel', 2500);
await digitar('de');
const muitas = await opcoes();
c('"de" (muitos resultados): no máximo 10 opções', muitas.length >= 1 && muitas.length <= 10, String(muitas.length));
c('"de": mais de um tipo aparece (um tipo não esconde os outros)', (await tipos()).length >= 2, JSON.stringify(await tipos()));
const dica = await ev(`[...document.querySelectorAll('header p')].map((p) => p.innerText).find((t) => t.startsWith('Mostrando')) ?? ''`);
c('quando há mais do que cabe, a lista diz "Mostrando N de M"', muitas.length < 10 || /^Mostrando 10 de \d+/.test(dica), dica);

// 2) TECLADO -----------------------------------------------------------------
await ir('/painel', 2500);
await ev(`document.activeElement.blur()`);
await tecla('k', 2);
c('Ctrl+K foca o campo', (await foco()) === 'Busca global', await foco());
await cmd('Input.insertText', { text: 'portal' }); await espera(350);
c('digitando depois do Ctrl+K, a lista aparece', (await opcoes()).length >= 1, '');
await tecla('Escape'); await espera(400);
c('Esc limpa o texto, fecha a lista e tira o foco', (await ev(`document.querySelector('${CAMPO}').value`)) === '' && (await opcoes()).length === 0 && (await foco()) !== 'Busca global', await foco());
await tecla('/', 0, '/');
c('"/" fora de campos foca a busca', (await foco()) === 'Busca global', await foco());
await ev(`document.activeElement.blur()`);
await ir('/pessoas', 2500);
await ev(`document.querySelector('main input')?.focus()`);
const campoDaTela = await foco();
await tecla('/', 0, '/');
c('"/" dentro de outro campo de texto só escreve a barra (não rouba o foco)', (await foco()) === campoDaTela && (await ev(`document.activeElement.value`)) === '/', await foco());
await tecla('k', 2);
c('Ctrl+K funciona até dentro de outro campo de texto', (await foco()) === 'Busca global', await foco());

// Setas, Enter e o limite das pontas.
await ir('/painel', 2500);
await tecla('k', 2); await cmd('Input.insertText', { text: 'ar' }); await espera(350);
const total = (await opcoes()).length;
/** Índice da opção destacada na lista de resultados (-1 se nenhuma). */
const marcado = () => ev(`[...document.querySelectorAll('#busca-resultados [role=option]')].findIndex((o) => o.getAttribute('aria-selected') === 'true')`);
c('a 1ª opção começa destacada', (await marcado()) === 0, String(await marcado()));
await tecla('ArrowDown'); await tecla('ArrowDown');
c('↓ ↓ destaca a 3ª opção', total < 3 || (await marcado()) === 2, String(await marcado()));
for (let i = 0; i < 12; i++) await tecla('ArrowDown');
c('↓ não passa da última opção', (await marcado()) === total - 1, `${await marcado()} de ${total}`);
c('aria-activedescendant aponta para a opção destacada', (await ev(`document.querySelector('${CAMPO}').getAttribute('aria-activedescendant')`)) === `busca-op-${total - 1}`, '');
for (let i = 0; i < 12; i++) await tecla('ArrowUp');
c('↑ não passa da primeira opção', (await marcado()) === 0, String(await marcado()));
await tecla('ArrowDown');
const escolhida = (await opcoes())[1];
await tecla('Enter'); await espera(2000);
c('Enter abre a opção destacada e limpa a busca', (await url()) !== '/painel' && (await ev(`document.querySelector('${CAMPO}').value`)) === '', `${escolhida?.[0]} → ${await url()}`);

// Ctrl+K logo depois de escolher (dentro dos 150 ms do cronômetro de fechar) não pode esconder a lista nova.
await ir('/painel', 2500);
await digitar('portal');
await tecla('Enter');
await tecla('k', 2); await cmd('Input.insertText', { text: 'portal' }); await espera(500);
c('Ctrl+K logo depois do Enter: a lista aparece e fica aberta', (await opcoes()).length >= 1, '');

// Janela (modal) aberta: o atalho não deve mandar o foco para trás do fundo escuro.
await ir('/pessoas?abrir=pes_ana', 2800);
c('(preparo) a ficha da Ana abriu', (await dialogo()).includes('Ana Souza'), '');
await tecla('k', 2);
c('com janela aberta, Ctrl+K não rouba o foco para trás do fundo escuro', (await foco()) !== 'Busca global', await foco());
await tecla('/', 0, '/');
c('com janela aberta, "/" também não', (await foco()) !== 'Busca global', await foco());

// 3) EMPRESA (Marcos, da Vértice) -------------------------------------------
await entrar(CONTAS.marcos);
await ir('/projetos', 2500);
const phEmpresa = await ev(`document.querySelector('${CAMPO}').placeholder`);
c('empresa: o campo NÃO promete empresa nem pessoa', !/empresa|pessoa/i.test(phEmpresa) && /projeto/.test(phEmpresa) && /tarefa/.test(phEmpresa) && /trilha/.test(phEmpresa), phEmpresa);
for (const rota of ['/painel', '/projetos', '/projetos/prj_portal', '/trilhas', '/minhas-trilhas', '/perfil']) {
  await ir(rota, 2200);
  await digitar('portal');
  c(`empresa em ${rota}: "portal" lista o projeto e dá para clicar`, (await opcoes()).some((o) => o[0] === 'Portal de pedidos') && (await clicavel()), '');
}
await ir('/painel', 2500);
for (const q of ['aurora', 'agendamento', 'lembretes']) {
  await digitar(q);
  c(`empresa: "${q}" (dado da Aurora) não aparece`, (await opcoes()).length === 0, JSON.stringify(await opcoes()));
}
await digitar('ana');
c('empresa: "ana" não traz pessoa (a tela de pessoas é do admin)', !(await tipos()).includes('Pessoa'), JSON.stringify(await tipos()));
await digitar('processos');
c('empresa: "processos" acha a trilha dela no editor e a que ela cumpre', (await tipos()).includes('Trilha') && (await tipos()).includes('Minha trilha'), JSON.stringify(await tipos()));
r = await escolher('/painel', 'processos', 0);
c('empresa: a trilha do editor abre em /trilhas/', r.url === '/trilhas/tri_vertice', r.url);
r = await escolher('/painel', 'processos', 1);
c('empresa: "Minha trilha" abre o player em /minhas-trilhas/', r.url === '/minhas-trilhas/tri_vertice' && r.main.includes('Processos da Vértice'), r.url);
r = await escolher('/trilhas', 'cnpj', 0);
c('empresa: acha a tarefa e abre o detalhe (só leitura)', r.url === '/projetos/prj_portal?tarefa=tar_13' && r.dialogo.includes('Corrigir a validação do CNPJ'), r.url);
await percorrer('empresa', '/painel', ['pr', 'de']);

// 4) PROFISSIONAL (Ana) ---------------------------------------------------------
await entrar(CONTAS.ana);
await ir('/minhas-tarefas', 2500);
const phProf = await ev(`document.querySelector('${CAMPO}').placeholder`);
c('profissional: o campo NÃO promete empresa nem pessoa', !/empresa|pessoa/i.test(phProf) && /projeto/.test(phProf) && /tarefa/.test(phProf), phProf);
for (const rota of ['/painel', '/projetos', '/projetos/prj_portal', '/minhas-tarefas', '/minhas-trilhas', '/perfil']) {
  await ir(rota, 2200);
  await digitar('portal');
  c(`profissional em ${rota}: "portal" lista o projeto e dá para clicar`, (await opcoes()).some((o) => o[0] === 'Portal de pedidos') && (await clicavel()), '');
}
await ir('/minhas-tarefas', 2500);
for (const q of ['agendamento', 'lembretes', 'aurora', 'carla', 'estoque']) {
  await digitar(q);
  const ops = await opcoes();
  c(`profissional: "${q}" não traz dado de projeto/empresa/pessoa fora do escopo dele`, ops.every((o) => o[2] !== 'Pessoa' && o[2] !== 'Empresa' && !(o[2] === 'Projeto' && o[0] !== 'Portal de pedidos' && o[0] !== 'Sprint de acessibilidade')), JSON.stringify(ops));
}
r = await escolher('/minhas-tarefas', 'cnpj', 0);
c('profissional: acha a tarefa dele e abre o detalhe', r.url === '/projetos/prj_portal?tarefa=tar_13' && r.dialogo.includes('Corrigir a validação do CNPJ'), r.url);
r = await escolher('/painel', 'boas', 0);
c('profissional: acha a trilha que cumpre e abre o player', r.url === '/minhas-trilhas/tri_boasvindas', r.url);
await ir('/painel', 2500);
await digitar('boas');
c('profissional: nunca vê trilha do editor (/trilhas é de admin e empresa)', !(await tipos()).includes('Trilha'), JSON.stringify(await tipos()));
await percorrer('profissional', '/painel', ['pr', 'de']);

// 5) PROFISSIONAL TRAVADO pela trilha obrigatória (§12) --------------------------
for (const [nome, conta] of [['Elisa', ELISA], ['Felipe', FELIPE]]) {
  await entrar(conta);
  await ir('/painel', 2800);
  await digitar('estoque');
  c(`${nome} (trilha obrigatória pendente): a busca NÃO sugere projeto nem tarefa (levariam ao bloqueio)`, (await opcoes()).length === 0, JSON.stringify(await opcoes()));
  await digitar('boas');
  const ops = await opcoes();
  c(`${nome}: ainda acha a trilha que precisa cumprir`, ops.some((o) => o[2] === 'Minha trilha' && o[0] === 'Boas-vindas ao programa'), JSON.stringify(ops));
  r = await escolher('/painel', 'boas', 0);
  c(`${nome}: a trilha abre (sem tela de bloqueio)`, r.url === '/minhas-trilhas/tri_boasvindas' && !r.main.includes('Conclua sua trilha de boas-vindas para liberar'), r.url);
}

// 6) CELULAR (375 px): a lista usa a largura da tela, não a do campo estreito ------
await entrar(CONTAS.ana);
await largura(375, 800);
await ir('/painel', 2500);
await digitar('por');
const geo = await ev(`(() => { const op = document.querySelector('#busca-resultados'); const l = op?.parentElement; if (!l) return null; const r = l.getBoundingClientRect(); return { x: r.x, w: r.width, right: r.right, vw: innerWidth, rolaPagina: document.documentElement.scrollWidth > innerWidth }; })()`);
c('375 px: a lista fica inteira dentro da tela e é larga (≥ 300 px)', !!geo && geo.x >= 0 && geo.right <= geo.vw && geo.w >= 300 && !geo.rolaPagina, JSON.stringify(geo));
c('375 px: dá para clicar nas opções', await clicavel(), '');
r = await escolher('/painel', 'portal', 0);
c('375 px: clicar na opção abre o projeto', r.url === '/projetos/prj_portal', r.url);
await largura(1280, 900);

c('nenhum erro no console durante os testes', nav.erros.length === 0, nav.erros.slice(0, 2).join(' | '));
c.resumo();
nav.fechar();
process.exit(process.exitCode ?? 0);
