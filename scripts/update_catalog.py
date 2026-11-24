"""TMDB から日本の上映中・公開予定作品を集めて catalog.json を作り直す。

環境変数 TMDB_TOKEN（TMDB の「API読み取りアクセストークン」）が必要。
GitHub Actions から週1回実行される。手元で試すときは:
    TMDB_TOKEN=xxxx python scripts/update_catalog.py
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
import urllib.request

TOKEN = os.environ.get("TMDB_TOKEN", "").strip()
API = "https://api.themoviedb.org/3"
OUT = os.path.join(os.path.dirname(__file__), "..", "catalog.json")
PAST_DAYS = 70      # 公開からこの日数以内を「上映中」とみなす
FUTURE_DAYS = 150   # この日数先までの公開予定を拾う
MAX_FILMS = 120

GENRE = {28: "アクション", 12: "アドベンチャー", 16: "アニメ", 35: "コメディ", 80: "クライム",
         99: "ドキュメンタリー", 18: "ドラマ", 10751: "ファミリー", 14: "ファンタジー", 36: "歴史",
         27: "ホラー", 10402: "音楽", 9648: "ミステリー", 10749: "恋愛", 878: "SF",
         53: "サスペンス", 10752: "戦争", 37: "西部劇"}
KEYWORD_JA = {"based on novel or book": "原作小説", "based on manga": "原作漫画",
              "based on anime": "アニメ原作", "based on video game": "ゲーム原作",
              "sequel": "続編", "remake": "リメイク", "based on true story": "実話",
              "biography": "実話", "live action remake": "実写化", "kaiju": "怪獣",
              "superhero": "ヒーロー", "based on comic": "原作コミック", "musical": "ミュージカル"}
ASIA = {"ko", "zh", "cn", "th", "hi", "ta", "te", "id", "vi", "tl", "ms"}


def get(path, **params):
    url = API + path + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + TOKEN, "accept": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            if attempt == 2:
                raise
            time.sleep(2 + attempt * 3)


def jp_release(rel):
    for c in rel.get("results", []):
        if c.get("iso_3166_1") == "JP":
            dates = sorted(x["release_date"][:10] for x in c.get("release_dates", [])
                           if x.get("type") in (2, 3) and x.get("release_date"))
            if dates:
                return dates[0]
    return None


def main():
    if not TOKEN:
        sys.exit("TMDB_TOKEN がありません")
    today = dt.date.today()
    lo, hi = today - dt.timedelta(days=PAST_DAYS), today + dt.timedelta(days=FUTURE_DAYS)

    ids, now_playing = [], set()
    for page in range(1, 4):
        for m in get("/movie/now_playing", region="JP", language="ja-JP", page=page).get("results", []):
            now_playing.add(m["id"])
            ids.append(m["id"])
    for page in range(1, 7):
        res = get("/discover/movie", region="JP", language="ja-JP", page=page,
                  sort_by="popularity.desc", with_release_type="2|3",
                  **{"release_date.gte": lo.isoformat(), "release_date.lte": hi.isoformat()})
        ids += [m["id"] for m in res.get("results", [])]
        if page >= res.get("total_pages", 1):
            break
    seen, films = set(), []
    for mid in ids:
        if mid in seen or len(films) >= MAX_FILMS:
            continue
        seen.add(mid)
        m = get(f"/movie/{mid}", language="ja-JP", append_to_response="credits,keywords,release_dates")
        d = jp_release(m.get("release_dates", {}))
        if not d:
            continue
        day = dt.date.fromisoformat(d)
        run = mid in now_playing and day < lo
        if day > hi or (day < lo and not run):
            continue
        lang = m.get("original_language", "")
        origin = "邦画" if lang == "ja" else ("アジア" if lang in ASIA else "洋画")
        genres = [GENRE[g["id"]] for g in m.get("genres", []) if g["id"] in GENRE]
        crew = m.get("credits", {}).get("crew", [])
        directors = [c["name"] for c in crew if c.get("job") == "Director"][:2]
        cast = [c["name"] for c in m.get("credits", {}).get("cast", [])[:4]]
        kws = [k["name"] for k in m.get("keywords", {}).get("keywords", [])]
        keys = []
        for k in kws:
            keys.append(KEYWORD_JA.get(k, k))
        if m.get("belongs_to_collection"):
            keys.insert(0, "シリーズ:" + m["belongs_to_collection"]["name"])
            keys.insert(0, "シリーズ")
        overview = (m.get("overview") or "").replace("\n", " ")
        films.append({
            "id": f"t{mid}",
            "t": m.get("title") or m.get("original_title"),
            "d": d,
            "o": origin,
            "g": genres,
            "p": directors + [c for c in cast if c not in directors],
            "k": list(dict.fromkeys(keys))[:12],
            "s": overview[:90] + ("…" if len(overview) > 90 else ""),
            "poster": m.get("poster_path") or "",
            "run": run,
            "pop": round(m.get("popularity") or 0, 1),
        })
        time.sleep(0.05)
    films.sort(key=lambda f: f["d"])
    if len(films) < 10:
        sys.exit(f"取得できた作品が少なすぎます（{len(films)}本）。catalog.json は更新しません")
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump({"updated": today.isoformat(), "source": "TMDB", "films": films}, f, ensure_ascii=False, indent=0)
    print(f"{len(films)} films written")


if __name__ == "__main__":
    main()
