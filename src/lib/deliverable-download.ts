export type DeliverableDownloadInput = {
  clientName: string;
  content: string;
  fileBaseName?: string;
  industry?: string;
  language?: "fr" | "en";
  type?: string;
};

function sanitizeFilePart(value: string, fallback: string) {
  const normalized = value
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || fallback;
}

function createDownload(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function readExportError(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
    if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
  }

  const raw = await response.text().catch(() => "");
  return raw.trim() || null;
}

export function buildDeliverableFileBase(
  type: string | null | undefined,
  clientName: string | null | undefined,
) {
  return `${sanitizeFilePart(type || "deliverable", "deliverable")}_${sanitizeFilePart(clientName || "client", "client")}`;
}

export async function downloadDeliverableDocx(input: DeliverableDownloadInput) {
  const response = await fetch("/api/deliverable/export-docx", {
    body: JSON.stringify({
      client_name: input.clientName,
      content: input.content,
      industry: input.industry || "",
      language: input.language || "fr",
      type: input.type || "deliverable",
    }),
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const contentType = response.headers.get("content-type") || "";

  if (!response.ok || contentType.includes("application/json")) {
    const message = await readExportError(response);
    throw new Error(message || "Impossible d'exporter ce livrable.");
  }

  const blob = await response.blob();
  createDownload(`${input.fileBaseName || buildDeliverableFileBase(input.type, input.clientName)}.docx`, blob);
}

export function downloadDeliverableMarkdown(input: DeliverableDownloadInput) {
  const blob = new Blob([input.content], {
    type: "text/markdown;charset=utf-8",
  });

  createDownload(
    `${input.fileBaseName || buildDeliverableFileBase(input.type, input.clientName)}.md`,
    blob,
  );
}
