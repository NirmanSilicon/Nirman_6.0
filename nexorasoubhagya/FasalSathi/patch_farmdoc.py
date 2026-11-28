from pathlib import Path
import re
import shutil

root = Path.cwd()
main = root / "main.py"
html = root / "static" / "index.html"
js = root / "farmdoc" / "frontend" / "script.js"

backup = root / "integration-backup"
backup.mkdir(exist_ok=True)

for f in (main, html, js):
    shutil.copy2(f, backup / f.name)

# 1. Mount FarmDoc frontend in the main FasalSathi FastAPI app
text = main.read_text(encoding="utf-8")

mount_line = 'app.mount("/farmdoc", StaticFiles(directory="farmdoc/frontend", html=True), name="farmdoc")'

if mount_line not in text:
    anchor = 'app.mount("/js", StaticFiles(directory="static/js"), name="js")'
    if anchor not in text:
        raise RuntimeError("Could not find main.py static mount anchor.")
    text = text.replace(anchor, anchor + "\n" + mount_line, 1)

main.write_text(text, encoding="utf-8")

# 2. Make the Crop Doctor page show FarmDoc inside FasalSathi
text = html.read_text(encoding="utf-8")

farmdoc_page = '''<div id="page-scan" class="ws-page" style="display:none;">
          <div class="card" style="padding:0; overflow:hidden;">
            <iframe
              src="/farmdoc/"
              title="FarmDoc AI Crop Doctor"
              style="width:100%; height:850px; border:0; display:block; background:white;"
              loading="lazy">
            </iframe>
          </div>
        </div>

        '''

pattern = r'<div id="page-scan" class="ws-page" style="display:none;">.*?(?=<div id="page-explore")'
text, count = re.subn(pattern, farmdoc_page, text, count=1, flags=re.S)

if count != 1:
    raise RuntimeError("Could not replace Crop Doctor page safely.")

html.write_text(text, encoding="utf-8")

# 3. Keep FarmDoc frontend, point its API at its backend port
text = js.read_text(encoding="utf-8")
text = text.replace(
    "http://127.0.0.1:8002/analyze",
    "http://127.0.0.1:8002/analyze"
)
js.write_text(text, encoding="utf-8")

print("PATCH COMPLETE")
print("Backups saved in integration-backup")
print("FarmDoc frontend mounted at /farmdoc/")
print("Crop Doctor page now embeds FarmDoc.")
print("FarmDoc analysis API remains on port 8002.")
