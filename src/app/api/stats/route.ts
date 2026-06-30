import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Bucket = "day" | "week" | "month";

const BUCKETS: Record<Bucket, string> = {
  day: "day",
  week: "week",
  month: "month",
};

// Usage timestamp: prefer when the skill ran (event_ts), fall back to ingest time.
const TS = "COALESCE(event_ts, received_at)";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const bucketParam = (url.searchParams.get("bucket") ?? "day").toLowerCase();
  const bucket: Bucket = (["day", "week", "month"].includes(bucketParam)
    ? bucketParam
    : "day") as Bucket;
  const skill = url.searchParams.get("skill")?.trim() || null;

  const trunc = BUCKETS[bucket];
  const where = skill ? `WHERE skill = $1` : "";
  const params = skill ? [skill] : [];

  const seriesSql = `
    SELECT to_char(date_trunc('${trunc}', ${TS}), 'YYYY-MM-DD') AS period,
           count(*)::int AS count
    FROM dreamscape.skill_usage
    ${where}
    GROUP BY 1
    ORDER BY 1
  `;

  const topSkillsSql = `
    SELECT skill, count(*)::int AS count
    FROM dreamscape.skill_usage
    GROUP BY skill
    ORDER BY count DESC, skill
  `;

  const summarySql = `
    SELECT count(*)::int AS total,
           count(DISTINCT skill)::int AS skills,
           to_char(min(${TS}), 'YYYY-MM-DD') AS first_day,
           to_char(max(${TS}), 'YYYY-MM-DD') AS last_day
    FROM dreamscape.skill_usage
  `;

  try {
    const pool = getPool();
    const [series, topSkills, summary] = await Promise.all([
      pool.query(seriesSql, params),
      pool.query(topSkillsSql),
      pool.query(summarySql),
    ]);

    return NextResponse.json({
      ok: true,
      bucket,
      skill,
      summary: summary.rows[0] ?? { total: 0, skills: 0, first_day: null, last_day: null },
      series: series.rows,
      skills: topSkills.rows,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: "stats failed", detail }, { status: 500 });
  }
}
