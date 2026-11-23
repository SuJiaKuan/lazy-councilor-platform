import { useSyncExternalStore } from 'react';

const mobileQuery = window.matchMedia('(max-width: 760px)');

function subscribe(onChange: () => void) {
  mobileQuery.addEventListener('change', onChange);
  return () => mobileQuery.removeEventListener('change', onChange);
}

export function useMobile() {
  return useSyncExternalStore(subscribe, () => mobileQuery.matches);
}
