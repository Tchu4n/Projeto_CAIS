/* ============================================================================
   LEGENDAPROJETOS.TSX
   O que é: a legenda da visão geral das tarefas: um chip por projeto (cor + nome + quantas tarefas), que
   também é filtro: clicar liga ou desliga aquele projeto.
   Onde é usado: components/projetos/VisaoTarefas.tsx (logo abaixo da barra de filtros).
   Depende de: lucide-react (Check), ./MarcadorProjeto, lib/tarefas (ContagemProjeto), lib/store (Projeto)
   e lib/utils (cx).
   Contexto: §5 (quadro, lista e cronograma), §9 (acessibilidade) e pedido de 14/10/2026 (diferenciar os
   projetos na visão geral das tarefas).
   ============================================================================ */

import { Check } from 'lucide-react';
import type { Projeto } from '@/lib/store';
import type { ContagemProjeto } from '@/lib/tarefas';
import { cx } from '@/lib/utils';
import { CLASSE_COR_PROJETO, MarcadorProjeto, estiloProjeto } from './MarcadorProjeto';

// [PV-1] A LEGENDA DOS PROJETOS: um chip por projeto em escopo (bolinha na cor do projeto, nome e contagem). Marcado = projeto no filtro (borda na cor dele, fundo leve e um ✓, para não depender só da cor). Sem nenhum marcado, todos os projetos aparecem nas vistas.
/**
 * Legenda e filtro por projeto.
 * Cada chip é um botão com `aria-pressed`: ligado quando o projeto está no filtro `?projeto=`.
 * O nome fica sempre escrito (dois projetos podem ter a mesma cor) e a contagem vem em texto.
 *
 * @param projetos projetos que a pessoa pode escolher (já respeitando o filtro de empresa).
 * @param contagens tarefas de cada projeto (lib/tarefas.ts, contarPorProjeto), na mesma ordem dos projetos.
 * @param selecionados ids dos projetos que estão no filtro (vazio = nenhum filtrado, todos à vista).
 * @param onAlternar liga ou desliga um projeto no filtro pelo id (quem chama GRAVA na URL).
 * @returns a lista de chips.
 */
export default function LegendaProjetos({ projetos, contagens, selecionados, onAlternar }: { projetos: Projeto[]; contagens: ContagemProjeto[]; selecionados: string[]; onAlternar: (id: string) => void }) {
  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Projetos: legenda e filtro">
      {projetos.map((p) => {
        const total = contagens.find((c) => c.projetoId === p.id)?.total ?? 0;
        const ligado = selecionados.includes(p.id);
        return (
          <li key={p.id} className="max-w-full">
            {/* Cor da borda e do fundo vem de --cor-vis (CLASSE_COR_PROJETO); transition-colors some com prefers-reduced-motion. */}
            <button type="button" aria-pressed={ligado} onClick={() => onAlternar(p.id)} title={`${p.nome}: ${total} tarefa${total !== 1 ? 's' : ''}`}
              className={cx(CLASSE_COR_PROJETO,
                'inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold text-tinta transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria/50',
                ligado ? 'border-(color:--cor-vis) bg-superficie-alt' : 'border-borda bg-superficie hover:bg-superficie-alt')}
              style={estiloProjeto(p.cor)}>
              <MarcadorProjeto cor={p.cor} />
              <span className="min-w-0 truncate">{p.nome}</span>
              <span className="rounded-full bg-superficie-alt px-1.5 text-[12px] tabular-nums text-tinta-suave">{total}<span className="sr-only"> tarefa{total !== 1 ? 's' : ''}</span></span>
              {ligado && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
