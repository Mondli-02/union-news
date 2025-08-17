# Union Blog & Resource Site

This project is a static, modern web platform for publishing union news, legal guides, meeting recaps, and downloadable resources. Articles are stored as JSON files and displayed dynamically. Each article can have an associated PDF for professional-quality downloads and a cover image for rich presentation.

## Features

- **Fast, static site** — no backend required, easily deployable to Netlify, GitHub Pages, Vercel, etc.
- **Articles as JSON** — secure, lightweight, and easy to edit or script.
- **Downloadable PDFs** — each article can have a high-quality, pre-made PDF for offline use or printing.
- **Cover images** — optional, for visual appeal and branding.
- **Search & filter** — users can search articles by text or category.
- **Responsive design** — works on desktop and mobile.
- **Easy content updates** — just drop in new JSON and PDF files.

## Project Structure

```
/
├── index.html              # Main article feed
├── article.html            # Individual article page
├── js/
│   └── script.js           # Main JavaScript logic
├── articles/
│   ├── index.json          # List of all articles (for feed & search)
│   ├── [article-id].json   # One JSON file per article
│   └── pdfs/
│       └── [article-id].pdf  # Pre-made PDFs for downloads
├── images/
│   └── ...                 # Optional cover images, logo, etc.
├── styles/
│   └── style.css           # Main stylesheet
└── README.md               # This file
```

## Article JSON Format

Each article is a `.json` file with the following structure:

```json
{
  "title": "Article Title",
  "id": "unique-article-id",
  "date": "YYYY-MM-DD",
  "category": "News & Updates",
  "author": "Author Name",
  "pdf": "articles/pdfs/unique-article-id.pdf",      // Optional
  "cover": {                                        // Optional
    "src": "images/cover.jpg",
    "alt": "Cover description",
    "caption": "Optional caption"
  },
  "blocks": [
    { "type": "h2", "text": "Section Heading" },
    { "type": "p", "text": "Paragraph text." },
    { "type": "ul", "items": ["Item 1", "Item 2"] },
    { "type": "ol", "items": ["Step 1", "Step 2"] },
    { "type": "quote", "text": "A cited statement." }
  ]
}
```

- The `pdf` field should contain the relative path to the article's PDF file.
- The `cover` object is optional.

## Adding Articles

1. **Write your article** as a Word document (`.docx`), using proper styles for headings, lists, and quotes.
2. **Convert to JSON** using the provided Python script (`word_to_json.py`), which prompts you for metadata, PDF path, and cover image.
3. **Create a PDF** of the article and save it in `articles/pdfs/` with the correct filename.
4. **Add a cover image** to `images/` and reference it in the JSON if desired.
5. **Update `articles/index.json`** to include the new article’s metadata (the script provides a ready-to-copy snippet).

## Running Locally

You can open `index.html` and `article.html` directly in a browser, but for best results (and to ensure all fetches work), use a local server:

- With Python 3:
  ```
  python -m http.server
  ```
- Then visit [http://localhost:8000](http://localhost:8000) in your browser.

## Deployment

Just upload the whole folder (with all JSON, PDFs, images, HTML, JS, and CSS) to your static hosting provider.
No server-side code is required.

## Customization

- **Add new categories** by using new values in the `category` field.
- **Style the site** by editing `styles/style.css`.
- **Enhance functionality** in `js/script.js`.

## Credits

- Project maintained by [Mondliwethu Moyo].
- Python conversion script by [Mondliwethu Moyo].
- Icons: [FontAwesome](https://fontawesome.com/).

---

**Questions or suggestions?**  
Open an issue or contact the project maintainer.
