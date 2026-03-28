"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  LANGUAGE_COOKIE_NAME,
  normalizeCommandCenterLanguage,
  type CommandCenterLanguage,
} from "@/lib/language";

type LanguageContextValue = {
  language: CommandCenterLanguage;
  setLanguage: (language: CommandCenterLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function persistLanguage(language: CommandCenterLanguage) {
  if (typeof document === "undefined") return;

  document.documentElement.lang = language;
  document.cookie = `${LANGUAGE_COOKIE_NAME}=${language}; path=/; max-age=31536000; samesite=lax`;

  try {
    window.localStorage.setItem(LANGUAGE_COOKIE_NAME, language);
  } catch {
    // Ignore storage issues and keep the cookie/document state in sync.
  }
}

export function LanguageProvider(props: {
  children: React.ReactNode;
  initialLanguage: CommandCenterLanguage;
}) {
  const { children, initialLanguage } = props;
  const [language, setLanguageState] = useState<CommandCenterLanguage>(() => {
    if (typeof window === "undefined") {
      return initialLanguage;
    }

    try {
      return normalizeCommandCenterLanguage(
        window.localStorage.getItem(LANGUAGE_COOKIE_NAME),
        initialLanguage,
      );
    } catch {
      return initialLanguage;
    }
  });

  const setLanguage = useCallback((nextLanguage: CommandCenterLanguage) => {
    const normalized = normalizeCommandCenterLanguage(nextLanguage);
    setLanguageState(normalized);
    persistLanguage(normalized);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;

    persistLanguage(language);
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
    }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }

  return context;
}
