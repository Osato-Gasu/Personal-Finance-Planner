import {
  HashRouter,
  createBrowserHashEnvironment,
  hashForRoute,
  routeIds,
} from "./router";
import { Store } from "./store";
import { createInitialState, type RouteId } from "../domain/state";
import { StorageRepository } from "../data/storage-repository";
import {
  createBudgetRenderer,
  type EntityIdFactory,
} from "../modules/budget/budget-view";
import { createTakeHomeRenderer } from "../modules/take-home/take-home-view";

const routeLabels: Record<RouteId, string> = {
  overview: "総合サマリー",
  budget: "家計・生活費",
  "take-home": "手取り計算",
  investments: "NISA・iDeCo",
  settings: "設定",
};

function element<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function defaultIdFactory(browserWindow: Window): EntityIdFactory {
  return () => browserWindow.crypto.randomUUID();
}

export function startApp(
  browserWindow: Window,
  document: Document,
  options: { createId?: EntityIdFactory } = {},
): () => void {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("app root is missing");
  const repository = new StorageRepository(browserWindow.localStorage);
  let initialState;
  try {
    initialState = repository.load() ?? createInitialState();
  } catch (error) {
    const shell = element(document, "div");
    shell.className = "app-shell fatal-error";
    shell.append(element(document, "h1", "暮らしと資産プランナー"));
    const alert = element(
      document,
      "p",
      `保存データを読み込めません。既存データは変更していません。${
        error instanceof Error ? ` ${error.message}` : ""
      }`,
    );
    alert.setAttribute("role", "alert");
    shell.append(alert);
    root.replaceChildren(shell);
    return () => undefined;
  }
  const store = new Store(initialState, repository);
  const router = new HashRouter(createBrowserHashEnvironment(browserWindow));
  let currentRoute = initialState.activeRoute;
  let render: (route: RouteId) => void = () => undefined;
  const budgetRenderer = createBudgetRenderer({
    browserWindow,
    document,
    store,
    createId: options.createId ?? defaultIdFactory(browserWindow),
    requestRender: () => render(currentRoute),
  });
  const takeHomeRenderer = createTakeHomeRenderer({
    browserWindow,
    document,
    store,
    createId: options.createId ?? defaultIdFactory(browserWindow),
    requestRender: () => render(currentRoute),
  });

  render = (route: RouteId): void => {
    currentRoute = route;
    root.replaceChildren();
    const shell = element(document, "div");
    shell.className = "app-shell";
    shell.append(element(document, "h1", "暮らしと資産プランナー"));
    const navigation = element(document, "nav");
    navigation.setAttribute("aria-label", "主要画面");
    const list = element(document, "ul");
    for (const routeId of routeIds) {
      const item = element(document, "li");
      const link = element(document, "a", routeLabels[routeId]);
      link.href = hashForRoute(routeId);
      if (routeId === route) link.setAttribute("aria-current", "page");
      item.append(link);
      list.append(item);
    }
    navigation.append(list);
    shell.append(navigation);
    const main = element(document, "main");
    main.append(element(document, "h2", routeLabels[route]));
    if (route === "budget") {
      budgetRenderer(main);
    } else if (route === "take-home") {
      takeHomeRenderer(main);
    } else {
      main.append(
        element(
          document,
          "p",
          route === "overview"
            ? "家計・生活費タブで月間生活費と手残りを確認できます。"
            : "この画面は後続TASKで実装します。",
        ),
      );
    }
    shell.append(main);
    root.append(shell);
  };

  const unsubscribe = store.subscribe((state) => render(state.activeRoute));
  const stopRouter = router.start((route) => {
    try {
      if (store.getState().activeRoute !== route) {
        store.dispatch({ type: "navigate", route });
      } else {
        render(route);
      }
    } catch (error) {
      const alert = element(
        document,
        "p",
        `画面遷移を保存できません。${
          error instanceof Error ? ` ${error.message}` : ""
        }`,
      );
      alert.setAttribute("role", "alert");
      root.prepend(alert);
    }
  });
  return () => {
    unsubscribe();
    stopRouter();
  };
}
