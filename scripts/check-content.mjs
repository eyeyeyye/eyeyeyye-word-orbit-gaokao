import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = async name => JSON.parse(await readFile(path.join(root, 'public', 'data', name), 'utf8'));
const [words, phrases, writing, meta] = await Promise.all([
  load('words.json'), load('phrases.json'), load('writing.json'), load('content-meta.json')
]);

const errors = [];
if (words.length !== 3500) errors.push(`words: expected 3500, got ${words.length}`);
if (phrases.length !== 300) errors.push(`phrases: expected 300, got ${phrases.length}`);
if (writing.length !== 200) errors.push(`writing: expected 200, got ${writing.length}`);
if (new Set(words.map(x => x.word.toLowerCase())).size !== words.length) errors.push('words: duplicates found');
if (new Set(phrases.map(x => x.phrase.toLowerCase())).size !== phrases.length) errors.push('phrases: duplicates found');
if (new Set(writing.map(x => x.sentence)).size !== writing.length) errors.push('writing: duplicates found');

for (const word of words) {
  if (!word.word || !word.translation || !word.meanings?.length) errors.push(`word incomplete: ${word.word || word.id}`);
  if (!word.pronunciation?.uk && !word.pronunciation?.us) errors.push(`pronunciation missing: ${word.word}`);
  if (word.parts.includes('n') && !word.forms?.plural) errors.push(`noun plural missing: ${word.word}`);
  if (word.parts.includes('v') && !['past', 'pastParticiple', 'ing', 'thirdPerson'].every(k => word.forms?.[k])) errors.push(`verb forms missing: ${word.word}`);
  if (word.parts.includes('prep') && !word.preposition?.usage) errors.push(`preposition usage missing: ${word.word}`);
}
for (const item of phrases) if (!item.phrase || !item.translation || !item.note) errors.push(`phrase incomplete: ${item.rank}`);
for (const item of writing) if (!item.sentence || !item.translation || !item.whyItWorks || !item.buildYourOwn || !item.memory) errors.push(`writing incomplete: ${item.id}`);
if (meta.counts.words !== words.length || meta.counts.phrases !== phrases.length || meta.counts.writing !== writing.length) errors.push('metadata counts do not match files');

if (errors.length) {
  console.error(errors.slice(0, 50).join('\n'));
  console.error(`Content check failed with ${errors.length} error(s).`);
  process.exit(1);
}
console.log(`Content check passed: ${words.length} words, ${phrases.length} phrases, ${writing.length} writing sentences.`);


