import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const html = readFileSync('dist/index.html', 'utf8');
const css = readFileSync('dist/styles.css', 'utf8');
const js = readFileSync('dist/app.js', 'utf8');

test('all local navigation targets exist and IDs are unique', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), target);
  assert.match(html, /aria-label="冯皓龄 HAOLING FENG"/);
  assert.match(html, />VON<\/a>/);
});

test('local assets exist and all six concepts are explicitly disclosed', () => {
  for (const [, path] of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) assert.ok(existsSync(resolve('dist', path)), path);
  assert.equal((html.match(/<article\b/g) || []).length, 6);
  assert.match(html, /概念示例 · 待替换为个人作品/);
  assert.doesNotMatch(html, /APPLE|GRAHAM|CREATIVE DIRECTOR|PROJECT TITLE/);
});

test('responsive cards, native pointer and non-JS content remain usable', () => {
  assert.match(css, /columns:2/); assert.match(css, /columns:1/);
  assert.match(css, /column-gap:6px/); assert.match(css, /border-radius:14px/);
  assert.doesNotMatch(css, /cursor:\s*none/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.reveal-ready \[data-reveal\]/);
});

test('WebGL unavailable retains static fallback and does not throw', () => {
  const canvas = { hidden: false, getContext: () => null };
  const document = { querySelector: selector => selector === '.hero' ? {} : selector === '.hero__water' ? canvas : null, querySelectorAll: () => [] };
  vm.runInNewContext(js, { document, window: {}, matchMedia: () => ({ matches: false }) });
  assert.equal(canvas.hidden, true);
});

test('missing page components are safely ignored', () => {
  vm.runInNewContext(js, { document: { querySelector: () => null, querySelectorAll: () => [] }, window: {} });
});
