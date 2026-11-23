import { useEffect, useRef, useState } from 'react';
import { Comparison } from './components/Comparison';
import { Method } from './components/Method';
import { ProfileDialog } from './components/ProfileDialog';
import { loadPeople } from './people';
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

  async function share(id: string) {
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

  return (
    <>
      <main className="shell">
        <header className="hero">
          <p className="edition">議員選舉公報比對 <span>2022 → 2026</span></p>
          <div className="hero-title">
            <h1>誰是政見<span>偷懶王</span></h1>
            <p className="intro">四年前寫過的政見，<br />這次又出現了多少？</p>
          </div>
        </header>
        <section id="compare" className="compare" aria-label="政見相似度排名">
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
    </>
  );
}
