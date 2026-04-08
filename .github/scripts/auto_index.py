#!/usr/bin/env python3
"""
auto_index.py — scans each section folder for new HTML files and adds a card
to that section's index.html automatically.

Rules:
- Ignores index.html itself
- Ignores files already linked (href="filename.html") in the index
- Inserts a new card before the <!-- AUTO-INDEX-END --> marker
- Extracts <title> from the new file for the card title
- Uses today's date (MMM D format) as the card date
"""

import os, re, sys
from datetime import date
from html.parser import HTMLParser

REPO = os.environ.get("REPO_ROOT", os.path.join(os.path.dirname(__file__), "../.."))

SECTIONS = {
    "anatomy":      {"label": "Anatomy",      "color": "#f97316", "icon": "🦴"},
    "microbiology": {"label": "Microbiology",  "color": "#22c55e", "icon": "🔬"},
    "hebrew":       {"label": "Hebrew",        "color": "#a78bfa", "icon": "🔤"},
    "italian":      {"label": "Italian",       "color": "#5b8fd9", "icon": "🇮🇹"},
}

TODAY = date.today().strftime("%-m/%d").lstrip("0")  # e.g. "4/8"
TODAY_SHORT = date.today().strftime("%b %-d")         # e.g. "Apr 8"

MARKER = "<!-- AUTO-INDEX-END -->"


class TitleParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self._in_title = False
        self.title = ""

    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self._in_title = True

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data


def extract_title(filepath):
    """Return cleaned page title, stripping site suffix."""
    try:
        with open(filepath, encoding="utf-8") as f:
            content = f.read(4096)  # only need the head
        p = TitleParser()
        p.feed(content)
        t = p.title.strip()
        # Strip common site suffixes
        for suffix in [" — Study Hub", " — MedStudy", " | Study Hub"]:
            if t.endswith(suffix):
                t = t[: -len(suffix)]
        return t or os.path.splitext(os.path.basename(filepath))[0].replace("_", " ").title()
    except Exception:
        return os.path.splitext(os.path.basename(filepath))[0].replace("_", " ").title()


def make_card(filename, title, icon):
    return (
        f'<a class="card" href="{filename}" data-auto="true">\n'
        f'  <div class="card-top">\n'
        f'    <div class="card-icon">{icon}</div>\n'
        f'    <span class="badge badge-new">New</span>&nbsp;'
        f'<span class="idate">{TODAY_SHORT}</span>\n'
        f'  </div>\n'
        f'  <div class="card-title">{title}</div>\n'
        f'  <div class="card-sub">Added {TODAY_SHORT}</div>\n'
        f'</a>'
    )


def ensure_marker(index_path):
    """Make sure the AUTO-INDEX-END marker exists in the file."""
    with open(index_path, encoding="utf-8") as f:
        content = f.read()
    if MARKER in content:
        return content
    # Insert marker just before </div>\n</main>
    # Find the last tool-grid closing </div> before </main>
    new_content = content.replace("</div>\n</main>", f"  {MARKER}\n</div>\n</main>", 1)
    if new_content == content:
        # Fallback: insert before </main>
        new_content = content.replace("</main>", f"  {MARKER}\n</main>", 1)
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    return new_content


def process_section(section_name, meta):
    section_dir = os.path.join(REPO, section_name)
    index_path  = os.path.join(section_dir, "index.html")

    if not os.path.isdir(section_dir) or not os.path.isfile(index_path):
        return

    content = ensure_marker(index_path)

    # Find all HTML files in this section (not index.html)
    html_files = sorted(
        f for f in os.listdir(section_dir)
        if f.endswith(".html") and f != "index.html"
    )

    new_cards = []
    for fname in html_files:
        # Check if already linked
        if f'href="{fname}"' in content:
            continue
        fpath = os.path.join(section_dir, fname)
        title = extract_title(fpath)
        card  = make_card(fname, title, meta["icon"])
        new_cards.append(card)
        print(f"  ➕ {section_name}/{fname}  →  \"{title}\"")

    if not new_cards:
        print(f"  ✓ {section_name}: nothing new")
        return

    # Insert cards before the marker
    insertion = "\n".join(new_cards) + "\n  " + MARKER
    content = content.replace(MARKER, insertion, 1)

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(content)


def main():
    changed = False
    for section, meta in SECTIONS.items():
        process_section(section, meta)

    # Also update sw.js to include any new files
    update_sw()


def update_sw():
    """Add any new HTML files from section folders to the SW cache list."""
    sw_path = os.path.join(REPO, "sw.js")
    if not os.path.isfile(sw_path):
        return

    with open(sw_path, encoding="utf-8") as f:
        sw = f.read()

    all_html = []
    for section in SECTIONS:
        section_dir = os.path.join(REPO, section)
        if not os.path.isdir(section_dir):
            continue
        for fname in os.listdir(section_dir):
            if fname.endswith(".html"):
                all_html.append(f"./{section}/{fname}")

    added = []
    for path in sorted(all_html):
        # Check if already in sw.js
        if f"'{path}'" not in sw and f'"{path}"' not in sw:
            added.append(path)

    if not added:
        print("  ✓ sw.js: nothing new")
        return

    # Bump cache version
    sw = re.sub(
        r"const CACHE = 'medstudy-v(\d+)'",
        lambda m: f"const CACHE = 'medstudy-v{int(m.group(1)) + 1}'",
        sw
    )

    # Add paths to URLS array before the closing ];
    new_lines = "\n".join(f"  '{p}'," for p in added)
    sw = sw.replace("];\n", f"  {new_lines}\n];\n", 1)

    with open(sw_path, "w", encoding="utf-8") as f:
        f.write(sw)

    for p in added:
        print(f"  ➕ sw.js: added {p}")


if __name__ == "__main__":
    main()
