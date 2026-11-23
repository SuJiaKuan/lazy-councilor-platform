import { useState } from 'react';
import { compareRetention, constituency, formattedCounts, formattedRetention, isScored, retention, retentionRanks } from '../people';
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
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const visible = people.filter((person) =>
    (!city || person.city === city) && searchKey(person.name).includes(searchKey(query)),
  );
  const allScored = people.filter(isScored);
  const confirmed = allScored.filter((person) => !person.note);
  const rankable = confirmedOnly ? confirmed : allScored.filter((person) => !person.note || person.transcribed);
  const ranks = retentionRanks(rankable);
  const scored = visible.filter(isScored).filter((person) => !confirmedOnly || !person.note).sort((a, b) =>
    Number(ranks.has(b.id)) - Number(ranks.has(a.id)) ||
    compareRetention(a, b) || a.name.localeCompare(b.name, 'zh-TW'),
  );
  const pending = confirmedOnly ? [] : visible.filter((person) => !isScored(person));
  const approximate = allScored.length - confirmed.length;
  const shown = scored.length + pending.length;

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
      <label className="ranking-toggle">
        <input type="checkbox" checked={confirmedOnly}
          onChange={(event) => setConfirmedOnly(event.target.checked)} />
        只看已核對排名
      </label>
      <div className="legend">
        <p>保留字元 ÷ 2026 政見總字元</p>
        <span id="count" role="status">顯示 {shown}／{people.length} 人</span>
      </div>
      <p className="subtle">
        已核對 {confirmed.length} 人，試算 {approximate} 人，待補原文 {people.length - allScored.length} 人。
        {confirmedOnly ? '名次依全站已核對資料計算。' : '全國名次含公報轉錄試算。摘要或摘錄的試算不列名次。'}
      </p>
      <div className="chart" aria-label="議員比較結果">
        {shown === 0 && <p>沒有符合的人選。可調整篩選條件。</p>}
        {scored.length > 0 && (
          <div className="axis" aria-hidden="true">
            <span>議員</span>
            <div className="ticks">{ticks.map((tick) => <span key={tick}>{tick}</span>)}</div>
          </div>
        )}
        {scored.map((person) => (
          <button key={person.id} className="row" type="button"
            onClick={(event) => onSelect(person, event.currentTarget)}>
            <span className="person">
              <strong>{person.name}</strong>
              {ranks.has(person.id) && <span className="rank">第 {ranks.get(person.id)} 名</span>}
              {person.note && <span className="approx">試算</span>}
              <small>{constituency(person)}</small>
            </span>
            <span className="track" aria-hidden="true">
              <span className="fill" style={{ width: `${retention(person) * 100}%` }} />
            </span>
            <span className="pct">{formattedRetention(person)}<small>{formattedCounts(person)}</small></span>
          </button>
        ))}
        {pending.length > 0 && (
          <details className="pending" open={Boolean(query.trim() || city)}>
            <summary>待補原文（{pending.length} 人）</summary>
            {pending.map((person) => (
              <button key={person.id} className="row pending-row" type="button"
                onClick={(event) => onSelect(person, event.currentTarget)}>
                <span className="person">
                  <strong>{person.name}</strong><small>{constituency(person)}</small>
                </span>
                <span className="pending-reason">{person.unscoredReason}</span>
                <span className="pending-label">暫不計分</span>
              </button>
            ))}
          </details>
        )}
      </div>
    </>
  );
}
