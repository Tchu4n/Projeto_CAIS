/* ============================================================================
   APP/(SISTEMA)/CERTIFICADOS/[TRILHAID]/PAGE.TSX (CERTIFICADO DA TRILHA)
   O que é: a folha do certificado de conclusão de uma trilha, da pessoa logada, pronta para imprimir
     ou salvar em PDF pelo navegador (botão "Imprimir ou salvar em PDF").
   Onde é usado: rota /certificados/[trilhaId]. Chegam aqui: a lista "Seus certificados" e o aviso de
     trilha concluída de app/(sistema)/minhas-trilhas.
   Depende de: next/navigation (useParams), lib/auth.tsx, lib/store.tsx (useDados), lib/certificados.ts
     (certificadoDaPessoa), lib/utils.ts (dataBR), components/CaisLogo.tsx e componentes de components/ui/.
   Contexto: §4 (progresso e nota por pessoa) e pedido de 13/10/2026 (emissão de certificados).
   ============================================================================ */

// "use client": lê a sessão e os dados e usa window.print().
"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Award, Printer } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useDados } from '@/lib/store';
import { certificadoDaPessoa } from '@/lib/certificados';
import { dataBR } from '@/lib/utils';
import CaisLogo from '@/components/CaisLogo';
import Button, { classesBotao } from '@/components/button';
import { EstadoVazio, Esqueleto } from '@/components/ui/basicos';

/**
 * Certificado de uma trilha (rota /certificados/[trilhaId]).
 * Estados (§13): carregando (esqueleto), indisponível (trilha inexistente, em rascunho ou ainda não
 * concluída por esta pessoa) e com o certificado.
 *
 * @returns a página com os botões e a folha do certificado.
 */
export default function PaginaCertificado() {
  const { trilhaId } = useParams<{ trilhaId: string }>();
  const { sessao } = useAuth();
  const d = useDados();

  // Carregando: esqueleto no formato da folha.
  if (!d.pronto || !sessao) {
    return <div className="mx-auto max-w-[1000px] p-4 sm:p-6 lg:p-8"><Esqueleto className="mb-4 h-8 w-64" /><Esqueleto className="aspect-[1.414/1] w-full rounded-2xl" /></div>;
  }

  // O certificado é SEMPRE da pessoa logada: não há como abrir o de outra pessoa pela URL.
  const trilha = d.trilhas.find((t) => t.id === trilhaId);
  const cert = trilha ? certificadoDaPessoa(trilha, sessao.pessoaId, d) : null;

  // Indisponível: a trilha não existe, está em rascunho ou a pessoa ainda não terminou.
  if (!cert) {
    return (
      <div className="mx-auto max-w-[760px] p-4 sm:p-6 lg:p-8">
        <div className="rounded-2xl border border-borda bg-superficie">
          <EstadoVazio icone={<Award className="h-6 w-6" aria-hidden />} titulo="Certificado indisponível"
            descricao="O certificado só existe depois de concluir todas as etapas de uma trilha publicada."
            acao={<Link href="/minhas-trilhas" className={classesBotao({})}>Ir para Minhas trilhas</Link>} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] p-4 sm:p-6 lg:p-8">
      {/* Botões: não saem na impressão (.nao-imprimir, em app/globals.css). */}
      <div className="nao-imprimir mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* NAVEGA: volta para a lista de trilhas. */}
        <Link href="/minhas-trilhas" className={classesBotao({ variante: 'fantasma' })}><ArrowLeft className="h-4 w-4" aria-hidden />Minhas trilhas</Link>
        {/* O navegador abre a janela de impressão; ali dá para escolher "Salvar como PDF". */}
        <Button onClick={() => window.print()}><Printer className="h-4 w-4" aria-hidden />Imprimir ou salvar em PDF</Button>
      </div>

      {/* A FOLHA. Proporção de A4 deitada (1,414:1). O papel é sempre claro, nos dois temas (bg-white + text-noite),
        * porque é um documento para imprimir; só a faixa de cima usa a cor da marca. */}
      <article aria-label={`Certificado de conclusão: ${cert.trilhaTitulo}`}
        className="certificado-folha mx-auto flex aspect-[1.414/1] w-full flex-col overflow-hidden rounded-2xl border border-borda bg-white text-noite shadow-card">
        <div className="flex items-center justify-between gap-4 bg-noite px-6 py-4 sm:px-10 sm:py-6">
          <CaisLogo size={34} tone="claro" />
          {/* [PV-1] O CABEÇALHO DO CERTIFICADO: o nome do programa que emite. */}
          <p className="text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 sm:text-sm">PROGLOGIC · Residência Técnica</p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-6 py-4 text-center sm:px-16">
          {/* [PV-2] OS TEXTOS DO CERTIFICADO: título, a frase de abertura e a de conclusão. Mude aqui para trocar o texto oficial. */}
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-primaria sm:text-sm">Certificado de conclusão</p>
          <p className="mt-3 text-[13px] text-noite/70 sm:mt-5 sm:text-base">O programa CAIS certifica que</p>
          <h1 className="mt-2 font-space text-2xl font-semibold leading-tight sm:mt-3 sm:text-5xl">{cert.pessoaNome}</h1>
          {cert.empresaNome && <p className="mt-1 text-[13px] text-noite/70 sm:text-base">{cert.empresaNome}</p>}
          <p className="mt-3 text-[13px] text-noite/70 sm:mt-5 sm:text-base">concluiu todas as etapas da trilha</p>
          <h2 className="mt-1 font-space text-lg font-semibold sm:mt-2 sm:text-3xl">{cert.trilhaTitulo}</h2>
          {/* Detalhes: data, etapas e, quando houve quiz, a nota. A data some em dados antigos que não a guardaram. */}
          <p className="mt-3 text-[12px] text-noite/70 sm:mt-5 sm:text-[15px]">
            {cert.concluidaEm && <>Concluída em {dataBR(cert.concluidaEm)} · </>}{cert.etapas} {cert.etapas === 1 ? 'etapa' : 'etapas'}{cert.nota !== undefined && <> · nota {cert.nota}</>}
          </p>
        </div>

        <div className="flex items-end justify-between gap-4 border-t border-noite/15 px-6 py-3 sm:px-10 sm:py-5">
          <div className="text-[11px] sm:text-[13px]">
            {/* [PV-3] A ASSINATURA: hoje só o nome do papel (coordenação do programa). Para uma assinatura de verdade, troque por uma imagem aqui. TODO(PROGLOGIC): confirmar quem assina. */}
            <p className="w-40 border-t border-noite/40 pt-1 sm:w-56">Coordenação do programa</p>
          </div>
          <div className="text-right text-[11px] sm:text-[13px]">
            <p className="text-noite/60">Código de verificação</p>
            <p className="font-mono text-[12px] font-semibold tracking-wider sm:text-base">{cert.codigo}</p>
          </div>
        </div>
      </article>
      <p className="nao-imprimir mt-4 text-center text-[13px] text-tinta-suave">Guarde o código de verificação: ele identifica este certificado. A página pública para conferir códigos chega com a API da PROGLOGIC.</p>
    </div>
  );
}
