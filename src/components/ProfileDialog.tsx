import { Fragment, useEffect, useRef } from 'react';
import { constituency, formattedCounts, formattedRetention, isScored } from '../people';
import type { Person, ScoredPerson } from '../people';

interface Props {
  person: Person | undefined;
  copied: boolean;
  onClose: () => void;
  onShare: (name: string) => void;
}

function DiffColumn({ year, diff }: { year: number; diff: ScoredPerson['oldDiff'] | ScoredPerson['newDiff'] }) {
  return (
    <section className="diff-column">
      <h4>{year} 政見全文</h4>
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
            <div>
              <p className="kicker">{constituency(person)}・截至 2022 當選 {person.terms} 屆</p>
              <h2 id="profile-name">{person.name}</h2>
            </div>
            <button ref={closeButton} type="button" className="share"
              onClick={() => dialog.current?.close()}>關閉</button>
          </header>
          <div className="profile-links">
            <a href={person.sources[0]} target="_blank" rel="noopener">2022 官方公報</a>
            <a href={person.sources[1]} target="_blank" rel="noopener">2026 官方公報</a>
            <button type="button" className="text-button"
              onClick={() => onShare(person.name)}>複製個人連結</button>
          </div>
          {isScored(person) ? (
            <>
              <div className="profile-score">
                <strong>{formattedRetention(person)}</strong>
                <span>字元保留率 · {formattedCounts(person)}</span>
              </div>
              {person.note && <p className="subtle quality-note">試算資料。　{person.note}</p>}
              <section className="full-diff">
                <h3>全文逐字差異</h3>
                <div className="diff-key"><del>刪除文字</del><ins>新增文字</ins><span>保留文字</span></div>
                <div className="diff-columns">
                  <DiffColumn year={2022} diff={person.oldDiff} />
                  <DiffColumn year={2026} diff={person.newDiff} />
                </div>
              </section>
            </>
          ) : (
            <section className="quality-note">
              <strong>暫不計分</strong><p>{person.unscoredReason}</p>
            </section>
          )}
        </div>
      )}
      <div className="toast" role="status" hidden={!copied}>已複製網址</div>
    </dialog>
  );
}
