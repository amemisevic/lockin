// One persistent live region for error sentences (T11-1). It lives in <body>, outside #view, so the 30 s tick and every
// choice-tap re-render leave it alone and VoiceOver reads a sentence only when announce() changes it. The visible
// sentence in the screen carries no role.
import { h } from '../dom.js';

let region = null;

export function announce(text) {
  if (!document.body) return; // the test fakes of older views have no body
  if (!region) {
    region = h('div', { class: 'live', role: 'alert' });
    document.body.append(region);
  }
  region.replaceChildren?.(...(text ? [text] : [])); // same reason
}
