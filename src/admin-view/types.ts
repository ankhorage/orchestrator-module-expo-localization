export type ExpoLocalizationAdminExecutor = (
  operation: string,
  input?: unknown,
) => Promise<unknown>;

export interface ExpoLocalizationAdminViewProps {
  readonly execute: ExpoLocalizationAdminExecutor;
  readonly onProjectChange?: () => Promise<void> | void;
}
