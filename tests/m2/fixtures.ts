import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ArticleInput } from "../../src/article-parser";

const fixturesDirectory = fileURLToPath(new URL("./fixtures", import.meta.url));

export interface FixtureCase {
  name: string;
  input: ArticleInput;
}

export const fixtureCases: FixtureCase[] = readdirSync(fixturesDirectory)
  .filter((name) => name.endsWith(".md") || name.endsWith(".txt"))
  .sort((left, right) => left.localeCompare(right))
  .map((name) => {
    const input: ArticleInput = {
      format: name.endsWith(".txt") ? "text" : "markdown",
      content: readFileSync(`${fixturesDirectory}/${name}`, "utf8"),
    };

    if (name.startsWith("02-")) input.title = "调用方显式标题";
    if (name.startsWith("15-")) {
      input.images = [
        { src: "C:/素材/未定位-1.jpg", originalName: "未定位-1.jpg", mimeType: "image/jpeg" },
        { src: "C:/素材/未定位-2.png", originalName: "未定位-2.png", mimeType: "image/png" },
      ];
    }
    if (name.startsWith("16-")) {
      input.images = [
        { src: "C:/素材/补充照片 A.jpg", originalName: "补充照片 A.jpg" },
        { src: "C:/素材/补充照片 B.jpg", originalName: "补充照片 B.jpg" },
      ];
    }

    return { name, input };
  });
