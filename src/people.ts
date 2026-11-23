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

export const similarityGrades = [
  { id: 'identical', minimum: 1, label: '原稿重播', range: '100%' },
  { id: 'minor-edits', minimum: .9, label: '微修上場', range: '90% 至未滿 100%' },
  { id: 'mostly-retained', minimum: .6, label: '舊稿打底', range: '60% 至未滿 90%' },
  { id: 'mixed', minimum: .3, label: '新舊混搭', range: '30% 至未滿 60%' },
  { id: 'reworked', minimum: .15, label: '改稿有感', range: '15% 至未滿 30%' },
  { id: 'mostly-rewritten', minimum: 0, label: '大幅翻新', range: '未滿 15%' },
] as const;

export function similarityGrade(person: ScoredPerson) {
  const score = similarity(person);
  return similarityGrades.find((grade) => score >= grade.minimum) ?? similarityGrades[5];
}

export function formattedSimilarity(person: ScoredPerson) {
  const score = similarity(person);
  const formatted = percentage.format(score);
  const roundsUpToGrade = similarityGrades.some(({ minimum }) =>
    score < minimum && formatted === percentage.format(minimum),
  );
  return roundsUpToGrade ? `<${formatted}` : formatted;
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
