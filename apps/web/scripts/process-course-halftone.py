import math
import os
from PIL import Image, ImageDraw
import numpy as np

def generate_course_halftone():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_path = os.path.join(base_dir, 'public', 'course.jpg')
    out_jpg = os.path.join(base_dir, 'public', 'course-halftone.jpg')
    out_png = os.path.join(base_dir, 'public', 'course-halftone.png')

    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found")
        return

    orig = Image.open(input_path)
    orig_w, orig_h = orig.size
    print(f"Processing course.jpg ({orig_w}x{orig_h})...")

    # 16:10 aspect ratio thumbnail (1600 x 1000, 2x retina)
    target_w = 1600
    target_h = 1000

    desired_h = int(orig_w * (10.0 / 16.0))
    crop_y0 = int((orig_h - desired_h) * 0.40)
    crop_y1 = crop_y0 + desired_h
    crop_x0 = 0
    crop_x1 = orig_w

    cropped = orig.crop((crop_x0, crop_y0, crop_x1, crop_y1))
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    arr_f = np.array(resized, dtype=np.float32)

    rgb = arr_f[:, :, :3]
    # Luminance / Grayscale conversion (0% saturation)
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]

    # Shadows lift and highlight control
    shadow_mask = np.clip(1.0 - (lum / 255.0), 0.0, 1.0) ** 1.8
    lifted = lum + (shadow_mask * 40.0)

    high_mask = np.clip((lum - 128.0) / 127.0, 0.0, 1.0) ** 1.3
    pulled = lifted - (high_mask * 20.0)

    contrasted = np.clip((pulled - 128.0) * 1.55 + 128.0, 0.0, 255.0)

    # Cinema black background
    out = Image.new("RGB", (target_w, target_h), (5, 5, 5))
    draw = ImageDraw.Draw(out)

    period = 4.8
    size = 2.4
    stretch = 0.17  # 17% horizontal stretch matching Hero & Login halftones
    rx = (size / 2.0) * (1.0 + stretch)
    ry = (size / 2.0)
    angle_rad = math.radians(15.0)
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)

    diag = math.sqrt(target_w**2 + target_h**2)
    u_range = np.arange(-diag, diag, period)
    v_range = np.arange(-diag, diag, period)

    count = 0
    for u in u_range:
        for v in v_range:
            x = u * cos_a - v * sin_a + target_w / 2.0
            y = u * sin_a + v * cos_a + target_h / 2.0
            ix, iy = int(round(x)), int(round(y))
            if 0 <= ix < target_w and 0 <= iy < target_h:
                x0 = max(0, ix - 1)
                x1 = min(target_w, ix + 2)
                y0 = max(0, iy - 1)
                y1 = min(target_h, iy + 2)
                brightness = float(np.mean(contrasted[y0:y1, x0:x1])) / 255.0

                if brightness < 0.08:
                    continue

                dot_norm = (brightness - 0.08) / 0.92
                d_rx = rx * (0.45 + 0.85 * (dot_norm ** 0.9))
                d_ry = ry * (0.45 + 0.85 * (dot_norm ** 0.9))

                step = 255.0 / 12.0
                dot_val = int(round((brightness * 255.0) / step) * step)
                draw.ellipse([x - d_rx, y - d_ry, x + d_rx, y + d_ry], fill=(dot_val, dot_val, dot_val))
                count += 1

    out.save(out_jpg, quality=95, optimize=True)
    out.save(out_png, optimize=True)
    print(f"Generated {count} halftone dots to {out_jpg} and {out_png}")

if __name__ == '__main__':
    generate_course_halftone()
