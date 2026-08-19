export type FieldPatch = {
  value: string;
  href?: string;
};

export type FormPatch = {
  email: string;
};

export type ContentOverlay = {
  version: 1;
  updatedAt: string;
  publishedAt?: string;
  fields: Record<string, FieldPatch>;
  forms: Record<string, FormPatch>;
};

export function emptyContent(): ContentOverlay {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    fields: {},
    forms: {},
  };
}
