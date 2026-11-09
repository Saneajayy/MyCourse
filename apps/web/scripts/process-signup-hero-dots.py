import math
import os
import json
from PIL import Image, ImageDraw
import numpy as np

def generate_signup_dots():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_path = os.path.join(base_dir, 'public', 'signup.JPG')
    output_png_path = os.path.join(base_dir, 'public', 'signup-pixelated.png')
    output_json_path = os.path.join(base_dir, 'public', 'signup-dots.json')

    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found")
        return

    orig = Image.open(input_path).convert('RGB')
    orig_w, orig_h = orig.size
    print(f"Loaded signup.JPG ({orig_w}x{orig_h})")

    # Crop matching Crop 2 (x0 = int(orig_w * 0.12), desired aspect ratio 500:583)
    crop_h = orig_h
    crop_w = int(crop_h * (500.0 / 583.0)) # ~3293
    crop_x0 = int(orig_w * 0.12)
    crop_x1 = crop_x0 + crop_w
    cropped = orig.crop((crop_x0, 0, crop_x1, crop_h))

    # High-resolution retina target: 1600 x 1865
    target_w = 1600
    target_h = int(target_w * (583.0 / 500.0))
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    arr_f = np.array(resized, dtype=np.float32)

    # Grayscale conversion matching Hero / Login
    lum = 0.299 * arr_f[:, :, 0] + 0.587 * arr_f[:, :, 1] + 0.114 * arr_f[:, :, 2]
    lum_norm = lum / 255.0

    # High clarity contrast curve
    lum_curved = np.clip((lum_norm - 0.05) / 0.88, 0.0, 1.0)
    lum_curved = lum_curved ** 0.88

    # Output PNG with transparent background
    out = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)

    # Grid parameters matching Hero / Login: period 4.8, size 2.4, 17% horizontal stretch, 15 deg rotation
    period = 4.8
    size = 2.4
    stretch = 0.17
    rx = (size / 2.0) * (1.0 + stretch)
    ry = (size / 2.0)

    angle_rad = math.radians(15.0)
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)

    diag = math.sqrt(target_w**2 + target_h**2)
    u_range = np.arange(-diag, diag, period)
    v_range = np.arange(-diag, diag, period)

    dots_data = []
    count = 0
    for u in u_range:
        for v in v_range:
            x = u * cos_a - v * sin_a + target_w / 2.0
            y = u * sin_a + v * cos_a + target_h / 2.0

            ix, iy = int(round(x)), int(round(y))
            if 0 <= ix < target_w and 0 <= iy < target_h:
                brightness = float(lum_curved[iy, ix])
                if brightness < 0.05:
                    continue

                dot_rx = rx * (0.55 + 1.25 * brightness)
                dot_ry = ry * (0.55 + 1.25 * brightness)

                # ALL PURE WHITE (255, 255, 255) with alpha scaling
                alpha = int(np.clip(80 + brightness * 175, 0, 255))

                draw.ellipse([x - dot_rx, y - dot_ry, x + dot_rx, y + dot_ry], fill=(255, 255, 255, alpha))

                dots_data.append([
                    round(x / target_w, 4),
                    round(y / target_h, 4),
                    round(dot_rx, 2),
                    255, 255, 255,
                    round(alpha / 255.0, 2)
                ])
                count += 1

    out.save(output_png_path, 'PNG', optimize=True)
    print(f"Rendered {count} ALL-WHITE halftone dots to {output_png_path}")

    with open(output_json_path, 'w') as f:
        json.dump({"w": target_w, "h": target_h, "dots": dots_data}, f, separators=(',', ':'))
    print(f"Saved {output_json_path} successfully ({os.path.getsize(output_json_path) / 1024:.1f} KB)")

    # Preview on royal blue #0033FF
    bg = Image.new('RGBA', (target_w, target_h), (0, 51, 255, 255))
    comp = Image.alpha_composite(bg, out)
    preview_path = '/Users/ajaykumar/.gemini/antigravity-ide/brain/cdf83b4a-e1ff-4468-a17f-f538b4972f6c/signup_dots_preview.png'
    comp.save(preview_path)
    print(f"Saved preview to {preview_path}")

if __name__ == '__main__':
    generate_signup_dots()
