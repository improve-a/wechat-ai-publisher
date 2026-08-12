import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

function hash(value: string): number {
  return [...value].reduce((total, character) => ((total * 31) + character.codePointAt(0)!) >>> 0, 2166136261);
}

function editorialAcceptanceAssets(): Plugin {
  const palettes = [
    ["#203B73", "#7AA5D2", "#E8EFF8"], ["#7A344D", "#D88A9B", "#F7E8ED"],
    ["#8A5B20", "#E1B35B", "#FAF0D8"], ["#285C52", "#78AA9A", "#E5F1ED"],
    ["#4D3F78", "#A190C8", "#EFEAF7"], ["#82412D", "#D58D68", "#F8EAE2"],
  ];
  const middleware = (request: { url?: string }, response: { statusCode: number; setHeader(name: string, value: string): void; end(value?: string): void }, next: () => void) => {
    if (!request.url?.startsWith("/editorial-v2-assets/generated.svg")) return next();
    const url = new URL(request.url, "http://editorial.local");
    const kind = url.searchParams.get("kind") ?? "scene";
    const label = url.searchParams.get("label") ?? "验收图片";
    const shot = url.searchParams.get("shot") ?? "wide";
    const orientation = url.searchParams.get("orientation") ?? "landscape";
    const seed = hash(`${kind}:${label}`);
    const palette = palettes[seed % palettes.length]!;
    const portrait = orientation === "portrait";
    const width = portrait ? 900 : 1440;
    const height = portrait ? 1200 : orientation === "square" ? 1000 : 810;
    const horizon = Math.round(height * (0.48 + (seed % 13) / 100));
    const subjectCount = shot === "group" ? 7 : shot === "wide" ? 4 : shot === "detail" || shot === "close-up" ? 1 : 3;
    const subjects = Array.from({ length: subjectCount }, (_, index) => {
      const x = Math.round(width * (0.16 + index * (0.68 / Math.max(subjectCount - 1, 1))));
      const radius = Math.round(width * (shot === "detail" ? 0.065 : 0.025 + ((seed + index) % 3) * 0.006));
      const y = horizon - radius - ((seed + index * 19) % Math.round(height * 0.08));
      return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${index % 2 ? palette[1] : "#F6D6B8"}"/><path d="M${x - radius * 1.5} ${y + radius * 1.4} Q${x} ${y + radius * 0.5} ${x + radius * 1.5} ${y + radius * 1.4} L${x + radius * 2} ${horizon + height * 0.22} L${x - radius * 2} ${horizon + height * 0.22}Z" fill="${index % 2 ? palette[0] : palette[1]}" opacity=".92"/>`;
    }).join("");
    const detail = shot === "detail" || shot === "close-up"
      ? `<rect x="${width * 0.18}" y="${height * 0.16}" width="${width * 0.64}" height="${height * 0.48}" rx="${width * 0.025}" fill="#fff" opacity=".88"/><path d="M${width * 0.24} ${height * 0.48} L${width * 0.37} ${height * 0.34} L${width * 0.49} ${height * 0.42} L${width * 0.64} ${height * 0.25} L${width * 0.76} ${height * 0.38}" fill="none" stroke="${palette[0]}" stroke-width="${width * 0.012}"/>`
      : subjects;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(label)}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette[2]}"/><stop offset="1" stop-color="${palette[1]}"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/><circle cx="${width * 0.82}" cy="${height * 0.18}" r="${width * 0.12}" fill="#fff" opacity=".25"/><path d="M0 ${horizon} Q${width * 0.3} ${horizon - height * 0.12} ${width * 0.56} ${horizon} T${width} ${horizon - height * 0.06}V${height}H0Z" fill="${palette[0]}" opacity=".22"/>${detail}<rect x="${width * 0.06}" y="${height * 0.72}" width="${width * 0.88}" height="${height * 0.2}" rx="${width * 0.018}" fill="#111827" opacity=".78"/><text x="${width * 0.1}" y="${height * 0.81}" fill="#fff" font-family="Arial,'Microsoft YaHei',sans-serif" font-size="${Math.round(width * 0.036)}" font-weight="700">${escapeXml(label)}</text><text x="${width * 0.1}" y="${height * 0.875}" fill="#E5E7EB" font-family="Arial,sans-serif" font-size="${Math.round(width * 0.018)}" letter-spacing="3">SYNTHETIC ACCEPTANCE ASSET · ${escapeXml(shot.toUpperCase())}</text></svg>`;
    response.statusCode = 200;
    response.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    response.setHeader("Cache-Control", "public, max-age=3600");
    response.end(svg);
  };
  return {
    name: "editorial-acceptance-assets",
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  };
}

export default defineConfig({
  plugins: [react(), editorialAcceptanceAssets()],
});
