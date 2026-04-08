import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_DIR = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(DOCS_DIR, "src");
const ASSETS_DIR = path.join(DOCS_DIR, "src", "assets");
const BUILD_DIR = path.join(DOCS_DIR, "build");
const TEMPLATES_DIR = path.join(DOCS_DIR, "templates");
const LANGS = ["en", "fr"];
const PREFERRED_HOME_SOURCE_REL = "creer-un-plan.md";

function stripFirstH1(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const idx = lines.findIndex((l) => /^#\s+/.test(l));
  if (idx === -1) return { title: null, body: markdown };

  const title = lines[idx].replace(/^#\s+/, "").trim() || null;
  const bodyLines = lines.slice(0, idx).concat(lines.slice(idx + 1));

  while (bodyLines.length && bodyLines[0].trim() === "") bodyLines.shift();
  return { title, body: bodyLines.join("\n") };
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function listMarkdownFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await listMarkdownFiles(p)));
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith(".md")) {
      out.push(p);
    }
  }
  return out;
}

async function copyDir(srcDir, destDir) {
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  await ensureDir(destDir);
  for (const ent of entries) {
    const src = path.join(srcDir, ent.name);
    const dest = path.join(destDir, ent.name);
    if (ent.isDirectory()) {
      await copyDir(src, dest);
    } else if (ent.isFile()) {
      await fs.copyFile(src, dest);
    }
  }
}

function sanitizeSegment(seg) {
  return seg
    .trim()
    .replaceAll(" ", "-")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function toOutputRelPath(langSrcDir, inputPath) {
  const rel = path.relative(langSrcDir, inputPath);
  const dir = path.dirname(rel);
  const base = path.basename(rel, path.extname(rel));

  const outDir =
    dir && dir !== "."
      ? dir.split(path.sep).map(sanitizeSegment).join(path.sep)
      : "";

  const outFile = `${sanitizeSegment(base) || "page"}.html`;
  return outDir ? path.join(outDir, outFile) : outFile;
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function folderTitleFromDir(dirName) {
  if (!dirName || dirName === ".") return "";
  return dirName;
}

function toHref(fromRelPath, toRelPath) {
  const fromDir = path.dirname(fromRelPath);
  const rel = path.relative(fromDir === "." ? "" : fromDir, toRelPath);
  return rel.startsWith(".") ? rel : `./${rel}`;
}

function renderLanguageSelect({ currentLang, langToHref }) {
  const options = LANGS.map((lang) => {
    const href = langToHref[lang] ?? "./index.html";
    const selected = lang === currentLang ? " selected" : "";
    return `<option value="${escapeHtml(href)}"${selected}>${escapeHtml(
      lang.toUpperCase(),
    )}</option>`;
  }).join("");

  return `<select class="lang-switch" aria-label="Language" onchange="location.href=this.value">
${options}
</select>`;
}

async function main() {
  await fs.rm(BUILD_DIR, { recursive: true, force: true });
  await ensureDir(BUILD_DIR);

  const [template, css] = await Promise.all([
    fs.readFile(path.join(TEMPLATES_DIR, "page.html"), "utf8"),
    fs.readFile(path.join(TEMPLATES_DIR, "styles.css"), "utf8"),
  ]);

  await fs.writeFile(path.join(BUILD_DIR, "styles.css"), css, "utf8");

  // Copy static assets (e.g. images) into the build output.
  try {
    await copyDir(ASSETS_DIR, path.join(BUILD_DIR, "assets"));
  } catch (err) {
    if (err?.code !== "ENOENT") throw err;
  }

  const pagesByLang = new Map(); // lang -> pages[]
  const pagesByLangAndSourceRel = new Map(); // `${lang}:${sourceRel}` -> page
  const homeByLang = new Map(); // lang -> outputRelPath

  for (const lang of LANGS) {
    const langSrcDir = path.join(SRC_ROOT, lang);
    let mdFiles = [];
    try {
      mdFiles = await listMarkdownFiles(langSrcDir);
    } catch (err) {
      if (err?.code !== "ENOENT") throw err;
      mdFiles = [];
    }

    const pages = [];
    for (const file of mdFiles) {
      const raw = await fs.readFile(file, "utf8");
      const { title, body } = stripFirstH1(raw);
      const fallbackTitle = path.basename(file, path.extname(file));
      const sourceRel = path.relative(langSrcDir, file);
      const relDir = path.dirname(sourceRel);
      const topLevelDir = relDir === "." ? null : relDir.split(path.sep)[0];

      const outputRelPath = toOutputRelPath(langSrcDir, file);
      pages.push({
        lang,
        inputPath: file,
        sourceRel,
        outputRelPath,
        title: title ?? fallbackTitle,
        markdownBody: body,
        topLevelDir,
      });
    }

    pages.sort((a, b) => {
      const aDir = a.topLevelDir ?? "";
      const bDir = b.topLevelDir ?? "";
      if (aDir !== bDir) return aDir.localeCompare(bDir, "en");
      return a.title.localeCompare(b.title, "en");
    });

    pagesByLang.set(lang, pages);
    const preferred = pages.find((p) => p.sourceRel === PREFERRED_HOME_SOURCE_REL);
    homeByLang.set(lang, preferred?.outputRelPath ?? pages[0]?.outputRelPath ?? "index.html");
    for (const p of pages) {
      pagesByLangAndSourceRel.set(`${lang}:${p.sourceRel}`, p);
    }
  }

  // Build each language into docs/build/<lang>/
  for (const lang of LANGS) {
    const pages = pagesByLang.get(lang) ?? [];
    if (pages.length === 0) continue;

    const langOutDir = path.join(BUILD_DIR, lang);
    await ensureDir(langOutDir);

    const homeRelPath = homeByLang.get(lang) ?? (pages[0]?.outputRelPath ?? "index.html");

    const groups = new Map(); // dir -> pages[]
    for (const p of pages) {
      const key = p.topLevelDir ?? "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    }
    const sortedGroupKeys = Array.from(groups.keys()).sort((a, b) =>
      a.localeCompare(b, "en"),
    );

    for (const page of pages) {
      const sidebar = sortedGroupKeys
        .map((groupKey) => {
          const sectionTitle = folderTitleFromDir(groupKey);
          const header = sectionTitle
            ? `<div class="nav__section">${escapeHtml(sectionTitle)}</div>`
            : "";

          const items = groups
            .get(groupKey)
            .map((p) => {
              const current = p.outputRelPath === page.outputRelPath;
              const ariaCurrent = current ? ` aria-current="page"` : "";
              const href = toHref(page.outputRelPath, p.outputRelPath);
              return `  <li><a href="${escapeHtml(href)}"${ariaCurrent}>${escapeHtml(
                p.title,
              )}</a></li>`;
            })
            .join("\n");

          return `${header}<ul>\n${items}\n</ul>`;
        })
        .join("\n");

      const langToHref = {};
      for (const otherLang of LANGS) {
        const other = pagesByLangAndSourceRel.get(
          `${otherLang}:${page.sourceRel}`,
        );
        const otherHome = homeByLang.get(otherLang) ?? "index.html";
        const targetRel = other?.outputRelPath ?? otherHome;

        // From current page to other language page:
        // ../../fr/<page>.html relative to current page
        const fromLangPage = path.join(lang, page.outputRelPath);
        const toLangPage = path.join(otherLang, targetRel);
        const href = toHref(fromLangPage, toLangPage);
        langToHref[otherLang] = href;
      }

      const languageSelect = renderLanguageSelect({
        currentLang: lang,
        langToHref,
      });

      const contentHtml = marked.parse(page.markdownBody);

      const outFileAbs = path.join(langOutDir, page.outputRelPath);
      await ensureDir(path.dirname(outFileAbs));

      const cssHref = toHref(
        path.join(lang, page.outputRelPath),
        "styles.css",
      );

      const html = template
        .replaceAll("{{htmlLang}}", escapeHtml(lang))
        .replaceAll("{{title}}", escapeHtml(page.title))
        .replaceAll("{{sidebar}}", sidebar)
        .replaceAll("{{content}}", contentHtml)
        .replaceAll(
          "{{homeHref}}",
          escapeHtml(toHref(page.outputRelPath, homeRelPath)),
        )
        .replaceAll("{{cssHref}}", escapeHtml(cssHref))
        .replaceAll("{{languageSelect}}", languageSelect);

      await fs.writeFile(outFileAbs, html, "utf8");
    }

    // Language index.html redirects to first page (avoids relative-path issues).
    const langIndex = `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./${encodeURI(
      homeRelPath.split(path.sep).map((s) => s).join("/"),
    )}">`;
    await fs.writeFile(path.join(langOutDir, "index.html"), langIndex, "utf8");
  }

  // Root index.html points to English by default
  const rootIndex = `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=./en/index.html">`;
  await fs.writeFile(path.join(BUILD_DIR, "index.html"), rootIndex, "utf8");

  process.stdout.write(
    `Built docs into ${path.relative(process.cwd(), BUILD_DIR)}\n`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

