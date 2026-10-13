/* ============================================================================
   LINKROLAR.TSX — LINK QUE ROLA ATÉ UMA SEÇÃO
   O que é: um link de âncora (#secao) que rola até a seção TODA vez que é clicado,
   inclusive quando a URL já termina na mesma âncora.
   Onde é usado: components/home/Hero.tsx (botão "Quero trazer minha empresa").
   Depende de: react.
   Contexto: o <Link> do Next não rola de novo quando o endereço já tem a mesma âncora; a
   pessoa subia a página e o botão ficava "morto".
   ============================================================================ */
"use client";

import type { MouseEvent, ReactNode } from "react";

/** Props do link. */
interface LinkRolarProps {
  /** id da seção de destino, sem o "#". */
  alvo: string;
  className?: string;
  children: ReactNode;
}

/**
 * Link de âncora que sempre rola. Client Component.
 * Sem JavaScript o href="#alvo" continua funcionando como âncora comum.
 *
 * @param alvo id da seção de destino.
 * @returns o <a> com o clique tratado.
 * @example <LinkRolar alvo="participar" className="...">Quero participar</LinkRolar>
 */
export default function LinkRolar({ alvo, className, children }: LinkRolarProps) {
  /** Rola suavemente até o alvo (sem animar para quem pediu menos movimento) e mantém a âncora na URL. */
  const rolar = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = document.getElementById(alvo);
    if (!el) return;
    e.preventDefault();
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
    // NAVEGA: grava a âncora no endereço sem criar uma entrada nova no histórico.
    history.replaceState(null, "", `#${alvo}`);
  };
  return (
    <a href={`#${alvo}`} onClick={rolar} className={className}>
      {children}
    </a>
  );
}
