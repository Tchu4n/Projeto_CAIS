/* ============================================================================
   APP/API/AUTH/[...NEXTAUTH]/ROUTE.TS — ROTAS DO AUTH.JS
   O que é: entrega ao Next as rotas GET e POST do Auth.js (/api/auth/signin, /callback/google, /session...).
   Onde é usado: chamado pelo navegador e pelo Google durante o login com Google.
   Depende de: auth.ts (na raiz do projeto).
   Contexto: §7 e §12; passo J02 em docs/prompts.
   ============================================================================ */

import { handlers } from "@/auth";

// ⚠️ ATENÇÃO: o endereço de retorno cadastrado no Google Cloud precisa ser exatamente
// <endereço do site>/api/auth/callback/google; mudar esta pasta quebra o login.
export const { GET, POST } = handlers;
