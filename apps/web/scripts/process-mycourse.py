import math
import os
import json
import shutil
from PIL import Image, ImageDraw
import numpy as np

def process_mycourse2():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_file = os.path.join(base_dir, 'public', 'mycourse2.png')

    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found")
        return

    img = Image.open(input_file).convert('RGBA')
    orig_w, orig_h = img.size
    print(f"Processing mycourse2.png ({orig_w}x{orig_h}) with landing page halftone dot effect...")

    # 2x retina scale for ultra-crisp dots:
    scale = 2.0
    target_w = int(orig_w * scale)
    target_h = int(orig_h * scale)

    resized = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    arr_f = np.array(resized, dtype=np.float32)
    rgb = arr_f[:, :, :3]
    alpha = arr_f[:, :, 3]

    # 1. Grayscale conversion
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    gray_rgb = np.stack([lum, lum, lum], axis=-1)

    # 2. Shadows: 100 (Lift shadows to preserve dark details)
    shadow_mask = np.clip(1.0 - (lum / 255.0), 0.0, 1.0) ** 1.5
    lifted = gray_rgb + (shadow_mask[:, :, None] * 75.0)

    # 3. Highlights: 0 (Compress/pull down harsh white highlights)
    high_mask = np.clip((lum - 128.0) / 127.0, 0.0, 1.0) ** 1.5
    pulled = lifted - (high_mask[:, :, None] * 40.0)

    # 4. Contrast: 100 (Full contrast curve)
    contrasted = (pulled - 128.0) * 1.85 + 128.0
    final_rgb = np.clip(contrasted, 0.0, 255.0)
    arr = np.dstack([final_rgb, alpha]).astype(np.uint8)

    out = Image.new('RGBA', (target_w, target_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(out)

    # Grid parameters: Size 2, Gap 2 -> Period 4 (scaled by scale)
    period = 4.0 * scale
    size = 2.0 * scale
    stretch = 0.17  # 17% horizontal stretch
    rx = (size / 2.0) * (1.0 + stretch)
    ry = (size / 2.0)

    # 15 degree screen angle
    angle_rad = math.radians(15.0)
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)

    def trim_color(val, levels=11):
        step = 255.0 / (levels - 1)
        return int(round(val / step) * step)

    diag = math.sqrt(target_w**2 + target_h**2)
    u_range = np.arange(-diag, diag, period)
    v_range = np.arange(-diag, diag, period)
    patch_radius = int(round(2 * scale))

    dots_data = []
    count = 0
    for u in u_range:
        for v in v_range:
            x = u * cos_a - v * sin_a + target_w / 2.0
            y = u * sin_a + v * cos_a + target_h / 2.0

            ix, iy = int(round(x)), int(round(y))
            if 0 <= ix < target_w and 0 <= iy < target_h:
                if arr[iy, ix, 3] < 15:
                    continue

                y0 = max(0, iy - patch_radius)
                y1 = min(target_h, iy + patch_radius + 1)
                x0 = max(0, ix - patch_radius)
                x1 = min(target_w, ix + patch_radius + 1)

                patch = arr[y0:y1, x0:x1]
                if np.mean(patch[:, :, 3]) < 10:
                    continue

                center_color = arr[iy, ix]
                mean_color = np.mean(patch, axis=(0, 1))
                blended = 0.86 * mean_color + 0.14 * center_color

                r = trim_color(blended[0], 11)
                g = trim_color(blended[1], 11)
                b = trim_color(blended[2], 11)
                a = int(blended[3])

                brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
                if brightness < 0.05:
                    continue

                dot_rx = rx * (0.6 + 0.5 * brightness)
                dot_ry = ry * (0.6 + 0.5 * brightness)

                # Draw crisp ellipse on the output PNG
                draw.ellipse([x - dot_rx, y - dot_ry, x + dot_rx, y + dot_ry], fill=(r, g, b, a))

                # Store relative coordinates [x/W, y/H, dot_rx, r, g, b, alpha]
                dots_data.append([
                    round(x / target_w, 4),
                    round(y / target_h, 4),
                    round(dot_rx, 2),
                    r, g, b,
                    round(a / 255.0, 2)
                ])
                count += 1

    # Save to mycourse2-pixelated.png and mycourse-pixelated.png
    out_png_2 = os.path.join(base_dir, 'public', 'mycourse2-pixelated.png')
    out_png_1 = os.path.join(base_dir, 'public', 'mycourse-pixelated.png')
    out.save(out_png_2, 'PNG', optimize=True)
    shutil.copyfile(out_png_2, out_png_1)
    print(f"Rendered {count} halftone dots to {out_png_2} and {out_png_1}")

    json_payload = {
        "w": target_w,
        "h": target_h,
        "dots": dots_data
    }
    out_json_2 = os.path.join(base_dir, 'public', 'mycourse2-dots.json')
    out_json_1 = os.path.join(base_dir, 'public', 'mycourse-dots.json')
    with open(out_json_2, 'w') as f:
        json.dump(json_payload, f, separators=(',', ':'))
    shutil.copyfile(out_json_2, out_json_1)
    print(f"Saved {out_json_2} and {out_json_1} ({os.path.getsize(out_json_2) / 1024:.1f} KB)")

if __name__ == '__main__':
    process_mycourse2()
