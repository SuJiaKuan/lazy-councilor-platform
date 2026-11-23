import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const people = JSON.parse(readFileSync(new URL('../public/data.json', import.meta.url), 'utf8'));

test('every record supports a unique profile link and two source links', () => {
  assert.ok(Array.isArray(people) && people.length > 0);
  const ids = new Set();
  for (const person of people) {
    assert.ok(typeof person.name === 'string' && person.name.trim());
    assert.match(person.id, /^[a-z][a-z0-9-]+$/);
    assert.ok(!ids.has(person.id), `Duplicate profile ID: ${person.id}`);
    ids.add(person.id);
    assert.ok(typeof person.city === 'string' && person.city.trim(), person.name);
    if (person.terms !== undefined) assert.ok(Number.isInteger(person.terms) && person.terms > 0, person.name);
    assert.equal(person.sources.length, 2, person.name);
    for (const source of person.sources) {
      assert.equal(new URL(source).protocol, 'https:', person.name);
    }
  }
});

test('scored records have valid counts and diff operations; pending records have a reason', () => {
  for (const person of people) {
    if ('unscoredReason' in person) {
      assert.ok(typeof person.unscoredReason === 'string' && person.unscoredReason.trim(), person.name);
      continue;
    }

    for (const count of [person.keep, person.added, person.removed]) {
      assert.ok(Number.isInteger(count) && count >= 0, person.name);
    }
    assert.ok(person.keep + person.added > 0, person.name);
    assert.equal(typeof person.note, 'string', person.name);
    for (const [diff, change] of [[person.oldDiff, '-'], [person.newDiff, '+']]) {
      assert.ok(Array.isArray(diff) && diff.length > 0, person.name);
      for (const [op, fragment] of diff) {
        assert.ok(op === '=' || op === change, person.name);
        assert.equal(typeof fragment, 'string', person.name);
      }
    }
  }
});
