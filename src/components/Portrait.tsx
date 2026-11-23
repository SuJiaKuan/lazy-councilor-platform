import { useState } from 'react';
import type { Person } from '../people';

export function Portrait({ person }: { person: Person }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  return (
    <span className="portrait" aria-hidden="true">
      {status !== 'ready' && Array.from(person.name)[0]}
      {person.portrait && status !== 'failed' && (
        <img src={person.portrait.url} alt="" width="40" height="40" loading="lazy"
          decoding="async" referrerPolicy="no-referrer" data-loaded={status === 'ready' || undefined}
          onLoad={() => setStatus('ready')} onError={() => setStatus('failed')} />
      )}
    </span>
  );
}
