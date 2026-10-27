import JSZip from "jszip";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import fs from "fs";
import path from "path";

export type Dados = {
  tarefa: string; gerencia: string; setor: string; local: string;
  dataInicio?: string; // YYYY-MM-DD
  horaInicial?: string; turno?: "A" | "B" | "C";
  etapas: { atividade: string; riscos: string; medidas: string }[];
  recomendacoes: string[];
};

const kids = (n: any, tag: string): any[] => Array.from(n.childNodes as ArrayLike<any>).filter((c: any) => c.nodeName === tag);
const all = (n: any, tag: string): any[] => { const l = n.getElementsByTagName(tag), r: any[] = []; for (let i = 0; i < l.length; i++) r.push(l.item(i)); return r; };
const textOf = (n: any) => all(n, "w:t").map((t) => t.textContent).join("");

function setRunText(doc: any, run: any, text: string) {
  let t = kids(run, "w:t")[0];
  if (!t) { t = doc.createElement("w:t"); run.appendChild(t); }
  t.setAttribute("xml:space", "preserve");
  while (t.firstChild) t.removeChild(t.firstChild);
  t.appendChild(doc.createTextNode(text));
}
function stripIds(n: any) {
  for (const e of [n, ...all(n, "w:p"), ...all(n, "w:tr")]) { e.removeAttribute?.("w14:paraId"); e.removeAttribute?.("w14:textId"); }
}
function setParaText(doc: any, p: any, text: string) {
  const runs = kids(p, "w:r"); const keep = runs.find((r) => kids(r, "w:t").length) || runs[0];
  runs.forEach((r) => r !== keep && p.removeChild(r));
  if (!keep) throw new Error("Parágrafo sem campo de texto no modelo");
  setRunText(doc, keep, text);
}
function setCell(doc: any, tc: any, text: string) {
  const ps = kids(tc, "w:p"); const tpl = ps[0].cloneNode(true);
  ps.forEach((p) => tc.removeChild(p));
  const lines = (text || "").split(/\n+/).map((s) => s.trim()).filter(Boolean); if (!lines.length) lines.push("");
  for (const l of lines) { const p = tpl.cloneNode(true); stripIds(p); setParaText(doc, p, l); tc.appendChild(p); }
}
function findRun(doc: any, startsWith: string) {
  const r = all(doc, "w:r").find((r) => textOf(r).startsWith(startsWith));
  if (!r) throw new Error("Campo do modelo não encontrado: " + startsWith);
  return r;
}
const parse = (x: string) => new DOMParser().parseFromString(x, "text/xml") as any;
const ser = (d: any) => { const s = new XMLSerializer().serializeToString(d); return s.startsWith("<?xml") ? s : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + s; };

export async function preencherModelo(d: Dados): Promise<Buffer> {
  const zip = await JSZip.loadAsync(fs.readFileSync(path.join(process.cwd(), "template", "modelo.docx")));

  // ---------- CABEÇALHO ----------
  const hx = parse(await zip.file("word/header1.xml")!.async("string"));
  setRunText(hx, findRun(hx, "Desobstrução e remontagem"), d.tarefa);
  setRunText(hx, findRun(hx, "Industrial"), d.gerencia);
  setRunText(hx, findRun(hx, "Manutenção"), d.setor);
  setRunText(hx, findRun(hx, "Tubulação"), d.local);
  const [yy, mm, dd] = d.dataInicio ? d.dataInicio.split("-") : ["_____", "_____", "_____"];
  setRunText(hx, findRun(hx, "Início:"), `Início:  ${dd}`);
  setRunText(hx, findRun(hx, " / 10 / 2026"), ` / ${mm} / ${yy}              Fim: _____/_____/_____`);
  setRunText(hx, findRun(hx, "Hora Inicial:"), `Hora Inicial: ${d.horaInicial || "_____"}`);
  const turnoP = all(hx, "w:p").find((p) => textOf(p).startsWith("Turno de Trabalho"));
  if (!turnoP) throw new Error("Campo de turno ausente no modelo Word");
  const tr = kids(turnoP, "w:r");
  // O modelo distribui os marcadores A, B e C em runs separados.
  // Alteramos apenas a letra de marcação, preservando parênteses, espaçamento e estilo.
  setRunText(hx, tr[1], d.turno === "A" || !d.turno ? "( x  )" : "(    )");
  setRunText(hx, tr[4], d.turno === "B" ? " x" : " ");
  setRunText(hx, tr[8], d.turno === "C" ? " x" : " ");
  zip.file("word/header1.xml", ser(hx));

  // ---------- CORPO ----------
  const dx = parse(await zip.file("word/document.xml")!.async("string"));
  const body = all(dx, "w:body")[0];
  const tbls = kids(body, "w:tbl");
  const ativ = tbls.find((t) => kids(t, "w:tr").length > 5 && textOf(t).includes("Verificar bloqueios"))
    || tbls[3];
  if (!ativ || !textOf(ativ).includes("Verificar bloqueios")) throw new Error("Tabela de etapas não encontrada no modelo oficial");
  const rows = kids(ativ, "w:tr");
  const tplRow = rows[1].cloneNode(true);
  rows.slice(1).forEach((r) => ativ.removeChild(r));
  for (const e of d.etapas) {
    const row = tplRow.cloneNode(true); stripIds(row);
    const tcs = kids(row, "w:tc");
    setCell(dx, tcs[0], e.atividade); setCell(dx, tcs[1], e.riscos); setCell(dx, tcs[2], e.medidas);
    ativ.appendChild(row);
  }

  const rec = tbls.find((t) => textOf(t).includes("RECOMENDAÇÕES GERAIS"));
  if (!rec) throw new Error("Quadro de recomendações não encontrado no Word");
  const p = all(rec, "w:p")[0];
  const runs = kids(p, "w:r");
  // Preserve o primeiro run (título original, inclusive seu layout) e
  // escreva cada recomendação com uma quebra de linha Word genuína.
  const modeloRun = runs.find((r) => textOf(r).includes("Utilizar")) || runs[runs.length - 1];
  const tpl = modeloRun.cloneNode(true);
  for (const r of runs) if (r !== runs[0]) p.removeChild(r);
  for (const t of d.recomendacoes || []) {
    if (!t.trim()) continue;
    const r = tpl.cloneNode(true);
    // Deixe a estrutura do run inalterada (fonte, tamanho, estilo etc.).
    setRunText(dx, r, "• " + t.trim());
    const br = dx.createElement("w:br");
    const firstText = kids(r, "w:t")[0];
    r.insertBefore(br, firstText);
    p.appendChild(r);
  }
  zip.file("word/document.xml", ser(dx));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
