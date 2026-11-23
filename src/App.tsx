import { useEffect, useRef, useState } from 'react';
import { Comparison } from './components/Comparison';
import { Method } from './components/Method';
import { ProfileDialog } from './components/ProfileDialog';
import { isScored, loadPeople } from './people';
import type { Person } from './people';

type Dataset = { status: 'loading' | 'error' } | { status: 'ready'; people: Person[] };

function pageUrl(id?: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete('name');
  if (id) url.searchParams.set('id', id);
  else url.searchParams.delete('id');
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
      const params = new URL(window.location.href).searchParams;
      const name = params.get('name');
      const oldMatches = people.filter((candidate) => candidate.name === name);
      const legacy = oldMatches.find((candidate) => candidate.terms !== undefined);
      setPerson(people.find((candidate) => candidate.id === params.get('id')) ??
        legacy ?? (oldMatches.length === 1 ? oldMatches[0] : undefined));
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      console.error(error);
      setDataset({ status: 'error' });
    });
    return () => controller.abort();
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  async function share(id?: string) {
    const url = pageUrl(id);
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
    history.replaceState(null, '', pageUrl(selected.id));
    setPerson(selected);
  }

  function closeProfile() {
    history.replaceState(null, '', pageUrl());
    setPerson(undefined);
    setCopiedUrl(undefined);
    opener.current?.focus({ preventScroll: true });
    opener.current = null;
  }

  const people = dataset.status === 'ready' ? dataset.people : [];
  const cities = [...new Set(people.map((candidate) => candidate.city))];
  const scored = people.filter(isScored);
  const ranked = scored.filter((candidate) => !candidate.note || candidate.transcribed).length;

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
            <p className="intro">查詢全國 2022 年當選、2026 年再參選的議員。依兩屆公報的字元保留率排序，點開可查看逐字增刪與來源。</p>
          </div>
          {dataset.status === 'ready' && (
            <div className="hero-numbers" aria-label="樣本構成">
              <div><strong>{dataset.people.length}</strong><span>位議員</span></div>
              <div><strong>{cities.length}</strong><span>個縣市</span></div>
              <div><strong>{ranked}</strong><span>位列入初步排名</span></div>
            </div>
          )}
        </section>
        <section id="compare" className="compare" aria-labelledby="comparison-heading">
          <div className="section-head">
            <div><p className="kicker">兩屆比較</p><h2 id="comparison-heading">找議員，看差異</h2></div>
            <a className="muted method-link" href="#method">這些數字怎麼算？</a>
          </div>
          {dataset.status === 'ready' && (
            <Comparison people={people} cities={cities} onSelect={openProfile} />
          )}
          {dataset.status === 'loading' && <p role="status">載入資料中…</p>}
          {dataset.status === 'error' && <p role="alert">資料載入失敗，請重新整理。</p>}
        </section>
        <Method />
      </main>
      <ProfileDialog person={person} onClose={closeProfile} onShare={share}
        copied={Boolean(person && copiedUrl?.searchParams.get('id') === person.id)} />
      <div className="toast" role="status" hidden={!copiedUrl || Boolean(person)}>已複製網址</div>
    </>
  );
}
