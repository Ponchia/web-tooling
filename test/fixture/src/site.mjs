import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

await mkdir('dist', { recursive: true });
await writeFile(join('dist', 'index.html'), '<!doctype html><title>Static site fixture</title>\n');
