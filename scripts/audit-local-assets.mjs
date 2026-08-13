import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const roots = [
	"src/content/pages",
	"public/assets/webflow/styles",
	"public/assets/webflow/scripts",
];
const files = [];

for (const root of roots) {
	const pending = [root];
	while (pending.length) {
		const directory = pending.pop();
		for (const name of await readdir(directory)) {
			const file = join(directory, name);
			if ((await stat(file)).isDirectory()) pending.push(file);
			else files.push(file);
		}
	}
}

const missing = new Set();
const remoteAssets = new Set();
const allowedFunctionalScripts = new Set([
	"https://js-na2.hsforms.net/forms/embed/244948404.js",
	"https://www.youtube.com/iframe_api",
]);

for (const file of files) {
	const contents = await readFile(file, "utf8");
	const references = file.endsWith(".js") ? [] : [...contents.matchAll(/(?:src|href|poster|data-rive-url|data-poster-url|data-video-urls|srcset)="([^"]+)"/g)]
		.flatMap((match) => match[1].split(",").map((value) => value.trim().split(/\s+/)[0]));

	if (file.endsWith(".css") || file.endsWith(".html")) {
		for (const match of contents.matchAll(/url\(["']?([^)"']+)/g)) references.push(match[1]);
	}

	for (let reference of references) {
		if (!reference || /^(?:data:|mailto:|tel:|#|javascript:|\/\/)/.test(reference)) continue;
		if (/^https?:/.test(reference)) continue;
		reference = reference.split(/[?#]/, 1)[0];

		let target;
		if (reference.startsWith("/assets/webflow/")) {
			target = join("public", decodeURIComponent(reference));
		} else if (file.startsWith("public/")) {
			target = resolve(dirname(file), decodeURIComponent(reference));
		} else {
			continue;
		}

		if (!existsSync(target)) missing.add(`${file} -> ${reference}`);
	}

	if (file.startsWith("src/content/pages/")) {
		for (const tag of contents.matchAll(/<(script|img|video|source|link)\b[^>]*>/g)) {
			const markup = tag[0];
			const remote = markup.match(/(?:src|href|poster|data-rive-url)="(https?:\/\/[^"<>]+)"/);
			if (!remote) continue;
			if (tag[1] === "script" && allowedFunctionalScripts.has(remote[1])) continue;
			if (tag[1] === "link" && !/rel="(?:stylesheet|icon|shortcut icon|apple-touch-icon)"/.test(markup)) continue;
			remoteAssets.add(`${file} -> ${remote[1]}`);
		}
	}
}

if (missing.size || remoteAssets.size) {
	if (missing.size) console.error(`Missing local references:\n${[...missing].join("\n")}`);
	if (remoteAssets.size) console.error(`Remote asset references remain:\n${[...remoteAssets].join("\n")}`);
	process.exitCode = 1;
} else {
	console.log("Asset audit: no missing local references or hotlinked page assets.");
}
