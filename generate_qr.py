#!/usr/bin/env python3
"""
生成 GeZiPuzzle 项目预览二维码
包含项目信息和 AppID，供微信开发者工具扫码使用
"""
import qrcode
from PIL import Image, ImageDraw, ImageFont
import os

OUTPUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'qr_preview.png')
PROJECT_NAME = 'GeZiPuzzle'
APPID = 'wxc8e8c5a7ef4caf8a'
PROJECT_PATH = r'F:\SelfJob\GeZiPuzzle'

def generate_qr():
    # 二维码内容：项目信息
    qr_content = f"GeZiPuzzle\nAppID: {APPID}\n路径: {PROJECT_PATH}\n\n请在微信开发者工具中打开此项目，点击【预览】按钮生成真实验证码"

    # 生成二维码
    qr = qrcode.QRCode(
        version=4,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=2,
    )
    qr.add_data(qr_content)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    # 放大
    img = img.resize((500, 500), Image.LANCZOS)

    # 添加标题
    draw = ImageDraw.Draw(img)
    # 在二维码下方添加文字说明
    title_text = f"{PROJECT_NAME} 预览"
    try:
        font = ImageFont.truetype("msyh.ttc", 28)
        small_font = ImageFont.truetype("msyh.ttc", 16)
    except:
        font = ImageFont.load_default()
        small_font = ImageFont.load_default()

    # 创建带边框的新图
    new_img = Image.new('RGB', (500, 600), 'white')
    new_img.paste(img, (0, 0))

    draw = ImageDraw.Draw(new_img)
    # 标题
    draw.text((250 - 80, 515), title_text, fill='black', font=font)
    draw.text((10, 565), f"AppID: {APPID}", fill='#666', font=small_font)

    new_img.save(OUTPUT_PATH)
    print(f"二维码已生成: {OUTPUT_PATH}")
    print(f"文件大小: {os.path.getsize(OUTPUT_PATH) / 1024:.1f} KB")

if __name__ == '__main__':
    generate_qr()
