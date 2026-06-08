/**
 * Second pass: fix remaining front matter spacing issues
 * Some files still have extra whitespace in front matter keys
 * e.g. "layout:     post"  with lots of spaces
 * e.g. "title:      "xxx"" with lots of spaces
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, '_posts');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Match front matter
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!fmMatch) return false;

  let fmRaw = fmMatch[1];
  let rest = content.slice(fmMatch[0].length);

  // Process each line: normalize key: value spacing
  let fmLines = fmRaw.split('\n');
  let normalizedFmLines = [];
  let inTags = false;

  for (let i = 0; i < fmLines.length; i++) {
    let line = fmLines[i];

    if (/^tags:/.test(line)) {
      inTags = true;
      normalizedFmLines.push('tags:');
      continue;
    }

    if (inTags) {
      if (/^\s*-/.test(line)) {
        let tagValue = line.replace(/^\s*-\s*/, '').trim();
        if (tagValue) {
          normalizedFmLines.push(`  - ${tagValue}`);
        }
        continue;
      } else {
        inTags = false;
        i--;
        continue;
      }
    }

    // Normalize key: value — handle extra spaces
    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      let key = kvMatch[1];
      let value = kvMatch[2].trim();

      // Ensure quoted values keep their quotes
      if (/^".*"$/.test(value) || /^'.*'$/.test(value)) {
        let inner = value.slice(1, -1).trim();
        let quote = value[0];
        value = quote + inner + quote;
      }

      normalizedFmLines.push(`${key}: ${value}`);
    } else {
      normalizedFmLines.push(line);
    }
  }

  let fmNormalized = normalizedFmLines.join('\n');
  let newContent = `---\n${fmNormalized}\n---\n\n${rest.replace(/^\n+/, '')}`;

  // Collapse excessive blank lines
  newContent = newContent.replace(/\n{3,}/g, '\n\n');

  // Remove trailing whitespace
  newContent = newContent.split('\n').map(l => l.replace(/\s+$/, '')).join('\n');

  // Ensure file ends with exactly one newline
  newContent = newContent.replace(/\n*$/, '\n');

  if (newContent !== original) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    return true;
  }
  return false;
}

function main() {
  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();

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
  for (const filePath of allFiles) {
    const relativePath = path.relative(__dirname, filePath);
    try {
      if (processFile(filePath)) {
        console.log(`  [OK]   ${relativePath}`);
        changed++;
      }
    } catch (err) {
      console.error(`  [ERR]  ${relativePath}: ${err.message}`);
    }
  }

  console.log(`\nDone! ${changed} files updated in pass 2.`);
}

main();
