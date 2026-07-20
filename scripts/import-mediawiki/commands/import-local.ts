import { readFileSync } from 'node:fs';
import { parseCliContext } from '../config.js';
import { extractLocalWikiContent } from '../pipeline/html.js';
import { markdownPipeline } from '../pipeline/markdown.js';
import { pageDescriptionForPath } from '../pages.js';
import { WikiJsClient } from '../wikijs-client.js';

type LocalPageDef = {
  path: string;
  title: string;
  tags: string[];
  /** One or more local HTML dumps; content is concatenated in order. */
  files: Array<{
    file: string;
    /** Optional markdown heading inserted before this fragment (skip for first). */
    sectionHeading?: string;
  }>;
};

const PAGES: LocalPageDef[] = [
  {
    path: 'experimentor',
    title: 'E.X.P.E.R.I-MENTOR',
    tags: ['imported', 'tgstation13'],
    files: [
      {
        file: String.raw`C:\Users\robot\Downloads\E.X.P.E.R.I-MENTOR - _tg_station 13 Wiki.html`,
      },
    ],
  },
  {
    path: 'tactical-game-cards',
    title: 'Tactical Game Cards',
    tags: ['imported', 'tgstation13'],
    files: [
      {
        file: String.raw`C:\Users\robot\Downloads\Tactical Game Cards - _tg_station 13 Wiki.html`,
      },
    ],
  },
  {
    path: 'guide-to-telescience',
    title: 'Guide to Telescience',
    tags: ['imported', 'tgstation13'],
    files: [
      {
        file: String.raw`C:\Users\robot\Downloads\Guide to telescience - _tg_station 13 Wiki.html`,
      },
    ],
  },
  {
    path: 'guide-to-engineering',
    title: 'Guide to engineering',
    tags: ['imported', 'novasector13', 'tgstation13'],
    files: [
      {
        file: String.raw`C:\Users\robot\Downloads\Station Engineer - Nova Sector 13.html`,
      },
      {
        file: String.raw`C:\Users\robot\Downloads\Guide to the Supermatter - _tg_station 13 Wiki.html`,
        sectionHeading: '# Guide to the Supermatter',
      },
    ],
  },
];

function resolvePages(argv: string[]): LocalPageDef[] {
  const onlyArg = argv.find((arg) => arg.startsWith('--only='))?.split('=')[1];
  if (!onlyArg) return PAGES;

  const match = PAGES.find((page) => page.path === onlyArg);
  if (!match) {
    throw new Error(
      `Unknown page ${onlyArg}. Known: ${PAGES.map((page) => page.path).join(', ')}`,
    );
  }
  return [match];
}

function buildMarkdown(page: LocalPageDef): string {
  const parts: string[] = [];

  for (const fragment of page.files) {
    const raw = readFileSync(fragment.file, 'utf-8');
    const contentHtml = extractLocalWikiContent(raw);
    let markdown = markdownPipeline(contentHtml, page.path);

    if (fragment.sectionHeading) {
      // Drop a leading H1 that duplicates the section heading we insert.
      markdown = markdown.replace(/^#\s+[^\n]+\n+/, '');
      parts.push(`${fragment.sectionHeading}\n\n${markdown}`);
    } else {
      parts.push(markdown);
    }
  }

  return parts.join('\n\n').trim() + '\n';
}

export async function run(argv: string[]): Promise<void> {
  const context = parseCliContext(argv, {
    defaultSource: 'tgstation13',
    requireSource: false,
  });
  const pages = resolvePages(argv);
  const wiki = new WikiJsClient({
    graphqlUrl: context.wikiGraphqlUrl,
    apiKey: context.wikiApiKey,
    uploadFolderId: context.uploadFolderId,
  });

  for (const page of pages) {
    const markdown = buildMarkdown(page);

    if (context.dryRun) {
      console.log(
        `[dry-run] would create ${page.path} (${page.title}) [${markdown.length} chars, ${page.files.length} source file(s)]`,
      );
      continue;
    }

    const existingId = await wiki.findPageByPath(page.path, context.locale);
    if (existingId !== null) {
      console.log(`skip ${page.path} (already exists as id ${existingId})`);
      continue;
    }

    const created = await wiki.createPage({
      path: page.path,
      locale: context.locale,
      title: page.title,
      description: pageDescriptionForPath(page.path),
      content: markdown,
      editor: 'markdown',
      tags: page.tags,
    });
    console.log(`created ${page.path} (id ${created.id})`);
    await wiki.renderPage(created.id);
    console.log(`rendered ${page.path}`);
  }

  if (!context.dryRun) {
    await wiki.flushCache();
    console.log('cache flushed');
  }
}
