import type { Store } from "../../app/store";
import { commitPreparedImport } from "../../data/import-coordinator";
import {
  MAX_IMPORT_BYTES,
  type PreparedImport,
  type StorageRepository,
} from "../../data/storage-repository";
import { selectBackupReminder } from "../../domain/backup";
import {
  displayNameFromEditor,
  displayNameToEditor,
} from "../../domain/display-name";
import { productMetadata } from "../../product-metadata";

export type BackupDownload = (
  contents: string,
  filename: string,
) => void | Promise<void>;

export async function saveBackup(
  repository: StorageRepository,
  store: Store,
  download: BackupDownload,
  now: () => string,
): Promise<void> {
  const at = now();
  const serialized = repository.export(structuredClone(store.getState()));
  await download(
    serialized,
    `personal-finance-planner-${at.slice(0, 10)}.json`,
  );
  store.dispatch({ type: "record-export-success", at });
}

interface Options {
  document: Document;
  store: Store;
  repository: StorageRepository;
  download: BackupDownload;
  now: () => string;
  getReferenceDate: () => string;
  requestRender: () => void;
}

function node<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  text?: string,
): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag);
  if (text !== undefined) result.textContent = text;
  return result;
}

export function createSettingsRenderer(
  options: Options,
): (main: HTMLElement) => void {
  let prepared: PreparedImport | null = null;
  let status = "";
  let isError = false;

  const report = (message: string, error = false): void => {
    status = message;
    isError = error;
    options.requestRender();
  };

  return (main): void => {
    const state = options.store.getState();
    if (status) {
      const message = node(options.document, "p", status);
      message.setAttribute("role", isError ? "alert" : "status");
      main.append(message);
    }

    const profile = node(options.document, "section");
    profile.append(node(options.document, "h3", "人物設定"));
    for (const member of state.members) {
      const form = node(options.document, "form");
      form.className = "form-grid compact";
      const label = node(
        options.document,
        "label",
        `${member.role === "self" ? "本人" : "相手"}の表示名`,
      );
      const input = node(options.document, "textarea");
      input.name = `member-name-${member.id}`;
      input.value = displayNameToEditor(member.displayName);
      input.required = true;
      input.rows = 3;
      let touched = false;
      input.addEventListener("input", () => {
        touched = true;
      });
      label.append(input);
      const save = node(options.document, "button", "表示名を保存");
      save.type = "submit";
      form.append(label, save);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        try {
          if (touched)
            options.store.dispatch({
              type: "rename-member",
              memberId: member.id,
              displayName: displayNameFromEditor(input.value),
            });
          report("人物設定を保存しました。");
        } catch (error) {
          report(
            error instanceof Error
              ? error.message
              : "人物設定を保存できません。",
            true,
          );
        }
      });
      form.append(
        node(
          options.document,
          "p",
          "改行は\\r、\\nとして表示・編集します。\\は\\\\として保持します。",
        ),
      );
      profile.append(form);
    }
    main.append(profile);

    const appInformation = node(options.document, "section");
    appInformation.append(
      node(options.document, "h3", "アプリ情報"),
      node(options.document, "p", `version ${productMetadata.version}`),
      node(
        options.document,
        "p",
        `手取り制度確認日 ${productMetadata.ruleVerifiedAt.takeHome}`,
      ),
      node(
        options.document,
        "p",
        `NISA制度確認日 ${productMetadata.ruleVerifiedAt.nisa}`,
      ),
      node(
        options.document,
        "p",
        `iDeCo制度確認日 ${productMetadata.ruleVerifiedAt.ideco}`,
      ),
      node(
        options.document,
        "p",
        "本アプリは概算確認用であり、金融・税務・投資助言ではありません。",
      ),
    );
    main.append(appInformation);

    const backup = node(options.document, "section");
    backup.append(node(options.document, "h3", "バックアップ"));
    backup.append(
      node(
        options.document,
        "p",
        "このHTMLの移動・folder名変更・file名変更によりブラウザの保存領域が変わる可能性があります。移動前にJSONバックアップを保存してください。",
      ),
      node(
        options.document,
        "p",
        "復元は現在の保存データを置き換えます。候補の検証内容を確認してから実行してください。検証失敗や取消では現在のデータを変更しません。",
      ),
    );
    const reminder = selectBackupReminder(
      state.backup,
      options.getReferenceDate(),
    );
    backup.append(
      node(
        options.document,
        "p",
        reminder.due ? reminder.message : "バックアップ期限内です。",
      ),
    );
    backup.append(
      node(
        options.document,
        "p",
        `保存形式: schema version ${String(state.schemaVersion)}`,
      ),
    );
    backup.append(
      node(
        options.document,
        "p",
        `最終保存: ${state.backup.lastSuccessfulSaveAt ?? "未記録"}`,
      ),
    );
    backup.append(
      node(
        options.document,
        "p",
        `最終エクスポート: ${state.backup.lastExportedAt ?? "未実施"}`,
      ),
    );

    const exportButton = node(
      options.document,
      "button",
      "JSONバックアップを保存",
    );
    exportButton.addEventListener("click", () => {
      void (async () => {
        try {
          await saveBackup(
            options.repository,
            options.store,
            options.download,
            options.now,
          );
          report("JSONバックアップを保存しました。");
        } catch (error) {
          report(
            error instanceof Error
              ? error.message
              : "バックアップを保存できません。",
            true,
          );
        }
      })();
    });
    backup.append(exportButton);

    const reminderForm = node(options.document, "form");
    const intervalLabel = node(options.document, "label", "通知間隔（日）");
    const interval = node(options.document, "input");
    interval.type = "number";
    interval.name = "backup-reminder-days";
    interval.min = "1";
    interval.max = "365";
    interval.value = String(state.backup.reminderIntervalDays);
    intervalLabel.append(interval);
    const intervalSave = node(options.document, "button", "通知間隔を保存");
    intervalSave.type = "submit";
    reminderForm.append(intervalLabel, intervalSave);
    reminderForm.addEventListener("submit", (event) => {
      event.preventDefault();
      try {
        options.store.dispatch({
          type: "set-backup-reminder-interval",
          days: Number(interval.value),
        });
        report("バックアップ通知間隔を保存しました。");
      } catch (error) {
        report(
          error instanceof Error ? error.message : "通知間隔を保存できません。",
          true,
        );
      }
    });
    const dismiss = node(options.document, "button", "7日間通知しない");
    dismiss.type = "button";
    dismiss.addEventListener("click", () => {
      const until = new Date(
        Date.parse(`${options.getReferenceDate()}T00:00:00.000Z`) +
          7 * 86_400_000,
      ).toISOString();
      options.store.dispatch({ type: "dismiss-backup-reminder", until });
      report("バックアップ通知を7日間停止しました。");
    });
    reminderForm.append(dismiss);
    backup.append(reminderForm);

    const importHeading = node(
      options.document,
      "h4",
      "JSONバックアップを復元",
    );
    const file = node(options.document, "input");
    file.type = "file";
    file.name = "backup-import";
    file.setAttribute("aria-label", "JSONバックアップを復元");
    file.accept = "application/json,.json";
    file.addEventListener("change", () => {
      void (async () => {
        const selected = file.files?.[0];
        if (!selected) return;
        try {
          if (selected.size > MAX_IMPORT_BYTES)
            throw new Error("import exceeds size limit");
          prepared = options.repository.prepareImport(
            new Uint8Array(await selected.arrayBuffer()),
          );
          report(
            `復元候補を検証しました。schema ${String(prepared.preview.schemaVersion)}、人物 ${String(prepared.preview.members.length)}件。確認後に復元してください。`,
          );
        } catch (error) {
          prepared = null;
          report(
            error instanceof Error ? error.message : "JSONを検証できません。",
            true,
          );
        }
      })();
    });
    backup.append(importHeading, file);
    if (prepared) {
      const preview = node(options.document, "div");
      preview.className = "import-preview";
      preview.append(
        node(
          options.document,
          "p",
          `確認: schema ${String(prepared.preview.schemaVersion)} / ${prepared.preview.members.map((member) => member.displayName).join("、")}`,
        ),
      );
      const confirm = node(options.document, "button", "確認して復元");
      confirm.addEventListener("click", () => {
        try {
          if (!prepared) return;
          commitPreparedImport(options.repository, options.store, prepared);
          prepared = null;
          report("バックアップを復元しました。");
        } catch (error) {
          report(
            error instanceof Error
              ? error.message
              : "復元できません。既存データは変更していません。",
            true,
          );
        }
      });
      const cancel = node(options.document, "button", "復元をキャンセル");
      cancel.addEventListener("click", () => {
        prepared = null;
        report("復元をキャンセルしました。");
      });
      preview.append(confirm, cancel);
      backup.append(preview);
    }
    main.append(backup);
  };
}
