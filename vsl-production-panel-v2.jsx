import React, { useState, useEffect, useMemo } from "react";
import {
  Plus, X, Link2, FileText, Video, Pencil, Trash2, ChevronDown, ChevronRight,
  Layers, Radio, Clock, CircleDot, CheckCircle2, ArrowRightLeft, Search,
  Film, ArrowUpCircle, ArrowDownCircle, Zap, Copy, Check, History, FlaskConical,
  ExternalLink, LayoutDashboard, Bell, Menu, TrendingUp, Sparkles, Activity,
  ChevronLeft, BadgeCheck
} from "lucide-react";

/* ---------- Design tokens (Marko template, purple -> red) ---------- */
const C = {
  bg: "#050505",
  bg2: "#0E0E0E",
  card: "#101010",
  cardBorder: "rgba(255,255,255,0.07)",
  primary: "#EDEDED",
  text: "#9A9A9A",
  dim: "#5C5C5C",
  accent: "#E5383B",
  accentSoft: "rgba(229,56,59,0.12)",
  accentBorder: "rgba(229,56,59,0.4)",
  glow: "rgba(229,56,59,0.44)",
  gold: "#EFBC2A",
  ok: "#3DDC84",
  aprovado: "#6EA8FE",
};

const FONT = "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif";

const STATUS = {
  a_editar: { label: "A editar", color: "#E5383B", Icon: Clock },
  em_edicao: { label: "Em edição", color: C.gold, Icon: CircleDot },
  editado: { label: "Editado", color: C.ok, Icon: CheckCircle2 },
  aprovado: { label: "Aprovado", color: C.aprovado, Icon: BadgeCheck },
};
const STATUS_ORDER = ["a_editar", "em_edicao", "editado", "aprovado"];
// status desconhecido (base antiga/nova aberta num bundle velho) nao pode quebrar a tela
const statusInfo = (s) => STATUS[s] || STATUS.a_editar;
// material pronto pra entrar num slot do Funil Atual: editado ou ja aprovado
const isPronto = (s) => s === "editado" || s === "aprovado";
// "aprovado 02/09 por GAB" — data e responsavel sao opcionais
const aprovacaoLabel = (item) =>
  "aprovado"
  + (item.aprovadoEm ? ` ${new Date(item.aprovadoEm + "T00:00:00").toLocaleDateString("pt-BR")}` : "")
  + (item.aprovadoPor ? ` por ${item.aprovadoPor}` : "");

const TYPE_LABEL = { vsl: "Corpo VSL", lead: "Lead", upsell: "Upsell", downsell: "Downsell", obrigado: "Obrigado" };
const TYPE_ICON = { vsl: Film, lead: Zap, upsell: ArrowUpCircle, downsell: ArrowDownCircle, obrigado: Sparkles };

// tipos que sao "oferta": cadastrados por produto, com expert/funil opcionais
const isOfertaType = (t) => t === "upsell" || t === "downsell" || t === "obrigado";
// so upsell/downsell existem em posicao 1 e 2, com o 2 podendo seguir o 1
const temPosicaoType = (t) => t === "upsell" || t === "downsell";

const uid = () => Math.random().toString(36).slice(2, 10);

/* ---------- Nomenclatura oficial (briefing §3) ---------- */
const abbr3 = (s) => (s || "").trim().toUpperCase();
const slug = (s) => (s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function funilName(experts, funilId) {
  for (const ex of experts) {
    const f = (ex.funis || []).find((fu) => fu.id === funilId);
    if (f) return f.name;
  }
  return "";
}

function officialName(item, items, experts) {
  const pair = (ed, cp) => [abbr3(ed), abbr3(cp)].filter(Boolean).join("-") || "?";
  if (item.type === "obrigado") {
    // pagina de obrigado nao tem posicao 1/2, entao o nome vai direto para o produto
    return `OBRIGADO_${slug(item.produto) || "PRODUTO"}_V${item.versao || "?"}_${pair(item.editor, item.copy)}`;
  }
  if (item.type === "upsell" || item.type === "downsell") {
    // inclui a posição (1 ou 2) para saber qual upsell/downsell é: UPSELL1_..., DOWNSELL2_...
    return `${item.type.toUpperCase()}${item.posicao || "1"}_${slug(item.produto) || "PRODUTO"}_V${item.versao || "?"}_${pair(item.editor, item.copy)}`;
  }
  const funil = slug(funilName(experts, item.funilId)) || "FUNIL";
  if (item.type === "vsl") {
    return `VSL_${funil}_V${item.versao || "?"}_${pair(item.editor, item.copy)}`;
  }
  // Lead: LEAD_[nº]_[FUNIL]_V[versão]_[EDITOR LEAD]-[COPY LEAD]
  // a versão entra porque a mesma lead às vezes é regravada noutro ambiente,
  // e é a versão que separa uma regravação da outra
  return `LEAD_${item.leadNum || "?"}_${funil}_V${item.versao || "?"}_${pair(item.editor, item.copy)}`;
}

/* Rótulo curto de um item para histórico/testes */
function itemLabel(item, experts) {
  if (!item) return "—";
  if (item.type === "lead") return `Lead #${item.leadNum || "?"} V${item.versao || "?"}`;
  if (item.type === "vsl") return `Corpo V${item.versao || "?"} (${funilName(experts, item.funilId) || "?"})`;
  return `${item.produto || "sem produto"} V${item.versao || "?"}`;
}

const seedExperts = () => ([
  { id: "ronald", name: "Ronald", funis: [{ id: "ronald-hftc", name: "HFTC" }, { id: "ronald-marketing", name: "Marketing" }] },
  { id: "gabriele", name: "Gabriele Nunes", funis: [{ id: "gabriele-aiva", name: "Aiva" }] },
  { id: "thay", name: "Thay Camilla", funis: [{ id: "thay-sofia", name: "Sofia" }] },
  { id: "jhon", name: "Jhon", funis: [{ id: "jhon-atmoz", name: "Atmoz" }] },
  { id: "leandro", name: "Leandro", funis: [{ id: "leandro-conecta", name: "Conecta Cripto" }] },
]);

const seedItems = () => ([
  { id: uid(), type: "vsl", expertId: "ronald", funilId: "ronald-hftc", versao: "2", editor: "THI", copy: "LUC", status: "editado", linkBruto: "", linkCopy: "", linkEditado: "", dataInicio: "", dataEntrega: "" },
  { id: uid(), type: "lead", expertId: "ronald", funilId: "ronald-hftc", versao: "2", leadNum: "01", reaproveitada: false, origemVersao: "", editor: "SEL", copy: "LEA", status: "editado", linkBruto: "", linkCopy: "", linkEditado: "", dataInicio: "", dataEntrega: "" },
]);

/* ---------- Storage compartilhado ----------
   Ordem de preferência:
   1. Supabase (se window.SUPABASE_URL/KEY estiverem definidos) — banco externo,
      dados persistem mesmo entre deploys e são compartilhados por todos
   2. API do servidor (/api/kv) — servidor Node com data.json
   3. window.storage — quando rodando como artifact do claude.ai
   4. localStorage — fallback local (só neste navegador)                  */

// ---- Supabase (via REST/PostgREST, sem dependência) ----
const SB_URL = (typeof window !== "undefined" && window.SUPABASE_URL) || "";
const SB_KEY = (typeof window !== "undefined" && (window.SUPABASE_KEY || window.SUPABASE_ANON_KEY || window.SUPABASE_PUBLISHABLE_KEY)) || "";
const useSupabase = !!(SB_URL && SB_KEY);
const sbHeaders = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

async function sbGet(key) {
  const r = await fetch(`${SB_URL}/rest/v1/kv?key=eq.${encodeURIComponent(key)}&select=value`, { headers: sbHeaders });
  if (!r.ok) throw new Error("supabase get " + r.status);
  const rows = await r.json();
  return rows.length ? { value: rows[0].value } : null;
}
async function sbSet(key, value) {
  const r = await fetch(`${SB_URL}/rest/v1/kv`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error("supabase set " + r.status);
}

// ---- servidor Node (/api/kv) ----
const API_BASE = "/api/kv/";
let remoteOk = null;
async function isRemote() {
  if (useSupabase) return false; // Supabase tem prioridade
  if (remoteOk !== null) return remoteOk;
  try {
    remoteOk = (await fetch("/api/health")).ok;
  } catch (e) {
    remoteOk = false;
  }
  return remoteOk;
}

const storageBackend = {
  async get(key) {
    if (useSupabase) return sbGet(key);
    if (await isRemote()) {
      const r = await fetch(API_BASE + encodeURIComponent(key));
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("falha ao ler do servidor");
      return r.json();
    }
    if (typeof window !== "undefined" && window.storage?.get) return window.storage.get(key);
    const v = localStorage.getItem(key);
    return v == null ? null : { value: v };
  },
  async set(key, value) {
    if (useSupabase) return sbSet(key, value);
    if (await isRemote()) {
      await fetch(API_BASE + encodeURIComponent(key), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      });
      return;
    }
    if (typeof window !== "undefined" && window.storage?.set) return window.storage.set(key, value);
    localStorage.setItem(key, value);
  },
};

const POLL_MS = 15000;

function useStorage(key, seedFn) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState(null);
  const lastWriteRef = React.useRef(0);
  const skipNextWriteRef = React.useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await storageBackend.get(key);
        setData(res && res.value ? JSON.parse(res.value) : seedFn());
      } catch (e) {
        setData(seedFn());
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (!ready || data === null) return;
    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }
    lastWriteRef.current = Date.now();
    Promise.resolve(storageBackend.set(key, JSON.stringify(data))).catch(() => {});
  }, [data, ready]);

  // Sincronização: puxa alterações de outras pessoas periodicamente
  useEffect(() => {
    if (!ready) return;
    let stopped = false;
    const t = setInterval(async () => {
      try {
        if (!useSupabase && !(await isRemote())) return;
        // evita sobrescrever uma edição local recém-feita com dado antigo em trânsito
        if (Date.now() - lastWriteRef.current < POLL_MS + 5000) return;
        const res = await storageBackend.get(key);
        if (stopped || !res || !res.value) return;
        setData((cur) => {
          if (JSON.stringify(cur) === res.value) return cur;
          skipNextWriteRef.current = true;
          return JSON.parse(res.value);
        });
      } catch (e) { /* offline momentâneo — tenta de novo no próximo ciclo */ }
    }, POLL_MS);
    return () => { stopped = true; clearInterval(t); };
    // eslint-disable-next-line
  }, [ready]);

  return [data, setData, ready];
}

/* ---------- Small UI atoms ---------- */
function Pill({ active, children, onClick, Icon }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-4 py-2 rounded-full transition-all hover:brightness-125"
      style={
        active
          ? { background: C.accentSoft, color: C.accent, border: `1px solid ${C.accentBorder}`, boxShadow: `0 0 16px -4px ${C.glow}` }
          : { background: "rgba(255,255,255,0.03)", color: C.text, border: "1px solid rgba(255,255,255,0.07)" }
      }
    >
      {Icon && <Icon size={13} />}
      {children}
    </button>
  );
}

function StatusBadge({ status }) {
  const s = statusInfo(status);
  const Icon = s.Icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}40` }}>
      <Icon size={10} /> {s.label}
    </span>
  );
}

function IconLink({ href, Icon, label }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      className="p-1.5 rounded-lg transition-colors hover:bg-white/10 shrink-0"
      style={{ color: C.text }}
    >
      <Icon size={13} color={C.accent} />
    </a>
  );
}

function CopyName({ name, big }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(name).then(() => { setOk(true); setTimeout(() => setOk(false), 1200); }).catch(() => {});
        }
      }}
      title={`Copiar: ${name}`}
      className={`inline-flex items-center gap-1.5 rounded-full shrink-0 ${big ? "text-[11.5px] px-3 py-1.5" : "text-[10px] px-1.5 py-0.5 max-w-[280px]"}`}
      style={{ color: ok ? C.ok : "#7B7B7B", background: "rgba(255,255,255,0.04)", border: `1px solid ${ok ? C.ok + "50" : "rgba(255,255,255,0.09)"}` }}
    >
      {ok ? <Check size={big ? 12 : 9} /> : <Copy size={big ? 12 : 9} />}
      <span className="truncate" style={{ fontFamily: "ui-monospace, monospace" }}>{name}</span>
    </button>
  );
}

const inputStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  padding: "8px 12px",
  color: C.primary,
  fontSize: "13px",
  outline: "none",
  fontFamily: FONT,
};

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className="block text-[10.5px] font-bold uppercase tracking-wide mb-1" style={{ color: "#5C5C5C" }}>{label}</span>
      {children}
    </label>
  );
}

function Section({ label, children }) {
  return (
    <div className="mb-5 pl-3" style={{ borderLeft: `2px solid ${C.accentBorder}` }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: C.accent }}>{label}</p>
      {children}
    </div>
  );
}

function LinkField({ label, Icon, value, onChange }) {
  return (
    <label className="block mb-2.5">
      <div className="flex items-center gap-2 rounded-xl px-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <Icon size={14} color="#6B6B6B" />
        <div className="flex-1">
          <span className="block text-[9.5px] font-bold uppercase tracking-wide pt-1.5" style={{ color: "#5C5C5C" }}>{label}</span>
          <input
            value={value}
            onChange={onChange}
            placeholder="https://..."
            className="w-full bg-transparent outline-none pb-1.5 text-[13px]"
            style={{ color: C.primary, fontFamily: FONT }}
          />
        </div>
      </div>
    </label>
  );
}

/* ---------- Expert / Funil modal ---------- */
function ExpertModal({ initial, items, onSave, onDelete, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [funis, setFunis] = useState(initial?.funis || []);
  const [newFunil, setNewFunil] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const usedFunilIds = new Set(items.map((i) => i.funilId));

  // itens que pertencem a este expert (bloqueiam a remoção)
  const expertItemCount = initial?.id ? items.filter((i) => i.expertId === initial.id).length : 0;

  const baseId = initial?.id || slug(name).toLowerCase() || uid();
  const addFunil = () => {
    const n = newFunil.trim();
    if (!n) return;
    setFunis((f) => [...f, { id: `${baseId}-${slug(n).toLowerCase() || uid()}-${uid().slice(0, 4)}`, name: n }]);
    setNewFunil("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(2,2,2,0.75)", backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="w-full max-w-md rounded-2xl max-h-[90vh] overflow-y-auto" style={{ background: C.bg2, border: `1px solid ${C.cardBorder}` }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.accentSoft }}>
              <Radio size={15} color={C.accent} />
            </div>
            <h3 className="text-[15px] font-bold" style={{ color: C.primary }}>{initial?.id ? "Editar expert" : "Novo expert"}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10"><X size={16} color={C.text} /></button>
        </div>

        <div className="px-5 pb-5 pt-4">
          <Section label="Expert">
            <Field label="Nome">
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Ronald" />
            </Field>
          </Section>

          <Section label="Funis">
            {funis.length === 0 && <p className="text-[11.5px] mb-2" style={{ color: "#5C5C5C" }}>nenhum funil ainda — adicione abaixo</p>}
            {funis.length > 0 && <p className="text-[10px] mb-1.5" style={{ color: "#5C5C5C" }}>Edite o nome direto no campo. O funil "em uso" pode ser renomeado, mas não removido.</p>}
            <div className="flex flex-col gap-1.5 mb-3">
              {funis.map((f) => (
                <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <input
                    value={f.name}
                    onChange={(e) => setFunis((prev) => prev.map((x) => (x.id === f.id ? { ...x, name: e.target.value } : x)))}
                    className="flex-1 bg-transparent outline-none text-[12.5px]"
                    style={{ color: C.primary, fontFamily: FONT }}
                  />
                  {usedFunilIds.has(f.id) ? (
                    <span className="text-[10px] shrink-0" style={{ color: "#5C5C5C" }}>em uso</span>
                  ) : (
                    <button onClick={() => setFunis((prev) => prev.filter((x) => x.id !== f.id))} title="Remover funil" className="p-1 rounded-md hover:bg-white/10 shrink-0">
                      <Trash2 size={12} color={C.text} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                style={{ ...inputStyle, marginBottom: 0 }}
                value={newFunil}
                onChange={(e) => setNewFunil(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFunil()}
                placeholder="nome do novo funil, ex: HFTC"
              />
              <button onClick={addFunil} className="flex items-center gap-1 text-[12px] font-bold px-3.5 py-2 rounded-full shrink-0" style={{ background: C.accentSoft, color: C.accent, border: `1px solid ${C.accentBorder}` }}>
                <Plus size={12} /> Funil
              </button>
            </div>
          </Section>

          <button
            onClick={() => name.trim() && onSave({ id: baseId, name: name.trim(), funis })}
            className="w-full mt-1 py-2.5 rounded-full font-bold text-[13px] transition-all"
            style={{ background: C.accent, color: "#0A0A0A", boxShadow: `0 8px 24px -8px ${C.glow}`, opacity: name.trim() ? 1 : 0.4 }}
          >
            Salvar
          </button>

          {initial?.id && onDelete && (
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.cardBorder}` }}>
              {expertItemCount > 0 ? (
                <p className="text-[11px] text-center" style={{ color: C.dim }}>
                  Para remover este expert, apague antes os {expertItemCount} {expertItemCount === 1 ? "material" : "materiais"} dele na Produção.
                </p>
              ) : !confirmDel ? (
                <button
                  onClick={() => setConfirmDel(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-full text-[12.5px] font-semibold transition-colors hover:bg-white/5"
                  style={{ color: C.accent, border: `1px solid ${C.accentBorder}` }}
                >
                  <Trash2 size={13} /> Remover expert
                </button>
              ) : (
                <div>
                  <p className="text-[12px] text-center mb-2" style={{ color: C.text }}>
                    Remover <b style={{ color: C.primary }}>{initial.name}</b> e seus funis? Isso não pode ser desfeito.
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setConfirmDel(false)} className="flex-1 py-2 rounded-full text-[12.5px] font-semibold" style={{ background: "rgba(255,255,255,0.05)", color: C.text }}>
                      Cancelar
                    </button>
                    <button onClick={() => onDelete(initial.id)} className="flex-1 py-2 rounded-full text-[12.5px] font-bold" style={{ background: C.accent, color: "#0A0A0A" }}>
                      Remover
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Item modal ---------- */
function ItemModal({ initial, experts, items, onSave, onClose }) {
  const [form, setForm] = useState({ posicao: "1", associar: true, associadoId: "", ...initial });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const expert = experts.find((e) => e.id === form.expertId);
  const isVslLike = form.type === "vsl" || form.type === "lead";
  // usaProduto: cadastra por produto, com expert/funil opcionais (upsell, downsell, obrigado)
  const usaProduto = isOfertaType(form.type);
  // temPosicao: so upsell/downsell existem em posicao 1 e 2, com o 2 podendo seguir o 1
  const temPosicao = temPosicaoType(form.type);
  const TypeIcon = TYPE_ICON[form.type] || Layers;

  // só Upsell/Downsell 1 do MESMO funil/expert (não puxa de outro funil)
  const candidatosAssociacao = items.filter((it) =>
    it.type === form.type && it.posicao === "1" && it.id !== form.id &&
    (form.funilId ? it.funilId === form.funilId : true) &&
    (form.expertId ? it.expertId === form.expertId : true)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(2,2,2,0.75)", backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto" style={{ background: C.bg2, border: `1px solid ${C.cardBorder}` }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 sticky top-0 z-10" style={{ background: C.bg2, borderBottom: `1px solid ${C.cardBorder}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.accentSoft }}>
              <TypeIcon size={15} color={C.accent} />
            </div>
            <h3 className="text-[15px] font-bold" style={{ color: C.primary }}>{initial.id ? "Editar item" : "Novo item"}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10"><X size={16} color={C.text} /></button>
        </div>

        <div className="px-5 pb-5 pt-4">
          <Section label="Tipo">
            <div className="flex items-center gap-1.5 flex-wrap">
              {["vsl", "lead", "upsell", "downsell", "obrigado"].map((t) => {
                const Icon = TYPE_ICON[t];
                const active = form.type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full"
                    style={active ? { background: C.accentSoft, color: C.accent, border: `1px solid ${C.accentBorder}` } : { background: "rgba(255,255,255,0.03)", color: C.text, border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <Icon size={12} /> {TYPE_LABEL[t]}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="Onde">
            {isVslLike ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Expert">
                  <select style={inputStyle} value={form.expertId} onChange={(e) => setForm((f) => ({ ...f, expertId: e.target.value, funilId: "" }))}>
                    <option value="">selecione</option>
                    {experts.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                  </select>
                </Field>
                <Field label="Funil">
                  <select style={inputStyle} value={form.funilId} onChange={set("funilId")}>
                    <option value="">selecione</option>
                    {(expert?.funis || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </Field>
              </div>
            ) : (
              <>
                <Field label="Produto">
                  <input style={inputStyle} value={form.produto || ""} onChange={set("produto")} placeholder="ex: Carteira Black" />
                </Field>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="Expert do funil (opcional)">
                    <select style={inputStyle} value={form.expertId || ""} onChange={(e) => setForm((f) => ({ ...f, expertId: e.target.value, funilId: "" }))}>
                      <option value="">— nenhum —</option>
                      {experts.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Funil (opcional)">
                    <select style={inputStyle} value={form.funilId || ""} onChange={set("funilId")} disabled={!form.expertId}>
                      <option value="">— nenhum —</option>
                      {(expert?.funis || []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </Field>
                </div>
                <p className="text-[10px] mt-1" style={{ color: "#5C5C5C" }}>
                  Vincule a um funil para este item aparecer dentro dele. Fica na biblioteca de qualquer forma e pode ser usado em outros funis.
                </p>
              </>
            )}

            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Versão"><input style={inputStyle} value={form.versao} onChange={set("versao")} placeholder="1" /></Field>
              {form.type === "lead" && <Field label="Número da lead"><input style={inputStyle} value={form.leadNum} onChange={set("leadNum")} placeholder="01" /></Field>}
              {form.type === "downsell" && (
                <Field label="Formato">
                  <select style={inputStyle} value={form.tipo || "video"} onChange={set("tipo")}>
                    <option value="video">Vídeo</option>
                    <option value="tsl">TSL (texto)</option>
                  </select>
                </Field>
              )}
            </div>

            {form.type === "lead" && (
              <>
                <div className="flex items-center gap-2 mt-3 mb-1">
                  <input type="checkbox" id="reap" checked={!!form.reaproveitada} onChange={(e) => setForm((f) => ({ ...f, reaproveitada: e.target.checked }))} className="w-4 h-4" />
                  <label htmlFor="reap" className="text-[12.5px]" style={{ color: C.text }}>Reaproveitada de outra versão</label>
                </div>
                {form.reaproveitada && (
                  <Field label="Reaproveitada da versão"><input style={inputStyle} value={form.origemVersao} onChange={set("origemVersao")} placeholder="1" /></Field>
                )}
              </>
            )}

            {temPosicao && (
              <div className="mt-3">
                <span className="block text-[10.5px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#5C5C5C" }}>Posição</span>
                <div className="flex items-center gap-1.5 mb-3">
                  {["1", "2"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm((f) => ({ ...f, posicao: p, associar: p === "2" ? true : f.associar, associadoId: p === "1" ? "" : f.associadoId }))}
                      className="text-[12px] font-semibold px-3.5 py-1.5 rounded-full"
                      style={form.posicao === p ? { background: C.accentSoft, color: C.accent, border: `1px solid ${C.accentBorder}` } : { background: "rgba(255,255,255,0.03)", color: C.text, border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      {TYPE_LABEL[form.type]} {p}
                    </button>
                  ))}
                </div>

                {form.posicao === "2" && (
                  <div className="rounded-xl p-3 mb-3" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] font-semibold" style={{ color: C.text }}>Associar a um {TYPE_LABEL[form.type]} 1?</span>
                      <button
                        onClick={() => setForm((f) => ({ ...f, associar: !f.associar, associadoId: f.associar ? "" : f.associadoId }))}
                        className="w-9 h-5 rounded-full relative transition-colors"
                        style={{ background: form.associar ? C.accent : "rgba(255,255,255,0.15)" }}
                      >
                        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: form.associar ? 18 : 2 }} />
                      </button>
                    </div>
                    {form.associar && (
                      <select style={inputStyle} value={form.associadoId} onChange={set("associadoId")}>
                        <option value="">selecione o {TYPE_LABEL[form.type]} 1</option>
                        {candidatosAssociacao.map((it) => (
                          <option key={it.id} value={it.id}>{it.produto || "sem produto"} · V{it.versao}{it.editor || it.copy ? ` · ${[it.editor, it.copy].filter(Boolean).join("-")}` : ""}</option>
                        ))}
                      </select>
                    )}
                    {!form.associar && (
                      <p className="text-[11px]" style={{ color: "#5C5C5C" }}>Fica como {TYPE_LABEL[form.type].toLowerCase()} avulso, sem vínculo.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {usaProduto && (
              <div className="mt-3">
                <Field label="Contexto da oferta (opcional)">
                  <input style={inputStyle} value={form.contexto || ""} onChange={set("contexto")} placeholder='ex: "agradece a compra da Aiva Pro"' />
                </Field>
              </div>
            )}
          </Section>

          <Section label="Quem">
            <div className="grid grid-cols-2 gap-3">
              {!(form.type === "downsell" && form.tipo === "tsl") && (
                <Field label="Editor"><input style={inputStyle} value={form.editor} onChange={set("editor")} placeholder="THI" /></Field>
              )}
              <Field label="Copy"><input style={inputStyle} value={form.copy} onChange={set("copy")} placeholder="LUC" /></Field>
            </div>
          </Section>

          <Section label="Status & prazo">
            <div className="flex items-center gap-1.5 flex-wrap mb-3">
              {STATUS_ORDER.map((s) => {
                const st = STATUS[s];
                const Icon = st.Icon;
                const active = form.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => setForm((f) => (s === "aprovado"
                      // ao aprovar, ja preenche a data de hoje
                      ? { ...f, status: s, aprovadoEm: f.aprovadoEm || todayISO() }
                      // saiu de aprovado: a aprovacao anterior nao vale mais, limpa o registro
                      : { ...f, status: s, aprovadoEm: "", aprovadoPor: "" }))}
                    className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full"
                    style={active ? { background: `${st.color}1F`, color: st.color, border: `1px solid ${st.color}55` } : { background: "rgba(255,255,255,0.03)", color: C.text, border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <Icon size={12} /> {st.label}
                  </button>
                );
              })}
            </div>
            {form.status === "aprovado" && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Field label="Aprovado em"><input type="date" style={inputStyle} value={form.aprovadoEm || ""} onChange={set("aprovadoEm")} /></Field>
                <Field label="Aprovado por"><input style={inputStyle} value={form.aprovadoPor || ""} onChange={set("aprovadoPor")} placeholder="GAB" /></Field>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data de início"><input type="date" style={inputStyle} value={form.dataInicio} onChange={set("dataInicio")} /></Field>
              <Field label="Data de entrega"><input type="date" style={inputStyle} value={form.dataEntrega} onChange={set("dataEntrega")} /></Field>
            </div>
          </Section>

          <Section label="Links">
            <LinkField label="Material bruto" Icon={Video} value={form.linkBruto} onChange={set("linkBruto")} />
            <LinkField label="Copy / roteiro" Icon={FileText} value={form.linkCopy} onChange={set("linkCopy")} />
            <LinkField label="Material editado" Icon={Link2} value={form.linkEditado} onChange={set("linkEditado")} />
            <LinkField label="Página (URL)" Icon={ExternalLink} value={form.linkPagina} onChange={set("linkPagina")} />
          </Section>

          <Section label="Nomenclatura oficial">
            <div className="flex items-center gap-2 flex-wrap">
              <CopyName big name={officialName(form, items, experts)} />
            </div>
            <p className="text-[10.5px] mt-1.5" style={{ color: "#5C5C5C" }}>
              Gerada automaticamente a partir dos campos — é o mesmo nome usado no Google Drive.
            </p>
          </Section>

          <button
            onClick={() => onSave(form)}
            className="w-full mt-1 py-2.5 rounded-full font-bold text-[13px] transition-all"
            style={{ background: C.accent, color: "#0A0A0A", boxShadow: `0 8px 24px -8px ${C.glow}` }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Item card ---------- */
function Tag({ children, color }) {
  const c = color || C.text;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ color: c, background: `${c}14`, border: `1px solid ${c}30` }}>
      {children}
    </span>
  );
}

function ItemCard({ item, allItems, experts, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const Icon = TYPE_ICON[item.type];
  const isTsl = item.type === "downsell" && item.tipo === "tsl";
  const isOferta = isOfertaType(item.type);
  const hasLinks = item.linkBruto || item.linkCopy || item.linkEditado || item.linkPagina;
  const s = statusInfo(item.status);
  const linked = temPosicaoType(item.type) && item.posicao === "2" && item.associar && item.associadoId
    ? allItems?.find((i) => i.id === item.associadoId)
    : null;

  const title = item.type === "lead"
    ? `Lead #${item.leadNum || "?"}`
    : item.type === "vsl"
    ? `Corpo V${item.versao || "?"}`
    : (item.produto || "sem produto");

  const who = item.editor || item.copy ? [item.editor, item.copy].filter(Boolean).join(" · ") : "sem editor/copy";
  const dates = (item.dataInicio ? new Date(item.dataInicio + "T00:00:00").toLocaleDateString("pt-BR") : "")
    + (item.dataInicio && item.dataEntrega ? " → " : "")
    + (item.dataEntrega ? new Date(item.dataEntrega + "T00:00:00").toLocaleDateString("pt-BR") : "");
  const aprovacao = item.status === "aprovado" ? aprovacaoLabel(item) : "";

  return (
    <div
      className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.025]"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.045)", boxShadow: `inset 2.5px 0 0 ${s.color}` }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" title={TYPE_LABEL[item.type]} style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(255,255,255,0.09)" }}>
        <Icon size={14} color={C.accent} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap leading-tight">
          <span className="text-[13px] font-bold truncate" style={{ color: C.primary }}>{title}</span>
          {item.type === "lead" && item.versao && <Tag>V{item.versao}</Tag>}
          {isOfertaType(item.type) && <Tag>V{item.versao || "?"}</Tag>}
          {temPosicaoType(item.type) && <Tag color={item.posicao === "2" ? C.gold : undefined}>{TYPE_LABEL[item.type]} {item.posicao || "1"}</Tag>}
          {isTsl && <Tag>TSL — só copy</Tag>}
          {item.reaproveitada && <Tag color={C.gold}>reaproveitada da V{item.origemVersao || "?"}</Tag>}
          {linked && (
            <Tag color={C.gold}><ArrowRightLeft size={9} /> segue {linked.produto || "?"} V{linked.versao}</Tag>
          )}
          {temPosicaoType(item.type) && item.posicao === "2" && !item.associar && <Tag>avulso</Tag>}
        </div>
        <p className="text-[11px] truncate mt-0.5" style={{ color: C.dim }}>
          {who}
          {dates && <span> · {dates}</span>}
          {aprovacao && <span style={{ color: C.aprovado }}> · {aprovacao}</span>}
          {isOferta && item.contexto && (
            <span className="italic" title={item.contexto}> · “{item.contexto}”</span>
          )}
        </p>
      </div>

      {hasLinks && (
        <div className="flex items-center gap-0.5 shrink-0">
          <IconLink href={item.linkBruto} Icon={Video} label="Material bruto" />
          <IconLink href={item.linkCopy} Icon={FileText} label="Copy / roteiro" />
          <IconLink href={item.linkEditado} Icon={Link2} label="Material editado" />
          <IconLink href={item.linkPagina} Icon={ExternalLink} label="Página" />
        </div>
      )}

      <span className="hidden md:inline-flex"><CopyName name={officialName(item, allItems || [], experts || [])} /></span>

      <StatusBadge status={item.status} />

      {confirming ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold hidden sm:inline" style={{ color: C.accent }}>Excluir?</span>
          <button onClick={() => { onDelete(item.id); setConfirming(false); }} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: C.accent, color: "#0A0A0A" }}>Sim, excluir</button>
          <button onClick={() => setConfirming(false)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: C.text }}>Cancelar</button>
        </div>
      ) : (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(item)} title="Editar" className="p-1.5 rounded-lg hover:bg-white/10"><Pencil size={12} color={C.text} /></button>
          <button onClick={() => setConfirming(true)} title="Excluir" className="p-1.5 rounded-lg hover:bg-white/10"><Trash2 size={12} color={C.text} /></button>
        </div>
      )}
    </div>
  );
}

/* ---------- Type block (flat, single-type) ---------- */
function TypeBlock({ title, Icon, items, allItems, experts, onEdit, onDelete, emptyText, groupLabel }) {
  return (
    <div className="rounded-2xl overflow-hidden mb-3" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "rgba(255,255,255,0.02)", borderBottom: `1px solid ${C.cardBorder}` }}>
        {Icon && <Icon size={12} color={C.accent} />}
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.accent }}>{title}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: C.dim, background: "rgba(255,255,255,0.05)" }}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-4 text-[11.5px] text-center" style={{ color: "#454545" }}>{emptyText || "nada aqui ainda"}</div>
      ) : (
        items.map((it, idx) => {
          const label = groupLabel ? groupLabel(it) : null;
          const prevLabel = groupLabel && idx > 0 ? groupLabel(items[idx - 1]) : null;
          return (
            <React.Fragment key={it.id}>
              {label && label !== prevLabel && (
                <div className="px-3.5 py-1" style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-[9.5px] font-bold uppercase tracking-widest" style={{ color: "#5C5C5C" }}>{label}</span>
                </div>
              )}
              <ItemCard item={it} allItems={allItems} experts={experts} onEdit={onEdit} onDelete={onDelete} />
            </React.Fragment>
          );
        })
      )}
    </div>
  );
}

/* ---------- Status summary ---------- */
function StatusSummary({ items }) {
  const counts = { a_editar: 0, em_edicao: 0, editado: 0, aprovado: 0 };
  items.forEach((it) => { counts[it.status] = (counts[it.status] || 0) + 1; });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
      {STATUS_ORDER.map((k) => {
        const s = STATUS[k];
        const Icon = s.Icon;
        return (
          <div key={k} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}14`, border: `1px solid ${s.color}30` }}>
              <Icon size={15} color={s.color} />
            </div>
            <div className="min-w-0">
              <p className="text-[19px] font-extrabold leading-none" style={{ color: C.primary }}>{counts[k]}</p>
              <p className="text-[10px] uppercase tracking-widest mt-1 truncate" style={{ color: s.color }}>{s.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Expert overview card (for Geral) ---------- */
function ExpertOverviewCard({ expert, items, onOpen }) {
  const mine = items.filter((i) => i.expertId === expert.id);
  const counts = { a_editar: 0, em_edicao: 0, editado: 0, aprovado: 0 };
  mine.forEach((it) => { counts[it.status] = (counts[it.status] || 0) + 1; });
  const total = mine.length;
  const initials = expert.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <button
      onClick={onOpen}
      className="group text-left rounded-2xl p-4 transition-all hover:scale-[1.012]"
      style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-extrabold shrink-0" style={{ background: C.accentSoft, color: C.accent, border: `1px solid ${C.accentBorder}` }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13.5px] font-bold truncate" style={{ color: C.primary }}>{expert.name}</h4>
          <p className="text-[10.5px] truncate" style={{ color: C.dim }}>{expert.funis.map((f) => f.name).join(" · ") || "sem funis"}</p>
        </div>
        <ChevronRight size={14} color={C.dim} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>

      {total > 0 ? (
        <>
          <div className="flex h-1.5 rounded-full overflow-hidden mb-2.5" style={{ background: "rgba(255,255,255,0.06)" }}>
            {STATUS_ORDER.map((k) => counts[k] > 0 && (
              <span key={k} style={{ width: `${(counts[k] / total) * 100}%`, background: STATUS[k].color }} />
            ))}
          </div>
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
            {STATUS_ORDER.map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: counts[k] ? STATUS[k].color : "#3E3E3E" }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: counts[k] ? STATUS[k].color : "#3E3E3E" }} />
                {counts[k]} {STATUS[k].label.toLowerCase()}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[11px]" style={{ color: "#454545" }}>sem itens ainda — clique para abrir</p>
      )}
    </button>
  );
}

/* ---------- Produção tab ---------- */
function ProducaoTab({ items, experts, globalSearch, onAdd, onEdit, onDelete, onNewExpert, onEditExpert }) {
  const [view, setView] = useState("geral"); // 'geral' | expertId
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [localQ, setLocalQ] = useState("");
  const q = localQ || globalSearch || "";

  const matchesFilters = (it) => {
    if (typeFilter !== "todos" && it.type !== typeFilter) return false;
    if (statusFilter !== "todos" && it.status !== statusFilter) return false;
    if (q) {
      const funil = funilName(experts, it.funilId);
      const expert = experts.find((e) => e.id === it.expertId);
      const leadTxt = it.type === "lead" ? `lead #${it.leadNum || ""} lead${it.leadNum || ""} ${it.leadNum || ""}` : "";
      const corpoTxt = it.type === "vsl" ? "corpo vsl corpo" : "";
      const hay = [
        it.produto, it.editor, it.copy, it.leadNum, it.versao,
        it.versao ? `v${it.versao}` : "", TYPE_LABEL[it.type], funil, expert?.name,
        it.contexto, corpoTxt, leadTxt,
        officialName(it, items, experts),
      ].filter(Boolean).join(" ").toLowerCase();
      // cada palavra buscada precisa aparecer (busca por partes, ex: "corpo v2")
      const termos = q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!termos.every((t) => hay.includes(t))) return false;
    }
    return true;
  };

  const vslLikeAll = items.filter((i) => (i.type === "vsl" || i.type === "lead") && matchesFilters(i));
  const reusableAll = items.filter((i) => isOfertaType(i.type) && matchesFilters(i));

  const selectStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    padding: "8px 10px",
    color: C.primary,
    fontSize: "12.5px",
    outline: "none",
    fontFamily: FONT,
  };

  const currentExpert = experts.find((e) => e.id === view);

  const renderExpertDetail = (ex) => {
    const expertItems = vslLikeAll.filter((i) => i.expertId === ex.id);
    return (
      <div>
        {ex.funis.map((f) => {
          const funilItems = expertItems.filter((i) => i.funilId === f.id);
          const corpoItems = funilItems.filter((i) => i.type === "vsl").sort((a, b) => (b.versao || "").localeCompare(a.versao || ""));
          const leadItems = funilItems.filter((i) => i.type === "lead").sort((a, b) => (b.versao || "").localeCompare(a.versao || "") || (a.leadNum || "").localeCompare(b.leadNum || ""));
          // upsell/downsell/obrigado vinculados a este funil
          const upsellItems = reusableAll.filter((i) => i.type === "upsell" && i.expertId === ex.id && i.funilId === f.id).sort((a, b) => (a.posicao || "1").localeCompare(b.posicao || "1"));
          const downsellItems = reusableAll.filter((i) => i.type === "downsell" && i.expertId === ex.id && i.funilId === f.id).sort((a, b) => (a.posicao || "1").localeCompare(b.posicao || "1"));
          const obrigadoItems = reusableAll.filter((i) => i.type === "obrigado" && i.expertId === ex.id && i.funilId === f.id).sort((a, b) => (a.produto || "").localeCompare(b.produto || ""));
          const total = funilItems.length + upsellItems.length + downsellItems.length + obrigadoItems.length;
          return (
            <div key={f.id} className="rounded-2xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${C.cardBorder}` }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 rounded-full" style={{ background: C.accent }} />
                <p className="text-[14px] font-bold" style={{ color: C.primary }}>Funil {f.name}</p>
                <span className="text-[10.5px]" style={{ color: C.dim }}>{total} {total === 1 ? "item" : "itens"}</span>
              </div>
              <TypeBlock title="Leads" Icon={Zap} items={leadItems} allItems={items} experts={experts} onEdit={onEdit} onDelete={onDelete} emptyText="nenhuma lead cadastrada ainda" groupLabel={(it) => `Leads V${it.versao || "?"}`} />
              <TypeBlock title="Corpo VSL" Icon={Film} items={corpoItems} allItems={items} experts={experts} onEdit={onEdit} onDelete={onDelete} emptyText="nenhum corpo cadastrado ainda" />
              {upsellItems.length > 0 && (
                <TypeBlock title="Upsell" Icon={ArrowUpCircle} items={upsellItems} allItems={items} experts={experts} onEdit={onEdit} onDelete={onDelete} />
              )}
              {downsellItems.length > 0 && (
                <TypeBlock title="Downsell" Icon={ArrowDownCircle} items={downsellItems} allItems={items} experts={experts} onEdit={onEdit} onDelete={onDelete} />
              )}
              {obrigadoItems.length > 0 && (
                <TypeBlock title="Obrigado" Icon={Sparkles} items={obrigadoItems} allItems={items} experts={experts} onEdit={onEdit} onDelete={onDelete} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 flex-wrap mb-4">
        <Pill active={view === "geral"} onClick={() => setView("geral")}>Geral</Pill>
        {experts.map((e) => <Pill key={e.id} active={view === e.id} onClick={() => setView(e.id)}>{e.name}</Pill>)}
        <button
          onClick={onNewExpert}
          className="flex items-center gap-1 text-[12.5px] font-semibold px-3.5 py-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.03)", color: "#6B6B6B", border: "1px dashed rgba(255,255,255,0.15)" }}
          title="Cadastrar novo expert"
        >
          <Plus size={12} /> Expert
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full flex-1 min-w-[160px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Search size={13} color="#5C5C5C" />
          <input value={q} onChange={(e) => setLocalQ(e.target.value)} placeholder="Buscar por produto, editor, copy..." className="bg-transparent outline-none text-[12.5px] flex-1" style={{ color: C.primary, fontFamily: FONT }} />
        </div>
        <select style={selectStyle} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="todos">Todos os tipos</option>
          <option value="vsl">Corpo VSL</option>
          <option value="lead">Lead</option>
          <option value="upsell">Upsell</option>
          <option value="downsell">Downsell</option>
          <option value="obrigado">Obrigado</option>
        </select>
        <select style={selectStyle} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="todos">Todos os status</option>
          {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
        </select>
      </div>

      {view === "geral" ? (
        <>
          <StatusSummary items={[...vslLikeAll, ...reusableAll]} />
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1 h-4 rounded-full" style={{ background: C.accent }} />
            <h4 className="text-[13.5px] font-bold" style={{ color: C.primary }}>Experts</h4>
            <span className="text-[10.5px]" style={{ color: C.dim }}>clique num card para abrir a produção do expert</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
            {experts.map((ex) => (
              <ExpertOverviewCard key={ex.id} expert={ex} items={[...vslLikeAll, ...reusableAll]} onOpen={() => setView(ex.id)} />
            ))}
          </div>
          <div className="flex items-center gap-2 mb-2 mt-2">
            <span className="w-1 h-4 rounded-full" style={{ background: C.gold }} />
            <h4 className="text-[13.5px] font-bold" style={{ color: C.primary }}>Biblioteca de Upsell, Downsell & Obrigado</h4>
            <span className="text-[10.5px]" style={{ color: C.dim }}>compartilhada entre todos os experts</span>
          </div>
          <TypeBlock title="Upsell" Icon={ArrowUpCircle} items={reusableAll.filter((i) => i.type === "upsell")} allItems={items} experts={experts} onEdit={onEdit} onDelete={onDelete} emptyText="nenhum upsell cadastrado ainda" />
          <TypeBlock title="Downsell" Icon={ArrowDownCircle} items={reusableAll.filter((i) => i.type === "downsell")} allItems={items} experts={experts} onEdit={onEdit} onDelete={onDelete} emptyText="nenhum downsell cadastrado ainda" />
          <TypeBlock title="Obrigado" Icon={Sparkles} items={reusableAll.filter((i) => i.type === "obrigado")} allItems={items} experts={experts} onEdit={onEdit} onDelete={onDelete} emptyText="nenhuma página de obrigado cadastrada ainda" />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px]" style={{ color: "#5C5C5C" }}>
              {currentExpert ? `${currentExpert.funis.length} ${currentExpert.funis.length === 1 ? "funil" : "funis"}` : ""}
            </span>
            <button
              onClick={() => currentExpert && onEditExpert(currentExpert)}
              className="flex items-center gap-1.5 text-[11.5px] font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.03)", color: C.text, border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <Pencil size={11} /> Editar expert / funis
            </button>
          </div>
          <StatusSummary items={vslLikeAll.filter((i) => i.expertId === view)} />
          {currentExpert && renderExpertDetail(currentExpert)}
        </>
      )}
    </div>
  );
}

/* ---------- Slot picker ---------- */
// Campo para colar/editar a URL da página direto no card do Funil Atual
function PaginaField({ item, onSetPagina }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(item.linkPagina || "");
  useEffect(() => { setVal(item.linkPagina || ""); }, [item.linkPagina]);
  const salvar = () => { onSetPagina(item.id, val.trim()); setEditing(false); };
  if (editing) {
    return (
      <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") setEditing(false); }}
          placeholder="cole a URL da página"
          className="flex-1 min-w-0 bg-transparent outline-none text-[10.5px]"
          style={{ color: C.primary, borderBottom: `1px solid ${C.accentBorder}` }}
        />
        <button onClick={salvar} className="text-[10px] font-bold shrink-0" style={{ color: C.accent }}>ok</button>
      </div>
    );
  }
  return item.linkPagina ? (
    <div className="flex items-center gap-1 mt-1">
      <ExternalLink size={9} color={C.accent} className="shrink-0" />
      <a href={item.linkPagina} target="_blank" rel="noreferrer" className="truncate text-[10px] hover:underline" style={{ color: C.text }} onClick={(e) => e.stopPropagation()}>{item.linkPagina.replace(/^https?:\/\//, "")}</a>
      <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} title="Editar URL da página" className="shrink-0"><Pencil size={8} color="#6B6B6B" /></button>
    </div>
  ) : (
    <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} className="flex items-center gap-1 mt-1 text-[10px] font-semibold" style={{ color: "#6B6B6B" }}>
      <Plus size={9} /> URL da página
    </button>
  );
}

function SlotPicker({ label, num, slotKey, funilId, current, eligible, all, experts, multi, onChange, onRename, autoLabel, onSetPagina }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(label);
  const currentIds = multi ? (current || []) : current ? [current] : [];
  // resolvido a partir da lista COMPLETA (nao a de elegiveis): um slot ja salvo pode
  // apontar pra um item que as regras de elegibilidade atuais excluiriam hoje
  // (outro expert, duplicado noutro card do mesmo funil, ou status voltou pra em_edicao)
  const selectedItems = currentIds.map((id) => (all || eligible).find((it) => it.id === id)).filter(Boolean);

  const toggle = (id) => {
    if (multi) {
      const next = currentIds.includes(id) ? currentIds.filter((x) => x !== id) : [...currentIds, id];
      onChange(next);
    } else {
      onChange(id === current ? null : id);
      setOpen(false);
    }
  };

  const filled = selectedItems.length > 0;
  return (
    <div
      className="group/slot rounded-2xl p-3 relative transition-all h-full"
      style={{
        background: filled ? "rgba(229,56,59,0.05)" : C.card,
        border: filled ? `1px solid ${C.accentBorder}` : "1px dashed rgba(255,255,255,0.14)",
        minHeight: 96,
        boxShadow: filled ? `0 0 18px -10px ${C.glow}` : "none",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        {num && (
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold shrink-0"
            style={filled
              ? { background: C.accentSoft, color: C.accent, border: `1px solid ${C.accentBorder}` }
              : { background: "rgba(255,255,255,0.05)", color: "#5C5C5C", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {num}
          </span>
        )}
        {renaming ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => { onRename(nameDraft.trim()); setRenaming(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { onRename(nameDraft.trim()); setRenaming(false); }
              if (e.key === "Escape") { setRenaming(false); }
            }}
            className="flex-1 min-w-0 bg-transparent outline-none text-[10px] font-bold uppercase tracking-wide"
            style={{ color: C.primary, borderBottom: `1px solid ${C.accentBorder}` }}
          />
        ) : (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wide truncate" style={{ color: filled ? C.accent : "#5C5C5C" }} title={label}>{label}</p>
            {onRename && (
              <button
                onClick={() => { setNameDraft(label); setRenaming(true); }}
                className="p-0.5 rounded hover:bg-white/10 opacity-0 group-hover/slot:opacity-100 transition-opacity shrink-0"
                title="Renomear card"
              >
                <Pencil size={9} color="#6B6B6B" />
              </button>
            )}
          </>
        )}
      </div>

      {selectedItems.length === 0 ? (
        <p className="text-[11.5px] mb-2" style={{ color: "#454545" }}>vazio</p>
      ) : (
        <div className="flex flex-col gap-1 mb-2">
          {selectedItems.map((it) => (
            <div key={it.id} className="px-2 py-1.5 rounded-lg" style={{ background: C.accentSoft, color: C.primary }}>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="truncate" title={officialName(it, all || [], experts || [])}>
                  {officialName(it, all || [], experts || [])}
                </span>
                <span className="flex items-center gap-1.5 ml-1 shrink-0">
                  {it.linkBruto && (
                    <a href={it.linkBruto} target="_blank" rel="noreferrer" title="Material bruto" onClick={(e) => e.stopPropagation()}><Video size={11} color={C.accent} /></a>
                  )}
                  {it.linkCopy && (
                    <a href={it.linkCopy} target="_blank" rel="noreferrer" title="Copy / roteiro" onClick={(e) => e.stopPropagation()}><FileText size={11} color={C.accent} /></a>
                  )}
                  {it.linkEditado && (
                    <a href={it.linkEditado} target="_blank" rel="noreferrer" title="Material editado" onClick={(e) => e.stopPropagation()}><Link2 size={11} color={C.accent} /></a>
                  )}
                  <button onClick={() => toggle(it.id)}><X size={11} color={C.accent} /></button>
                </span>
              </div>
              {onSetPagina && <PaginaField item={it} onSetPagina={onSetPagina} />}
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setOpen((o) => !o)} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: C.accent }}>
        <ArrowRightLeft size={11} /> {multi ? "gerenciar" : "trocar"}
      </button>

      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 w-64 max-h-56 overflow-y-auto rounded-xl p-2" style={{ background: "#161616", border: `1px solid ${C.cardBorder}`, boxShadow: "0 12px 32px rgba(0,0,0,0.6)" }}>
          {eligible.length === 0 && <p className="text-[11px] p-2" style={{ color: "#5C5C5C" }}>nenhum item editado disponível</p>}
          {eligible.map((it) => (
            <button
              key={it.id}
              onClick={() => toggle(it.id)}
              className="w-full text-left text-[11.5px] px-2 py-1.5 rounded-lg mb-0.5 flex items-center justify-between"
              style={{ background: currentIds.includes(it.id) ? C.accentSoft : "transparent", color: currentIds.includes(it.id) ? C.accent : C.text }}
            >
              <span className="truncate" title={officialName(it, all || [], experts || [])}>
                {officialName(it, all || [], experts || [])}
              </span>
              {currentIds.includes(it.id) && <CheckCircle2 size={12} />}
            </button>
          ))}
          {!multi && <button onClick={() => setOpen(false)} className="w-full text-center text-[11px] mt-1 py-1" style={{ color: "#5C5C5C" }}>fechar</button>}
        </div>
      )}
    </div>
  );
}

/* ---------- Funil Atual tab ---------- */
const SLOT_KIND = {
  lead: { base: "Lead", type: "lead" },
  corpo: { base: "Corpo VSL", type: "vsl" },
  upsell: { base: "Upsell", type: "upsell" },
  downsell: { base: "Downsell", type: "downsell" },
  obrigado: { base: "Obrigado", type: "obrigado" },
};
const SLOT_KIND_ORDER = ["lead", "corpo", "upsell", "downsell", "obrigado"];
// rótulos de logs no formato antigo (compat)
const OLD_SLOT_LABEL = { leads: "Lead", corpo: "Corpo VSL", upsell1: "Upsell 1", downsell1: "Downsell 1", upsell2: "Upsell 2", downsell2: "Downsell 2" };

// estrutura padrão dos cards de um funil (serve para a maioria)
function defaultSlots(funilId) {
  return [
    { id: `${funilId}::lead`, kind: "lead", value: [] },
    { id: `${funilId}::corpo`, kind: "corpo", value: null },
    { id: `${funilId}::up1`, kind: "upsell", value: null },
    { id: `${funilId}::down1`, kind: "downsell", value: null },
    { id: `${funilId}::up2`, kind: "upsell", value: null },
    { id: `${funilId}::down2`, kind: "downsell", value: null },
  ];
}

// rótulos com numeração por tipo (Upsell 1, Upsell 2, Downsell 1...)
function slotLabels(slots) {
  const totals = {};
  slots.forEach((s) => { totals[s.kind] = (totals[s.kind] || 0) + 1; });
  const counts = {};
  return slots.map((s) => {
    counts[s.kind] = (counts[s.kind] || 0) + 1;
    if (s.kind === "corpo") return "Corpo VSL";
    if (s.kind === "lead") return totals.lead > 1 ? `Lead ${counts.lead}` : "Lead";
    return `${SLOT_KIND[s.kind]?.base || s.kind} ${counts[s.kind]}`;
  });
}

// "quanto tempo rodou" em formato curto
function fmtDur(ms) {
  if (ms == null || ms < 0) return null;
  const min = Math.floor(ms / 60000);
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h${min % 60 ? ` ${min % 60}min` : ""}`;
  const dias = Math.floor(h / 24);
  return `${dias} ${dias === 1 ? "dia" : "dias"}${h % 24 ? ` ${h % 24}h` : ""}`;
}

// classifica cada registro do histórico
function logAction(l) {
  if (l.fromId && l.toId) return { key: "sub", label: "Substituído", color: C.gold };
  if (l.toId) return { key: "add", label: "Adicionado", color: C.ok };
  return { key: "rem", label: "Removido", color: C.accent };
}

function FunilAtualTab({ experts, items, funilState, setFunilState, slotLog, setSlotLog, onSetPagina }) {
  const editado = items.filter((i) => isPronto(i.status));
  const [histOpen, setHistOpen] = useState({});

  // cards de um funil: usa o layout salvo, migra o formato antigo ou cai no padrão
  const getSlots = (funilId) => {
    const st = funilState[funilId];
    if (st && Array.isArray(st.slots)) return st.slots;
    const base = defaultSlots(funilId);
    if (st) {
      base[0].value = st.leads || [];
      base[1].value = st.corpo || null;
      base[2].value = st.upsell1 || null;
      base[3].value = st.downsell1 || null;
      base[4].value = st.upsell2 || null;
      base[5].value = st.downsell2 || null;
    }
    return base;
  };
  const writeSlots = (funilId, slots) => setFunilState((prev) => ({ ...prev, [funilId]: { slots } }));

  const updateSlotValue = (funilId, slotId, value) => {
    const slots = getSlots(funilId);
    const labels = slotLabels(slots);
    const idx = slots.findIndex((s) => s.id === slotId);
    if (idx < 0) return;
    const slot = slots[idx];
    const label = slot.name || labels[idx];
    const before = slot.value;

    // Registro automático de troca: item anterior, item novo, data
    const entries = [];
    if (slot.kind === "lead") {
      const prevIds = before || [];
      const nextIds = value || [];
      nextIds.filter((id) => !prevIds.includes(id)).forEach((id) => entries.push({ fromId: null, toId: id }));
      prevIds.filter((id) => !nextIds.includes(id)).forEach((id) => entries.push({ fromId: id, toId: null }));
    } else if (before !== value) {
      entries.push({ fromId: before || null, toId: value || null });
    }
    if (entries.length) {
      setSlotLog((log) => [
        ...entries.map((en) => ({ id: uid(), date: new Date().toISOString(), funilId, slotLabel: label, ...en })),
        ...(log || []),
      ]);
    }
    writeSlots(funilId, slots.map((s) => (s.id === slotId ? { ...s, value } : s)));
  };

  // renomear card: guarda um nome custom (vazio = volta ao automático)
  const updateSlotName = (funilId, slotId, name, autoLabel) => {
    const clean = (name || "").trim();
    writeSlots(funilId, getSlots(funilId).map((s) => (s.id === slotId ? { ...s, name: clean && clean !== autoLabel ? clean : undefined } : s)));
  };
  const addSlot = (funilId, kind) => writeSlots(funilId, [...getSlots(funilId), { id: uid(), kind, value: kind === "lead" ? [] : null }]);
  const removeSlot = (funilId, slotId) => writeSlots(funilId, getSlots(funilId).filter((s) => s.id !== slotId));
  const moveSlot = (funilId, slotId, dir) => {
    const slots = [...getSlots(funilId)];
    const i = slots.findIndex((s) => s.id === slotId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= slots.length) return;
    [slots[i], slots[j]] = [slots[j], slots[i]];
    writeSlots(funilId, slots);
  };

  const slotKey = (l) => l.slotLabel || l.slot;
  // por quanto tempo o item que saiu (fromId) ficou naquele card
  const runtimeFor = (arr, idx) => {
    const e = arr[idx];
    if (!e.fromId) return null;
    for (let j = idx + 1; j < arr.length; j++) {
      if (slotKey(arr[j]) === slotKey(e) && arr[j].toId === e.fromId) {
        return new Date(e.date) - new Date(arr[j].date);
      }
    }
    return null; // já estava no ar antes do registro começar
  };

  const renderHistory = (funilId) => {
    const entries = (slotLog || []).filter((l) => l.funilId === funilId);
    if (entries.length === 0) return null;
    const open = !!histOpen[funilId];
    return (
      <div className="mt-3">
        <button
          onClick={() => setHistOpen((o) => ({ ...o, [funilId]: !o[funilId] }))}
          className="flex items-center gap-1.5 text-[11px] font-semibold"
          style={{ color: "#6B6B6B" }}
        >
          <History size={11} /> Registro de alterações ({entries.length})
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        {open && (
          <div className="mt-2 rounded-xl overflow-hidden" style={{ border: `1px solid ${C.cardBorder}`, background: "rgba(255,255,255,0.015)" }}>
            {entries.slice(0, 40).map((l, idx) => {
              const from = items.find((i) => i.id === l.fromId);
              const to = items.find((i) => i.id === l.toId);
              const d = new Date(l.date);
              const act = logAction(l);
              const dur = fmtDur(runtimeFor(entries, idx));
              return (
                <div key={l.id} className="flex items-start gap-2.5 px-3 py-2 text-[11px]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", color: C.text }}>
                  <span className="shrink-0 tabular-nums pt-0.5" style={{ color: "#5C5C5C", minWidth: 92 }}>
                    {d.toLocaleDateString("pt-BR")} {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wide" style={{ color: act.color, background: `${act.color}18`, border: `1px solid ${act.color}45` }}>
                    {act.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="leading-snug">
                      <span className="font-semibold" style={{ color: "#7B7B7B" }}>{l.slotLabel || OLD_SLOT_LABEL[l.slot] || l.slot}: </span>
                      {act.key === "add" && <span style={{ color: C.primary }}>{itemLabel(to, experts)}</span>}
                      {act.key === "rem" && <span style={{ color: C.primary }}>{itemLabel(from, experts)}</span>}
                      {act.key === "sub" && (
                        <>
                          <span style={{ color: "#8B8B8B" }}>{itemLabel(from, experts)}</span>
                          <span style={{ color: act.color }}> → </span>
                          <span style={{ color: C.primary }}>{itemLabel(to, experts)}</span>
                        </>
                      )}
                    </p>
                    {(act.key === "rem" || act.key === "sub") && (
                      <p className="text-[10px] mt-0.5" style={{ color: "#5C5C5C" }}>
                        {dur ? `ficou no ar por ${dur}` : "estava no ar (início não registrado)"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {experts.map((ex) => (
        <div key={ex.id}>
          <div className="flex items-center gap-2 mb-2.5">
            <Radio size={14} color={C.accent} />
            <h3 className="text-[14px] font-bold" style={{ color: C.primary }}>{ex.name}</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {ex.funis.map((f) => {
              const slots = getSlots(f.id);
              const labels = slotLabels(slots);
              // ids já usados nos OUTROS cards deste funil — um produto não se repete no mesmo funil
              const usedElsewhere = (slotId) => {
                const set = new Set();
                slots.forEach((s) => {
                  if (s.id === slotId) return;
                  if (s.kind === "lead") (s.value || []).forEach((v) => v && set.add(v));
                  else if (s.value) set.add(s.value);
                });
                return set;
              };
              const eligibleFor = (slot) => {
                const used = usedElsewhere(slot.id);
                const livre = (i) => !used.has(i.id);
                // upsell/downsell/obrigado: só do expert deste funil (ou os da biblioteca, sem expert definido)
                const doExpert = (i) => !i.expertId || i.expertId === ex.id;
                if (slot.kind === "lead") return editado.filter((i) => i.type === "lead" && i.expertId === ex.id && i.funilId === f.id && livre(i));
                if (slot.kind === "corpo") return editado.filter((i) => i.type === "vsl" && i.expertId === ex.id && i.funilId === f.id && livre(i));
                if (slot.kind === "upsell") return editado.filter((i) => i.type === "upsell" && doExpert(i) && livre(i));
                if (slot.kind === "downsell") return editado.filter((i) => i.type === "downsell" && doExpert(i) && livre(i));
                if (slot.kind === "obrigado") return editado.filter((i) => i.type === "obrigado" && doExpert(i) && livre(i));
                // tipo de card desconhecido (ex: bundle antigo com um kind mais novo do que este build conhece)
                return [];
              };
              const filledCount = slots.filter((s) => (s.kind === "lead" ? (s.value || []).length > 0 : !!s.value)).length;
              return (
                <div key={f.id} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.015)", border: `1px solid ${C.cardBorder}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[13px] font-bold" style={{ color: C.primary }}>{f.name}</p>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: filledCount > 0 ? C.ok : "#454545" }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: filledCount > 0 ? C.ok : "#454545" }} />
                      {filledCount}/{slots.length} no ar
                    </span>
                  </div>
                  <div className="flex items-stretch gap-1.5 flex-wrap">
                    {slots.map((s, i) => (
                      <div key={s.id} className="flex-1 min-w-[150px] flex flex-col gap-1">
                        <SlotPicker label={s.name || labels[i]} autoLabel={labels[i]} num={i + 1} multi={s.kind === "lead"} current={s.value} eligible={eligibleFor(s)} all={items} experts={experts} onChange={(v) => updateSlotValue(f.id, s.id, v)} onRename={(name) => updateSlotName(f.id, s.id, name, labels[i])} onSetPagina={onSetPagina} />
                        <div className="flex items-center justify-center gap-0.5 opacity-40 hover:opacity-100 transition-opacity">
                          <button onClick={() => moveSlot(f.id, s.id, -1)} disabled={i === 0} title="Mover para a esquerda" className="p-1 rounded-md hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={12} color={C.text} /></button>
                          <button onClick={() => removeSlot(f.id, s.id)} title="Remover card" className="p-1 rounded-md hover:bg-white/10"><Trash2 size={11} color={C.text} /></button>
                          <button onClick={() => moveSlot(f.id, s.id, 1)} disabled={i === slots.length - 1} title="Mover para a direita" className="p-1 rounded-md hover:bg-white/10 disabled:opacity-30"><ChevronRight size={12} color={C.text} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#5C5C5C" }}>Adicionar card:</span>
                    {SLOT_KIND_ORDER.map((k) => (
                      <button
                        key={k}
                        onClick={() => addSlot(f.id, k)}
                        className="flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: "rgba(255,255,255,0.03)", color: C.text, border: "1px dashed rgba(255,255,255,0.15)" }}
                      >
                        <Plus size={10} /> {SLOT_KIND[k]?.base || k}
                      </button>
                    ))}
                  </div>
                  {renderHistory(f.id)}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Testes de Lead (registro p/ VTurb + API) ---------- */
const TEST_STATUS = {
  planejado: { label: "A testar", color: "#8B8B8B", Icon: Clock },
  rodando: { label: "Em teste", color: C.gold, Icon: Radio },
  concluido: { label: "Testado", color: C.ok, Icon: CheckCircle2 },
};
const TEST_STATUS_ORDER = ["planejado", "rodando", "concluido"];

// lead(s) de um teste — aceita o novo formato (leadId único) e o antigo (leadIds em lista)
function testLeads(test, items) {
  const ids = test.leadId ? [test.leadId] : (test.leadIds || []);
  return ids.map((id) => items.find((i) => i.id === id)).filter(Boolean);
}

// data no formato ddmmaa para a nomenclatura
function ddmmaa(dateObj) {
  return `${String(dateObj.getDate()).padStart(2, "0")}${String(dateObj.getMonth() + 1).padStart(2, "0")}${String(dateObj.getFullYear()).slice(2)}`;
}

// Nomenclatura padrão do teste: junta produto (funil) + corpo (versão) + lead(s) +
// quando rodou (início) e quando parou (fim, entra ao encerrar).
// Ex.: TESTE_HFTC_V2_LEAD01-02_270726-280726
function testName(test, items, experts) {
  const funil = slug(funilName(experts, test.funilId)) || "FUNIL";
  const leads = testLeads(test, items).map((l) => l.leadNum || "?").sort();
  const leadPart = leads.length ? `LEAD${leads.join("-")}` : "LEAD?";
  const ini = ddmmaa(test.dataInicio ? new Date(test.dataInicio + "T00:00:00") : new Date());
  const base = `TESTE_${funil}_V${test.corpoVersao || "?"}_${leadPart}_${ini}`;
  // quando parou de rodar
  return test.dataFim ? `${base}-${ddmmaa(new Date(test.dataFim + "T00:00:00"))}` : base;
}

// Nome que realmente vale: o que o Gabriel digitou (para casar com o VTurb) ou, se vazio, o automático.
function effectiveTestName(test, items, experts) {
  return (test.nomeManual && test.nomeManual.trim()) || testName(test, items, experts);
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function TestStatusBadge({ status }) {
  const s = TEST_STATUS[status] || TEST_STATUS.planejado;
  const Icon = s.Icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full" style={{ color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}40` }}>
      <Icon size={10} /> {s.label}
    </span>
  );
}

function TesteModal({ initial, experts, items, onSave, onCreateLead, onClose }) {
  const [form, setForm] = useState({
    funilId: "", corpoVersao: "", leadId: "",
    solicitante: "", linkVturb: "", status: "planejado", nomeManual: "",
    dataInicio: "", dataFim: "", obs: "",
    // compat: se vier um teste antigo com leadIds, usa o primeiro
    ...(initial && initial.leadIds && !initial.leadId ? { leadId: initial.leadIds[0] || "" } : {}),
    ...initial,
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const autoNome = testName(form, items, experts);

  const allFunis = experts.flatMap((ex) => ex.funis.map((f) => ({ ...f, expertName: ex.name, expertId: ex.id })));
  const funil = allFunis.find((f) => f.id === form.funilId);
  // versões de corpo já cadastradas para o funil (para selecionar)
  const versoesCorpo = [...new Set(items.filter((i) => i.type === "vsl" && i.funilId === form.funilId).map((c) => c.versao).filter(Boolean))].sort();
  // todas as leads do funil — cada uma mostra sua versão
  const leadsDoFunil = items.filter((i) => i.type === "lead" && i.funilId === form.funilId);

  // criação de nova lead na hora
  const [novaLead, setNovaLead] = useState(null); // null | { leadNum, versao, editor }
  const criarNovaLead = () => {
    if (!form.funilId) return;
    const nova = novaLead || {};
    const num = (nova.leadNum || "").trim();
    if (!num) return;
    const id = onCreateLead({ funilId: form.funilId, leadNum: num, versao: (nova.versao || form.corpoVersao || "").trim(), editor: (nova.editor || "").trim() });
    setForm((f) => ({ ...f, leadId: id }));
    setNovaLead(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(2,2,2,0.75)", backdropFilter: "blur(4px)", fontFamily: FONT }}>
      <div className="w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto" style={{ background: C.bg2, border: `1px solid ${C.cardBorder}` }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 sticky top-0 z-10" style={{ background: C.bg2, borderBottom: `1px solid ${C.cardBorder}` }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: C.accentSoft }}>
              <FlaskConical size={15} color={C.accent} />
            </div>
            <h3 className="text-[15px] font-bold" style={{ color: C.primary }}>{initial.id ? "Editar teste" : "Novo teste de lead"}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10"><X size={16} color={C.text} /></button>
        </div>

        <div className="px-5 pb-5 pt-4">
          <Section label="Onde">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Funil">
                <select style={inputStyle} value={form.funilId} onChange={(e) => setForm((f) => ({ ...f, funilId: e.target.value, leadId: "" }))}>
                  <option value="">selecione</option>
                  {allFunis.map((f) => <option key={f.id} value={f.id}>{f.expertName} · {f.name}</option>)}
                </select>
              </Field>
              <Field label="Versão do corpo">
                {versoesCorpo.length > 0 ? (
                  <select style={inputStyle} value={form.corpoVersao} onChange={set("corpoVersao")}>
                    <option value="">selecione</option>
                    {versoesCorpo.map((v) => <option key={v} value={v}>V{v}</option>)}
                  </select>
                ) : (
                  <input style={inputStyle} value={form.corpoVersao} onChange={set("corpoVersao")} placeholder={form.funilId ? "nenhum corpo cadastrado — digite" : "selecione o funil"} />
                )}
              </Field>
            </div>
          </Section>

          <Section label="Lead em teste">
            {!form.funilId ? (
              <p className="text-[11.5px]" style={{ color: "#5C5C5C" }}>selecione um funil primeiro</p>
            ) : (
              <>
                <p className="text-[10.5px] mb-1.5" style={{ color: "#5C5C5C" }}>Escolha a lead que está sendo testada — ou crie uma nova:</p>
                <div className="flex flex-col gap-1">
                  {leadsDoFunil.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setForm((f) => ({ ...f, leadId: f.leadId === l.id ? "" : l.id }))}
                      className="flex items-center justify-between text-[12px] px-3 py-2 rounded-xl text-left"
                      style={form.leadId === l.id
                        ? { background: C.accentSoft, color: C.accent, border: `1px solid ${C.accentBorder}` }
                        : { background: "rgba(255,255,255,0.03)", color: C.text, border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <span>Lead #{l.leadNum} · <b>V{l.versao}</b>{l.editor ? ` · ${l.editor}` : ""}</span>
                      {form.leadId === l.id && <CheckCircle2 size={13} />}
                    </button>
                  ))}
                  {leadsDoFunil.length === 0 && (
                    <p className="text-[11px] mb-1" style={{ color: "#5C5C5C" }}>nenhuma lead cadastrada para esse funil ainda</p>
                  )}
                </div>

                {novaLead === null ? (
                  <button
                    onClick={() => setNovaLead({ leadNum: "", versao: form.corpoVersao || "", editor: "" })}
                    className="flex items-center gap-1.5 text-[11.5px] font-semibold mt-2"
                    style={{ color: C.accent }}
                  >
                    <Plus size={13} /> Criar nova lead
                  </button>
                ) : (
                  <div className="mt-2 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${C.cardBorder}` }}>
                    <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: C.accent }}>Nova lead</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="block text-[9.5px] font-bold uppercase mb-1" style={{ color: "#5C5C5C" }}>Nº</span>
                        <input style={{ ...inputStyle, marginBottom: 0 }} value={novaLead.leadNum} onChange={(e) => setNovaLead((n) => ({ ...n, leadNum: e.target.value }))} placeholder="03" />
                      </div>
                      <div>
                        <span className="block text-[9.5px] font-bold uppercase mb-1" style={{ color: "#5C5C5C" }}>Versão</span>
                        <input style={{ ...inputStyle, marginBottom: 0 }} value={novaLead.versao} onChange={(e) => setNovaLead((n) => ({ ...n, versao: e.target.value }))} placeholder="2" />
                      </div>
                      <div>
                        <span className="block text-[9.5px] font-bold uppercase mb-1" style={{ color: "#5C5C5C" }}>Editor</span>
                        <input style={{ ...inputStyle, marginBottom: 0 }} value={novaLead.editor} onChange={(e) => setNovaLead((n) => ({ ...n, editor: e.target.value }))} placeholder="opc." />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2.5">
                      <button onClick={() => setNovaLead(null)} className="flex-1 py-1.5 rounded-full text-[11.5px] font-semibold" style={{ background: "rgba(255,255,255,0.05)", color: C.text }}>Cancelar</button>
                      <button onClick={criarNovaLead} className="flex-1 py-1.5 rounded-full text-[11.5px] font-bold" style={{ background: C.accent, color: "#0A0A0A", opacity: (novaLead.leadNum || "").trim() ? 1 : 0.4 }}>Criar e selecionar</button>
                    </div>
                    <p className="text-[10px] mt-2" style={{ color: "#5C5C5C" }}>A lead também é cadastrada na Produção (fonte única).</p>
                  </div>
                )}
              </>
            )}
          </Section>

          <Section label="Rastreamento">
            <div className="rounded-xl p-3 mb-3" style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}` }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.accent }}>Nome do teste</p>
                {form.nomeManual && form.nomeManual.trim() && form.nomeManual.trim() !== autoNome && (
                  <button
                    onClick={() => setForm((f) => ({ ...f, nomeManual: "" }))}
                    className="text-[10px] font-semibold"
                    style={{ color: C.text }}
                    title="Voltar para o nome gerado automaticamente"
                  >
                    usar sugestão automática
                  </button>
                )}
              </div>
              <input
                value={form.nomeManual || ""}
                onChange={set("nomeManual")}
                placeholder={autoNome}
                className="w-full bg-transparent outline-none text-[13px] font-bold"
                style={{ color: C.primary, fontFamily: "ui-monospace, monospace" }}
              />
              <div className="mt-2"><CopyName big name={form.nomeManual && form.nomeManual.trim() ? form.nomeManual.trim() : autoNome} /></div>
              <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px]" style={{ color: C.text }}>
                <span>🏷️ <b>Produto</b>: funil</span>
                <span>🎬 <b>Corpo</b>: versão</span>
                <span>⚡ <b>Lead</b> em teste</span>
                <span>▶️ <b>Quando rodou</b>: data de início</span>
                <span>⏹️ <b>Quando parou</b>: entra ao clicar "Encerrar teste"</span>
              </div>
              <p className="text-[10.5px] mt-2" style={{ color: C.text }}>
                O nome já junta tudo isso automaticamente. <b>Você pode editar</b> para casar com o que o Gabriel usa no VTurb —
                e é esse mesmo nome que deve ir no VTurb e na API para a métrica bater.
              </p>
            </div>
            <LinkField label="Link do player / teste no VTurb" Icon={ExternalLink} value={form.linkVturb} onChange={set("linkVturb")} />
          </Section>

          <Section label="Quem & quando">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Solicitante"><input style={inputStyle} value={form.solicitante} onChange={set("solicitante")} placeholder="THI" /></Field>
              <Field label="Status">
                <select style={inputStyle} value={form.status} onChange={set("status")}>
                  {TEST_STATUS_ORDER.map((s) => <option key={s} value={s}>{TEST_STATUS[s].label}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Início (quando começou a rodar)"><input type="date" style={inputStyle} value={form.dataInicio} onChange={set("dataInicio")} /></Field>
              <Field label="Fim (quando parou)"><input type="date" style={inputStyle} value={form.dataFim} onChange={set("dataFim")} /></Field>
            </div>
            {form.dataInicio && !form.dataFim && (
              <div className="flex items-start gap-1.5 -mt-1 mb-3 px-2.5 py-2 rounded-lg" style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}40` }}>
                <Clock size={12} color={C.gold} className="mt-0.5 shrink-0" />
                <p className="text-[10.5px]" style={{ color: C.gold }}>
                  Teste em andamento — <b>deixe o Fim em branco enquanto roda</b> e volte para preencher (ou clique em "Encerrar teste") quando parar.
                </p>
              </div>
            )}
            <Field label="Observações / resultado">
              <input style={inputStyle} value={form.obs} onChange={set("obs")} placeholder="ex: lead 02 venceu, CTR 12% maior" />
            </Field>
          </Section>

          <button
            onClick={() => onSave(form)}
            className="w-full mt-1 py-2.5 rounded-full font-bold text-[13px] transition-all"
            style={{ background: C.accent, color: "#0A0A0A", boxShadow: `0 8px 24px -8px ${C.glow}` }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function TestesTab({ tests, items, experts, onAdd, onEdit, onDelete, onUpdate }) {
  const [confirmDelId, setConfirmDelId] = useState(null);
  const counts = { planejado: 0, rodando: 0, concluido: 0 };
  (tests || []).forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; });
  const sorted = [...(tests || [])].sort((a, b) => (b.dataInicio || "").localeCompare(a.dataInicio || ""));

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <p className="text-[12px] max-w-[580px]" style={{ color: "#6B6B6B" }}>
          Registro dos testes de lead — para saber qual lead está em teste, qual já foi testada, em que data e
          qual a nomenclatura no VTurb. Cada teste é de uma lead. Ao <b style={{ color: C.text }}>desativar no VTurb, clique em "Encerrar teste" aqui</b> para marcar que parou.
        </p>
        <button onClick={onAdd} className="flex items-center gap-1.5 text-[12.5px] font-bold px-4 py-2 rounded-full" style={{ background: C.accent, color: "#0A0A0A", boxShadow: `0 6px 18px -6px ${C.glow}` }}>
          <Plus size={14} /> Novo teste
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {TEST_STATUS_ORDER.map((k) => {
          const s = TEST_STATUS[k];
          const Icon = s.Icon;
          return (
            <div key={k} className="flex items-center gap-2 px-3.5 py-2 rounded-xl flex-1" style={{ background: `${s.color}0D`, border: `1px solid ${s.color}30` }}>
              <Icon size={14} color={s.color} />
              <div>
                <p className="text-[15px] font-bold leading-tight" style={{ color: s.color }}>{counts[k]}</p>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: "#6B6B6B" }}>{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl px-4 py-6 text-center text-[12px]" style={{ background: C.card, border: `1px solid ${C.cardBorder}`, color: "#454545" }}>
          nenhum teste registrado ainda — clique em "Novo teste" quando alguém pedir um teste de lead
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {sorted.map((t) => {
            const leads = testLeads(t, items);
            return (
              <div key={t.id} className="group rounded-xl p-3.5" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <FlaskConical size={14} color={C.accent} />
                  <CopyName big name={effectiveTestName(t, items, experts)} />
                  <TestStatusBadge status={t.status} />
                  <span className="flex-1" />
                  {t.linkVturb && (
                    <a href={t.linkVturb} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] hover:underline" style={{ color: C.text }}>
                      <ExternalLink size={12} color={C.accent} /> VTurb
                    </a>
                  )}
                  {/* Botões de ciclo de vida: iniciar carimba a data de início; encerrar carimba a data de fim (não dá pra saber antes) */}
                  {t.status !== "rodando" && t.status !== "concluido" && (
                    <button
                      onClick={() => onUpdate(t.id, { status: "rodando", dataInicio: t.dataInicio || todayISO() })}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ color: C.gold, background: `${C.gold}18`, border: `1px solid ${C.gold}55` }}
                    >
                      <Radio size={11} /> Iniciar
                    </button>
                  )}
                  {t.status === "rodando" && (
                    <button
                      onClick={() => onUpdate(t.id, { status: "concluido", dataFim: todayISO() })}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{ color: C.accent, background: C.accentSoft, border: `1px solid ${C.accentBorder}` }}
                      title="Encerra o teste e carimba a data de hoje como fim"
                    >
                      <CheckCircle2 size={11} /> Encerrar teste
                    </button>
                  )}
                  {t.status === "concluido" && (
                    <button
                      onClick={() => onUpdate(t.id, { status: "rodando", dataFim: "" })}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                      style={{ color: C.text, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                      title="Reabrir o teste (voltar para rodando)"
                    >
                      <Radio size={11} /> Reabrir
                    </button>
                  )}
                  {confirmDelId === t.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold hidden sm:inline" style={{ color: C.accent }}>Excluir?</span>
                      <button onClick={() => { onDelete(t.id); setConfirmDelId(null); }} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: C.accent, color: "#0A0A0A" }}>Sim, excluir</button>
                      <button onClick={() => setConfirmDelId(null)} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: C.text }}>Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(t)} className="p-1 rounded-md hover:bg-white/10"><Pencil size={12} color={C.text} /></button>
                      <button onClick={() => setConfirmDelId(t.id)} className="p-1 rounded-md hover:bg-white/10"><Trash2 size={12} color={C.text} /></button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap text-[11.5px]" style={{ color: C.text }}>
                  <span className="font-semibold" style={{ color: C.primary }}>{funilName(experts, t.funilId) || "funil?"} · V{t.corpoVersao || "?"}</span>
                  <span>{leads.length ? leads.map((l) => `Lead #${l.leadNum} V${l.versao}`).join(" · ") : "lead não selecionada"}</span>
                  {t.solicitante && <span>pedido por {t.solicitante}</span>}
                  {t.dataInicio && (
                    <span style={{ color: "#5C5C5C" }}>iniciou {new Date(t.dataInicio + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                  )}
                  {t.dataFim && (
                    <span style={{ color: "#5C5C5C" }}>· encerrou {new Date(t.dataFim + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                  )}
                </div>
                {/* Lembrete: começou mas ainda não tem data de fim */}
                {t.dataInicio && !t.dataFim && (
                  <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full" style={{ background: `${C.gold}14`, border: `1px solid ${C.gold}45` }}>
                    <Clock size={11} color={C.gold} />
                    <span className="text-[10.5px] font-semibold" style={{ color: C.gold }}>Falta marcar quando parou — clique em "Encerrar teste" ao finalizar</span>
                  </div>
                )}
                {t.obs && <p className="text-[11px] italic mt-1.5" style={{ color: "#6B6B6B" }}>{t.obs}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Mini gráfico de barras (sparkline) ---------- */
function MiniBars({ values, color }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex items-end gap-[3px] h-8">
      {values.map((v, i) => (
        <span key={i} className="w-full rounded-sm" style={{ height: `${Math.max(8, (v / max) * 100)}%`, background: color, opacity: 0.35 + (i / values.length) * 0.65, minWidth: 3 }} />
      ))}
    </div>
  );
}

/* ---------- Card de KPI ---------- */
function KpiCard({ label, value, sub, Icon, color, bars }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col justify-between" style={{ background: C.card, border: `1px solid ${C.cardBorder}`, minHeight: 132 }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.dim }}>{label}</p>
          <p className="text-[26px] font-extrabold leading-tight mt-1" style={{ color: C.primary }}>{value}</p>
        </div>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}35` }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <div className="flex items-end justify-between gap-3 mt-2">
        <span className="text-[11px]" style={{ color: C.dim }}>{sub}</span>
        <div className="flex-1 max-w-[110px]"><MiniBars values={bars} color={color} /></div>
      </div>
    </div>
  );
}

/* ---------- Dashboard (visão inicial estilo SaaS) ---------- */
function DashboardTab({ items, experts, tests, funilState, onGo, onAdd }) {
  const porStatus = { a_editar: 0, em_edicao: 0, editado: 0, aprovado: 0 };
  items.forEach((i) => { if (porStatus[i.status] !== undefined) porStatus[i.status] += 1; });
  const { editado: editados, aprovado: aprovados, em_edicao: emEdicao, a_editar: aEditar } = porStatus;
  const rodando = (tests || []).filter((t) => t.status === "rodando").length;
  const totalFunis = experts.reduce((n, e) => n + e.funis.length, 0);
  const noAr = Object.values(funilState || {}).filter((s) => s && (s.corpo || (s.leads || []).length)).length;
  const prontos = editados + aprovados;

  // atividade recente = itens ordenados por data de entrega/início
  const recent = [...items]
    .sort((a, b) => (b.dataEntrega || b.dataInicio || "").localeCompare(a.dataEntrega || a.dataInicio || ""))
    .slice(0, 6);

  const bars = (seed) => Array.from({ length: 8 }, (_, i) => ((seed * (i + 3)) % 7) + 2);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Materiais editados" value={prontos} sub={`${aprovados} aprovados · ${editados} a revisar`} Icon={CheckCircle2} color={C.ok} bars={bars(3)} />
        <KpiCard label="Em produção" value={emEdicao + aEditar} sub={`${emEdicao} em edição · ${aEditar} a editar`} Icon={Activity} color={C.gold} bars={bars(5)} />
        <KpiCard label="Funis no ar" value={`${noAr}/${totalFunis}`} sub="rodando agora" Icon={Radio} color={C.accent} bars={bars(2)} />
        <KpiCard label="Testes rodando" value={rodando} sub={`${(tests || []).length} no total`} Icon={FlaskConical} color="#6EA8FE" bars={bars(4)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Atividade recente */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
            <h3 className="text-[13px] font-bold" style={{ color: C.primary }}>Atividade recente</h3>
            <button onClick={() => onGo("producao")} className="text-[11px] font-semibold" style={{ color: C.accent }}>Ver produção →</button>
          </div>
          {recent.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px]" style={{ color: "#454545" }}>nada cadastrado ainda</div>
          ) : (
            recent.map((it) => {
              const s = statusInfo(it.status);
              const Icon = s.Icon;
              const label = it.type === "lead" ? `Lead #${it.leadNum || "?"}` : it.type === "vsl" ? `Corpo V${it.versao || "?"}` : (it.produto || "sem produto");
              return (
                <div key={it.id} className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <Icon size={15} color={s.color} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold truncate" style={{ color: C.primary }}>{label}</p>
                    <p className="text-[11px]" style={{ color: C.dim }}>{TYPE_LABEL[it.type]} · {[it.editor, it.copy].filter(Boolean).join(" / ") || "sem equipe"}</p>
                  </div>
                  <StatusBadge status={it.status} />
                </div>
              );
            })
          )}
        </div>

        {/* Saúde da produção + experts */}
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.cardBorder}` }}>
            <h3 className="text-[13px] font-bold mb-3" style={{ color: C.primary }}>Saúde da produção</h3>
            {["aprovado", "editado", "em_edicao", "a_editar"].map((k) => (
              <div key={k} className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS[k].color }} />
                <span className="text-[12px] flex-1" style={{ color: C.text }}>{STATUS[k].label}</span>
                <span className="text-[12px] font-bold" style={{ color: C.primary }}>{porStatus[k]}</span>
                <span className="text-[11px] w-9 text-right" style={{ color: C.dim }}>{items.length ? Math.round((porStatus[k] / items.length) * 100) : 0}%</span>
              </div>
            ))}
            <div className="flex h-2 rounded-full overflow-hidden mt-3" style={{ background: "rgba(255,255,255,0.06)" }}>
              {STATUS_ORDER.map((k) => (
                items.length ? <span key={k} style={{ width: `${(porStatus[k] / items.length) * 100}%`, background: STATUS[k].color }} /> : null
              ))}
            </div>
          </div>

          <button onClick={onAdd} className="rounded-2xl p-4 text-left transition-all hover:brightness-110" style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}` }}>
            <div className="flex items-center gap-2 mb-1">
              <Plus size={15} color={C.accent} />
              <span className="text-[13px] font-bold" style={{ color: C.accent }}>Cadastrar material</span>
            </div>
            <p className="text-[11px]" style={{ color: C.text }}>Adicione uma Lead, Corpo, Upsell, Downsell ou Obrigado à produção.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Root ---------- */
const NAV = [
  { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { key: "producao", label: "Produção", Icon: Layers },
  { key: "funil", label: "Funil Atual", Icon: Radio },
  { key: "testes", label: "Testes", Icon: FlaskConical },
];
const TAB_INFO = {
  dashboard: { title: "Dashboard", hint: "" },
  producao: { title: "Produção", hint: "Tudo que já foi ou está sendo produzido — cadastre materiais e acompanhe o status de cada um." },
  funil: { title: "Funil Atual", hint: "O que está no ar agora em cada funil, na ordem em que o cliente vê: Lead → Corpo → Upsell 1 → Downsell 1 → Upsell 2 → Downsell 2." },
  testes: { title: "Testes", hint: "Registro dos testes de lead — o nome gerado aqui deve ser usado igual no VTurb e na API." },
};

export default function VSLProductionPanel() {
  const [items, setItems, itemsReady] = useStorage("vslpanel:items", seedItems);
  const [experts, setExperts, expertsReady] = useStorage("vslpanel:experts", seedExperts);
  const [funilState, setFunilState, funilReady] = useStorage("vslpanel:funilstate", () => ({}));
  const [slotLog, setSlotLog, slotLogReady] = useStorage("vslpanel:slotlog", () => []);
  const [tests, setTests, testsReady] = useStorage("vslpanel:tests", () => []);
  const [notifs, setNotifs, notifsReady] = useStorage("vslpanel:notifications", () => []);
  const [tab, setTab] = useState("dashboard");
  const [modal, setModal] = useState(null);
  const [testModal, setTestModal] = useState(null);
  const [expertModal, setExpertModal] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(() => {
    try { return Number(localStorage.getItem("vslpanel:notifSeen") || 0); } catch (e) { return 0; }
  });

  const pushNotif = (text) =>
    setNotifs((prev) => [{ id: uid(), date: new Date().toISOString(), text }, ...(prev || [])].slice(0, 60));

  const unseenCount = (notifs || []).filter((n) => new Date(n.date).getTime() > lastSeen).length;
  const openNotifs = () => {
    setNotifOpen((o) => !o);
    if (!notifOpen) {
      const now = Date.now();
      setLastSeen(now);
      try { localStorage.setItem("vslpanel:notifSeen", String(now)); } catch (e) {}
    }
  };

  const blank = () => ({
    id: null, type: "vsl", expertId: "", funilId: "", produto: "", versao: "1",
    leadNum: "", reaproveitada: false, origemVersao: "", tipo: "video", contexto: "",
    posicao: "1", associar: true, associadoId: "",
    editor: "", copy: "", status: "a_editar",
    linkBruto: "", linkCopy: "", linkEditado: "", linkPagina: "", dataInicio: "", dataEntrega: "",
  });

  const save = (form) => {
    if (form.id) setItems((prev) => prev.map((it) => (it.id === form.id ? form : it)));
    else setItems((prev) => [...prev, { ...form, id: uid() }]);
    setModal(null);
  };
  const remove = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  // cria uma lead na hora (a partir do teste) e devolve o id — mantém a fonte única na Produção
  const createLeadInline = ({ funilId, leadNum, versao, editor }) => {
    const id = uid();
    const expert = experts.find((e) => (e.funis || []).some((f) => f.id === funilId));
    setItems((prev) => [...prev, {
      id, type: "lead", expertId: expert ? expert.id : "", funilId,
      versao: versao || "", leadNum: leadNum || "", reaproveitada: false, origemVersao: "",
      editor: editor || "", copy: "", status: "editado",
      linkBruto: "", linkCopy: "", linkEditado: "", dataInicio: "", dataEntrega: "",
    }]);
    return id;
  };

  // define/edita a URL da página de um item direto pelo Funil Atual
  const setItemPagina = (id, url) => setItems((prev) => prev.map((it) => (it.id === id ? { ...it, linkPagina: (url || "").trim() } : it)));

  const saveTest = (form) => {
    if (form.id) setTests((prev) => prev.map((t) => (t.id === form.id ? form : t)));
    else {
      setTests((prev) => [...prev, { ...form, id: uid() }]);
      pushNotif(`Novo teste cadastrado: ${effectiveTestName(form, items, experts)}`);
    }
    setTestModal(null);
  };
  const removeTest = (id) => setTests((prev) => prev.filter((t) => t.id !== id));
  const updateTest = (id, patch) => {
    setTests((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const t = (tests || []).find((x) => x.id === id);
    if (t && patch.status === "rodando") pushNotif(`Teste iniciado: ${effectiveTestName({ ...t, ...patch }, items, experts)}`);
    if (t && patch.status === "concluido") pushNotif(`Teste encerrado: ${effectiveTestName({ ...t, ...patch }, items, experts)}`);
  };

  const saveExpert = (ex) => {
    setExperts((prev) => (prev.some((p) => p.id === ex.id) ? prev.map((p) => (p.id === ex.id ? ex : p)) : [...prev, ex]));
    setExpertModal(null);
  };
  const removeExpert = (id) => {
    const ex = experts.find((e) => e.id === id);
    setExperts((prev) => prev.filter((e) => e.id !== id));
    // limpa o funil atual e o histórico dos funis desse expert (não deixa lixo referenciando)
    if (ex) {
      const funilIds = new Set(ex.funis.map((f) => f.id));
      setFunilState((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !funilIds.has(k))));
      setSlotLog((prev) => (prev || []).filter((l) => !funilIds.has(l.funilId)));
    }
    setExpertModal(null);
  };

  if (!itemsReady || !funilReady || !slotLogReady || !testsReady || !expertsReady || !notifsReady) return <div style={{ background: C.bg, minHeight: "100vh" }} />;

  const go = (t) => { setTab(t); setNavOpen(false); };
  const info = TAB_INFO[tab];

  const SidebarInner = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16 shrink-0" style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: C.accentSoft, border: `1px solid ${C.accentBorder}`, boxShadow: `0 0 18px -6px ${C.glow}` }}>
          <Layers size={16} color={C.accent} />
        </div>
        <span className="text-[16px] font-extrabold tracking-tight" style={{ color: C.primary }}>Produção<span style={{ color: C.accent }}>.</span></span>
      </div>

      <nav className="flex-1 px-3 py-4">
        <p className="text-[9.5px] font-bold uppercase tracking-widest px-2.5 mb-2" style={{ color: C.dim }}>Menu</p>
        {NAV.map((n) => {
          const active = tab === n.key;
          return (
            <button
              key={n.key}
              onClick={() => go(n.key)}
              className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl mb-1 text-[13px] font-semibold transition-all"
              style={active
                ? { background: C.accentSoft, color: C.accent, border: `1px solid ${C.accentBorder}`, boxShadow: `0 0 16px -8px ${C.glow}` }
                : { background: "transparent", color: C.text, border: "1px solid transparent" }}
            >
              <n.Icon size={16} />
              {n.label}
            </button>
          );
        })}
      </nav>

      <div className="p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.02)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0" style={{ background: C.accentSoft, color: C.accent, border: `1px solid ${C.accentBorder}` }}>PAZ</div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold truncate" style={{ color: C.primary }}>PAZ Marketing</p>
            <p className="text-[10.5px] truncate" style={{ color: C.dim }}>Creative Ops</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen flex" style={{ background: C.bg, fontFamily: FONT, colorScheme: "dark" }}>
      {/* Corrige menus suspensos (option) que ficavam branco no branco, e força controles nativos escuros */}
      <style>{`
        select, select option, select optgroup {
          background-color: #141414 !important;
          color: #EDEDED !important;
        }
        select option:checked, select option:hover {
          background-color: #2a2a2a !important;
        }
        input[type="date"] { color-scheme: dark; }
      `}</style>
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-screen" style={{ background: C.bg2, borderRight: `1px solid ${C.cardBorder}` }}>
        {SidebarInner}
      </aside>

      {/* Sidebar mobile (drawer) */}
      {navOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="flex flex-col w-60 h-full" style={{ background: C.bg2, borderRight: `1px solid ${C.cardBorder}` }}>{SidebarInner}</div>
          <div className="flex-1" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setNavOpen(false)} />
        </div>
      )}

      {/* Coluna principal */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 sm:px-6 h-16 shrink-0" style={{ background: "rgba(10,10,10,0.85)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.cardBorder}` }}>
          <button className="lg:hidden p-2 rounded-lg hover:bg-white/10" onClick={() => setNavOpen(true)}><Menu size={18} color={C.text} /></button>

          <div className="min-w-0">
            {tab === "dashboard" ? (
              <>
                <h2 className="text-[15px] sm:text-[16px] font-extrabold leading-tight truncate" style={{ color: C.primary }}>Bem-vindo de volta 👋</h2>
                <p className="text-[11px] hidden sm:block" style={{ color: C.dim }}>Aqui está o que está acontecendo na produção hoje.</p>
              </>
            ) : (
              <h2 className="text-[15px] sm:text-[16px] font-extrabold leading-tight truncate" style={{ color: C.primary }}>{info.title}</h2>
            )}
          </div>

          <div className="flex-1 hidden md:flex items-center justify-center px-4">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full w-full max-w-md" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.cardBorder}` }}>
              <Search size={14} color={C.dim} />
              <input
                value={globalSearch}
                onChange={(e) => { setGlobalSearch(e.target.value); if (e.target.value) setTab("producao"); }}
                placeholder="Buscar materiais, funis, produtos..."
                className="bg-transparent outline-none text-[12.5px] flex-1"
                style={{ color: C.primary, fontFamily: FONT }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto md:ml-0">
            <div className="relative">
              <button onClick={openNotifs} className="p-2 rounded-lg hover:bg-white/10 relative" title="Notificações">
                <Bell size={17} color={unseenCount > 0 ? C.accent : C.text} />
                {unseenCount > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: C.accent, color: "#0A0A0A" }}>
                    {unseenCount > 9 ? "9+" : unseenCount}
                  </span>
                ) : (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: C.ok }} title="Sincronizado" />
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-80 max-w-[85vw] rounded-2xl overflow-hidden z-40" style={{ background: C.bg2, border: `1px solid ${C.cardBorder}`, boxShadow: "0 16px 40px rgba(0,0,0,0.6)" }}>
                    <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: `1px solid ${C.cardBorder}` }}>
                      <span className="text-[12.5px] font-bold" style={{ color: C.primary }}>Notificações</span>
                      {(notifs || []).length > 0 && (
                        <button onClick={() => setNotifs([])} className="text-[10.5px]" style={{ color: C.dim }}>limpar</button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {(notifs || []).length === 0 ? (
                        <p className="px-4 py-6 text-center text-[11.5px]" style={{ color: "#454545" }}>nenhuma notificação ainda</p>
                      ) : (
                        (notifs || []).slice(0, 40).map((n) => {
                          const d = new Date(n.date);
                          return (
                            <div key={n.id} className="flex items-start gap-2.5 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <FlaskConical size={13} color={C.accent} className="mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-[12px] leading-snug" style={{ color: C.primary }}>{n.text}</p>
                                <p className="text-[10px] mt-0.5" style={{ color: C.dim }}>
                                  {d.toLocaleDateString("pt-BR")} {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <button onClick={() => { setNotifOpen(false); setTab("testes"); }} className="w-full py-2.5 text-[11.5px] font-semibold" style={{ color: C.accent, borderTop: `1px solid ${C.cardBorder}` }}>
                      Ir para Testes →
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setModal(blank())}
              className="flex items-center gap-1.5 text-[12.5px] font-bold px-3.5 sm:px-4 py-2 rounded-full shrink-0"
              style={{ background: C.accent, color: "#0A0A0A", boxShadow: `0 6px 18px -6px ${C.glow}` }}
            >
              <Plus size={15} /> <span className="hidden sm:inline">Novo material</span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 flex-1">
          {info.hint && <p className="text-[12px] mb-4 -mt-1" style={{ color: C.dim }}>{info.hint}</p>}

          {tab === "dashboard" ? (
            <DashboardTab items={items} experts={experts} tests={tests} funilState={funilState} onGo={go} onAdd={() => setModal(blank())} />
          ) : tab === "producao" ? (
            <ProducaoTab items={items} experts={experts} globalSearch={globalSearch} onAdd={() => setModal(blank())} onEdit={setModal} onDelete={remove} onNewExpert={() => setExpertModal({})} onEditExpert={(ex) => setExpertModal(ex)} />
          ) : tab === "funil" ? (
            <FunilAtualTab experts={experts} items={items} funilState={funilState} setFunilState={setFunilState} slotLog={slotLog} setSlotLog={setSlotLog} onSetPagina={setItemPagina} />
          ) : (
            <TestesTab tests={tests} items={items} experts={experts} onAdd={() => setTestModal({})} onEdit={setTestModal} onDelete={removeTest} onUpdate={updateTest} />
          )}
        </main>
      </div>

      {modal && <ItemModal initial={modal} experts={experts} items={items} onSave={save} onClose={() => setModal(null)} />}
      {testModal && <TesteModal initial={testModal} experts={experts} items={items} onSave={saveTest} onCreateLead={createLeadInline} onClose={() => setTestModal(null)} />}
      {expertModal && <ExpertModal initial={expertModal.id ? expertModal : null} items={items} onSave={saveExpert} onDelete={removeExpert} onClose={() => setExpertModal(null)} />}
    </div>
  );
}
