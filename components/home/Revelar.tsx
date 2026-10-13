/* ============================================================================
   REVELAR.TSX — APARECER AO ROLAR
   O que é: um envoltório que faz o conteúdo surgir (sobe e ganha opacidade) quando entra na tela
   durante a rolagem, com um atraso opcional para aparecer "um a um".
   Onde é usado: components/home/ComoFunciona.tsx, Problema.tsx, Pilares.tsx e Perfis.tsx.
   Depende de: react e das regras [data-revelar] de app/globals.css.
   Contexto: §15 item 0 (homepage como ponto de entrada público).
   ============================================================================ */
"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** Props do envoltório. */
interface RevelarProps {
  children: ReactNode;
  /** Atraso em milissegundos antes de animar (use i * 150 para aparecer um a um). */
  atraso?: number;
  /** Tag HTML do envoltório: "li" dentro de listas, "article" em cards. Padrão: div. */
  como?: "div" | "li" | "article";
  className?: string;
}

// [PV-1] O QUANTO DO ITEM PRECISA APARECER para a animação disparar (15%) e a folga inferior da tela (10%). Aumente para animar só quando o item já estiver bem à vista.
/** Fração do item que precisa estar visível para disparar a animação. */
const LIMIAR = 0.15;
/** Folga na base da tela: o item só conta como "entrou" 10% acima da borda inferior. */
const MARGEM = "0px 0px -10% 0px";

/**
 * Faz o conteúdo aparecer quando entra na tela. Client Component.
 * Sem JavaScript, ou com "reduzir movimento" ligado, o conteúdo fica sempre visível:
 * o estado inicial (sem data-revelar) é o conteúdo normal; só esconde o que está abaixo da tela.
 *
 * @param children conteúdo a revelar.
 * @param atraso milissegundos de espera antes de animar.
 * @param como tag HTML do envoltório.
 * @param className classes do envoltório.
 * @returns o envoltório com data-revelar = "esconde" | "mostra".
 * @example <Revelar como="li" atraso={i * 150}>...</Revelar>
 */
export default function Revelar({ children, atraso = 0, como = "div", className }: RevelarProps) {
  const ref = useRef<HTMLDivElement>(null);
  // undefined = visível normal; "esconde" = esperando entrar na tela; "mostra" = animando para o lugar.
  const [estado, setEstado] = useState<"esconde" | "mostra" | undefined>(undefined);

  // Roda uma vez, ao montar. Quem já está na tela (ou quem pediu menos movimento) não anima;
  // o resto fica escondido até o IntersectionObserver avisar. A limpeza desliga o observador.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setEstado("esconde");
    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setEstado("mostra");
          obs.disconnect();
        }
      },
      { threshold: LIMIAR, rootMargin: MARGEM },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const Tag = como as "div";
  return (
    <Tag ref={ref} data-revelar={estado} style={{ "--atraso": `${atraso}ms` } as CSSProperties} className={className}>
      {children}
    </Tag>
  );
}
