"""Import legacy spreadsheet records and provide shared text comparison helpers.

Use compare_roster.py to regenerate the current public dataset.
"""
import argparse
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IMAGE_ONLY = {
    '洪健益': '2026 年政見刊為低解析度圖片，目前缺少可逐字核對的全文。',
    '鄭宇恩': '2022 年政見為圖片，現有轉錄漏掉正文，目前缺少可逐字核對的全文。',
}
APPROXIMATE = {
    '洪佳君': '2026 雙欄公報以人工重整的摘要比較。',
    '宋雨蓁': '2026 雙欄公報以人工重整的摘要比較。',
    '楊春妹': '2022 使用人工重整的摘要。',
    '秦慧珠': '2022 以人工摘錄的兩項主張比較。',
    '劉耀仁': '2026 使用人工摘錄的五項主張。',
    '邱烽堯': '2022 轉錄漏掉部分欄位，補用人工摘錄。2026 採公報條列。',
}


MOBILE = re.compile(r"(?<![0-9])09[0-9]{2}[- ]?[0-9]{3}[- ]?[0-9]{3}(?![0-9])")
VARIANTS = str.maketrans('臺汙佈', '台污布')


def display_and_key(lines):
    display = MOBILE.sub('', unicodedata.normalize('NFKC', '\n'.join(lines)))
    chars = []
    fragments = []
    skipped = ''
    for original in display:
        key = original.lower().translate(VARIANTS)
        significant = [ch for ch in key if ch.isalnum() or ch == '%']
        if significant:
            chars.extend(significant)
            fragments.extend([skipped + original, *([''] * (len(significant) - 1))])
            skipped = ''
        else:
            skipped += original
    if fragments:
        fragments[-1] += skipped
    assert ''.join(fragments) == display
    return ''.join(chars), fragments


def policy_numbered(text):
    return [
        part.strip() for part in re.split(r'(?m)(?:^|\n)\s*\d{1,2}[、.]\s*', text)[1:]
        if part.strip()
    ]


def input_items(person):
    name = person['name']
    old = person['a']
    new = person['b']
    raw_old, raw_new = [r['公報政見'] for r in person['raw']]
    if name == '金瑞龍':
        old, new = policy_numbered(raw_old), policy_numbered(raw_new)
    if name == '游輝宂':
        old = policy_numbered(raw_old)
        old = [re.split(r'\n(?=加速發展|行的正義|用心護幼)', line)[0] for line in old]
        new = [line.lstrip('■').strip() for line in raw_new.splitlines() if line.startswith('■')]
    if name == '邱烽堯':
        old = [a.split('｜', 1)[-1] for a in old]
        new = [line.strip() for line in raw_new.splitlines()]
        new = [new[i] for i in [3,4,6,7,8,10,11,12,14,15,16,18,19,20,21,23,24,25]]
    return old, new


def operations(a, b):
    lengths = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) - 1, -1, -1):
        for j in range(len(b) - 1, -1, -1):
            lengths[i][j] = (1 + lengths[i + 1][j + 1] if a[i] == b[j]
                             else max(lengths[i + 1][j], lengths[i][j + 1]))
    out = []
    i = j = 0
    while i < len(a) or j < len(b):
        if i < len(a) and j < len(b) and a[i] == b[j]:
            kind, ch = '=', a[i]
            i += 1
            j += 1
        elif i < len(a) and (j == len(b) or lengths[i + 1][j] >= lengths[i][j + 1]):
            kind, ch = '-', a[i]
            i += 1
        else:
            kind, ch = '+', b[j]
            j += 1
        if out and out[-1][0] == kind:
            out[-1][1] += ch
        else:
            out.append([kind, ch])
    return out


def project_operations(ops, fragments, skip):
    result = []
    offset = 0
    for kind, letters in ops:
        if kind == skip:
            continue
        end = offset + len(letters)
        result.append([kind, ''.join(fragments[offset:end])])
        offset = end
    assert offset == len(fragments)
    return result


def compare(person):
    name = person['name']
    entry = {
        'name': name, 'city': person['city'], 'district': person['d'],
        'terms': len(person['years']),
        'sources': [r['來源網址'] + '#page=' + r['來源頁碼'] for r in person['raw']],
    }
    if name in IMAGE_ONLY:
        return {**entry, 'unscoredReason': IMAGE_ONLY[name]}
    old, new = input_items(person)
    left, left_display = display_and_key(old)
    right, right_display = display_and_key(new)
    assert left and right
    return {**entry, **compare_text(left, right, left_display, right_display),
            'note': APPROXIMATE.get(name, '')}


def compare_text(left, right, left_display, right_display):
    ops = operations(left, right)
    assert ''.join(piece for kind, piece in ops if kind != '+') == left
    assert ''.join(piece for kind, piece in ops if kind != '-') == right
    counts = {kind: sum(len(piece) for op, piece in ops if op == kind) for kind in '=-+'}
    return {
        'oldDiff': project_operations(ops, left_display, '+'),
        'newDiff': project_operations(ops, right_display, '-'),
        'keep': counts['='], 'added': counts['+'], 'removed': counts['-'],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path, help='上游中間資料 finaldata.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'public' / 'data.json')
    args = parser.parse_args()

    records = json.loads(args.input.read_text(encoding='utf-8'))
    people = [compare(person) for person in records]
    if not people or len(people) != len({person['name'] for person in people}):
        parser.error('資料須至少有一筆，且姓名須唯一，供個人連結使用。')
    args.output.write_text(
        json.dumps(people, ensure_ascii=False, separators=(',', ':')),
        encoding='utf-8',
    )


if __name__ == '__main__':
    main()
