import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import os

def getFilePath(path: str):
    """ Return the path from the code file """
    return os.path.join(os.path.dirname(__file__), path)

def strokeWidth(binary_img):
    """使用距离变换估算笔画宽度"""
    dist = cv2.distanceTransform(binary_img, cv2.DIST_L2, cv2.DIST_MASK_PRECISE)
    _, mask = cv2.threshold(dist, 0.1, 255, cv2.THRESH_BINARY)
    mask = mask.astype(np.uint8)
    try:
        max_val = np.max(dist[mask > 0])
        return 2 * max_val if max_val > 0 else 0
    except Exception:
        return 0

def fontLen(textList: list[str], font_type: str, font_height: float, scale: int, scale_factor: int = 4):
    """ get the length of some text in pixle, font_type should be <code>"A"</code>, <code>"B"</code>, or <code>"C"</code> """
    if font_type not in {"A", "B", "C"}:
        font_type = "A"
    font_path = getFilePath({"A": "jtbz_A.ttf", "B": "HWYGOTH-4.ttf", "C": "HWYGNRRW-3.ttf"}[font_type])
    font = ImageFont.truetype(font_path, font_height * scale * scale_factor)
    sumLen = 0
    for text in textList:
        try:
            bbox = font.getbbox(text)
            orig_width = bbox[2] - bbox[0]
            orig_height = bbox[3]
        except AttributeError:
            orig_width = int(font.getlength(text))
            orig_height = 4 * font_height
        processed_height = orig_height + 40 - round(0.09 * font_height if '\u4e00' <= text <= '\u9fff' else 0.727 * font_height) * scale
        sumLen += orig_width * font_height / (processed_height if processed_height > 0 else 1)
    return sumLen

def generateFontMask(text: str, font_type: str, font_height: int, scale_factor: int = 4, maxLen: int|None = None) -> Image.Image:
    """
        <h4>Generate sign-font mask based on GB5768</h4>
        <p> font_type should be <code>"A"</code>, <code>"B"</code>, or <code>"C"</code></p>
    """
    if font_type not in {"A", "B", "C"}:
        font_type = "A"
    font_height = round(font_height)
    # Draw text
    font_path = getFilePath({"A": "交通标志专用字体.ttf", "B": "HWYGOTH-4.ttf", "C": "HWYGNRRW-3.ttf"}[font_type])
    font = ImageFont.truetype(font_path, int(font_height * scale_factor))
    bbox = (0, 0, 0, 0)
    try:
        bbox = font.getbbox(text)
        width = bbox[2] - bbox[0]
        height = bbox[3]
    except AttributeError:
        width = int(font.getlength(text))
        height = int(font_height * scale_factor)
    img = Image.new('RGBA', (width + 100, height + 100), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.text((50 - bbox[0], 50), text, font=font, fill=(255, 255, 255, 255))
    # Convert to cv2 (np)
    img_gray = cv2.cvtColor(np.array(img), cv2.COLOR_RGBA2GRAY)
    _, binary = cv2.threshold(img_gray, 128, 255, cv2.THRESH_BINARY)
    # Adjust stroke 
    stroke_ratios = {"A": 0.1, 'B': 1/6, 'C': 0.1}
    target_stroke = stroke_ratios[font_type] * font_height * scale_factor
    current_stroke = strokeWidth(binary)
    if current_stroke > 0 and target_stroke > 0:
        kernel_size = int(abs(current_stroke - target_stroke) / 2)
        kernel_size = max(1, min(kernel_size, 15))        
        if current_stroke < target_stroke:
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
            processed = cv2.dilate(binary, kernel, iterations=1)
        else:
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (kernel_size, kernel_size))
            processed = cv2.erode(binary, kernel, iterations=1)
    else:
        processed = binary
    processed = processed[30 + round((0.09 if any('\u4e00' <= char <= '\u9fff'for char in text) else 0.727) * scale_factor/4 * font_height): processed.shape[0] - 30, 50: processed.shape[1] - 50]
    # Resize to origin size
    target_width = int(font_height / processed.shape[0] * processed.shape[1])
    if maxLen is not None and 0 < maxLen < target_width:
        target_width = maxLen
    resized = cv2.resize(processed, (target_width, font_height), interpolation=cv2.INTER_AREA)
    return Image.fromarray(resized)

def placeText(img: Image.Image, pos: tuple[int, int], text: str, font_type: str, font_height: int, color: tuple, maxLen: int|None = None) -> Image.Image:
    """
        <h4>Put text on image</h4>
        <p> font_type should be <code>"A"</code>, <code>"B"</code>, or <code>"C"</code></p>
    """
    if len(text) == 0:
        return img
    if isinstance(color, int):
        color = (color, color, color, 255)
    elif len(color) == 1:
        color = (color[0], color[0], color[0], 255)
    elif len(color) == 3:
        color = (*color, 255)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    # Paste colored text by mask
    mask = generateFontMask(text, font_type, font_height, maxLen=maxLen)
    xMax, yMax = mask.size
    xMax += pos[0]
    yMax += pos[1]
    if xMax > img.size[0] or yMax >img.size[1]:
        print(f"Warning: text area ({xMax}, {yMax}) out of image size {img.size}.")
    img.paste(Image.new('RGBA', mask.size, color), pos, mask.convert('L'))
    return img

if __name__ == "__main__":
    # 示例1：
    background = Image.new('RGB', (1600, 600), (34,150,60))
    result = placeText(
        img=background,
        pos=(100, 100),  # 位置
        text="庐江 军铺A",      # 文字内容
        font_type="A",   # 字体类型
        font_height=300,  # 字高30mm
        color=(255)  # 白色文字
    )
    result.save(getFilePath("A型字体示例.png"))
"""     # 示例2：
    photo = Image.new('RGB', (800, 600), (231,20,32))
    result = placeText(
        img=photo,
        pos=(50, 50),
        text="G325",
        font_type="B",
        font_height=300,
        color=(255)
    )
    result.save(getFilePath("B型字体示例.png"))
    
    # 生成C型字体示例
    c_font_img = generateFontMask("S226", 'C', 300)
    c_font_img.save(getFilePath("C型字体示例.png")) """