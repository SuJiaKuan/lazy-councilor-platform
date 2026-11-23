type DiffFragment<Change extends '+' | '-'> = readonly ['=' | Change, string];

interface PersonInfo {
  id: string;
  name: string;
  city: string;
  district: string | number;
  terms?: number;
  sourceLabels?: readonly [string, string];
  sources: readonly [string, string];
}

export interface ScoredPerson extends PersonInfo {
  unscoredReason?: never;
  keep: number;
  added: number;
  removed: number;
  note: string;
  transcribed?: boolean;
  oldDiff: DiffFragment<'-'>[];
  newDiff: DiffFragment<'+'>[];
}

interface PendingPerson extends PersonInfo {
  unscoredReason: string;
}

export type Person = ScoredPerson | PendingPerson;

export function isScored(person: Person): person is ScoredPerson {
  return person.unscoredReason === undefined;
}

export const dataUrl = `${import.meta.env.BASE_URL}data.json`;

export async function loadPeople(signal: AbortSignal): Promise<Person[]> {
  const response = await fetch(dataUrl, { signal });
  if (!response.ok) throw new Error(`Dataset request failed (HTTP ${response.status})`);
  return response.json();
}

const percentage = new Intl.NumberFormat('zh-TW', {
  style: 'percent',
  maximumFractionDigits: 1,
});

export function totalChars(person: ScoredPerson) {
  return person.keep + person.added;
}

export function retention(person: ScoredPerson) {
  return person.keep / totalChars(person);
}

export function formattedRetention(person: ScoredPerson) {
  const formatted = percentage.format(retention(person));
  return person.added > 0 && formatted === percentage.format(1) ? '<100%' : formatted;
}

export function fullRetentionLabel(person: ScoredPerson) {
  return person.removed === 0 ? '比對文字相同' : `刪除 ${person.removed.toLocaleString('zh-TW')} 字`;
}

export function formattedCounts(person: ScoredPerson) {
  return `${person.keep.toLocaleString('zh-TW')} / ${totalChars(person).toLocaleString('zh-TW')} 字`;
}

export function constituency(person: Person) {
  return `${person.city}・第 ${person.district} 選區`;
}

export function compareRetention(a: ScoredPerson, b: ScoredPerson) {
  return b.keep * totalChars(a) - a.keep * totalChars(b);
}

export function retentionRanks(people: ScoredPerson[]) {
  const ordered = [...people].sort(compareRetention);
  const ranks = new Map<string, number>();
  let rank = 0;
  for (const [index, person] of ordered.entries()) {
    if (index === 0 || compareRetention(ordered[index - 1], person) !== 0) rank = index + 1;
    ranks.set(person.id, rank);
  }
  return ranks;
}
