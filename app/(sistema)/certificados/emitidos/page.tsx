/* ============================================================================
   APP/(SISTEMA)/CERTIFICADOS/EMITIDOS/PAGE.TSX (CERTIFICADOS EMITIDOS)
   O que é: a lista dos certificados de trilha emitidos, com busca por pessoa ou trilha: o administrador
   vê todos e a empresa vê só os do time dela.
   Onde é usado: rota /certificados/emitidos (item "Certificados" do menu, components/shell/navegacao.ts).
   Depende de: lib/auth.tsx, lib/store.tsx (useDados), lib/certificados.ts (certificadosEmitidos),
   lib/utils.ts (dataBR, normalizar) e componentes de components/ui/ e components/shell/Pagina.tsx.
   Contexto: pedido de 13/10/2026 (certificados) e §13 (quatro estados).
   ============================================================================ */

// "use client": tem estado (busca) e lê a sessão e os dados.
"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Award, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useDados } from '@/lib/store';
import { certificadosEmitidos } from '@/lib/certificados';
import { dataBR, normalizar } from '@/lib/utils';
import { CabecalhoPagina, BarraFiltros } from '@/components/shell/Pagina';
import Input from '@/components/input';
import { Avatar, EstadoVazio, Esqueleto } from '@/components/ui/basicos';
import { Tabela, Th, Td, Tr } from '@/components/ui/Tabela';

/**
 * Lista de certificados emitidos (rota /certificados/emitidos).
 * Estados (§13): carregando (esqueleto), vazio (ninguém concluiu ainda, ou a busca não achou) e com dados.
 *
 * @returns a página com a busca e a tabela.
 */
export default function CertificadosEmitidos() {
  const { sessao } = useAuth();
  const d = useDados();
  const [busca, setBusca] = useState('');
  const ehEmpresa = sessao?.perfil === 'empresa';

  // [PV-1] A BUSCA DA LISTA: procura no nome da pessoa, no título da trilha e no código, sem acento e sem diferenciar maiúsculas. Para filtrar por outro campo (empresa, data), acrescente aqui.
  const todos = useMemo(() => (sessao && d.pronto ? certificadosEmitidos(sessao, d) : []), [sessao, d]);
  const lista = useMemo(() => {
    const q = normalizar(busca.trim());
    return q ? todos.filter((c) => normalizar(`${c.pessoaNome} ${c.trilhaTitulo} ${c.codigo}`).includes(q)) : todos;
  }, [todos, busca]);

  return (
    <div className="mx-auto max-w-[1200px] p-4 sm:p-6 lg:p-8">
      <CabecalhoPagina titulo="Certificados emitidos"
        descricao={ehEmpresa ? 'Quem do seu time concluiu as trilhas da empresa.' : 'Todas as pessoas que concluíram trilhas publicadas.'} />

      <BarraFiltros>
        <div className="w-full max-w-sm">
          <Input compacto label="Buscar" placeholder="Pessoa, trilha ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <p className="text-[13px] text-tinta-suave">{lista.length} certificado{lista.length !== 1 ? 's' : ''}</p>
      </BarraFiltros>

      {!d.pronto || !sessao ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Esqueleto key={i} className="h-12 w-full rounded-xl" />)}</div>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border border-borda bg-superficie">
          <EstadoVazio icone={busca ? <Search className="h-6 w-6" /> : <Award className="h-6 w-6" />}
            titulo={busca ? 'Nenhum certificado encontrado' : 'Nenhum certificado emitido ainda'}
            descricao={busca ? 'Tente outro nome, trilha ou código.' : 'Os certificados aparecem aqui quando alguém conclui todas as etapas de uma trilha publicada.'} />
        </div>
      ) : (
        <div className="rounded-2xl border border-borda bg-superficie">
          <Tabela rotulo="Certificados emitidos">
            <thead><tr><Th>Pessoa</Th><Th>Trilha</Th><Th>Concluída em</Th><Th>Nota</Th><Th>Código</Th></tr></thead>
            <tbody>
              {lista.map((c) => (
                <Tr key={`${c.trilhaId}-${c.pessoaId}`}>
                  <Td><span className="flex items-center gap-2.5"><Avatar nome={c.pessoaNome} tamanho={28} />{c.pessoaNome}</span></Td>
                  <Td>{c.trilhaTitulo}</Td>
                  <Td className="tabular-nums">{dataBR(c.concluidaEm)}</Td>
                  <Td className="tabular-nums">{c.nota !== undefined ? `${c.nota}%` : '—'}</Td>
                  {/* NAVEGA: o código leva à conferência pública (/verificar) já preenchida. */}
                  <Td><Link href={`/verificar?codigo=${c.codigo}`} className="font-mono text-[13px] text-primaria hover:underline">{c.codigo}</Link></Td>
                </Tr>
              ))}
            </tbody>
          </Tabela>
        </div>
      )}
    </div>
  );
}
