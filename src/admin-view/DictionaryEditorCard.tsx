import { Button, Card, Input, Select, Stack } from '@ankhorage/zora';
import { useState } from 'react';

import { EXPO_LOCALIZATION_ADMIN_OPERATIONS } from '../admin/operations';
import type { ExpoLocalizationAdminSnapshot } from '../admin/types';

interface DictionaryEditorCardProps {
  readonly snapshot: ExpoLocalizationAdminSnapshot;
  readonly busy: boolean;
  readonly run: (operation: string, input?: unknown) => Promise<void>;
}

export function DictionaryEditorCard({ snapshot, busy, run }: DictionaryEditorCardProps) {
  const [locale, setLocale] = useState(snapshot.config.defaultLocale);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const localeOptions = snapshot.config.locales.map((item) => ({ value: item, label: item }));

  return (
    <Card title="Dictionary entry" description="Edit the canonical locale JSON resources directly.">
      <Stack gap={8}>
        <Select
          value={locale}
          options={localeOptions}
          onValueChange={(nextLocale) => {
            setLocale(nextLocale);
            setValue(readTranslation(snapshot, nextLocale, key));
          }}
          disabled={busy}
        />
        <Input
          accessibilityLabel="Translation key"
          value={key}
          autoCapitalize="none"
          onChangeText={(nextKey) => {
            setKey(nextKey);
            setValue(readTranslation(snapshot, locale, nextKey));
          }}
        />
        <Input
          accessibilityLabel="Translation value"
          value={value}
          multiline
          onChangeText={setValue}
        />
        <DictionaryEntryActions
          locale={locale}
          translationKey={key}
          value={value}
          busy={busy}
          run={run}
        />
      </Stack>
    </Card>
  );
}

function DictionaryEntryActions(props: {
  readonly locale: string;
  readonly translationKey: string;
  readonly value: string;
  readonly busy: boolean;
  readonly run: (operation: string, input?: unknown) => Promise<void>;
}) {
  const { locale, translationKey, value, busy, run } = props;
  const normalizedKey = translationKey.trim();

  return (
    <Stack direction="row" gap={8}>
      <Button
        loading={busy}
        disabled={!normalizedKey}
        onPress={() =>
          void run(EXPO_LOCALIZATION_ADMIN_OPERATIONS.setTranslation, {
            locale,
            key: normalizedKey,
            value,
          })
        }
      >
        Save translation
      </Button>
      <Button
        variant="outline"
        color="danger"
        disabled={busy || !normalizedKey}
        onPress={() =>
          void run(EXPO_LOCALIZATION_ADMIN_OPERATIONS.deleteTranslation, {
            locale,
            key: normalizedKey,
          })
        }
      >
        Delete
      </Button>
    </Stack>
  );
}

function readTranslation(
  snapshot: ExpoLocalizationAdminSnapshot,
  locale: string,
  key: string,
): string {
  const dictionary = Object.entries(snapshot.dictionaries).find(([name]) => name === locale)?.[1];
  return Object.entries(dictionary ?? {}).find(([name]) => name === key)?.[1] ?? '';
}
