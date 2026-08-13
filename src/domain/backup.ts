import type { BackupMetadata } from "./state";

const DAY_MS = 86_400_000;

export interface BackupReminder {
  due: boolean;
  message: string;
}

export function selectBackupReminder(
  metadata: Readonly<BackupMetadata>,
  referenceDate: string,
): BackupReminder {
  const referenceMs = Date.parse(`${referenceDate}T00:00:00.000Z`);
  if (!Number.isFinite(referenceMs))
    throw new Error("referenceDate is invalid");
  const dismissedMs =
    metadata.reminderDismissedUntil === null
      ? null
      : Date.parse(metadata.reminderDismissedUntil);
  if (dismissedMs !== null && dismissedMs >= referenceMs)
    return { due: false, message: "" };
  if (metadata.lastExportedAt === null)
    return {
      due: true,
      message:
        "バックアップをまだ保存していません。設定画面からJSONを保存してください。",
    };
  const exportedMs = Date.parse(metadata.lastExportedAt);
  const due =
    referenceMs - exportedMs >= metadata.reminderIntervalDays * DAY_MS;
  return {
    due,
    message: due
      ? `前回のバックアップから${String(metadata.reminderIntervalDays)}日以上経過しています。`
      : "",
  };
}
