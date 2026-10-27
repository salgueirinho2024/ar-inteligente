
import { checkAuth } from "@/lib/db";
import { preencherModelo } from "@/lib/preencherModelo";

export async function POST(req: Request) {
  if (!checkAuth(req)) {
    return Response.json(
      { error: "Senha inválida" },
      { status: 401 }
    );
  }

  try {
    const { cab, conteudo } = await req.json();

    const buf = await preencherModelo({
      tarefa: cab.tarefa,
      gerencia: cab.gerencia,
      setor: cab.setor,
      local: cab.local,
      dataInicio: cab.dataInicio,
      horaInicial: cab.horaInicial,
      turno: cab.turno,
      etapas: conteudo.etapas || [],
      recomendacoes: conteudo.recomendacoes || [],
    });

    // Converte o Buffer para um ArrayBuffer
    // compatível com a API Response do Next.js.
    const bytes = Uint8Array.from(buf);

    return new Response(bytes.buffer as ArrayBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition":
          'attachment; filename="AR.docx"',
      },
    });
  } catch (e: unknown) {
    const mensagem =
      e instanceof Error ? e.message : "Erro ao gerar AR";

    return Response.json(
      { error: mensagem },
      { status: 500 }
    );
  }
}
