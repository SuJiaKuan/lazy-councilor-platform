# Repository guide

- This static React, TypeScript, and Vite site compares 2022 and 2026 councilor platform text. Write user-facing copy in Traditional Chinese for Taiwan.
- UI lives in `src/`. Keep public comparison records and their source URLs in `public/data.json`. The Python generator consumes an upstream file that is outside this repository.
- Preserve the distinction between scored, approximate, and pending records. Retention is kept characters divided by the 2026 total. Update the scope text when the dataset changes.
- Keep existing `?name=` profile links working when changing how records are identified.
- Use `npm ci` for dependencies, `npm run dev` for local development, and `npm run check` and `npm run build` to verify changes. Keep generated build output and local dependencies out of commits.
