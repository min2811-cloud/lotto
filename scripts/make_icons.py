"""앱 아이콘 생성.  실행: python scripts/make_icons.py

docs/icons/ 에 홈 화면 아이콘 5종을 만든다.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUT = PROJECT_ROOT / "docs" / "icons"

BRAND = (46, 91, 255)      # 파란 브랜드색
BALL = (251, 196, 0)       # 로또공 노랑
FONT_BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
FONT_FALLBACK = r"C:\Windows\Fonts\malgun.ttf"


def _font(size: int):
    for p in (FONT_BOLD, FONT_FALLBACK):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def _base(size: int, pad_ratio: float = 0.0) -> Image.Image:
    """둥근 사각형 배경 + 가운데 노란 공 + '45' 텍스트."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = int(size * pad_ratio)
    box = [pad, pad, size - pad, size - pad]
    radius = int((size - 2 * pad) * 0.22)
    d.rounded_rectangle(box, radius=radius, fill=BRAND)

    inner = size - 2 * pad
    ball_d = int(inner * 0.60)
    bx = (size - ball_d) // 2
    by = pad + int(inner * 0.16)
    d.ellipse([bx, by, bx + ball_d, by + ball_d], fill=BALL)

    f_ball = _font(int(ball_d * 0.5))
    _centered(d, "45", f_ball, bx + ball_d / 2, by + ball_d / 2, (33, 37, 41))

    f_label = _font(int(inner * 0.20))
    _centered(d, "로또", f_label, size / 2, pad + int(inner * 0.86), (255, 255, 255))
    return img


def _centered(d, text, font, cx, cy, fill):
    tb = d.textbbox((0, 0), text, font=font)
    w, h = tb[2] - tb[0], tb[3] - tb[1]
    d.text((cx - w / 2 - tb[0], cy - h / 2 - tb[1]), text, font=font, fill=fill)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    _base(512).save(OUT / "icon-512.png")
    _base(512).resize((192, 192), Image.LANCZOS).save(OUT / "icon-192.png")
    _base(512, pad_ratio=0.14).save(OUT / "icon-maskable-512.png")   # 안전영역 여백
    _base(512).resize((180, 180), Image.LANCZOS).save(OUT / "apple-touch-icon.png")
    _base(512).resize((32, 32), Image.LANCZOS).save(OUT / "favicon.png")
    print("아이콘 5종 생성:", OUT)


if __name__ == "__main__":
    main()
