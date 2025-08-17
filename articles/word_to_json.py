import json
import sys
import os
from datetime import datetime
from docx import Document

ARTICLES_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_FILE = os.path.join(ARTICLES_DIR, "index.json")

def prompt_metadata():
    print("\nEnter article metadata (leave blank for defaults where allowed):")
    title = input("Title: ").strip()
    while not title:
        title = input("Title (required): ").strip()
    article_id = input("ID (unique, for filename/link, e.g. descriptive-title): ").strip()
    while not article_id:
        article_id = input("ID (required): ").strip()
    today = datetime.today().strftime('%Y-%m-%d')
    date = input(f"Date [YYYY-MM-DD] (default {today}): ").strip() or today
    category = input("Category (e.g. News & Updates, Tutorials & Guides, Legal Corner, Opinion & Advocacy): ").strip()
    while not category:
        category = input("Category (required): ").strip()
    author = input("Author: ").strip()
    while not author:
        author = input("Author (required): ").strip()
    excerpt = input("Short excerpt for index.json: ").strip()
    while not excerpt:
        excerpt = input("Excerpt (required): ").strip()
    tag_prompt = input("Any tags? (comma-separated, or leave blank): ").strip()
    tags = [t.strip() for t in tag_prompt.split(',')] if tag_prompt else []
    pdf_path = input("PDF path/URL (leave blank if none): ").strip()
    cover_path = input("Cover image path/URL (leave blank if none): ").strip()
    cover_alt = ""
    cover_caption = ""
    if cover_path:
        cover_alt = input("Cover image alt text (optional): ").strip()
        cover_caption = input("Cover image caption (optional): ").strip()
    return title, article_id, date, category, author, excerpt, tags, pdf_path, cover_path, cover_alt, cover_caption

def parse_docx(filename):
    doc = Document(filename)
    blocks = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if not text:
            continue
        style = para.style.name.lower()
        if style.startswith('heading') and '1' not in style:
            blocks.append({"type": "h2", "text": text})
        elif style.startswith('list bullet'):
            if blocks and blocks[-1]['type'] == 'ul':
                blocks[-1]['items'].append(text)
            else:
                blocks.append({"type": "ul", "items": [text]})
        elif style.startswith('list number'):
            if blocks and blocks[-1]['type'] == 'ol':
                blocks[-1]['items'].append(text)
            else:
                blocks.append({"type": "ol", "items": [text]})
        elif 'quote' in style:
            blocks.append({"type": "quote", "text": text})
        else:
            blocks.append({"type": "p", "text": text})
    return blocks

def update_index_json(index_path, new_entry):
    # Ensure index.json exists and has 'articles': []
    try:
        if os.path.exists(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                index = json.load(f)
            if "articles" not in index or not isinstance(index["articles"], list):
                index["articles"] = []
        else:
            index = {"articles": []}
    except Exception as e:
        print(f"Error reading index.json; starting new: {e}")
        index = {"articles": []}
    # Remove any existing with same id
    index["articles"] = [a for a in index["articles"] if a.get("id") != new_entry["id"]]
    # Add new entry at top
    index["articles"].insert(0, new_entry)
    # Save
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    print(f"index.json updated with new article.")

def main():
    if len(sys.argv) < 2:
        print("Usage: python word_to_json.py article.docx")
        return
    filename = sys.argv[1]
    try:
        blocks = parse_docx(filename)
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return
    (title, article_id, date, category, author, excerpt, tags,
     pdf_path, cover_path, cover_alt, cover_caption) = prompt_metadata()
    article = {
        "title": title,
        "id": article_id,
        "date": date,
        "category": category,
        "author": author,
        "blocks": blocks
    }
    if pdf_path:
        article["pdf"] = pdf_path
    if cover_path:
        article["cover"] = {
            "src": cover_path,
            "alt": cover_alt,
            "caption": cover_caption
        }
    # Save article JSON
    outname = os.path.join(ARTICLES_DIR, f"{article_id}.json")
    try:
        with open(outname, 'w', encoding='utf-8') as f:
            json.dump(article, f, indent=2, ensure_ascii=False)
        print(f"Article JSON saved as: {outname}")
    except Exception as e:
        print(f"Error writing {outname}: {e}")
        return
    # Prepare index snippet
    index_snippet = {
        "id": article_id,
        "title": title,
        "date": date,
        "category": category,
        "tags": tags,
        "excerpt": excerpt,
        "author": author
    }
    if pdf_path:
        index_snippet["pdf"] = pdf_path
    if cover_path:
        index_snippet["cover"] = {
            "src": cover_path,
            "alt": cover_alt,
            "caption": cover_caption
        }
    # Update index.json
    update_index_json(INDEX_FILE, index_snippet)
    print("Done! Your article and index.json are now updated.")

if __name__ == '__main__':
    main()