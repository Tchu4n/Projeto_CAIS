/* ============================================================================
   MARCADORPROJETO.TSX
   O que é: as peças visuais que identificam o PROJETO de uma tarefa na visão geral: a bolinha colorida e a
   faixa lateral do cartão, mais o ajudante que entrega a cor do projeto como variável CSS.
   Onde é usado: components/projetos/CartaoTarefa.tsx (faixa e bolinha), Vistas.tsx (bolinha na lista e no
   cronograma, linha de entrega) e LegendaProjetos.tsx (chip de cada projeto).
   Depende de: ./cores (corIdentidade) e lib/utils (cx). Sem estado: só desenho.
   Contexto: §5 (quadro, lista e cronograma), §9 (cor tem significado; cor nunca aparece sozinha) e pedido
   de 14/10/2026 (diferenciar os projetos na visão geral das tarefas).
   ============================================================================ */

import type { CSSProperties } from 'react';
import { cx } from '@/lib/utils';
import { corIdentidade } from './cores';

// [PV-1] COMO A COR DO PROJETO CLAREIA NO TEMA ESCURO: `--cor-vis` é a cor do projeto no tema claro e a mesma cor misturada com 30% de branco no escuro (para a bolinha, a faixa e a borda não sumirem no fundo escuro). Para clarear mais ou menos, mude o 30%.
/**
 * Classes que definem a variável `--cor-vis` (a cor "visível" do projeto) a partir de `--cor-projeto`.
 * Use junto com `estiloProjeto` NO MESMO elemento (ou em um ancestral) e pinte com `bg-(--cor-vis)`,
 * `border-(color:--cor-vis)` etc. Assim a cor muda sozinha com o tema, sem hex solto no componente.
 * ⚠️ ATENÇÃO: `--cor-projeto` vem de `estiloProjeto`; sem ele a cor fica inválida e o elemento aparece sem cor.
 */
export const CLASSE_COR_PROJETO = '[--cor-vis:var(--cor-projeto)] dark:[--cor-vis:color-mix(in_srgb,var(--cor-projeto),white_30%)]';

/**
 * Entrega a cor do projeto como variável CSS, para as classes de `CLASSE_COR_PROJETO` usarem.
 * @param cor chave da cor do projeto (`projeto.cor`, ex.: 'verde').
 * @returns o objeto `style` com `--cor-projeto`.
 * @example <span className={CLASSE_COR_PROJETO} style={estiloProjeto(p.cor)} />
 */
export function estiloProjeto(cor: string): CSSProperties {
  return { '--cor-projeto': corIdentidade(cor) } as CSSProperties;
}

/**
 * Bolinha colorida do projeto. É decorativa (aria-hidden): o NOME do projeto sempre vem escrito ao lado,
 * porque cor nunca aparece sozinha (e dois projetos podem ter a mesma cor).
 * @param cor chave da cor do projeto (`projeto.cor`).
 * @param className classes extras (ex.: tamanho diferente).
 * @returns a bolinha.
 * @example <MarcadorProjeto cor={projeto.cor} /> Portal de pedidos
 */
export function MarcadorProjeto({ cor, className }: { cor: string; className?: string }) {
  return <span aria-hidden className={cx(CLASSE_COR_PROJETO, 'inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-(--cor-vis)', className)} style={estiloProjeto(cor)} />;
}

/**
 * Faixa vertical colorida na borda esquerda de um cartão. O cartão precisa ser `relative overflow-hidden`
 * (a faixa acompanha o canto arredondado) e ter folga à esquerda (ex.: `pl-4`). Decorativa (aria-hidden).
 * @param cor chave da cor do projeto (`projeto.cor`).
 * @returns a faixa.
 */
export function FaixaProjeto({ cor }: { cor: string }) {
  return <span aria-hidden className={cx(CLASSE_COR_PROJETO, 'absolute inset-y-0 left-0 w-1.5 bg-(--cor-vis)')} style={estiloProjeto(cor)} />;
}
