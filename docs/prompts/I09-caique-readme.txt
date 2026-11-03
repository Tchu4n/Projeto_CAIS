## 🔵 I09 — README & Documentação

**Duração:** 1h30  
**Responsável:** Tech Writer  
**Ferramenta:** Markdown (manual)  
**Não é Claude Code (documentação)**

### Conteúdo esperado

```markdown
# CAIQUE — Guia de Manutenção

## O que é?
Assistente IA integrado ao CAIS que responde dúvidas sobre trilhas usando Google Gemini.

## Setup

### 1. Variáveis de env
```
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
GEMINI_TIMEOUT_MS=8000
```

### 2. Instalar dependências
npm install (já instalado em CAIS)

### 3. Testar localmente
npm run dev
Ir para http://localhost:3000/painel
Chat deve aparecer (fixo, inferior direito)

## Rotas API

### POST /api/caique/chat
Processar pergunta

Request:
```json
{
  "pergunta": "O que é async?",
  "contexto": {
    "userId": "ana",
    "companyId": "vertice",
    "trailId": "trilha-js-avancado",
    "trailName": "JavaScript Avançado",
    "userLanguage": "pt",
    "historicoMensagens": [...]
  }
}
```

Response:
```json
{
  "success": true,
  "resposta": "async é...",
  "metadata": {
    "responseTimeMs": 2500,
    "tokensUsed": 150,
    "modelo": "gemini-2.0-flash",
    "fonte": "Etapa 5: Async/Await",
    "idioma": "pt"
  }
}
```

### POST /api/caique/feedback
Enviar feedback (👍👎)

Request:
```json
{
  "messageId": "timestamp",
  "feedback": "thumbs_up",
  "comentario": "Muito útil!"
}
```

### GET /api/caique/logs?companyId=X
Analytics (admin only)

## Troubleshooting

### "RESOURCE_EXHAUSTED" (429)
Gemini API rate limit atingido. Aguarde 60 segundos e tente novamente.

**Solução:** Aumentar GEMINI_TIMEOUT_MS? Não. É rate limit do Gemini, não do nosso código. Monitore uso, considere upgrade do plano Gemini.

### "DEADLINE_EXCEEDED" (timeout)
Pergunta muito complexa ou Gemini sobrecarregado.

**Solução:** Timeout = 8s (GEMINI_TIMEOUT_MS). Aumentar para 15s? Talvez, teste.

### Chat não aparece
1. Autenticado? Verificar session cookie
2. GEMINI_API_KEY definida? `echo $GEMINI_API_KEY`
3. .env.local existe? `ls -la .env.local`
4. Painel renderiza? Abrir DevTools Console (erros?)

### Logs não salvando
1. Pasta `logs/` existe? `ls logs/`
2. Permissão de escrita? `touch logs/test && rm logs/test`
3. Tamanho arquivo? Se > 100MB, arquivar

## Performance

Benchmark (local):
- Pergunta simples: 2–3s
- Com histórico (10 msgs): 3–5s
- Offline: erro graceful

Benchmark (produção com CDN):
- Esperado: 4–7s

## Logs

Arquivo: `logs/caique-YYYY-MM-DD.json`

Rotação: diária

Conteúdo:
```json
{
  "timestamp": "2026-11-03T14:30:00.000Z",
  "userId": "ana.souza",
  "companyId": "vertice",
  "pergunta": "O que é OOP?",
  "resposta": "OOP é ...",
  "responseTimeMs": 2500,
  "tokensUsed": 150,
  "rating": 1,
  "comentario": "Muito útil!"
}
```

Análise: ver `/painel/caique-analytics`

## Roadmap v2 (Futuro)

- [ ] Pesquisa externa (Google Search, Stack Overflow)
- [ ] Sugestão de próxima pergunta
- [ ] A/B testing de system prompts
- [ ] Tradução em tempo real
- [ ] Integração com feedback de trilhas (melhorar docs)

## Suporte

Dúvidas?
- Código: Ver CLAUDE.md seção CAIQUE
- API: Documentação em app/api/caique/README.md
- Bugs: Abrir issue no board
```
