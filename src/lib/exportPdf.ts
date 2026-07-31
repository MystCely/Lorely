type TNode = {
	type?: string;
	text?: string;
	content?: TNode[];
	marks?: { type: string }[];
	attrs?: { level?: number; textAlign?: string };
};

async function loadFont(url: string): Promise<string> {
	const res = await fetch(url);
	if (!res.ok) throw new Error(`Missing font: ${url}`);
	const bytes = new Uint8Array(await res.arrayBuffer());
	let binary = "";
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	return btoa(binary);
}

let cache: { pdfMake: any; vfs: Record<string, string>; fonts: any } | null = null;

async function loadPdfMake() {
	if (cache) return cache;
	const mod: any = await import("pdfmake/build/pdfmake");
	const pdfMake = mod.default ?? mod;
	const [reg, bold, ital, boldItal] = await Promise.all([
		loadFont("/fonts/PTSerif-Regular.ttf"),
		loadFont("/fonts/PTSerif-Bold.ttf"),
		loadFont("/fonts/PTSerif-Italic.ttf"),
		loadFont("/fonts/PTSerif-BoldItalic.ttf"),
	]);
	const vfs = {
		"PTSerif-Regular.ttf": reg,
		"PTSerif-Bold.ttf": bold,
		"PTSerif-Italic.ttf": ital,
		"PTSerif-BoldItalic.ttf": boldItal,
	};
	const fonts = {
		PTSerif: {
			normal: "PTSerif-Regular.ttf",
			bold: "PTSerif-Bold.ttf",
			italics: "PTSerif-Italic.ttf",
			bolditalics: "PTSerif-BoldItalic.ttf",
		},
	};
	cache = { pdfMake, vfs, fonts };
	return cache;
}

function runs(node: TNode): any[] {
	const out: any[] = [];
	for (const child of node.content ?? []) {
		if (child.type === "hardBreak") {
			out.push({ text: "\n" });
			continue;
		}
		if (child.type === "text") {
			const marks = (child.marks ?? []).map((m) => m.type);
			out.push({
				text: child.text ?? "",
				bold: marks.includes("bold") || undefined,
				italics: marks.includes("italic") || undefined,
				decoration: marks.includes("strike") ? "lineThrough" : undefined,
			});
		}
	}
	return out.length ? out : [{ text: " " }];
}

function listItems(node: TNode): any[] {
	return (node.content ?? []).map((li) => {
		const text: any[] = [];
		(li.content ?? [])
			.filter((n) => n.type === "paragraph")
			.forEach((p, i) => {
				if (i > 0) text.push({ text: "\n" });
				text.push(...runs(p));
			});
		return { text };
	});
}

function blocks(doc: TNode): any[] {
	const out: any[] = [];
	for (const node of doc.content ?? []) {
		switch (node.type) {
			case "paragraph":
				out.push({
					text: runs(node),
					style: "para",
					...(node.attrs?.textAlign ? { alignment: node.attrs.textAlign } : {}),
				});
				break;
			case "heading":
				out.push({
					text: runs(node),
					style: `h${node.attrs?.level ?? 1}`,
					...(node.attrs?.textAlign ? { alignment: node.attrs.textAlign } : {}),
				});
				break;
			case "pageBreak":
				out.push({ text: "", pageBreak: "after" });
				break;
			case "bulletList":
				out.push({ ul: listItems(node), style: "para" });
				break;
			case "orderedList":
				out.push({ ol: listItems(node), style: "para" });
				break;
			case "blockquote":
				for (const p of node.content ?? []) out.push({ text: runs(p), style: "quote" });
				break;
			case "horizontalRule":
				out.push({ text: "* * *", alignment: "center", margin: [0, 16, 0, 16] });
				break;
			case "codeBlock":
				out.push({ text: (node.content ?? []).map((c) => c.text ?? "").join(""), style: "para" });
				break;
		}
	}
	return out;
}

export async function exportToPdf(
	bookTitle: string,
	author: string,
	chapters: { title: string; content: any }[],
	project?: string | null,
) {
	const { pdfMake, vfs, fonts } = await loadPdfMake();

	const content: any[] = [
		{ text: bookTitle, style: "bookTitle", margin: [0, 200, 0, 10] },
		...(project ? [{ text: project, style: "bookProject" }] : []),
		...(author
			? [
					{ text: "by", style: "bookBy" },
					{ text: author, style: "bookAuthor" },
				]
			: []),
		{ text: "", pageBreak: "after" },
		{ toc: { title: { text: "Contents", style: "tocTitle" } } },
	];

	for (const ch of chapters) {
		content.push({ text: ch.title, style: "chapterTitle", tocItem: true, pageBreak: "before" });
		if (ch.content) content.push(...blocks(ch.content));
	}

	const docDefinition = {
		info: { title: bookTitle, author },
		pageSize: "A4",
		pageMargins: [72, 72, 72, 72],
		defaultStyle: { font: "PTSerif", fontSize: 12, lineHeight: 1.4 },
		content,
		styles: {
			bookTitle: { fontSize: 30, bold: true, alignment: "center" },
			bookProject: { fontSize: 16, color: "#555555", alignment: "center", margin: [0, 0, 0, 60] },
			bookBy: { fontSize: 11, alignment: "center", margin: [0, 0, 0, 8] },
			bookAuthor: { fontSize: 14, alignment: "center" },
			tocTitle: { fontSize: 22, bold: true, margin: [0, 0, 0, 20] },
			chapterTitle: { fontSize: 22, bold: true, alignment: "center", margin: [0, 40, 0, 30] },
			h1: { fontSize: 18, bold: true, margin: [0, 14, 0, 8] },
			h2: { fontSize: 15, bold: true, margin: [0, 12, 0, 6] },
			h3: { fontSize: 13, bold: true, margin: [0, 10, 0, 6] },
			para: { alignment: "justify", lineHeight: 1.5, margin: [0, 0, 0, 8] },
			quote: { italics: true, margin: [24, 4, 24, 8] },
		},
	};

	pdfMake.createPdf(docDefinition, undefined, fonts, vfs).download(`${bookTitle}.pdf`);
}
