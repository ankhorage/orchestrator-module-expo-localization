import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { WriteFileInstruction } from '@ankhorage/orchestrator';

const TEMPLATE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../templates');
const templateCache = new Map<string, string>();
const defaultTranslations = {
  de: readJsonTemplate('locales/de.json.tpl'),
  en: readJsonTemplate('locales/en.json.tpl'),
} as const;

export function buildLocalizationWriteFiles(args: {
  defaultLocale: string;
  locales: string[];
  translations: Record<string, Record<string, string>>;
}): WriteFileInstruction[] {
  const { defaultLocale, locales, translations } = args;

  return [
    {
      path: 'src/plugins/localization/i18n.ts',
      content: renderTemplate('i18n.ts.tpl', {
        DEFAULT_LOCALE: JSON.stringify(defaultLocale),
      }),
      overwrite: true,
    },
    {
      path: 'src/plugins/localization/useT.ts',
      content: readTemplate('useT.ts.tpl'),
      overwrite: true,
    },
    {
      path: 'src/plugins/localization/runtimeLocalization.ts',
      content: readTemplate('runtimeLocalization.ts.tpl'),
      overwrite: true,
    },
    {
      path: 'src/plugins/localization/LocalizationProvider.tsx',
      content: renderTemplate('LocalizationProvider.tsx.tpl', {
        DEFAULT_LOCALE: JSON.stringify(defaultLocale),
        RESOURCE_LINES: locales
          .map(
            (locale) =>
              `      ${JSON.stringify(locale)}: { translation: require("./locales/${locale}.json") },`,
          )
          .join('\n'),
      }),
      overwrite: true,
    },
    {
      path: 'src/plugins/localization/index.ts',
      content: readTemplate('index.ts.tpl'),
      overwrite: true,
    },
    ...buildLocaleJsonFiles(locales, translations),
  ];
}

function buildLocaleJsonFiles(
  locales: string[],
  configTranslations: Record<string, Record<string, string>>,
): WriteFileInstruction[] {
  return locales.map((locale) => {
    const contentSource =
      configTranslations[locale] ??
      (locale.startsWith('de') ? defaultTranslations.de : defaultTranslations.en);

    return {
      path: `src/plugins/localization/locales/${locale}.json`,
      content: `${JSON.stringify(contentSource, null, 2)}\n`,
    };
  });
}

function renderTemplate(templateName: string, replacements: Record<string, string>): string {
  let content = readTemplate(templateName);

  for (const [token, value] of Object.entries(replacements)) {
    content = content.replaceAll(`__${token}__`, value);
  }

  return content;
}

function readJsonTemplate(templateName: string): Record<string, string> {
  return JSON.parse(readTemplate(templateName)) as Record<string, string>;
}

function readTemplate(templateName: string): string {
  const cached = templateCache.get(templateName);
  if (cached) {
    return cached;
  }

  const templatePath = path.join(TEMPLATE_DIR, templateName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Missing localization template: ${templateName}`);
  }

  const content = fs.readFileSync(templatePath, 'utf8');
  templateCache.set(templateName, content);
  return content;
}
