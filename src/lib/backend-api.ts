function normalizeBase(base: string) {
  return base.replace(/\/$/, "");
}

export function getBackendApiBase() {
  const base =
    process.env.INTERNAL_BACKEND_API_BASE_URL ??
    process.env.BACKEND_API_BASE_URL ??
    "http://127.0.0.1:8080";

  return normalizeBase(base);
}

export function getPublicAppBase() {
  const base =
    process.env.PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://app.partenaire.io";

  return normalizeBase(base);
}
