export type ClientContextEditableField =
  | "website"
  | "notes"
  | "meta_account_id"
  | "google_ads_customer_id"
  | "facebook_url"
  | "instagram_url"
  | "tiktok_url"
  | "youtube_url"
  | "linkedin_url"
  | "asana_project_id"
  | "slack_channel_id"
  | "google_drive_folder_id";

function normalizeEmpty(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol =
    /^https?:\/\//i.test(trimmed) || trimmed.startsWith("mailto:")
      ? trimmed
      : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return url.toString().replace(/\/$/, "");
  } catch {
    return trimmed;
  }
}

function extractGoogleDriveFolderId(value: string) {
  const folderMatch = value.match(/\/folders\/([^/?#]+)/i);
  if (folderMatch?.[1]) return folderMatch[1];

  const idMatch = value.match(/[?&]id=([^&#]+)/i);
  if (idMatch?.[1]) return idMatch[1];

  return value.trim();
}

function extractAsanaProjectId(value: string) {
  const projectMatch = value.match(/\/project\/(\d+)/i);
  if (projectMatch?.[1]) return projectMatch[1];

  const legacyMatch = value.match(/\/0\/\d+\/(\d+)/);
  if (legacyMatch?.[1]) return legacyMatch[1];

  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly.length >= 8 ? digitsOnly : value.trim();
}

function extractSlackChannelId(value: string) {
  const archiveMatch = value.match(/\/archives\/([A-Z0-9]+)/i);
  if (archiveMatch?.[1]) return archiveMatch[1].toUpperCase();

  const clientMatch = value.match(/\/client\/[A-Z0-9]+\/([A-Z0-9]+)/i);
  if (clientMatch?.[1]) return clientMatch[1].toUpperCase();

  return value.trim().toUpperCase();
}

function extractGoogleAdsCustomerId(value: string) {
  const customerParam = value.match(/[?&](?:customerId|customer_id)=([0-9-]+)/i);
  if (customerParam?.[1]) value = customerParam[1];

  const dottedMatch = value.match(/(?:^|[^0-9])(\d{3}-?\d{3}-?\d{4})(?:[^0-9]|$)/);
  const rawDigits = (dottedMatch?.[1] ?? value).replace(/\D/g, "");

  if (rawDigits.length === 10) {
    return `${rawDigits.slice(0, 3)}-${rawDigits.slice(3, 6)}-${rawDigits.slice(6)}`;
  }

  return value.trim();
}

function extractMetaAccountId(value: string) {
  const actParam = value.match(/[?&]act=(\d+)/i);
  if (actParam?.[1]) return `act_${actParam[1]}`;

  const prefixedMatch = value.match(/act_(\d+)/i);
  if (prefixedMatch?.[1]) return `act_${prefixedMatch[1]}`;

  const digitsOnly = value.replace(/\D/g, "");
  if (digitsOnly.length >= 6) {
    return `act_${digitsOnly}`;
  }

  return value.trim();
}

export function normalizeClientContextField(
  field: ClientContextEditableField,
  value: unknown,
) {
  const normalized = normalizeEmpty(value);

  if (normalized === null) return null;

  switch (field) {
    case "website":
    case "facebook_url":
    case "instagram_url":
    case "tiktok_url":
    case "youtube_url":
    case "linkedin_url":
      return normalizeUrl(normalized);
    case "meta_account_id":
      return extractMetaAccountId(normalized);
    case "google_ads_customer_id":
      return extractGoogleAdsCustomerId(normalized);
    case "asana_project_id":
      return extractAsanaProjectId(normalized);
    case "slack_channel_id":
      return extractSlackChannelId(normalized);
    case "google_drive_folder_id":
      return extractGoogleDriveFolderId(normalized);
    default:
      return normalized;
  }
}
