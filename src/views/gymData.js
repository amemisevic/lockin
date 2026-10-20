// The bundled exercise list (src/data/exercises.json), fetched on first Gym open and cached for the session (gym plan G8,
// ruling 8). The service worker has the file, so this works offline. A failed load is not retried until the user asks.
const PATH = 'src/data/exercises.json'; // relative: the app lives under a GitHub Pages sub-path
const shapeOk = d => !!d && Array.isArray(d.exercises) && Array.isArray(d.muscles) && Array.isArray(d.equipment);

export async function loadExerciseData(fetchFn = fetch) {
  const r = await fetchFn(PATH);
  if (!r.ok) throw new Error(`exercise list ${r.status}`);
  const d = await r.json();
  if (!shapeOk(d)) throw new Error('exercise list has the wrong shape');
  return d;
}

let data = null, failed = false, pending = false;
const waiting = new Set();

export const exerciseData = () => data;
export const exerciseDataFailed = () => failed;

// onChange (optional) runs once when the load settles, whether it worked or not.
export function ensureExerciseData(onChange, fetchFn) {
  if (data || failed) return;
  if (onChange) waiting.add(onChange);
  if (pending) return;
  pending = true;
  loadExerciseData(fetchFn).then(d => { data = d; }, () => { failed = true; }).finally(() => {
    pending = false;
    const fns = [...waiting];
    waiting.clear();
    fns.forEach(fn => fn());
  });
}

export function retryExerciseData(onChange, fetchFn) {
  failed = false;
  ensureExerciseData(onChange, fetchFn);
}
