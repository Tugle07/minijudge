import crypto from 'node:crypto';

/* Cuộc thi kiểu thi học sinh giỏi: mỗi bài chia nhiều subtask (nhóm test + điểm), đúng hết
 * các test của subtask mới được điểm subtask đó. Điểm một bài = lần nộp có điểm cao nhất. */

export const EVENT_TYPES = [
  'join', 'rejoin', 'fullscreen_exit', 'fullscreen_enter', 'tab_hidden', 'tab_visible', 'blur',
  'multi_screen', 'second_tab', 'paste_blocked', 'devtools_key', 'context_menu', 'finish',
];
/* Các sự kiện tính là vi phạm (đếm trên trang giám sát). */
export const VIOLATIONS = ['fullscreen_exit', 'tab_hidden', 'blur', 'multi_screen', 'second_tab', 'paste_blocked', 'devtools_key'];
const ONLINE_MS = 25_000;
const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* "1-5, 8, 10-12" → [1,2,3,4,5,8,10,11,12]; trả null nếu sai cú pháp hoặc vượt số test. */
export function parseTests(spec, max) {
  const out = new Set();
  for (const part of String(spec || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const m = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b < a || b > max) return null;
    for (let i = a; i <= b; i++) out.add(i);
  }
  return out.size ? [...out].sort((x, y) => x - y) : null;
}

export const defaultSubtasks = (testCount) => [{ name: 'Toàn bộ test', tests: `1-${Math.max(1, testCount)}`, points: 100 }];

/* tests: mảng kết quả từng test theo thứ tự (test i ở vị trí i-1). Bài CE/IE được 0 điểm. */
export function scoreTests(subtasks, tests, verdict) {
  const ok = (i) => tests[i - 1]?.verdict === 'AC';
  const detail = subtasks.map((st) => {
    const list = parseTests(st.tests, Number.MAX_SAFE_INTEGER) || [];
    const passed = verdict !== 'CE' && verdict !== 'IE' && list.length > 0 && list.every(ok);
    return { name: st.name, points: st.points, got: passed ? st.points : 0, passedTests: list.filter(ok).length, tests: list.length };
  });
  return { score: detail.reduce((s, d) => s + d.got, 0), detail };
}

/* Chuẩn hóa code C để so độ giống: bỏ chú thích, chuỗi, khoảng trắng; tên biến → ID, số → N. */
const C_KEYWORDS = new Set(
  'auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while bool true false NULL include define main printf scanf malloc calloc realloc free strlen strcmp strcpy'.split(' '),
);
export function tokenize(src) {
  const code = String(src)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/"(?:\\.|[^"\\])*"/g, ' S ')
    .replace(/'(?:\\.|[^'\\])*'/g, ' S ');
  const toks = code.match(/[A-Za-z_]\w*|\d[\w.]*|==|!=|<=|>=|&&|\|\||\+\+|--|->|[-+*/%=<>!&|^~?:;,.(){}[\]#]/g) || [];
  return toks.map((t) => (/^[A-Za-z_]/.test(t) ? (C_KEYWORDS.has(t) ? t : 'ID') : /^\d/.test(t) ? 'N' : t));
}
const K = 5;
function fingerprints(src) {
  const t = tokenize(src);
  const set = new Set();
  for (let i = 0; i + K <= t.length; i++) set.add(t.slice(i, i + K).join(' '));
  return set;
}
export function similarity(a, b) {
  const A = fingerprints(a);
  const B = fingerprints(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter);
}

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function createContests(db, catalog) {
  const q = {
    all: db.prepare('SELECT * FROM contests ORDER BY start_at DESC, id DESC'),
    get: db.prepare('SELECT * FROM contests WHERE id = ?'),
    problems: db.prepare('SELECT * FROM contest_problems WHERE contest_id = ? ORDER BY position'),
    participant: db.prepare('SELECT * FROM contest_participants WHERE contest_id = ? AND user_id = ?'),
    participants: db.prepare(
      `SELECT p.*, u.username, u.full_name FROM contest_participants p JOIN users u ON u.id = p.user_id WHERE p.contest_id = ? ORDER BY u.username`,
    ),
    lockedProblems: db.prepare(
      `SELECT DISTINCT cp.problem_id FROM contest_problems cp JOIN contests c ON c.id = cp.contest_id
       WHERE c.status = 'published' AND c.end_at > ?`,
    ),
    activeFor: db.prepare(
      `SELECT c.* FROM contests c JOIN contest_participants p ON p.contest_id = c.id
       WHERE p.user_id = ? AND p.finished_at IS NULL AND c.status = 'published' AND c.start_at <= ? AND c.end_at > ?
       ORDER BY c.end_at LIMIT 1`,
    ),
    subForScore: db.prepare('SELECT id, contest_id, problem_id, verdict, tests_json FROM submissions WHERE id = ?'),
    saveScore: db.prepare('UPDATE submissions SET score = ?, subtasks_json = ? WHERE id = ?'),
    best: db.prepare(
      `SELECT user_id, problem_id, MAX(score) AS score, COUNT(*) AS tries FROM submissions
       WHERE contest_id = ? AND verdict != 'PENDING' GROUP BY user_id, problem_id`,
    ),
    bestAt: db.prepare(
      `SELECT s.user_id, s.problem_id, MIN(s.created_at) AS at FROM submissions s
       JOIN (SELECT user_id, problem_id, MAX(score) AS m FROM submissions WHERE contest_id = ? AND verdict != 'PENDING' GROUP BY user_id, problem_id) b
         ON b.user_id = s.user_id AND b.problem_id = s.problem_id AND s.score = b.m
       WHERE s.contest_id = ? GROUP BY s.user_id, s.problem_id`,
    ),
    eventCounts: db.prepare('SELECT user_id, type, COUNT(*) AS n FROM contest_events WHERE contest_id = ? GROUP BY user_id, type'),
    insertEvent: db.prepare('INSERT INTO contest_events (contest_id, user_id, type, detail, at) VALUES (?, ?, ?, ?, ?)'),
  };

  const parse = (row) =>
    row && {
      id: row.id,
      title: row.title,
      description: row.description,
      startAt: row.start_at,
      endAt: row.end_at,
      status: row.status,
      settings: { code: '', ipPrefixes: [], allowUsers: [], publishResults: false, blockMultiScreen: true, ...JSON.parse(row.settings || '{}') },
      createdAt: row.created_at,
    };

  /* upcoming / running / ended theo đồng hồ server; nháp luôn là draft. */
  const phase = (c, now = Date.now()) => (c.status !== 'published' ? 'draft' : now < c.startAt ? 'upcoming' : now < c.endAt ? 'running' : 'ended');

  function problemsOf(contestId) {
    return q.problems.all(contestId).map((r) => {
      const p = catalog.problemMap.get(r.problem_id);
      const subtasks = JSON.parse(r.subtasks || '[]');
      const list = subtasks.length ? subtasks : defaultSubtasks(p?.tests ?? 1);
      return {
        problemId: r.problem_id,
        label: r.label,
        position: r.position,
        title: p?.title ?? r.problem_id,
        tests: p?.tests ?? 0,
        subtasks: list,
        points: list.reduce((s, st) => s + Number(st.points || 0), 0),
        exists: Boolean(p),
      };
    });
  }

  /* Gọi sau khi judge xong một bài nộp: tính điểm theo subtask của bài trong cuộc thi. */
  function scoreSubmission(id) {
    const sub = q.subForScore.get(id);
    if (!sub || sub.contest_id == null || sub.verdict === 'PENDING') return;
    const prob = problemsOf(sub.contest_id).find((p) => p.problemId === sub.problem_id);
    if (!prob) return;
    const { score, detail } = scoreTests(prob.subtasks, JSON.parse(sub.tests_json || '[]'), sub.verdict);
    q.saveScore.run(score, JSON.stringify(detail), id);
  }

  /* Bảng điểm: mỗi thí sinh mỗi bài lấy lần nộp điểm cao nhất; bằng điểm thì ai đạt điểm đó sớm hơn xếp trên. */
  function scoreboard(contestId) {
    const c = get(contestId);
    const problems = problemsOf(contestId);
    const people = q.participants.all(contestId);
    const best = new Map(q.best.all(contestId).map((r) => [`${r.user_id}:${r.problem_id}`, r]));
    const at = new Map(q.bestAt.all(contestId, contestId).map((r) => [`${r.user_id}:${r.problem_id}`, r.at]));
    const rows = people.map((u) => {
      let total = 0;
      let last = 0;
      const cells = problems.map((p) => {
        const b = best.get(`${u.user_id}:${p.problemId}`);
        const score = b?.score ?? null;
        if (score) {
          total += score;
          last = Math.max(last, at.get(`${u.user_id}:${p.problemId}`) || 0);
        }
        return { label: p.label, score, tries: b?.tries ?? 0 };
      });
      return { userId: u.user_id, username: u.username, fullName: u.full_name || '', total, lastAt: last ? last - (c?.startAt ?? 0) : null, cells };
    });
    rows.sort((a, b) => b.total - a.total || (a.lastAt ?? Infinity) - (b.lastAt ?? Infinity) || a.username.localeCompare(b.username));
    let rank = 0;
    rows.forEach((r, i) => {
      if (i === 0 || r.total !== rows[i - 1].total || r.lastAt !== rows[i - 1].lastAt) rank = i + 1;
      r.rank = rank;
    });
    return { problems: problems.map(({ label, title, points, problemId }) => ({ label, title, points, problemId })), rows };
  }

  function monitor(contestId) {
    const now = Date.now();
    const counts = new Map();
    for (const e of q.eventCounts.all(contestId)) {
      const m = counts.get(e.user_id) ?? {};
      m[e.type] = e.n;
      counts.set(e.user_id, m);
    }
    const board = new Map(scoreboard(contestId).rows.map((r) => [r.userId, r]));
    return q.participants.all(contestId).map((p) => {
      const ev = counts.get(p.user_id) ?? {};
      const state = JSON.parse(p.state || '{}');
      return {
        userId: p.user_id,
        username: p.username,
        fullName: p.full_name || '',
        joinedAt: p.joined_at,
        finishedAt: p.finished_at,
        ip: p.ip,
        lastSeen: p.last_seen,
        online: Boolean(p.last_seen && now - p.last_seen < ONLINE_MS && !p.finished_at),
        fullscreen: Boolean(state.fullscreen),
        visible: state.visible !== false,
        extended: Boolean(state.extended),
        events: ev,
        violations: VIOLATIONS.reduce((s, t) => s + (ev[t] || 0), 0),
        total: board.get(p.user_id)?.total ?? 0,
        rank: board.get(p.user_id)?.rank ?? null,
      };
    });
  }

  /* Cặp bài giống nhau: so bài có điểm cao nhất (mới nhất nếu bằng) của từng người, cùng một bài thi. */
  function similar(contestId, threshold = 0.8) {
    const finals = db
      .prepare(
        `SELECT s.id, s.user_id, u.username, s.problem_id, s.source, s.score FROM submissions s JOIN users u ON u.id = s.user_id
         WHERE s.contest_id = ? AND s.verdict NOT IN ('PENDING', 'CE', 'IE')
         ORDER BY s.user_id, s.problem_id, s.score DESC, s.id DESC`,
      )
      .all(contestId);
    const pick = new Map();
    for (const s of finals) if (!pick.has(`${s.user_id}:${s.problem_id}`)) pick.set(`${s.user_id}:${s.problem_id}`, s);
    const byProblem = new Map();
    for (const s of pick.values()) byProblem.set(s.problem_id, [...(byProblem.get(s.problem_id) ?? []), s]);
    const labels = new Map(problemsOf(contestId).map((p) => [p.problemId, p.label]));
    const pairs = [];
    for (const [pid, list] of byProblem) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const sim = similarity(list[i].source, list[j].source);
          if (sim >= threshold) {
            pairs.push({
              label: labels.get(pid) ?? pid,
              problemId: pid,
              similarity: Math.round(sim * 100),
              a: { username: list[i].username, submissionId: list[i].id, score: list[i].score },
              b: { username: list[j].username, submissionId: list[j].id, score: list[j].score },
            });
          }
        }
      }
    }
    return pairs.sort((x, y) => y.similarity - x.similarity);
  }

  function get(id) {
    return parse(q.get.get(Number(id)));
  }

  return {
    LABELS,
    list: () => q.all.all().map(parse),
    get,
    phase,
    problemsOf,
    participant: (contestId, userId) => q.participant.get(contestId, userId),
    /* Cuộc thi đang diễn ra mà người này đã vào phòng và chưa nộp bài kết thúc. */
    activeFor: (userId, now = Date.now()) => parse(q.activeFor.get(userId, now, now)),
    /* Bài đang nằm trong cuộc thi chưa kết thúc: ẩn khỏi phần luyện tập để không lộ đề. */
    lockedProblemIds: () => new Set(q.lockedProblems.all(Date.now()).map((r) => r.problem_id)),
    logEvent: (contestId, userId, type, detail = '') => q.insertEvent.run(contestId, userId, type, String(detail).slice(0, 300), Date.now()),
    scoreSubmission,
    scoreboard,
    monitor,
    similar,
  };
}
