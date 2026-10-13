/* ============================================================================
   CARGAEMROLAGEM.TSX — BARRAS E NÚMEROS QUE CARREGAM ENQUANTO A PESSOA DESCE
   O que é: um envoltório que liga a rolagem da página ao preenchimento das barras (elementos com
   data-carga) e à contagem dos números (elementos com data-contar) dentro dele. Quanto mais o item
   sobe na tela, mais cheio ele fica; se a pessoa subir de novo, ele esvazia junto.
   Onde é usado: components/home/ParaSuaEmpresa.tsx (prévia do painel da empresa).
   Depende de: react e das regras [data-carga] de app/globals.css.
   Contexto: §15 item 0 (homepage como ponto de entrada público).
   ============================================================================ */
"use client";

import { useEffect, useRef, type ReactNode } from "react";

// [PV-1] ONDE A CARGA COMEÇA E TERMINA: a barra começa a encher quando o topo dela passa de 92% da altura da tela e fica cheia quando chegou a 55%. Mude para encher mais cedo ou mais tarde.
/** Posição (fração da altura da tela, a partir do topo) em que o item começa a carregar. */
const INICIO = 0.92;
/** Posição em que o item termina de carregar (cheio). */
const FIM = 0.55;

/**
 * Envoltório que carrega barras e números conforme a rolagem. Client Component.
 * Não usa estado do React: escreve direto na variável CSS --carga de cada [data-carga] e no texto de
 * cada [data-contar], um cálculo por quadro, para a rolagem não travar.
 * Sem JavaScript, ou com "reduzir movimento", tudo aparece cheio (o valor padrão de --carga é 1).
 *
 * @param children a prévia com os elementos marcados.
 * @returns o <div> envoltório.
 * @example <CargaEmRolagem><div data-carga>...</div><span data-contar="72">72%</span></CargaEmRolagem>
 */
export default function CargaEmRolagem({ children }: { children: ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null);

  // Roda uma vez, ao montar: acompanha a rolagem e o redimensionar da janela e recalcula as barras
  // (um cálculo por quadro, via requestAnimationFrame). A limpeza remove os ouvintes.
  useEffect(() => {
    const el = raiz.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    /** Quanto (0 a 1) o elemento já carregou, pela posição do topo dele na tela. */
    const carga = (alvo: Element) => {
      const topo = alvo.getBoundingClientRect().top / window.innerHeight;
      return Math.max(0, Math.min(1, (INICIO - topo) / (INICIO - FIM)));
    };
    const atualizar = () => {
      quadro = 0;
      el.querySelectorAll<HTMLElement>("[data-carga]").forEach((b) => b.style.setProperty("--carga", String(carga(b))));
      el.querySelectorAll<HTMLElement>("[data-contar]").forEach((n) => {
        n.textContent = `${Math.round(Number(n.dataset.contar) * carga(n))}%`;
      });
    };
    const aoMudar = () => {
      if (!quadro) quadro = requestAnimationFrame(atualizar);
    };
    atualizar();
    window.addEventListener("scroll", aoMudar, { passive: true });
    window.addEventListener("resize", aoMudar);
    return () => {
      window.removeEventListener("scroll", aoMudar);
      window.removeEventListener("resize", aoMudar);
      if (quadro) cancelAnimationFrame(quadro);
    };
  }, []);

  return <div ref={raiz}>{children}</div>;
}
