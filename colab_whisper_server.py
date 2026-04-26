# ==========================================================
# CINEPHINE - WHISPER LARGE-V3 REMOTE SERVER
# ==========================================================
# Hướng dẫn:
# 1. Upload file này lên Google Colab.
# 2. Chọn Runtime -> Change runtime type -> T4 GPU.
# 3. Lấy Ngrok Token tại https://dashboard.ngrok.com/
# 4. Thay token vào biến NGROK_AUTH_TOKEN bên dưới.
# 5. Nhấn Run All.
# ==========================================================

import os
import sys

# Cài đặt thư viện (Tự động chạy nếu chưa có)
def install_dependencies():
    print("Đang kiểm tra và cài đặt thư viện cần thiết...")
    os.system("pip install -q faster-whisper fastapi uvicorn pyngrok nest-asyncio python-multipart")
    print("Cài đặt hoàn tất.")

try:
    from faster_whisper import WhisperModel
    from fastapi import FastAPI, UploadFile, File, Form, HTTPException
    from pyngrok import ngrok
except ImportError:
    install_dependencies()
    # Sau khi cài đặt, cần import lại
    from faster_whisper import WhisperModel
    from fastapi import FastAPI, UploadFile, File, Form, HTTPException
    from pyngrok import ngrok

import nest_asyncio
import uvicorn
import shutil
from datetime import datetime

# --- CẤU HÌNH ---
NGROK_AUTH_TOKEN = "DÁN_TOKEN_NGROK_CỦA_BẠN_VÀO_ĐÂY"
MODEL_SIZE = "large-v3"

# --- KHỞI TẠO ---
print(f"--- Đang tải Model Whisper {MODEL_SIZE}... ---")
model = WhisperModel(MODEL_SIZE, device="cuda", compute_type="float16")
print("--- Model đã sẵn sàng! ---")

app = FastAPI(title="Whisper Remote API for CinePhine")

def format_vtt_timestamp(seconds: float) -> str:
    """Chuyển đổi giây sang định dạng HH:MM:SS.mmm của VTT"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02}:{m:02}:{s:06.3f}"

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = Form("ko")):
    temp_filename = f"input_{file.filename}"
    try:
        with open(temp_filename, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"[{datetime.now()}] Đang xử lý: {file.filename} | Ngôn ngữ: {language}")
        
        segments, info = model.transcribe(temp_filename, beam_size=5, language=language)
        
        vtt_lines = ["WEBVTT\n\n"]
        for segment in segments:
            if segment.text.strip():
                vtt_lines.append(f"{format_vtt_timestamp(segment.start)} --> {format_vtt_timestamp(segment.end)}\n{segment.text.strip()}\n\n")
        
        os.remove(temp_filename)
        return {"success": True, "vtt": "".join(vtt_lines)}

    except Exception as e:
        if os.path.exists(temp_filename): os.remove(temp_filename)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def home():
    return {"status": "Whisper Large-v3 Server is Running"}

# --- CHẠY SERVER ---
if __name__ == "__main__":
    ngrok.set_auth_token(NGROK_AUTH_TOKEN)
    
    # Xóa các tunnel cũ để tránh lỗi "too many sessions"
    tunnels = ngrok.get_tunnels()
    for t in tunnels:
        ngrok.disconnect(t.public_url)
        
    public_url = ngrok.connect(8000).public_url
    print("\n" + "="*60)
    print(f"🚀 URL CẦN DÁN VÀO ADMIN DASHBOARD:")
    print(f"👉 {public_url}")
    print("="*60 + "\n")

    # Cấu hình uvicorn phù hợp với Colab
    nest_asyncio.apply()
    config = uvicorn.Config(app, host="0.0.0.0", port=8000, log_level="info")
    server = uvicorn.Server(config)
    
    # Chạy server trong event loop hiện tại của Colab
    import asyncio
    loop = asyncio.get_event_loop()
    loop.run_until_complete(server.serve())
