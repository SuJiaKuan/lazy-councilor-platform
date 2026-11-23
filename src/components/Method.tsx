import { dataUrl, similarityGrades } from '../people';

export function Method() {
  return (
    <details id="method" className="method">
      <summary>怎麼算？資料哪來？</summary>
      <dl>
        <dt>目前收錄範圍</dt>
        <dd>
          涵蓋全國 22 縣市在 2022 年當選、2026 年再度參選的直轄市及縣市議員，含平地與山地原住民議員。
          兩屆都以 Taiwan Votes 的選舉公報轉錄為底稿，取用政見欄。少數版面已確認的個案依公報段落界線擷取正文，並在個人明細註明。
        </dd>
        <dt>相似度怎麼算</dt>
        <dd>
          每一屆政見文字各自串成一份全文，再對兩份文字做一次逐字比對。統一全半形、大小寫及少數異體字，
          忽略空白、一般標點及手機號碼，保留文字、數字與百分比符號。用最長共同子序列找出按原順序保留的字元。
          相似度＝2 × 共同字元數 ÷（2022 字元數＋2026 字元數）。兩屆的字數都納入計算，新增和刪除都會降低分數，兩屆字元經上述處理後完全相同才會得到 100%。
          本站把 ROUGE-L 的等權 F1 形式用在字元比對。參考
          <a href="https://aclanthology.org/W04-1013/" target="_blank" rel="noopener">Chin-Yew Lin 的 ROUGE 論文（2004）</a>。
        </dd>
        <dt>排名怎麼排</dt>
        <dd>
          依未四捨五入的相似度由高到低排序，同分並列。
        </dd>
        <dt>文字改寫分級</dt>
        <dd>
          依未四捨五入的相似度分級。級別描述兩屆公報的文字變動程度。
          <ul className="grade-guide">
            {similarityGrades.map((grade) => (
              <li key={grade.id} data-grade={grade.id}><span className="score-grade">{grade.label}</span> {grade.range}</li>
            ))}
          </ul>
        </dd>
        <dt>怎麼讀逐字差異</dt>
        <dd>
          明細保留整理稿的換行和標點，連續增刪合在一起標示。前後段落換順序時，可能出現整段刪除及新增。
          不同主張偶然共用的字也可能被算成保留。
        </dd>
        <dt>資料限制</dt>
        <dd>
          公報轉錄可能有漏字、順序錯置，或混入政績、口號等其他內容，這些差異會影響字元結果。
          已知轉錄缺文或順序錯置的資料暫不計分。
          履約及問政表現需要另外查看執行紀錄。
        </dd>
      </dl>
      <p className="source-links">
        <a href="https://bulletin.cec.gov.tw/" target="_blank" rel="noopener">中選會選舉公報</a>
        <a href="https://www.taiwanvotes.tw/download/" target="_blank" rel="noopener">Taiwan Votes 資料下載</a>
        <a href={dataUrl} download>下載比對資料 JSON</a>
      </p>
      <p className="subtle">
        文字底稿採用 Taiwan Votes 的公報轉錄（整理層 CC BY 4.0），以原始公報為準。
        各議員的原頁連結見個別明細。
      </p>
      <p className="subtle">
        政黨依 2026 候選人名冊的推薦政黨欄位。照片取自
        <a href="https://www.moi.gov.tw/cl.aspx?n=12" target="_blank" rel="noopener">內政部地方公職人員資訊專區</a>，
        採用議員名錄肖像，缺少照片時顯示姓名首字。
      </p>
    </details>
  );
}
