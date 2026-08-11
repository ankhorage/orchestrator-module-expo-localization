import { Button, Card, Input, type SelectOption, Select, Stack, Text } from '@ankhorage/zora';
import { useEffect, useState } from 'react';

import type {
  ExpoLocalizationAdminLoadOptions,
  ExpoLocalizationAdminSnapshot,
} from '../admin/types';
import { TranslatableFieldRow } from './TranslatableFieldRow';

type Filter = NonNullable<ExpoLocalizationAdminLoadOptions['filter']>;

const FILTER_OPTIONS: readonly SelectOption<Filter>[] = [
  { value: 'all', label: 'All fields' },
  { value: 'unlinked', label: 'Unlinked' },
  { value: 'missing-translations', label: 'Missing translations' },
  { value: 'incomplete', label: 'Incomplete' },
];

interface TranslatableFieldsCardProps {
  readonly snapshot: ExpoLocalizationAdminSnapshot;
  readonly options: ExpoLocalizationAdminLoadOptions;
  readonly busy: boolean;
  readonly reload: (options: ExpoLocalizationAdminLoadOptions) => Promise<void>;
  readonly run: (operation: string, input?: unknown) => Promise<void>;
}

export function TranslatableFieldsCard(props: TranslatableFieldsCardProps) {
  const [searchQuery, setSearchQuery] = useState(props.options.searchQuery ?? '');
  const [filter, setFilter] = useState<Filter>(props.options.filter ?? 'all');

  useEffect(() => setSearchQuery(props.options.searchQuery ?? ''), [props.options.searchQuery]);
  useEffect(() => setFilter(props.options.filter ?? 'all'), [props.options.filter]);

  return (
    <Card
      title="Translatable fields"
      description="Discover and link fields from component metadata."
    >
      <Stack gap={10}>
        <Stack direction="row" gap={8} align="center">
          <Input
            accessibilityLabel="Search translatable fields"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <Select value={filter} options={FILTER_OPTIONS} onValueChange={setFilter} />
          <Button
            variant="outline"
            disabled={props.busy}
            onPress={() => void props.reload({ searchQuery, filter })}
          >
            Apply
          </Button>
        </Stack>
        {props.snapshot.visibleFields.length === 0 ? (
          <Text color="neutral" emphasis="muted">
            No matching translatable fields.
          </Text>
        ) : (
          props.snapshot.visibleFields.map((field) => (
            <TranslatableFieldRow
              key={`${field.screenId}:${field.nodeId}:${field.keyProp}`}
              field={field}
              missingLocales={
                props.snapshot.missingTranslations.find((item) => item.key === field.currentKey)
                  ?.missingLocales ?? []
              }
              busy={props.busy}
              run={props.run}
            />
          ))
        )}
      </Stack>
    </Card>
  );
}
