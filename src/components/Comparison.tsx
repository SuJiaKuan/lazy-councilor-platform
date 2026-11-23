import { useState } from 'react';
import { compareSimilarity, constituency, formattedSimilarity, isScored, similarity, similarityRanks } from '../people';
import type { Person } from '../people';
import { Portrait } from './Portrait';

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
  const [district, setDistrict] = useState('');
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const cityPeople = city ? people.filter((person) => person.city === city) : people;
  const districts = [...new Set(cityPeople.map((person) => String(person.district)))].sort(
    (a, b) => a.localeCompare(b, 'zh-TW', { numeric: true }),
  );
  const visible = cityPeople.filter((person) =>
    (!district || String(person.district) === district) &&
    searchKey(person.name).includes(searchKey(query)),
  );
  const allScored = people.filter(isScored);
  const confirmed = allScored.filter((person) => !person.note);
  const transcribed = allScored.filter((person) => person.note && person.transcribed);
  const rankable = confirmedOnly ? confirmed : [...confirmed, ...transcribed];
  const ranks = similarityRanks(rankable);
  const scored = visible.filter(isScored).filter((person) => !confirmedOnly || !person.note).sort((a, b) =>
    Number(ranks.has(b.id)) - Number(ranks.has(a.id)) ||
    compareSimilarity(a, b) || a.name.localeCompare(b.name, 'zh-TW'),
  );
  const pending = confirmedOnly ? [] : visible.filter((person) => !isScored(person));
  const excerpts = allScored.length - confirmed.length - transcribed.length;
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
          <select value={city} onChange={(event) => {
            setCity(event.target.value);
            setDistrict('');
          }}>
            <option value="">全部縣市</option>
            {cities.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <label>
          選區
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="">全部選區</option>
            {districts.map((value) => <option key={value} value={value}>第 {value} 選區</option>)}
          </select>
        </label>
      </div>
      {confirmed.length > 0 && (
        <label className="ranking-toggle">
          <input type="checkbox" checked={confirmedOnly}
            onChange={(event) => setConfirmedOnly(event.target.checked)} />
          只看已核對排名
        </label>
      )}
      <div className="legend">
        <p>兩屆政見字元相似度</p>
        <span id="count" role="status">顯示 {shown}／{people.length} 人</span>
      </div>
      <p className="subtle">
        {confirmedOnly
          ? `已核對 ${confirmed.length} 人，名次依全站已核對資料計算。`
          : `全國排名 ${rankable.length} 人，待補原文 ${people.length - allScored.length} 人。`}
        {excerpts > 0 && !confirmedOnly && `另有 ${excerpts} 人採用摘要或摘錄，可查看分數，暫不列名次。`}
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
            <span className="person person-with-portrait">
              <Portrait person={person} />
              <span>
                <strong>{person.name}</strong>
                {ranks.has(person.id) && <span className="rank">第 {ranks.get(person.id)} 名</span>}
                {person.note && !person.transcribed && <span className="approx">摘要或摘錄</span>}
                <small>{constituency(person)}{person.party && `・${person.party}`}</small>
              </span>
            </span>
            <span className="track" aria-hidden="true">
              <span className="fill" style={{ width: `${similarity(person) * 100}%` }} />
            </span>
            <span className="pct">{formattedSimilarity(person)}</span>
          </button>
        ))}
        {pending.length > 0 && (
          <details className="pending" open={Boolean(query.trim() || city || district)}>
            <summary>待補原文（{pending.length} 人）</summary>
            {pending.map((person) => (
              <button key={person.id} className="row pending-row" type="button"
                onClick={(event) => onSelect(person, event.currentTarget)}>
                <span className="person person-with-portrait">
                  <Portrait person={person} />
                  <span>
                    <strong>{person.name}</strong>
                    <small>{constituency(person)}{person.party && `・${person.party}`}</small>
                  </span>
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
