"""Update public/data.json from the re-election roster and local platform CSVs."""

import argparse
import csv
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import urlsplit

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


def name_key(text):
    text = unicodedata.normalize('NFKC', text).translate(str.maketrans('台姗黄釆', '臺姍黃采'))
    han = ''.join(re.findall(r'[\u3400-\u9fff\U00020000-\U000323af]', text))
    return han or ''.join(char for char in text.casefold() if char.isalnum())


def column(row, *headers):
    return next((row[key].strip() for key in headers if row.get(key)), '')


def platform_index(directory):
    by_year = {year: defaultdict(list) for year in YEARS}
    for year, lookup in by_year.items():
        for file in sorted(directory.glob(f'公報政見_{year}_*.csv')):
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


def compare_entry(row, existing, platforms):
    if existing and 'unscoredReason' not in existing and ('terms' in existing or not existing['note']):
        return {**existing, 'id': row['id']}

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
        'sources': [source or fallback for source, fallback in zip(sources, fallback_sources)],
        'sourceLabels': [
            f'{year} ' + ('官方公報' if source else '選委會資料')
            for year, source in zip(YEARS, sources)
        ],
    }
    if existing and 'terms' in existing:
        base['terms'] = existing['terms']
        base['name'] = existing['name']

    normalized = [display_and_key(lines) if (lines := policy_lines(source)) else ('', [])
                  for source in source_rows]
    missing = [str(year) for year, source, (key, _) in zip(YEARS, sources, normalized)
               if not source or not key]
    if missing:
        if existing and ('terms' in existing or 'unscoredReason' not in existing):
            return {**existing, 'id': row['id']}
        return {**base, 'unscoredReason': f'待補 {"、".join(missing)} 年可核對的政見原文。'}

    (left, left_display), (right, right_display) = normalized
    return {
        **base,
        **compare_text(left, right, left_display, right_display),
        'transcribed': True,
        'note': '依 Taiwan Votes 公報轉錄試算，待逐份核對原始公報。',
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
    existing = json.loads(PUBLIC_DATA.read_text(encoding='utf-8'))
    by_id = {person['id']: person for person in existing if 'id' in person}
    legacy = {(person['city'], name_key(person['name'])): person
              for person in existing if 'id' not in person}
    platforms = platform_index(args.platforms)
    dataset = []
    for row in roster:
        old = by_id.get(row['id']) or legacy.get((row['縣市'], name_key(row['2026候選姓名'])))
        dataset.append(compare_entry(row, old, platforms))

    counts = Counter('待補' if 'unscoredReason' in person else '試算' if person['note'] else '正式'
                     for person in dataset)
    args.output.write_text(json.dumps(dataset, ensure_ascii=False, separators=(',', ':')) + '\n',
                           encoding='utf-8')
    print(f'{len(dataset)} 人：正式 {counts["正式"]}、試算 {counts["試算"]}、待補 {counts["待補"]}')


if __name__ == '__main__':
    main()
