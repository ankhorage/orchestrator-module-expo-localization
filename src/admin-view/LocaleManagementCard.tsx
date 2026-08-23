import { Button, Card, Input, Stack, Text } from '@ankhorage/zora';
import { useState } from 'react';

import { EXPO_LOCALIZATION_ADMIN_OPERATIONS } from '../admin/operations';
import type { ExpoLocalizationAdminSnapshot } from '../admin/types';

interface LocaleManagementCardProps {
  readonly snapshot: ExpoLocalizationAdminSnapshot;
  readonly busy: boolean;
  readonly run: (operation: string, input?: unknown) => Promise<void>;
}

export function LocaleManagementCard({ snapshot, busy, run }: LocaleManagementCardProps) {
  const [newLocale, setNewLocale] = useState('');
  const { config } = snapshot;

  return (
    <Card title="Locales" description="Configure supported locales and the default locale.">
      <Stack gap={8}>
        {config.locales.map((locale) => (
          <LocaleRow
            key={locale}
            locale={locale}
            defaultLocale={config.defaultLocale}
            canRemove={config.locales.length > 1}
            busy={busy}
            run={run}
          />
        ))}
        <Stack direction="row" gap={8} align="center">
          <Input
            accessibilityLabel="New locale"
            value={newLocale}
            autoCapitalize="none"
            onChangeText={setNewLocale}
          />
          <Button
            loading={busy}
            disabled={!newLocale.trim()}
            onPress={() => {
              const locale = newLocale.trim();
              setNewLocale('');
              void run(EXPO_LOCALIZATION_ADMIN_OPERATIONS.addLocale, { locale });
            }}
          >
            Add locale
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}

function LocaleRow(props: {
  readonly locale: string;
  readonly defaultLocale: string;
  readonly canRemove: boolean;
  readonly busy: boolean;
  readonly run: (operation: string, input?: unknown) => Promise<void>;
}) {
  const { locale, defaultLocale, canRemove, busy, run } = props;
  const isDefault = locale === defaultLocale;

  return (
    <Stack direction="row" gap={8} align="center" justify="space-between">
      <Text>{isDefault ? `${locale} (default)` : locale}</Text>
      <Stack direction="row" gap={8}>
        {!isDefault ? (
          <Button
            variant="outline"
            disabled={busy}
            onPress={() =>
              void run(EXPO_LOCALIZATION_ADMIN_OPERATIONS.setDefaultLocale, { locale })
            }
          >
            Make default
          </Button>
        ) : null}
        <Button
          variant="outline"
          color="danger"
          disabled={busy || !canRemove}
          onPress={() => void run(EXPO_LOCALIZATION_ADMIN_OPERATIONS.removeLocale, { locale })}
        >
          Remove
        </Button>
      </Stack>
    </Stack>
  );
}
