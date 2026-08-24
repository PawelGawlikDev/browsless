import { marked } from 'marked';
import { getBlocks } from '@/utils/getSharedData';
export type DocsSection = 'blocks' | 'workflow' | 'reference';
export type DocsArticle = {
  section: DocsSection;
  slug: string;
  title: string;
  html: string;
};
const sectionLabels: Record<DocsSection, string> = {
  blocks: 'Blocks',
  workflow: 'Workflow',
  reference: 'Reference',
};
const partFiles = import.meta.glob('./content/parts/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;
const articleFiles = import.meta.glob('./content/{blocks,workflow,reference}/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>;
const blockSlugOverrides: Record<string, string> = {
  'forward-page': 'go-forward',
};
const allowedWorkflowSlugs = new Set([
  'overview',
  'blocks',
  'variables',
  'global-data',
  'table',
  'table-or-variable',
  'element-selector',
  'looping',
  'settings',
  'parameters',
  'running-a-workflow',
  'expressions',
  'debug-mode',
  'testing-mode',
]);
const allowedReferenceSlugs = new Set([
  'javascript-execution-context',
  'workflow-common-errors',
  'condition-builder',
  'storage',
  'packages',
]);
const allowedBlockSlugs = new Set(
  Object.keys(getBlocks()).map((blockId) => blockSlugOverrides[blockId] ?? blockId)
);
const stripFrontmatter = (source: string) => {
  return source.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
};
const inlineIncludedParts = (source: string) => {
  return source.replace(/<!--@include:\s*(.*?)\s*-->/g, (_, includePath: string) => {
    const fileName = includePath.split('/').at(-1);
    const matchedEntry = Object.entries(partFiles).find(([path]) =>
      path.endsWith(fileName ?? '')
    );
    return matchedEntry ? stripFrontmatter(matchedEntry[1]) : '';
  });
};
const normalizeBranding = (source: string) => {
  return source
    .replace(/\bautomaNextBlock\b/g, 'browslessNextBlock')
    .replace(/\bautomaSetVariable\b/g, 'browslessSetVariable')
    .replace(/\bautomaRefData\b/g, 'browslessRefData')
    .replace(/\bautomaFetch\b/g, 'browslessFetch')
    .replace(/\bautomaResetTimeout\b/g, 'browslessResetTimeout')
    .replace(/\bautomaExecWorkflow\b/g, 'browslessExecWorkflow')
    .replace(/\bAutoma\b/g, 'Browsless');
};
const normalizeCallouts = (source: string) => {
  return source.replace(
    /::: (\w+)\s+(.*?)\n([\s\S]*?):::/g,
    (_, type: string, title: string, body: string) => {
      const label = type === 'warning' ? 'Note' : title;
      return `> **${label}**\n>\n> ${body.trim().replace(/\n/g, '\n> ')}`;
    }
  );
};
const toDashboardDocPath = (section: string, slug: string) => {
  return `#/docs/${section}/${slug}`;
};
const normalizeLinks = (source: string) => {
  return source
    .replaceAll(
      '/blocks/javascript-code.html#automarefdata-keyword-path',
      toDashboardDocPath('blocks', 'javascript-code') + '#automarefdata-keyword-path'
    )
    .replace(
      /\((\.\.\/)?blocks\/([^)]+?)\.md(#[^)]+)?\)/g,
      (_, _prefix: string, slug: string, hash = '') =>
        `(${toDashboardDocPath('blocks', slug)}${hash})`
    )
    .replace(
      /\((\.\.\/)?workflow\/([^)]+?)\.md(#[^)]+)?\)/g,
      (_, _prefix: string, slug: string, hash = '') =>
        `(${toDashboardDocPath('workflow', slug)}${hash})`
    )
    .replace(
      /\((\.\.\/)?reference\/([^)]+?)\.md(#[^)]+)?\)/g,
      (_, _prefix: string, slug: string, hash = '') =>
        `(${toDashboardDocPath('reference', slug)}${hash})`
    );
};
const decorateHtml = (html: string) => {
  return html.replace(
    /<a href="https?:\/\//g,
    '<a target="_blank" rel="noopener" href="https://'
  );
};
const getSectionFromPath = (path: string): DocsSection => {
  if (path.includes('/blocks/')) return 'blocks';
  if (path.includes('/workflow/')) return 'workflow';
  return 'reference';
};
const getSlugFromPath = (path: string) => {
  return path.split('/').at(-1)?.replace(/\.md$/, '') ?? '';
};
const getTitle = (source: string, fallbackSlug: string) => {
  const headingMatch = stripFrontmatter(source).match(/^#\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();
  return fallbackSlug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
const compileMarkdown = (source: string) => {
  const normalized = normalizeLinks(
    normalizeCallouts(normalizeBranding(inlineIncludedParts(stripFrontmatter(source))))
  );
  const html = marked.parse(normalized) as string;
  return decorateHtml(html);
};
export const docsArticles: DocsArticle[] = Object.entries(articleFiles)
  .map(([path, source]) => {
    const section = getSectionFromPath(path);
    const slug = getSlugFromPath(path);
    return {
      section,
      slug,
      title: getTitle(source, slug),
      html: compileMarkdown(source),
    };
  })
  .filter((article) => {
    if (article.section === 'blocks') return allowedBlockSlugs.has(article.slug);
    if (article.section === 'workflow') return allowedWorkflowSlugs.has(article.slug);
    return allowedReferenceSlugs.has(article.slug);
  })
  .sort((a, b) => a.title.localeCompare(b.title));
export const docsSections = (Object.keys(sectionLabels) as DocsSection[]).map(
  (section) => ({
    id: section,
    title: sectionLabels[section],
    articles: docsArticles.filter((article) => article.section === section),
  })
);
export const getDocsArticle = (section: string, slug: string) => {
  return (
    docsArticles.find(
      (article) => article.section === section && article.slug === slug
    ) ?? null
  );
};
export const getBlockDocsPath = (blockId: string) => {
  const slug = blockSlugOverrides[blockId] ?? blockId;
  const article = getDocsArticle('blocks', slug);
  return article ? `/docs/blocks/${article.slug}` : '';
};
export const getWorkflowDocsPath = (slug: string) => {
  return getDocsArticle('workflow', slug) ? `/docs/workflow/${slug}` : '';
};
export const getReferenceDocsPath = (slug: string) => {
  return getDocsArticle('reference', slug) ? `/docs/reference/${slug}` : '';
};
