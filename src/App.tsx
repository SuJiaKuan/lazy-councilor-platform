import { useEffect, useRef, useState } from 'react';
import { Comparison } from './components/Comparison';
import { Method } from './components/Method';
import { ProfileDialog } from './components/ProfileDialog';
import { loadPeople } from './people';
import type { Person } from './people';

type Dataset = { status: 'loading' | 'error' } | { status: 'ready'; people: Person[] };
const homeTitle = document.title;

function pageUrl(id?: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete('name');
  if (id) url.searchParams.set('id', id);
  else url.searchParams.delete('id');
  url.hash = '';
  return url;
}

function findLinkedProfile(people: Person[]) {
  const params = new URL(window.location.href).searchParams;
  const name = params.get('name');
  const id = params.get('id');
  const oldMatches = people.filter((person) => person.name === name);
  return people.find((person) => person.id === id) ??
    oldMatches.find((person) => person.terms !== undefined) ??
    (oldMatches.length === 1 ? oldMatches[0] : undefined);
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
      setPerson(findLinkedProfile(people));
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      console.error(error);
      setDataset({ status: 'error' });
    });
    return () => controller.abort();
  }, []);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  useEffect(() => {
    document.title = person ? `${person.name}的兩屆政見比對 | 誰是政見偷懶王` : homeTitle;
  }, [person]);

  useEffect(() => {
    if (dataset.status !== 'ready') return;
    const people = dataset.people;
    function followHistory() {
      const linked = findLinkedProfile(people);
      setPerson(linked);
      setCopiedUrl(undefined);
      if (!linked) {
        const button = opener.current;
        opener.current = null;
        requestAnimationFrame(() => button?.focus({ preventScroll: true }));
      }
    }
    window.addEventListener('popstate', followHistory);
    return () => window.removeEventListener('popstate', followHistory);
  }, [dataset]);

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
    history.pushState({ profileFromRanking: true }, '', pageUrl(selected.id));
    setPerson(selected);
  }

  function closeProfile() {
    if (!person) return;
    if (history.state?.profileFromRanking) {
      history.back();
      return;
    }
    history.replaceState(history.state, '', pageUrl());
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
          <div className="hero-title">
            <div>
              <h1><span>誰是政見</span><span>偷懶王</span></h1>
              <p className="intro">四年前寫過的政見，這次又出現了多少？</p>
            </div>
            <div className="edition">
              <span className="edition-years"><span>2022</span><span className="edition-divider">／</span><span>2026</span></span>
              <span>議員選舉公報逐字比對</span>
            </div>
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
