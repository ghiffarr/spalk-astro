import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";

const pagesDirectory = new URL("../src/content/pages/", import.meta.url);
const publicDirectory = new URL("../public/assets/webflow/", import.meta.url);
const files = (await readdir(pagesDirectory, { recursive: true }))
	.filter((file) => file.endsWith(".html"))
	.sort();

const extensionByType = new Map([
	["application/javascript", ".js"],
	["application/json", ".json"],
	["application/octet-stream", ".bin"],
	["audio/mpeg", ".mp3"],
	["font/woff2", ".woff2"],
	["image/avif", ".avif"],
	["image/gif", ".gif"],
	["image/jpeg", ".jpg"],
	["image/png", ".png"],
	["image/svg+xml", ".svg"],
	["image/webp", ".webp"],
	["text/css", ".css"],
	["text/javascript", ".js"],
	["video/mp4", ".mp4"],
	["video/webm", ".webm"],
]);

const trustedAssetHosts = new Set([
	"ajax.googleapis.com",
	"cdn.jsdelivr.net",
	"cdn.prod.website-files.com",
	"d3e54v103j8qbb.cloudfront.net",
	"t3723297.p.clickup-attachments.com",
	"unpkg.com",
]);

const namedVendorAssets = new Map([
	["https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js", "scripts/vendor/webfont.js"],
	["https://cdn.jsdelivr.net/npm/@finsweet/fs-components@2/fs-components.js", "scripts/vendor/fs-components.js"],
	["https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js", "scripts/vendor/ScrollTrigger.min.js"],
	["https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js", "scripts/vendor/gsap.min.js"],
	["https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.css", "styles/vendor/swiper-bundle.min.css"],
	["https://cdn.jsdelivr.net/npm/swiper@8/swiper-bundle.min.js", "scripts/vendor/swiper-bundle.min.js"],
	["https://unpkg.com/lenis@1.3.17/dist/lenis.min.js", "scripts/vendor/lenis.min.js"],
]);

const documents = new Map();
const urls = new Set(namedVendorAssets.keys());

for (const file of files) {
	const contents = await readFile(new URL(file, pagesDirectory), "utf8");
	documents.set(file, contents);

	for (const match of contents.matchAll(/(?:src|poster|data-rive-url|data-poster-url|data-video-urls|content)="(https:\/\/[^"<>]+)"/g)) {
		const url = match[1].replaceAll("&amp;", "&");
		try {
			if (trustedAssetHosts.has(new URL(url).hostname)) urls.add(url);
		} catch {
			// Ignore malformed attribute text.
		}
	}

	for (const match of contents.matchAll(/<link[^>]+href="(https:\/\/[^"<>]+)"[^>]*rel="stylesheet"/g)) {
		urls.add(match[1].replaceAll("&amp;", "&"));
	}

	for (const match of contents.matchAll(/url\(["']?(https:\/\/[^)"']+)/g)) {
		const url = match[1].replaceAll("&amp;", "&");
		try {
			if (trustedAssetHosts.has(new URL(url).hostname)) urls.add(url);
		} catch {
			// Ignore malformed CSS values.
		}
	}

	for (const match of contents.matchAll(/https:\/\/[^\s"'<>]+/g)) {
		const url = match[0]
			.replaceAll("&amp;", "&")
			.replace(/[),;]+$/, "");
		try {
			if (trustedAssetHosts.has(new URL(url).hostname)) urls.add(url);
		} catch {
			// Ignore prose and code that merely resembles a URL.
		}
	}
}

const replacements = new Map();
const failures = [];

function outputGroup(contentType, extension) {
	if (contentType.startsWith("audio/")) return "audio/captured";
	if (contentType.startsWith("image/")) return "images/captured";
	if (contentType.startsWith("video/")) return "videos/captured";
	if (contentType.startsWith("font/")) return "fonts";
	if (extension === ".riv" || extension === ".bin") return "documents/captured";
	if (extension === ".css") return "styles/vendor";
	return "scripts/vendor";
}

async function download(url, explicitPath) {
	const response = await fetch(url, {
		headers: { "user-agent": "Mozilla/5.0 Spalk-Astro asset capture" },
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}`);

	const contentType = (response.headers.get("content-type") || "")
		.split(";", 1)[0]
		.trim()
		.toLowerCase();
	const pathname = decodeURIComponent(new URL(url).pathname);
	let extension = extname(pathname).toLowerCase();
	if (!extension || extension.length > 6) extension = extensionByType.get(contentType) ?? ".bin";

	const digest = createHash("sha256").update(url).digest("hex").slice(0, 16);
	const stem = basename(pathname, extname(pathname))
		.replace(/^[a-f0-9]{20,}_/i, "")
		.replace(/[^a-z0-9_-]+/gi, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 72) || "asset";
	const relativePath = explicitPath ?? `${outputGroup(contentType, extension)}/${stem}-${digest}${extension}`;
	const outputUrl = new URL(relativePath, publicDirectory);
	await mkdir(new URL("./", outputUrl), { recursive: true });
	await writeFile(outputUrl, Buffer.from(await response.arrayBuffer()));
	return `/assets/webflow/${relativePath}`;
}

for (const url of [...urls].sort()) {
	try {
		const localUrl = await download(url, namedVendorAssets.get(url));
		replacements.set(url, localUrl);
	} catch (error) {
		failures.push({ url, reason: error instanceof Error ? error.message : String(error) });
	}
}

const fsComponentsUrl = "https://cdn.jsdelivr.net/npm/@finsweet/fs-components@2/fs-components.js";

const fontCssUrl = "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap";
try {
	const response = await fetch(fontCssUrl, {
		headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36" },
	});
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	let fontCss = await response.text();
	const fontUrls = [...fontCss.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((match) => match[1]);

	for (const fontUrl of [...new Set(fontUrls)]) {
		const localUrl = await download(fontUrl);
		fontCss = fontCss.replaceAll(fontUrl, localUrl);
	}

	await writeFile(new URL("styles/geist.css", publicDirectory), fontCss);
} catch (error) {
	failures.push({ url: fontCssUrl, reason: error instanceof Error ? error.message : String(error) });
}

for (const [file, original] of documents) {
	let localized = original;
	for (const [remoteUrl, localUrl] of replacements) {
		localized = localized
			.replaceAll(remoteUrl, localUrl)
			.replaceAll(remoteUrl.replaceAll("&", "&amp;"), localUrl);
	}

	localized = localized
		.replace(/\s*<link href="https:\/\/fonts\.googleapis\.com" rel="preconnect">/g, "")
		.replace(/\s*<link href="https:\/\/fonts\.gstatic\.com" rel="preconnect" crossorigin="anonymous">/g, "")
		.replace(/\s*<script src="\/assets\/webflow\/scripts\/vendor\/webfont\.js" type="text\/javascript"><\/script>/g, "")
		.replace(/\s*<script type="text\/javascript">WebFont\.load\(\{[\s\S]*?\}\);<\/script>/g, "")
		// The export uses Finsweet only to animate three numeric counters. The
		// final values already exist in the HTML, so keeping those values visible
		// avoids shipping the package's remote module graph.
		.replace(/\s*<script[^>]+src="\/assets\/webflow\/scripts\/vendor\/finsweetcomponentsconfig-[^"]+\.js"[^>]*><\/script>/g, "");

	if (!localized.includes('/assets/webflow/styles/geist.css')) {
		localized = localized.replace(
			"</head>",
			'  <link href="/assets/webflow/styles/geist.css" rel="stylesheet" type="text/css">\n</head>',
		);
	}

	await writeFile(new URL(file, pagesDirectory), localized);
}

const vendorDirectory = new URL("scripts/vendor/", publicDirectory);
const vendorFiles = await readdir(vendorDirectory);
for (const file of vendorFiles) {
	if (!file.includes("finsweet") && !file.includes("6544eda5")) continue;
	const fileUrl = new URL(file, vendorDirectory);
	const source = await readFile(fileUrl, "utf8");
	await writeFile(fileUrl, source.replaceAll(fsComponentsUrl, "/assets/webflow/scripts/vendor/fs-components.js"));
}

console.log(JSON.stringify({ documents: files.length, localizedAssets: replacements.size, failures }, null, 2));
if (failures.length) process.exitCode = 1;
