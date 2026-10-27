import { sql, checkAuth } from "@/lib/db";

export async function GET(req: Request) {
  if (!checkAuth(req)) return Response.json({ error: "Senha inválida" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const r = await sql`SELECT * FROM ars WHERE id = ${id}`;
    return Response.json(r[0] || null);
  }
  return Response.json(await sql`SELECT id, atividade, setor, data_ar, status, aprovado_por FROM ars ORDER BY id DESC LIMIT 100`);
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return Response.json({ error: "Senha inválida" }, { status: 401 });
  const { id, atividade, setor, status, aprovado_por, conteudo } = await req.json();
  const c = JSON.stringify(conteudo);
  if (id) {
    await sql`UPDATE ars SET atividade=${atividade}, setor=${setor}, status=${status}, aprovado_por=${aprovado_por}, conteudo=${c}::jsonb, atualizado_em=now() WHERE id=${id}`;
    return Response.json({ id });
  }
  const r = await sql`INSERT INTO ars (atividade, setor, status, aprovado_por, conteudo) VALUES (${atividade}, ${setor}, ${status}, ${aprovado_por}, ${c}::jsonb) RETURNING id`;
  return Response.json({ id: r[0].id });
}
