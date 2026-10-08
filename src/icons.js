// Own 24 px icons. Tab icons are filled; the rest are 2 px strokes to match text weight.
const svg = (body, filled = false) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" ${filled
    ? 'fill="currentColor" fill-rule="evenodd"'
    : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;

export const icons = {
  // Tabs (filled)
  today: svg('<path d="M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20ZM11 6h2v5.4l3.8 2.2-1 1.7L11 12.6Z"/>', true),
  plan: svg('<path d="M6 3h12a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3ZM7 7.5h10v2H7ZM7 11.5h10v2H7ZM7 15.5h6v2H7Z"/>', true),
  progress: svg('<path d="M3 14.5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 8 14.5v5A1.5 1.5 0 0 1 6.5 21h-2A1.5 1.5 0 0 1 3 19.5ZM9.5 9.5A1.5 1.5 0 0 1 11 8h2a1.5 1.5 0 0 1 1.5 1.5v10A1.5 1.5 0 0 1 13 21h-2a1.5 1.5 0 0 1-1.5-1.5ZM16 4.5A1.5 1.5 0 0 1 17.5 3h2A1.5 1.5 0 0 1 21 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-2a1.5 1.5 0 0 1-1.5-1.5Z"/>', true),
  settings: svg('<path fill-rule="nonzero" d="M3 6h18v2.5H3ZM3 15.5h18V18H3ZM8.5 3.75a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7ZM15.5 13.25a3.5 3.5 0 1 1 0 7 3.5 3.5 0 1 1 0-7Z"/>', true),
  // Goals
  briefcase: svg('<rect x="3" y="7.5" width="18" height="12.5" rx="2.5"/><path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2M3 13h18"/>'),
  book: svg('<path d="M12 6.5C10 5 7 4.5 4 5v13.5c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5ZM12 6.5V20"/>'),
  heart: svg('<path d="M12 20s-8-4.6-8-10.3A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 8 2.3C20 15.4 12 20 12 20Z"/>'),
  people: svg('<circle cx="9" cy="8" r="3.25"/><path d="M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M15.5 4.9a3.25 3.25 0 0 1 0 6.2M18 14.4c1.8.7 3 2.5 3 5.1"/>'),
  tray: svg('<path d="M3 13.5h5l1.5 2.5h5l1.5-2.5h5M5.5 5h13l2.5 8.5V19H3v-5.5Z"/>'),
  // Controls
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  arrowUp: svg('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  arrowDown: svg('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  ellipsis: svg('<circle cx="5.5" cy="12" r="1.75"/><circle cx="12" cy="12" r="1.75"/><circle cx="18.5" cy="12" r="1.75"/>', true),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  chevronLeft: svg('<path d="M15 5l-7 7 7 7"/>'),
  chevronRight: svg('<path d="M9 5l7 7-7 7"/>'),
  partial: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 0 0 17Z" fill="currentColor"/>'),
};

// Parses one of our own constant strings above (never user data) into an element.
export function icon(name) {
  const t = document.createElement('template');
  t.innerHTML = icons[name];
  return t.content.firstChild;
}
