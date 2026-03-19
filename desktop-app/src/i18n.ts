import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';

import frTranslations from './locales/fr.json';
import deTranslations from './locales/de.json';
import esTranslations from './locales/es.json';
import ptTranslations from './locales/pt.json';
import jaTranslations from './locales/ja.json';
import arTranslations from './locales/ar.json';

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: enTranslations,
            fr: frTranslations,
            de: deTranslations,
            es: esTranslations,
            pt: ptTranslations,
            ja: jaTranslations,
            ar: arTranslations,
        },
        lng: 'en',
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React already safe from xss
        },
    });

export default i18n;
