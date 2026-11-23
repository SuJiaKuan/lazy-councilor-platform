"""Build comparison data from the re-election roster and Taiwan Votes CSVs."""

import argparse
import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit

from download_platforms import OFFICES
from prepare_data import ROOT, compare_text, display_and_key

ROSTER = ROOT / 'data' / 'reelection-2026.csv'
PUBLIC_DATA = ROOT / 'public' / 'data.json'
ANNOUNCEMENT_2022 = 'https://web.cec.gov.tw/tyec/article/37687'
YEARS = (2022, 2026)
EMPTY_POLICY = re.compile(
    r'(?:無|未填(?:寫)?(?:政見)?|無填寫政見|未提供(?:政見)?|略|空白|無資料|'
    r'請參閱公報|圖片|圖片式政見|政見為圖片|姓名出生年月日)[。]?'
)
POLICY_HEADINGS = {'政見', '公報政見', '競選政見'}
TRANSCRIPTION_ISSUES = {
    ('new-taipei-8-8', 2026): '公報雙欄轉錄順序交錯',
    ('new-taipei-12-5', 2026): '公報雙欄轉錄順序交錯',
    ('taipei-3-5', 2026): '公報轉錄缺少多數政見正文',
}
# Keep the original transcription wording and order within the policy section.
POLICY_BOUNDS = {
    ('taipei-5-13', 2026): ('老城更新', '拿成果證明，靠行動承諾'),
    ('new-taipei-6-1', 2022): (None, ' 烽堯是法學'),
    ('new-taipei-6-1', 2026): ('交通減壓', '\n邱烽堯'),
    ('new-taipei-6-5', 2022): ('1、普設', None),
    ('new-taipei-6-5', 2026): ('1、擴大', None),
    ('new-taipei-6-7', 2022): ('1.南勢角', None),
    ('new-taipei-6-7', 2026): (None, '建設中和 輝宂最合'),
    ('new-taipei-12-3', 2022): ('發展青年創意經濟', None),
    ('new-taipei-12-3', 2026): ('共築族人安居生活', None),
}


def name_key(text):
    text = unicodedata.normalize('NFKC', text).translate(str.maketrans('台姗黄釆', '臺姍黃采'))
    han = ''.join(re.findall(r'[\u3400-\u9fff\U00020000-\U000323af]', text))
    return han or ''.join(char for char in text.casefold() if char.isalnum())


def column(row, *headers):
    return next((row[key].strip() for key in headers if row.get(key)), '')


def platform_index(directory):
    by_year = {year: defaultdict(list) for year in YEARS}
    for year, lookup in by_year.items():
        for office in OFFICES:
            file = directory / f'公報政見_{year}_{office}.csv'
            with file.open(encoding='utf-8-sig', newline='') as stream:
                reader = csv.DictReader(stream)
                fields = set(reader.fieldnames or ())
                if not {'公報政見', '選區'} <= fields or not fields & {'姓名', '候選人', '候選人姓名'}:
                    raise ValueError(f'{file.name} 欄位格式不符：{reader.fieldnames}')
                for row in reader:
                    district = unicodedata.normalize('NFKC', column(row, '選區')).replace('台', '臺')
                    city = column(row, '縣市').replace('台', '臺') or district[:3]
                    name = column(row, '姓名', '候選人', '候選人姓名')
                    if city and name and row not in lookup[city, name_key(name)]:
                        lookup[city, name_key(name)].append(row)
    return by_year


def find_platform(lookup, city, name, district):
    matches = lookup.get((city, name_key(name)), ())
    same_district = []
    for row in matches:
        numbers = re.findall(r'\d+', column(row, '選區', '選舉區', '選區名稱', '選舉區名稱'))
        if len(numbers) == 1 and int(numbers[0]) == int(district):
            same_district.append(row)
    unique = {(column(row, '公報政見'), source_for(row)): row for row in same_district}
    return next(iter(unique.values())) if len(unique) == 1 else None


def source_for(row):
    if row is None:
        return None
    url = column(row, '來源網址', '公報網址')
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or parsed.hostname not in {
        'bulletin.cec.gov.tw', 'eebulletin.cec.gov.tw', 'web.cec.gov.tw',
    }:
        return None
    page = column(row, '來源頁碼', '公報頁碼')
    return f'{url}#page={page}' if page.isdecimal() and int(page) > 0 and not parsed.fragment else url


def policy_lines(row):
    if row is None:
        return []
    text = column(row, '公報政見')
    compact = re.sub(r'[\s【】()（）]', '', text)
    if EMPTY_POLICY.fullmatch(compact):
        return []
    return [
        line for raw in text.splitlines()
        if (line := raw.strip()) and re.sub(r'[\s:：]', '', line) not in POLICY_HEADINGS
    ]


def policy_body(lines, start, end):
    text = '\n'.join(lines)
    if start:
        text = text[text.index(start):]
    if end:
        text = text[:text.index(end)]
    return text.splitlines()


def compare_entry(row, existing, platforms):
    city = row['縣市']
    source_rows = [
        find_platform(platforms[year], city, row[f'{year}{"當選" if year == 2022 else "候選"}姓名'], row[f'{year}選區'])
        for year in YEARS
    ]
    fallback_sources = [ANNOUNCEMENT_2022, row['2026選委會來源']]
    sources = [source_for(source) for source in source_rows]
    base = {
        'id': row['id'],
        'name': row['2026候選姓名'],
        'city': city,
        'district': int(row['2026選區']),
        'party': row['2026推薦政黨'],
        'sources': [source or fallback for source, fallback in zip(sources, fallback_sources)],
        'sourceLabels': [
            f'{year} ' + ('官方公報' if source else '選委會資料')
            for year, source in zip(YEARS, sources)
        ],
    }
    if existing and 'terms' in existing:
        base['terms'] = existing['terms']
        base['name'] = existing['name']
    if existing and 'portrait' in existing:
        base['portrait'] = existing['portrait']

    normalized = []
    missing = []
    notes = []
    for year, row_source, source in zip(YEARS, source_rows, sources):
        lines = policy_lines(row_source)
        record_year = (row['id'], year)
        issue = TRANSCRIPTION_ISSUES.get(record_year)
        if source and lines and not issue and record_year in POLICY_BOUNDS:
            try:
                lines = policy_body(lines, *POLICY_BOUNDS[record_year])
            except ValueError:
                issue = '轉錄更新後須重新確認政見正文範圍'
            else:
                notes.append(f'{year} 年依公報版面擷取政見正文。')
        key, display = display_and_key(lines) if lines else ('', [])
        if issue or not source or not key:
            missing.append(f'{year} 年{issue or "待補可核對的政見原文"}。')
        normalized.append((key, display))
    if missing:
        return {**base, 'unscoredReason': ''.join(missing)}

    (left, left_display), (right, right_display) = normalized
    return {
        **base,
        **compare_text(left, right, left_display, right_display),
        'transcribed': True,
        'note': '採用 Taiwan Votes 的公報轉錄。' + ''.join(notes),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--platforms', type=Path, default=ROOT / 'data' / 'platform-csv')
    parser.add_argument('--output', type=Path, default=PUBLIC_DATA)
    args = parser.parse_args()

    with ROSTER.open(encoding='utf-8-sig', newline='') as stream:
        roster = list(csv.DictReader(stream))
    if not roster or len({row['id'] for row in roster}) != len(roster):
        parser.error('連任名單須至少有一筆，且 id 必須唯一。')
    # Preserve curated display names, term counts, and portraits when regenerating.
    existing = json.loads(PUBLIC_DATA.read_text(encoding='utf-8'))
    by_id = {person['id']: person for person in existing if 'id' in person}
    legacy = {(person['city'], name_key(person['name'])): person
              for person in existing if 'id' not in person}
    platforms = platform_index(args.platforms)
    dataset = []
    for row in roster:
        old = by_id.get(row['id']) or legacy.get((row['縣市'], name_key(row['2026候選姓名'])))
        dataset.append(compare_entry(row, old, platforms))

    counts = Counter('待補' if 'unscoredReason' in person else '已比對' for person in dataset)
    args.output.write_text(json.dumps(dataset, ensure_ascii=False, separators=(',', ':')) + '\n',
                           encoding='utf-8')
    print(f'{len(dataset)} 人：已比對 {counts["已比對"]}、待補 {counts["待補"]}')


if __name__ == '__main__':
    main()
