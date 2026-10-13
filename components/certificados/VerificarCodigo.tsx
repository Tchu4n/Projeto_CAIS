/* ============================================================================
   VERIFICARCODIGO.TSX — CONFERÊNCIA DO CÓDIGO DO CERTIFICADO
   O que é: o campo e o resultado da página pública de verificação: a pessoa digita (ou chega por link
   com ?codigo=) o código do certificado e vê se ele é válido, com nome, trilha e data.
   Onde é usado: app/verificar/page.tsx (rota pública /verificar).
   Depende de: lib/store.tsx (useDados), lib/certificados.ts (verificarCodigo), lib/utils.ts (dataBR),
   next/navigation (useSearchParams, precisa de <Suspense> na página) e components/ui/.
   Contexto: pedido de 13/10/2026 (certificados). SIMULADO: a busca roda nos dados deste navegador.
   ============================================================================ */
"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useDados } from '@/lib/store';
import { verificarCodigo } from '@/lib/certificados';
import { dataBR } from '@/lib/utils';
import Button from '@/components/button';
import Input from '@/components/input';
import { Aviso, Esqueleto } from '@/components/ui/basicos';

/**
 * Formulário de conferência do código. Client Component.
 * Estados (§13): carregando (esqueleto enquanto a store lê), vazio (antes de conferir), válido e inválido.
 *
 * @returns o campo, o botão e o resultado da conferência.
 */
export default function VerificarCodigo() {
  const d = useDados();
  // Código que veio no link (?codigo=...): já entra preenchido e conferido.
  const doLink = useSearchParams().get('codigo') ?? '';
  const [digitado, setDigitado] = useState(doLink);
  // Código efetivamente conferido (muda só ao enviar, não a cada tecla).
  const [conferido, setConferido] = useState(doLink);

  // Carregando: esqueleto do cartão.
  if (!d.pronto) return <Esqueleto className="h-40 w-full rounded-2xl" />;

  const certificado = conferido.trim() ? verificarCodigo(conferido, d) : null;

  return (
    <div>
      {/* Conferir não grava nada: só define qual código mostrar o resultado. */}
      <form onSubmit={(e) => { e.preventDefault(); setConferido(digitado); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input label="Código do certificado" placeholder="CAIS-2026-XXXXXXXX" value={digitado} onChange={(e) => setDigitado(e.target.value)} autoComplete="off" />
        </div>
        <Button type="submit"><Search className="h-4 w-4" aria-hidden />Conferir</Button>
      </form>

      <div className="mt-6" aria-live="polite">
        {!conferido.trim() ? (
          <p className="text-sm text-tinta-suave">Digite o código que está no rodapé do certificado.</p>
        ) : certificado ? (
          // [PV-1] O QUE A PÁGINA PÚBLICA MOSTRA de um certificado válido: nome, empresa, trilha, data e nota. É o máximo que qualquer pessoa com o código consegue ver; para mostrar menos, tire campos daqui.
          <Aviso tipo="sucesso" titulo="Certificado válido">
            <span className="block"><strong className="text-tinta">{certificado.pessoaNome}</strong>{certificado.empresaNome && ` · ${certificado.empresaNome}`}</span>
            <span className="block">concluiu a trilha <strong className="text-tinta">{certificado.trilhaTitulo}</strong>{certificado.concluidaEm && ` em ${dataBR(certificado.concluidaEm)}`}.</span>
            <span className="mt-1 block font-mono text-[13px]">{certificado.codigo}</span>
          </Aviso>
        ) : (
          <Aviso tipo="erro" titulo="Código não encontrado">Confira se digitou o código completo, com os hifens. Se o certificado é recente, peça a quem o emitiu para conferir o código.</Aviso>
        )}
      </div>
    </div>
  );
}
