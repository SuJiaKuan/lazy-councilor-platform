const drawings = {
  search: (
    <>
      <path d="m14 14 5 5" strokeWidth="3" />
      <circle cx="10" cy="10" r="6" fill="#cae1d8" />
      <path d="M7 10a3 3 0 0 1 3-3" stroke="#fffdfa" />
    </>
  ),
  bulletin: (
    <>
      <path d="m3 5 6-1 6 2 6-2-1 14-5 2-6-2-6 1z" fill="#f8e6c6" />
      <path d="M9 7v8m6-6v8M5 9l2-.4m10 2 2-.6" />
    </>
  ),
  folder: (
    <>
      <path d="M3 18V6h7l2 3h8v9z" fill="#f8e6c6" />
      <path d="m3 18 2-7h17l-2 7z" fill="#ebbd88" />
    </>
  ),
};

export function StationeryIcon({ kind }: { kind: keyof typeof drawings }) {
  return (
    <svg className="stationery-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {drawings[kind]}
    </svg>
  );
}
