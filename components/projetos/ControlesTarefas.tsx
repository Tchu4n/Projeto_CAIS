/* ============================================================================
   CONTROLESTAREFAS.TSX
   O que é: dois controles das tarefas usados na ficha do projeto e na visão geral: "Ordenar por"
   (critério e sentido) e a faixa de colaboradores (um avatar por pessoa; clicar filtra).
   Onde é usado: app/(sistema)/projetos/[id]/page.tsx e components/projetos/VisaoTarefas.tsx.
   Depende de: lib/tarefas (critérios de ordem), components/ui/form (Select), components/ui/basicos (Avatar),
   lucide-react e lib/utils (cx).
   Contexto: §5 (quadro: filtro e ordem) e pedido de 14/10/2026 (ordenar o quadro e filtrar por colaborador).
   ============================================================================ */
"use client";

import { ArrowDown, ArrowUp } from 'lucide-react';
import { Select } from '@/components/ui/form';
import { Avatar } from '@/components/ui/basicos';
import { CRITERIOS_ORDEM, ROTULO_ORDEM, type CriterioOrdem, type Direcao } from '@/lib/tarefas';
import { cx } from '@/lib/utils';

/**
 * Seletor "Ordenar por" com o botão que inverte o sentido.
 * No critério "Manual" (a ordem do arrastar) o botão de sentido fica desligado.
 *
 * @param criterio critério ativo.
 * @param direcao sentido ativo.
 * @param onChange chamado com o critério e o sentido novos.
 * @returns o seletor e o botão.
 * @example <ControleOrdem criterio="prazo" direcao="asc" onChange={(c, d) => ...} />
 */
export function ControleOrdem({ criterio, direcao, onChange }: { criterio: CriterioOrdem; direcao: Direcao; onChange: (c: CriterioOrdem, d: Direcao) => void }) {
  const Seta = direcao === 'asc' ? ArrowUp : ArrowDown;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-44"><Select aria-label="Ordenar cartões por" value={criterio} onChange={(e) => onChange(e.target.value as CriterioOrdem, direcao)}
        opcoes={CRITERIOS_ORDEM.map((c) => ({ valor: c, rotulo: c === 'manual' ? 'Ordem: manual' : `Ordem: ${ROTULO_ORDEM[c].toLowerCase()}` }))} /></div>
      {/* Inverte o sentido. Desligado no manual, que não tem sentido. aria-label diz o sentido atual. */}
      <button type="button" disabled={criterio === 'manual'} onClick={() => onChange(criterio, direcao === 'asc' ? 'desc' : 'asc')}
        aria-label={direcao === 'asc' ? 'Sentido crescente (clique para inverter)' : 'Sentido decrescente (clique para inverter)'}
        title={criterio === 'manual' ? 'A ordem manual é a do arrastar' : direcao === 'asc' ? 'Crescente: clique para inverter' : 'Decrescente: clique para inverter'}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-borda bg-superficie text-tinta-suave hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria/50 disabled:cursor-not-allowed disabled:opacity-40">
        <Seta className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

// [PV-1] A FAIXA DE COLABORADORES: um avatar por pessoa com tarefa; clicar filtra por ela e clicar de novo tira o filtro. Mostra até 12; o seletor "Responsável" cobre o resto.
/** Quantos avatares a faixa mostra antes de deixar o resto para o seletor "Responsável". */
const MAX_AVATARES = 12;

/**
 * Faixa de avatares para filtrar por colaborador com um clique.
 * @param pessoas pessoas que têm tarefa (id e nome).
 * @param valor id da pessoa filtrada ('' = todas).
 * @param onChange chamado com o id escolhido ('' ao desmarcar).
 * @returns a faixa, ou nada se não houver pessoas.
 * @example <FaixaColaboradores pessoas={[{ id: 'pes_ana', nome: 'Ana Souza' }]} valor="" onChange={setResp} />
 */
export function FaixaColaboradores({ pessoas, valor, onChange }: { pessoas: { id: string; nome: string }[]; valor: string; onChange: (id: string) => void }) {
  if (pessoas.length === 0) return null;
  return (
    <div role="group" aria-label="Filtrar por colaborador" className="flex items-center gap-1.5">
      <span className="mr-1 text-[12px] font-semibold uppercase tracking-wide text-tinta-suave">Colaborador</span>
      {pessoas.slice(0, MAX_AVATARES).map((p) => {
        const ativo = valor === p.id;
        return (
          <button key={p.id} type="button" aria-pressed={ativo} aria-label={`${p.nome}${ativo ? ' (filtrando; clique para remover)' : ''}`} title={p.nome}
            onClick={() => onChange(ativo ? '' : p.id)}
            className={cx('rounded-full p-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria/60',
              ativo ? 'bg-primaria ring-2 ring-primaria' : valor ? 'opacity-45 hover:opacity-100' : 'hover:scale-110')}>
            <Avatar nome={p.nome} tamanho={30} />
          </button>
        );
      })}
    </div>
  );
}
