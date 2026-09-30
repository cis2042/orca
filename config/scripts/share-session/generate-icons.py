import os
from PIL import Image, ImageDraw, ImageFont

out_dir = "config/scripts/share-session/assets/icons"
os.makedirs(out_dir, exist_ok=True)
size = (256, 256)

def gen_text_badge(text, color1, color2, text_color, filename, font_size=124):
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for y in range(256):
        ratio = y / 255.0
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        draw.line([(0, y), (255, y)], fill=(r, g, b, 255))

    mask = Image.new("L", size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, 255, 255], radius=64, fill=255)
    img.putalpha(mask)

    draw = ImageDraw.Draw(img)
    font_path = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
    if not os.path.exists(font_path):
        font_path = "/System/Library/Fonts/Supplemental/Arial.ttf"
    font = ImageFont.truetype(font_path, font_size)

    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (256 - text_w) / 2 - bbox[0]
    y = (256 - text_h) / 2 - bbox[1]

    draw.text((x, y), text, font=font, fill=text_color)
    img.save(os.path.join(out_dir, filename), "PNG")

def gen_xagent():
    gen_text_badge("Ag", (29, 78, 216), (37, 99, 235), (255, 255, 255, 255), "xagent.png", 126)

def gen_xhuman():
    gen_text_badge("Hu", (4, 120, 87), (5, 150, 105), (255, 255, 255, 255), "xhuman.png", 126)

def gen_twin3():
    gen_text_badge("T3", (67, 56, 202), (79, 70, 229), (255, 255, 255, 255), "twin3.png", 126)

def gen_bitbee():
    gen_text_badge("Be", (245, 158, 11), (250, 204, 21), (15, 23, 42, 255), "bitbee.png", 126)

def create_rounded_bg(color1, color2):
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for y in range(256):
        ratio = y / 255.0
        r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
        g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
        b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
        draw.line([(0, y), (255, y)], fill=(r, g, b, 255))
    mask = Image.new("L", size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, 255, 255], radius=56, fill=255)
    img.putalpha(mask)
    return img

def gen_claude():
    img = create_rounded_bg((38, 24, 20), (58, 32, 24))
    draw = ImageDraw.Draw(img)
    cx, cy = 128, 128
    spokes = 8
    import math
    for i in range(spokes):
        angle = math.radians(i * (360 / spokes))
        x1 = cx + 22 * math.cos(angle)
        y1 = cy + 22 * math.sin(angle)
        x2 = cx + 72 * math.cos(angle)
        y2 = cy + 72 * math.sin(angle)
        draw.line([(x1, y1), (x2, y2)], fill=(217, 119, 6, 255), width=16)
    draw.ellipse([cx - 24, cy - 24, cx + 24, cy + 24], fill=(245, 158, 11, 255))
    img.save(os.path.join(out_dir, "claude.png"), "PNG")

def gen_gpt():
    img = create_rounded_bg((10, 30, 26), (15, 52, 45))
    draw = ImageDraw.Draw(img)
    cx, cy = 128, 128
    import math
    for i in range(6):
        angle = math.radians(i * 60)
        px = cx + 38 * math.cos(angle)
        py = cy + 38 * math.sin(angle)
        draw.ellipse([px - 36, py - 36, px + 36, py + 36], outline=(16, 185, 129, 230), width=8)
    draw.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=(52, 211, 153, 255))
    img.save(os.path.join(out_dir, "gpt.png"), "PNG")

def gen_gemini():
    img = create_rounded_bg((15, 23, 42), (20, 30, 60))
    draw = ImageDraw.Draw(img)
    cx, cy = 128, 128
    star_pts = [
        (cx, cy - 82), (cx + 20, cy - 22), (cx + 82, cy), (cx + 20, cy + 22),
        (cx, cy + 82), (cx - 20, cy + 22), (cx - 82, cy), (cx - 20, cy - 22)
    ]
    draw.polygon(star_pts, fill=(96, 165, 250, 255))
    inner_pts = [
        (cx, cy - 54), (cx + 12, cy - 14), (cx + 54, cy), (cx + 12, cy + 14),
        (cx, cy + 54), (cx - 12, cy + 14), (cx - 54, cy), (cx - 12, cy - 14)
    ]
    draw.polygon(inner_pts, fill=(192, 132, 252, 255))
    draw.ellipse([cx - 16, cy - 16, cx + 16, cy + 16], fill=(255, 255, 255, 255))
    img.save(os.path.join(out_dir, "gemini.png"), "PNG")

if __name__ == "__main__":
    gen_bitbee()
    gen_twin3()
    gen_xhuman()
    gen_xagent()
    gen_claude()
    gen_gpt()
    gen_gemini()
    print("Generated text-badge icons: Ag, Hu, T3, Be (yellow)")
