import { access, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path/posix";
import { parse } from "parse5";

const sourceDirectory = new URL("../src/webflow-source/original-pages/", import.meta.url);
const outputDirectory = new URL("../src/content/pages/", import.meta.url);
const force = process.argv.includes("--force");

const assetDirectories = new Map([
	["css", "assets/webflow/styles"],
	["documents", "assets/webflow/documents"],
	["images", "assets/webflow/images"],
	["js", "assets/webflow/scripts"],
]);

function pageMetadata(sourceFile) {
	if (sourceFile === "index.html") return { page: "home", route: "" };
	if (sourceFile === "401.html") return { page: "unauthorized", route: "401" };
	if (sourceFile === "404.html") return { page: "not-found", route: "404" };

	const route = sourceFile
		.replace(/\/index\.html$/, "")
		.replace(/\.html$/, "")
		.split("/")
		.map((part) => part.replaceAll("_", "-"))
		.join("/");

	return { page: route, route };
}

const sourceFiles = (await readdir(sourceDirectory, { recursive: true }))
	.filter((file) => file.endsWith(".html"))
	.sort();
const pagesBySource = new Map(sourceFiles.map((file) => [normalize(file), pageMetadata(file)]));

function normalizeAssetPaths(source) {
	return source.replace(
		/(?<![A-Za-z0-9.:/_-])(?:(?:\.\.\/)+|\/)?(css|documents|images|js)\//g,
		(match, directory) => `/${assetDirectories.get(directory)}/`,
	);
}

function normalizeInternalLinks(source, sourceFile) {
	return source.replace(/href="([^"?#]+\.html)(#[^"]*)?"/g, (match, href, hash = "") => {
		if (/^(?:https?:|mailto:|tel:|javascript:|\/\/)/.test(href)) return match;

		const target = href.startsWith("/")
			? normalize(href.slice(1))
			: normalize(join(dirname(sourceFile), href));
		const metadata = pagesBySource.get(target);
		if (!metadata) return match;
		return `href="/${metadata.route}${hash}"`;
	});
}

function className(node) {
	return node.attrs?.find((attribute) => attribute.name === "class")?.value ?? "";
}

function textContent(node) {
	if (node.nodeName === "#text") return node.value;
	return (node.childNodes ?? []).map(textContent).join(" ");
}

function firstHeading(node) {
	if (/^h[1-6]$/.test(node.tagName ?? "")) {
		return textContent(node).replace(/\s+/g, " ").trim();
	}

	for (const child of node.childNodes ?? []) {
		const heading = firstHeading(child);
		if (heading) return heading;
	}

	return "";
}

function slugify(value) {
	return value
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 60);
}

function sectionName(node, index, seenNames) {
	const classes = className(node).split(/\s+/).filter(Boolean);
	const primaryClass = classes.find(
		(name) => name === "footer" || name.startsWith("section_") || name.startsWith("section-"),
	) ?? classes[0];
	const classSlug = slugify(primaryClass?.replace(/^section[_-]/, "") ?? "");
	const headingSlug = slugify(firstHeading(node));
	const baseName = classSlug || headingSlug || `section-${index + 1}`;
	const seen = seenNames.get(baseName) ?? 0;
	seenNames.set(baseName, seen + 1);

	if (!seen) return baseName;
	if (headingSlug && headingSlug !== baseName) return `${baseName}-${headingSlug}`;
	return `${baseName}-${seen + 1}`;
}

function outerSections(document) {
	const sections = [];

	function visit(node, insideSection = false) {
		const isSection = node.tagName === "section";
		if (isSection && !insideSection && node.sourceCodeLocation) sections.push(node);
		for (const child of node.childNodes ?? []) visit(child, insideSection || isSection);
	}

	visit(document);
	return sections;
}

function bodyContentBlocks(document) {
	let body;

	function findBody(node) {
		if (node.tagName === "body") body = node;
		for (const child of node.childNodes ?? []) findBody(child);
	}

	findBody(document);
	return (body?.childNodes ?? []).filter(
		(node) => node.sourceCodeLocation && !["script", "style"].includes(node.tagName),
	);
}

try {
	await access(outputDirectory);
	if (!force) {
		throw new Error(
			"src/content/pages already exists. Pass --force only when you intentionally want to rebuild it from the preserved Webflow source.",
		);
	}
	await rm(outputDirectory, { recursive: true });
} catch (error) {
	if (error?.code !== "ENOENT") throw error;
}

await mkdir(outputDirectory, { recursive: true });
const generatedPages = [];

for (const sourceFile of sourceFiles) {
	const { page, route } = pagesBySource.get(sourceFile);
	const pageDirectory = new URL(`${page}/`, outputDirectory);
	const original = await readFile(new URL(sourceFile, sourceDirectory), "utf8");
	const source = normalizeInternalLinks(normalizeAssetPaths(original), sourceFile);
	const document = parse(source, { sourceCodeLocationInfo: true });
	const sections = outerSections(document);
	const blocks = sections.length ? sections : bodyContentBlocks(document);

	await mkdir(pageDirectory, { recursive: true });

	if (!blocks.length) {
		await writeFile(new URL("000-page-document.html", pageDirectory), source);
		generatedPages.push({ page, route, source: sourceFile, sections: 0, fragments: 1 });
		continue;
	}

	const firstStart = blocks[0].sourceCodeLocation.startOffset;
	await writeFile(new URL("000-page-shell-and-navigation.html", pageDirectory), source.slice(0, firstStart));

	const seenNames = new Map();
	for (const [index, section] of blocks.entries()) {
		const start = section.sourceCodeLocation.startOffset;
		const nextStart = blocks[index + 1]?.sourceCodeLocation.startOffset;
		const end = nextStart ?? section.sourceCodeLocation.endOffset;
		const order = String((index + 1) * 10).padStart(3, "0");
		const name = sectionName(section, index, seenNames);
		await writeFile(new URL(`${order}-${name}.html`, pageDirectory), source.slice(start, end));
	}

	const lastEnd = blocks.at(-1).sourceCodeLocation.endOffset;
	await writeFile(new URL("990-document-end-and-scripts.html", pageDirectory), source.slice(lastEnd));

	generatedPages.push({
		page,
		route,
		source: sourceFile,
		sections: sections.length,
		fragments: blocks.length + 2,
	});
}

await writeFile(
	new URL("manifest.json", outputDirectory),
	`${JSON.stringify({ generatedFrom: "src/webflow-source/original-pages", pages: generatedPages }, null, 2)}\n`,
);
await writeFile(
	new URL("README.md", outputDirectory),
	`# Editable page sections

Each directory matches one Astro route. Files are numbered in render order so
the page shell, navigation, content sections, footer, and scripts are easy to
find without changing the exported Webflow markup.

- Edit the numbered \`.html\` fragments in the relevant page directory.
- Shared rendering logic lives in \`src/components/webflow/WebflowPage.astro\`.
- The preserved import snapshot lives in \`src/webflow-source/original-pages/\`.
- \`manifest.json\` records the route, original filename, and fragment count.

Running \`npm run organize:webflow -- --force\` replaces all editable fragments
from the preserved source. Use that command only when you intentionally want to
discard edits made in these section files.
`,
);

console.log(`Organized ${generatedPages.length} Webflow pages into src/content/pages.`);
