# 地圖資料

首頁的世界地圖和 `map.html` 都讀這兩個檔案。改完存檔，重新整理頁面就會更新。

國家用 **ISO 3166-1 數字代碼**（例如臺灣 158、荷蘭 528、日本 392），
可以在 <https://en.wikipedia.org/wiki/ISO_3166-1_numeric> 查。

## places.json：去過的地方

```json
{
  "visited": [
    {
      "id": 528,
      "name": "Netherlands",
      "nameZh": "荷蘭",
      "cities": ["Wageningen", "Amsterdam"],
      "years": ["2026"],
      "note": "一句話，滑鼠移上去時會出現"
    }
  ]
}
```

只有 `id`、`name`、`nameZh` 是必填；`cities`、`years`、`note` 有填才會顯示。
清單順序就是首頁右側國家清單的順序。

## readings.json：讀過的東西

```json
[
  {
    "title": "書名或文章標題",
    "author": "作者",
    "type": "book",
    "year": 2025,
    "countries": [528, 276],
    "link": "https://...",
    "note": "一句話筆記"
  }
]
```

`countries` 可以放多個國家，這本書就會出現在每個國家的「讀過」圖層裡。
`type` 建議用 book、article、paper、report 其中一種。

## research.json：Research map（map.html）的研究故事

每一筆是一個研究地點，依陣列順序出現在左邊的地點清單裡；點地圖上的點或清單，地圖會飛過去並顯示故事。

```json
{
  "id": "zegveld-peat",
  "place": "Zegveld, Netherlands",
  "iso2": "nl",
  "lat": 52.115,
  "lon": 4.837,
  "zoom": 9,
  "tags": ["Land Degradation"],
  "title_en": "Peat Subsidence and Emissions",
  "title_zh": "一年下沉一公分的草地",
  "story_zh": "中文故事，約 100 字",
  "story_en": "English story, 5–6 sentences.",
  "note": "對應的 Obsidian 筆記路徑（只做紀錄，不會顯示）"
}
```

- `lat` / `lon`：可以直接用 Obsidian Atlas 筆記 frontmatter 的 `location`。
- `lat` / `lon` 要放在故事真正發生的地方，例如農業區、灌區、湖泊，不要放在首都或國家正中心（衛星圖和土地使用圖上會很明顯）。
- `zoom`：地圖飛過去時放大的程度（換算方式：MapLibre 縮放等級 ≈ 3.2 + log2(zoom)）；國家尺度約 5–6，城市或湖泊約 8–9。想直接指定 MapLibre 的縮放等級，可以加 `mapZoom`（例如 `"mapZoom": 9`）。
- `scale` / `iso_n3`：選填。故事講的是整個國家（例如全國的政策、飲食變化）時，寫 `"scale": "country"` 和該國的三位數 ISO 代碼（例如巴西 `"iso_n3": "076"`、台灣 `"158"`）。打開故事時會把整個國家框起來、縮放到看得到整個國家；點仍然放在跟故事最相關的地區。
- `tags`：一個主題，看故事的「主角」是什麼（顏色在 story-map.js 的 TAG_COLORS）：
  - Land Degradation：土地退化，例如土壤沖蝕、有機質下降、土壤酸化、泥炭地下陷。
  - Crops & Irrigation：作物和灌溉，例如作物生產與損失、灌溉技術、灌區擴張。
  - Water Systems：較大的水體或整個流域的水，例如湖泊、河流、流域的水量與治理。
  - Food Security：糧食供應與飲食（暫定，之後再檢討）。
  - Energy Transition：能源轉型、再生能源。
- `extreme`：選填，`true` 表示故事發生在極端事件（乾旱、高溫、颱風）的情境下，地圖上的點外面會多一圈圓環。
  新主題可以直接寫；顏色在 `story-map.js` 最上面的 `TAG_COLORS` 加一行。
