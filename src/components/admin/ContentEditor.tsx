"use client";

import { useMemo, useState } from "react";
import type { ContentOverlay, FieldPatch, FormPatch } from "@/modules/content/types";
import type { PageModel } from "@/modules/pageModel/types";

export function ContentEditor({
  jobId,
  model,
  initial,
  previewUrl,
}: {
  jobId: string;
  model: PageModel;
  initial: ContentOverlay;
  previewUrl?: string;
}) {
  const [fields, setFields] = useState<Record<string, FieldPatch>>(initial.fields);
  const [forms, setForms] = useState<Record<string, FormPatch>>(initial.forms);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<"save" | "publish" | null>(null);

  const counts = useMemo(
    () => ({ dirty: Object.keys(fields).length, forms: Object.keys(forms).length }),
    [fields, forms],
  );

  function displayValue(nodeId: string, original: string, href?: string) {
    const patch = fields[nodeId];
    return {
      value: patch?.value ?? original,
      href: patch?.href ?? href ?? "",
    };
  }

  function setField(nodeId: string, original: string, next: FieldPatch) {
    setFields((prev) => {
      const copy = { ...prev };
      const sameValue = (next.value ?? "") === original && !next.href;
      if (sameValue) {
        delete copy[nodeId];
        return copy;
      }
      copy[nodeId] = next;
      return copy;
    });
  }

  async function save() {
    setPending("save");
    setStatus(null);
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/content`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fields, forms }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Не сохранилось");
      setStatus("Черновик сохранён. Откройте Preview — правки уже там.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(null);
    }
  }

  async function publish() {
    await save();
    setPending("publish");
    try {
      const response = await fetch(`/api/admin/jobs/${jobId}/content`, { method: "POST" });
      const data = (await response.json()) as { error?: string; files?: number };
      if (!response.ok) throw new Error(data.error || "Не опубликовалось");
      setStatus(`Опубликовано (${data.files ?? 0} HTML). Preview обновлён.`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={Boolean(pending)}
          className="rounded bg-[#2271b1] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending === "save" ? "Сохранение…" : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={Boolean(pending)}
          className="rounded border border-[#2271b1] bg-white px-4 py-2 text-sm text-[#2271b1] disabled:opacity-60"
        >
          {pending === "publish" ? "Публикация…" : "Опубликовать"}
        </button>
        {previewUrl ? (
          <a
            href={previewUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded border border-[#8c8f94] bg-white px-4 py-2 text-sm"
          >
            Preview
          </a>
        ) : null}
        <span className="text-xs text-[#50575e]">
          правок: {counts.dirty} · формы: {counts.forms}
        </span>
      </div>
      {status ? (
        <p className="rounded border border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-sm">{status}</p>
      ) : null}

      {model.pages.map((page) => (
        <article key={page.path} className="space-y-3 rounded border border-[#c3c4c7] bg-white p-4">
          <h2 className="font-medium">
            {page.title || page.path}{" "}
            <span className="text-sm font-normal text-[#50575e]">{page.path}</span>
          </h2>
          {page.sections.map((section) => (
            <details key={section.id} className="rounded border border-[#dcdcde] p-3" open={section.type === "header" || section.type === "cover"}>
              <summary className="cursor-pointer text-sm font-medium">
                {section.label}{" "}
                <span className="font-normal text-[#50575e]">
                  · {section.fields.length} полей · {section.forms.length} форм
                </span>
              </summary>
              <div className="mt-3 space-y-3">
                {section.fields.map((field) => {
                  const shown = displayValue(field.nodeId, field.value, field.href);
                  const multiline = field.type === "textarea";
                  return (
                    <label key={field.nodeId} className="block text-sm">
                      <span className="text-xs uppercase text-[#50575e]">
                        {field.type} · {field.label}
                      </span>
                      {multiline ? (
                        <textarea
                          value={shown.value}
                          onChange={(e) =>
                            setField(field.nodeId, field.value, {
                              value: e.target.value,
                              href: shown.href || undefined,
                            })
                          }
                          rows={4}
                          className="mt-1 w-full rounded border border-[#8c8f94] px-3 py-2"
                        />
                      ) : (
                        <input
                          value={shown.value}
                          onChange={(e) =>
                            setField(field.nodeId, field.value, {
                              value: e.target.value,
                              href: shown.href || undefined,
                            })
                          }
                          className="mt-1 w-full rounded border border-[#8c8f94] px-3 py-2"
                        />
                      )}
                      {field.type === "link" || field.type === "phone" || field.type === "button" ? (
                        <input
                          value={shown.href}
                          placeholder="href / tel:"
                          onChange={(e) =>
                            setField(field.nodeId, field.value, {
                              value: shown.value,
                              href: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded border border-[#dcdcde] px-3 py-1 text-xs"
                        />
                      ) : null}
                    </label>
                  );
                })}
                {section.forms.map((form) => (
                  <label key={form.id} className="block text-sm">
                    <span className="text-xs uppercase text-[#50575e]">form · {form.label}</span>
                    <div className="mt-1 text-xs text-[#50575e]">
                      {form.fields.map((item) => item.label).join(" · ")}
                    </div>
                    <input
                      type="email"
                      placeholder="Куда слать заявки (email)"
                      value={forms[form.id]?.email || ""}
                      onChange={(e) =>
                        setForms((prev) => ({
                          ...prev,
                          [form.id]: { email: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded border border-[#8c8f94] px-3 py-2"
                    />
                  </label>
                ))}
              </div>
            </details>
          ))}
        </article>
      ))}
    </div>
  );
}
