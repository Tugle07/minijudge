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
    const coursesMeta = getCoursesMeta();
    const filteredCoursesMeta = {};
    for (const [name, cm] of Object.entries(coursesMeta)) {
      if (catalog.canListCourse(cm, req.user)) {
        filteredCoursesMeta[name] = cm;
      }
    }
    const visSets = catalog.visibleSets(req.user, coursesMeta);
    res.json({
      summary: { solved, tried: mine.size, streak: stats.streak(req.user.id) },
      banner: settings.banner,
      sets: visSets.map((s) => publicSet(s, catalog.visibleProblems(s, req.user, coursesMeta), mine)),
      coursesMeta: filteredCoursesMeta,
    });
  });

  r.get('/courses/:name', (req, res) => {
    const courseName = decodeURIComponent(req.params.name).trim();
    const coursesMeta = getCoursesMeta();
    const courseMeta = coursesMeta[courseName] || {};
    if (!catalog.canAccessCourse(courseMeta, req.user)) {
      const vis = courseMeta.visibility || 'public';
      if (vis === 'restricted') {
        return res.status(403).json({ error: 'Khóa học này chỉ dành cho tài khoản được chỉ định', code: 'restricted' });
      }
      return res.status(404).json({ error: 'Không tìm thấy khóa học' });
    }
    const isAdmin = req.user.role === 'admin';
    const mine = stats.myProblemStatus(req.user.id);
    const courseSets = (isAdmin ? catalog.sets : catalog.sets.filter((s) => catalog.canAccessSet(s, req.user, coursesMeta)))
      .filter((s) => (s.group || '').trim() === courseName);
    res.json({
      name: courseName,
      meta: courseMeta,
      sets: courseSets.map((s) => publicSet(s, isAdmin ? s.problems : catalog.visibleProblems(s, req.user, coursesMeta), mine)),
    });
  });

  r.get('/courses/:name/leaderboard', (req, res) => {
    const courseName = decodeURIComponent(req.params.name).trim();
    const coursesMeta = getCoursesMeta();
    const courseMeta = coursesMeta[courseName] || {};
    if (!catalog.canAccessCourse(courseMeta, req.user)) {
      return res.status(403).json({ error: 'Không có quyền truy cập khóa học' });
    }
    const isAdmin = req.user.role === 'admin';
    const courseSets = (isAdmin ? catalog.sets : catalog.sets.filter((s) => catalog.canAccessSet(s, req.user, coursesMeta)))
      .filter((s) => (s.group || '').trim() === courseName);
    if (!courseSets.length && !courseMeta.badge) return res.status(404).json({ error: 'Không tìm thấy khóa học' });
    const pids = [...new Set(courseSets.flatMap((s) => (isAdmin ? s.problems : catalog.visibleProblems(s, req.user, coursesMeta))))];
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

  r.get('/sets/:id', (req, res) => {
    const set = catalog.setMap.get(req.params.id);
    const coursesMeta = getCoursesMeta();
    if (!set || !catalog.canAccessSet(set, req.user, coursesMeta)) {
      if (set && set.visibility === 'restricted') {
        return res.status(403).json({ error: 'Khối bài tập này chỉ dành cho tài khoản được chỉ định', code: 'restricted' });
      }
      return res.status(404).json({ error: 'Không tìm thấy khối bài' });
    }
    const isAdmin = req.user.role === 'admin';
    const pids = isAdmin ? set.problems : catalog.visibleProblems(set, req.user, coursesMeta);
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
          visibility: p.visibility,
        };
      }),
      leaderboard,
      myRank,
    });
  });

  r.get('/problems/:id', (req, res) => {
    const p = catalog.problemMap.get(req.params.id);
    const coursesMeta = getCoursesMeta();
    if (!p || !catalog.canAccessProblem(p, req.user, coursesMeta)) {
      if (p && p.visibility === 'restricted') {
        return res.status(403).json({ error: 'Bài tập này chỉ dành cho tài khoản được chỉ định', code: 'restricted' });
      }
      return res.status(404).json({ error: 'Không tìm thấy đề' });
    }
    stats.recordProblemView(req.user.id, p.id);
    const setId = typeof req.query.set === 'string' ? req.query.set.trim() : null;
    const set =
      (setId && catalog.setMap.get(setId)) ||
      catalog.sets.find((s) => catalog.canAccessSet(s, req.user, coursesMeta) && s.problems.includes(p.id));
    const courseMeta = set && set.group ? coursesMeta[set.group] : null;

    let defaultLang = courseMeta?.defaultLang || '';
    if (!defaultLang && courseMeta?.tech) {
      const t = courseMeta.tech.toLowerCase();
      if (t.includes('c++14') || t.includes('cpp14')) defaultLang = 'cpp14';
      else if (t.includes('c++') || t.includes('cpp') || t.includes('g++')) defaultLang = 'cpp';
      else if (t.includes('pypy')) defaultLang = 'pypy3';
      else if (t.includes('py') || t.includes('python')) defaultLang = 'py';
      else if (t.includes('c11') || t.includes('gcc') || /\bc\b/.test(t)) defaultLang = 'c';
    }
    const allowed = settings?.allowedLangs || ['c'];
    if (!defaultLang || !allowed.includes(defaultLang)) {
      defaultLang = allowed[0] || 'c';
    }

    const { root, solution, ...pub } = p;
    res.json({
      ...pub,
      set: set ? { id: set.id, short: set.short, title: set.title, group: set.group } : null,
      course: set?.group ? { name: set.group, defaultLang, tech: courseMeta?.tech || '' } : null,
      my: stats.myProblemStatus(req.user.id).get(p.id) || '',
      allowedLangs: allowed,
      defaultLang,
    });
  });

  return r;
}
