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

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  error?: { message?: string; status?: string };
};

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return Response.json({ error: "Senha inválida" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GEMINI_API_KEY não configurada na Vercel" }, { status: 500 });
  }

  try {
    const { atividade, descricao, equipamentos } = await req.json();
    if (!atividade || !descricao) {
      return Response.json({ error: "Informe a atividade e a descrição do serviço" }, { status: 400 });
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: `Tarefa: ${atividade}\nDescrição dos serviços: ${descricao}\nEquipamentos e ferramentas: ${Array.isArray(equipamentos) ? equipamentos.join(", ") : "Não informado"}` }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3, maxOutputTokens: 8192 },
      }),
      cache: "no-store",
    });

    const data = (await resposta.json()) as GeminiResponse;
    if (!resposta.ok) {
      const details = data.error?.message || `HTTP ${resposta.status}`;
      if (resposta.status === 429) {
        return Response.json({ error: `Limite gratuito do Gemini atingido. Tente novamente mais tarde. ${details}` }, { status: 429 });
      }
      return Response.json({ error: `Erro da API Gemini: ${details}` }, { status: 502 });
    }

    const texto = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    if (!texto) {
      return Response.json({ error: "O Gemini não retornou conteúdo. Confira a descrição ou tente novamente." }, { status: 502 });
    }
    const gerado: unknown = JSON.parse(texto);
    if (!gerado || typeof gerado !== "object" || !Array.isArray((gerado as { etapas?: unknown }).etapas)) {
      return Response.json({ error: "Resposta da IA sem as etapas esperadas. Tente novamente." }, { status: 502 });
    }
    return Response.json(gerado);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro inesperado";
    return Response.json({ error: `Não foi possível gerar a AR: ${message}` }, { status: 500 });
  }
}
