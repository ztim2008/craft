"use client";

import { useMemo, useState } from "react";
import type { ContentOverlay, FieldPatch, FormPatch, HtmlBlock, HtmlBlockPosition } from "@/modules/content/types";
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
  const [htmlBlocks, setHtmlBlocks] = useState<HtmlBlock[]>(initial.htmlBlocks || []);
  const [draftHtml, setDraftHtml] = useState("");
  const [draftSection, setDraftSection] = useState("");
  const [draftPosition, setDraftPosition] = useState<HtmlBlockPosition>("after");
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
        body: JSON.stringify({ fields, forms, htmlBlocks }),
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
          правок: {counts.dirty} · формы: {counts.forms} · HTML-блоки: {htmlBlocks.length}
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

      <section className="space-y-3 rounded border border-[#c3c4c7] bg-white p-4">
        <h2 className="font-medium">HTML-блоки</h2>
        <p className="text-sm text-[#50575e]">
          Вставка своего HTML / style / script до или после секции Craftum. Не пересобирает страницу в React.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-xs uppercase text-[#50575e]">Секция</span>
            <select
              value={draftSection}
              onChange={(e) => setDraftSection(e.target.value)}
              className="mt-1 w-full rounded border border-[#8c8f94] px-3 py-2"
            >
              <option value="">Выберите секцию</option>
              {model.pages.flatMap((page) =>
                page.sections.map((section) => (
                  <option key={`${page.path}:${section.id}`} value={section.id}>
                    {page.path} · {section.label}
                  </option>
                )),
              )}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-xs uppercase text-[#50575e]">Позиция</span>
            <select
              value={draftPosition}
              onChange={(e) => setDraftPosition(e.target.value as HtmlBlockPosition)}
              className="mt-1 w-full rounded border border-[#8c8f94] px-3 py-2"
            >
              <option value="after">После секции (карта, отзывы, виджет)</option>
              <option value="before">Перед секцией</option>
              <option value="head">В head</option>
              <option value="bodyStart">После body</option>
              <option value="bodyEnd">Перед /body</option>
            </select>
          </label>
        </div>
        <textarea
          value={draftHtml}
          onChange={(e) => setDraftHtml(e.target.value)}
          rows={8}
          placeholder="<style>…</style> или разметка"
          className="w-full rounded border border-[#8c8f94] px-3 py-2 font-mono text-xs"
        />
        <button
          type="button"
          onClick={() => {
            const slot = draftPosition === "head" || draftPosition === "bodyStart" || draftPosition === "bodyEnd";
            if (!draftHtml.trim() || (!slot && !draftSection)) return;
            setHtmlBlocks((prev) => [
              ...prev,
              {
                id: `hb-${Date.now().toString(36)}`,
                sectionId: slot ? "" : draftSection,
                position: draftPosition,
                html: draftHtml,
              },
            ]);
            setDraftHtml("");
          }}
          className="rounded bg-[#1d2327] px-4 py-2 text-sm font-medium text-white"
        >
          Добавить блок
        </button>
        {htmlBlocks.length === 0 ? (
          <p className="text-sm text-[#50575e]">Пока нет блоков.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {htmlBlocks.map((block) => (
              <li key={block.id} className="rounded border border-[#dcdcde] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {block.position} · {block.sectionId || "сайт"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHtmlBlocks((prev) => prev.filter((item) => item.id !== block.id))}
                    className="text-xs text-[#d63638]"
                  >
                    Удалить
                  </button>
                </div>
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs text-[#50575e]">
                  {block.html}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
