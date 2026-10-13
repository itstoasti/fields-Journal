export interface SeoCheckResult {
  rule: string;
  passed: boolean;
  score: number;
  maxScore: number;
  message: string;
  importance: 'critical' | 'high' | 'recommended';
}

export interface SeoAuditReport {
  score: number; // 0 - 100
  passedChecks: number;
  totalChecks: number;
  isPassing: boolean;
  feedback: SeoCheckResult[];
  summary: string[];
}

export interface SeoAuditInput {
  title: string;
  seo_title?: string;
  slug: string;
  meta_description?: string;
  focus_keywords?: string[];
  content_markdown: string;
  featured_image_url?: string | null;
  featured_image_alt?: string | null;
  canonical_url?: string | null;
  faq_items?: Array<{ question: string; answer: string }>;
}

export function auditBlogPostSeo(input: SeoAuditInput): SeoAuditReport {
  const results: SeoCheckResult[] = [];
  const primaryKeyword = (input.focus_keywords && input.focus_keywords.length > 0)
    ? input.focus_keywords[0].toLowerCase().trim()
    : '';

  const effectiveTitle = (input.seo_title || input.title || '').trim();
  const rawContent = (input.content_markdown || '').toLowerCase();
  const wordCount = input.content_markdown.trim().split(/\s+/).filter(Boolean).length;

  // 1. Title Length (40 - 65 characters optimal for SERPs)
  const titleLen = effectiveTitle.length;
  const titleLenPassed = titleLen >= 35 && titleLen <= 70;
  results.push({
    rule: 'SEO Title Length',
    passed: titleLenPassed,
    score: titleLenPassed ? 10 : titleLen > 0 ? 5 : 0,
    maxScore: 10,
    message: titleLenPassed
      ? `Title length (${titleLen} chars) is ideal for search snippets.`
      : `Title is ${titleLen} characters (recommended: 40-65 chars).`,
    importance: 'critical',
  });

  // 2. Focus Keyword in Title
  const kwInTitle = primaryKeyword ? effectiveTitle.toLowerCase().includes(primaryKeyword) : false;
  results.push({
    rule: 'Focus Keyword in Title',
    passed: kwInTitle,
    score: kwInTitle ? 15 : 0,
    maxScore: 15,
    message: kwInTitle
      ? `Focus keyword "${primaryKeyword}" appears in the title.`
      : primaryKeyword
      ? `Focus keyword "${primaryKeyword}" is missing from the title.`
      : 'No focus keyword defined.',
    importance: 'critical',
  });

  // 3. Meta Description Length (120 - 160 characters)
  const metaDesc = (input.meta_description || '').trim();
  const metaLen = metaDesc.length;
  const metaLenPassed = metaLen >= 110 && metaLen <= 165;
  results.push({
    rule: 'Meta Description Length',
    passed: metaLenPassed,
    score: metaLenPassed ? 10 : metaLen > 50 ? 5 : 0,
    maxScore: 10,
    message: metaLenPassed
      ? `Meta description length (${metaLen} chars) is within search snippet limit.`
      : `Meta description is ${metaLen} chars (recommended: 120-160 chars).`,
    importance: 'high',
  });

  // 4. Focus Keyword in Meta Description
  const kwInMeta = primaryKeyword && metaDesc ? metaDesc.toLowerCase().includes(primaryKeyword) : false;
  results.push({
    rule: 'Focus Keyword in Meta Description',
    passed: kwInMeta,
    score: kwInMeta ? 10 : 0,
    maxScore: 10,
    message: kwInMeta
      ? `Focus keyword appears in meta description.`
      : `Add your primary keyword to the meta description for higher click-through rate.`,
    importance: 'high',
  });

  // 5. Focus Keyword in URL Slug
  const cleanSlug = (input.slug || '').toLowerCase();
  const kwInSlug = primaryKeyword ? cleanSlug.includes(primaryKeyword.replace(/\s+/g, '-')) || cleanSlug.includes(primaryKeyword.replace(/\s+/g, '')) : false;
  results.push({
    rule: 'Focus Keyword in URL Slug',
    passed: kwInSlug,
    score: kwInSlug ? 10 : 5,
    maxScore: 10,
    message: kwInSlug
      ? `Slug "${cleanSlug}" contains focus keyword.`
      : `URL slug should ideally contain the main target keyword.`,
    importance: 'high',
  });

  // 6. Content Length (Minimum 600 words, 1000+ words recommended for comprehensive ranking)
  const isGoodLength = wordCount >= 600;
  const isEpicLength = wordCount >= 1000;
  results.push({
    rule: 'Word Count / Depth',
    passed: isGoodLength,
    score: isEpicLength ? 15 : isGoodLength ? 10 : 5,
    maxScore: 15,
    message: isEpicLength
      ? `Excellent in-depth content (${wordCount} words). High topical authority.`
      : isGoodLength
      ? `Good content length (${wordCount} words). Consider expanding to 1,000+ words for competitive keywords.`
      : `Content is short (${wordCount} words). Recommend at least 600 words for organic search ranking.`,
    importance: 'critical',
  });

  // 7. Focus Keyword in First 15% of Content (Introduction)
  const introSlice = rawContent.slice(0, 500);
  const kwInIntro = primaryKeyword ? introSlice.includes(primaryKeyword) : false;
  results.push({
    rule: 'Focus Keyword in Introduction',
    passed: kwInIntro,
    score: kwInIntro ? 10 : 0,
    maxScore: 10,
    message: kwInIntro
      ? `Focus keyword found early in the opening paragraphs.`
      : `Mention focus keyword within the first 100-150 words.`,
    importance: 'high',
  });

  // 8. Headings Hierarchy (H2 presence & keyword in H2)
  const hasH2 = /^##\s+.+$/m.test(input.content_markdown);
  const h2Matches = input.content_markdown.match(/^##\s+(.+)$/gm) || [];
  const kwInH2 = primaryKeyword ? h2Matches.some(h => h.toLowerCase().includes(primaryKeyword)) : false;
  results.push({
    rule: 'Headings Structure (H2/H3)',
    passed: hasH2 && kwInH2,
    score: hasH2 && kwInH2 ? 10 : hasH2 ? 5 : 0,
    maxScore: 10,
    message: hasH2 && kwInH2
      ? `Found ${h2Matches.length} H2 sections with focus keyword included.`
      : hasH2
      ? `Content has subheadings, but focus keyword is missing in H2 headings.`
      : `No H2 subheadings found. Break content into structured sections.`,
    importance: 'high',
  });

  // 9. Internal Links (Links to travel-scrapbook.com or /app or /blog)
  const internalLinkRegex = /\[([^\]]+)\]\((https?:\/\/travel-scrapbook\.com[^\)]*|\/[^\)]*)\)/g;
  const internalLinks = (input.content_markdown.match(internalLinkRegex) || []).length;
  const hasInternalLinks = internalLinks >= 1;
  results.push({
    rule: 'Internal Linking',
    passed: hasInternalLinks,
    score: internalLinks >= 2 ? 5 : hasInternalLinks ? 3 : 0,
    maxScore: 5,
    message: hasInternalLinks
      ? `Found ${internalLinks} internal link(s) for site authority and funneling.`
      : `Missing internal link. Add a link to travel-scrapbook.com/app or related articles.`,
    importance: 'recommended',
  });

  // 10. External Citations / Authoritative Links
  const externalLinkRegex = /\[([^\]]+)\]\((https?:\/\/(?!travel-scrapbook\.com)[^\)]+)\)/g;
  const externalLinks = (input.content_markdown.match(externalLinkRegex) || []).length;
  const hasExternalLinks = externalLinks >= 1;
  results.push({
    rule: 'External Authoritative Links',
    passed: hasExternalLinks,
    score: hasExternalLinks ? 5 : 0,
    maxScore: 5,
    message: hasExternalLinks
      ? `Found ${externalLinks} external citation(s). Builds trust with LLMs and search engines.`
      : `Consider adding 1-2 authoritative external links (e.g., travel guides, Wikipedia, Apple tips).`,
    importance: 'recommended',
  });

  // Calculate Total Score
  const currentTotal = results.reduce((acc, r) => acc + r.score, 0);
  const maxPossible = results.reduce((acc, r) => acc + r.maxScore, 0);
  const normalizedScore = Math.min(100, Math.round((currentTotal / maxPossible) * 100));

  const summary = results
    .filter(r => !r.passed)
    .map(r => `[${r.importance.toUpperCase()}] ${r.rule}: ${r.message}`);

  return {
    score: normalizedScore,
    passedChecks: results.filter(r => r.passed).length,
    totalChecks: results.length,
    isPassing: normalizedScore >= 70,
    feedback: results,
    summary,
  };
}
