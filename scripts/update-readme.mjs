#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const POSTS_DIR = '_posts';
const README = 'README.md';
const MAX_POSTS = 5;
const SITE_BASEURL = '/gaupoit';
const START = '<!-- POSTS:START -->';
const END = '<!-- POSTS:END -->';

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const meta = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[m[1]] = value;
  }
  return meta;
}

function dateFromFilename(name) {
  const m = name.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { full: `${m[1]}-${m[2]}-${m[3]}`, y: m[1], m: m[2], d: m[3] } : null;
}

function postUrl(filename) {
  const date = dateFromFilename(filename);
  if (!date) return null;
  const slug = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
  return `${SITE_BASEURL}/${date.y}/${date.m}/${date.d}/${slug}/`;
}

function escapeCell(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
const posts = files
  .map((file) => {
    const meta = parseFrontmatter(readFileSync(join(POSTS_DIR, file), 'utf8'));
    if (!meta || !meta.title) return null;
    const date = meta.date || dateFromFilename(file)?.full;
    return {
      file,
      title: meta.title,
      summary: meta.summary || '',
      date,
      url: postUrl(file),
    };
  })
  .filter(Boolean)
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  .slice(0, MAX_POSTS);

if (posts.length === 0) {
  console.log('No posts found. Skipping README update.');
  process.exit(0);
}

const rows = [
  '| Date | Title | Summary |',
  '|------|-------|---------|',
  ...posts.map((p) => `| ${p.date} | [${escapeCell(p.title)}](${p.url}) | ${escapeCell(p.summary)} |`),
];
const block = `${START}\n\n${rows.join('\n')}\n\n${END}`;

const readme = readFileSync(README, 'utf8');
const re = new RegExp(`${START}[\\s\\S]*?${END}`);
if (!re.test(readme)) {
  console.error(`Markers ${START} and ${END} not found in ${README}.`);
  process.exit(1);
}

const updated = readme.replace(re, block);
if (updated === readme) {
  console.log('README already up to date.');
  process.exit(0);
}

writeFileSync(README, updated);
console.log(`Updated ${README} with ${posts.length} most recent posts.`);
