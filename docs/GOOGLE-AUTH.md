# Login com Google (J01 a J05)

O Google só **prova o e-mail**. Quem decide se a pessoa entra, e com qual perfil, é o cadastro do CAIS
(`lib/googleLogin.ts`): e-mail fora do cadastro, conta inativa ou convite pendente **não entram**.
O login por e-mail e senha e os botões "Entrar como" continuam funcionando.

## Fluxo
1. `/login` → botão "Entrar com Google" (`components/LoginForm.tsx`, só aparece com as credenciais).
2. Google → `/api/auth/callback/google` (`auth.ts`) → volta para `/login/google`.
3. `components/RetornoGoogle.tsx` lê o e-mail, confere no cadastro, abre a sessão do CAIS e vai para `?voltar=` ou `/painel`.

## J01 — criar as credenciais (manual, ~15 min)
1. https://console.cloud.google.com → novo projeto "CAIS".
2. "APIs e serviços" → "Tela de consentimento OAuth" → Externo → nome do app e e-mail de suporte. Em teste, adicione seu e-mail em "Usuários de teste".
3. "Credenciais" → "Criar credenciais" → "ID do cliente OAuth" → "Aplicativo da Web".
4. Origem JavaScript autorizada: `http://localhost:3000`.
5. URI de redirecionamento autorizado: `http://localhost:3000/api/auth/callback/google` (em produção, o mesmo caminho no domínio real).
6. Copie o ID e o segredo do cliente.

## Variáveis (`.env.local`, nunca no Git)
Copie `.env.example` para `.env.local` e preencha `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` e `AUTH_SECRET`. Reinicie o `npm run dev`.

## Testar
- E-mail Google igual ao de uma pessoa **ativa** do cadastro (ex.: troque o e-mail de uma conta em `/pessoas`) → entra.
- E-mail Google fora do cadastro → volta ao `/login` com a mensagem explicando.
- Casos de lógica: `node --experimental-strip-types lib/googleLogin.casos.ts`.

## Pendências
- `TODO(API)`: hoje o cadastro mora no navegador; com a API da PROGLOGIC, a conferência sobe para o callback `signIn` de `auth.ts`.
- Nomes de variáveis: o prompt original usava `NEXTAUTH_*`; o Auth.js v5 usa `AUTH_*`.
