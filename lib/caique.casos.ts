/* ============================================================================
   CASOS DE TESTE DO CAIQUE
   O que é: script simples (sem biblioteca de testes) que confere idTrilhaDoCaminho, sugestoesCaique,
     validarPergunta e montarRespostaSimulada.
   Onde é usado: rodado à mão no terminal; nenhuma tela importa este arquivo.
   Depende de: lib/caique.ts (import com extensão .ts para o Node achar o módulo).
   Contexto: prompts I02 e I06 em docs/prompts.
   Como rodar: node --experimental-strip-types lib/caique.casos.ts
   ============================================================================ */

import { idTrilhaDoCaminho, sugestoesCaique, validarPergunta, montarRespostaSimulada, LIMITE_PERGUNTA } from './caique.ts';

const casos: { porque: string; obtido: unknown; esperado: unknown }[] = [
  { porque: '/minhas-trilhas/t1 é a trilha t1', obtido: idTrilhaDoCaminho('/minhas-trilhas/t1'), esperado: 't1' },
  { porque: 'a etapa também pertence à trilha', obtido: idTrilhaDoCaminho('/minhas-trilhas/t1/etapa/e2'), esperado: 't1' },
  { porque: '/trilhas/t9 (admin e empresa) é a trilha t9', obtido: idTrilhaDoCaminho('/trilhas/t9'), esperado: 't9' },
  { porque: 'a lista /trilhas não tem trilha aberta', obtido: idTrilhaDoCaminho('/trilhas'), esperado: undefined },
  { porque: 'outra tela não tem trilha', obtido: idTrilhaDoCaminho('/painel'), esperado: undefined },
  { porque: 'sem trilha: 3 sugestões gerais', obtido: sugestoesCaique().length, esperado: 3 },
  { porque: 'com trilha: 4 sugestões e a primeira cita o título', obtido: sugestoesCaique('React')[0].includes('React') && sugestoesCaique('React').length === 4, esperado: true },
  { porque: 'pergunta vazia é recusada', obtido: validarPergunta('   '), esperado: 'Escreva a sua pergunta.' },
  { porque: 'pergunta normal é aceita', obtido: validarPergunta('Como funciona o quiz?'), esperado: null },
  { porque: 'pergunta no limite é aceita', obtido: validarPergunta('a'.repeat(LIMITE_PERGUNTA)), esperado: null },
  { porque: 'pergunta acima do limite é recusada', obtido: validarPergunta('a'.repeat(LIMITE_PERGUNTA + 1)) !== null, esperado: true },
  { porque: 'a resposta simulada cita a trilha e a pergunta', obtido: montarRespostaSimulada(' Oi ', 'React').includes('"React"') && montarRespostaSimulada(' Oi ', 'React').includes('"Oi"'), esperado: true },
  { porque: 'sem trilha a resposta fala do CAIS', obtido: montarRespostaSimulada('Oi').includes('sobre o CAIS'), esperado: true },
];

// Roda os casos e imprime OK/FALHOU com o porquê (mesmo formato dos outros .casos.ts).
let falhas = 0;
for (const c of casos) {
  const ok = c.obtido === c.esperado;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK    ' : 'FALHOU'} ${c.porque}${ok ? '' : ` (obtido: ${String(c.obtido)}, esperado: ${String(c.esperado)})`}`);
}
console.log(`\n${casos.length - falhas} de ${casos.length} casos passaram.`);
if (falhas > 0) process.exit(1);
