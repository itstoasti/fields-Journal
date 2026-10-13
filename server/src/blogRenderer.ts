import { BlogPost } from './db.js';

// Safe slugifier
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

// Lightweight, robust Markdown to HTML converter
export function markdownToHtml(md: string): string {
  if (!md) return '';

  let html = md.trim();

  // Strip leading H1 title if present to avoid duplicating the article header H1
  html = html.replace(/^#\s+[^\r\n]+(?:\r?\n)+/, '');

  // Escape basic HTML inside code blocks
  const codeBlocks: string[] = [];
  html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/g, (_match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    codeBlocks.push(`<pre class="code-block" data-lang="${lang || 'text'}"><code>${escaped}</code></pre>`);
    return placeholder;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Images with figure & captions
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    return `<figure class="blog-figure">
      <img src="${url}" alt="${alt || 'Travel scrapbook illustration'}" loading="lazy" class="blog-img" />
      ${alt ? `<figcaption class="blog-caption">${alt}</figcaption>` : ''}
    </figure>`;
  });

  // Callout blocks ::: note or ::: tip
  html = html.replace(/:::\s*(tip|note|quote|warning)\n([\s\S]*?):::/g, (_match, type, content) => {
    return `<div class="callout callout-${type}">
      <span class="callout-badge">${type.toUpperCase()}</span>
      <div class="callout-body">${content.trim()}</div>
    </div>`;
  });

  // Headings H2 to H4 with slug IDs (demote any inner H1 to H2 to ensure single H1 per page)
  html = html.replace(/^####\s+(.+)$/gm, (_match, title) => `<h4 id="${slugify(title)}">${title}</h4>`);
  html = html.replace(/^###\s+(.+)$/gm, (_match, title) => `<h3 id="${slugify(title)}">${title}</h3>`);
  html = html.replace(/^##\s+(.+)$/gm, (_match, title) => `<h2 id="${slugify(title)}">${title}</h2>`);
  html = html.replace(/^#\s+(.+)$/gm, (_match, title) => `<h2 id="${slugify(title)}">${title}</h2>`);

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="blog-quote"><p>$1</p></blockquote>');

  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text, url) => {
    const isInternal = url.startsWith('/') || url.includes('travel-scrapbook.com');
    if (isInternal) {
      return `<a href="${url}" class="blog-link internal-link">${text}</a>`;
    }
    return `<a href="${url}" class="blog-link external-link" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  // Unordered lists
  html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<li class="blog-list-item">$1</li>');
  html = html.replace(/(<li class="blog-list-item">[\s\S]*?<\/li>)(?!\s*<li class="blog-list-item">)/g, '<ul class="blog-list">$1</ul>');

  // Paragraphs
  const blocks = html.split(/\n\s*\n/);
  html = blocks.map(b => {
    const trimmed = b.trim();
    if (!trimmed) return '';
    if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('<div') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<figure') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('__CODE_BLOCK_')
    ) {
      return trimmed;
    }
    return `<p class="blog-para">${trimmed.replace(/\n/g, '<br />')}</p>`;
  }).filter(Boolean).join('\n\n');

  // Restore code blocks
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, block);
  });

  return html;
}

// Base CSS Styles for the Blog (Vintage travel journal aesthetic)
const BASE_BLOG_STYLES = `
  :root {
    --bg: #F5EFEB;
    --bg-cream: #FAF6F0;
    --paper: #FAF8F5;
    --card-bg: #FFFFFF;
    --charcoal: #1C1917;
    --ink-dark: #292524;
    --ink-muted: #665E55;
    --ink-subtle: #9E9484;
    --border: #D8CEBE;
    --border-dark: #1C1917;
    --brick: #B9381E;
    --brick-light: #FBF0ED;
    --emerald: #23533E;
    --ochre: #B87A24;
    --cobalt: #1E468F;
    --tape: rgba(224, 213, 191, 0.75);
    --radius: 8px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html {
    scroll-behavior: smooth;
    color-scheme: light;
  }

  body {
    background-color: var(--bg);
    background-image: 
      radial-gradient(#1C1917 0.45px, transparent 0.45px),
      linear-gradient(to bottom, rgba(245, 239, 235, 0.85), rgba(245, 239, 235, 0.98));
    background-size: 24px 24px, 100% 100%;
    color: var(--charcoal);
    font-family: 'Space Mono', Courier, monospace;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  a { color: inherit; text-decoration: none; }

  /* Top Utility Announcement Bar */
  .top-bar {
    border-bottom: 1px solid var(--border);
    background: rgba(245, 239, 235, 0.92);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 9px 20px;
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    font-family: 'Space Mono', Courier, monospace;
  }

  .top-bar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .top-dot {
    width: 7px;
    height: 7px;
    background: var(--brick);
    border-radius: 50%;
    display: inline-block;
    box-shadow: 0 0 0 2px rgba(185, 56, 30, 0.25);
  }

  /* Sticky Navigation Header matching index.html */
  .site-header {
    border-bottom: 1px dashed var(--border);
    background: rgba(245, 239, 235, 0.96);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .header-inner {
    max-width: 1140px;
    margin: 0 auto;
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .brand-lockup {
    display: flex;
    align-items: center;
    gap: 14px;
    text-decoration: none;
    color: inherit;
  }

  .brand-logo {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    border: 1.5px solid var(--border-dark);
    box-shadow: 2px 2px 0px var(--border-dark);
    object-fit: cover;
  }

  .brand-names {
    display: flex;
    flex-direction: column;
  }

  .brand-title {
    font-family: 'Caveat', cursive;
    font-size: 34px;
    line-height: 1;
    color: var(--charcoal);
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  .brand-subtitle {
    font-family: 'Space Mono', Courier, monospace;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--ink-muted);
    margin-top: 2px;
  }

  .nav-links {
    display: flex;
    gap: 24px;
    align-items: center;
    list-style: none;
    font-family: 'Space Mono', Courier, monospace;
    font-size: 12px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
  }

  .nav-link {
    color: var(--charcoal);
    transition: color 0.15s ease;
  }

  .nav-link:hover {
    color: var(--brick);
  }

  .btn-nav-app {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 18px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #FFFFFF !important;
    background: var(--charcoal);
    border: 1px solid var(--charcoal);
    border-radius: 4px;
    box-shadow: 1px 1px 0 var(--border-dark);
    white-space: nowrap;
    text-decoration: none;
    transition: all 0.15s ease;
  }

  .btn-nav-app:hover {
    background: var(--brick);
    border-color: var(--charcoal);
    transform: translateY(-1px);
  }

  .mobile-nav-cta {
    display: none;
    align-items: center;
    justify-content: center;
    padding: 7px 14px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: #FFFFFF !important;
    background: var(--charcoal);
    border: 1px solid var(--charcoal);
    border-radius: 4px;
    text-decoration: none;
    box-shadow: 1px 1px 0 var(--border-dark);
    transition: all 0.15s ease;
    white-space: nowrap;
  }

  .mobile-nav-cta:hover,
  .mobile-nav-cta:active {
    background: var(--brick);
    border-color: var(--charcoal);
  }

  @media (max-width: 860px) {
    .top-bar {
      display: none !important;
    }
    .nav-links {
      display: none !important;
    }
    .mobile-nav-cta {
      display: inline-flex !important;
    }
    .header-inner {
      padding: 12px 18px;
    }
    .brand-logo {
      width: 40px;
      height: 40px;
    }
    .brand-title {
      font-size: 30px;
    }
  }

  .container {
    max-width: 860px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }

  /* Breadcrumbs */
  .breadcrumbs {
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--ink-muted);
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .breadcrumbs a:hover { color: var(--brick); }

  /* Article Header */
  .article-header {
    margin-bottom: 40px;
  }
  .article-tag-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }
  .article-tag {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    text-transform: uppercase;
    background: var(--paper);
    border: 1px solid var(--border);
    padding: 4px 10px;
    border-radius: 3px;
    color: var(--brick);
    font-weight: 600;
  }
  .article-title {
    font-family: 'Fraunces', Georgia, serif;
    font-size: clamp(32px, 5vw, 48px);
    line-height: 1.15;
    font-weight: 600;
    color: var(--charcoal);
    margin-bottom: 18px;
    letter-spacing: -0.01em;
  }
  .article-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--ink-muted);
    border-top: 1px dashed var(--border);
    border-bottom: 1px dashed var(--border);
    padding: 12px 0;
    flex-wrap: wrap;
  }

  /* Featured Image Hero */
  .featured-media {
    margin: 0 0 40px;
    border-radius: 8px;
    overflow: hidden;
    border: 1.5px solid var(--border-dark);
    box-shadow: 5px 6px 0px rgba(28, 25, 23, 0.9);
    background: #FFFFFF;
  }
  .featured-media img {
    width: 100%;
    aspect-ratio: 3 / 2;
    object-fit: cover;
    display: block;
  }
  .featured-media figcaption {
    padding: 10px 16px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--ink-muted);
    background: var(--paper);
    border-top: 1px solid var(--border);
  }

  /* Body Content Typography */
  .article-body {
    font-size: 18px;
    line-height: 1.8;
    color: #262320;
  }
  .article-body h2 {
    font-family: 'Fraunces', Georgia, serif;
    font-size: clamp(24px, 3.5vw, 32px);
    color: var(--charcoal);
    margin: 48px 0 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
    line-height: 1.25;
  }
  .article-body h3 {
    font-family: 'Fraunces', Georgia, serif;
    font-size: 22px;
    color: var(--charcoal);
    margin: 32px 0 12px;
  }
  .article-body p {
    margin-bottom: 24px;
  }
  .article-body strong {
    color: var(--charcoal);
    font-weight: 700;
  }
  .blog-link {
    color: var(--brick);
    text-decoration: underline;
    text-underline-offset: 3px;
    font-weight: 500;
  }
  .blog-link:hover {
    color: var(--charcoal);
  }
  .blog-figure {
    margin: 36px 0;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--border);
    background: #FFFFFF;
  }
  .blog-img {
    width: 100%;
    height: auto;
    display: block;
  }
  .blog-caption {
    padding: 8px 14px;
    font-family: 'Space Mono', monospace;
    font-size: 11px;
    color: var(--ink-muted);
    background: var(--paper);
    border-top: 1px solid var(--border);
  }
  .blog-quote {
    margin: 32px 0;
    padding: 18px 24px;
    border-left: 4px solid var(--brick);
    background: var(--paper);
    font-style: italic;
    font-family: 'Fraunces', serif;
    font-size: 20px;
    color: var(--charcoal);
  }
  .blog-list {
    margin: 0 0 24px 28px;
  }
  .blog-list-item {
    margin-bottom: 10px;
  }
  .code-block {
    background: #1C1917;
    color: #E6DFD5;
    padding: 18px;
    border-radius: 6px;
    overflow-x: auto;
    font-family: 'Space Mono', monospace;
    font-size: 13px;
    margin: 28px 0;
  }
  .inline-code {
    background: #E8E1D5;
    color: var(--charcoal);
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 14px;
  }

  /* Callout Card */
  .callout {
    margin: 32px 0;
    border: 1.5px solid var(--border-dark);
    border-radius: 8px;
    background: var(--paper);
    padding: 20px 24px;
    box-shadow: 3px 3px 0 var(--border-dark);
    position: relative;
  }
  .callout-badge {
    position: absolute;
    top: -10px;
    left: 18px;
    background: var(--charcoal);
    color: #FFFFFF;
    font-family: 'Space Mono', monospace;
    font-size: 9px;
    padding: 2px 8px;
    border-radius: 3px;
    letter-spacing: 1px;
  }
  .callout-body {
    font-size: 15px;
    color: var(--charcoal);
  }

  /* Conversion CTA Banner */
  .cta-journal-card {
    background: #1C1917;
    color: #FFFFFF;
    border-radius: 10px;
    padding: 32px;
    margin: 50px 0;
    text-align: center;
    box-shadow: 6px 7px 0px rgba(185, 56, 30, 0.4);
    position: relative;
  }
  .cta-tag {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: #FFC480;
    text-transform: uppercase;
    display: block;
    margin-bottom: 10px;
  }
  .cta-title {
    font-family: 'Fraunces', serif;
    font-size: 26px;
    margin-bottom: 12px;
  }
  .cta-desc {
    color: #D4C9BA;
    font-size: 14px;
    max-width: 540px;
    margin: 0 auto 20px;
    line-height: 1.6;
  }
  .cta-btn {
    display: inline-block;
    background: #FFC480;
    color: #1C1917;
    font-family: 'Space Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    padding: 12px 28px;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: transform 0.1s ease;
  }
  .cta-btn:hover {
    transform: translateY(-2px);
    background: #FFE0B2;
  }

  /* FAQ Accordion */
  .faq-section {
    margin: 50px 0;
    padding-top: 32px;
    border-top: 1.5px solid var(--border-dark);
  }
  .faq-heading {
    font-family: 'Fraunces', serif;
    font-size: 28px;
    margin-bottom: 24px;
  }
  .faq-card {
    background: var(--paper);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 18px 22px;
    margin-bottom: 14px;
  }
  .faq-question {
    font-family: 'Fraunces', serif;
    font-size: 18px;
    color: var(--charcoal);
    font-weight: 600;
    margin-bottom: 8px;
  }
  .faq-answer {
    font-size: 15px;
    color: var(--ink-muted);
    line-height: 1.65;
  }

  /* Site Footer matching public/index.html */
  .site-footer {
    border-top: 2px solid var(--border-dark);
    background: var(--paper);
    padding: 64px 0 40px;
    margin-top: 60px;
  }

  .footer-container {
    max-width: 1140px;
    margin: 0 auto;
    padding: 0 24px;
  }

  .footer-grid {
    display: grid;
    grid-template-columns: 1.8fr 1fr 1fr 1fr;
    gap: 36px;
    margin-bottom: 48px;
  }

  @media (max-width: 900px) {
    .footer-grid {
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }
  }

  @media (max-width: 560px) {
    .footer-grid {
      grid-template-columns: 1fr;
      gap: 28px;
    }
  }

  .footer-brand-desc {
    font-size: 12px;
    color: var(--ink-muted);
    line-height: 1.7;
    max-width: 380px;
    margin-top: 12px;
    font-family: 'Space Mono', Courier, monospace;
  }

  .footer-col-title {
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--charcoal);
    font-weight: bold;
    margin-bottom: 16px;
    font-family: 'Space Mono', Courier, monospace;
  }

  .footer-links-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-family: 'Space Mono', Courier, monospace;
  }

  .footer-link {
    font-size: 12px;
    color: var(--ink-muted);
    text-decoration: none;
    transition: color 0.15s ease;
  }

  .footer-link:hover {
    color: var(--brick);
    text-decoration: underline;
  }

  .footer-bottom {
    border-top: 1px dashed var(--border);
    padding-top: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 11px;
    color: var(--ink-subtle);
    font-family: 'Space Mono', Courier, monospace;
  }

  .footer-bottom-links {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .footer-bottom-link {
    color: var(--charcoal);
    font-weight: 700;
    text-decoration: underline;
    transition: color 0.15s ease;
  }

  .footer-bottom-link:hover {
    color: var(--brick);
  }

  .colophon {
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  /* Blog Index Grid */
  .blog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 28px;
    margin-top: 36px;
  }
  .post-card {
    background: var(--paper);
    border: 1.5px solid var(--border-dark);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 4px 4px 0 var(--border-dark);
    display: flex;
    flex-direction: column;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .post-card:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0 var(--border-dark);
  }
  .post-card-thumb {
    width: 100%;
    aspect-ratio: 3 / 2;
    object-fit: cover;
    display: block;
    border-bottom: 1px solid var(--border);
  }
  .post-card-content {
    padding: 24px;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    justify-content: space-between;
  }
  .post-card-title {
    font-family: 'Fraunces', serif;
    font-size: 22px;
    color: var(--charcoal);
    line-height: 1.25;
    margin-bottom: 10px;
  }
  .post-card-desc {
    font-size: 13px;
    color: var(--ink-muted);
    line-height: 1.6;
    margin-bottom: 16px;
  }
  .post-card-meta {
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    color: var(--ink-subtle);
    border-top: 1px dashed var(--border);
    padding-top: 12px;
    display: flex;
    justify-content: space-between;
    text-transform: uppercase;
  }
`;

// Shared Site Header matching public/index.html navbar
export function renderSiteHeaderHtml(): string {
  return `
  <!-- Top Utility Announcement Bar -->
  <div class="top-bar">
    <div class="top-bar-left">
      <span class="top-dot"></span>
      <span>travel-scrapbook.com · Digital Travel Scrapbook &amp; Journal</span>
    </div>
    <div>
      <span>Free Digital Travel Scrapbook · 2 Custom Stamps Included</span>
    </div>
  </div>

  <header class="site-header">
    <div class="header-inner">
      <a href="/" class="brand-lockup">
        <img src="/assets/tag_logo.png" alt="Fields Logo" class="brand-logo" />
        <div class="brand-names">
          <span class="brand-title">Fields</span>
          <span class="brand-subtitle">Travel Journal &amp; Scrapbook</span>
        </div>
      </a>

      <ul class="nav-links">
        <li><a href="/" class="nav-link">Home</a></li>
        <li><a href="/#how-it-works" class="nav-link">How It Works</a></li>
        <li><a href="/#gallery" class="nav-link">Scrapbook</a></li>
        <li><a href="/app" class="btn-nav-app">Launch Web App</a></li>
      </ul>

      <!-- Mobile quick launch button -->
      <a href="/app" class="mobile-nav-cta">Launch App</a>
    </div>
  </header>`;
}

// Shared Site Footer matching public/index.html footer
export function renderSiteFooterHtml(): string {
  return `
  <footer class="site-footer">
    <div class="footer-container">
      <div class="footer-grid">
        <div>
          <a href="/" class="brand-lockup">
            <img src="/assets/tag_logo.png" alt="Fields Logo" style="width: 36px; height: 36px; border-radius: 6px; border: 1.5px solid var(--border-dark);" />
            <div class="brand-names">
              <span class="brand-title" style="font-size: 26px;">Fields</span>
              <span class="brand-subtitle">Travel Journal &amp; Scrapbook</span>
            </div>
          </a>
          <p class="footer-brand-desc">
            A simple digital travel scrapbook that turns your vacation photos into vintage travel stamps. Save the dates, places, and memories you love at travel-scrapbook.com.
          </p>
        </div>

        <div>
          <h5 class="footer-col-title">Travel Blog</h5>
          <ul class="footer-links-list">
            <li><a href="/blog" class="footer-link" style="font-weight: 700; color: var(--brick);">Blog &amp; Guides Hub</a></li>
            <li><a href="/blog/how-to-create-digital-travel-scrapbook-iphone-photos" class="footer-link">Digital Scrapbook Guide (2026)</a></li>
            <li><a href="/blog/what-to-do-with-travel-photos-12-ideas-beyond-the-camera-roll" class="footer-link">Travel Photo Ideas</a></li>
            <li><a href="/about" class="footer-link">About Fields</a></li>
          </ul>
        </div>

        <div>
          <h5 class="footer-col-title">Scrapbook App</h5>
          <ul class="footer-links-list">
            <li><a href="/app" class="footer-link">Launch Web App</a></li>
            <li><a href="https://play.google.com/store/apps/details?id=app.fields.journal" class="footer-link" target="_blank" rel="noopener">Google Play Store</a></li>
            <li><a href="/#membership" class="footer-link">Fields Pro Lifetime</a></li>
            <li><a href="/#how-it-works" class="footer-link">How It Works</a></li>
          </ul>
        </div>

        <div>
          <h5 class="footer-col-title">Legal &amp; Contact</h5>
          <ul class="footer-links-list">
            <li><a href="/privacy" class="footer-link">Privacy Policy</a></li>
            <li><a href="/terms" class="footer-link">Terms of Service</a></li>
            <li><a href="mailto:deanfields48@gmail.com" class="footer-link">Developer Contact</a></li>
            <li><a href="/health" class="footer-link">API Status</a></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <div>&copy; 2026 FIELDS. All rights reserved.</div>
        <div class="footer-bottom-links">
          <a href="/blog" class="footer-bottom-link">Blog</a> &middot;
          <a href="/app" class="footer-bottom-link">Web App</a> &middot;
          <a href="/about" class="footer-bottom-link">About</a> &middot;
          <a href="/privacy" class="footer-bottom-link">Privacy</a> &middot;
          <a href="/terms" class="footer-bottom-link">Terms</a>
        </div>
        <div class="colophon">
          TRAVEL-SCRAPBOOK.COM &middot; DIGITAL TRAVEL SCRAPBOOK &amp; PHOTO JOURNAL
        </div>
      </div>
    </div>
  </footer>`;
}

// Render Public Blog Index (/blog)
export function renderBlogIndexHtml(posts: BlogPost[]): string {
  const publishedPosts = posts.filter(p => p.status === 'published');

  const postCardsHtml = publishedPosts.length > 0 ? publishedPosts.map(p => `
    <article class="post-card">
      <a href="/blog/${p.slug}">
        <img 
          src="${p.featured_image_url || '/assets/poster_kyoto.jpg'}" 
          alt="${p.featured_image_alt || p.title}" 
          class="post-card-thumb" 
          loading="lazy"
        />
      </a>
      <div class="post-card-content">
        <div>
          <div class="article-tag-row">
            ${(p.focus_keywords || ['Travel Journal']).slice(0, 2).map(k => `<span class="article-tag">${k}</span>`).join('')}
          </div>
          <h2 class="post-card-title">
            <a href="/blog/${p.slug}">${p.title}</a>
          </h2>
          <p class="post-card-desc">${p.meta_description || 'Read the full guide on digital travel scrapbooking, vintage photo cards, and travel preservation.'}</p>
        </div>
        <div class="post-card-meta">
          <span>${new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span>${p.reading_time_minutes} min read</span>
        </div>
      </div>
    </article>
  `).join('') : `
    <div style="grid-column: 1 / -1; padding: 48px; text-align: center; background: var(--paper); border: 1px dashed var(--border); border-radius: 8px;">
      <h3 style="font-family: 'Fraunces', serif; font-size: 22px; margin-bottom: 8px;">Fresh Stories Coming Soon</h3>
      <p style="color: var(--ink-muted); font-size: 14px;">Our travel writers and photo preservationists are crafting new guides. Check back shortly!</p>
    </div>
  `;

  const schemaJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Travel Scrapbook Journal & Guides | Fields',
    description: 'Expert tips on turning travel photos into vintage collectible stamps, photo scrapbooking ideas, and digital travel journals.',
    url: 'https://travel-scrapbook.com/blog',
    publisher: {
      '@type': 'Organization',
      name: 'Fields',
      url: 'https://travel-scrapbook.com',
      logo: 'https://travel-scrapbook.com/assets/tag_logo.png',
    },
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Travel Scrapbook Journal &amp; Guides | Fields</title>
  <meta name="description" content="Explore expert tips, creative layout ideas, and step-by-step guides on making digital travel scrapbooks and vintage passport stamps from your phone." />
  <meta name="keywords" content="digital travel scrapbook, travel journal blog, photo scrapbook ideas, vintage travel stamps, fields journal" />
  <link rel="canonical" href="https://travel-scrapbook.com/blog" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="Travel Scrapbook Journal &amp; Guides | Fields" />
  <meta property="og:description" content="Explore expert tips and step-by-step guides on making digital travel scrapbooks from your phone." />
  <meta property="og:url" content="https://travel-scrapbook.com/blog" />
  <meta property="og:image" content="https://travel-scrapbook.com/assets/poster_kyoto.jpg" />
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Travel Scrapbook Journal &amp; Guides | Fields" />
  <meta name="twitter:description" content="Explore expert tips and step-by-step guides on making digital travel scrapbooks from your phone." />
  <meta name="twitter:image" content="https://travel-scrapbook.com/assets/poster_kyoto.jpg" />

  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Fraunces:ital,opsz,wght@0,9..144,300..800;1,9..144,300..700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />

  <script type="application/ld+json">${schemaJson}</script>

  <style>${BASE_BLOG_STYLES}</style>
</head>
<body>
  ${renderSiteHeaderHtml()}

  <main class="container">
    <div class="breadcrumbs">
      <a href="/">Home</a> <span>/</span> <span>Journal &amp; Guides</span>
    </div>

    <div style="text-align: center; max-width: 680px; margin: 0 auto 40px;">
      <span class="article-tag" style="display: inline-block; margin-bottom: 12px;">◈ The Field Notes Journal</span>
      <h1 style="font-family: 'Fraunces', serif; font-size: clamp(34px, 5.5vw, 52px); color: var(--charcoal); line-height: 1.15; margin-bottom: 14px;">
        Memories captured with intention.
      </h1>
      <p style="font-size: 16px; color: var(--ink-muted); line-height: 1.7;">
        Discover inspiration, travel photo composition tips, and modern creative techniques to preserve your journeys into timeless digital scrapbooks.
      </p>
    </div>

    <div class="blog-grid">
      ${postCardsHtml}
    </div>

    <div class="cta-journal-card" style="margin-top: 60px;">
      <span class="cta-tag">✦ Instant Scrapbook Crafting ✦</span>
      <h2 class="cta-title">Turn any trip photo into a collectible travel stamp.</h2>
      <p class="cta-desc">Fields extracts your location and 3 sensory memory words automatically. Start free in your browser or phone.</p>
      <a href="/app" class="cta-btn">Create Your First Stamp Free</a>
    </div>
  </main>

  ${renderSiteFooterHtml()}
</body>
</html>`;
}

// Render Public Blog Post Reader (/blog/:slug)
export function renderBlogPostHtml(post: BlogPost, relatedPosts: BlogPost[] = []): string {
  const publishedDate = new Date(post.created_at).toISOString();
  const modifiedDate = new Date(post.updated_at || post.created_at).toISOString();
  const readableDate = new Date(post.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const featuredImg = post.featured_image_url || 'https://travel-scrapbook.com/assets/poster_kyoto.jpg';
  const canonicalUrl = post.canonical_url || `https://travel-scrapbook.com/blog/${post.slug}`;
  const effectiveTitle = post.seo_title || post.title;
  const contentHtml = post.content_html || markdownToHtml(post.content_markdown);

  // Schema.org: BlogPosting
  const blogPostingSchema: any = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    alternativeHeadline: post.seo_title || undefined,
    description: post.meta_description,
    image: [featuredImg],
    datePublished: publishedDate,
    dateModified: modifiedDate,
    author: {
      '@type': 'Person',
      name: post.author || 'Fields Editorial',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Fields',
      url: 'https://travel-scrapbook.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://travel-scrapbook.com/assets/tag_logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    keywords: (post.focus_keywords || []).join(', '),
  };

  // Schema.org: Breadcrumbs
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://travel-scrapbook.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Journal',
        item: 'https://travel-scrapbook.com/blog',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: canonicalUrl,
      },
    ],
  };

  // Schema.org: FAQPage (if faq_items present)
  let faqSchema: any = null;
  let faqAccordionHtml = '';
  if (post.faq_items && post.faq_items.length > 0) {
    faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: post.faq_items.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };

    faqAccordionHtml = `
      <section class="faq-section" id="frequently-asked-questions">
        <h2 class="faq-heading">Frequently Asked Questions</h2>
        ${post.faq_items.map(faq => `
          <div class="faq-card">
            <h3 class="faq-question">${faq.question}</h3>
            <p class="faq-answer">${faq.answer}</p>
          </div>
        `).join('')}
      </section>
    `;
  }

  // Related stories HTML
  const relatedHtml = relatedPosts.filter(p => p.slug !== post.slug).slice(0, 2).map(p => `
    <article class="post-card">
      <a href="/blog/${p.slug}">
        <img src="${p.featured_image_url || '/assets/poster_kyoto.jpg'}" alt="${p.title}" class="post-card-thumb" loading="lazy" />
      </a>
      <div class="post-card-content">
        <h3 class="post-card-title" style="font-size: 18px;"><a href="/blog/${p.slug}">${p.title}</a></h3>
        <p class="post-card-desc" style="font-size: 12px;">${p.meta_description}</p>
        <div class="post-card-meta">
          <span>${p.reading_time_minutes} min read</span>
          <span style="color: var(--brick); font-weight: bold;">Read Guide &rarr;</span>
        </div>
      </div>
    </article>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${effectiveTitle} | Fields</title>
  <meta name="description" content="${post.meta_description || ''}" />
  <meta name="keywords" content="${(post.focus_keywords || []).join(', ')}" />
  <meta name="robots" content="${post.robots || 'index, follow'}" />
  <link rel="canonical" href="${canonicalUrl}" />

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${effectiveTitle}" />
  <meta property="og:description" content="${post.meta_description || ''}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${featuredImg}" />
  <meta property="article:published_time" content="${publishedDate}" />
  <meta property="article:modified_time" content="${modifiedDate}" />
  <meta property="article:author" content="${post.author || 'Fields Editorial'}" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${effectiveTitle}" />
  <meta name="twitter:description" content="${post.meta_description || ''}" />
  <meta name="twitter:image" content="${featuredImg}" />

  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Fraunces:ital,opsz,wght@0,9..144,300..800;1,9..144,300..700&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />

  <!-- Structured Data JSON-LD -->
  <script type="application/ld+json">${JSON.stringify(blogPostingSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  ${faqSchema ? `<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>` : ''}

  <style>${BASE_BLOG_STYLES}</style>
</head>
<body>
  ${renderSiteHeaderHtml()}

  <main class="container">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="/">Home</a> <span>/</span>
      <a href="/blog">Journal</a> <span>/</span>
      <span aria-current="page">${post.title}</span>
    </nav>

    <article>
      <header class="article-header">
        <div class="article-tag-row">
          ${(post.focus_keywords || ['Travel Guide']).map(k => `<span class="article-tag">${k}</span>`).join('')}
        </div>
        <h1 class="article-title">${post.title}</h1>
        <div class="article-meta">
          <span>By <strong>${post.author || 'Fields Editorial'}</strong></span>
          <span>·</span>
          <time datetime="${publishedDate}">${readableDate}</time>
          <span>·</span>
          <span>${post.reading_time_minutes} min read</span>
        </div>
      </header>

      ${post.featured_image_url ? `
        <figure class="featured-media">
          <img src="${post.featured_image_url}" alt="${post.featured_image_alt || post.title}" />
          ${post.featured_image_caption ? `<figcaption>${post.featured_image_caption}</figcaption>` : ''}
        </figure>
      ` : ''}

      <div class="article-body">
        ${contentHtml}
      </div>

      ${faqAccordionHtml}

      <div class="cta-journal-card">
        <span class="cta-tag">✦ Ready to Try It? ✦</span>
        <h2 class="cta-title">Turn your latest trip into instant vintage stamps.</h2>
        <p class="cta-desc">Try Fields free right now. Upload any travel photo and create your collectible 3:2 landscape travel scrapbook card in seconds.</p>
        <a href="/app" class="cta-btn">Create Your Stamp Now</a>
      </div>
    </article>

    ${relatedHtml ? `
      <section style="margin-top: 60px; padding-top: 36px; border-top: 1.5px solid var(--border-dark);">
        <h2 style="font-family: 'Fraunces', serif; font-size: 24px; margin-bottom: 24px;">Recommended Reading</h2>
        <div class="blog-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
          ${relatedHtml}
        </div>
      </section>
    ` : ''}
  </main>

  ${renderSiteFooterHtml()}
</body>
</html>`;
}

// Generate dynamic sitemap.xml with image extensions
export function generateSitemapXml(posts: BlogPost[]): string {
  const now = new Date().toISOString().split('T')[0];

  const staticUrls = [
    { loc: 'https://travel-scrapbook.com/', priority: '1.0', changefreq: 'weekly', lastmod: now },
    { loc: 'https://travel-scrapbook.com/blog', priority: '0.9', changefreq: 'daily', lastmod: now },
    { loc: 'https://travel-scrapbook.com/app', priority: '0.8', changefreq: 'monthly', lastmod: now },
    { loc: 'https://travel-scrapbook.com/about', priority: '0.7', changefreq: 'monthly', lastmod: now },
    { loc: 'https://travel-scrapbook.com/privacy', priority: '0.3', changefreq: 'yearly', lastmod: now },
    { loc: 'https://travel-scrapbook.com/terms', priority: '0.3', changefreq: 'yearly', lastmod: now },
  ];

  const staticXml = staticUrls.map(u => `
  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('');

  const published = posts.filter(p => p.status === 'published');
  const blogXml = published.map(p => {
    const postDate = new Date(p.updated_at || p.created_at).toISOString().split('T')[0];
    const imgXml = p.featured_image_url ? `
    <image:image>
      <image:loc>${p.featured_image_url}</image:loc>
      <image:title>${p.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:title>
      <image:caption>${(p.meta_description || p.title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</image:caption>
    </image:image>` : '';

    return `
  <url>
    <loc>https://travel-scrapbook.com/blog/${p.slug}</loc>
    <lastmod>${postDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imgXml}
  </url>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${staticXml}
${blogXml}
</urlset>`;
}

// Generate RSS 2.0 Feed XML
export function generateRssFeedXml(posts: BlogPost[]): string {
  const published = posts.filter(p => p.status === 'published');

  const itemsXml = published.map(p => `
    <item>
      <title><![CDATA[${p.title}]]></title>
      <link>https://travel-scrapbook.com/blog/${p.slug}</link>
      <guid isPermaLink="true">https://travel-scrapbook.com/blog/${p.slug}</guid>
      <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>
      <description><![CDATA[${p.meta_description || ''}]]></description>
      <author>${p.author || 'Fields Editorial'}</author>
    </item>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Fields — Travel Scrapbook &amp; Journal</title>
    <link>https://travel-scrapbook.com/blog</link>
    <description>Guides and tips for creating collectible digital travel scrapbooks and vintage passport stamp memories.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://travel-scrapbook.com/rss.xml" rel="self" type="application/rss+xml"/>
    ${itemsXml}
  </channel>
</rss>`;
}

// Generate llms.txt standard knowledge file
export function generateLlmsTxt(posts: BlogPost[]): string {
  const published = posts.filter(p => p.status === 'published');

  const articlesList = published.map(p => `- [${p.title}](https://travel-scrapbook.com/blog/${p.slug}): ${p.meta_description || ''}`).join('\n');

  return `# Fields (travel-scrapbook.com)
> The digital travel scrapbook app that turns iPhone photos into collectible vintage passport stamps and journal cards.

## About the Application
Fields is a web application and mobile travel journal available at https://travel-scrapbook.com.
It solves the problem of travel memories getting lost in unorganized camera rolls.

### Core Features
- **Instant Travel Stamp Art**: Automatically turns travel pictures into woodblock / vintage rubber stamp art printed side-by-side with your photo.
- **Automatic Metadata**: Extracts location and date metadata from camera roll photos with zero typing required.
- **3 Memory Words**: AI suggests 3 evocative sensory keywords (e.g. "Cedar trees · Temple bell · Dusk mist") that can be customized by the traveler.
- **3:2 Landscape Ratio**: High-resolution print-ready collectible format matching classic 35mm photography.
- **Private & Local**: Photos are processed in memory and never stored or used to train models.

## Key Links
- Main Website: https://travel-scrapbook.com/
- Web App / Stamp Generator: https://travel-scrapbook.com/app
- Travel Scrapbook Journal: https://travel-scrapbook.com/blog
- Pricing & Lifetime Access: https://travel-scrapbook.com/#pricing

## Published Guides & Travel Scrapbooking Articles
${articlesList || '- No articles published yet.'}
`;
}
