import { Router } from 'express';

/* Trang chủ (các khối), danh sách bài trong khối, nội dung một bài. Sinh viên chỉ thấy khối
 * đang mở/đã đóng và bài đã xuất bản. Tất cả cần đăng nhập. */
export function catalogRoutes({ catalog, stats, auth, settings }) {
  const r = Router();
  r.use(auth.requireUser);

  const ac = (pids, mine) => pids.filter((pid) => mine.get(pid) === 'ac').length;
  const publicSet = ({ problems, ...meta }, pids, mine) => ({ ...meta, count: pids.length, ac: ac(pids, mine) });

  r.get('/home', (req, res) => {
    const mine = stats.myProblemStatus(req.user.id);
    const solved = [...mine.values()].filter((v) => v === 'ac').length;
    res.json({
      summary: { solved, tried: mine.size, streak: stats.streak(req.user.id) },
      banner: settings.banner,
      sets: catalog.visibleSets().map((s) => publicSet(s, catalog.visibleProblems(s), mine)),
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

  r.get('/problems/:id', (req, res) => {
    const p = catalog.problemMap.get(req.params.id);
    const isAdmin = req.user.role === 'admin';
    if (!p || (!isAdmin && !catalog.isProblemVisible(p))) return res.status(404).json({ error: 'Không tìm thấy đề' });
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
