/* ============================================================================
   CASOS DE TESTE DO LOGIN COM GOOGLE
   O que é: script simples (sem biblioteca de testes) que confere resolverContaGoogle: quem entra e por que alguém é recusado.
   Onde é usado: rodado à mão no terminal; nenhuma tela importa este arquivo.
   Depende de: lib/googleLogin.ts e lib/tipos.ts (imports com extensão .ts para o Node achar os módulos).
   Contexto: §3 (perfis), §11 (conta inativa) e §12 (login e primeiro acesso).
   Como rodar: node --experimental-strip-types lib/googleLogin.casos.ts
   ============================================================================ */

import { resolverContaGoogle } from './googleLogin.ts';
import type { Pessoa } from './tipos.ts';

/** Monta uma pessoa mínima; só e-mail, perfil e status importam para estes casos. */
function pessoa(email: string, status: Pessoa['status'], perfil: Pessoa['perfil'] = 'profissional'): Pessoa {
  return { id: `pes_${email}`, nome: email, email, telefone: '', cargo: '', perfil, status, dataEntrada: '2026-01-01', area: '', nivel: '', horasSemana: 40 } as unknown as Pessoa;
}

const cadastro: Pessoa[] = [
  pessoa('ana@cais.example', 'ativo'),
  pessoa('admin@cais.example', 'ativo', 'admin'),
  pessoa('inativa@cais.example', 'inativo'),
  pessoa('nova@cais.example', 'convidado'),
];

const casos: { porque: string; obtido: unknown; esperado: unknown }[] = [
  { porque: 'e-mail ativo do cadastro entra', obtido: resolverContaGoogle('ana@cais.example', cadastro).ok, esperado: true },
  { porque: 'maiúsculas e espaços no e-mail do Google não atrapalham', obtido: resolverContaGoogle('  ANA@Cais.Example ', cadastro).ok, esperado: true },
  { porque: 'o perfil vem do cadastro (admin continua admin)', obtido: (() => { const r = resolverContaGoogle('admin@cais.example', cadastro); return r.ok ? r.pessoa.perfil : r.motivo; })(), esperado: 'admin' },
  { porque: 'e-mail fora do cadastro é recusado (Google não cria conta)', obtido: (() => { const r = resolverContaGoogle('estranho@gmail.com', cadastro); return r.ok ? 'entrou' : r.motivo; })(), esperado: 'nao-cadastrado' },
  { porque: 'conta inativa é recusada, como no login por senha', obtido: (() => { const r = resolverContaGoogle('inativa@cais.example', cadastro); return r.ok ? 'entrou' : r.motivo; })(), esperado: 'inativo' },
  { porque: 'convite pendente é recusado e manda usar o convite', obtido: (() => { const r = resolverContaGoogle('nova@cais.example', cadastro); return r.ok ? 'entrou' : r.motivo; })(), esperado: 'convidado' },
  { porque: 'cadastro vazio recusa qualquer e-mail', obtido: (() => { const r = resolverContaGoogle('ana@cais.example', []); return r.ok ? 'entrou' : r.motivo; })(), esperado: 'nao-cadastrado' },
];

// Roda os casos e imprime OK/FALHOU com o porquê (mesmo formato dos outros .casos.ts).
let falhas = 0;
for (const c of casos) {
  const ok = c.obtido === c.esperado;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${c.porque}${ok ? '' : ` (obtido: ${String(c.obtido)}, esperado: ${String(c.esperado)})`}`);
}
console.log(`\n${casos.length - falhas} de ${casos.length} casos passaram.`);
if (falhas > 0) process.exit(1);
