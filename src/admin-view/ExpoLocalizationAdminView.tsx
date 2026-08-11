import { Stack, Text } from '@ankhorage/zora';

import { DictionaryEditorCard } from './DictionaryEditorCard';
import { LocaleManagementCard } from './LocaleManagementCard';
import { MissingTranslationsCard } from './MissingTranslationsCard';
import { TranslatableFieldsCard } from './TranslatableFieldsCard';
import type { ExpoLocalizationAdminViewProps } from './types';
import { useLocalizationAdmin } from './useLocalizationAdmin';

export function ExpoLocalizationAdminView(props: ExpoLocalizationAdminViewProps) {
  const admin = useLocalizationAdmin(props);

  if (admin.loading && !admin.snapshot) {
    return <Text>Loading localization administration…</Text>;
  }
  if (!admin.snapshot) {
    return (
      <Text color="danger">{admin.message ?? 'Localization administration is unavailable.'}</Text>
    );
  }

  return (
    <Stack gap={12}>
      {admin.message ? <Text color="danger">{admin.message}</Text> : null}
      <LocaleManagementCard snapshot={admin.snapshot} busy={admin.busy} run={admin.run} />
      <DictionaryEditorCard snapshot={admin.snapshot} busy={admin.busy} run={admin.run} />
      <TranslatableFieldsCard
        snapshot={admin.snapshot}
        options={admin.options}
        busy={admin.busy}
        reload={admin.reload}
        run={admin.run}
      />
      <MissingTranslationsCard snapshot={admin.snapshot} />
    </Stack>
  );
}
