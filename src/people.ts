type DiffFragment<Change extends '+' | '-'> = readonly ['=' | Change, string];

interface PersonInfo {
  id: string;
  name: string;
  city: string;
  district: string | number;
  party?: string;
  portrait?: { url: string; source: string };
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

function combinedChars(person: ScoredPerson) {
  return 2 * person.keep + person.added + person.removed;
}

export function similarity(person: ScoredPerson) {
  return 2 * person.keep / combinedChars(person);
}

export function formattedSimilarity(person: ScoredPerson) {
  const formatted = percentage.format(similarity(person));
  return person.added + person.removed > 0 && formatted === percentage.format(1)
    ? '<100%'
    : formatted;
}

export function constituency(person: Person) {
  return `${person.city}・第 ${person.district} 選區`;
}

export function compareSimilarity(a: ScoredPerson, b: ScoredPerson) {
  return b.keep * combinedChars(a) - a.keep * combinedChars(b);
}

export function similarityRanks(people: ScoredPerson[]) {
  const ordered = [...people].sort(compareSimilarity);
  const ranks = new Map<string, number>();
  let rank = 0;
  for (const [index, person] of ordered.entries()) {
    if (index === 0 || compareSimilarity(ordered[index - 1], person) !== 0) rank = index + 1;
    ranks.set(person.id, rank);
  }
  return ranks;
}
