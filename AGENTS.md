# Repository guide

- This static React, TypeScript, and Vite site compares 2022 and 2026 councilor platform text. Write user-facing copy in Traditional Chinese for Taiwan.
- UI lives in `src/`. Keep public comparison records and their source URLs in `public/data.json`. Use `scripts/compare_roster.py` with the checked-in roster and the locally downloaded Taiwan Votes CSVs to regenerate it.
- Preserve the distinction between ranked, approximate, and pending records. Retention is twice the longest common subsequence length divided by the combined normalized character counts for 2022 and 2026. Use the unrounded score for ranking and grades. Update the scope text when the dataset changes.
- Preserve existing profile IDs used in `?id=` links and compatibility with legacy `?name=` links.
- Use `npm ci` for dependencies, `npm run dev` for local development, and `npm run check` and `npm run build` to verify changes. Keep generated build output and local dependencies out of commits.
