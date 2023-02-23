from pathlib import Path
from cp93pytools.easySqlite import SqliteTable
from time import sleep
from subprocess import run

rootPath = Path(__file__).parent


# https://en.wikipedia.org/wiki/Ky%C5%8Diku_kanji

table = SqliteTable(rootPath / "hanzi.db", "hanzi")


def initTable():
    table.db.execute(
        """
    CREATE TABLE IF NOT EXISTS hanzi (
        num INTEGER NOT NULL,
        grade INTEGER,
        strokes INTEGER,
        hanzi TEXT PRIMARY KEY NOT NULL,
        pinyin TEXT,
        meaning TEXT,
        etymology TEXT
    )
    """
    )
    table.db.execute("create index if not exists hanzi_pinyin_index on hanzi(pinyin)")
    table.db.execute("create unique index if not exists hanzi_num_index on hanzi(num)")
    table.db.execute("create index if not exists hanzi_strokes_index on hanzi(strokes)")
    table.db.execute("create index if not exists hanzi_grade_index on hanzi(grade)")
    return


def fillTable():
    grade = 0
    for line in (rootPath / "kanji-1.txt").read_text().splitlines():
        if line.startswith("#"):
            continue
        if line.endswith("kanji)"):
            grade += 1
            continue
        num, hanzi, strokes, meaning, _, _ = line.split("\t")
        num = int(num)
        strokes = int(strokes)
        record = dict(
            hanzi=hanzi,
            meaning=meaning,
            num=num,
            strokes=strokes,
            grade=grade,
        )
        table.insert_or_ignore(**record)
    return


from bs4 import BeautifulSoup
import urllib.parse


# html = (rootPath / "wiki-example.html").read_text()
# html = (rootPath / "wiki-example-simplification.html").read_text()
# html = (rootPath / "__tmp.html").read_text()
# parsed_html = BeautifulSoup(html, features="lxml")
# body = parsed_html.body

# # e = body.find_next(
# #     lambda tag: tag.name == "b" and "For pronunciation and definitions of " in tag.text
# # )
# # e = e.parent.select("span[lang=zh]")[1]
# # traditional = e.text
# # print(traditional)

# e = body.find_next("a", {"title": "w:Simplified Chinese"})
# e = e.find_next("td")

# print(e.text.strip())

# exit(0)
class Japanese(Exception):
    pass


def getHanzi(hanzi):
    urlHanzi = urllib.parse.quote_plus(hanzi)
    url = f"https://en.wiktionary.org/wiki/{urlHanzi}"
    p = run(["curl", url], capture_output=True)

    assert p.returncode == 0
    html = p.stdout.decode()
    open("__tmp.html", "w").write(html)

    parsed_html = BeautifulSoup(html, features="lxml")
    body = parsed_html.body
    assert body

    try:
        e = body.find(attrs={"id": "Glyph_origin"})
        assert e
        e = e.parent.find_next_sibling("p")
        assert e
        etimology = e.text
    except AssertionError:
        etimology = None

    try:
        e = body.find("span", attrs={"class": "pinyin-ts-form-of"})
        if e is None:
            e = body.find("span", attrs={"class": "pinyin-t-form-of"})
        assert e
        e = e.find("a")
        assert e
        pinyin = e.text
        traditional = None
    except AssertionError:
        try:
            e = body.find_next(
                lambda tag: tag.name == "b"
                and "For pronunciation and definitions of " in tag.text
            )
            e = e.parent.select("span[lang=zh]")[1]
            traditional = e.text
            pinyin = None
        except:
            # Japanese character
            e = body.find_next("a", {"title": "w:Simplified Chinese"})
            e = e.find_next("td")
            hanzi = e.text.strip()
            raise Japanese(hanzi)

    return pinyin, etimology, traditional


missingPinyin = table.where_sql("pinyin is null").column("hanzi", type=str)
# print(missingPinyin)

for hanzi in missingPinyin:
    sleep(1)
    try:
        pinyin, etimology, traditional = getHanzi(hanzi)
    except AssertionError:
        print(f"curl {hanzi} failed")
        sleep(5)
        continue
    except Japanese as j:
        kanji = hanzi
        (hanzi,) = j.args
        curr = table.where(hanzi=kanji).dict()
        curr["hanzi"] = hanzi
        table.where(hanzi=kanji).update(**curr)
        try:
            pinyin, etimology, traditional = getHanzi(hanzi)
        except AssertionError:
            print(f"curl {hanzi} failed")
            sleep(5)
            continue

    if pinyin is None:
        assert traditional
        pinyin, et2, _ = getHanzi(traditional)
        etimology = etimology or et2
        etimology = f"Simplification of {traditional}. {etimology}"

    print(hanzi, pinyin, etimology)
    table.where(hanzi=hanzi).update(
        pinyin=pinyin,
        etymology=etimology,
    )

import json

(rootPath / "kanji.json").write_text(json.dumps(table.dicts()))
