import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { transformWithEsbuild } from 'vite';

const source = await readFile(new URL('../src/people.ts', import.meta.url), 'utf8');
const { code } = await transformWithEsbuild(source, 'src/people.ts', {
  format: 'esm',
  define: { 'import.meta.env.BASE_URL': '"./"' },
});
const { formattedSimilarity, similarity, similarityGrade, similarityRanks } =
  await import(`data:text/javascript,${encodeURIComponent(code)}`);

test('text retention penalizes insertions and deletions equally', () => {
  assert.equal(similarity({ keep: 9, added: 1, removed: 1 }), 0.9);
  assert.equal(similarity({ keep: 8, added: 0, removed: 4 }), 0.8);
  assert.equal(similarity({ keep: 8, added: 4, removed: 0 }), 0.8);
  assert.equal(similarity({ keep: 8, added: 0, removed: 0 }), 1);
});

test('ranking ties require equal unrounded scores', () => {
  const heavierDeletion = { id: 'heavier-deletion', keep: 8, added: 0, removed: 4 };
  const exact = { id: 'exact', keep: 2500, added: 0, removed: 0 };
  const tinyDeletion = { id: 'tiny-deletion', keep: 2500, added: 0, removed: 1 };
  const tinyReplacement = { id: 'tiny-replacement', keep: 4999, added: 1, removed: 1 };
  const equallySmallDeletion = { id: 'equally-small-deletion', keep: 5000, added: 0, removed: 2 };
  assert.equal(formattedSimilarity(tinyDeletion), '<100%');
  assert.equal(formattedSimilarity(tinyReplacement), '<100%');
  assert.deepEqual(similarityRanks([heavierDeletion, tinyReplacement, exact, tinyDeletion, equallySmallDeletion]), new Map([
    ['exact', 1],
    ['tiny-deletion', 2],
    ['equally-small-deletion', 2],
    ['tiny-replacement', 4],
    ['heavier-deletion', 5],
  ]));
});

test('grade cutoffs use the unrounded score and are inclusive', () => {
  const cutoffs = [
    [100, 'identical'],
    [90, 'minor-edits'],
    [60, 'mostly-retained'],
    [30, 'mixed'],
    [15, 'reworked'],
    [0, 'mostly-rewritten'],
  ];
  for (const [index, [percent, grade]] of cutoffs.entries()) {
    const atCutoff = { keep: percent, added: 100 - percent, removed: 100 - percent };
    assert.equal(similarityGrade(atCutoff).id, grade);
    if (percent === 0) continue;
    const justBelow = { keep: percent * 100 - 1, added: (100 - percent) * 200 + 2, removed: 0 };
    assert.equal(similarityGrade(justBelow).id, cutoffs[index + 1][1]);
    assert.equal(formattedSimilarity(justBelow), `<${percent}%`);
  }
});
