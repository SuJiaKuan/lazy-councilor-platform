import { Fragment, useEffect, useRef } from 'react';
import { constituency, formattedSimilarity, isScored } from '../people';
import type { Person, ScoredPerson } from '../people';
import { Portrait } from './Portrait';

interface Props {
  person: Person | undefined;
  copied: boolean;
  onClose: () => void;
  onShare: (id: string) => void;
}

function DiffColumn({ year, label, diff }: {
  year: number;
  label: string;
  diff: ScoredPerson['oldDiff'] | ScoredPerson['newDiff'];
}) {
  return (
    <section className="diff-column">
      <h4>{year} {label}</h4>
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

export function ProfileDialog({ person, copied, onClose, onShare }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !person) return;
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
          <header className="sheet-head">
            <div className="person-with-portrait">
              <Portrait key={person.id} person={person} />
              <div>
                <p className="kicker">{constituency(person)}{person.terms && `・截至 2022 當選 ${person.terms} 屆`}</p>
                <h2 id="profile-name">{person.name}</h2>
                {person.party && <p className="subtle">{person.party === '無黨籍' ? '2026 無黨籍參選' : `2026 推薦政黨・${person.party}`}</p>}
              </div>
            </div>
            <div className="profile-actions">
              <button type="button" className="share"
                onClick={() => onShare(person.id)}>複製分享連結</button>
              <button ref={closeButton} type="button" className="text-button"
                onClick={() => dialog.current?.close()}>關閉</button>
            </div>
          </header>
          {isScored(person) ? (
            <>
              <div className="profile-score">
                <strong>{formattedSimilarity(person)}</strong>
                <span>兩屆政見相似度</span>
              </div>
              <section className="full-diff">
                <h3>{person.note ? '比對稿逐字差異' : '全文逐字差異'}</h3>
                <div className="diff-key"><del>刪除文字</del><ins>新增文字</ins><span>保留文字</span></div>
                <div className="diff-columns">
                  <DiffColumn year={2022} label={person.note ? '政見比對稿' : '政見全文'} diff={person.oldDiff} />
                  <DiffColumn year={2026} label={person.note ? '政見比對稿' : '政見全文'} diff={person.newDiff} />
                </div>
              </section>
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
