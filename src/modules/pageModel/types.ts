export type EditableFieldType = "text" | "textarea" | "phone" | "link" | "button" | "image";

export type PageModelField = {
  nodeId: string;
  type: EditableFieldType;
  label: string;
  value: string;
  href?: string;
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
  fields: PageModelField[];
  forms: PageModelForm[];
};

export type PageModelPage = {
  path: string;
  url: string;
  title: string;
  sections: PageModelSection[];
};

export type PageModel = {
  version: 1;
  sourceUrl: string;
  generatedAt: string;
  pages: PageModelPage[];
  counts: {
    pages: number;
    sections: number;
    fields: number;
    forms: number;
  };
};
