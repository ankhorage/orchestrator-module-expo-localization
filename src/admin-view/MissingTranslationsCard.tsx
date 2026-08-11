import { Card, Stack, Text } from '@ankhorage/zora';

import type { ExpoLocalizationAdminSnapshot } from '../admin/types';

export function MissingTranslationsCard({
  snapshot,
}: {
  readonly snapshot: ExpoLocalizationAdminSnapshot;
}) {
  return (
    <Card
      title="Missing translations"
      description="Keys that are incomplete across configured locales."
    >
      <Stack gap={6}>
        {snapshot.missingTranslations.length === 0 ? (
          <Text color="neutral" emphasis="muted">
            No missing translations.
          </Text>
        ) : (
          snapshot.missingTranslations.map((item) => (
            <Text key={item.key}>
              {item.key}: {item.missingLocales.join(', ')}
            </Text>
          ))
        )}
      </Stack>
    </Card>
  );
}
