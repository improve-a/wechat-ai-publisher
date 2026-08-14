import { buildPreviewDocument } from "./document";

export interface PreviewFrameProps {
  articleFragment: string;
  title?: string;
  height?: number;
}

export function PreviewFrame({ articleFragment, title = "375px 微信文章预览", height = 3200 }: PreviewFrameProps) {
  return (
    <iframe
      data-testid="m5-article-frame"
      title={title}
      sandbox=""
      srcDoc={buildPreviewDocument(articleFragment)}
      width="375"
      height={height}
    />
  );
}
