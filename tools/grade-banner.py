import sys, numpy as np, cv2
from PIL import Image, ImageOps

def load(path, width):
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    h = round(im.height * width / im.width)
    return np.asarray(im.resize((width, h), Image.LANCZOS)).astype(np.float32) / 255.0

def clear_air(rgb, amount):
    """柔和的局部對比（CLAHE），只作用在亮度，讓霧裡的山稜和房屋層次出來。"""
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    L = lab[..., 0]
    L8 = np.clip(L * 255 / 100, 0, 255).astype(np.uint8)
    cl = cv2.createCLAHE(clipLimit=1.6, tileGridSize=(8, 8)).apply(L8).astype(np.float32) * 100 / 255
    lab[..., 0] = L * (1 - amount) + cl * amount
    return np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2RGB), 0, 1)

def harmony(rgb, warm=1.8, sat=0.94, lift=0.02):
    """整體色調統一：一點點暖、略降彩度、暗部微微提亮。"""
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    lab[..., 1] = lab[..., 1] * sat + 0.4
    lab[..., 2] = lab[..., 2] * sat + warm
    out = np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2RGB), 0, 1)
    return lift + out * (1 - lift)

def soft_film(rgb):
    """暗部微霧面、亮部柔和收尾。"""
    x = rgb
    x = 0.035 + x * 0.955
    x = np.where(x > 0.8, 0.8 + (x - 0.8) * 0.85, x)
    return np.clip(x, 0, 1)

VARIANTS = {
    "original": lambda x: x,
    "clear": lambda x: clear_air(x, 0.35),
    "harmony": lambda x: harmony(clear_air(x, 0.35)),
    "final_v1": lambda x: harmony(clear_air(x, 0.32), warm=1.5, sat=0.95, lift=0.012),
    "film": lambda x: soft_film(harmony(clear_air(x, 0.35), warm=2.2, sat=0.92, lift=0.0)),
}

if __name__ == "__main__":
    src, width, name, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
    y = VARIANTS[name](load(src, width))
    Image.fromarray((y * 255 + 0.5).astype(np.uint8)).save(out, quality=88)


# ── v2：更深邃、稜線更立體、帶一點橄欖綠 ──
def ridge_structure(rgb, amount=0.35, radius=24):
    """中尺度結構：只加強亮度的大範圍起伏，讓山的稜線和陰影面更立體（不會讓細節變銳利刺眼）。"""
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    L = lab[..., 0]
    blur = cv2.GaussianBlur(L, (0, 0), radius)
    lab[..., 0] = np.clip(L + (L - blur) * amount, 0, 100)
    return np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2RGB), 0, 1)

def deepen(rgb, gamma=1.08):
    """中間調稍微壓深，暗部更深邃，亮部幾乎不動。"""
    return np.clip(rgb ** gamma, 0, 1)

def olive(rgb, green=3.0, warm=1.0):
    """把陸地（非天空）往橄欖綠推一點：a 往綠、b 保持一點暖。天空用遮罩避開。"""
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    a, b = lab[..., 1], lab[..., 2]
    sky = np.clip((-b - 2) / 8, 0, 1)            # 越藍越像天空
    land = 1 - sky
    land = cv2.GaussianBlur(land, (0, 0), 6)
    lab[..., 1] = a - green * land
    lab[..., 2] = b + warm * land
    return np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2RGB), 0, 1)

def v2(x, s=1.0):
    x = clear_air(x, 0.38)
    x = ridge_structure(x, 0.30 * s + 0.1, 28)
    x = harmony(x, warm=0.6, sat=0.95, lift=0.0)
    x = olive(x, green=2.6 * s, warm=0.8)
    return deepen(x, 1.0 + 0.08 * s)

VARIANTS.update({
    "v2_light": lambda x: v2(x, 0.7),
    "v2": lambda x: v2(x, 1.0),
    "v2_strong": lambda x: v2(x, 1.35),
})


# ── v3：暖一點的橄欖綠（不偏青）、再深邃一點、稜線用 v2 的強度 ──
def v3(x, green=2.4, warm=2.6, gamma=1.12, ridge=0.40):
    x = clear_air(x, 0.38)
    x = ridge_structure(x, ridge, 28)
    x = harmony(x, warm=0.0, sat=0.96, lift=0.0)
    x = olive(x, green=green, warm=warm)
    return deepen(x, gamma)

VARIANTS.update({
    "v3": lambda x: v3(x),
    "v3_green": lambda x: v3(x, green=3.4, warm=3.4),
})


# 網站目前使用的版本：v3，綠色強度取中間
VARIANTS["final"] = lambda x: v3(x, green=3.0, warm=3.0)


# ── v4：天空少壓深、綠色集中在山與聚落、前景土地保持原本的土色 ──
def v4(x, green=3.0, warm=3.0, gamma=1.12, ridge=0.40):
    h = x.shape[0]
    lab0 = cv2.cvtColor(x, cv2.COLOR_RGB2LAB)
    sky = cv2.GaussianBlur(np.clip((-lab0[..., 2] - 2) / 8, 0, 1), (0, 0), 6)[..., None]
    rows = np.linspace(0, 1, h)[:, None, None]
    # 綠色權重：畫面 30%–62% 高度（山與聚落）最強，往下到前景淡成 35%
    band = np.clip(1 - (rows - 0.62) / 0.25, 0.35, 1.0)
    y = clear_air(x, 0.38)
    y = ridge_structure(y, ridge, 28)
    y = harmony(y, warm=0.0, sat=0.96, lift=0.0)
    g = olive(y, green=green, warm=warm)
    y = y * (1 - band) + g * band
    deep = deepen(y, gamma)
    soft = deepen(y, 1.03)
    return np.clip(deep * (1 - sky) + soft * sky, 0, 1)

VARIANTS["final"] = lambda x: v4(x)


# ── v5：以第一版（final_v1）為底，只讓山體更深邃，整體再加一層很淡的綠 ──
def hill_mask(x):
    """山體遮罩：不是天空、而且落在畫面 25%–55% 高度之間（往下淡出，不碰到聚落）。"""
    h = x.shape[0]
    lab = cv2.cvtColor(x, cv2.COLOR_RGB2LAB)
    sky = np.clip((-lab[..., 2] - 2) / 8, 0, 1)
    rows = np.linspace(0, 1, h)[:, None]
    band = np.clip((0.56 - rows) / 0.08, 0, 1) * np.clip((rows - 0.22) / 0.04, 0, 1)
    m = (1 - sky) * band
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), 10)[..., None]

def soft_green(rgb, amount=1.2):
    """整體非常淡的綠：a 往綠一點點，b 幾乎不動，避免偏青。"""
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    lab[..., 1] -= amount
    lab[..., 2] += amount * 0.3
    return np.clip(cv2.cvtColor(lab, cv2.COLOR_LAB2RGB), 0, 1)

def v5(x, hill_gamma=1.16, hill_ridge=0.30, green=1.2):
    base = VARIANTS["final_v1"](x)
    m = hill_mask(x)
    hills = deepen(ridge_structure(base, hill_ridge, 28), hill_gamma)
    y = base * (1 - m) + hills * m
    return soft_green(y, green)

VARIANTS["v5"] = lambda x: v5(x)
VARIANTS["final"] = lambda x: v5(x)
