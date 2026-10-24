// Route change or Back: focus moves to the new screen's heading (T9-1). tabindex -1 makes the h1 focusable by script
// only; styles.css hides its focus ring (it is not a control).
export function focusHeading(view) {
  const h1 = view.querySelector('h1');
  if (!h1) return false;
  h1.setAttribute('tabindex', '-1');
  h1.focus({ preventScroll: true });
  return true;
}

// Call once, after app.js has registered its own hashchange render. A hashchange whose hash is unchanged is a
// re-render request (chrome.js rerender, Today's "Not now"), not a navigation: focus stays where it is.
export function headingOnRouteChange(view) {
  let last = location.hash;
  window.addEventListener('hashchange', () => {
    if (location.hash === last) return;
    last = location.hash;
    focusHeading(view);
  });
}
