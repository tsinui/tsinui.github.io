#!/usr/bin/env bash
# 把 assets/fonts 的源漾 OTF 子集化成網頁用 WOFF（Big5 常用字 + 網站上出現過的所有字）
# 用法：在 repo 根目錄執行 bash tools/subset-fonts.sh（需要 pip install fonttools）
set -e
cd "$(dirname "$0")/.."
python3 tools/font-chars.py . /tmp/site-chars.txt
mkdir -p assets/fonts/web
for f in GenYoMin2TW-M GenYoMin2TW-B GenYoGothic2TW-R GenYoGothic2TW-M GenYoGothic2TW-B; do
  pyftsubset "assets/fonts/$f.otf" --text-file=/tmp/site-chars.txt --flavor=woff \
    --layout-features='*' --output-file="assets/fonts/web/$f.woff"
done
ls -la assets/fonts/web
