import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const people = JSON.parse(readFileSync(new URL('../public/data.json', import.meta.url), 'utf8'));

function isNonemptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

test('every record has a unique profile ID, filter fields, and two source links', () => {
  assert.ok(Array.isArray(people) && people.length > 0);
  const ids = new Set();
  for (const person of people) {
    assert.ok(isNonemptyString(person.name));
    assert.match(person.id, /^[a-z][a-z0-9-]+$/);
    assert.ok(!ids.has(person.id), `Duplicate profile ID: ${person.id}`);
    ids.add(person.id);
    assert.ok(isNonemptyString(person.city), person.name);
    assert.ok(isNonemptyString(person.district) || (Number.isInteger(person.district) && person.district > 0), person.name);
    if (person.party !== undefined) assert.ok(isNonemptyString(person.party), person.name);
    if (person.terms !== undefined) assert.ok(Number.isInteger(person.terms) && person.terms > 0, person.name);
    assert.ok(Array.isArray(person.sources), person.name);
    assert.equal(person.sources.length, 2, person.name);
    for (const source of person.sources) {
      assert.equal(new URL(source).protocol, 'https:', person.name);
    }
    if (person.sourceLabels !== undefined) {
      assert.ok(Array.isArray(person.sourceLabels), person.name);
      assert.equal(person.sourceLabels.length, 2, person.name);
      assert.ok(person.sourceLabels.every(isNonemptyString), person.name);
    }
    if (person.portrait !== undefined) {
      assert.equal(new URL(person.portrait.url).protocol, 'https:', person.name);
      assert.equal(new URL(person.portrait.source).protocol, 'https:', person.name);
    }
  }
});

test('scored and pending records carry the fields for their respective statuses', () => {
  for (const person of people) {
    if ('unscoredReason' in person) {
      assert.ok(isNonemptyString(person.unscoredReason), person.name);
      for (const field of ['keep', 'added', 'removed', 'oldDiff', 'newDiff', 'transcribed']) {
        assert.ok(!(field in person), `${person.name}: pending record has ${field}`);
      }
      continue;
    }

    for (const count of [person.keep, person.added, person.removed]) {
      assert.ok(Number.isInteger(count) && count >= 0, person.name);
    }
    assert.ok(person.keep + person.removed > 0, person.name);
    assert.ok(person.keep + person.added > 0, person.name);
    assert.equal(typeof person.note, 'string', person.name);
    if (person.transcribed !== undefined) assert.equal(typeof person.transcribed, 'boolean', person.name);
    for (const [diff, change] of [[person.oldDiff, '-'], [person.newDiff, '+']]) {
      assert.ok(Array.isArray(diff) && diff.length > 0, person.name);
      for (const entry of diff) {
        assert.ok(Array.isArray(entry) && entry.length === 2, person.name);
        const [op, fragment] = entry;
        assert.ok(op === '=' || op === change, person.name);
        assert.equal(typeof fragment, 'string', person.name);
      }
    }
  }
});
