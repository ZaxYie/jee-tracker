from pathlib import Path
import json

from flask import Flask, jsonify, render_template

BASE_DIR = Path(__file__).resolve().parent
CHAPTER_FILE = BASE_DIR / "data" / "chapter.json"

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/chapters")
def get_chapters():
    with CHAPTER_FILE.open("r", encoding="utf-8") as file:
        return jsonify(json.load(file))


if __name__ == "__main__":
    app.run(debug=True)