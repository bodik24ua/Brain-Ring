// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpApi) // Loads translations from your server
  .use(LanguageDetector) // Detects user language
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    supportedLngs: ['en', 'uk', 'sv', 'es', 'de'],
    fallbackLng: 'en', // Use English if detected language is not available
    debug: true, // Logs info to console
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    backend: {
      // Path where translations will be stored
      loadPath: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/locales/{{lng}}/{{ns}}.json`,
    },
  });

export default i18n;
