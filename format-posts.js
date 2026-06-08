/**
 * Batch format all blog markdown files in _posts/
 *
 * Fixes:
 * 1. Front matter: normalize spacing, remove blank lines inside, fix tag indentation
 * 2. Remove duplicate title (front matter title === first # Title in body)
 * 3. Collapse excessive blank lines (3+ → 2 max)
 * 4. Add language identifiers to code blocks
 * 5. Remove trailing whitespace on each line
 * 6. Ensure exactly one blank line after front matter closing ---
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '_posts');

// ---- Heuristics to detect code block language ----
function detectLanguage(code) {
  const lines = code.trim().split('\n');
  const firstLine = lines[0] || '';
  const allText = code.trim();

  // JSON detection
  if (/^\s*[\[\{]/.test(firstLine) && /[\]}]\s*$/.test(allText)) {
    try { JSON.parse(allText); return 'json'; } catch (_) {}
  }

  // Python
  if (/^(import |from |def |class |async def |print\()/.test(firstLine)) return 'python';
  if (/\bif\s+__name__\s*==\s*['"]__main__['"]/.test(allText)) return 'python';
  if (/^(async )?def \w+/.test(firstLine)) return 'python';

  // Bash/shell
  if (/^(git |docker |npm |pip |#!|wsl |sudo |ssh )/.test(firstLine)) return 'bash';
  if (/^\$ /.test(firstLine)) return 'bash';
  if (/^(export |source |alias )/.test(firstLine)) return 'bash';

  // YAML
  if (/^\w+:\s/.test(firstLine) && !firstLine.includes('(') && !firstLine.includes(')') && lines.length > 1) {
    if (lines.every(l => /^(\s*\w+:|^\s*#|^\s*- |^\s*$)/.test(l))) return 'yaml';
  }

  // Dockerfile
  if (/^(FROM |RUN |CMD |COPY |ADD |ENV |WORKDIR |EXPOSE )/.test(firstLine)) return 'dockerfile';

  // SQL
  if (/^(SELECT |INSERT |UPDATE |DELETE |CREATE |ALTER |DROP )/i.test(firstLine)) return 'sql';

  // Java
  if (/^(public |private |protected |class |import java\.)/.test(firstLine)) return 'java';

  // HTML/XML
  if (/^</.test(firstLine) && />/.test(allText)) return 'html';

  // Mermaid
  if (/^(graph |sequenceDiagram |flowchart |gantt )/.test(firstLine)) return 'mermaid';

  // Text (catch-all for config files, DSL, etc.)
  return '';
}

// ---- Process a single file ----
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // ---- Step 1: Extract and normalize front matter ----
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!fmMatch) {
    console.log(`  [SKIP] No front matter: ${path.basename(filePath)}`);
    return false;
  }

  let fmRaw = fmMatch[1];
  let rest = content.slice(fmMatch[0].length);

  // Normalize front matter lines
  let fmLines = fmRaw.split('\n');

  // Remove blank lines inside front matter
  fmLines = fmLines.filter(l => l.trim() !== '');

  // Process each line
  let normalizedFmLines = [];
  let inTags = false;

  for (let i = 0; i < fmLines.length; i++) {
    let line = fmLines[i];

    // Detect start of tags list
    if (/^tags:/.test(line)) {
      inTags = true;
      normalizedFmLines.push('tags:');
      continue;
    }

    if (inTags) {
      // Tag lines: standardize indent to 2 spaces, ensure "- value" format
      if (/^\s*-/.test(line)) {
        let tagValue = line.replace(/^\s*-\s*/, '').trim();
        if (tagValue) {
          normalizedFmLines.push(`  - ${tagValue}`);
        }
        // Skip empty tag entries
      } else {
        // End of tags section
        inTags = false;
        // Fall through to re-process this line
        i--;
        continue;
      }
      continue;
    }

    // Regular key: value lines — normalize spacing
    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      let key = kvMatch[1];
      let value = kvMatch[2].trim();
      normalizedFmLines.push(`${key}: ${value}`);
    } else {
      normalizedFmLines.push(line);
    }
  }

  let fmNormalized = normalizedFmLines.join('\n');

  // Rebuild front matter
  let newContent = `---\n${fmNormalized}\n---\n`;

  // Ensure exactly one blank line after front matter
  rest = rest.replace(/^\n+/, '');
  newContent += '\n' + rest;

  // ---- Step 2: Remove duplicate title ----
  // Extract title from front matter
  const titleMatch = fmNormalized.match(/^title:\s*"(.+)"\s*$/m);
  if (titleMatch) {
    const fmTitle = titleMatch[1].trim();
    // Check if body starts with # <title>
    const titleRegex = new RegExp(`^#\\s*${escapeRegex(fmTitle)}\\s*\\n`);
    newContent = newContent.replace(titleRegex, '');
  }

  // ---- Step 3: Collapse excessive blank lines (3+ → 2 max) ----
  newContent = newContent.replace(/\n{3,}/g, '\n\n');

  // ---- Step 4: Add language identifiers to code blocks ----
  newContent = newContent.replace(/```\s*\n([\s\S]*?)```/g, (match, codeContent) => {
    const lang = detectLanguage(codeContent);
    if (lang) {
      return '```' + lang + '\n' + codeContent + '```';
    }
    return match;
  });

  // ---- Step 5: Remove trailing whitespace ----
  newContent = newContent.split('\n').map(l => l.replace(/\s+$/, '')).join('\n');

  // ---- Step 6: Ensure file ends with exactly one newline ----
  newContent = newContent.replace(/\n*$/, '\n');

  // ---- Step 7: Ensure no more than one blank line after front matter ----
  newContent = newContent.replace(/---\n\n\n+/, '---\n\n');

  if (newContent !== original) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  }
  return false;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---- Main ----
function main() {
  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

  // Also scan subdirectories
  const subdirs = fs.readdirSync(POSTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let allFiles = files.map(f => path.join(POSTS_DIR, f));
  for (const subdir of subdirs) {
    const subFiles = fs.readdirSync(path.join(POSTS_DIR, subdir))
      .filter(f => f.endsWith('.md'))
      .map(f => path.join(POSTS_DIR, subdir, f));
    allFiles = allFiles.concat(subFiles);
  }

  let changed = 0;
  let skipped = 0;

  for (const filePath of allFiles) {
    const relativePath = path.relative(__dirname, filePath);
    try {
      const result = processFile(filePath);
      if (result) {
        console.log(`  [OK]   ${relativePath}`);
        changed++;
      } else {
        console.log(`  [--]   ${relativePath} (unchanged)`);
        skipped++;
      }
    } catch (err) {
      console.error(`  [ERR]  ${relativePath}: ${err.message}`);
    }
  }

  console.log(`\nDone! ${changed} files changed, ${skipped} files unchanged.`);
}

main();
