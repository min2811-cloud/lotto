"""추천 번호를 휴대폰에서 보기 좋은 PNG 한 장으로 그린다."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# 한글 폰트 (윈도우 기본 '맑은 고딕')
_FONT_CANDIDATES = [
    r"C:\Windows\Fonts\malgun.ttf",
    r"C:\Windows\Fonts\malgunbd.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
]
_FONT_REGULAR = next((p for p in _FONT_CANDIDATES if Path(p).exists()), None)
_FONT_BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
if not Path(_FONT_BOLD).exists():
    _FONT_BOLD = _FONT_REGULAR

WIDTH = 760
MARGIN = 40
BALL_D = 44          # 공 지름
BALL_GAP = 12
ROW_GAP = 16
BG = (247, 248, 250)
INK = (33, 37, 41)
SUBTLE = (130, 138, 148)
LINE = (222, 226, 230)


def _ball_color(n: int) -> tuple[int, int, int]:
    if n <= 10:
        return (251, 196, 0)
    if n <= 20:
        return (105, 200, 242)
    if n <= 30:
        return (255, 114, 114)
    if n <= 40:
        return (170, 170, 170)
    return (176, 216, 64)


def _font(path, size):
    return ImageFont.truetype(path, size)


def _draw_balls(draw, x, y, numbers, d=BALL_D, gap=BALL_GAP):
    f = _font(_FONT_BOLD, int(d * 0.42))
    for i, n in enumerate(sorted(numbers)):
        cx = x + i * (d + gap)
        draw.ellipse([cx, y, cx + d, y + d], fill=_ball_color(n))
        text = str(n)
        tb = draw.textbbox((0, 0), text, font=f)
        tw, th = tb[2] - tb[0], tb[3] - tb[1]
        draw.text((cx + d / 2 - tw / 2 - tb[0], y + d / 2 - th / 2 - tb[1]), text,
                  font=f, fill=(255, 255, 255))
    return y + d


def render(result: dict, out_path: str | Path) -> Path:
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    f_title = _font(_FONT_BOLD, 38)
    f_meta = _font(_FONT_REGULAR, 19)
    f_section = _font(_FONT_BOLD, 24)
    f_label = _font(_FONT_REGULAR, 19)
    f_foot = _font(_FONT_REGULAR, 17)

    # 넉넉한 캔버스에 그린 뒤 실제 높이에 맞춰 자른다.
    img = Image.new("RGB", (WIDTH, 4000), BG)
    d = ImageDraw.Draw(img)
    y = MARGIN

    d.text((MARGIN, y), "로또 6/45 추천 번호", font=f_title, fill=INK)
    y += 52
    d.text((MARGIN, y), f"{result['base_round']}회 당첨번호 기준  ·  생성 {result['generated_at'].replace('T', ' ')}",
           font=f_meta, fill=SUBTLE)
    y += 34

    d.text((MARGIN, y), "직전 당첨번호", font=f_label, fill=SUBTLE)
    y += 26
    y = _draw_balls(d, MARGIN, y, result["base_numbers"], d=38, gap=10)
    d.text((MARGIN + 6 * 48 + 8, y - 34), f"+ 보너스 {result['base_bonus']}", font=f_label, fill=SUBTLE)
    y += 24
    d.line([MARGIN, y, WIDTH - MARGIN, y], fill=LINE, width=2)
    y += 22

    game_no = 1
    for group in result["groups"]:
        d.text((MARGIN, y), f"{group['label']}  ({len(group['games'])}게임)", font=f_section, fill=INK)
        y += 40
        for game in group["games"]:
            d.text((MARGIN, y + BALL_D / 2 - 11), f"{game_no:2d}", font=f_label, fill=SUBTLE)
            _draw_balls(d, MARGIN + 40, y, game)
            y += BALL_D + ROW_GAP
            game_no += 1
        y += 14

    d.line([MARGIN, y, WIDTH - MARGIN, y], fill=LINE, width=2)
    y += 16
    d.text((MARGIN, y), "무작위 생성 결과이며 당첨을 보장하지 않습니다. 구매는 본인 판단으로.",
           font=f_foot, fill=SUBTLE)
    y += 40

    img.crop((0, 0, WIDTH, y)).save(out_path, "PNG")
    return out_path


if __name__ == "__main__":
    from tools.lotto_data import load_draws
    from tools.lotto_rules import generate_all

    p = render(generate_all(load_draws(refresh=False) or load_draws()), "data/output/preview.png")
    print("저장:", p)
