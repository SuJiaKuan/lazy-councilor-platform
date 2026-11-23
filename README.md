# 誰是政見偷懶王

四年前寫過的政見，這次又出現了多少？本站逐字比對 2022 與 2026 年議員選舉公報的政見，呈現相似度、全國排名與全文增刪。

目前涵蓋全國 22 縣市在 2022 年當選且 2026 年再參選的 695 人，其中 683 人列入排名，12 人暫不計分。兩屆都以 Taiwan Votes 的公報轉錄為底稿，原始公報連結見個人明細。相似度描述文字重用程度，履約與問政表現需另查執行紀錄。

## 網站使用方式

- 可依姓名、縣市、選區及黨籍篩選，也可一次清除所有條件。選區須先選縣市。清單預設依相似度由高到低，也可切換為由低到高。卡片顯示全國名次。
- 桌面版每頁顯示 12 人。手機版先顯示 8 人，可分批展開。
- 點開議員卡片可查看兩屆全文、逐字增刪、照片與資料來源，並複製個人連結。新連結使用 `?id=`，既有 `?name=` 連結仍可開啟可辨識的對象。

## 相似度與排名

政見先統一全半形、大小寫及少數異體字，並略過空白、一般標點與手機號碼，再用最長共同子序列（LCS）找出依原順序保留的字元。相似度為「2 × 共同字元數 ÷ 兩屆字元數總和」。新增和刪除都會降低分數。本站採用 ROUGE-L 的等權 F1 形式。 [ROUGE 論文](https://aclanthology.org/W04-1013/)

排序與六級分級都使用未四捨五入的分數，分數完全相同才並列。已知轉錄缺文、順序錯置或圖檔政見缺少可核對全文時，該筆暫不計分。若資料含有舊版的人工摘要試算紀錄，該筆可查看試算結果，順位留空。

## 開發與建置

需要 Node.js 20.16 以上的 20.x，或 22.12 以上。使用 npm 和已提交的 lockfile。

```sh
npm ci
npm run dev
```

開啟 http://localhost:5174/ 。Vite 提供即時更新，React 元件支援 Fast Refresh。開發伺服器使用固定埠，埠被佔用時會報錯。

```sh
npm run check    # TypeScript 型別、公開資料格式、排名與分級測試
npm run build    # 產出 dist/
npm run preview  # 在 http://localhost:4173/ 預覽建置結果
```

## 靜態部署

在主機上以儲存庫根目錄執行 `npm ci` 和 `npm run build`，發布 `dist/`，入口為 `index.html`。建置使用相對資產路徑，因此可部署在網域根目錄或子目錄。

正式網址確定後，在主機的建置環境設定 `SITE_URL` 為完整的 HTTPS 首頁網址，部署在子目錄時也一併填入路徑。建置時會加入標準網址、全站共用的社群預覽圖與網站結構化資料。個人頁在瀏覽器開啟後，分頁標題會帶入議員姓名。

## 專案結構

| 路徑 | 用途 |
| --- | --- |
| `src/App.tsx` | 頁首、資料載入、個人連結與分享 |
| `src/components/` | 排名與篩選、議員明細、方法與來源 |
| `src/people.ts` | 資料型別、載入、相似度、排名與分級 |
| `src/styles.css`、`src/useMobile.ts` | 響應式樣式與手機版互動 |
| `index.html`、`vite.config.ts`、`public/share.png` | 網站標題、搜尋中繼資料、分享預覽與建置設定 |
| `public/data.json` | 公開資料，開發與正式建置共用 |
| `data/reelection-2026.csv`、`data/reelection-2026-summary.csv` | 連任名單與縣市收錄統計 |
| `scripts/download_platforms.py`、`scripts/compare_roster.py` | 下載政見 CSV、依名冊產生公開 JSON |
| `scripts/prepare_data.py` | 舊版資料匯入工具，提供現行流程共用的文字正規化與逐字比對 |
| `tests/` | 公開資料格式、相似度、排名與分級測試 |

## 黨徽來源

卡片上的黨徽依 2026 候選人名冊的推薦政黨顯示。來源如下：

- [中國國民黨](https://commons.wikimedia.org/wiki/File:Emblem_of_the_Kuomintang.svg)
- [民主進步黨](https://commons.wikimedia.org/wiki/File:Green_Taiwan_with_White_Cross_(cropped).svg)
- [新黨](https://commons.wikimedia.org/wiki/File:Np_logo.png)
- [社會民主黨](https://commons.wikimedia.org/wiki/File:Social_Democratic_Party_Taiwan_Logo.svg)
- [台灣團結聯盟](https://www.tsu.org.tw/%E9%BB%A8%E7%B6%B1%E8%88%87%E9%BB%A8%E7%AB%A0)
- [勞動黨](https://ws.moi.gov.tw/001/Upload/444/relfile/13073/561/7c92b857-fd75-4c1f-9f5e-25227aa9e3e7.pdf)
- [親民黨](https://commons.wikimedia.org/wiki/File:LogoPFP.svg)

## 更新資料

下載兩屆共六份 Taiwan Votes 公報政見 CSV 至 `data/platform-csv/`，再依連任名單產出候選檔。下載的 CSV 只放在本機。生成器也會從現有的 `public/data.json` 沿用已整理的姓名、屆數及照片資料。

```sh
python3 scripts/download_platforms.py
python3 scripts/compare_roster.py --output /tmp/councilor-data.json
```

核對候選檔的人數、來源與頁碼、缺文原因和個人識別碼。確認差異後，以候選檔更新 `public/data.json`，再執行 `npm run check` 與 `npm run build`。

擴充收錄前，先確認 2022 當選結果、2026 正式候選人公報及兩屆政見正文。保留既有 `id`，並確認舊的 `?name=` 連結仍可使用。收錄範圍變動時，一併核對本頁人數、縣市統計，以及網站的「怎麼算？資料哪來？」。
