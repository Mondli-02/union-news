/* =========================================================
   Union Blog — loader, feed, sidebar, article, PDF download
   ========================================================= */

const ARTICLES_INDEX_URL = 'articles/index.json';
const FEED_NODE_ID = 'feed';
const SIDEBAR_LIST_ID = 'articleSidebarList';
const PAGE_SIZE = 6;

// Utility: read query param
function q(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

// Utility: format date (YYYY-MM-DD → 15 Aug 2025)
function prettyDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  } catch { return iso; }
}

// Fetch JSON helper
async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${url}`);
  return await res.json();
}

/* -------------------------
   FEED (index.html)
--------------------------*/
async function bootFeed() {
  const feed = document.getElementById(FEED_NODE_ID);
  if (!feed) return;

  const searchInput = document.getElementById('searchInput');
  const categorySelect = document.getElementById('categorySelect');
  const pager = document.getElementById('pager');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  const sidebarList = document.getElementById(SIDEBAR_LIST_ID);

  let all;
  try {
    all = (await getJSON(ARTICLES_INDEX_URL)).articles || [];
  } catch(e) {
    feed.innerHTML = `<div class="error">Failed to load articles. Please try again later.</div>`;
    return;
  }
  // newest first
  all.sort((a,b)=> new Date(b.date) - new Date(a.date));

  // Sidebar: show top 4 articles (latest)
  if (sidebarList) {
    sidebarList.innerHTML = all.slice(0, 4).map(a =>
      `<li><a href="article.html?id=${encodeURIComponent(a.id)}">${a.title}</a></li>`
    ).join('');
  }

  let filtered = [...all];
  let page = 1;

  function applyFilter() {
    const term = (searchInput.value || '').toLowerCase().trim();
    const cat = categorySelect.value;
    filtered = all.filter(a => {
      const matchesText = !term ||
        a.title.toLowerCase().includes(term) ||
        (a.excerpt && a.excerpt.toLowerCase().includes(term)) ||
        (a.tags || []).join(' ').toLowerCase().includes(term);
      const matchesCat = !cat || a.category === cat;
      return matchesText && matchesCat;
    });
    page = 1;
    render();
  }

  function render() {
    const start = (page-1)*PAGE_SIZE;
    const pageItems = filtered.slice(start, start+PAGE_SIZE);

    feed.innerHTML = pageItems.map(a => `
      <article class="card">
        <div class="meta">${prettyDate(a.date)} • ${a.category}</div>
        <div class="author">${a.author ? 'By ' + a.author : ''}</div>
        <h2>${a.title}</h2>
        <p>${a.excerpt || ''}</p>
        <a class="more" href="article.html?id=${encodeURIComponent(a.id)}">
          <i class="fa fa-arrow-right"></i> Read article
        </a>
      </article>
    `).join('');

    // pager
    if (filtered.length > PAGE_SIZE) {
      pager.hidden = false;
      const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
      prevBtn.disabled = page <= 1;
      nextBtn.disabled = page >= totalPages;
      pageInfo.textContent = `Page ${page} of ${totalPages}`;
    } else {
      pager.hidden = true;
    }
  }

  // events
  searchInput.addEventListener('input', applyFilter);
  categorySelect.addEventListener('change', applyFilter);
  prevBtn?.addEventListener('click', ()=> { page = Math.max(1, page-1); render(); });
  nextBtn?.addEventListener('click', ()=> {
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    page = Math.min(totalPages, page+1); render();
  });

  render();
}

/* -------------------------
   ARTICLE (article.html)
--------------------------*/
async function bootArticle() {
  const titleEl = document.getElementById('title');
  if (!titleEl) return; // not on article page

  const id = q('id');
  if (!id) {
    titleEl.textContent = 'Article not found';
    return;
  }

  let data;
  try {
    data = await getJSON(`articles/${id}.json`);
  } catch (e) {
    titleEl.textContent = 'Failed to load article.';
    return;
  }

  // Fill meta + content
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle) pageTitle.textContent = `${data.title} • Union News & Guides`;
  titleEl.textContent = data.title;
  const dateEl = document.getElementById('date');
  if (dateEl) {
    dateEl.textContent = prettyDate(data.date);
    dateEl.setAttribute('datetime', data.date);
  }
  const categoryEl = document.getElementById('category');
  if (categoryEl) categoryEl.textContent = data.category;

  // Cover image (optional)
  if (data.cover && data.cover.src) {
    const cw = document.getElementById('coverWrap');
    const img = document.getElementById('coverImage');
    const cap = document.getElementById('coverCaption');
    if (img && cap && cw) {
      img.src = data.cover.src;
      img.alt = data.cover.alt || '';
      cap.textContent = data.cover.caption || '';
      cw.hidden = false;
    }
  }

  // Article content: supports paragraphs, headings, lists (basic & safe)
  const contentNode = document.getElementById('content');
  if (contentNode) {
    contentNode.innerHTML = data.blocks.map(block => {
      switch(block.type){
        case 'h2': return `<h2>${escapeHTML(block.text)}</h2>`;
        case 'p':  return `<p>${escapeHTML(block.text)}</p>`;
        case 'ul': return `<ul>${block.items.map(li=>`<li>${escapeHTML(li)}</li>`).join('')}</ul>`;
        case 'ol': return `<ol>${block.items.map(li=>`<li>${escapeHTML(li)}</li>`).join('')}</ol>`;
        case 'quote': return `<blockquote>${escapeHTML(block.text)}</blockquote>`;
        default: return '';
      }
    }).join('');
  }

  // Article actions
  const actions = document.getElementById('articleActions');
  if (actions) {
    // If this article has a PDF, offer PDF download, else show disabled
    if (data.pdf) {
      actions.innerHTML = `
        <a class="pdf-download" id="downloadPdfBtn" aria-label="Download Article as PDF" href="${data.pdf}" download>
          <i class="fa fa-download"></i> Download Article
        </a>
        <a class="wa-signup" target="_blank" rel="noopener"
          href="https://wa.me/263777217619?text=Hey%20Mondli%2C%20I%20would%20like%20to%20receive%20article%20updates."
          aria-label="Sign Up for WhatsApp Updates">
          <i class="fab fa-whatsapp"></i> Sign Up for WhatsApp Updates
        </a>
      `;
    } else {
      actions.innerHTML = `
        <button class="pdf-download" id="downloadPdfBtn" aria-disabled="true" disabled>
          <i class="fa fa-download"></i> PDF Not Available
        </button>
        <a class="wa-signup" target="_blank" rel="noopener"
          href="https://wa.me/263777217619?text=Hey%20Mondli%2C%20I%20would%20like%20to%20receive%20article%20updates."
          aria-label="Sign Up for WhatsApp Updates">
          <i class="fab fa-whatsapp"></i> Sign Up for WhatsApp Updates
        </a>
      `;
    }
  }

  // Share (WhatsApp)
  const wa = document.getElementById('shareWhatsApp');
  if (wa) {
    const url = location.href;
    wa.href = `https://wa.me/?text=${encodeURIComponent(data.title + ' — ' + url)}`;
  }
}

// Basic HTML escaper for JSON-driven content
function escapeHTML(s=''){
  return s.replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}

bootFeed();
bootArticle();