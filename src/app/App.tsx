import { lazy, Suspense } from "react";
import { DemoPage } from "../demo/DemoPage";

const M3M5PreviewPage = lazy(() =>
  import("../preview/M3M5PreviewPage").then((module) => ({
    default: module.M3M5PreviewPage,
  })),
);
const EditorialAcceptancePage = lazy(() =>
  import("../preview/EditorialAcceptancePage").then((module) => ({
    default: module.EditorialAcceptancePage,
  })),
);
const EditorialAcceptanceV2Page = lazy(() =>
  import("../preview/EditorialAcceptanceV2Page").then((module) => ({
    default: module.EditorialAcceptanceV2Page,
  })),
);
const RealPhotoStressPage = lazy(() =>
  import("../preview/RealPhotoStressPage").then((module) => ({ default: module.RealPhotoStressPage })),
);

export function App() {
  const view = new URLSearchParams(window.location.search).get("view");
  return view === "real-photo-stress" ? (
    <Suspense fallback={<main>正在加载实拍压力集…</main>}>
      <RealPhotoStressPage />
    </Suspense>
  ) : view === "editorial-v2" ? (
    <Suspense fallback={<main>正在加载 V2 编辑视觉验收…</main>}>
      <EditorialAcceptanceV2Page />
    </Suspense>
  ) : view === "editorial" ? (
    <Suspense fallback={<main>正在加载图文验收…</main>}>
      <EditorialAcceptancePage />
    </Suspense>
  ) : view === "m3-m5" ? (
    <Suspense fallback={<main>正在加载预览…</main>}>
      <M3M5PreviewPage />
    </Suspense>
  ) : (
    <DemoPage />
  );
}
