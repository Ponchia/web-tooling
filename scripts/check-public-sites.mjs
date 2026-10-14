#!/usr/bin/env node
// Read-only deployed-site checks for sites whose source may be private.
// This is a smoke check, not a source audit, vulnerability scanner, or uptime SLA.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const TIMEOUT_MS = 20_000;
const MAX_BODY_BYTES = 1_000_000;
const MAX_ATTEMPTS = 3;

export function validateSites(sites) {
  if (!Array.isArray(sites) || sites.length === 0) throw new Error('Expected a non-empty site list');
  const ids = new Set();
  for (const site of sites) {
    if (!site || !/^[a-z][a-z0-9-]{1,63}$/.test(site.id || '')) throw new Error('Invalid site id');
    if (ids.has(site.id)) throw new Error(`Duplicate site id: ${site.id}`);
    ids.add(site.id);
    const url = new URL(site.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) {
      throw new Error(`${site.id}: Expected a simple public HTTPS URL without credentials or query`);
    }
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) || /(?:^|\.)(?:localhost|local|internal)$/.test(url.hostname)) {
      throw new Error(`${site.id}: Expected a public domain name`);
    }
  }
  return sites;
}

export function inspectPage(site, response, html) {
  const errors = [];
  const warnings = [];
  const expected = new URL(site.url);
  const final = new URL(response.url);
  if (response.status !== 200) errors.push(`HTTP ${response.status} (expected 200)`);
  if (final.protocol !== 'https:') errors.push('Redirected away from HTTPS');
  if (final.hostname !== expected.hostname) errors.push(`Unexpected redirect to ${final.hostname}`);

  const type = response.headers.get('content-type') || '';
  if (!/^text\/html\b/i.test(type)) errors.push(`Not HTML: ${type || 'missing content-type'}`);

  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, '').trim();
  if (!title) errors.push('Missing or empty HTML title');

  const robotsHeader = response.headers.get('x-robots-tag') || '';
  if (/(?:^|[,\s])noindex(?:[,\s]|$)/i.test(robotsHeader)) errors.push('X-Robots-Tag disables indexing');
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attrs = {};
    for (const match of tag.matchAll(/([a-z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4];
    }
    if (['robots', 'googlebot'].includes(attrs.name?.toLowerCase()) && /(?:^|[,\s])noindex(?:[,\s]|$)/i.test(attrs.content || '')) {
      errors.push('HTML meta robots disables indexing');
    }
  }

  for (const header of ['strict-transport-security', 'x-content-type-options', 'referrer-policy']) {
    if (!response.headers.has(header)) warnings.push(`No ${header} response header`);
  }
  if (response.headers.has('set-cookie')) warnings.push('Set-Cookie present; review privacy impact (not automatically a GDPR violation)');
  return { id: site.id, url: final.toString(), status: response.status, title, errors, warnings };
}

async function fetchPage(site) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(site.url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': 'web-tooling-site-smoke/1.0 (read-only public website health check)' },
      });
      let html = '';
      if (response.body) {
        const chunks = [];
        let total = 0;
        for await (const chunk of response.body) {
          total += chunk.byteLength;
          if (total > MAX_BODY_BYTES) throw new Error(`Response exceeds ${MAX_BODY_BYTES} bytes`);
          chunks.push(Buffer.from(chunk));
        }
        html = Buffer.concat(chunks).toString('utf8');
      }
      // A 5xx can be an intermittent host outage. Retry; persistent failures report red.
      if (response.status >= 500 && attempt < MAX_ATTEMPTS) throw new Error(`Transient HTTP ${response.status}`);
      return inspectPage(site, response, html);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await new Promise((done) => setTimeout(done, 1200 * attempt));
    }
  }
  return { id: site.id, url: site.url, errors: [`Request failed: ${lastError?.message || String(lastError)}`], warnings: [] };
}

async function main() {
  const configPath = process.argv[2] || 'public-sites.json';
  const sites = validateSites(JSON.parse(await readFile(resolve(configPath), 'utf8')));
  let failed = false;
  for (const site of sites) {
    const result = await fetchPage(site);
    console.log(`${result.errors.length ? 'FAIL' : 'PASS'} ${result.id}: ${result.url} (${result.status || 'no HTTP response'})${result.title ? ` — ${result.title}` : ''}`);
    for (const warning of result.warnings) console.log(`  WARN: ${warning}`);
    for (const error of result.errors) console.error(`  ERROR: ${error}`);
    failed ||= result.errors.length > 0;
  }
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`Site smoke configuration error: ${error.message}`);
    process.exitCode = 2;
  });
}
