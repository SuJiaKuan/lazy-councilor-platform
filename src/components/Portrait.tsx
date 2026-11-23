import { useState } from 'react';
import type { Person } from '../people';

export function Portrait({ person }: { person: Person }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="portrait" aria-hidden="true">
      {person.portrait && !failed ? (
        <img src={person.portrait.url} alt="" width="40" height="40" loading="lazy"
          decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : Array.from(person.name)[0]}
    </span>
  );
}
