type DiffFragment<Change extends '+' | '-'> = readonly ['=' | Change, string];

interface PersonInfo {
  name: string;
  city: string;
  district: string | number;
  terms: number;
  sources: readonly [string, string];
}

export interface ScoredPerson extends PersonInfo {
  unscoredReason?: never;
  keep: number;
  added: number;
  removed: number;
  note: string;
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
  return percentage.format(retention(person));
}

export function formattedCounts(person: ScoredPerson) {
  return `${person.keep.toLocaleString('zh-TW')} / ${totalChars(person).toLocaleString('zh-TW')} 字`;
}

export function constituency(person: Person) {
  return `${person.city}・第 ${person.district} 選區`;
}
