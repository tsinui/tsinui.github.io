import sys, pathlib
root = pathlib.Path(sys.argv[1])
chars = set(chr(c) for c in range(0x20, 0x7f))
# Big5 常用字 (level 1) + 符號
for hi in range(0xA1, 0xC7):
    for lo in list(range(0x40, 0x7F)) + list(range(0xA1, 0xFF)):
        try: chars.add(bytes([hi, lo]).decode('big5'))
        except Exception: pass
for rng in [(0x3000,0x303F),(0xFF00,0xFFEF),(0x2010,0x2027),(0x2030,0x205E)]:
    chars.update(chr(c) for c in range(*rng))
for p in root.rglob('*'):
    if '.git' in p.parts or 'node_modules' in p.parts: continue
    if p.suffix.lower() in {'.html','.json','.js','.csv','.xml','.md','.css'} and p.is_file():
        chars.update(p.read_text(errors='ignore'))
chars = {c for c in chars if c.isprintable() or c in ' '}
open(sys.argv[2],'w').write(''.join(sorted(chars)))
print(len(chars))
