// A stand-in for an app that installs the packages: it imports each one by its published name and
// uses the main exports. It is never run. `npm run check:consumers` compiles it with TypeScript 6,
// which proves that the declarations built by TypeScript 7 are readable by consumers still on TypeScript 6.
import {
  createMoneyFormatter,
  formatDateTime,
  formatDuration,
  type Currency,
} from "@rcooler/format";
import { ApiError, createClient, type Schema } from "@rcooler/http";
import { createTranslator, toLocale, type Dictionary } from "@rcooler/i18n-core";
import { followSystemColorScheme, tokens, type HexColor } from "@rcooler/tokens";
import { createI18n } from "@rcooler/react-i18n";
import {
  defaultPaginationLabels,
  type AdminMenuSection,
  type ListColumn,
  type ListTableProps,
} from "@rcooler/react-admin";
import {
  createSignInApi,
  readFederationResult,
  ukSignInLabels,
  type SecurityPanelProps,
  type SignInCardProps,
} from "@rcooler/react-signin";
import {
  iconNames,
  readTheme,
  sortRows,
  type AppShellProps,
  type Column,
  type IconName,
} from "@rcooler/react-ui";
import { enablePush, type PushBackend, type PushStatus } from "@rcooler/webpush";
import { registerPushHandlers, type WorkerScopeLike } from "@rcooler/webpush/worker";

const en = { "unit.hours": "h", "unit.minutes": "min", "error.unknown": "Something went wrong." };
const uk: Dictionary<keyof typeof en> = {
  "unit.hours": "год",
  "unit.minutes": "хв",
  "error.unknown": "Щось пішло не так.",
};
const translator = createTranslator({ en, uk }, toLocale(navigator.language));
export const { I18nProvider, useI18n } = createI18n({ en, uk }, { storageKey: "consumer.locale" });
const columns: Column<{ name: string }>[] = [
  { key: "name", header: "Name", render: (row) => row.name, sortValue: (row) => row.name },
];
export const sorted = sortRows([{ name: "b" }, { name: "a" }], columns, {
  key: "name",
  direction: "asc",
});

export const firstIcon: IconName | undefined = iconNames[0];
export const theme = readTheme("consumer.theme");
export const shellNav: AppShellProps["nav"] = [
  { items: [{ href: "#/", label: "Home", icon: "overview", current: true }] },
];

const currency: Currency = "UAH";
const accent: HexColor = tokens.light.color.accent;
const numberSchema: Schema<number> = {
  safeParse: (value) =>
    typeof value === "number" ? { success: true, data: value } : { success: false, error: value },
};
const client = createClient({ baseUrl: "/api/v1" });
const backend: PushBackend = {
  publicKey: () => Promise.resolve(""),
  subscribe: () => Promise.resolve(),
  unsubscribe: () => Promise.resolve(),
};

export async function demo(scope: WorkerScopeLike): Promise<string[]> {
  const stop = followSystemColorScheme();
  const status: PushStatus = await enablePush({ backend, workerUrl: "/sw.js" });
  registerPushHandlers(scope, {
    defaults: { title: "App", tag: "app" },
    onSubscriptionChange: (subscription) => backend.subscribe(subscription),
    onAnswer: (token) => fetch("/api/answers", { method: "POST", body: JSON.stringify({ token }) }),
  });
  let answer = 0;
  try {
    answer = await client.request(numberSchema, "GET", "/answer");
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
  }
  stop();
  return [
    createMoneyFormatter(translator.locale)(answer, currency),
    formatDateTime(new Date().toISOString(), translator.locale),
    formatDuration(answer, {
      hours: translator.t("unit.hours"),
      minutes: translator.t("unit.minutes"),
    }),
    translator.errorText(undefined),
    accent,
    status,
  ];
}

const menu: AdminMenuSection[] = [
  { key: "articles", label: "Articles", href: "/admin/articles", items: [] },
];
const listColumns: ListColumn<{ title: string }>[] = [
  { key: "title", header: "Title", render: (row) => row.title, sortable: true, primary: true },
];
export const listTable: Pick<ListTableProps<{ title: string }>, "columns" | "label"> = {
  columns: listColumns,
  label: menu[0]?.key ?? defaultPaginationLabels.items(0),
};

export const signIn: Pick<SignInCardProps, "client" | "labels" | "account"> = {
  client,
  labels: { ...ukSignInLabels, footNote: "" },
  account: true,
};
export const security: Pick<SecurityPanelProps, "appName" | "linkResult"> = {
  appName: "App",
  linkResult: (() => {
    const result = readFederationResult("?link=done");
    return result !== null && "link" in result ? result.link : null;
  })(),
};
export const federation = createSignInApi(client).federation();
