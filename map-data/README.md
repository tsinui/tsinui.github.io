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

每一筆是一個研究地點，依陣列順序出現在 story map 上（往下捲時地圖依序飛過去）。

```json
{
  "id": "zegveld-peat",
  "place": "Zegveld, Netherlands",
  "iso2": "nl",
  "lat": 52.115,
  "lon": 4.837,
  "zoom": 9,
  "tags": ["Land Management"],
  "title_en": "Peat Subsidence and Emissions",
  "title_zh": "一年下沉一公分的草地",
  "story_zh": "中文故事，約 100 字",
  "story_en": "English story, 5–6 sentences.",
  "note": "對應的 Obsidian 筆記路徑（只做紀錄，不會顯示）"
}
```

- `lat` / `lon`：可以直接用 Obsidian Atlas 筆記 frontmatter 的 `location`。
- `zoom`：地圖飛過去時放大幾倍；國家尺度約 5–6，城市或湖泊約 8–9。
- `tags`：一個主題：Food Security、Land Management、Water Systems（顏色在 story-map.js 的 TAG_COLORS）。灌溉、作物、土壤、地層下陷 → Land Management；湖泊、河流等較大的水體 → Water Systems。
- `extreme`：選填，`true` 表示故事發生在極端事件（乾旱、高溫、颱風）的情境下，地圖上的點會加一圈紅色外圈。
  新主題可以直接寫；顏色在 `story-map.js` 最上面的 `TAG_COLORS` 加一行。
