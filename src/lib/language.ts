export type CommandCenterLanguage = "fr" | "en";

export const LANGUAGE_COOKIE_NAME = "cc_lang";
export const DEFAULT_LANGUAGE: CommandCenterLanguage = "fr";

export function isCommandCenterLanguage(value: unknown): value is CommandCenterLanguage {
  return value === "fr" || value === "en";
}

export function normalizeCommandCenterLanguage(
  value: unknown,
  fallback: CommandCenterLanguage = DEFAULT_LANGUAGE,
): CommandCenterLanguage {
  return isCommandCenterLanguage(value) ? value : fallback;
}

export function getLanguageLocale(language: CommandCenterLanguage) {
  return language === "fr" ? "fr-CA" : "en-CA";
}

export function getLanguageName(language: CommandCenterLanguage) {
  return language === "fr" ? "French (Canada)" : "English";
}
