import { createContext, useContext, useEffect, useMemo, useState } from "react";
import de from "./de";
import en from "./en";

export const SUPPORTED_LANGUAGES = ["de", "en"];
export const LANGUAGE_STORAGE_KEY = "etf.lang.v1";

const dictionaries = { de, en };
const listeners = new Set();

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (SUPPORTED_LANGUAGES.includes(stored)) {
      return stored;
    }
  } catch {
    // ignore missing storage
  }
  return "de";
}

let currentLanguage = typeof window === "undefined" ? "de" : readStoredLanguage();

function lookup(source, key) {
  return key.split(".").reduce((acc, part) => (acc == null ? undefined : acc[part]), source);
}

function translate(language, key, vars) {
  const primary = lookup(dictionaries[language] || dictionaries.de, key);
  const value = typeof primary === "string" ? primary : lookup(dictionaries.de, key);
  if (typeof value !== "string") {
    return key;
  }

  return value.replace(/\{(\w+)\}/g, (_, name) => (
    vars?.[name] == null ? `{${name}}` : String(vars[name])
  ));
}

export function getLanguage() {
  return currentLanguage;
}

export function getLocale() {
  return currentLanguage === "en" ? "en-GB" : "de-DE";
}

export function setLanguage(next) {
  if (!SUPPORTED_LANGUAGES.includes(next) || next === currentLanguage) {
    return;
  }
  currentLanguage = next;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
  } catch {
    // ignore quota / private mode
  }
  listeners.forEach((listener) => listener(next));
}

export function t(key, vars) {
  return translate(currentLanguage, key, vars);
}

export function formatDateTime(value) {
  if (value == null || value === "") {
    return t("common.dash");
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t("common.dash");
  }
  return date.toLocaleString(getLocale());
}

const I18nContext = createContext({
  language: "de",
  locale: "de-DE",
  setLanguage,
  t
});

export function I18nProvider({ children }) {
  const [language, setLang] = useState(getLanguage);

  useEffect(() => {
    const onChange = (next) => setLang(next);
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  }, []);

  const value = useMemo(() => ({
    language,
    locale: language === "en" ? "en-GB" : "de-DE",
    setLanguage,
    t: (key, vars) => translate(language, key, vars)
  }), [language]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export const LOCALE = "de-DE";
export const LANGUAGE = "de";
