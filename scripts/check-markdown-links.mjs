import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const EXCLUDED_DIRECTORIES = new Set(['.git', '.wrangler', 'build', 'node_modules']);

function collectMarkdownFiles(directory = '.') {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectMarkdownFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(entryPath);
  }
  return files;
}

const markdownFiles = collectMarkdownFiles();

const markdownLinkPattern = /\]\(([^)]+)\)/g;
const missingLinks = [];

for (const markdownFile of markdownFiles) {
  const source = readFileSync(markdownFile, 'utf8');
  for (const match of source.matchAll(markdownLinkPattern)) {
    const linkTarget = match[1].trim().replace(/^<|>$/g, '').split('#')[0];
    if (!linkTarget || /^(https?:|mailto:)/.test(linkTarget)) continue;

    const resolvedTarget = path.resolve(path.dirname(markdownFile), linkTarget);
    if (!existsSync(resolvedTarget)) missingLinks.push(`${markdownFile}: ${linkTarget}`);
  }
}

if (missingLinks.length > 0) {
  console.error(`Missing local Markdown links:\n${missingLinks.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`Local Markdown links OK (${markdownFiles.length} files).`);
}
