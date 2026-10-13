/* ============================================================================
   APP/VERIFICAR/PAGE.TSX (VERIFICAÇÃO PÚBLICA DE CERTIFICADO)
   O que é: a página pública (sem login) em que qualquer pessoa confere se o código de um certificado do
   CAIS é válido.
   Onde é usado: rota "/verificar" (e "/verificar?codigo=CAIS-2026-XXXXXXXX"). Chega-se pelo link na
     folha do certificado (app/(sistema)/certificados/[trilhaId]/page.tsx) e por links compartilhados.
   Depende de: components/certificados/VerificarCodigo.tsx, components/CaisLogo.tsx e next/link.
   Contexto: pedido de 13/10/2026 (certificados) e docs/notas-next16.md §1 (metadata só em Server
     Component) e §2 (useSearchParams + Suspense).
   ============================================================================ */

import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import CaisLogo from '@/components/CaisLogo';
import VerificarCodigo from '@/components/certificados/VerificarCodigo';

// [PV-1] O TÍTULO DA ABA da página de verificação ("Verificar certificado · CAIS").
/** Título da aba: "Verificar certificado · CAIS" (o template vem de app/layout.tsx). */
export const metadata: Metadata = { title: 'Verificar certificado' };

/**
 * Página pública de verificação. Server Component: monta a estrutura; o campo (que usa estado e a URL)
 * mora no VerificarCodigo, que é Client.
 * @returns a página centralizada com a logo e o cartão de conferência.
 */
export default function VerificarPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-fundo px-4 py-10 sm:py-16">
      {/* NAVEGA: a logo leva à homepage. */}
      <Link href="/" aria-label="CAIS, página inicial" className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria/60"><CaisLogo size={36} /></Link>
      <div className="mt-8 w-full max-w-xl rounded-2xl border border-borda bg-superficie p-6 shadow-card sm:p-8">
        <h1 className="font-space text-2xl font-semibold text-tinta">Verificar certificado</h1>
        <p className="mb-6 mt-2 text-sm text-tinta-suave">Confirme se um certificado de trilha do CAIS é verdadeiro usando o código impresso nele.</p>
        {/* ⚠️ ATENÇÃO: o campo lê ?codigo= com useSearchParams. Sem este <Suspense>, o `npm run build` falha (notas-next16 §2). */}
        <Suspense>
          <VerificarCodigo />
        </Suspense>
      </div>
      <p className="mt-6 max-w-xl text-center text-[13px] text-tinta-suave">Protótipo: a conferência usa os dados deste navegador. Com a API da PROGLOGIC ela passa a consultar o servidor.</p>
    </main>
  );
}
