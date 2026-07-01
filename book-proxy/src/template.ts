import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import escapeHtml from 'escape-html';
import {
  extractMaintenanceReason,
  renderMaintenanceBannersHtml,
} from './maintenance-banners.js';
import { convertCollapsibleBlocks } from './collapsible.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(currentDir, '..', 'assets');
const bookCss =
  readFileSync(join(assetsDir, 'book.css'), 'utf8') +
  readFileSync(join(assetsDir, 'mediawiki-compat.css'), 'utf8') +
  readFileSync(join(assetsDir, 'maintenance-banners.css'), 'utf8');

const FONT_LINK =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Rajdhani:wght@600;700&display=swap" rel="stylesheet">';

function normalizeHeadingText(value: string): string {
  return value
    .replace(/<a\b[^>]*class="[^"]*toc-anchor[^"]*"[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/¶/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Wiki.js pages often lead with an h1 matching the page title; the book shell already renders one. */
export function stripDuplicateTitleHeading(html: string, title: string): string {
  const match = html.match(/^\s*<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) {
    return html;
  }

  if (normalizeHeadingText(match[1]) !== normalizeHeadingText(title)) {
    return html;
  }

  return html.slice(match[0].length);
}

export function renderBookPage(title: string, content: string, tags: string[] = []): string {
  const safeTitle = escapeHtml(title);
  const transformed = stripDuplicateTitleHeading(convertCollapsibleBlocks(content), title);
  const reason = extractMaintenanceReason(transformed);
  const banners = renderMaintenanceBannersHtml(tags, reason);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
  ${FONT_LINK}
  <style>${bookCss}</style>
</head>
<body>
  <article class="book-page">
    <h1 class="book-title">${safeTitle}</h1>
    <div class="mw-parser-output">${banners}${transformed}</div>
  </article>
</body>
</html>`;
}

export function renderNotFound(slug: string): string {
  const safeSlug = escapeHtml(slug);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Page Not Found</title>
  ${FONT_LINK}
  <style>${bookCss}</style>
</head>
<body class="error-page">
  <h1>Page Not Found</h1>
  <p>No wiki page exists for <code>${safeSlug}</code>.</p>
</body>
</html>`;
}

export function renderError(message: string): string {
  const safeMessage = escapeHtml(message);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Unavailable</title>
  ${FONT_LINK}
  <style>${bookCss}</style>
</head>
<body class="error-page">
  <h1>Manual Unavailable</h1>
  <p>${safeMessage}</p>
</body>
</html>`;
}
