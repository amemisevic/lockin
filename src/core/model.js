// v2 state shape (plan: Data model) and its validator. Unknown extra keys are kept.

export function defaultState() {
  return {
    v: 2,
    settings: { zeroDay: 3, medPerWeek: 2, lastBackup: null },
    tasks: [], taskLog: {}, challenge: null, days: {}, recovery: {}, warLog: {}, pack: null,
  };
}

const isObj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const isStr = x => typeof x === 'string';
const isNum = x => typeof x === 'number' && Number.isFinite(x);
const isBool = x => typeof x === 'boolean';
const isDate = x => isStr(x) && /^\d{4}-\d{2}-\d{2}$/.test(x);
const isTime = x => isStr(x) && /^\d{2}:\d{2}$/.test(x);
const isInt = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const orNull = ok => x => x === null || ok(x);
const oneOf = (...vals) => x => vals.includes(x);
const listOf = ok => x => Array.isArray(x) && x.every(ok);
// Object keyed by date whose values all pass ok.
const byDate = ok => x => isObj(x) && Object.entries(x).every(([k, v]) => isDate(k) && ok(v));
const strs = (o, ...keys) => keys.every(k => isStr(o[k]));
const isResult = oneOf('passed', 'redo', 'reset');

const settingsOk = s => isObj(s) && isInt(s.zeroDay, 2, 5) && isInt(s.medPerWeek, 0, 3) && orNull(isDate)(s.lastBackup);

const taskOk = t => isObj(t) && strs(t, 'id', 'title', 'note')
  && orNull(isTime)(t.start) && orNull(isTime)(t.end) && orNull(isDate)(t.date)
  && isObj(t.repeat) && oneOf('none', 'daily', 'weekdays', 'custom')(t.repeat.type)
  && listOf(d => isInt(d, 0, 6))(t.repeat.days)
  && listOf(isStr)(t.skip) && isBool(t.archived);

const taskLogOk = byDate(day => isObj(day) && Object.values(day).every(oneOf('done', 'failed', 'stalled')));

const protocolOk = p => isObj(p) && strs(p, 'id', 'title') && orNull(isStr)(p.med);
const redLineOk = r => isObj(r) && strs(r, 'id', 'name');
const challengeOk = orNull(c => isObj(c) && isDate(c.startDate) && c.length === 30
  && listOf(protocolOk)(c.protocols) && listOf(redLineOk)(c.redLines) && orNull(isDate)(c.redoUsed));

const morningOk = orNull(m => isObj(m) && isNum(m.at) && strs(m, 'target', 'risk') && listOf(isStr)(m.med));
const afternoonOk = orNull(a => isObj(a) && isNum(a.at) && oneOf('yes', 'no', 'struggling')(a.onTrack) && isStr(a.friction));
const nightOk = orNull(n => isObj(n) && isNum(n.at)
  && listOf(p => isObj(p) && strs(p, 'id', 'title') && oneOf('held', 'missed', 'med')(p.status))(n.protocols)
  && listOf(r => redLineOk(r) && oneOf('held', 'crossed')(r.status))(n.redLines)
  && isStr(n.win) && isObj(n.bottomG) && strs(n.bottomG, 'archetype', 'tactic', 'text')
  && isResult(n.suggested) && orNull(o => isObj(o) && isResult(o.result) && isStr(o.reason))(n.override));
const dayOk = d => isObj(d) && morningOk(d.morning) && afternoonOk(d.afternoon) && nightOk(d.night)
  && isBool(d.declaredRedo) && isStr(d.slipNote) && isBool(d.incompleteMorning)
  && oneOf(null, 'no-night')(d.auto) && orNull(isResult)(d.result) && orNull(isNum)(d.closedAt)
  && !(d.closedAt !== null && d.result === null); // closed without a result cannot be scored

const recoveryOk = byDate(r => isObj(r) && isNum(r.dueAt) && orNull(isNum)(r.filedAt)
  && strs(r, 'state', 'time', 'place', 'decision', 'change'));
const WAR_KEY = /^(contract|funeral|code|redlines-w1|autopsy-\d{4}-\d{2}-\d{2}|day-([1-9]|[12]\d|30))$/;
const warLogOk = w => isObj(w) && Object.entries(w).every(([k, e]) => WAR_KEY.test(k) && isObj(e) && isStr(e.text) && isNum(e.updatedAt));
// Pre-Day-1 protocols and red lines (the only place they live before startChallenge copies them); absent is valid.
const setupOk = x => x === undefined || (isObj(x) && listOf(protocolOk)(x.protocols) && listOf(redLineOk)(x.redLines));
const packOk = orNull(p => isObj(p)
  && listOf(m => isObj(m) && isNum(m.day) && strs(m, 'title', 'body'))(p.missions)
  && listOf(t => isObj(t) && strs(t, 'archetype', 'name'))(p.tactics));

const CHECKS = [
  ['settings', settingsOk, "The backup's settings are damaged."],
  ['tasks', listOf(taskOk), "The backup's tasks are damaged."],
  ['taskLog', taskLogOk, "The backup's task log is damaged."],
  ['challenge', challengeOk, "The backup's challenge is damaged."],
  ['days', byDate(dayOk), "The backup's days are damaged."],
  ['recovery', recoveryOk, "The backup's recovery entries are damaged."],
  ['warLog', warLogOk, "The backup's war log is damaged."],
  ['pack', packOk, "The backup's pack is damaged."],
  ['setup', setupOk, "The backup's setup is damaged."],
];

// null = valid, else a plain sentence.
export function validateState(obj) {
  if (!isObj(obj) || obj.v !== 2) return 'This is not a Lock In v2 backup.';
  for (const [key, ok, msg] of CHECKS) if (!ok(obj[key])) return msg;
  return null;
}
