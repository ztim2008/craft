"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PreviewUploadStatus = "idle" | "ready" | "saving" | "saved" | "error";

type Props = {
  blockId: string;
  previewUrl?: string;
  disabled?: boolean;
  onUploaded: (previewUrl: string, meta?: { bytes?: number }, catalog?: unknown) => void;
};

function absUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (typeof window !== "undefined") return `${window.location.origin}${url}`;
  return url;
}

export function BlockPreviewGallery({ blockId, previewUrl, disabled, onUploaded }: Props) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<PreviewUploadStatus>("idle");
  const [statusText, setStatusText] = useState("Вставьте скриншот (Ctrl+V) или выберите файл");
  const [savedUrl, setSavedUrl] = useState(previewUrl || "");

  useEffect(() => {
    setSavedUrl(previewUrl || "");
    if (!pendingFile) setLocalPreview(null);
  }, [previewUrl, blockId, pendingFile]);

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const setReadyFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setStatus("error");
      setStatusText("Нужно изображение (PNG, JPG, WebP)");
      return;
    }
    if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
    setPendingFile(file);
    setLocalPreview(URL.createObjectURL(file));
    setStatus("ready");
    setStatusText(`Готово к сохранению · ${(file.size / 1024).toFixed(0)} КБ`);
  }, [localPreview]);

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (disabled) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (!item.type.startsWith("image/")) continue;
        e.preventDefault();
        const file = item.getAsFile();
        if (file) setReadyFile(file);
        return;
      }
      if (e.clipboardData?.files?.length) {
        const file = e.clipboardData.files[0];
        if (file?.type.startsWith("image/")) {
          e.preventDefault();
          setReadyFile(file);
        }
      }
    },
    [disabled, setReadyFile],
  );

  useEffect(() => {
    const el = zoneRef.current;
    if (!el) return;
    el.addEventListener("paste", handlePaste);
    return () => el.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  async function savePreview() {
    if (!pendingFile || disabled) return;
    setStatus("saving");
    setStatusText("Сохраняем и оптимизируем…");
    try {
      const fd = new FormData();
      fd.append("file", pendingFile);
      const res = await fetch(`/api/admin/craftum-blocks/${encodeURIComponent(blockId)}/preview`, {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        error?: string;
        previewUrl?: string;
        catalog?: unknown;
        meta?: { bytes?: number };
      };
      if (!res.ok) throw new Error(data.error || "Ошибка сохранения");

      const url = data.previewUrl || "";
      setSavedUrl(url);
      setPendingFile(null);
      if (localPreview?.startsWith("blob:")) URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
      setStatus("saved");
      const kb = data.meta?.bytes ? `${Math.round(data.meta.bytes / 1024)} КБ WebP` : "WebP 4:3";
      setStatusText(`✓ Сохранено · ${kb}`);
      onUploaded(url, data.meta, data.catalog);

      window.setTimeout(() => {
        setStatus("idle");
        setStatusText("Вставьте скриншот (Ctrl+V) или выберите файл");
      }, 4000);
    } catch (e) {
      setStatus("error");
      setStatusText(e instanceof Error ? e.message : "Ошибка сохранения");
    }
  }

  const displaySrc = localPreview || (savedUrl ? absUrl(savedUrl) : null);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-[#1d2327]">Превью блока (4:3)</p>

      <div
        ref={zoneRef}
        tabIndex={0}
        role="button"
        onClick={() => zoneRef.current?.focus()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") zoneRef.current?.focus();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add("ring-2", "ring-[#2271b1]");
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove("ring-2", "ring-[#2271b1]");
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("ring-2", "ring-[#2271b1]");
          const file = e.dataTransfer.files?.[0];
          if (file) setReadyFile(file);
        }}
        className="rounded-lg border-2 border-dashed border-[#c3c4c7] bg-[#f6f7f7] p-2 outline-none transition focus:border-[#2271b1] focus:ring-2 focus:ring-[#2271b1]/30"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-[#e8e8e8]">
          {displaySrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displaySrc}
              alt="Превью блока"
              className="h-full w-full object-contain object-center"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-sm text-[#646970]">
              <span className="text-2xl">🖼️</span>
              <span>Ctrl+V — вставить скриншот</span>
              <span className="text-xs">или перетащите файл сюда</span>
            </div>
          )}
          {status === "ready" && (
            <span className="absolute left-2 top-2 rounded bg-amber-500 px-2 py-0.5 text-xs text-white">
              не сохранено
            </span>
          )}
        </div>
        <p className="mt-2 text-center text-xs text-[#646970]">
          Кликните в область и Ctrl+V · весь блок влезает в кадр 4:3
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || status === "saving"}
          onClick={() => fileInputRef.current?.click()}
          className="rounded border border-[#c3c4c7] bg-white px-3 py-2 text-sm hover:bg-[#f6f7f7] disabled:opacity-50"
        >
          Выбрать файл…
        </button>
        <button
          type="button"
          disabled={disabled || !pendingFile || status === "saving"}
          onClick={() => void savePreview()}
          className="rounded bg-[#2271b1] px-4 py-2 text-sm font-medium text-white hover:bg-[#135e96] disabled:opacity-50"
        >
          {status === "saving" ? "Сохраняем…" : "Сохранить превью"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setReadyFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <p
        className={`text-sm ${
          status === "saved"
            ? "text-green-700"
            : status === "error"
              ? "text-red-700"
              : status === "ready"
                ? "text-amber-800"
                : "text-[#646970]"
        }`}
        aria-live="polite"
      >
        {statusText}
      </p>

      {savedUrl && !pendingFile && (
        <p className="truncate font-mono text-xs text-[#a7aaad]">{savedUrl}</p>
      )}
    </div>
  );
}
