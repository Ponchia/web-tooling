import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPage, inspectPage, validateSites } from '../scripts/check-public-sites.mjs';

const site = { id: 'example', url: 'https://example.com/' };
const response = (headers = {}) => ({
  status: 200,
  url: 'https://example.com/',
  headers: new Headers({ 'content-type': 'text/html', ...headers }),
});

test('accepts a live HTML homepage with a title', () => {
  const result = inspectPage(site, response(), '<!doctype html><title>Example</title>');
  assert.deepEqual(result.errors, []);
  assert.equal(result.title, 'Example');
});

test('rejects accidental noindex in both header and either attribute ordering', () => {
  for (const html of [
    `<title>OK</title><meta name="robots" content="noindex,follow">`,
    `<meta content='follow, noindex' name='googlebot'><title>OK</title>`,
  ]) {
    assert.match(inspectPage(site, response(), html).errors.join(','), /disables indexing/);
  }
  assert.match(inspectPage(site, response({ 'x-robots-tag': 'noindex, nofollow' }), '<title>OK</title>').errors.join(','), /disables indexing/);
});

test('rejects missing titles, non-200 responses, non-HTML, and off-domain redirects', () => {
  const bad = { ...response(), status: 404, url: 'https://other.com/', headers: new Headers({ 'content-type': 'application/json' }) };
  assert.equal(inspectPage(site, bad, '{}').errors.length, 4);
});

test('does not confuse security-header warnings with actual failures', () => {
  const result = inspectPage(site, response({ 'set-cookie': 'anonymous=1' }), '<title>OK</title>');
  assert.deepEqual(result.errors, []);
  assert.ok(result.warnings.some((warning) => warning.includes('Set-Cookie')));
});

test('requires unique public HTTPS config without credentials', () => {
  assert.equal(validateSites([site]).length, 1);
  for (const url of ['http://example.com/', 'https://user:password@example.com/', 'https://localhost/', 'https://example.com/?secret=1']) {
    assert.throws(() => validateSites([{ ...site, url }]));
  }
  assert.throws(() => validateSites([site, site]), /Duplicate/);
});

test('public-site fetch is bounded to the original HTTPS URL with no implicit redirects', async () => {
  let calls = 0;
  const result = await fetchPage(site, async (url, options) => {
    calls++;
    assert.equal(url, site.url);
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, undefined);
    return {
      url,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      body: (async function* () { yield Buffer.from('<title>OK</title>'); })(),
    };
  });
  assert.equal(calls, 1);
  assert.deepEqual(result.errors, []);
});

test('rejects HTML title fragments and strips control characters from remote text', () => {
  const malformed = inspectPage(site, response(), '<title>Welcome <script alert(1)</title>');
  assert.match(malformed.errors.join(' '), /unsafe HTML title/);
  const control = inspectPage(site, response(), '<title>Ok\r\n\u001b[31m</title>');
  assert.ok(!/[\r\n\u001b]/.test(control.title));
  assert.deepEqual(control.errors, []);
});
