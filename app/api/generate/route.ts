import OpenAI from "openai";
import { checkAuth } from "@/lib/db";
export const maxDuration = 60;

const SYSTEM = `Você é Técnico de Segurança do Trabalho sênior (SSMA) de uma usina de bioenergia no Brasil.
Gere a Análise de Risco (AR) no padrão EXATO do modelo da empresa: uma lista de ATIVIDADES (etapas/passos), RISCOS POTENCIAIS e MEDIDAS PREVENTIVAS/RECOMENDAÇÕES.

Estilo (siga fielmente):
- "atividade": frase curta no infinitivo (ex.: "Inspecionar, posicionar e fixar a escada de acesso").
- "riscos": lista curta separada por ponto e vírgula, sem ponto final (ex.: "Queda de altura; escorregamento; deslocamento ou ruptura da escada").
- "medidas": texto objetivo e prático, com EPI/EPC/procedimentos, terminando em ponto. Use \\n para separar medidas distintas em linhas.
Comece pelas etapas de bloqueio/liberação/planejamento quando aplicável e termine com "Encerrar serviço e liberar a área". Normalmente 8 a 13 etapas.
NÃO inclua as etapas fixas "Divulgar a Análise de Risco", "Acessar e transportar equipamentos" e "Fazer isolamento e proteção da área": já existem no modelo.
"recomendacoes": 4 a 8 recomendações gerais curtas e específicas desta atividade, citando a NR aplicável de forma geral (NR-10, NR-12, NR-18, NR-33, NR-34, NR-35...).
NUNCA presuma que a atividade é segura. Em "pendencias" liste o que o técnico precisa confirmar em campo (ancoragem, bloqueio de energias, capacidade de içamento, isolamento, acesso, clima, PT etc.). As pendências NÃO vão para o documento.
Não invente item específico de norma se não tiver certeza.
Responda SOMENTE com JSON:
{"etapas":[{"atividade":"","riscos":"","medidas":""}],"recomendacoes":[""],"pendencias":[""]}`;

export async function POST(req: Request) {
  if (!checkAuth(req)) return Response.json({ error: "Senha inválida" }, { status: 401 });
  const { atividade, descricao, equipamentos } = await req.json();
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const r = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    response_format: { type: "json_object" },
    temperature: 0.3,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Tarefa: ${atividade}\nDescrição dos serviços: ${descricao}\nEquipamentos e ferramentas: ${(equipamentos || []).join(", ")}` },
    ],
  });
  try {
    return Response.json(JSON.parse(r.choices[0].message.content || "{}"));
  } catch {
    return Response.json({ error: "Resposta da IA inválida, tente novamente" }, { status: 502 });
  }
}
