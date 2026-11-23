import { useState } from 'react';
import { constituency, formattedCounts, formattedRetention, isScored, retention } from '../people';
import type { Person } from '../people';

interface Props {
  people: Person[];
  cities: string[];
  onSelect: (person: Person, opener: HTMLButtonElement) => void;
}

const ticks = ['0%', '25%', '50%', '75%', '100%'];
const searchKey = (name: string) => name.trim().replaceAll('台', '臺');

export function Comparison({ people, cities, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const visible = people.filter((person) =>
    (!city || person.city === city) && searchKey(person.name).includes(searchKey(query)),
  );
  const scored = visible.filter(isScored).sort((a, b) =>
    retention(b) - retention(a) || a.name.localeCompare(b.name, 'zh-TW'),
  );
  const pending = visible.filter((person) => !isScored(person));
  const allScored = people.filter(isScored);
  const approximate = allScored.filter((person) => person.note).length;

  return (
    <>
      <div className="controls">
        <label>
          姓名搜尋
          <input type="search" placeholder="輸入議員姓名" autoComplete="off" value={query}
            onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>
          縣市
          <select value={city} onChange={(event) => setCity(event.target.value)}>
            <option value="">全部縣市</option>
            {cities.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
      </div>
      <div className="legend">
        <p>保留字元 ÷ 2026 政見總字元</p>
        <span id="count" role="status">顯示 {visible.length}／{people.length} 人</span>
      </div>
      <p className="subtle">
        {allScored.length} 人顯示字元保留率，其中 {approximate} 人標為試算。
        {people.length - allScored.length} 人列於「待補原文」。
      </p>
      <div className="chart" aria-label="議員比較結果">
        {visible.length === 0 && <p>沒有符合的人選。可清除姓名或切換縣市。</p>}
        {scored.length > 0 && (
          <div className="axis" aria-hidden="true">
            <span>議員</span>
            <div className="ticks">{ticks.map((tick) => <span key={tick}>{tick}</span>)}</div>
          </div>
        )}
        {scored.map((person) => (
          <button key={person.name} className="row" type="button"
            onClick={(event) => onSelect(person, event.currentTarget)}>
            <span className="person">
              <strong>{person.name}</strong>
              {person.note && <span className="approx">含摘要・試算</span>}
              <small>{constituency(person)}</small>
            </span>
            <span className="track" aria-hidden="true">
              <span className="fill" style={{ width: `${retention(person) * 100}%` }} />
            </span>
            <span className="pct">{formattedRetention(person)}<small>{formattedCounts(person)}</small></span>
          </button>
        ))}
        {pending.length > 0 && (
          <section className="pending">
            <h3>待補原文</h3>
            {pending.map((person) => (
              <button key={person.name} className="row pending-row" type="button"
                onClick={(event) => onSelect(person, event.currentTarget)}>
                <span className="person">
                  <strong>{person.name}</strong><small>{constituency(person)}</small>
                </span>
                <span className="pending-reason">{person.unscoredReason}</span>
                <span className="pending-label">暫不計分</span>
              </button>
            ))}
          </section>
        )}
      </div>
    </>
  );
}
