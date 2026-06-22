import React, { useState, useEffect, useCallback, useRef } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { ref, onValue, set, serverTimestamp } from "firebase/database";
import { auth, provider, db } from "./lib/firebase";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { LogOut, Cloud, CloudOff, Download, TrendingUp, Users, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";

// ─── helpers ────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

const pct = (v, t) => (t > 0 ? Math.min(100, (v / t) * 100) : 0);

function scoreColor(s) {
  if (s >= 75) return { text: "#059669", bg: "#d1fae5", bar: "#10b981" };
  if (s >= 50) return { text: "#d97706", bg: "#fef3c7", bar: "#f59e0b" };
  return { text: "#dc2626", bg: "#fee2e2", bar: "#ef4444" };
}

function calcScore(d) {
  const fatPct = pct(d.faturamentoAtual, d.metaFaturamento);
  const npsScore = d.nps >= 70 ? 100 : d.nps >= 50 ? 80 : d.nps >= 30 ? 55 : 25;
  const churnScore = d.churn <= 2 ? 100 : d.churn <= 5 ? 75 : d.churn <= 8 ? 50 : 20;
  return +(fatPct * 0.5 + npsScore * 0.25 + churnScore * 0.25).toFixed(1);
}

function buildChartData(atual, meta) {
  const mes = new Date().getMonth();
  const porMes = mes > 0 ? atual / (mes + 1) : atual;
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return meses.map((m, i) => ({
    mes: m,
    realizado: i <= mes ? Math.round(porMes * (i + 1)) : null,
    meta: Math.round((meta / 12) * (i + 1)),
  }));
}

const DEFAULT = {
  metaFaturamento: 500000,
  faturamentoAtual: 320000,
  ticketMedio: 2500,
  clientesAtivos: 128,
  churn: 3.2,
  nps: 62,
};

// ─── components ─────────────────────────────────────────────
function MetricCard({ label, value, sub, highlight }) {
  return (
    <div style={{ background: highlight ? "#f0fdf4" : "#f8fafc", borderRadius: 12, padding: "14px 16px", border: `1px solid ${highlight ? "#bbf7d0" : "#e2e8f0"}` }}>
      <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color: highlight ? "#059669" : "#0f172a", margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

function KPIRow({ label, value, status }) {
  const cfg = {
    ok: { bg: "#d1fae5", color: "#065f46", icon: <CheckCircle size={13} />, label: "No alvo" },
    warn: { bg: "#fef3c7", color: "#92400e", icon: <AlertTriangle size={13} />, label: "Atenção" },
    danger: { bg: "#fee2e2", color: "#991b1b", icon: <AlertTriangle size={13} />, label: "Crítico" },
  }[status];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ flex: 1, fontSize: 14, color: "#334155" }}>{label}</span>
      <span style={{ fontSize: 13, color: "#94a3b8", marginRight: 8 }}>{value}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: cfg.bg, color: cfg.color }}>
        {cfg.icon} {cfg.label}
      </span>
    </div>
  );
}

function FieldInput({ label, id, value, step, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{label}</label>
      <input
        id={id} type="number" value={value} step={step || 1}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 14, color: "#0f172a", background: "#f8fafc", outline: "none" }}
        onFocus={e => (e.target.style.borderColor = "#6366f1")}
        onBlur={e => (e.target.style.borderColor = "#e2e8f0")}
      />
    </div>
  );
}

// ─── main ────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastEdit, setLastEdit] = useState(null);
  const [room, setRoom] = useState("minha-empresa");
  const [data, setData] = useState(DEFAULT);
  const debounce = useRef(null);
  const isMine = useRef(false);

  // auth listener
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
  }, []);

  // realtime listener
  useEffect(() => {
    if (!user || !room) return;
    const dbRef = ref(db, `espacos/${room}/dados`);
    return onValue(dbRef, (snap) => {
      const val = snap.val();
      if (val && !isMine.current) {
        setData(val);
        setLastEdit(val._editadoPor ? `Atualizado por ${val._editadoPor}` : null);
      }
      isMine.current = false;
      setSyncing(false);
    });
  }, [user, room]);

  const handleChange = useCallback((field, raw) => {
    const value = parseFloat(raw) || 0;
    setData((prev) => {
      const next = { ...prev, [field]: value };
      if (user) {
        isMine.current = true;
        setSyncing(true);
        clearTimeout(debounce.current);
        debounce.current = setTimeout(() => {
          set(ref(db, `espacos/${room}/dados`), {
            ...next,
            _editadoPor: user.displayName?.split(" ")[0] || "Sócio",
            _ts: serverTimestamp(),
          });
        }, 800);
      }
      return next;
    });
  }, [user, room]);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

  const score = calcScore(data);
  const sc = scoreColor(score);
  const fatPct = pct(data.faturamentoAtual, data.metaFaturamento);
  const proj = data.ticketMedio * data.clientesAtivos;

  const kpis = [
    { label: "Atingimento de faturamento", value: fatPct.toFixed(1) + "%", status: fatPct >= 80 ? "ok" : fatPct >= 60 ? "warn" : "danger" },
    { label: "Churn rate", value: data.churn.toFixed(1) + "%", status: data.churn <= 2 ? "ok" : data.churn <= 5 ? "warn" : "danger" },
    { label: "NPS", value: Math.round(data.nps), status: data.nps >= 50 ? "ok" : data.nps >= 30 ? "warn" : "danger" },
    { label: "Receita projetada vs meta", value: (proj / data.metaFaturamento * 100).toFixed(0) + "%", status: proj >= data.metaFaturamento ? "ok" : proj >= data.metaFaturamento * 0.7 ? "warn" : "danger" },
  ];

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <RefreshCw size={24} style={{ color: "#6366f1", animation: "spin 1s linear infinite" }} />
    </div>
  );

  if (!user) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f0f4ff 0%,#faf5ff 100%)" }}>
      <div style={{ textAlign: "center", padding: 40, background: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.08)", maxWidth: 380 }}>
        <div style={{ width: 56, height: 56, background: "#6366f1", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <TrendingUp size={28} color="#fff" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Painel de KPIs</h1>
        <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>Colaboração em tempo real com seus sócios.</p>
        <button onClick={login} style={{ width: "100%", padding: "12px 0", background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <img src="https://www.google.com/favicon.ico" alt="" width={18} /> Entrar com Google
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {/* header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#6366f1", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>KPI Estratégico</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: syncing ? "#6366f1" : "#10b981" }}>
            {syncing ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Cloud size={13} />}
            {syncing ? "Salvando..." : lastEdit || "Sincronizado"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <img src={user.photoURL} alt={user.displayName} style={{ width: 28, height: 28, borderRadius: "50%" }} />
            <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{user.displayName?.split(" ")[0]}</span>
          </div>
          <button onClick={logout} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 8, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748b" }}>
            <LogOut size={13} /> Sair
          </button>
        </div>
      </header>

      {/* espaço */}
      <div style={{ background: "#6366f1", padding: "10px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <Users size={14} color="#c7d2fe" />
        <span style={{ fontSize: 12, color: "#c7d2fe", fontWeight: 500 }}>Espaço compartilhado:</span>
        <input value={room} onChange={e => setRoom(e.target.value.replace(/\s/g, "-").toLowerCase())}
          style={{ fontSize: 13, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "3px 10px", fontFamily: "monospace", width: 200 }} />
        <span style={{ fontSize: 11, color: "#a5b4fc" }}>Compartilhe este código com seus sócios</span>
      </div>

      {/* main */}
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px", display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
        {/* sidebar */}
        <div>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 18px", marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16 }}>Variáveis do negócio</p>
            <FieldInput label="Meta de faturamento (R$)" id="meta" value={data.metaFaturamento} onChange={v => handleChange("metaFaturamento", v)} />
            <FieldInput label="Faturamento atual (R$)" id="atual" value={data.faturamentoAtual} onChange={v => handleChange("faturamentoAtual", v)} />
            <div style={{ borderTop: "1px solid #f1f5f9", margin: "16px 0" }} />
            <FieldInput label="Ticket médio (R$)" id="ticket" value={data.ticketMedio} onChange={v => handleChange("ticketMedio", v)} />
            <FieldInput label="Clientes ativos" id="clientes" value={data.clientesAtivos} onChange={v => handleChange("clientesAtivos", v)} />
            <FieldInput label="Churn rate (%)" id="churn" value={data.churn} step="0.1" onChange={v => handleChange("churn", v)} />
            <FieldInput label="NPS" id="nps" value={data.nps} onChange={v => handleChange("nps", v)} />
          </div>
        </div>

        {/* content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* score */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "24px", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Score de eficiência estratégica</p>
            <div style={{ fontSize: 64, fontWeight: 800, color: sc.text, lineHeight: 1 }}>{score}%</div>
            <div style={{ maxWidth: 320, margin: "14px auto 8px", background: "#f1f5f9", borderRadius: 999, height: 8, overflow: "hidden" }}>
              <div style={{ width: score + "%", height: "100%", background: sc.bar, borderRadius: 999, transition: "width 0.5s ease" }} />
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8" }}>Ponderado: faturamento 50% · NPS 25% · churn 25%</p>
          </div>

          {/* metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
            <MetricCard label="Faturamento" value={fmt(data.faturamentoAtual)} sub={fatPct.toFixed(1) + "% da meta"} />
            <MetricCard label="Receita projetada" value={fmt(proj)} sub="ticket × clientes" highlight={proj >= data.metaFaturamento} />
            <MetricCard label="Clientes ativos" value={data.clientesAtivos} sub={"Churn: " + data.churn.toFixed(1) + "%"} />
            <MetricCard label="NPS" value={Math.round(data.nps)} sub={data.nps >= 70 ? "Excelente 🎯" : data.nps >= 50 ? "Bom" : data.nps >= 30 ? "Médio" : "Crítico"} />
          </div>

          {/* kpi list */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 18px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Diagnóstico de KPIs</p>
            {kpis.map((k) => <KPIRow key={k.label} {...k} />)}
          </div>

          {/* chart */}
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: "20px 18px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Evolução de faturamento</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={buildChartData(data.faturamentoAtual, data.metaFaturamento)} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => "R$" + (v / 1000).toFixed(0) + "k"} />
                <Tooltip formatter={(v) => fmt(v)} labelStyle={{ fontWeight: 600 }} />
                <Line type="monotone" dataKey="realizado" name="Realizado" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
                <Line type="monotone" dataKey="meta" name="Meta" stroke="#e2e8f0" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
