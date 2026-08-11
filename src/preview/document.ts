export function buildPreviewDocument(articleFragment: string): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: http://127.0.0.1:* http://localhost:*; style-src 'unsafe-inline'"><title>WeChat article preview</title></head><body style="box-sizing:border-box;width:100%;max-width:100%;margin:0;overflow-x:hidden;background:#fff">${articleFragment}</body></html>`;
}
