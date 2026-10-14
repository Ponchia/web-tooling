import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

test('shared workflow built a static HTML artifact', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  assert.match(html, /<title>Static site fixture<\/title>/);
});
