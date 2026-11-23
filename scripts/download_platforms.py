"""Download the six Taiwan Votes council platform CSVs into data/platform-csv/."""

import csv
import io
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

DESTINATION = Path(__file__).resolve().parents[1] / 'data' / 'platform-csv'
BASE_URL = 'https://www.taiwanvotes.tw/data/platform-csv/'
OFFICES = ('縣市議員', '平地原住民議員', '山地原住民議員')


def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for year in (2022, 2026):
        for office in OFFICES:
            filename = f'公報政見_{year}_{office}.csv'
            request = Request(BASE_URL + quote(filename), headers={'User-Agent': 'CouncilPlatformResearch/1.0'})
            with urlopen(request, timeout=45) as response:
                payload = response.read()

            reader = csv.DictReader(io.StringIO(payload.decode('utf-8-sig')))
            if '公報政見' not in (reader.fieldnames or []) or next(reader, None) is None:
                raise ValueError(f'來源未回傳有效的政見 CSV：{filename}')

            destination = DESTINATION / filename
            temporary = destination.with_suffix('.tmp')
            temporary.write_bytes(payload)
            temporary.replace(destination)
            print(f'已下載 {filename}')


if __name__ == '__main__':
    main()
