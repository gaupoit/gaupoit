#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const POSTS_DIR = '_posts';

const FORBIDDEN = [
  { pattern: /Văn Lang|Van Lang|\bVLU\b/i, label: 'Client institution name' },
  { pattern: /msc\.vlu\.edu\.vn/i, label: 'Client domain' },
  { pattern: /Trung tâm Huấn luyện Kỹ năng Y khoa/i, label: 'Client center name (VI)' },
  { pattern: /Center for Medical Skills Training/i, label: 'Client center name (EN)' },
  { pattern: /\b(M|VH|PN)-\d{4}-\d{4}\b/, label: 'Real Patient ID format (use a generic prefix instead)' },
  { pattern: /Phạm Gia Hân|Lê Bảo Ngọc|Trần Văn Bình|Bé An/i, label: 'Demo persona name from project docs' },
  { pattern: /Kernahan-Stark/i, label: 'Project-specific anatomical classification term (consider rephrasing)' },
];

let failed = false;

function check(file) {
  const content = readFileSync(file, 'utf8');
  for (const { pattern, label } of FORBIDDEN) {
    const match = content.match(pattern);
    if (match) {
      const lineNumber = content.slice(0, match.index).split('\n').length;
      console.error(`  ${file}:${lineNumber}  ${label}  ("${match[0]}")`);
      failed = true;
    }
  }
}

try {
  statSync(POSTS_DIR);
} catch {
  console.log(`No ${POSTS_DIR} directory yet. Skipping.`);
  process.exit(0);
}

const files = readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md'));
if (files.length === 0) {
  console.log('No posts to check.');
  process.exit(0);
}

console.log(`Checking ${files.length} post(s) for forbidden terms...`);
for (const f of files) check(join(POSTS_DIR, f));

if (failed) {
  console.error('\nAnonymization check FAILED. Replace flagged terms before publishing.');
  console.error('To allow a term, edit FORBIDDEN in scripts/check-anonymization.mjs.');
  process.exit(1);
}

console.log('Anonymization check passed.');
