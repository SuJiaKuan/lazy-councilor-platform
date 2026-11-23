# 誰是政見偷懶王

那些 2026 尋求連任的議員們。用選舉公報比較 2022 與 2026 的政見文字，顯示字元保留率、逐字增刪及個別公報來源。

目前沿用 ZIP 內的雙北 49 人樣本，其中 6 人標為試算、2 人待補原文。完整的 2022 當選且 2026 再參選名單是下一階段的資料工作。字元保留率描述文字重用程度，履約與問政表現需另查執行紀錄。

## 開發與建置

需要 Node.js 20.16 以上的 20.x，或 22.12 以上。使用 npm 和已提交的 lockfile。

```sh
npm ci
npm run dev
```

開啟 http://localhost:5173/ 。Vite 提供即時更新，React 元件支援 Fast Refresh。開發伺服器使用固定埠，埠被佔用時會報錯。

```sh
npm run check    # TypeScript 型別與資料契約
npm run build    # 產出 dist/
npm run preview  # 在 http://localhost:4173/ 預覽建置結果
```

正式部署時將 `dist/` 交給靜態主機，入口是 `index.html`。建置使用相對資產路徑，因此可部署在網域根目錄或子目錄。

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `src/App.tsx` | 頁首、樣本統計、載入狀態與分享網址 |
| `src/components/` | 排名與篩選、議員明細、方法與來源 |
| `src/people.ts` | 資料型別、載入與字元保留率 |
| `src/styles.css` | 網站樣式與響應式版面 |
| `public/data.json` | 公開資料，開發與正式建置共用 |
| `scripts/prepare_data.py` | 上游文字資料轉成公開 JSON |
| `tests/dataset.test.js` | 檢查公開資料格式與明細連結 |

## 更新資料

有上游 `finaldata.json` 時，可以先產出候選檔以檢查差異，再更新 `public/data.json`。原始 ZIP 未附上游檔，已附的公開資料可直接使用。

```sh
python3 scripts/prepare_data.py /path/to/finaldata.json --output /tmp/councilor-data.json
```

擴充收錄前，先確認 2022 當選結果、2026 正式候選人公報及兩屆政見正文。保留逐人來源、頁碼，以及摘要或缺文狀態。網站從資料計算人數並建立縣市選項。更新收錄範圍時也要更新方法說明。個人連結沿用 `?name=`，若擴充後出現同名議員，需先遷移到唯一識別碼並處理既有連結。

## Git 與 tmux

在受管工作環境內，根目錄的 `.git` 為唯讀。如果提交記錄存於同一目錄下的 `.git-local/`，可用 `git --git-dir=.git-local --work-tree=. log --oneline` 查看。

若開發伺服器尚未在既有的 `lazy` session 啟動，可從專案根目錄開啟開發視窗。

```sh
tmux new-window -t '=lazy:' -n dev -c "$PWD" 'npm run dev'
```
