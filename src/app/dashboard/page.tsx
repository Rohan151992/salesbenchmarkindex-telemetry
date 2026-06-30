"use client";

import { useEffect, useMemo, useState } from "react";

type Bucket = "day" | "week" | "month";

type Stats = {
  ok: boolean;
  bucket: Bucket;
  skill: string | null;
  summary: { total: number; skills: number; first_day: string | null; last_day: string | null };
  series: { period: string; count: number }[];
  skills: { skill: string; count: number }[];
  error?: string;
  detail?: string;
};

export default function Dashboard() {
  const [bucket, setBucket] = useState<Bucket>("day");
  const [skill, setSkill] = useState<string>("");
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    const qs = new URLSearchParams({ bucket });
    if (skill) qs.set("skill", skill);
    fetch(`/api/stats?${qs.toString()}`)
      .then((r) => r.json())
      .then((j: Stats) => {
        if (cancelled) return;
        if (!j.ok) throw new Error(j.detail || j.error || "failed to load");
        setData(j);
      })
      .catch((e) => !cancelled && setErr(String(e.message || e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [bucket, skill]);

  const maxCount = useMemo(
    () => Math.max(1, ...(data?.series.map((d) => d.count) ?? [0])),
    [data]
  );

  const maxSkill = useMemo(
    () => Math.max(1, ...(data?.skills.map((s) => s.count) ?? [0])),
    [data]
  );

  return (
    <main style={S.main}>
      <header style={S.header}>
        <div>
          <h1 style={S.h1}>Skill Usage Over Time</h1>
          <p style={S.sub}>SBI Growth · dreamscape.skill_usage</p>
        </div>
      </header>

      <section style={S.controls}>
        <div style={S.segment}>
          {(["day", "week", "month"] as Bucket[]).map((b) => (
            <button
              key={b}
              onClick={() => setBucket(b)}
              style={{ ...S.segBtn, ...(bucket === b ? S.segBtnActive : {}) }}
            >
              {b[0].toUpperCase() + b.slice(1)}
            </button>
          ))}
        </div>

        <select value={skill} onChange={(e) => setSkill(e.target.value)} style={S.select}>
          <option value="">All skills</option>
          {data?.skills.map((s) => (
            <option key={s.skill} value={s.skill}>
              {s.skill} ({s.count})
            </option>
          ))}
        </select>
      </section>

      {data && (
        <section style={S.cards}>
          <Card label="Total events" value={data.summary.total.toLocaleString()} />
          <Card label="Distinct skills" value={String(data.summary.skills)} />
          <Card
            label="Date range"
            value={
              data.summary.first_day
                ? `${data.summary.first_day} → ${data.summary.last_day}`
                : "—"
            }
            small
          />
        </section>
      )}

      <section style={S.chartCard}>
        {loading && <p style={S.muted}>Loading…</p>}
        {err && <p style={S.error}>Error: {err}</p>}
        {!loading && !err && data && data.series.length === 0 && (
          <p style={S.muted}>No usage recorded yet.</p>
        )}
        {!loading && !err && data && data.series.length > 0 && (
          <div style={S.chart}>
            {data.series.map((d) => (
              <div key={d.period} style={S.barCol} title={`${d.period}: ${d.count}`}>
                <span style={S.barValue}>{d.count}</span>
                <div
                  style={{
                    ...S.bar,
                    height: `${(d.count / maxCount) * 220 + 4}px`,
                  }}
                />
                <span style={S.barLabel}>{d.period}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {!loading && !err && data && data.skills.length > 0 && (
        <section style={S.breakdownCard}>
          <h2 style={S.h2}>Skill breakdown</h2>
          <div style={S.breakdownList}>
            {data.skills.map((s) => (
              <button
                key={s.skill}
                onClick={() => setSkill(skill === s.skill ? "" : s.skill)}
                style={{
                  ...S.breakdownRow,
                  ...(skill === s.skill ? S.breakdownRowActive : {}),
                }}
                title={`Filter chart by ${s.skill}`}
              >
                <span style={S.breakdownName}>{s.skill}</span>
                <span style={S.breakdownTrack}>
                  <span
                    style={{ ...S.breakdownFill, width: `${(s.count / maxSkill) * 100}%` }}
                  />
                </span>
                <span style={S.breakdownCount}>{s.count}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Card({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div style={S.card}>
      <div style={S.cardLabel}>{label}</div>
      <div style={{ ...S.cardValue, ...(small ? { fontSize: "1rem" } : {}) }}>{value}</div>
    </div>
  );
}

const ACCENT = "#2563eb";
const S: Record<string, React.CSSProperties> = {
  main: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    maxWidth: 1000,
    margin: "0 auto",
    padding: "2rem 1.5rem 4rem",
    color: "#0f172a",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  h1: { fontSize: "1.6rem", margin: 0 },
  sub: { color: "#64748b", margin: "0.25rem 0 0", fontSize: "0.9rem" },
  controls: { display: "flex", gap: "1rem", margin: "1.5rem 0", flexWrap: "wrap" },
  segment: { display: "inline-flex", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" },
  segBtn: {
    padding: "0.5rem 1rem",
    border: "none",
    background: "#fff",
    cursor: "pointer",
    fontSize: "0.9rem",
    color: "#334155",
  },
  segBtnActive: { background: ACCENT, color: "#fff" },
  select: {
    padding: "0.5rem 0.75rem",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    fontSize: "0.9rem",
    background: "#fff",
    minWidth: 200,
  },
  cards: { display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" },
  card: {
    flex: "1 1 180px",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "1rem 1.25rem",
    background: "#fff",
  },
  cardLabel: { color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.03em" },
  cardValue: { fontSize: "1.5rem", fontWeight: 600, marginTop: "0.35rem" },
  chartCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "1.5rem",
    background: "#fff",
    overflowX: "auto",
  },
  chart: { display: "flex", alignItems: "flex-end", gap: "0.5rem", minHeight: 280, paddingTop: "1rem" },
  barCol: { display: "flex", flexDirection: "column", alignItems: "center", flex: "1 0 28px", minWidth: 28 },
  bar: { width: "70%", maxWidth: 40, background: ACCENT, borderRadius: "4px 4px 0 0", transition: "height 0.2s" },
  barValue: { fontSize: "0.75rem", color: "#334155", marginBottom: 4 },
  barLabel: {
    fontSize: "0.7rem",
    color: "#64748b",
    marginTop: 6,
    transform: "rotate(-45deg)",
    whiteSpace: "nowrap",
    transformOrigin: "center",
  },
  muted: { color: "#64748b" },
  error: { color: "#dc2626" },
  h2: { fontSize: "1.1rem", margin: "0 0 1rem" },
  breakdownCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "1.5rem",
    background: "#fff",
    marginTop: "1.5rem",
  },
  breakdownList: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  breakdownRow: {
    display: "grid",
    gridTemplateColumns: "220px 1fr 48px",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.4rem 0.5rem",
    border: "1px solid transparent",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    font: "inherit",
    color: "#0f172a",
  },
  breakdownRowActive: { borderColor: ACCENT, background: "#eff6ff" },
  breakdownName: {
    fontSize: "0.85rem",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  breakdownTrack: { background: "#f1f5f9", borderRadius: 6, height: 16, overflow: "hidden" },
  breakdownFill: { display: "block", height: "100%", background: ACCENT, borderRadius: 6 },
  breakdownCount: { fontSize: "0.85rem", fontWeight: 600, textAlign: "right", color: "#334155" },
};
