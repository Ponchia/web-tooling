import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectPage, validateSites } from '../scripts/check-public-sites.mjs';

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
