/* ============================================================================
   RETORNOGOOGLE.TSX — TELA DE RETORNO DO LOGIN COM GOOGLE
   O que é: roda quando o Google devolve a pessoa ao CAIS. Pergunta ao Auth.js quem ela é,
   casa o e-mail com o cadastro e abre a sessão do CAIS (ou volta ao /login com o motivo).
   Onde é usado: app/login/google/page.tsx.
   Depende de: next-auth/react (getSession, signOut), lib/auth (useAuth.iniciarSessao), lib/googleLogin (resolverContaGoogle),
     lib/store (lerPessoasSalvas), next/navigation e lucide-react.
   Contexto: §12 (login) e §11 (conta inativa); passo J03/J04 em docs/prompts.
   ============================================================================ */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signOut } from "next-auth/react";
import { Loader2, CircleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { lerPessoasSalvas } from "@/lib/store";
import { resolverContaGoogle } from "@/lib/googleLogin";

/**
 * Faz a ponte entre o Google (Auth.js) e a sessão do CAIS.
 * @returns um aviso de "conferindo sua conta" enquanto resolve, ou o erro se a conexão falhar.
 */
export function RetornoGoogle() {
  const router = useRouter();
  const params = useSearchParams();
  const { iniciarSessao, pronto } = useAuth();
  const [falhou, setFalhou] = useState(false);
  // Garante que a ponte rode uma vez só (o React em desenvolvimento executa os efeitos duas vezes).
  const rodou = useRef(false);
  // Mesma regra de segurança do LoginForm: só caminho interno, nunca "//" nem /login.
  const voltar = params.get("voltar");
  const destino =
    voltar && voltar.startsWith("/") && !voltar.startsWith("//") && !voltar.startsWith("/login") ? voltar : "/painel";

  // Roda quando a sessão do CAIS termina de carregar (pronto); sem limpeza. Só então abre a sessão ou recusa.
  useEffect(() => {
    if (!pronto || rodou.current) return;
    rodou.current = true;
    (async () => {
      try {
        // Pergunta ao Auth.js quem o Google confirmou (cookie assinado do servidor).
        const sessaoGoogle = await getSession();
        const email = sessaoGoogle?.user?.email;
        // Sem e-mail: o login com Google não aconteceu (a pessoa fechou ou negou a tela do Google).
        if (!email) {
          // NAVEGA: volta ao login com o motivo.
          router.replace("/login?google=cancelado");
          return;
        }
        const r = resolverContaGoogle(email, lerPessoasSalvas());
        // APAGA: encerra a sessão do Auth.js; ela já cumpriu o papel de provar o e-mail e não deve ficar aberta.
        await signOut({ redirect: false });
        if (!r.ok) {
          // NAVEGA: volta ao login dizendo por que não entrou.
          router.replace(`/login?google=${r.motivo}`);
          return;
        }
        // GRAVA: abre a sessão do CAIS (sem senha: o Google acabou de provar a identidade).
        iniciarSessao({ id: r.pessoa.id, nome: r.pessoa.nome, email: r.pessoa.email, perfil: r.pessoa.perfil }, true);
        // NAVEGA: vai para onde a pessoa queria (?voltar=) ou para o painel.
        router.replace(destino);
      } catch {
        setFalhou(true);
      }
    })();
  }, [pronto, iniciarSessao, router, destino]);

  // Erro de rede ou do servidor: diz o que houve e como tentar de novo.
  if (falhou) {
    return (
      <div role="alert" className="flex max-w-[440px] items-start gap-2.5 rounded-xl border border-erro/30 bg-erro/10 px-4 py-3 text-sm text-erro">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>
          Não foi possível concluir o login com Google. <a className="font-semibold underline" href="/login">Voltar ao login</a> e tentar de novo.
        </span>
      </div>
    );
  }

  return (
    <div role="status" className="flex items-center gap-3 text-tinta-suave">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      <span>Conferindo sua conta Google…</span>
    </div>
  );
}
