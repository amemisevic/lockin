import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// T10-3: icon() rewrites ids and follows only fill / stroke url(#...). If a shipped icon ever uses another kind of
// reference (href, clip-path, mask, filter, <use>, url(#) in style), icon() must learn it first; this fails until then.
test('no shipped icon refers to an id other than through fill / stroke url(#...)', () => {
  const src = readFileSync(new URL('../src/icons.js', import.meta.url), 'utf8');
  const markup = [...src.matchAll(/<svg[\s\S]*?<\/svg>/g)].map(m => m[0]);
  assert.ok(markup.length > 10);
  for (const svg of markup) {
    assert.doesNotMatch(svg, /href=|clip-path=|<clipPath|<mask|<use[\s>]|filter=|<filter/, svg.slice(0, 60));
    assert.doesNotMatch(svg, /style=["'][^"']*url\(#/, svg.slice(0, 60));
    for (const m of svg.matchAll(/url\(#/g)) assert.match(svg.slice(Math.max(0, m.index - 8), m.index), /(fill|stroke)=["']$/);
  }
});
