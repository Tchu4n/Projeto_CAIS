/* ============================================================================
   AUTH.TS (RAIZ) — CONFIGURAÇÃO DO LOGIN COM GOOGLE (AUTH.JS / NEXTAUTH v5)
   O que é: configura o Auth.js com o provedor Google. Ele só PROVA QUEM A PESSOA É
   (o e-mail verificado pelo Google); quem decide se ela entra e com qual perfil é o
   cadastro do CAIS (lib/googleLogin.ts), conferido em components/RetornoGoogle.tsx.
   Onde é usado: app/api/auth/[...nextauth]/route.ts (rotas /api/auth/*) e app/login/page.tsx
     (googleConfigurado, para mostrar ou esconder o botão).
   Depende de: next-auth (v5 beta) e das variáveis AUTH_SECRET, AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET (.env.local).
   Contexto: §7 (autenticação no back é da PROGLOGIC) e §12 (login); passo J01 a J03 em docs/prompts.
   ============================================================================ */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Diz se as credenciais do Google estão no ambiente.
 * Sem elas o botão "Entrar com Google" nem aparece e o login por e-mail e senha segue igual.
 * @returns true se AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET e AUTH_SECRET existem.
 */
// [PV-1] QUANDO O BOTÃO DO GOOGLE APARECE: só com as três variáveis no .env.local (veja docs/GOOGLE-AUTH.md). Sem elas, o login por e-mail e senha continua sozinho.
export const googleConfigurado = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_SECRET,
);

// ⚠️ ATENÇÃO: o provedor lê AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET sozinho (convenção do Auth.js v5); não passe as chaves à mão.
// TODO(API): quando a PROGLOGIC tiver o cadastro no servidor, a conferência "este e-mail está cadastrado?"
// sobe para o callback `signIn` abaixo; hoje o cadastro mora no navegador (lib/store.tsx) e não dá para ler aqui.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  // [PV-2] A TELA DE LOGIN do Auth.js: erros do Google (ex.: acesso negado) voltam para /login com ?error=.
  pages: { signIn: "/login", error: "/login" },
  // Sessão só em cookie assinado (JWT): não há banco. Ela serve de ponte; o CAIS abre a própria sessão depois.
  session: { strategy: "jwt", maxAge: 60 * 60 },
  // Necessário em localhost e atrás de proxy: aceita o host da requisição.
  trustHost: true,
  callbacks: {
    /**
     * Barra e-mail que o Google não verificou: sem isso, alguém poderia declarar um e-mail alheio.
     * @returns true para deixar entrar; false recusa (volta ao /login com erro).
     */
    // [PV-3] A REGRA DE QUEM PODE USAR O GOOGLE: hoje, só e-mail com verificação do Google. Domínio permitido ou lista de e-mails entram aqui.
    signIn({ profile }) {
      return profile?.email_verified === true;
    },
  },
});
