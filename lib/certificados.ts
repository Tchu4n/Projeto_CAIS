/* ============================================================================
   CERTIFICADOS DAS TRILHAS CONCLUÍDAS
   O que é: funções puras que dizem quem tem direito a certificado e montam os dados dele (nome, trilha,
   data, carga, nota e o código de verificação). Nada é armazenado: o certificado é CALCULADO do progresso.
   Onde é usado: app/(sistema)/certificados/[trilhaId]/page.tsx (a folha do certificado) e
   app/(sistema)/minhas-trilhas (lista e botão "Ver certificado"); lib/certificados.casos.ts (testes com Node).
   Depende de: tipos de lib/tipos.ts e situacaoNaTrilha/publicoDaTrilha de lib/metricas.ts (sem React, para rodar em Node).
   Contexto: §4 (trilhas: progresso e nota por pessoa) e pedido de 13/10/2026 (emissão de certificados).
   ============================================================================ */

import type { Dados, Pessoa, Trilha } from './tipos.ts';
import { publicoDaTrilha, situacaoNaTrilha } from './metricas.ts';

/** Os dados impressos no certificado. */
export interface Certificado {
  /** Código de verificação, ex.: "CAIS-2026-9F3A12C7". Sempre o mesmo para a mesma pessoa, trilha e conclusão. */
  codigo: string;
  trilhaId: string;
  trilhaTitulo: string;
  pessoaId: string;
  pessoaNome: string;
  /** Nome fantasia da empresa da pessoa (perfil Empresa) ou da trilha da empresa; '' quando não há. */
  empresaNome: string;
  /** AAAA-MM-DD em que concluiu; '' em dados antigos que não guardaram a data. */
  concluidaEm: string;
  /** Quantas etapas a trilha tem. */
  etapas: number;
  /** Nota do quiz (0 a 100), quando houve. */
  nota?: number;
}

// [PV-1] COMO O CÓDIGO DE VERIFICAÇÃO É FEITO: prefixo "CAIS", ano da conclusão e 8 caracteres de um resumo (hash) de trilha + pessoa + data. Mudar o prefixo ou a receita muda TODOS os códigos já emitidos. TODO(API): o back-end passa a gerar e guardar o código (e a validar na página pública).
/**
 * Resumo FNV-1a de 32 bits de um texto, em 8 caracteres hexadecimais maiúsculos.
 * Simples e sem biblioteca: serve para o protótipo; não é segurança de verdade (§7: quem garante é o back-end).
 * @param texto - o que resumir.
 * @returns 8 caracteres hexadecimais (ex.: "9F3A12C7").
 */
function resumo(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    // Math.imul faz a multiplicação de 32 bits sem estourar; >>> 0 mantém o resultado sem sinal.
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, '0');
}

/**
 * Código de verificação do certificado.
 * @param trilhaId - id da trilha.
 * @param pessoaId - id da pessoa.
 * @param concluidaEm - data de conclusão (AAAA-MM-DD) ou ''.
 * @returns ex.: "CAIS-2026-9F3A12C7" ("CAIS-0000-..." quando a data não foi guardada).
 * @example codigoDoCertificado('tri_1', 'pes_ana', '2026-10-01') // 'CAIS-2026-...'
 */
export function codigoDoCertificado(trilhaId: string, pessoaId: string, concluidaEm: string): string {
  const ano = concluidaEm.slice(0, 4) || '0000';
  return `CAIS-${ano}-${resumo(`${trilhaId}|${pessoaId}|${concluidaEm}`)}`;
}

// [PV-2] QUEM TEM DIREITO A CERTIFICADO: a trilha precisa estar PUBLICADA, a pessoa no público dela e com TODAS as etapas concluídas (e a trilha ter ao menos uma etapa). Trilha despublicada ou excluída tira o certificado da lista.
/**
 * Monta o certificado de uma pessoa numa trilha, se ela tiver direito.
 * @param trilha - a trilha.
 * @param pessoaId - id da pessoa.
 * @param dados - todos os dados.
 * @returns o certificado, ou null (trilha em rascunho, pessoa fora do público, trilha sem etapas ou não concluída).
 * @example certificadoDaPessoa(trilhaBoasVindas, 'pes_ana', dados)?.codigo // 'CAIS-2026-...'
 */
export function certificadoDaPessoa(trilha: Trilha, pessoaId: string, dados: Dados): Certificado | null {
  if (trilha.status !== 'publicada' || trilha.etapas.length === 0) return null;
  const pessoa: Pessoa | undefined = dados.pessoas.find((p) => p.id === pessoaId);
  if (!pessoa) return null;
  if (!publicoDaTrilha(trilha, dados).includes(pessoaId)) return null;
  if (situacaoNaTrilha(trilha, pessoaId) !== 'concluida') return null;
  const prog = trilha.progresso[pessoaId];
  const concluidaEm = prog?.concluidaEm ?? '';
  // Empresa que aparece no certificado: a da própria pessoa (perfil Empresa) ou a dona da trilha da empresa.
  const empresaId = pessoa.empresaId || (trilha.alcance === 'empresa' ? trilha.empresaId : '');
  return {
    codigo: codigoDoCertificado(trilha.id, pessoaId, concluidaEm),
    trilhaId: trilha.id,
    trilhaTitulo: trilha.titulo,
    pessoaId,
    pessoaNome: pessoa.nome,
    empresaNome: dados.empresas.find((e) => e.id === empresaId)?.nomeFantasia ?? '',
    concluidaEm,
    etapas: trilha.etapas.length,
    nota: prog?.nota,
  };
}

/**
 * Todos os certificados de uma pessoa, os mais recentes primeiro.
 * @param pessoaId - id da pessoa.
 * @param dados - todos os dados.
 * @returns a lista (vazia se não concluiu nenhuma trilha).
 * @example certificadosDaPessoa('pes_ana', dados).length // 2
 */
export function certificadosDaPessoa(pessoaId: string, dados: Dados): Certificado[] {
  return dados.trilhas
    .map((t) => certificadoDaPessoa(t, pessoaId, dados))
    .filter((c): c is Certificado => c !== null)
    .sort((a, b) => b.concluidaEm.localeCompare(a.concluidaEm));
}
