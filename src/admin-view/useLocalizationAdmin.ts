import { useCallback, useEffect, useState } from 'react';

import { EXPO_LOCALIZATION_ADMIN_OPERATIONS } from '../admin/operations';
import type {
  ExpoLocalizationAdminLoadOptions,
  ExpoLocalizationAdminSnapshot,
} from '../admin/types';
import { readExpoLocalizationAdminSnapshot } from './readSnapshot';
import type { ExpoLocalizationAdminViewProps } from './types';

export function useLocalizationAdmin({ execute, onProjectChange }: ExpoLocalizationAdminViewProps) {
  const [snapshot, setSnapshot] = useState<ExpoLocalizationAdminSnapshot | null>(null);
  const [options, setOptions] = useState<ExpoLocalizationAdminLoadOptions>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(
    async (nextOptions: ExpoLocalizationAdminLoadOptions = options) => {
      setLoading(true);
      try {
        const result = await execute(EXPO_LOCALIZATION_ADMIN_OPERATIONS.load, nextOptions);
        setSnapshot(readExpoLocalizationAdminSnapshot(result));
        setOptions(nextOptions);
        setMessage(null);
      } catch (error) {
        setMessage(toMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [execute, options],
  );

  const run = useCallback(
    async (operation: string, input?: unknown) => {
      setBusy(true);
      setMessage(null);
      try {
        await execute(operation, input);
        await onProjectChange?.();
        await reload();
      } catch (error) {
        setMessage(toMessage(error));
      } finally {
        setBusy(false);
      }
    },
    [execute, onProjectChange, reload],
  );

  useEffect(() => {
    void reload({});
  }, [execute]);

  return { snapshot, options, loading, busy, message, reload, run };
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
