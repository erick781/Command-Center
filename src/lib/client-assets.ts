import { createClient } from "@supabase/supabase-js";

import { getBackendApiBase } from "@/lib/backend-api";

export const CLIENT_ASSET_BUCKET = "client-context-assets";
const CLIENT_ASSET_URL_TTL_SECONDS = 60 * 60;
const CLIENT_ASSET_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

export type ClientAsset = {
  contentType: string | null;
  createdAt: string | null;
  fileName: string;
  path: string;
  signedUrl: string | null;
  sizeBytes: number | null;
};

type ExtractedReferenceFile = {
  excerpt?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  status?: string | null;
};

let ensureBucketPromise: Promise<void> | null = null;

function normalizeSafeFileName(fileName: string) {
  const trimmed = fileName.trim();
  const normalized = trimmed
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "upload";
}

function getAdminStorageClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "";

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase service storage is not configured.");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function ensureClientAssetBucket() {
  if (ensureBucketPromise) {
    return ensureBucketPromise;
  }

  ensureBucketPromise = (async () => {
    const supabase = getAdminStorageClient();
    const { data, error } = await supabase.storage.listBuckets();

    if (error) {
      throw error;
    }

    const exists = (data ?? []).some((bucket) => bucket.name === CLIENT_ASSET_BUCKET);

    if (!exists) {
      const { error: createError } = await supabase.storage.createBucket(CLIENT_ASSET_BUCKET, {
        fileSizeLimit: CLIENT_ASSET_MAX_FILE_SIZE_BYTES,
        public: false,
      });

      if (createError && !/already exists/i.test(createError.message)) {
        throw createError;
      }
    } else {
      const { error: updateError } = await supabase.storage.updateBucket(CLIENT_ASSET_BUCKET, {
        fileSizeLimit: CLIENT_ASSET_MAX_FILE_SIZE_BYTES,
        public: false,
      });

      if (updateError && !/not modified/i.test(updateError.message)) {
        throw updateError;
      }
    }
  })().catch((error) => {
    ensureBucketPromise = null;
    throw error;
  });

  return ensureBucketPromise;
}

function mapAssetRow(
  clientId: string,
  item: {
    created_at?: string | null;
    metadata?: { mimetype?: string; size?: number } | null;
    name: string;
    updated_at?: string | null;
  },
  signedUrl: string | null,
): ClientAsset {
  return {
    contentType:
      typeof item.metadata?.mimetype === "string" ? item.metadata.mimetype : null,
    createdAt: item.created_at ?? item.updated_at ?? null,
    fileName: item.name,
    path: `${clientId}/${item.name}`,
    signedUrl,
    sizeBytes: typeof item.metadata?.size === "number" ? item.metadata.size : null,
  };
}

export async function listClientAssets(clientId: string): Promise<ClientAsset[]> {
  await ensureClientAssetBucket();

  const supabase = getAdminStorageClient();
  const { data, error } = await supabase.storage
    .from(CLIENT_ASSET_BUCKET)
    .list(clientId, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });

  if (error) {
    throw error;
  }

  const items = (data ?? []).filter((item) => item.name && !item.id?.endsWith("/"));

  const signed = await Promise.all(
    items.map(async (item) => {
      const assetPath = `${clientId}/${item.name}`;
      const { data: signedData, error: signedError } = await supabase.storage
        .from(CLIENT_ASSET_BUCKET)
        .createSignedUrl(assetPath, CLIENT_ASSET_URL_TTL_SECONDS);

      if (signedError) {
        return mapAssetRow(clientId, item, null);
      }

      return mapAssetRow(clientId, item, signedData?.signedUrl ?? null);
    }),
  );

  return signed;
}

export async function uploadClientAssets(clientId: string, files: File[]) {
  await ensureClientAssetBucket();

  const supabase = getAdminStorageClient();

  for (const file of files) {
    const safeName = normalizeSafeFileName(file.name);
    const objectPath = `${clientId}/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from(CLIENT_ASSET_BUCKET).upload(objectPath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      throw error;
    }
  }

  return listClientAssets(clientId);
}

export async function deleteClientAsset(clientId: string, path: string) {
  if (!path.startsWith(`${clientId}/`)) {
    throw new Error("Invalid asset path.");
  }

  await ensureClientAssetBucket();

  const supabase = getAdminStorageClient();
  const { error } = await supabase.storage.from(CLIENT_ASSET_BUCKET).remove([path]);

  if (error) {
    throw error;
  }

  return listClientAssets(clientId);
}

export function buildClientAssetContextBlock(assets: ClientAsset[]) {
  if (!Array.isArray(assets) || assets.length === 0) {
    return "";
  }

  return [
    "Reference files:",
    ...assets.slice(0, 12).map((asset) => {
      const details = [
        asset.contentType || null,
        typeof asset.sizeBytes === "number" ? `${Math.round(asset.sizeBytes / 1024)} KB` : null,
      ].filter(Boolean);

      return `- ${asset.fileName}${details.length ? ` (${details.join(", ")})` : ""}`;
    }),
  ].join("\n");
}

export async function buildExtractedClientAssetContextBlock(
  assets: ClientAsset[],
  language: "fr" | "en" = "fr",
) {
  const baseBlock = buildClientAssetContextBlock(assets);
  const files = assets
    .filter((asset) => typeof asset.signedUrl === "string" && asset.signedUrl)
    .slice(0, 4)
    .map((asset) => ({
      content_type: asset.contentType,
      file_name: asset.fileName,
      signed_url: asset.signedUrl,
    }));

  if (files.length === 0) {
    return baseBlock;
  }

  try {
    const response = await fetch(`${getBackendApiBase()}/api/context/reference-files/extract`, {
      body: JSON.stringify({
        files,
        max_chars_per_file: 2800,
        max_files: 4,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    const payload = (await response.json().catch(() => null)) as
      | { files?: ExtractedReferenceFile[] | null }
      | null;

    if (!response.ok) {
      return baseBlock;
    }

    const extracted = Array.isArray(payload?.files)
      ? payload.files.filter(
          (file): file is ExtractedReferenceFile =>
            typeof file?.excerpt === "string" && file.excerpt.trim().length > 0,
        )
      : [];

    if (extracted.length === 0) {
      return baseBlock;
    }

    return [
      baseBlock,
      language === "fr" ? "Extraits utiles des fichiers :" : "Useful file excerpts:",
      ...extracted.map((file) => {
        const fileName = file.file_name || "reference";
        const fileType = file.file_type || "file";
        return `- ${fileName} (${fileType}):\n${file.excerpt}`;
      }),
    ]
      .filter(Boolean)
      .join("\n\n");
  } catch {
    return baseBlock;
  }
}
