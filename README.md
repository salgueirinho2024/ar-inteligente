# AR Inteligente – SSMA

## Passo a passo
1. Neon (neon.tech): crie um projeto, abra o SQL Editor, cole `sql/schema.sql` e execute. Copie a connection string.
2. OpenAI: crie uma chave em platform.openai.com.
3. Copie `.env.example` para `.env.local` e preencha as variáveis.
4. Local: `npm install && npm run dev` e abra http://localhost:3000
5. Vercel: suba no GitHub, importe o repositório e cadastre as mesmas variáveis em Settings > Environment Variables.

## Modelo Word
O documento é gerado a partir de `template/modelo.docx` (seu arquivo original). Só os campos variáveis são preenchidos: cabeçalho (tarefa, gerência, data, hora, turno, setor, local), linhas de atividades e recomendações gerais. Logo, assinaturas, aprovações e tabela em branco ficam intactos. Para trocar o modelo, substitua esse arquivo mantendo a mesma estrutura.

## Próximos passos
- Login por usuário, PDF, biblioteca de equipamentos e NRs.

## Modelo Word oficial
O arquivo `template/modelo.docx` é uma cópia idêntica ao modelo enviado de **AR – ANÁLISE DE RISCO**. O endpoint `/api/docx` abre esse mesmo DOCX e modifica apenas os campos específicos do cabeçalho, as linhas variáveis da tabela de atividades e as recomendações gerais, preservando as imagens/logo, cabeçalho, bordas, tabelas de assinaturas e aprovações e restante do layout original. Não substitua o template por um DOCX gerado do zero. As três primeiras etapas fixas permanecem inalteradas. Confira a paginação final no Word quando houver textos extensos, pois o número de páginas depende da quantidade de etapas.
