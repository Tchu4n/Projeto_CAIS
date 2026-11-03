/* ============================================================================
   APP/LOGIN/GOOGLE/PAGE.TSX (RETORNO DO GOOGLE)
   O que é: a página da rota "/login/google", para onde o Google devolve a pessoa depois do login.
   Onde é usado: destino (redirectTo) do botão "Entrar com Google" em components/LoginForm.tsx.
   Depende de: components/AcessoLayout.tsx (moldura) e components/RetornoGoogle.tsx (a ponte com o cadastro).
   Contexto: §12 (login) e docs/notas-next16.md §2 (useSearchParams exige Suspense).
   ============================================================================ */

import { Suspense } from "react";
import AcessoLayout from "@/components/AcessoLayout";
import { RetornoGoogle } from "@/components/RetornoGoogle";

/**
 * Página de retorno do login com Google (rota "/login/google").
 * Server Component: só monta a moldura; a lógica fica no RetornoGoogle (Client).
 * @returns a moldura de acesso com a mensagem "conferindo sua conta".
 */
export default function RetornoGooglePage() {
  return (
    <AcessoLayout>
      {/* ⚠️ ATENÇÃO: o RetornoGoogle usa useSearchParams; sem o Suspense o build falha (notas-next16 §2). */}
      <Suspense>
        <RetornoGoogle />
      </Suspense>
    </AcessoLayout>
  );
}
