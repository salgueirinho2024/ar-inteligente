import { checkAuth } from "@/lib/db";
import { preencherModelo } from "@/lib/preencherModelo";

export async function POST(req: Request) {
  if (!checkAuth(req)) return Response.json({ error: "Senha inválida" }, { status: 401 });
  const { cab, conteudo } = await req.json();
  try {
    const buf = await preencherModelo({
      tarefa: cab.tarefa, gerencia: cab.gerencia, setor: cab.setor, local: cab.local,
      dataInicio: cab.dataInicio, horaInicial: cab.horaInicial, turno: cab.turno,
      etapas: conteudo.etapas || [], recomendacoes: conteudo.recomendacoes || [],
    });
    return new Response(buf, { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="AR.docx"',
    } });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
