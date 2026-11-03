/* ============================================================================
   CHATMENSAGEM.TSX — UMA MENSAGEM DO CHAT DO CAIQUE
   O que é: o balão de uma mensagem (da pessoa ou do CAIQUE), com a hora e, nas respostas do CAIQUE, os botões "Útil" e "Não ajudou".
   Onde é usado: components/caique/ChatWidget.tsx.
   Depende de: lib/caique.ts (MensagemCaique) e lucide-react.
   Contexto: prompts I04 e I05 em docs/prompts (feedback e design system).
   ============================================================================ */

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { MensagemCaique } from '@/lib/caique';

/**
 * Balão de uma mensagem.
 * @param props.mensagem - a mensagem a mostrar.
 * @param props.aoAvaliar - chamado com 'util' ou 'nao-util' quando a pessoa avalia uma resposta do CAIQUE.
 * @returns o balão alinhado à direita (pessoa) ou à esquerda (CAIQUE).
 */
export function ChatMensagem({ mensagem, aoAvaliar }: { mensagem: MensagemCaique; aoAvaliar: (id: string, valor: 'util' | 'nao-util') => void }) {
  const daPessoa = mensagem.papel === 'usuario';
  return (
    <li className={`flex flex-col ${daPessoa ? 'items-end' : 'items-start'}`}>
      {/* Cores só por token: roxo de ação para a pessoa, superfície para o CAIQUE. whitespace-pre-wrap preserva as quebras de linha. */}
      <div
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          daPessoa ? 'rounded-br-md bg-botao text-sobre-cor' : 'rounded-bl-md border border-borda bg-superficie-alt text-tinta'
        }`}
      >
        {/* O rótulo para leitor de tela diz quem falou; o balão sozinho só se distingue pela cor. */}
        <span className="sr-only">{daPessoa ? 'Você: ' : 'CAIQUE: '}</span>
        {mensagem.texto}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-tinta-suave">
        <span>{mensagem.hora}</span>
        {/* Só a resposta do CAIQUE pode ser avaliada. */}
        {!daPessoa && (
          <span role="group" aria-label="Esta resposta ajudou?" className="flex items-center gap-1">
            {(['util', 'nao-util'] as const).map((valor) => {
              const ativo = mensagem.feedback === valor;
              const Icone = valor === 'util' ? ThumbsUp : ThumbsDown;
              return (
                <button
                  key={valor}
                  type="button"
                  // GRAVA: só o estado do chat na tela (a avaliação ainda não é enviada a lugar nenhum).
                  // TODO(API): enviar a avaliação para /api/caique/feedback (prompt I03).
                  onClick={() => aoAvaliar(mensagem.id, valor)}
                  aria-pressed={ativo}
                  aria-label={valor === 'util' ? 'Resposta útil' : 'Resposta não ajudou'}
                  className={`rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaria/50 ${
                    ativo ? 'bg-primaria-suave text-primaria' : 'hover:bg-superficie-alt hover:text-tinta'
                  }`}
                >
                  <Icone className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              );
            })}
          </span>
        )}
      </div>
    </li>
  );
}
