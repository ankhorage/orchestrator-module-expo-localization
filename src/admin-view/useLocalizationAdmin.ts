import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react';

import { EXPO_LOCALIZATION_ADMIN_OPERATIONS } from '../admin/operations';
import type {
  ExpoLocalizationAdminLoadOptions,
  ExpoLocalizationAdminSnapshot,
} from '../admin/types';
import { readExpoLocalizationAdminSnapshot } from './readSnapshot';
import type { ExpoLocalizationAdminExecutor, ExpoLocalizationAdminViewProps } from './types';

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

  useInitialLocalizationSnapshot({
    execute,
    setSnapshot,
    setOptions,
    setMessage,
    setLoading,
  });

  return { snapshot, options, loading, busy, message, reload, run };
}

function useInitialLocalizationSnapshot(args: {
  execute: ExpoLocalizationAdminExecutor;
  setSnapshot: Dispatch<SetStateAction<ExpoLocalizationAdminSnapshot | null>>;
  setOptions: Dispatch<SetStateAction<ExpoLocalizationAdminLoadOptions>>;
  setMessage: Dispatch<SetStateAction<string | null>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
}): void {
  const { execute, setSnapshot, setOptions, setMessage, setLoading } = args;

  useEffect(() => {
    let active = true;
    void execute(EXPO_LOCALIZATION_ADMIN_OPERATIONS.load, {})
      .then((result) => {
        if (!active) return;
        setSnapshot(readExpoLocalizationAdminSnapshot(result));
        setOptions({});
        setMessage(null);
      })
      .catch((error: unknown) => {
        if (active) setMessage(toMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [execute, setLoading, setMessage, setOptions, setSnapshot]);
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
