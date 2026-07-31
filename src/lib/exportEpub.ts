import JSZip from "jszip";

type TNode = {
	type?: string;
	text?: string;
	content?: TNode[];
	marks?: { type: string }[];
	attrs?: { level?: number; textAlign?: string };
};

function escapeHtml(s: string) {
	return s.replace(
		/[&<>"']/g,
		(c) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			})[c] as string,
	);
}

function inline(node: TNode): string {
	let html = "";
	for (const child of node.content ?? []) {
		if (child.type === "hardBreak") {
			html += "<br/>";
			continue;
		}
		if (child.type !== "text") continue;
		const marks = (child.marks ?? []).map((m) => m.type);
		let text = escapeHtml(child.text ?? "");
		if (marks.includes("bold")) text = `<strong>${text}</strong>`;
		if (marks.includes("italic")) text = `<em>${text}</em>`;
		if (marks.includes("strike")) text = `<s>${text}</s>`;
		html += text;
	}
	return html;
}

function listHtml(node: TNode, tag: "ul" | "ol"): string {
	const items = (node.content ?? [])
		.map((li) => {
			const inner = (li.content ?? [])
				.filter((n) => n.type === "paragraph")
				.map((p) => inline(p))
				.join("<br/>");
			return `<li>${inner}</li>`;
		})
		.join("");
	return `<${tag}>${items}</${tag}>`;
}

function toHtml(doc: TNode): string {
	let html = "";
	for (const node of doc.content ?? []) {
		switch (node.type) {
			case "paragraph": {
				const align = node.attrs?.textAlign;
				html += `<p${align ? ` style="text-align:${align}"` : ""}>${inline(node)}</p>`;
				break;
			}
			case "pageBreak":
				html += `<div style="page-break-after: always;"></div>`;
				break;
			case "heading": {
				const level = Math.min(node.attrs?.level ?? 1, 6);
				const align = node.attrs?.textAlign;
				html += `<h${level}${align ? ` style="text-align:${align}"` : ""}>${inline(node)}</h${level}>`;
				break;
			}
			case "bulletList":
				html += listHtml(node, "ul");
				break;
			case "orderedList":
				html += listHtml(node, "ol");
				break;
			case "blockquote":
				html += `<blockquote>${(node.content ?? []).map((p) => `<p>${inline(p)}</p>`).join("")}</blockquote>`;
				break;
			case "horizontalRule":
				html += `<p style="text-align:center">* * *</p>`;
				break;
			case "codeBlock":
				html += `<pre>${escapeHtml((node.content ?? []).map((c) => c.text ?? "").join(""))}</pre>`;
				break;
		}
	}
	return html;
}

function xhtml(title: string, body: string) {
	return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeHtml(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body><h1 class="chapter-title">${escapeHtml(title)}</h1>${body}</body>
</html>`;
}

export async function exportToEpub(
	bookTitle: string,
	author: string,
	chapters: { title: string; content: any }[],
	coverUrl?: string | null,
	project?: string | null,
) {
	const zip = new JSZip();
	const uuid = crypto.randomUUID();
	const modified = new Date().toISOString().replace(/\.\d+Z$/, "Z");
	const files = chapters.map((ch, i) => ({ ...ch, id: `ch${i + 1}`, href: `chapter-${i + 1}.xhtml` }));

	zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
	zip.file(
		"META-INF/container.xml",
		`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`,
	);

	const oebps = zip.folder("OEBPS")!;

	oebps.file(
		"style.css",
		`body { font-family: Georgia, serif; line-height: 1.5; margin: 1em; }
h1.chapter-title { text-align: center; margin: 2em 0 1.5em; }
p { margin: 0 0 0.8em; text-align: justify; }
.cover { text-align: center; margin: 0; padding: 0; }
.cover img { max-width: 100%; max-height: 100%; }
.title-page { text-align: center; margin-top: 22%; }
.title-page h1 { font-size: 2.4em; font-weight: bold; margin: 0 0 0.3em; text-align: center; }
.title-page .project { font-size: 1.3em; color: #555; margin: 0 0 2.2em; text-align: center; }
.title-page .by { font-size: 0.8em; margin: 0 0 0.8em; text-align: center; }
.title-page .author { font-size: 1.1em; margin: 0; text-align: center; }
.contents-title { text-align: center; font-size: 1.8em; margin: 1.5em 0 2em; }
.contents p { margin: 0 0 0.7em; text-align: left; }
.contents a { text-decoration: none; }`,
	);

	// Cover image (optional, skipped silently if it can't be fetched)
	let coverFile: { href: string; mime: string } | null = null;
	if (coverUrl) {
		try {
			const res = await fetch(coverUrl);
			if (res.ok) {
				const buf = await res.arrayBuffer();
				const ext = (coverUrl.split("?")[0].split(".").pop() ?? "jpg").toLowerCase();
				const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";
				const href = `cover.${ext === "png" ? "png" : ext === "gif" ? "gif" : "jpg"}`;
				oebps.file(href, buf);
				coverFile = { href, mime };
			}
		} catch {
			// no cover, continue without it
		}
	}

	if (coverFile) {
		oebps.file(
			"cover.xhtml",
			`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Cover</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body class="cover"><img src="${coverFile.href}" alt="${escapeHtml(bookTitle)}"/></body>
</html>`,
		);
	}

	oebps.file(
		"title.xhtml",
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeHtml(bookTitle)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body><div class="title-page">
<h1>${escapeHtml(bookTitle)}</h1>
${project ? `<p class="project">${escapeHtml(project)}</p>` : ""}
${author ? `<p class="by">by</p><p class="author">${escapeHtml(author)}</p>` : ""}
</div></body>
</html>`,
	);

	oebps.file(
		"contents.xhtml",
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Contents</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body><h1 class="contents-title">Contents</h1><div class="contents">
${files.map((f) => `<p><a href="${f.href}">${escapeHtml(f.title)}</a></p>`).join("\n")}
</div></body>
</html>`,
	);

	oebps.file(
		"nav.xhtml",
		`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Contents</title></head>
<body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>
<li><a href="title.xhtml">Title page</a></li>
<li><a href="contents.xhtml">Contents</a></li>
${files.map((f) => `<li><a href="${f.href}">${escapeHtml(f.title)}</a></li>`).join("\n")}
</ol></nav></body>
</html>`,
	);

	for (const f of files) {
		oebps.file(f.href, xhtml(f.title, f.content ? toHtml(f.content) : "<p></p>"));
	}

	oebps.file(
		"content.opf",
		`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
<dc:title>${escapeHtml(bookTitle)}</dc:title>
<dc:language>en</dc:language>
<dc:creator>${escapeHtml(author || "Unknown author")}</dc:creator>
<meta property="dcterms:modified">${modified}</meta>
${coverFile ? `<meta name="cover" content="cover-image"/>` : ""}
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="css" href="style.css" media-type="text/css"/>
${coverFile ? `<item id="cover-image" href="${coverFile.href}" media-type="${coverFile.mime}" properties="cover-image"/>` : ""}
${coverFile ? `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>` : ""}
<item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>
<item id="contents" href="contents.xhtml" media-type="application/xhtml+xml"/>
${files.map((f) => `<item id="${f.id}" href="${f.href}" media-type="application/xhtml+xml"/>`).join("\n")}
</manifest>
<spine>
${coverFile ? `<itemref idref="cover"/>` : ""}
<itemref idref="title"/>
<itemref idref="contents"/>
${files.map((f) => `<itemref idref="${f.id}"/>`).join("\n")}
</spine>
</package>`,
	);

	const blob = await zip.generateAsync({ type: "blob", mimeType: "application/epub+zip" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${bookTitle}.epub`;
	link.click();
	URL.revokeObjectURL(url);
}
