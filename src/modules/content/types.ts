export type FieldPatch = {
  value: string;
  href?: string;
};

export type FormPatch = {
  email: string;
};

export type HtmlBlockPosition = "before" | "after" | "head" | "bodyStart" | "bodyEnd";

export type HtmlBlock = {
  id: string;
  sectionId: string;
  position: HtmlBlockPosition;
  html: string;
};

export type PageSeo = {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonical?: string;
  robots?: string;
  headHtml?: string;
  bodyEndHtml?: string;
};

export type SiteSettings = {
  defaultTitle?: string;
  defaultDescription?: string;
  ogImage?: string;
  faviconUrl?: string;
  yandexMetrikaId?: string;
  googleAnalyticsId?: string;
  yandexVerification?: string;
  googleVerification?: string;
  headHtml?: string;
  bodyStartHtml?: string;
  bodyEndHtml?: string;
  jsonLd?: string;
};

export type SectionInsert = {
  id: string;
  afterId?: string;
  html: string;
};

export type SectionLayout = {
  order?: string[];
  hidden?: string[];
  removed?: string[];
  inserts?: SectionInsert[];
};

export type ContentOverlay = {
  version: 1;
  updatedAt: string;
  publishedAt?: string;
  fields: Record<string, FieldPatch>;
  forms: Record<string, FormPatch>;
  htmlBlocks: HtmlBlock[];
  site?: SiteSettings;
  pages?: Record<string, PageSeo>;
  sections?: SectionLayout;
};

export function emptySite(): SiteSettings {
  return {};
}

export function emptyContent(): ContentOverlay {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    fields: {},
    forms: {},
    htmlBlocks: [],
    site: {},
    pages: {},
    sections: { order: [], hidden: [], removed: [], inserts: [] },
  };
}
