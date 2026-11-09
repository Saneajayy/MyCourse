import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def create_melting_basics():
    font_path = '/Users/ajaykumar/Desktop/MyCourse/apps/web/public/fonts/RedditSans-Bold.ttf'
    output_path = '/Users/ajaykumar/Desktop/MyCourse/apps/web/public/basics-melting.png'
    
    # 1. Base dimensions
    width = 2400
    height = 950
    font_size = 380
    
    font = ImageFont.truetype(font_path, font_size)
    text = "BASICS"
    
    # Render base text
    base_img = Image.new('L', (width, height), 0)
    draw = ImageDraw.Draw(base_img)
    
    tx = 60 # left align with nice margin
    ty = 40 # near top
    draw.text((tx, ty), text, font=font, fill=255)
    
    arr_base = np.array(base_img, dtype=np.float32) / 255.0
    
    # Find text top and bottom limits
    y_indices, x_indices = np.where(arr_base > 0.1)
    min_y, max_y = y_indices.min(), y_indices.max()
    text_h = max_y - min_y
    melt_start_y = min_y + text_h * 0.42 # melt starts at 42% down the letter
    
    print(f"Text bounds: x=[{x_indices.min()}, {x_indices.max()}], y=[{min_y}, {max_y}], melt_start={melt_start_y:.1f}")
    
    # 2. Drip length profile across x
    # Natural dripping columns with peaks and valleys like melting liquid
    x_coords = np.arange(width)
    
    drip_noise = (
        160.0 * np.sin(x_coords * 0.009 + 1.2) +
        110.0 * np.sin(x_coords * 0.019 + 2.5) +
        70.0 * np.sin(x_coords * 0.038 + 0.4) +
        40.0 * np.sin(x_coords * 0.075 + 3.1) +
        260.0
    )
    
    # Ensure columns with actual glyph strokes drip downwards
    col_has_stroke = (arr_base > 0.1).any(axis=0)
    col_weight = np.convolve(col_has_stroke.astype(float), np.ones(45)/45, mode='same')
    col_weight = np.clip(col_weight * 1.6, 0.0, 1.0)
    
    drip_length = drip_noise * col_weight
    
    # 3. Simulate RGB channels with chromatic refraction
    offsets = {
        'R': {'dx': 9.5,  'wobble_freq': 0.011, 'wobble_amp': 15.0, 'drip_scale': 1.02},
        'G': {'dx': 0.0,  'wobble_freq': 0.010, 'wobble_amp': 13.0, 'drip_scale': 1.00},
        'B': {'dx': -9.5, 'wobble_freq': 0.009, 'wobble_amp': 11.0, 'drip_scale': 0.98},
    }
    
    channels = {}
    for ch, p in offsets.items():
        ch_arr = np.zeros((height, width), dtype=np.float32)
        
        # Copy upper untouched portion directly
        top_mask = (np.arange(height)[:, None] < melt_start_y)
        ch_arr[top_mask] = arr_base[top_mask]
        
        # For lower portion, smear/elongate downwards along wobbly streamline
        for y in range(int(melt_start_y), height):
            progress = (y - melt_start_y) / (height - melt_start_y)
            
            # Wobble in x as y moves down
            wobble = p['wobble_amp'] * np.sin(y * p['wobble_freq'] + (0.6 if ch == 'R' else -0.6 if ch == 'B' else 0.0))
            dx = p['dx'] * (progress ** 0.5) + wobble * (progress ** 1.1)
            
            # Upstream sample y
            src_y = melt_start_y + (y - melt_start_y) * 0.16
            src_y = np.clip(src_y, min_y, max_y)
            
            src_x = np.clip(x_coords - dx, 0, width - 1)
            
            src_x_int = np.clip(np.floor(src_x).astype(int), 0, width - 2)
            src_x_frac = src_x - src_x_int
            
            y_int = int(src_y)
            y_next = min(y_int + 1, height - 1)
            y_frac = src_y - y_int
            
            val_top = (1 - src_x_frac) * arr_base[y_int, src_x_int] + src_x_frac * arr_base[y_int, src_x_int + 1]
            val_bot = (1 - src_x_frac) * arr_base[y_next, src_x_int] + src_x_frac * arr_base[y_next, src_x_int + 1]
            sample = (1 - y_frac) * val_top + y_frac * val_bot
            
            # Drip falloff for this column
            max_drip_y = melt_start_y + drip_length * p['drip_scale']
            fade = np.clip(1.0 - (y - melt_start_y) / np.maximum(max_drip_y - melt_start_y, 1.0), 0.0, 1.0)
            fade = fade ** 1.7
            
            ch_arr[y, :] = sample * fade
            
        channels[ch] = ch_arr

    r = channels['R']
    g = channels['G']
    b = channels['B']
    
    # Alpha is max of all channels
    alpha = np.maximum(np.maximum(r, g), b)
    alpha = np.clip(alpha * 1.15, 0.0, 1.0)
    
    # Enhance chromatic fringes like in reference image:
    diff = r - b
    r_boost = np.where(diff > 0.04, r * 1.15 + 0.15 * diff, r)
    b_boost = np.where(diff < -0.04, b * 1.15 - 0.15 * diff, b)
    g_boost = np.where(np.abs(diff) > 0.04, g * 0.95 + 0.05 * np.maximum(r, b), g)
    
    r_final = np.clip(r_boost * 255.0, 0.0, 255.0).astype(np.uint8)
    g_final = np.clip(g_boost * 255.0, 0.0, 255.0).astype(np.uint8)
    b_final = np.clip(b_boost * 255.0, 0.0, 255.0).astype(np.uint8)
    a_final = np.clip(alpha * 255.0, 0.0, 255.0).astype(np.uint8)
    
    rgba = np.dstack([r_final, g_final, b_final, a_final])
    out_img = Image.fromarray(rgba, 'RGBA')
    
    out_img.save(output_path)
    print(f"Generated {output_path} successfully ({width}x{height})")

if __name__ == '__main__':
    create_melting_basics()
