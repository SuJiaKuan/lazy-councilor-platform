import { Fragment, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { constituency, formattedSimilarity, isScored, similarityGrade } from '../people';
import type { Person, ScoredPerson } from '../people';
import { useMobile } from '../useMobile';
import { Portrait } from './Portrait';

interface Props {
  person: Person | undefined;
  copied: boolean;
  onClose: () => void;
  onShare: (id: string) => void;
}

const years = [2022, 2026] as const;
type Year = typeof years[number];

function DiffColumn({ year, label, diff, tabbed, selected }: {
  year: Year;
  label: string;
  diff: ScoredPerson['oldDiff'] | ScoredPerson['newDiff'];
  tabbed: boolean;
  selected: boolean;
}) {
  return (
    <section className="diff-column" id={`platform-${year}`} hidden={tabbed && !selected}
      role={tabbed ? 'tabpanel' : undefined} aria-labelledby={tabbed ? `year-tab-${year}` : undefined}
      tabIndex={tabbed && selected ? 0 : undefined}>
      <h4><span>{year}</span>{label}</h4>
      <p className="diff-text">
        {diff.map(([op, content], index) => (
          <Fragment key={index}>
            {op === '=' ? content : op === '-' ? <del>{content}</del> : <ins>{content}</ins>}
          </Fragment>
        ))}
      </p>
    </section>
  );
}

function PlatformDiff({ person }: { person: ScoredPerson }) {
  const mobile = useMobile();
  const [year, setYear] = useState<Year>(2026);
  const tabs = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const label = person.note ? '政見比對稿' : '政見全文';

  function selectYear(next: Year) {
    if (year === next) return;
    setYear(next);
    const tabBar = tabs.current;
    const toolbarBottom = tabBar?.closest('.sheet')?.querySelector('.profile-actions')?.getBoundingClientRect().bottom;
    if (tabBar && toolbarBottom !== undefined && tabBar.getBoundingClientRect().top <= toolbarBottom + 2) {
      heading.current?.scrollIntoView({ block: 'start' });
    }
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const next = event.key === 'Home' ? 2022 : event.key === 'End' ? 2026
      : ['ArrowLeft', 'ArrowRight'].includes(event.key) ? (year === 2022 ? 2026 : 2022) : undefined;
    if (!next) return;
    event.preventDefault();
    selectYear(next);
    tabs.current?.querySelector<HTMLButtonElement>(`#year-tab-${next}`)?.focus({ preventScroll: true });
  }

  return (
    <section className="full-diff">
      <h3 ref={heading}>這次改了哪裡？</h3>
      {person.added === 0 && person.removed === 0 ? (
        <p className="diff-key">兩屆比對文字相同</p>
      ) : (
        <div className="diff-key"><del>刪除文字</del><ins>新增文字</ins><span>保留文字</span></div>
      )}
      {mobile && (
        <div ref={tabs} className="year-tabs" role="tablist" aria-label="切換政見年份">
          {years.map((option) => (
            <button key={option} type="button" role="tab" id={`year-tab-${option}`}
              aria-selected={year === option} aria-controls={`platform-${option}`}
              tabIndex={year === option ? 0 : -1} onKeyDown={onTabKeyDown} onClick={() => selectYear(option)}>
              {option} 政見
            </button>
          ))}
        </div>
      )}
      <div className="diff-columns">
        <DiffColumn year={2022} label={label} diff={person.oldDiff} tabbed={mobile} selected={year === 2022} />
        <DiffColumn year={2026} label={label} diff={person.newDiff} tabbed={mobile} selected={year === 2026} />
      </div>
    </section>
  );
}

export function ProfileDialog({ person, copied, onClose, onShare }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const grade = person && isScored(person) ? similarityGrade(person) : undefined;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!person) {
      if (element.open) element.close();
      return;
    }
    if (!element.open) element.showModal();
    element.scrollTop = 0;
    closeButton.current?.focus();
  }, [person]);

  return (
    <dialog ref={dialog} aria-labelledby="profile-name" onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}>
      {person && (
        <div className="sheet">
          <div className="profile-actions">
            <button ref={closeButton} type="button" className="text-button"
              onClick={() => dialog.current?.close()}>返回排名</button>
            <button type="button" className="share"
              onClick={() => onShare(person.id)}>複製分享連結</button>
          </div>
          <header className="sheet-head">
            <div className="person-with-portrait">
              <Portrait key={person.id} person={person} />
              <div>
                <p className="kicker">{constituency(person)}{person.terms && `・截至 2022 當選 ${person.terms} 屆`}</p>
                <h2 id="profile-name">{person.name}</h2>
                {person.party && <p className="subtle">{person.party === '無黨籍' ? '2026 無黨籍參選' : `2026 推薦政黨・${person.party}`}</p>}
              </div>
            </div>
          </header>
          {isScored(person) ? (
            <>
              <div className="profile-score" data-grade={grade?.id}>
                <div>
                  <span>文字保留率</span>
                  <strong>{formattedSimilarity(person)}</strong>
                  {grade && <span className="score-grade">{grade.label} · {grade.range}</span>}
                </div>
                <span>數字越高，兩屆政見共同保留的文字比例越高。</span>
              </div>
              <PlatformDiff key={person.id} person={person} />
            </>
          ) : (
            <section className="quality-note">
              <strong>暫不計分</strong><p>{person.unscoredReason}</p>
            </section>
          )}
          <details className="profile-sources">
            <summary>資料來源</summary>
            {isScored(person) && person.note && <p className="subtle quality-note">{person.note}</p>}
            <div className="profile-links">
              <a href={person.sources[0]} target="_blank" rel="noopener">{person.sourceLabels?.[0] ?? '2022 官方公報'}</a>
              <a href={person.sources[1]} target="_blank" rel="noopener">{person.sourceLabels?.[1] ?? '2026 官方公報'}</a>
              {person.portrait && <a href={person.portrait.source} target="_blank" rel="noopener">照片來源（內政部）</a>}
            </div>
          </details>
        </div>
      )}
      <div className="toast" role="status" hidden={!copied}>已複製網址</div>
    </dialog>
  );
}
