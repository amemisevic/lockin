import { h } from '../dom.js';
import { exportJson, markBackup } from '../store.js';

// Shared by Settings › Export and Progress › Back Up Now. Marks the backup only when it went out.
export async function exportBackup(app) {
  const name = `lockin-${app.today()}.json`;
  const blob = new Blob([exportJson(app.state)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch { return; } // cancelled or failed: not backed up
  } else {
    const a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  app.set(s => markBackup(s, app.today()));
}

export const renderSettings = app => h('section', null, h('h1', { class: 'large-title' }, 'Settings'));
