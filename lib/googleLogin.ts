/* ============================================================================
   GOOGLELOGIN.TS — REGRA DO LOGIN COM GOOGLE
   O que é: dado o e-mail que o Google comprovou, decide qual pessoa do cadastro entra ou por que não entra.
   Onde é usado: components/RetornoGoogle.tsx (tela de retorno do Google) e lib/googleLogin.casos.ts.
   Depende de: lib/tipos.ts (Pessoa).
   Contexto: §3 (perfis), §11 (conta inativa) e §12 (login e primeiro acesso).
   ============================================================================ */

import type { Pessoa } from "./tipos";

/** Resultado de `resolverContaGoogle`: a pessoa que entra, ou o motivo da recusa. */
export type ResultadoGoogle =
  | { ok: true; pessoa: Pessoa }
  | { ok: false; motivo: "nao-cadastrado" | "inativo" | "convidado" };

/**
 * Casa o e-mail do Google com o cadastro do CAIS.
 * O Google só prova o e-mail; o perfil e o status vêm sempre do cadastro, nunca do Google.
 * @param email - e-mail devolvido pelo Google (maiúsculas e espaços são ignorados).
 * @param pessoas - o cadastro (lerPessoasSalvas()).
 * @returns `{ ok: true, pessoa }` ou `{ ok: false, motivo }`.
 * @example resolverContaGoogle('Ana.Souza@cais.example', pessoas) // { ok: true, pessoa: Ana }
 */
// [PV-1] AS REGRAS DO LOGIN COM GOOGLE: e-mail precisa estar no cadastro, conta inativa não entra e convite pendente deve usar o link do convite. TODO(API): a API decide.
export function resolverContaGoogle(email: string, pessoas: Pessoa[]): ResultadoGoogle {
  // trim/toLowerCase: o Google e o cadastro podem divergir só na caixa das letras.
  const limpo = email.trim().toLowerCase();
  const pessoa = pessoas.find((p) => p.email.toLowerCase() === limpo);
  // Sem cadastro: o Google sozinho não cria conta (o acesso é por convite, §12).
  if (!pessoa) return { ok: false, motivo: "nao-cadastrado" };
  // Mesma regra do login por senha: conta inativada pelo administrador não entra (§11).
  if (pessoa.status === "inativo") return { ok: false, motivo: "inativo" };
  // Convite não usado: a pessoa precisa passar pelo primeiro acesso antes (§12).
  if (pessoa.status === "convidado") return { ok: false, motivo: "convidado" };
  return { ok: true, pessoa };
}
