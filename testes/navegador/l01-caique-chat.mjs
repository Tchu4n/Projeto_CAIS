/* ============================================================================
   TESTES/NAVEGADOR/L01-CAIQUE-CHAT.MJS
   O que é: conferência do chat do CAIQUE (versão simulada): o botão flutuante, o estado vazio com sugestões,
     a resposta (com "digitando"), o feedback, o estado de erro com "Tentar de novo", limpar, Esc, o contexto da
     trilha e o celular (375 px, sem rolagem lateral). Também salva capturas de tela em CAIS_CAPTURAS (se definida).
   Onde é usado: rodado à mão: node testes/navegador/l01-caique-chat.mjs (com o `npm run dev` aberto em http://localhost:3000).
   Depende de: testes/navegador/cdp.mjs e do seed de lib/seed.ts.
   Contexto: §4 (trilhas), §13 (acessível); prompts I04 a I07 em docs/prompts.
   ============================================================================ */
import { writeFileSync } from 'node:fs';
import { abrirNavegador, conferir, CONTAS, espera } from './cdp.mjs';

const c = conferir();
const nav = await abrirNavegador('l01', 9371);
const { ev, ir, entrar, clicar, largura, cmd, erros } = nav;

/** Salva uma captura de tela, se a pasta de capturas foi informada. */
async function captura(nome) {
  if (!process.env.CAIS_CAPTURAS) return;
  const { result: { data } } = await cmd('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${process.env.CAIS_CAPTURAS}/${nome}.png`, Buffer.from(data, 'base64'));
}
/** Digita no campo do chat (setter nativo + evento, que o React entende). */
const digitar = (t) => ev(`(() => { const el = document.getElementById('caique-pergunta'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, ${JSON.stringify(t)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`);
const janela = () => ev(`document.querySelector('[role=dialog][aria-label*="CAIQUE"]')?.innerText ?? ''`);

try {
  await ev(`localStorage.removeItem('cais-dados-v6')`);
  await entrar(CONTAS.ana);
  await ir('/painel', 800);

  c('o botão flutuante aparece', await ev(`!!document.querySelector('button[aria-label="Abrir o chat do CAIQUE"]')`));
  c('a janela começa fechada', !(await ev(`!!document.querySelector('[role=dialog][aria-label*="CAIQUE"]')`)));
  await captura('01-botao');

  await clicar('button[aria-label="Abrir o chat do CAIQUE"]');
  await espera(300);
  c('abre a janela', await ev(`!!document.querySelector('[role=dialog][aria-label*="CAIQUE"]')`));
  c('estado vazio: boas-vindas e aviso de demonstração', /Oi! Eu sou o CAIQUE/.test(await janela()) && /simuladas/.test(await janela()));
  c('estado vazio: 3 sugestões fora de uma trilha', (await ev(`[...document.querySelectorAll('[role=dialog] button')].filter((b) => b.textContent.includes('?')).length`)) === 3);
  c('o foco vai para o campo de texto', await ev(`document.activeElement?.id === 'caique-pergunta'`));
  await captura('02-vazio');

  // Pergunta vazia: erro de validação.
  await clicar('button[aria-label="Enviar pergunta"]');
  await espera(200);
  c('pergunta vazia mostra o erro do campo', /Escreva a sua pergunta/.test(await janela()));

  // Envio normal: aparece "digitando" e depois a resposta.
  await digitar('Como funciona o quiz?');
  await clicar('button[aria-label="Enviar pergunta"]');
  await espera(250);
  c('mostra "CAIQUE está digitando…" enquanto espera', /digitando/.test(await janela()));
  await captura('03-digitando');
  await espera(1300);
  const conversa = await janela();
  c('a pergunta da pessoa aparece', /Você:\s*Como funciona o quiz\?/.test(conversa));
  c('a resposta do CAIQUE aparece', /CAIQUE:\s*Esta é uma resposta de demonstração/.test(conversa));
  c('o campo foi limpo depois de enviar', (await ev(`document.getElementById('caique-pergunta').value`)) === '');

  // Feedback: marca e desmarca.
  await clicar('button[aria-label="Resposta útil"]');
  await espera(150);
  c('avaliar marca "útil" (aria-pressed)', await ev(`document.querySelector('button[aria-label="Resposta útil"]').getAttribute('aria-pressed') === 'true'`));
  await clicar('button[aria-label="Resposta útil"]');
  await espera(150);
  c('clicar de novo desfaz a avaliação', await ev(`document.querySelector('button[aria-label="Resposta útil"]').getAttribute('aria-pressed') === 'false'`));
  await clicar('button[aria-label="Resposta útil"]');
  await captura('04-conversa');

  // Erro simulado: "/erro" falha; "Tentar de novo" repete a pergunta.
  await digitar('quero testar /erro');
  await clicar('button[aria-label="Enviar pergunta"]');
  await espera(1400);
  c('estado de erro: diz o que houve', await ev(`!!document.querySelector('[role=dialog] [role=alert]') && /Não consegui responder agora/.test(document.querySelector('[role=dialog]').innerText)`));
  c('estado de erro: oferece "Tentar de novo"', /Tentar de novo/.test(await janela()));
  await captura('05-erro');

  // Limpar: volta ao vazio.
  await clicar('button[aria-label="Limpar conversa"]');
  await espera(200);
  c('limpar volta ao estado vazio', /Oi! Eu sou o CAIQUE/.test(await janela()));

  // Esc fecha; a conversa continua ao trocar de tela.
  await digitar('oi');
  await clicar('button[aria-label="Enviar pergunta"]');
  await espera(1400);
  await ev(`document.getElementById('caique-pergunta').focus()`);
  await cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await espera(250);
  c('Esc fecha a janela', !(await ev(`!!document.querySelector('[role=dialog][aria-label*="CAIQUE"]')`)));

  // Contexto da trilha: dentro de uma trilha, o cabeçalho e as sugestões falam dela.
  await ir('/minhas-trilhas', 800);
  const href = await ev(`document.querySelector('main a[href^="/minhas-trilhas/"]')?.getAttribute('href') ?? ''`);
  c('há uma trilha para abrir', href.startsWith('/minhas-trilhas/'), href);
  if (href) {
    await ir(href, 800);
    await clicar('button[aria-label="Abrir o chat do CAIQUE"]');
    await espera(300);
    c('dentro da trilha: as sugestões falam da trilha (4 sugestões)', (await ev(`[...document.querySelectorAll('[role=dialog] button')].filter((b) => b.textContent.includes('?')).length`)) === 4 && /Do que trata a trilha/.test(await janela()));
    await captura('06-trilha');
  }

  // Celular: a janela cabe na tela e não cria rolagem lateral.
  await largura(375, 800);
  await ir('/painel', 800);
  await clicar('button[aria-label="Abrir o chat do CAIQUE"]');
  await espera(300);
  c('375 px: sem rolagem lateral', await ev(`document.documentElement.scrollWidth <= window.innerWidth`));
  c('375 px: a janela cabe na largura da tela', await ev(`(() => { const r = document.querySelector('[role=dialog]').getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth; })()`));
  await captura('07-celular');

  // Perfis sem trilhas próprias também têm o chat (admin).
  await largura(1280, 900);
  await entrar(CONTAS.admin);
  await ir('/painel', 800);
  c('o admin também vê o botão do chat', await ev(`!!document.querySelector('button[aria-label="Abrir o chat do CAIQUE"]')`));

  await ev(`localStorage.clear(); sessionStorage.clear()`);
  c('nenhum erro no console', erros.length === 0, erros.join(' || '));
} finally {
  nav.fechar();
  c.resumo();
}
