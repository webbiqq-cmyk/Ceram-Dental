// The escaping helper every user-facing string in the admin/portal UI is
// rendered through before it touches the DOM — the thing standing between
// a submitted contact message and stored XSS. Pure and frontend-only
// (public/js/utils/format.js is a native ES module), loaded here via a
// dynamic import from this CommonJS test.
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('esc()', async (t) => {
  const { esc } = await import('../public/js/utils/format.js');

  await t.test('escapes the five HTML-significant characters', () => {
    assert.equal(esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.equal(esc('"quoted" & <tag>'), '&quot;quoted&quot; &amp; &lt;tag&gt;');
    assert.equal(esc("it's"), 'it&#39;s');
  });

  await t.test('a stored XSS payload becomes inert text, never a real tag', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const escaped = esc(payload);
    assert.ok(!escaped.includes('<img'), 'the escaped output must not contain a real opening tag');
    assert.ok(escaped.includes('&lt;img'));
  });

  await t.test('passes plain text through unchanged', () => {
    assert.equal(esc('Dr. R. Haddad — Bright Smile Clinic'), 'Dr. R. Haddad — Bright Smile Clinic');
  });

  await t.test('handles null/undefined safely', () => {
    assert.equal(esc(null), '');
    assert.equal(esc(undefined), '');
  });
});
