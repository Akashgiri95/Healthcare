"""Quick diagnostic: show OCR output + parsed rows for a given PDF/image."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

if len(sys.argv) < 2:
    print("Usage: python debug_ocr.py <path_to_pdf_or_image>")
    sys.exit(1)

path = sys.argv[1]

from ocr_engine import pdf_to_images, extract_text_from_image, bytes_to_image
from row_parser import parse_lab_rows
from pathlib import Path

p = Path(path)
if not p.exists():
    print(f"File not found: {path}")
    sys.exit(1)

if p.suffix.lower() == ".pdf":
    pages = pdf_to_images(path)
    print(f"[PDF] {len(pages)} pages")
    all_text = []
    for pg, img in pages:
        text, eng = extract_text_from_image(img)
        print(f"\n=== Page {pg} [{eng}] ===")
        print(text[:1000] if text else "(no text)")
        all_text.append(text)
    raw_text = "\n".join(all_text)
else:
    from PIL import Image
    img = Image.open(path)
    raw_text, eng = extract_text_from_image(img)
    print(f"[Image/{eng}]")
    print(raw_text[:1000])

print("\n\n=== PARSED ROWS ===")
rows = parse_lab_rows(raw_text)
print(f"Total rows found: {len(rows)}")
for r in rows:
    print(f"  {r.test_name!r:40s} val={r.value!r:10s} unit={r.unit!r:10s} ref={r.ref_range!r}")
