"use client";
import { useEffect, useState } from "react";

const EQUIP = ["Ferramentas manuais","Caminhão Munck","Escada de acesso","Cinto paraquedista","Lixadeira","Máquina de solda","Plataforma elevatória","Talha"];
const box: any = { background: "#fff", border: "1px solid #d5dbe1", borderRadius: 8, padding: 16, marginBottom: 16 };
const inp: any = { width: "100%", padding: 8, border: "1px solid #bbb", borderRadius: 6, boxSizing: "border-box", font: "inherit" };
const btn: any = { padding: "9px 16px", border: 0, borderRadius: 6, background: "#1f6f43", color: "#fff", cursor: "pointer", font: "inherit", marginRight: 8 };
const grid: any = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8, marginTop: 8 };

export default function Home() {
  const [pw, setPw] = useState("");
  const [cab, setCab] = useState<any>({ tarefa: "", gerencia: "Industrial", setor: "Manutenção", local: "", dataInicio: new Date().toISOString().slice(0, 10), horaInicial: "", turno: "A" });
  const [descricao, setDescricao] = useState("");
  const [equip, setEquip] = useState<string[]>([]);
  const [ar, setAr] = useState<any>(null);
  const [id, setId] = useState<number | null>(null);
  const [tecnico, setTecnico] = useState("");
  const [lista, setLista] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const c = (k: string, v: string) => setCab({ ...cab, [k]: v });

  useEffect(() => { setPw(sessionStorage.getItem("pw") || ""); }, []);
  const H = { "Content-Type": "application/json", "x-app-password": pw };
  async function call(url: string, body?: any, method = "POST") {
    const r = await fetch(url, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Erro");
    return r;
  }
  async function carregarLista() { try { setLista(await (await call("/api/ar", undefined, "GET")).json()); } catch (e: any) { setMsg(e.message); } }
  useEffect(() => { if (pw) { sessionStorage.setItem("pw", pw); carregarLista(); } }, [pw]);

  async function gerar() {
    setBusy(true); setMsg("Gerando AR com IA...");
    try { setAr(await (await call("/api/generate", { atividade: cab.tarefa, descricao, equipamentos: equip })).json()); setId(null); setMsg("Rascunho gerado. Revise cada campo antes de aprovar."); }
    catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }
  const conteudo = () => ({ ...ar, cab, descricao, equipamentos: equip });
  async function salvar(status: string) {
    if (status === "aprovada" && !tecnico) return setMsg("Informe o técnico responsável para aprovar.");
    try {
      const r = await (await call("/api/ar", { id, atividade: cab.tarefa, setor: cab.setor, status, aprovado_por: tecnico, conteudo: conteudo() })).json();
      setId(r.id); setMsg(status === "aprovada" ? "AR aprovada e salva." : "Rascunho salvo."); carregarLista();
    } catch (e: any) { setMsg(e.message); }
  }
  async function baixar() {
    try {
      const r = await call("/api/docx", { cab, conteudo: ar });
      const a = document.createElement("a"); a.href = URL.createObjectURL(await r.blob()); a.download = `AR - ${cab.tarefa || "atividade"}.docx`; a.click();
    } catch (e: any) { setMsg(e.message); }
  }
  async function abrir(i: number) {
    const r = await (await call(`/api/ar?id=${i}`, undefined, "GET")).json();
    setId(r.id); setTecnico(r.aprovado_por || ""); setCab(r.conteudo.cab); setDescricao(r.conteudo.descricao || ""); setEquip(r.conteudo.equipamentos || []); setAr(r.conteudo);
  }
  const upEtapa = (i: number, k: string, v: string) => setAr({ ...ar, etapas: ar.etapas.map((e: any, j: number) => (j === i ? { ...e, [k]: v } : e)) });
  const move = (i: number, d: number) => { const a = [...ar.etapas]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; setAr({ ...ar, etapas: a }); };
  const upList = (k: string, v: string) => setAr({ ...ar, [k]: v.split("\n").filter(Boolean) });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <h1>AR Inteligente – SSMA</h1>
      <div style={box}><label>Senha de acesso</label><input style={inp} type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>

      <div style={box}>
        <h3>1. Dados da AR (cabeçalho do modelo)</h3>
        <input style={inp} placeholder="TAREFA" value={cab.tarefa} onChange={(e) => c("tarefa", e.target.value)} />
        <div style={grid}>
          <input style={inp} placeholder="GERÊNCIA" value={cab.gerencia} onChange={(e) => c("gerencia", e.target.value)} />
          <input style={inp} placeholder="SETOR" value={cab.setor} onChange={(e) => c("setor", e.target.value)} />
          <input style={inp} placeholder="LOCAL/EQUIPAMENTO" value={cab.local} onChange={(e) => c("local", e.target.value)} />
          <input style={inp} type="date" value={cab.dataInicio} onChange={(e) => c("dataInicio", e.target.value)} />
          <input style={inp} placeholder="Hora inicial (ex.: 07H)" value={cab.horaInicial} onChange={(e) => c("horaInicial", e.target.value)} />
          <select style={inp} value={cab.turno} onChange={(e) => c("turno", e.target.value)}><option value="A">Turno A</option><option value="B">Turno B</option><option value="C">Turno C</option></select>
        </div>
        <textarea style={{ ...inp, marginTop: 8 }} rows={4} placeholder="Descreva os serviços. Ex.: Dois funcionários vão subir em uma escada para soldar uma tubulação" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <p>Equipamentos e ferramentas:</p>
        {EQUIP.map((e) => (<label key={e} style={{ marginRight: 14, display: "inline-block" }}><input type="checkbox" checked={equip.includes(e)} onChange={() => setEquip(equip.includes(e) ? equip.filter((x) => x !== e) : [...equip, e])} /> {e}</label>))}
        <div style={{ marginTop: 12 }}><button style={btn} disabled={busy || !descricao || !cab.tarefa} onClick={gerar}>Gerar AR com IA</button> <span>{msg}</span></div>
      </div>

      {ar && (
        <div style={box}>
          <h3>2. Revise e edite (as 3 primeiras linhas fixas do modelo já vêm no Word)</h3>
          {(ar.etapas || []).map((e: any, i: number) => (
            <div key={i} style={{ border: "1px solid #e1e5ea", borderRadius: 6, padding: 10, marginBottom: 10 }}>
              <strong>Linha {i + 1}</strong>
              {[["atividade", "ATIVIDADES"], ["riscos", "RISCOS POTENCIAIS"], ["medidas", "MEDIDAS PREVENTIVAS/RECOMENDAÇÕES"]].map(([k, t]) => (
                <div key={k}><small>{t}</small><textarea style={inp} rows={k === "medidas" ? 4 : 2} value={e[k]} onChange={(ev) => upEtapa(i, k, ev.target.value)} /></div>
              ))}
              <div style={{ marginTop: 6 }}>
                <button style={{ ...btn, background: "#456" }} onClick={() => move(i, -1)}>↑</button>
                <button style={{ ...btn, background: "#456" }} onClick={() => move(i, 1)}>↓</button>
                <button style={{ ...btn, background: "#a33" }} onClick={() => setAr({ ...ar, etapas: ar.etapas.filter((_: any, j: number) => j !== i) })}>Remover</button>
              </div>
            </div>
          ))}
          <button style={{ ...btn, background: "#456" }} onClick={() => setAr({ ...ar, etapas: [...ar.etapas, { atividade: "", riscos: "", medidas: "" }] })}>+ Linha</button>
          <div style={{ marginTop: 12 }}><strong>RECOMENDAÇÕES GERAIS</strong> (uma por linha)<textarea style={inp} rows={5} value={(ar.recomendacoes || []).join("\n")} onChange={(e) => upList("recomendacoes", e.target.value)} /></div>
          <div style={{ marginTop: 12, background: "#fff6e0", border: "1px solid #e8c36a", borderRadius: 6, padding: 10 }}>
            <strong>⚠ Pendências a confirmar em campo</strong> (não vão para o Word; uma por linha)
            <textarea style={inp} rows={4} value={(ar.pendencias || []).join("\n")} onChange={(e) => upList("pendencias", e.target.value)} />
          </div>
          <h3>3. Aprovação técnica</h3>
          <input style={inp} placeholder="Nome do Técnico de Segurança responsável" value={tecnico} onChange={(e) => setTecnico(e.target.value)} />
          <div style={{ marginTop: 12 }}>
            <button style={{ ...btn, background: "#456" }} onClick={() => salvar("rascunho")}>Salvar rascunho</button>
            <button style={btn} onClick={() => salvar("aprovada")}>Aprovar e salvar</button>
            <button style={{ ...btn, background: "#1a4f9c" }} onClick={baixar}>Baixar Word (modelo oficial)</button>
          </div>
        </div>
      )}

      <div style={box}>
        <h3>Histórico de ARs</h3>
        {lista.length === 0 && <small>Nenhuma AR salva ainda.</small>}
        {lista.map((l) => (<div key={l.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>#{l.id} — {l.atividade} <small>({l.status}{l.aprovado_por ? ", " + l.aprovado_por : ""})</small> <button style={{ ...btn, padding: "3px 10px", background: "#456" }} onClick={() => abrir(l.id)}>Abrir</button></div>))}
      </div>
    </div>
  );
}
