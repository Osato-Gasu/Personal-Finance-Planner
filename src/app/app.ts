import {
  HashRouter,
  createBrowserHashEnvironment,
  hashForRoute,
  routeIds,
} from "./router";
import { Store } from "./store";
import { createInitialState, type RouteId } from "../domain/state";
import { StorageRepository } from "../data/storage-repository";

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

export function startApp(
  browserWindow: Window,
  document: Document,
): () => void {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("app root is missing");
  const repository = new StorageRepository(browserWindow.localStorage);
  const store = new Store(
    repository.load() ?? createInitialState(),
    repository,
  );
  const router = new HashRouter(createBrowserHashEnvironment(browserWindow));

  const render = (route: RouteId): void => {
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
    main.append(
      element(document, "p", "スパイク段階：横断基盤のみを検証しています。"),
    );
    shell.append(main);
    root.append(shell);
  };

  const stopRouter = router.start((route) => {
    store.dispatch({ type: "navigate", route });
    render(route);
  });
  return stopRouter;
}
