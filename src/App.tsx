import { useEffect, useRef, useState } from 'react';
import { Comparison } from './components/Comparison';
import { Method } from './components/Method';
import { ProfileDialog } from './components/ProfileDialog';
import { loadPeople } from './people';
import type { Person } from './people';

type Dataset = { status: 'loading' | 'error' } | { status: 'ready'; people: Person[] };
const cityNames = new Intl.ListFormat('zh-TW', { style: 'narrow' });
const cityOrder = ['臺北市', '新北市'];

function pageUrl(name?: string) {
  const url = new URL(window.location.href);
  if (name) url.searchParams.set('name', name);
  else url.searchParams.delete('name');
  url.hash = '';
  return url;
}

export function App() {
  const [dataset, setDataset] = useState<Dataset>({ status: 'loading' });
  const [person, setPerson] = useState<Person>();
  const [copiedUrl, setCopiedUrl] = useState<URL>();
  const opener = useRef<HTMLButtonElement>(null);
  const toastTimer = useRef<number>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    loadPeople(controller.signal).then((people) => {
      if (controller.signal.aborted) return;
      setDataset({ status: 'ready', people });
      const name = new URL(window.location.href).searchParams.get('name');
      setPerson(people.find((candidate) => candidate.name === name));
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      console.error(error);
      setDataset({ status: 'error' });
    });
    return () => controller.abort();
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  async function share(name?: string) {
    const url = pageUrl(name);
    try {
      await navigator.clipboard.writeText(url.href);
      setCopiedUrl(url);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setCopiedUrl(undefined), 2300);
    } catch {
      window.prompt('複製以下網址', url.href);
    }
  }

  function openProfile(selected: Person, button: HTMLButtonElement) {
    opener.current = button;
    history.replaceState(null, '', pageUrl(selected.name));
    setPerson(selected);
  }

  function closeProfile() {
    if (new URL(window.location.href).searchParams.has('name')) {
      history.replaceState(null, '', pageUrl());
    }
    setPerson(undefined);
    setCopiedUrl(undefined);
    opener.current?.focus({ preventScroll: true });
    opener.current = null;
  }

  const counts = new Map<string, number>();
  if (dataset.status === 'ready') {
    for (const candidate of dataset.people) {
      counts.set(candidate.city, (counts.get(candidate.city) ?? 0) + 1);
    }
  }
  const cities = [...cityOrder.filter((city) => counts.has(city)),
    ...[...counts.keys()].filter((city) => !cityOrder.includes(city)).sort()];

  return (
    <>
      <header className="top">
        <div className="shell top-inner">
          <a className="brand" href="./">政見文字比對</a>
          <nav aria-label="頁面導覽">
            <a href="#compare">比較</a><a href="#method">方法與來源</a>
            <button className="share" type="button" onClick={() => share()}>分享</button>
          </nav>
        </div>
      </header>
      <main className="shell">
        <section className="hero">
          <div>
            <p className="kicker">議員選舉公報・2022–2026</p>
            <h1>誰是政見偷懶王</h1>
            <p className="subtitle">那些 2026 尋求連任的議員們</p>
            <p className="intro">比較目前收錄的雙北議員政見文字。依字元保留率排序，點開可看兩屆公報的逐字增刪。</p>
          </div>
          {dataset.status === 'ready' && (
            <div className="hero-numbers" aria-label="樣本構成">
              <div><strong>{dataset.people.length}</strong><span>位議員</span></div>
              {cities.length > 0 && (
                <div>
                  <strong>{cities.map((city) => counts.get(city)).join(' / ')}</strong>
                  <span>{cityNames.format(cities)}</span>
                </div>
              )}
              <div><strong>2022–26</strong><span>公報比較期間</span></div>
            </div>
          )}
        </section>
        <section id="compare" className="compare" aria-labelledby="comparison-heading">
          <div className="section-head">
            <div><p className="kicker">兩屆比較</p><h2 id="comparison-heading">找議員，看差異</h2></div>
            <a className="muted method-link" href="#method">這些數字怎麼算？</a>
          </div>
          {dataset.status === 'ready' && (
            <Comparison people={dataset.people} cities={cities} onSelect={openProfile} />
          )}
          {dataset.status === 'loading' && <p role="status">載入資料中…</p>}
          {dataset.status === 'error' && <p role="alert">資料載入失敗，請重新整理。</p>}
        </section>
        <Method />
      </main>
      <ProfileDialog person={person} onClose={closeProfile} onShare={share}
        copied={Boolean(person && copiedUrl?.searchParams.get('name') === person.name)} />
      <div className="toast" role="status" hidden={!copiedUrl || Boolean(person)}>已複製網址</div>
    </>
  );
}
