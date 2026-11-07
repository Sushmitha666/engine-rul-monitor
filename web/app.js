const { createElement: h, useState, useEffect, useRef, useMemo } = React;
const COL = { bad: "#ff4d5e", warn: "#ff9d2e", ok: "#5ce1e6" };
const level = (r, T) => r < T ? "bad" : r < T * 2 ? "warn" : "ok";
const LABEL = { bad: "Service now", warn: "Plan service", ok: "Healthy" };

function demoData() {
  let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const engines = Array.from({ length: 100 }, (_, i) => { const t = Math.round(7 + rnd() * 118);
    return { unit: i + 1, true_rul: t, pred_rul: Math.max(0, +(t + (rnd() - .5) * 30).toFixed(1)) }; });
  return { demo: true, engines, models: { "Mean baseline": { test_rmse: 43 }, "Linear regression": { test_rmse: 21.7 }, LightGBM: { test_rmse: 17.8 }, improvement_vs_baseline_pct: 58.8 }, alerts: {} };
}
function useCount(v, dec = 0) {
  const [n, setN] = useState(0);
  useEffect(() => { let f, t0; const go = t => { t0 = t0 || t; const k = Math.min(1, (t - t0) / 1100); setN(v * (1 - Math.pow(1 - k, 3))); if (k < 1) f = requestAnimationFrame(go); }; f = requestAnimationFrame(go); return () => cancelAnimationFrame(f); }, [v]);
  return n.toFixed(dec);
}
function Scramble({ text }) {
  const [t, setT] = useState(text);
  useEffect(() => { let i = 0; const id = setInterval(() => { i += 1.2;
    setT(text.split("").map((c, k) => c === " " || k < i ? c : "ABCDEFGHJKLMNPRSTUVWXYZ"[Math.random() * 23 | 0]).join("")); if (i > text.length) clearInterval(id); }, 35); return () => clearInterval(id); }, [text]);
  return t;
}
function Fan({ rul, T }) {
  const ref = useRef(), live = useRef({ rul, T }); live.current = { rul, T };
  useEffect(() => {
    const c = ref.current, x = c.getContext("2d"), S = 520, N = 20; c.width = c.height = S; let a = 0, f;
    const loop = () => {
      const { rul, T } = live.current, col = COL[level(rul, T)], jit = rul < T ? (Math.random() - .5) * 3.2 : 0;
      a += 0.008 + 0.055 * Math.min(rul, 125) / 125; x.clearRect(0, 0, S, S); x.save(); x.translate(S / 2 + jit, S / 2 + jit);
      const g = x.createRadialGradient(0, 0, 40, 0, 0, 250); g.addColorStop(0, col + "55"); g.addColorStop(1, "transparent");
      x.fillStyle = g; x.beginPath(); x.arc(0, 0, 250, 0, 7); x.fill();
      x.strokeStyle = "#2a3a5c"; x.lineWidth = 12; x.beginPath(); x.arc(0, 0, 232, 0, 7); x.stroke();
      x.strokeStyle = col; x.lineWidth = 2; x.globalAlpha = .6; x.beginPath(); x.arc(0, 0, 222, 0, 7); x.stroke(); x.globalAlpha = 1;
      for (let i = 0; i < N; i++) { x.save(); x.rotate(a + i * Math.PI * 2 / N); x.beginPath(); x.moveTo(34, -6); x.quadraticCurveTo(120, -42, 218, -14);
        x.lineTo(218, 6); x.quadraticCurveTo(120, -8, 34, 10); x.closePath(); x.globalAlpha = .2; x.fillStyle = col; x.fill(); x.globalAlpha = .85; x.strokeStyle = col; x.lineWidth = 1.4; x.stroke(); x.restore(); }
      x.fillStyle = "#0a1020"; x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 38, 0, 7); x.fill(); x.stroke();
      x.rotate(-a * 1.5); x.lineWidth = 2; for (let i = 0; i < 3; i++) { x.rotate(Math.PI * 2 / 3); x.beginPath(); x.moveTo(0, 0); x.lineTo(30, 0); x.stroke(); }
      x.restore(); f = requestAnimationFrame(loop);
    }; loop(); return () => cancelAnimationFrame(f);
  }, []);
  return h("canvas", { ref });
}
function Gauge({ v, col }) {
  const R = 54, C = 2 * Math.PI * R;
  return h("svg", { width: 140, height: 140, viewBox: "0 0 140 140" },
    h("circle", { cx: 70, cy: 70, r: R, fill: "none", stroke: "#1c2840", strokeWidth: 12 }),
    h("circle", { cx: 70, cy: 70, r: R, fill: "none", stroke: col, strokeWidth: 12, strokeLinecap: "round", strokeDasharray: C, strokeDashoffset: C * (1 - Math.min(v, 125) / 125), transform: "rotate(-90 70 70)", style: { transition: "stroke-dashoffset .8s, stroke .4s" } }),
    h("text", { x: 70, y: 74, textAnchor: "middle", style: { fill: "#fff", font: "900 34px 'Big Shoulders Display'" } }, Math.round(v)),
    h("text", { x: 70, y: 94, textAnchor: "middle" }, "cycles left"));
}
function Scatter({ engines, T, sel, onPick }) {
  const P = 44, W = 440, m = v => P + (v / 140) * (W - P - 10), my = v => W - P - (v / 140) * (W - P - 10);
  return h("svg", { viewBox: `0 0 ${W} ${W}`, style: { width: "100%" } },
    [0, 35, 70, 105, 140].map(t => h("g", { key: t }, h("line", { x1: m(t), x2: m(t), y1: my(0), y2: my(140), stroke: "#16223a" }), h("line", { y1: my(t), y2: my(t), x1: m(0), x2: m(140), stroke: "#16223a" }),
      h("text", { x: m(t), y: W - 14, textAnchor: "middle" }, t), h("text", { x: P - 8, y: my(t) + 4, textAnchor: "end" }, t))),
    h("line", { x1: m(0), y1: my(0), x2: m(140), y2: my(140), stroke: "#c9d3e0", strokeDasharray: "4 5", opacity: .5 }),
    h("line", { x1: m(T), x2: m(T), y1: my(0), y2: my(140), stroke: COL.warn, strokeDasharray: "2 4" }),
    h("line", { y1: my(T), y2: my(T), x1: m(0), x2: m(140), stroke: COL.warn, strokeDasharray: "2 4" }),
    engines.map(e => h("circle", { key: e.unit, cx: m(e.true_rul), cy: my(e.pred_rul), r: sel && sel.unit === e.unit ? 8 : 4.5, fill: COL[level(e.pred_rul, T)], opacity: .85, stroke: sel && sel.unit === e.unit ? "#fff" : "none", strokeWidth: 2, style: { cursor: "pointer" }, onClick: () => onPick(e) })),
    h("text", { x: W / 2, y: W - 1, textAnchor: "middle" }, "true cycles left"), h("text", { transform: "rotate(-90)", x: -W / 2, y: 11, textAnchor: "middle" }, "predicted cycles left"));
}
function Kpi({ v, dec, suf, label }) { const n = useCount(v, dec); return h("div", { className: "kpi" }, h("b", null, n + suf), h("span", null, label)); }

function App() {
  const PAGES = ["overview", "fleet", "analysis"], tabs = [["overview", "Overview"], ["fleet", "Fleet"], ["analysis", "Model"]];
  const [d, setD] = useState(null), [sel, setSel] = useState(null), [T, setT] = useState(30);
  const [page, setPage] = useState(() => PAGES.includes(location.hash.slice(1)) ? location.hash.slice(1) : "overview");
  const go = p => { location.hash = p; window.scrollTo(0, 0); };
  useEffect(() => { const f = () => setPage(PAGES.includes(location.hash.slice(1)) ? location.hash.slice(1) : "overview"); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  useEffect(() => { fetch("results.json").then(r => r.json()).then(setD).catch(() => setD(demoData())); }, []);
  useEffect(() => { const mv = e => { const c = e.target.closest && e.target.closest(".card"); if (!c) return; const r = c.getBoundingClientRect(); c.style.setProperty("--mx", e.clientX - r.left + "px"); c.style.setProperty("--my", e.clientY - r.top + "px"); };
    window.addEventListener("mousemove", mv); return () => window.removeEventListener("mousemove", mv); }, []);
  const E = d ? d.engines : [];
  const worst = useMemo(() => E.length ? [...E].sort((a, b) => a.pred_rul - b.pred_rul)[0] : null, [d]);
  const cur = sel || worst;
  const q = useMemo(() => { const risk = E.filter(e => e.true_rul <= T), fl = E.filter(e => e.pred_rul < T), tp = risk.filter(e => e.pred_rul < T).length;
    return { risk: risk.length, fl: fl.length, tp, fa: fl.length - tp, rec: risk.length ? tp / risk.length * 100 : 0, pre: fl.length ? tp / fl.length * 100 : 0 }; }, [d, T]);
  if (!d) return h("p", { style: { padding: 40 } }, "Loading fleet data…");
  const m = d.models, mx = Math.max(...["Mean baseline", "Linear regression", "LightGBM"].map(k => m[k].test_rmse));
  const queue = [...E].sort((a, b) => a.pred_rul - b.pred_rul).filter(e => e.pred_rul < T);
  return h("div", { className: "wrap" },
    h("nav", null, h("div", { className: "logo" }, "ENGINE", h("i", null, "/"), "RUL"), h("div", { className: "tabs", role: "tablist" }, tabs.map(([k, l]) => h("button", { key: k, role: "tab", "aria-selected": page === k, className: "tab" + (page === k ? " on" : ""), onClick: () => go(k) }, l))), h("div", { className: "live" }, h("b"), "NASA C-MAPSS FD001 · 100 test engines")),
    d.demo && h("p", { className: "demo" }, "Demo data shown. Run python src/train.py to load your real results."),
    page === "overview" && h("section", { className: "hero" },
      h("div", null, h("h1", null, h(Scramble, { text: "Know when an engine will fail." })),
        h("p", { className: "sub" }, "A LightGBM model reads 14 sensors and predicts how many flight cycles each turbofan has left, then flags the ones that need service first."),
        h("div", { className: "kpis" }, h(Kpi, { v: m.LightGBM.test_rmse, dec: 1, suf: "", label: "RMSE in cycles" }), h(Kpi, { v: m.improvement_vs_baseline_pct, dec: 0, suf: "%", label: "better than baseline" }), h(Kpi, { v: q.rec, dec: 0, suf: "%", label: `at-risk engines caught (<${T})` }))),
      h("div", { className: "fan" }, h(Fan, { rul: cur.pred_rul, T }), h("div", { className: "tag" }, `Engine ${cur.unit}: ${Math.round(cur.pred_rul)} cycles left · ${LABEL[level(cur.pred_rul, T)]}`))),
    page === "overview" && queue.length > 0 && h("div", { className: "ticker" }, h("div", null, queue.concat(queue).map((e, i) => h("span", { key: i }, h("em", null, "Engine " + e.unit), ` ${Math.round(e.pred_rul)} cycles left`)))),
    page !== "overview" && h("div", { className: "grid", key: page },
      page === "fleet" && h("div", { className: "card s7 tall" }, h("h2", null, "Fleet health"), h("div", { className: "mut" }, "Each square is one engine. Pulsing squares are flagged. Click one to inspect it."),
        h("div", { className: "matrix" }, E.map(e => { const l = level(e.pred_rul, T);
          return h("button", { key: e.unit, className: "cell" + (cur.unit === e.unit ? " sel" : "") + (l === "bad" ? " fl" : ""), style: { background: COL[l] }, onClick: () => setSel(e), title: `Engine ${e.unit}` }, e.unit); })),
        h("div", { className: "legend" }, ["bad", "warn", "ok"].map(k => h("span", { key: k }, h("i", { style: { background: COL[k] } }), LABEL[k])))),
      page === "fleet" && h("div", { className: "card s5" }, h("h2", null, `Engine ${cur.unit}`), h("div", { className: "mut" }, "Prediction against the true value"),
        h("div", { className: "gauge" }, h(Gauge, { v: cur.pred_rul, col: COL[level(cur.pred_rul, T)] }),
          h("dl", null, h("dt", null, "Predicted"), h("dd", null, cur.pred_rul + " cycles"), h("dt", null, "True"), h("dd", null, cur.true_rul + " cycles"),
            h("dt", null, "Error"), h("dd", null, Math.abs(cur.pred_rul - cur.true_rul).toFixed(1) + " cycles"), h("dt", null, "Status"), h("dd", { style: { color: COL[level(cur.pred_rul, T)] } }, LABEL[level(cur.pred_rul, T)])))),
      page === "fleet" && h("div", { className: "card s5" }, h("h2", null, "Alert threshold"), h("div", { className: "mut" }, `Flag engines predicted to have fewer than ${T} cycles left. Drag to see the trade-off.`),
        h("input", { type: "range", min: 10, max: 80, value: T, onChange: e => setT(+e.target.value), "aria-label": "Alert threshold in cycles" }),
        h("div", { className: "st" }, h("div", null, h("b", null, q.tp + "/" + q.risk), h("span", { className: "mut" }, "at-risk caught")), h("div", null, h("b", null, q.fa), h("span", { className: "mut" }, "false alarms")), h("div", null, h("b", null, q.pre.toFixed(0) + "%"), h("span", { className: "mut" }, "alerts correct")))),
      page === "analysis" && h("div", { className: "card s7" }, h("h2", null, "Predicted vs true"), h("div", { className: "mut" }, "Points on the dashed diagonal are perfect predictions."),
        h(Scatter, { engines: E, T, sel: cur, onPick: setSel })),
      page === "analysis" && h("div", { className: "card s5" }, h("h2", null, "Each model beats the one before it"), h("div", { className: "mut" }, "Test RMSE in cycles on the last cycle of each test engine. Lower is better."),
        h("div", { className: "bars" }, ["Mean baseline", "Linear regression", "LightGBM"].map((k, i) => h("div", { className: "row", key: k }, h("span", null, k),
          h("div", { className: "bar" }, h("i", { style: { width: m[k].test_rmse / mx * 100 + "%", background: i === 2 ? COL.warn : "#3a4b70" } })), h("b", null, m[k].test_rmse.toFixed(1)))))))
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(h(App));
