import { dataUrl } from '../people';

export function Method() {
  return (
    <section id="method" className="method" aria-labelledby="method-heading">
      <p className="kicker">研究方法</p>
      <h2 id="method-heading">字元怎麼比？</h2>
      <dl>
        <dt>目前收錄範圍</dt>
        <dd>
          涵蓋全國 22 縣市在 2022 年當選、2026 年再度參選的直轄市及縣市議員，含平地與山地原住民議員。
          原有雙北逐字比對優先沿用。版面可辨時排除政績、口號及聯絡資訊。
        </dd>
        <dt>字元保留率</dt>
        <dd>
          每一屆政見文字各自串成一份全文，再對兩份文字做一次逐字比對。統一全半形、大小寫及少數異體字，
          忽略空白、一般標點及手機號碼，保留文字、數字與百分比符號。用最長共同子序列找出按原順序保留的字元。
          保留率為共同字元數除以全部 2026 政見字元數。即使 2022 年有文字被刪除，只要 2026 年的字元全數保留，保留率仍為 100%。
        </dd>
        <dt>怎麼讀逐字差異</dt>
        <dd>
          明細保留整理稿的換行和標點，連續增刪合在一起標示。前後段落換順序時，可能出現整段刪除及新增。
          不同主張偶然共用的字也可能被算成保留。
        </dd>
        <dt>資料限制</dt>
        <dd>
          公報轉錄、政見正文的擷取範圍及人工摘要都會影響字元結果。缺逐字原文的資料暫不計分。
          含摘錄、摘要或尚待核對的公報轉錄標為試算。全國初步排名含公報轉錄試算，同值並列。含摘錄或摘要的試算保留分數，可點入查看，資料齊備後再列名次。
          履約及問政表現需要另外查看執行紀錄。
        </dd>
      </dl>
      <p className="source-links">
        <a href="https://bulletin.cec.gov.tw/" target="_blank" rel="noopener">中選會選舉公報</a>
        <a href="https://www.taiwanvotes.tw/download/" target="_blank" rel="noopener">Taiwan Votes 資料下載</a>
        <a href={dataUrl} download>下載比對資料 JSON</a>
      </p>
      <p className="subtle">
        文字整理底稿部分採用 Taiwan Votes 的公報轉錄（整理層 CC BY 4.0），部分依官方 PDF 重整。
        各議員的原頁連結見個別明細。
      </p>
    </section>
  );
}
