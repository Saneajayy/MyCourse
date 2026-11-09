import math
import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

def generate_login_halftone():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_path = os.path.join(base_dir, 'public', 'login.jpg')
    output_path = os.path.join(base_dir, 'public', 'login-halftone.png')

    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found")
        return

    orig = Image.open(input_path).convert('RGB')
    orig_w, orig_h = orig.size

    # Crop matching scratch_mock_left.png
    crop_x0 = 800
    crop_y0 = 80
    crop_x1 = 4800
    crop_y1 = 4000
    
    # 500 / 583 aspect ratio
    desired_w = int((crop_y1 - crop_y0) * (500.0 / 583.0))
    crop_x0 = crop_x1 - desired_w
    if crop_x0 < 0:
        crop_x0 = 0

    print(f"Crop box: ({crop_x0}, {crop_y0}, {crop_x1}, {crop_y1})")
    cropped = orig.crop((crop_x0, crop_y0, crop_x1, crop_y1))
    
    target_w = 1200
    target_h = int(target_w * (583.0 / 500.0))
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    arr = np.array(resized, dtype=np.float32)
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    
    lum_norm = lum / 255.0
    # Lift shadows slightly, moderate highlights so helmet preserves scanline pattern
    lum_curved = np.clip((lum_norm - 0.05) / 0.88, 0.0, 1.0)
    # Gamma adjustment to keep scanlines visible on white surfaces
    lum_curved = lum_curved ** 0.85
    
    # Deep cobalt navy background
    bg_color = (0, 16, 75)
    out = Image.new('RGB', (target_w, target_h), bg_color)
    draw = ImageDraw.Draw(out)
    
    # Period around 5.8px
    period = 5.8
    y_coords = np.arange(0, target_h, period)
    
    step = 2
    x_indices = list(range(0, target_w, step))
    if x_indices[-1] != target_w - 1:
        x_indices.append(target_w - 1)
        
    for y in y_coords:
        iy = int(min(target_h - 1, max(0, round(y))))
        row_lum = lum_curved[iy, :]
        
        points_top = []
        points_bot = []
        
        for ix in x_indices:
            l = float(row_lum[ix])
            # Max thickness is 75% of period so scanline pattern remains distinct even in brightest areas
            thick = max(0.4, 0.3 + l * (period * 0.72))
            points_top.append((ix, y - thick / 2.0))
            points_bot.append((ix, y + thick / 2.0))
            
        for i in range(len(x_indices) - 1):
            x1, x2 = x_indices[i], x_indices[i+1]
            l_val = float(row_lum[x1])
            
            # Vibrant cobalt to bright electric blue to crisp white
            if l_val < 0.15:
                t = l_val / 0.15
                r = int(0 + t * 5)
                g = int(20 + t * 30)
                b = int(90 + t * 60)
            elif l_val < 0.45:
                t = (l_val - 0.15) / 0.30
                r = int(5 + t * 20)
                g = int(50 + t * 50)
                b = int(150 + t * 90)
            elif l_val < 0.75:
                t = (l_val - 0.45) / 0.30
                r = int(25 + t * 140)
                g = int(100 + t * 110)
                b = int(240 + t * 15)
            else:
                t = (l_val - 0.75) / 0.25
                r = int(165 + t * 90)
                g = int(210 + t * 45)
                b = 255
                
            quad = [
                points_top[i],
                points_top[i+1],
                points_bot[i+1],
                points_bot[i]
            ]
            draw.polygon(quad, fill=(r, g, b))
            
    out.save(output_path, 'PNG', quality=95)
    print(f"Saved {output_path} successfully ({target_w}x{target_h})")

if __name__ == '__main__':
    generate_login_halftone()
