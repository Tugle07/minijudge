import { Router } from 'express';

/* Trang chủ (các khối), danh sách bài trong khối, nội dung một bài. Sinh viên chỉ thấy khối
 * đang mở/đã đóng và bài đã xuất bản. Tất cả cần đăng nhập. */
export function catalogRoutes({ db, catalog, stats, auth, settings }) {
  const r = Router();
  r.use(auth.requireUser);

  const ac = (pids, mine) => pids.filter((pid) => mine.get(pid) === 'ac').length;
  const publicSet = ({ problems, ...meta }, pids, mine) => ({ ...meta, count: pids.length, ac: ac(pids, mine) });

  const getCoursesMeta = () => {
    try {
      if (!db) return {};
      const row = db.prepare("SELECT value FROM settings WHERE key = 'course_meta'").get();
      return row && row.value ? JSON.parse(row.value) : {};
    } catch {
      return {};
    }
  };

  r.get('/home', (req, res) => {
    const mine = stats.myProblemStatus(req.user.id);
    const solved = [...mine.values()].filter((v) => v === 'ac').length;
    res.json({
      summary: { solved, tried: mine.size, streak: stats.streak(req.user.id) },
      banner: settings.banner,
      sets: catalog.visibleSets().map((s) => publicSet(s, catalog.visibleProblems(s), mine)),
      coursesMeta: getCoursesMeta(),
    });
  });

  r.get('/sets/:id', (req, res) => {
    const set = catalog.setMap.get(req.params.id);
    if (!set || !catalog.isSetVisible(set)) return res.status(404).json({ error: 'Không tìm thấy khối bài' });
    const pids = catalog.visibleProblems(set);
    const mine = stats.myProblemStatus(req.user.id);
    const { classSize, solved } = stats.classStats();
    const { rows: leaderboard, myRank } = stats.setLeaderboard(pids, req.user.id);
    res.json({
      set: { ...publicSet(set, pids, mine), classSize },
      problems: pids.map((pid) => {
        const p = catalog.problemMap.get(pid);
        const n = solved.get(pid) || 0;
        return {
          id: p.id,
          title: p.title,
          difficulty: p.difficulty,
          solved: n,
          acRate: classSize ? Math.round((n / classSize) * 100) : 0,
          my: mine.get(pid) || '',
        };
      }),
      leaderboard,
      myRank,
    });
  });

  r.get('/courses/:name/leaderboard', (req, res) => {
    const courseName = decodeURIComponent(req.params.name).trim();
    const isAdmin = req.user.role === 'admin';
    const courseSets = (isAdmin ? catalog.sets : catalog.visibleSets()).filter(
      (s) => (s.group || '').trim() === courseName
    );
    if (!courseSets.length) return res.status(404).json({ error: 'Không tìm thấy khóa học' });
    const pids = [...new Set(courseSets.flatMap((s) => (isAdmin ? s.problems : catalog.visibleProblems(s))))];
    const { rows: leaderboard, myRank } = stats.setLeaderboard(pids, req.user.id);
    const { classSize } = stats.classStats();
    res.json({
      course: courseName,
      totalSets: courseSets.length,
      totalProblems: pids.length,
      classSize,
      leaderboard,
      myRank,
    });
  });

  r.get('/problems/:id', (req, res) => {
    const p = catalog.problemMap.get(req.params.id);
    const isAdmin = req.user.role === 'admin';
    if (!p || (!isAdmin && !catalog.isProblemVisible(p))) return res.status(404).json({ error: 'Không tìm thấy đề' });
    stats.recordProblemView(req.user.id, p.id);
    const set = catalog.sets.find((s) => (isAdmin || catalog.isSetVisible(s)) && s.problems.includes(p.id));
    const { root, solution, ...pub } = p;
    res.json({
      ...pub,
      set: set ? { id: set.id, short: set.short, title: set.title } : null,
      my: stats.myProblemStatus(req.user.id).get(p.id) || '',
      allowedLangs: settings.allowedLangs,
    });
  });

  return r;
}
