import { useLayoutEffect, useRef, useState } from 'react';
import { compareSimilarity, constituency, formattedSimilarity, isScored, similarityGrade, similarityRanks } from '../people';
import type { Person } from '../people';
import { useMobile } from '../useMobile';
import { Portrait } from './Portrait';

interface Props {
  people: Person[];
  cities: string[];
  onSelect: (person: Person, opener: HTMLButtonElement) => void;
}

const pageSize = 12;
const mobileBatch = 8;
const searchKey = (name: string) => name.trim().replaceAll('台', '臺');
const partyLogos = new Map([
  ['中國國民黨', 'kmt'],
  ['民主進步黨', 'dpp'],
  ['新黨', 'np'],
  ['社會民主黨', 'sdp'],
  ['台灣團結聯盟', 'tsu'],
  ['勞動黨', 'labor'],
  ['親民黨', 'pfp'],
]);

export function Comparison({ people, cities, onSelect }: Props) {
  const mobile = useMobile();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [party, setParty] = useState('');
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [shown, setShown] = useState(mobileBatch);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const filterToggle = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const append = useRef<{ index: number; scroll: number; focus: boolean }>(null);
  const results = useRef<HTMLHeadingElement>(null);
  const cityPeople = city ? people.filter((person) => person.city === city) : people;
  const districts = city ? [...new Set(cityPeople.map((person) => String(person.district)))].sort(
    (a, b) => a.localeCompare(b, 'zh-TW', { numeric: true }),
  ) : [];
  const parties = [...new Set(people.flatMap((person) => person.party ? [person.party] : []))]
    .sort((a, b) => a.localeCompare(b, 'zh-TW'));
  const visible = cityPeople.filter((person) =>
    (!district || String(person.district) === district) &&
    (!party || person.party === party) &&
    searchKey(person.name).includes(searchKey(query)),
  );
  const allScored = people.filter(isScored);
  const confirmed = allScored.filter((person) => !person.note);
  const rankable = confirmedOnly ? confirmed : allScored.filter((person) => !person.note || person.transcribed);
  const ranks = similarityRanks(rankable);
  const rankCounts = new Map<number, number>();
  for (const rank of ranks.values()) rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1);
  const scored = visible.filter(isScored).filter((person) => !confirmedOnly || !person.note).sort((a, b) =>
    Number(ranks.has(b.id)) - Number(ranks.has(a.id)) ||
    compareSimilarity(a, b) || a.name.localeCompare(b.name, 'zh-TW'),
  );
  const pending = confirmedOnly ? [] : visible.filter((person) => !isScored(person));
  const matches = [...scored, ...pending];
  const totalPages = Math.ceil(matches.length / pageSize);
  const pagePeople = mobile ? matches.slice(0, shown) : matches.slice((page - 1) * pageSize, page * pageSize);
  const remaining = matches.length - pagePeople.length;
  const activeFilters = [
    { label: city, clear: changeCity },
    { label: district && `第 ${district} 選區`, clear: setDistrict },
    { label: party, clear: setParty },
  ].filter(({ label }) => label);

  function resetPosition() {
    setPage(1);
    setShown(mobileBatch);
  }

  function changeCity(value: string) {
    setCity(value);
    setDistrict('');
  }

  function resetSearch() {
    setQuery('');
    changeCity('');
    setParty('');
    setConfirmedOnly(false);
    resetPosition();
    (mobile ? filterToggle.current : search.current)?.focus();
  }

  function showMore(moveFocus: boolean) {
    append.current = { index: shown, scroll: window.scrollY, focus: moveFocus || remaining <= mobileBatch };
    setShown(shown + mobileBatch);
  }

  useLayoutEffect(() => {
    const addition = append.current;
    if (!addition) return;
    append.current = null;
    window.scrollTo({ top: addition.scroll });
    if (addition.focus) list.current?.querySelectorAll('button')[addition.index]?.focus({ preventScroll: true });
  }, [shown]);

  function goToPage(next: number) {
    setPage(next);
    results.current?.focus({ preventScroll: true });
    results.current?.scrollIntoView({ block: 'start' });
  }

  return (
    <>
      <div className="controls">
        <label className="name-search">
          <span>姓名</span>
          <input ref={search} type="search" aria-label="搜尋議員姓名" placeholder="搜尋議員姓名" autoComplete="off" value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              resetPosition();
            }} />
        </label>
        <button ref={filterToggle} className="filter-toggle" type="button" aria-expanded={filtersOpen}
          aria-controls="ranking-filters" onClick={() => setFiltersOpen(!filtersOpen)}>
          {filtersOpen ? '收合篩選' : '篩選'}{activeFilters.length > 0 && `（${activeFilters.length}）`}
        </button>
        <div id="ranking-filters" className="ranking-filters" data-open={filtersOpen}>
          <label>
            縣市
            <select value={city} onChange={(event) => {
              changeCity(event.target.value);
              resetPosition();
            }}>
              <option value="">全部縣市</option>
              {cities.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label>
            選區
            <select value={district} disabled={!city} onChange={(event) => {
              setDistrict(event.target.value);
              resetPosition();
            }}>
              <option value="">全部選區</option>
              {districts.map((value) => <option key={value} value={value}>第 {value} 選區</option>)}
            </select>
          </label>
          <label>
            黨籍
            <select value={party} onChange={(event) => {
              setParty(event.target.value);
              resetPosition();
            }}>
              <option value="">全部黨籍</option>
              {parties.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
        </div>
        {activeFilters.length > 0 && (
          <ul className="applied-filters" aria-label="已選篩選條件">
            {activeFilters.map(({ label, clear }) => (
              <li key={label}>
                <button type="button" aria-label={`移除篩選條件：${label}`} onClick={() => {
                  clear('');
                  resetPosition();
                  filterToggle.current?.focus();
                }}>
                  {label} <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="controls-reset" type="button" onClick={resetSearch}
          disabled={!query && !city && !district && !party && !confirmedOnly && (mobile ? shown === mobileBatch : page === 1)}>
          清除所有條件
        </button>
      </div>
      {confirmed.length > 0 && (
        <details className="ranking-options">
          <summary>排名選項</summary>
          <label className="ranking-toggle">
            <input type="checkbox" checked={confirmedOnly}
              onChange={(event) => {
                setConfirmedOnly(event.target.checked);
                resetPosition();
              }} />
            只看已核對資料
          </label>
        </details>
      )}
      <div className="ranking-heading">
        <h2 ref={results} tabIndex={-1}>{confirmedOnly ? '已核對排名' : '誰寫得最像上次？'}</h2>
        <p>百分比越高，兩屆公報的寫法越接近。</p>
      </div>
      <p className="sr-only" role="status">
        {matches.length === 0 ? '沒有符合的人選。' : mobile
          ? `已顯示 ${pagePeople.length}／${matches.length} 位。`
          : `第 ${page} 頁，共 ${totalPages} 頁，${matches.length} 筆結果。`}
      </p>
      {matches.length === 0 && <p className="empty-result">沒有符合的人選。可調整搜尋條件。</p>}
      {pagePeople.length > 0 && (
        <ul className="ranking-grid" ref={list} key={mobile ? 'mobile' : page}>
          {pagePeople.map((person) => {
            const rank = ranks.get(person.id);
            const grade = isScored(person) ? similarityGrade(person) : undefined;
            const logo = person.party && partyLogos.get(person.party);
            const rankLabel = rank === undefined ? '未列名次'
              : (rankCounts.get(rank) ?? 0) > 1 ? `並列第 ${rank} 名` : `第 ${rank} 名`;
            return (
              <li key={person.id}>
                <button className="candidate-card" type="button"
                  onClick={(event) => onSelect(person, event.currentTarget)}>
                  <span className="card-photo"><Portrait person={person} /></span>
                  <span className="card-body">
                    <span className="rank">{rankLabel}</span>
                    <span className="candidate-name">{person.name}</span>
                    <span className="candidate-meta">
                      <span>{constituency(person)}</span>
                      {person.party && (
                        <span className="candidate-party">
                          {logo && (
                            <img src={`${import.meta.env.BASE_URL}party-logos/${logo}.png`}
                              alt="" width="20" height="20" decoding="async" />
                          )}
                          {person.party}
                        </span>
                      )}
                    </span>
                    {isScored(person) ? (
                      <span className="candidate-score">
                        <span className="score-label">文字保留率</span>
                        <span className="graded-score" data-grade={grade?.id}>
                          <strong>{formattedSimilarity(person)}</strong>
                          <span className="score-grade">{grade?.label}</span>
                        </span>
                      </span>
                    ) : (
                      <span className="card-note">待補原文</span>
                    )}
                    <span className="card-link">看兩屆差異</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {mobile && matches.length > mobileBatch && (
        <div className="load-more">
          <p aria-hidden="true">已顯示 {pagePeople.length}／{matches.length} 位</p>
          {remaining > 0 && (
            <button type="button" onClick={(event) => showMore(event.detail === 0)}>
              再看 {Math.min(mobileBatch, remaining)} 位
            </button>
          )}
        </div>
      )}
      {!mobile && totalPages > 1 && (
        <nav className="pagination" aria-label="排名分頁">
          <button type="button" disabled={page === 1} onClick={() => goToPage(page - 1)}>上一頁</button>
          <select aria-label="前往頁碼" value={page} onChange={(event) => goToPage(Number(event.target.value))}>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
              <option key={number} value={number}>第 {number}／{totalPages} 頁</option>
            ))}
          </select>
          <button type="button" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>下一頁</button>
        </nav>
      )}
    </>
  );
}
