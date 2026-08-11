import { Button, Card, Input, Select, Stack } from '@ankhorage/zora';
import { useEffect, useMemo, useState } from 'react';

import type { ExpoLocalizationAdminSnapshot } from '../admin/types';
import { EXPO_LOCALIZATION_ADMIN_OPERATIONS } from '../admin/runtime';

interface DictionaryEditorCardProps {
  readonly snapshot: ExpoLocalizationAdminSnapshot;
  readonly busy: boolean;
  readonly run: (operation: string, input?: unknown) => Promise<void>;
}

export function DictionaryEditorCard({ snapshot, busy, run }: DictionaryEditorCardProps) {
  const [locale, setLocale] = useState(snapshot.config.defaultLocale);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const localeOptions = useMemo(
    () => snapshot.config.locales.map((item) => ({ value: item, label: item })),
    [snapshot.config.locales],
  );

  useEffect(() => {
    if (!snapshot.config.locales.includes(locale)) setLocale(snapshot.config.defaultLocale);
  }, [locale, snapshot.config.defaultLocale, snapshot.config.locales]);

  useEffect(() => {
    setValue(snapshot.dictionaries[locale]?.[key] ?? '');
  }, [key, locale, snapshot.dictionaries]);

  return (
    <Card title="Dictionary entry" description="Edit the canonical locale JSON resources directly.">
      <Stack gap={8}>
        <Select value={locale} options={localeOptions} onValueChange={setLocale} disabled={busy} />
        <Input
          accessibilityLabel="Translation key"
          value={key}
          autoCapitalize="none"
          onChangeText={setKey}
        />
        <Input
          accessibilityLabel="Translation value"
          value={value}
          multiline
          onChangeText={setValue}
        />
        <Stack direction="row" gap={8}>
          <Button
            loading={busy}
            disabled={!key.trim()}
            onPress={() =>
              void run(EXPO_LOCALIZATION_ADMIN_OPERATIONS.setTranslation, {
                locale,
                key: key.trim(),
                value,
              })
            }
          >
            Save translation
          </Button>
          <Button
            variant="outline"
            color="danger"
            disabled={busy || !key.trim()}
            onPress={() =>
              void run(EXPO_LOCALIZATION_ADMIN_OPERATIONS.deleteTranslation, {
                locale,
                key: key.trim(),
              })
            }
          >
            Delete
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
