"""Shareable report (F12): PNG or single-page PDF rendered with Pillow."""
import io
import textwrap

from PIL import Image, ImageDraw, ImageFont

W = 1080
GREEN, DARK, MUTED, BG = (22, 101, 52), (24, 24, 27), (113, 113, 122), (250, 250, 249)
FONTS = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "DejaVuSans.ttf"]
BOLD = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "DejaVuSans-Bold.ttf"]


def font(size: int, bold: bool = False):
    for f in (BOLD if bold else FONTS):
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            continue
    return ImageFont.load_default()


def render(result: dict, image_bytes: bytes | None, fmt: str = "png") -> tuple[bytes, str]:
    img = Image.new("RGB", (W, 1700), BG)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 150], fill=GREEN)
    d.text((48, 38), "Ouroboros", font=font(52, True), fill="white")
    d.text((48, 100), "PCB value & recovery report", font=font(26), fill=(220, 252, 231))
    y = 190

    val = result.get("value")
    if val:
        d.text((48, y), "Estimated value", font=font(28), fill=MUTED)
        d.text((48, y + 40), f"₹{val['low']} – ₹{val['high']}", font=font(96, True), fill=DARK)
        y += 170
        bd = val["breakdown"]
        d.text((48, y), f"Reuse ₹{bd['reuse'][0]}–{bd['reuse'][1]}    Metals ₹{bd['metals'][0]}–{bd['metals'][1]}"
                        f"    Cost ₹{bd['processing_cost'][0]}–{bd['processing_cost'][1]}", font=font(26), fill=MUTED)
        y += 60
    else:
        d.text((48, y), "Board not recognised", font=font(54, True), fill=DARK)
        y += 90

    for line in textwrap.wrap(result["recommendation"], 60):
        d.text((48, y), line, font=font(34, True), fill=GREEN)
        y += 46
    y += 20

    if image_bytes:
        im = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        iw, ih = result["image"]["width"], result["image"]["height"]
        sc = (W - 96) / im.width
        im = im.resize((W - 96, int(im.height * sc)))
        dr = ImageDraw.Draw(im)
        for det in result["detections"]:
            x, yy, w, h = [v * im.width / iw for v in det["bbox"]]
            dr.rectangle([x, yy, x + w, yy + h], outline=(220, 38, 38), width=3)
        h = min(im.height, 520)
        img.paste(im.crop((0, 0, im.width, h)), (48, y))
        y += h + 30

    d.text((48, y), "Recovery routes (more dots = better)", font=font(28, True), fill=DARK)
    y += 50
    for r in result["routes"]:
        d.text((48, y), r["route"], font=font(28), fill=DARK)
        d.text((260, y), f"score {r['score']:.2f}" if r["eligible"] else "not eligible", font=font(26), fill=MUTED)
        bar = int(500 * r["score"])
        d.rectangle([520, y + 6, 520 + 500, y + 30], outline=MUTED)
        d.rectangle([520, y + 6, 520 + bar, y + 30], fill=GREEN)
        y += 46
    y += 20

    d.text((48, y), f"Components (board confidence {result['board']['confidence']:.0%})", font=font(28, True), fill=DARK)
    y += 50
    for c in result["components"]:
        d.text((48, y), f"{c['class']}  ×{c['count']}  avg conf {c['avg_conf']:.2f}"
                        f"{'  · potentially reusable' if c['reusable'] else ''}", font=font(26), fill=DARK)
        y += 40
    y += 20
    note = ("Ranges are estimates from placeholder tables, not guarantees. Hazardous steps (acid, burning) must only be "
            "done by authorised recyclers. Prices as of " + str(result.get("prices_as_of", ""))[:10] + ".")
    for line in textwrap.wrap(note, 78):
        d.text((48, y), line, font=font(22), fill=MUTED)
        y += 30
    d.text((48, y + 10), f"Scan {result['scan_id']} · {result['created_at'][:19].replace('T', ' ')} UTC", font=font(22), fill=MUTED)
    img = img.crop((0, 0, W, min(1700, y + 70)))

    buf = io.BytesIO()
    if fmt == "pdf":
        img.save(buf, "PDF", resolution=130)
        return buf.getvalue(), "application/pdf"
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue(), "image/png"
