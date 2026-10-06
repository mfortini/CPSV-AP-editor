import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import it from "./it.json";
import type { AppLang } from "../domain/types";

void i18n.use(initReactI18next).init({
  resources: {
    it: { translation: it },
    en: { translation: en },
  },
  lng: "it",
  fallbackLng: "it",
  interpolation: { escapeValue: false },
});

export function setAppLanguage(lang: AppLang) {
  void i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

export default i18n;
