import { Button, Input, Stack, Text } from '@ankhorage/zora';
import { useEffect, useState } from 'react';

import type { ExpoLocalizationTranslatableField } from '../authoring';
import { createExpoLocalizationKeyFromText } from '../authoring';
import { EXPO_LOCALIZATION_ADMIN_OPERATIONS } from '../admin/runtime';

interface TranslatableFieldRowProps {
  readonly field: ExpoLocalizationTranslatableField;
  readonly missingLocales: readonly string[];
  readonly busy: boolean;
  readonly run: (operation: string, input?: unknown) => Promise<void>;
}

export function TranslatableFieldRow({
  field,
  missingLocales,
  busy,
  run,
}: TranslatableFieldRowProps) {
  const [key, setKey] = useState(
    field.currentKey || createExpoLocalizationKeyFromText(field.defaultText),
  );

  useEffect(() => {
    setKey(field.currentKey || createExpoLocalizationKeyFromText(field.defaultText));
  }, [field.currentKey, field.defaultText]);

  return (
    <Stack gap={6}>
      <Text weight="semiBold">{field.path}</Text>
      <Text color="neutral" emphasis="muted" variant="caption">
        {field.defaultText || 'No default text'}
      </Text>
      {missingLocales.length > 0 ? (
        <Text color="danger" variant="caption">
          Missing: {missingLocales.join(', ')}
        </Text>
      ) : null}
      <Stack direction="row" gap={8} align="center">
        <Input
          accessibilityLabel={`Translation key for ${field.path}`}
          value={key}
          autoCapitalize="none"
          onChangeText={setKey}
        />
        <Button
          variant={field.currentKey ? 'outline' : 'solid'}
          disabled={busy || !key.trim()}
          onPress={() =>
            void run(EXPO_LOCALIZATION_ADMIN_OPERATIONS.linkTranslationKey, {
              screenId: field.screenId,
              nodeId: field.nodeId,
              keyProp: field.keyProp,
              key: key.trim(),
            })
          }
        >
          {field.currentKey ? 'Relink' : 'Link'}
        </Button>
      </Stack>
    </Stack>
  );
}
