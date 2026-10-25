const HOUR = 3600_000;
const DAY = 24 * HOUR;
const TZ_MS = 7 * HOUR; /* giờ Việt Nam */
const VERDICTS = ['AC', 'WA', 'TLE', 'MLE', 'RE', 'CE'];

const startOfDay = (ms) => Math.floor((ms + TZ_MS) / DAY) * DAY - TZ_MS;
const pad = (n) => String(n).padStart(2, '0');
const dayLabel = (ms) => {
  const d = new Date(ms + TZ_MS);
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
};

/* Khoảng thời gian của dashboard: [from, to) và khoảng liền trước cùng độ dài để so sánh. */
export function rangeOf(range, now = Date.now()) {
  const today = startOfDay(now);
  const days = range === '30d' ? 30 : range === '7d' ? 7 : 1;
  const from = today - (days - 1) * DAY;
  return { from, to: now, prevFrom: from - days * DAY, prevTo: from, days };
}

export function createAdminStats(db, catalog) {
  const q = (sql) => db.prepare(sql);
  const countUsers = q("SELECT COUNT(*) AS n FROM users WHERE role = 'student'");
  const newUsers = q("SELECT COUNT(*) AS n FROM users WHERE role = 'student' AND created_at >= ?");
  const subsIn = q("SELECT verdict, created_at FROM submissions WHERE created_at >= ? AND created_at < ? AND verdict NOT IN ('PENDING', 'IE')");
  const subsCount = q('SELECT COUNT(*) AS n FROM submissions WHERE created_at >= ? AND created_at < ?');
  const active = q('SELECT COUNT(*) AS n FROM users WHERE last_seen >= ?');
  const triedSolved = q(`
    SELECT problem_id, COUNT(DISTINCT user_id) AS tried,
           COUNT(DISTINCT CASE WHEN verdict = 'AC' THEN user_id END) AS solved
    FROM submissions WHERE verdict NOT IN ('PENDING', 'IE') GROUP BY problem_id`);
  const acPairs = q("SELECT DISTINCT s.user_id, s.problem_id FROM submissions s JOIN users u ON u.id = s.user_id WHERE s.verdict = 'AC' AND u.role = 'student'");
  const feed = q(`
    SELECT s.id, s.problem_id, s.verdict, s.created_at, u.username, u.full_name AS fullName, u.avatar FROM submissions s JOIN users u ON u.id = s.user_id
    ORDER BY s.id DESC LIMIT 10`);

  function series(range, rows, r) {
    if (range === 'today') {
      const vals = Array(24).fill(0);
      for (const s of rows) vals[Math.floor((s.created_at - r.from) / HOUR)] += 1;
      return { unit: 'giờ', vals, labels: ['0h', '6h', '12h', '18h', '23h'] };
    }
    const vals = Array(r.days).fill(0);
    for (const s of rows) vals[Math.floor((s.created_at - r.from) / DAY)] += 1;
    const step = Math.max(1, Math.floor((r.days - 1) / 4));
    const labels = [];
    for (let i = 0; i < r.days; i += step) labels.push(dayLabel(r.from + i * DAY));
    return { unit: 'ngày', vals, labels };
  }

  function setCompletion() {
    const students = countUsers.get().n;
    const solvedBy = new Map();
    for (const { user_id, problem_id } of acPairs.all()) {
      if (!solvedBy.has(user_id)) solvedBy.set(user_id, new Set());
      solvedBy.get(user_id).add(problem_id);
    }
    return new Map(
      catalog.sets.map((s) => {
        const pids = s.problems;
        const done = pids.length ? [...solvedBy.values()].filter((set) => pids.every((p) => set.has(p))).length : 0;
        return [s.id, students ? Math.round((done / students) * 100) : 0];
      }),
    );
  }

  return {
    setCompletion,

    dashboard(range) {
      const r = rangeOf(range);
      const rows = subsIn.all(r.from, r.to);
      const prev = subsIn.all(r.prevFrom, r.prevTo);
      const acRate = (list) => (list.length ? Math.round((list.filter((s) => s.verdict === 'AC').length / list.length) * 100) : 0);
      const dist = VERDICTS.map((v) => ({ verdict: v, n: rows.filter((s) => s.verdict === v).length }));
      const stats = new Map(triedSolved.all().map((x) => [x.problem_id, x]));
      const hardest = [...stats.values()]
        .filter((x) => x.tried >= 2 && catalog.problemMap.has(x.problem_id))
        .map((x) => ({ id: x.problem_id, title: catalog.problemMap.get(x.problem_id).title, tried: x.tried, solved: x.solved, rate: Math.round((x.solved / x.tried) * 100) }))
        .sort((a, b) => a.rate - b.rate || b.tried - a.tried)
        .slice(0, 5);
      const completion = setCompletion();
      return {
        range,
        kpis: {
          users: countUsers.get().n,
          newUsers: newUsers.get(r.from).n,
          submissions: subsCount.get(r.from, r.to).n,
          prevSubmissions: subsCount.get(r.prevFrom, r.prevTo).n,
          acRate: acRate(rows),
          prevAcRate: acRate(prev),
          active: active.get(Date.now() - 15 * 60_000).n,
        },
        series: series(range, rows, r),
        dist,
        hardest,
        setProgress: catalog.sets.slice(0, 6).map((s) => ({ id: s.id, title: s.title, pct: completion.get(s.id) ?? 0 })),
        feed: feed.all().map((f) => ({ ...f, title: catalog.problemMap.get(f.problem_id)?.title ?? f.problem_id })),
      };
    },

    problemStats() {
      return new Map(triedSolved.all().map((x) => [x.problem_id, x]));
    },
  };
}
