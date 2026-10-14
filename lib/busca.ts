/* ============================================================================
   BUSCA GLOBAL DO TOPO
   O que é: função pura que, dado o texto digitado e a sessão, devolve os resultados da busca do topo
     (projetos, tarefas, arquivos, empresas, pessoas e trilhas) já filtrados pelo escopo de quem está logado.
   Onde é usado: components/shell/Topbar.tsx (lista de resultados e placeholder); lib/busca.casos.ts (testes com Node).
   Depende de: lib/escopo.ts (o que cada perfil vê), lib/permissoes.ts (rotas por perfil e trava da trilha obrigatória),
     lib/metricas.ts (trilhas da pessoa) e lib/utils.ts (normalizar). Sem React, para rodar em Node.
   Contexto: §3 (perfis), §10 (topo com busca) e §12 (trilha obrigatória trava o sistema).
   ============================================================================ */

import type { Dados, Perfil } from './tipos.ts';
import { empresasVisiveis, pessoasVisiveis, projetosVisiveis, tarefasVisiveis, trilhasVisiveis, type SessaoEscopo } from './escopo.ts';
import { EXIGIR_TRILHA_NO_PRIMEIRO_ACESSO, podeAcessar, rotaLiberadaComTrilhaPendente, temTrilhaObrigatoriaPendente } from './permissoes.ts';
import { trilhasDaPessoaDetalhadas } from './metricas.ts';
import { normalizar } from './utils.ts';

/*
 * ⚠️ ATENÇÃO: o escopo aqui é CONVENIÊNCIA DE INTERFACE (§7): a busca nunca sugere um link que levaria a
 * /sem-permissao nem mostra dado de outra empresa. Quem protege de verdade é o back-end da PROGLOGIC.
 * TODO(API): com a API, a busca vira uma chamada ao servidor (com debounce) e este arquivo só ordena e agrupa.
 */

// [PV-1] OS TIPOS DE RESULTADO e a ordem em que aparecem na lista. Tipo novo entra aqui, em montarCandidatos e no mapa de ícones do Topbar.
/** Tipos de resultado da busca, na ordem em que aparecem na lista. */
export const TIPOS_DE_BUSCA = ['Projeto', 'Tarefa', 'Arquivo', 'Empresa', 'Pessoa', 'Trilha', 'Minha trilha'] as const;

/** Um tipo de resultado: "Projeto", "Tarefa", "Arquivo", "Empresa", "Pessoa", "Trilha" (editor) ou "Minha trilha" (a que a pessoa cumpre). */
export type TipoBusca = (typeof TIPOS_DE_BUSCA)[number];

/** Um resultado pronto para a lista do topo. */
export interface ResultadoBusca {
  /** Id único dentro do tipo (arquivo e tarefa têm ids próprios). */
  id: string;
  tipo: TipoBusca;
  titulo: string;
  /** Linha de apoio (empresa do projeto, e-mail, projeto da tarefa...). */
  sub: string;
  /** Para onde o clique leva; sempre uma rota que o perfil abre. */
  href: string;
}

/** O que a busca devolve: os itens que cabem na lista e quantos existiam no total. */
export interface RespostaBusca {
  itens: ResultadoBusca[];
  /** Total de resultados antes de cortar no limite (para a lista dizer "mostrando 10 de 23"). */
  total: number;
}

// [PV-2] OS LIMITES DA BUSCA: mínimo de letras para buscar e máximo de resultados na lista. A lista reparte as vagas entre os tipos para nenhum sumir.
/** Letras mínimas para buscar (1 letra traria quase tudo). */
export const MINIMO_DE_LETRAS = 2;
/** Máximo de resultados mostrados; as vagas são repartidas entre os tipos (rodízio). */
export const LIMITE_DE_RESULTADOS = 10;

// [PV-3] O TEXTO DO CAMPO DE BUSCA por perfil: precisa prometer só o que o perfil consegue achar. Mudou os tipos em montarCandidatos? Ajuste aqui.
/**
 * Texto de ajuda do campo de busca, por perfil. Só promete o que o perfil consegue achar:
 * empresas e pessoas só o administrador abre (rotas /empresas e /pessoas).
 * @param perfil - perfil da sessão (sem sessão, o texto mais curto).
 * @returns o placeholder.
 * @example placeholderDaBusca('empresa') // 'Buscar projeto, tarefa, arquivo, trilha…'
 */
export function placeholderDaBusca(perfil?: Perfil): string {
  if (perfil === 'admin') return 'Buscar projeto, tarefa, empresa, pessoa, trilha…';
  return 'Buscar projeto, tarefa, arquivo, trilha…';
}

/** Um resultado ainda sem pontuação: o título (campo principal) e os campos de apoio onde o texto também vale. */
interface Candidato extends ResultadoBusca {
  /** Textos extras pesquisáveis (tipo do projeto, e-mail, etiquetas...), além do título. */
  apoio: string[];
}

/**
 * Pontua um candidato para o texto buscado. Todas as palavras digitadas precisam aparecer (no título ou no apoio),
 * em qualquer ordem: "pedidos portal" acha "Portal de pedidos".
 * @param palavras - texto buscado, normalizado e separado por espaços.
 * @param inteiro - o texto buscado inteiro, normalizado.
 * @param c - o candidato.
 * @returns 0 (título começa com o texto), 1 (título tem todas as palavras), 2 (só com o apoio) ou null (não casa).
 */
function pontuar(palavras: string[], inteiro: string, c: Candidato): number | null {
  const titulo = normalizar(c.titulo);
  const tudo = `${titulo} ${c.apoio.map(normalizar).join(' ')}`;
  // Falta alguma palavra: não é resultado.
  if (!palavras.every((p) => tudo.includes(p))) return null;
  if (titulo.startsWith(inteiro)) return 0;
  if (palavras.every((p) => titulo.includes(p))) return 1;
  return 2;
}

/**
 * Monta todos os itens que a sessão PODE abrir, ainda sem filtrar pelo texto.
 * ESCOPO: cada tipo só entra se o perfil abre a tela dele (podeAcessar) e, dentro do tipo, só o que lib/escopo.ts deixa ver.
 * @param sessao - quem está logado.
 * @param dados - todos os dados.
 * @returns os candidatos de todos os tipos.
 */
function montarCandidatos(sessao: SessaoEscopo, dados: Dados): Candidato[] {
  const { perfil } = sessao;
  // Trava da trilha obrigatória (§12): o profissional com trilha pendente só abre /painel e /minhas-trilhas.
  // Sem este filtro a busca levaria a /projetos, onde ele só veria o aviso de bloqueio.
  const travado = EXIGIR_TRILHA_NO_PRIMEIRO_ACESSO && perfil === 'profissional' && temTrilhaObrigatoriaPendente(sessao.pessoaId, dados);
  // O perfil abre esta rota (e a trava não a esconde)?
  const abre = (href: string) => podeAcessar(perfil, href) && (!travado || rotaLiberadaComTrilhaPendente(href));
  const nomeEmpresa = (id: string) => dados.empresas.find((e) => e.id === id)?.nomeFantasia ?? '';
  const nomePessoa = (id: string) => dados.pessoas.find((p) => p.id === id)?.nome ?? '';
  const lista: Candidato[] = [];

  // Projetos: pelo nome; a empresa, o tipo e a descrição também valem ("vert" acha os projetos da Vértice).
  if (abre('/projetos')) {
    for (const p of projetosVisiveis(sessao, dados)) {
      lista.push({ id: p.id, tipo: 'Projeto', titulo: p.nome, sub: nomeEmpresa(p.empresaId), href: `/projetos/${p.id}`, apoio: [nomeEmpresa(p.empresaId), p.tipo, p.descricao] });
    }
    // Tarefas e arquivos vivem dentro do projeto: abrem o detalhe por cima do quadro (?tarefa=).
    const projetos = new Map(projetosVisiveis(sessao, dados).map((p) => [p.id, p]));
    for (const t of tarefasVisiveis(sessao, dados)) {
      const projeto = projetos.get(t.projetoId);
      if (!projeto) continue;
      const href = `/projetos/${t.projetoId}?tarefa=${t.id}`;
      lista.push({ id: t.id, tipo: 'Tarefa', titulo: t.titulo, sub: `${projeto.nome} · ${nomePessoa(t.responsavelId) || 'sem responsável'}`, href, apoio: [...t.etiquetas, t.descricao] });
      for (const a of t.anexos ?? []) {
        lista.push({ id: `${t.id}/${a.id}`, tipo: 'Arquivo', titulo: a.nome, sub: `${t.titulo} · ${projeto.nome}`, href, apoio: [] });
      }
    }
  }

  // Empresas e pessoas: só o administrador abre essas telas; "?abrir=<id>" abre a ficha direto.
  if (abre('/empresas')) {
    for (const e of empresasVisiveis(sessao, dados)) {
      // O CNPJ também casa só com os números ("11222333"), porque é guardado com máscara.
      lista.push({ id: e.id, tipo: 'Empresa', titulo: e.nomeFantasia, sub: e.cnpj, href: `/empresas?abrir=${e.id}`, apoio: [e.razaoSocial, e.cnpj, e.cnpj.replace(/\D/g, ''), e.segmento, e.cidadeUf, e.contatoNome] });
    }
  }
  if (abre('/pessoas')) {
    for (const p of pessoasVisiveis(sessao, dados)) {
      lista.push({ id: p.id, tipo: 'Pessoa', titulo: p.nome, sub: p.status === 'inativo' ? `${p.email} · inativa` : p.email, href: `/pessoas?abrir=${p.id}`, apoio: [p.email, p.cargo, p.area, p.nivel, ...p.habilidades] });
    }
  }

  // Trilhas do editor (admin: todas; empresa: as dela). As etapas também valem ("conduta" acha a trilha de boas-vindas).
  if (abre('/trilhas')) {
    for (const t of trilhasVisiveis(sessao, dados)) {
      lista.push({ id: t.id, tipo: 'Trilha', titulo: t.titulo, sub: `${t.etapas.length} etapas${t.status === 'rascunho' ? ' · rascunho' : ''}`, href: `/trilhas/${t.id}`, apoio: [t.descricao, ...t.etapas.map((e) => e.titulo)] });
    }
  }
  // Trilhas que a pessoa cumpre (empresa e profissional): a mesma lista da tela Minhas trilhas, para o link sempre abrir.
  if (abre('/minhas-trilhas')) {
    for (const x of trilhasDaPessoaDetalhadas(sessao.pessoaId, dados)) {
      lista.push({ id: x.trilha.id, tipo: 'Minha trilha', titulo: x.trilha.titulo, sub: `${x.concluidas} de ${x.total} etapas`, href: `/minhas-trilhas/${x.trilha.id}`, apoio: [x.trilha.descricao, ...x.trilha.etapas.map((e) => e.titulo)] });
    }
  }
  return lista;
}

// [PV-4] A BUSCA GLOBAL: junta tudo o que a sessão abre, filtra pelo texto (todas as palavras, sem acento) e reparte as vagas da lista entre os tipos. TODO(API): vira chamada ao servidor.
/**
 * Busca global do topo.
 * Regras: a partir de 2 letras; todas as palavras digitadas precisam casar (sem acento nem maiúsculas);
 * dentro de cada tipo, o que COMEÇA com o texto vem antes. Como a lista tem poucas vagas, elas são repartidas
 * em rodízio entre os tipos (1º de cada tipo, depois o 2º de cada um...), para um tipo com muitos itens não esconder os outros.
 * @param texto - o que a pessoa digitou.
 * @param sessao - quem está logado (define o escopo).
 * @param dados - todos os dados (de `useDados()`).
 * @param limite - máximo de itens devolvidos (padrão: LIMITE_DE_RESULTADOS).
 * @returns os itens (agrupados por tipo, na ordem de TIPOS_DE_BUSCA) e o total encontrado.
 * @example buscarGlobal('portal', { pessoaId: 'pes_ana', perfil: 'profissional' }, dados).itens[0].href // '/projetos/prj_portal'
 */
export function buscarGlobal(texto: string, sessao: SessaoEscopo, dados: Dados, limite = LIMITE_DE_RESULTADOS): RespostaBusca {
  const inteiro = normalizar(texto.trim()).replace(/\s+/g, ' ');
  // Menos de 2 letras: não busca.
  if (inteiro.length < MINIMO_DE_LETRAS) return { itens: [], total: 0 };
  const palavras = inteiro.split(' ');
  const pontuados = montarCandidatos(sessao, dados)
    .map((c) => ({ c, pontos: pontuar(palavras, inteiro, c) }))
    .filter((x): x is { c: Candidato; pontos: number } => x.pontos !== null);

  // Um grupo por tipo, cada um com os melhores primeiro (sort é estável: empate mantém a ordem dos dados).
  const grupos = TIPOS_DE_BUSCA.map((tipo) => pontuados.filter((x) => x.c.tipo === tipo).sort((a, b) => a.pontos - b.pontos).map((x) => x.c));
  // Rodízio: rodada 0 pega o melhor de cada tipo, rodada 1 o segundo... até encher as vagas.
  const escolhidos = new Set<Candidato>();
  for (let rodada = 0; escolhidos.size < limite; rodada++) {
    const antes = escolhidos.size;
    for (const g of grupos) {
      if (g[rodada] && escolhidos.size < limite) escolhidos.add(g[rodada]);
    }
    // Ninguém tinha item nesta rodada: acabaram os resultados.
    if (escolhidos.size === antes) break;
  }
  // Na lista, os itens ficam agrupados por tipo (a ordem dos grupos), sem a propriedade interna `apoio`.
  const itens = grupos.flat().filter((c) => escolhidos.has(c)).map((c): ResultadoBusca => ({ id: c.id, tipo: c.tipo, titulo: c.titulo, sub: c.sub, href: c.href }));
  return { itens, total: pontuados.length };
}
