import { lazy, Suspense } from "react";
import { DemoPage } from "../demo/DemoPage";

const M3M5PreviewPage = lazy(() =>
  import("../preview/M3M5PreviewPage").then((module) => ({
    default: module.M3M5PreviewPage,
  })),
);

export function App() {
  const view = new URLSearchParams(window.location.search).get("view");
  return view === "m3-m5" ? (
    <Suspense fallback={<main>正在加载预览…</main>}>
      <M3M5PreviewPage />
    </Suspense>
  ) : (
    <DemoPage />
  );
}
