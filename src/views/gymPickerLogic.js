// Exercise picker logic (gym plan G8): filtered rows for the list, chip labels, the count line. Pure, DOM-free.
// Search, filters and recents come from src/core/exercises.js; this only shapes them for the screen.
import { searchExercises, recentIds } from '../core/exercises.js';

export const PICKER_CAP = 50; // 876 rows rebuilt on every key is too many for a phone
export const NO_MATCH = 'No exercises match.';
export const IN_USE = "Used in workouts, can't delete.";

export function pickerResults(data, gym, { query, muscle, equipment } = {}) {
  const all = searchExercises(data, gym, { query, muscle, equipment, recents: recentIds(gym.workouts) });
  const rows = all.slice(0, PICKER_CAP).map(e => ({ id: e.id, name: e.name, detail: `${e.muscle} · ${e.equipment}`, custom: e.custom }));
  return { rows, total: all.length, capped: all.length > PICKER_CAP };
}

export const chipLabel = s => s.charAt(0).toUpperCase() + s.slice(1);
export const chipOptions = list => (Array.isArray(list) ? list : []).map(value => ({ value, label: chipLabel(value) }));

export const countText = ({ total, capped }) => (capped
  ? `Showing ${PICKER_CAP} of ${total}. Search or filter to narrow down.`
  : `${total} ${total === 1 ? 'exercise' : 'exercises'}`);
