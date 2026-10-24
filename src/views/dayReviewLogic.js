// Day review (DR1): one day's read-only record from existing state. Pure and DOM-free; reads only, writes nothing.
import { dayNo } from '../core/challenge.js';
import { tasksOn } from '../core/tasks.js';

const own = (o, k) => (o && Object.hasOwn(o, k) ? o[k] : undefined);
const text = e => (typeof e?.text === 'string' && e.text.trim() !== '' ? e.text : null);

// Fields that do not exist are null / empty; `empty` is true when there is nothing to show.
export function dayRecord(state, date) {
  const d = own(state.days, date) ?? {};
  const autopsy = text(own(state.warLog, `autopsy-${date}`));
  const recovery = own(state.recovery, date) ?? null;
  const tasks = tasksOn(state, date).filter(v => v.status === 'done').map(v => v.task.title);
  const rec = {
    date, dayNo: state.challenge ? dayNo(state, date) : null,
    result: d.result ?? null, auto: d.auto ?? null, declaredRedo: d.declaredRedo === true,
    morning: d.morning ?? null, afternoon: d.afternoon ?? null, night: d.night ?? null,
    slipNote: typeof d.slipNote === 'string' && d.slipNote.trim() !== '' ? d.slipNote : null,
    autopsy, recoveryPending: !!recovery && recovery.filedAt == null && !autopsy, tasks,
  };
  rec.empty = !rec.result && !rec.declaredRedo && !rec.morning && !rec.afternoon && !rec.night
    && !rec.slipNote && !rec.autopsy && !rec.recoveryPending && !tasks.length;
  return rec;
}
