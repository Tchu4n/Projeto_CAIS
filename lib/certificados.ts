/* ============================================================================
   CERTIFICADOS DAS TRILHAS CONCLUÍDAS
   O que é: funções puras que dizem quem tem direito a certificado e montam os dados dele (nome, trilha,
   data, carga, nota e o código de verificação). Nada é armazenado: o certificado é CALCULADO do progresso.
   Onde é usado: app/(sistema)/certificados/[trilhaId]/page.tsx (a folha do certificado),
   app/(sistema)/certificados/emitidos (lista do admin e da empresa), app/verificar (conferência pública do código),
   app/(sistema)/minhas-trilhas (lista e botão "Ver certificado"); lib/certificados.casos.ts (testes com Node).
   Depende de: tipos de lib/tipos.ts, situacaoNaTrilha/publicoDaTrilha de lib/metricas.ts e o escopo de lib/escopo.ts (sem React, para rodar em Node).
   Contexto: §4 (trilhas: progresso e nota por pessoa) e pedido de 13/10/2026 (emissão de certificados).
   ============================================================================ */

import type { Dados, Pessoa, Trilha } from './tipos.ts';
import { publicoDaTrilha, situacaoNaTrilha } from './metricas.ts';
import { colaboradoresDaEmpresa, empresaDaSessao, trilhasVisiveis, type SessaoEscopo } from './escopo.ts';

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

// [PV-3] A CONFERÊNCIA DO CÓDIGO (página pública /verificar): ignora maiúsculas e espaços nas pontas e procura o código entre TODOS os certificados que existem. Quem lê vê só o que o certificado já mostra (nome, trilha, data). TODO(API): a conferência passa a ser uma consulta ao back-end, que guarda os códigos emitidos.
/**
 * Procura o certificado que tem o código informado.
 * SIMULADO: no protótipo a busca roda nos dados deste navegador (a store); com a API da PROGLOGIC vira uma consulta ao servidor.
 * @param codigo - o que a pessoa digitou (ex.: " cais-2026-9f3a12c7 ").
 * @param dados - todos os dados.
 * @returns o certificado, ou null se o código não existe (ou a trilha deixou de estar publicada).
 * @example verificarCodigo('cais-2026-9f3a12c7', dados)?.pessoaNome
 */
export function verificarCodigo(codigo: string, dados: Dados): Certificado | null {
  const procurado = codigo.trim().toUpperCase();
  if (!procurado) return null;
  for (const t of dados.trilhas) {
    for (const pid of publicoDaTrilha(t, dados)) {
      const c = certificadoDaPessoa(t, pid, dados);
      if (c && c.codigo === procurado) return c;
    }
  }
  return null;
}

// [PV-4] QUEM VÊ OS CERTIFICADOS EMITIDOS (lista /certificados/emitidos): o admin vê todos; a empresa só os do time dela (colaboradores alocados e contas da empresa) e só nas trilhas que ela enxerga. Mudar aqui muda o que a empresa vê.
/**
 * Certificados emitidos que a sessão pode ver, os mais recentes primeiro.
 * @param sessao - quem está logado.
 * @param dados - todos os dados.
 * @returns a lista (admin: todos; empresa: do time dela; profissional: vazia, ele usa Minhas trilhas).
 * @example certificadosEmitidos({ pessoaId: 'pes_marcos', perfil: 'empresa' }, dados).length
 */
export function certificadosEmitidos(sessao: SessaoEscopo, dados: Dados): Certificado[] {
  if (sessao.perfil === 'profissional') return [];
  let permitidas: Set<string> | null = null;
  if (sessao.perfil === 'empresa') {
    const empresaId = empresaDaSessao(sessao, dados);
    if (!empresaId) return [];
    // O time da empresa: quem está alocado nos projetos dela e as contas de perfil Empresa ligadas a ela.
    permitidas = new Set([
      ...colaboradoresDaEmpresa(empresaId, dados).map((p) => p.id),
      ...dados.pessoas.filter((p) => p.perfil === 'empresa' && p.empresaId === empresaId).map((p) => p.id),
    ]);
  }
  const lista: Certificado[] = [];
  for (const t of trilhasVisiveis(sessao, dados)) {
    for (const pid of publicoDaTrilha(t, dados)) {
      if (permitidas && !permitidas.has(pid)) continue;
      const c = certificadoDaPessoa(t, pid, dados);
      if (c) lista.push(c);
    }
  }
  return lista.sort((a, b) => b.concluidaEm.localeCompare(a.concluidaEm) || a.pessoaNome.localeCompare(b.pessoaNome));
}
