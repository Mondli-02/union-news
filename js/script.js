/* =========================================================
   Union Blog — loader, feed, sidebar, article, PDF export
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

  let all = (await getJSON(ARTICLES_INDEX_URL)).articles || [];
  // newest first
  all.sort((a,b)=> new Date(b.date) - new Date(a.date));

  // Sidebar: show top 10 articles (latest)
  if (sidebarList) {
    sidebarList.innerHTML = all.slice(0, 10).map(a =>
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

  const data = await getJSON(`articles/${id}.json`);

  // Fill meta + content
  document.getElementById('pageTitle').textContent = `${data.title} • Union News & Guides`;
  titleEl.textContent = data.title;
  const dateEl = document.getElementById('date');
  dateEl.textContent = prettyDate(data.date);
  dateEl.setAttribute('datetime', data.date);
  document.getElementById('category').textContent = data.category;

  // Cover image (optional)
  if (data.cover && data.cover.src) {
    const cw = document.getElementById('coverWrap');
    const img = document.getElementById('coverImage');
    const cap = document.getElementById('coverCaption');
    img.src = data.cover.src;
    img.alt = data.cover.alt || '';
    cap.textContent = data.cover.caption || '';
    cw.hidden = false;
  }

  // Article content: supports paragraphs, headings, lists (basic & safe)
  const contentNode = document.getElementById('content');
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

  // Article actions
  const actions = document.getElementById('articleActions');
  if (actions) {
    actions.innerHTML = `
      <button class="pdf-download" id="downloadPdfBtn"><i class="fa fa-download"></i> Download Article</button>
      <a class="wa-signup" target="_blank" rel="noopener"
        href="https://wa.me/263777217619?text=Hey%20Mondli%2C%20I%20would%20like%20to%20receive%20article%20updates.">
        <i class="fab fa-whatsapp"></i> Sign Up for WhatsApp Updates
      </a>
    `;
  }

  // Share (WhatsApp)
  const wa = document.getElementById('shareWhatsApp');
  const url = location.href;
  wa.href = `https://wa.me/?text=${encodeURIComponent(data.title + ' — ' + url)}`;

  // PDF Download
  document.getElementById('downloadPdfBtn').addEventListener('click', () => downloadAsPDF(data));
}

// Basic HTML escaper for JSON-driven content
function escapeHTML(s=''){
  return s.replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[m]));
}

/* -------------------------
   PDF generation (jsPDF)
--------------------------*/

// Dynamically load jsPDF if not present
async function loadJsPdf() {
  if (window.jspdf && window.jspdf.jsPDF) {
    return window.jspdf.jsPDF;
  }
  // Try loading from CDN dynamically
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      if (window.jspdf && window.jspdf.jsPDF) {
        resolve(window.jspdf.jsPDF);
      } else {
        reject(new Error('jsPDF failed to load.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load jsPDF library from CDN.'));
    document.head.appendChild(script);
  });
}

async function downloadAsPDF(data){
  let jsPDF;
  try {
    jsPDF = await loadJsPdf();
  } catch (e) {
    alert('PDF library failed to load. Please try again.');
    return;
  }

  const doc = new jsPDF({ unit:'pt', format:'a4' });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const maxWidth = pageWidth - margin*2;

  // Header: Union News & Updates + Article Title
  doc.setFont('helvetica','bold');
  doc.setFontSize(15);
  doc.text('Union News & Updates', margin, 44, { maxWidth });
  doc.setFont('helvetica','bold');
  doc.setFontSize(18);
  doc.text(data.title, margin, 68, { maxWidth });

  // Meta info
  doc.setFont('helvetica','normal');
  doc.setFontSize(12);
  let metaY = 88;
  if (data.author) {
    doc.text(`By ${data.author}`, margin, metaY, { maxWidth });
    metaY += 16;
  }
  doc.text(`Published on: ${prettyDate(data.date)}`, margin, metaY, { maxWidth });
  metaY += 16;
  doc.text(`Category: ${data.category}`, margin, metaY, { maxWidth });

  // Separator line
  doc.setLineWidth(0.5);
  doc.line(margin, metaY+10, pageWidth - margin, metaY+10);

  // Article content
  let y = metaY+32;
  const lineGap = 16;

  function addTextBlock(txt, size=12, bold=false, italic=false) {
    doc.setFont('helvetica', italic ? 'italic' : (bold ? 'bold' : 'normal'));
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(txt, maxWidth);
    lines.forEach(line => {
      if (y > pageHeight - 70) {
        addFooter();
        doc.addPage();
        y = 64;
        addHeader();
      }
      doc.text(line, margin, y);
      y += lineGap;
    });
    y += 4;
  }

  function addHeader() {
    doc.setFont('helvetica','bold');
    doc.setFontSize(12);
    doc.text('Union News & Updates', margin, 36, { maxWidth });
    doc.setFontSize(15);
    doc.text(data.title, margin, 54, { maxWidth });
    y = 76;
  }

  function addFooter() {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFont('helvetica','italic');
    doc.setFontSize(10);
    doc.text(
      `Page ${pageCount} of {totalPages}`,
      margin, pageHeight - 20
    );
    doc.text("© Workers Union - All Rights Reserved", margin, pageHeight - 8);
  }

  data.blocks.forEach(b=>{
    if (b.type === 'h2') {
      addTextBlock(b.text, 14, true);
    } else if (b.type === 'p') {
      addTextBlock(b.text, 12, false);
    } else if (b.type === 'ul' || b.type === 'ol') {
      (b.items || []).forEach((it, idx)=>{
        const bullet = b.type === 'ol' ? `${idx+1}. ` : '• ';
        addTextBlock(bullet + it, 12);
      });
    } else if (b.type === 'quote') {
      addTextBlock(`“${b.text}”`, 12, false, true);
    }
  });

  // Add final footer and update page numbers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica','italic');
    doc.setFontSize(10);
    doc.text(
      `Page ${i} of ${totalPages}`,
      margin, pageHeight - 20
    );
    doc.text("© Workers Union - All Rights Reserved", margin, pageHeight - 8);
  }

  // Save file
  const safeTitle = (data.title || 'article').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
  doc.save(`${safeTitle}.pdf`);
}

// Boot
bootFeed();
bootArticle();