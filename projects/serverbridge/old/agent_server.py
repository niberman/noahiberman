# import asyncio
# import io
# import os
# from contextlib import asynccontextmanager
# from fastapi import FastAPI
# from fastapi.responses import HTMLResponse, StreamingResponse
# from playwright.async_api import async_playwright
# import uvicorn

# # --- UNIVERSAL CONFIG ---
# PORT = 5001
# LATITUDE = 40.0150
# LONGITUDE = -105.2705
# # Use an absolute path to prevent macOS relative path crashes
# USER_DATA_DIR = os.path.abspath("./tinder_user_data")

# state = {"playwright": None, "context": None, "page": None}

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     print(f"[*] Initializing Tinder Node in {USER_DATA_DIR}")
    
#     # Ensure directory exists
#     os.makedirs(USER_DATA_DIR, exist_ok=True)
    
#     state["playwright"] = await async_playwright().start()
    
#     # launch_persistent_context is the "Tank" of Playwright - it saves everything
#     state["context"] = await state["playwright"].chromium.launch_persistent_context(
#         user_data_dir=USER_DATA_DIR,
#         headless=False, # Set to True once logged in
#         args=["--no-sandbox", "--disable-dev-shm-usage"],
#         viewport={'width': 375, 'height': 812},
#         geolocation={'latitude': LATITUDE, 'longitude': LONGITUDE},
#         permissions=['geolocation']
#     )
    
#     # Persistent contexts usually start with one page open
#     if state["context"].pages:
#         state["page"] = state["context"].pages[0]
#     else:
#         state["page"] = await state["context"].new_page()
        
#     await state["page"].goto("https://tinder.com")
#     print("[*] Dashboard Link: http://localhost:5001")
    
#     yield # Server stays alive here
    
#     # Shutdown logic removed to prevent "Connection Closed" errors
#     print("[*] Kill the terminal to close the browser.")

# app = FastAPI(lifespan=lifespan)

# @app.get("/", response_class=HTMLResponse)
# async def dashboard():
#     return """
#     <html>
#         <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
#         <body style="background:#000; color:#fff; text-align:center; font-family:sans-serif; margin:0; padding:20px;">
#             <h2 style="color:#ff4458;">Tinder Cloud Control</h2>
#             <img id="view" src="/screenshot" style="width:100%; max-width:400px; border:3px solid #333; border-radius:15px;">
#             <div style="margin-top:20px;">
#                 <button onclick="act('pass')" style="padding:20px; background:#ff4458; color:white; border:none; border-radius:10px; width:45%; font-size:20px; font-weight:bold;">PASS</button>
#                 <button onclick="act('like')" style="padding:20px; background:#1ec86e; color:white; border:none; border-radius:10px; width:45%; font-size:20px; font-weight:bold;">LIKE</button>
#             </div>
#             <script>
#                 setInterval(() => { document.getElementById('view').src = '/screenshot?' + Date.now(); }, 1000);
#                 function act(a) { fetch('/action/' + a, {method:'POST'}); }
#             </script>
#         </body>
#     </html>
#     """

# @app.get("/screenshot")
# async def screenshot():
#     if not state["page"]: return b""
#     try:
#         # 70% quality keeps the tunnel fast
#         img = await state["page"].screenshot(type="jpeg", quality=70)
#         return StreamingResponse(io.BytesIO(img), media_type="image/jpeg")
#     except:
#         return b""

# @app.post("/action/{type}")
# async def action(type: str):
#     if not state["page"]: return {"error": "Page missing"}
#     # Use keyboard keys - much more reliable than clicking
#     key = "ArrowRight" if type == "like" else "ArrowLeft"
#     await state["page"].keyboard.press(key)
#     return {"status": "ok"}

# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=PORT)