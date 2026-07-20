import { transformMediaWikiHtml } from '../html-transform.js';

export function htmlPipeline(html: string, wikiPath: string): string {
  return transformMediaWikiHtml(html, wikiPath);
}

export function extractLocalWikiContent(html: string): string {
  // MediaWiki / browser saves vary class order:
  // - TG: class="mw-content-ltr mw-parser-output"
  // - Nova: class="mw-parser-output" (sometimes without mw-content-ltr on same div)
  const startMatch = html.match(
    /<div[^>]*class="[^"]*\bmw-parser-output\b[^"]*"[^>]*>/i,
  );
  if (!startMatch || startMatch.index === undefined) {
    throw new Error('Could not find mw-parser-output');
  }
  const startIdx = startMatch.index;

  const endMarker = '<div class="printfooter"';
  const endIdx = html.indexOf(endMarker, startIdx);
  if (endIdx === -1) throw new Error('Could not find printfooter');

  return html.slice(startIdx, endIdx);
}
