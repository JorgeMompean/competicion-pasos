from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
SRC = ROOT / "src"


def copy_page(source: Path, destination: Path, asset_prefix: str) -> None:
    html = source.read_text(encoding="utf-8")
    html = html.replace('href="../css/style.css"', f'href="{asset_prefix}css/style.css"')
    html = html.replace('src="../js/main.js"', f'src="{asset_prefix}js/main.js"')
    html = html.replace('content="../assets/favicon.svg"', f'content="{asset_prefix}assets/favicon.svg"')
    html = html.replace('href="../assets/favicon.svg"', f'href="{asset_prefix}assets/favicon.svg"')
    html = html.replace('href="../../site.webmanifest"', f'href="{asset_prefix}site.webmanifest"')
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(html, encoding="utf-8")


def main() -> None:
    (DIST / "css").mkdir(parents=True, exist_ok=True)
    (DIST / "js").mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC / "css/style.css", DIST / "css/style.css")
    shutil.copy2(SRC / "js/main.js", DIST / "js/main.js")
    shutil.copy2(SRC / "js/firebase-config.js", DIST / "js/firebase-config.js")
    (DIST / "assets").mkdir(parents=True, exist_ok=True)
    shutil.copy2(SRC / "assets/favicon.svg", DIST / "assets/favicon.svg")
    manifest = (ROOT / "site.webmanifest").read_text(encoding="utf-8")
    manifest = manifest.replace('"src/assets/favicon.svg"', '"assets/favicon.svg"')
    (DIST / "site.webmanifest").write_text(manifest, encoding="utf-8")
    (DIST / ".nojekyll").touch()

    copy_page(SRC / "pages/home.html", DIST / "index.html", "")


if __name__ == "__main__":
    main()