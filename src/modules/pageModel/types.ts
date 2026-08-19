export type EditableFieldType = "text" | "textarea" | "phone" | "link" | "button" | "image" | "html";

export type PageModelField = {
  nodeId: string;
  type: EditableFieldType;
  label: string;
  value: string;
  href?: string;
  target?: string;
  rel?: string;
  download?: boolean;
  html?: boolean;
};

export type PageModelFormField = {
  nodeId: string;
  name: string;
  label: string;
  inputType: string;
  placeholder: string;
};

export type PageModelForm = {
  id: string;
  label: string;
  fields: PageModelFormField[];
};

export type PageModelSection = {
  id: string;
  rootId: string;
  type: string;
  label: string;
  scope?: "site" | "page";
  pageCount?: number;
  static?: boolean;
  customClass?: string;
  similarKey?: string;
  fields: PageModelField[];
  forms: PageModelForm[];
};

export type PageModelPage = {
  path: string;
  url: string;
  title: string;
  sections: PageModelSection[];
};

export type SimilarGroup = {
  key: string;
  label: string;
  customClass: string;
  slots: string[][];
  sectionIds: string[];
};

export type PageModel = {
  version: 1;
  sourceUrl: string;
  generatedAt: string;
  pages: PageModelPage[];
  similar?: SimilarGroup[];
  counts: {
    pages: number;
    sections: number;
    fields: number;
    forms: number;
  };
};
