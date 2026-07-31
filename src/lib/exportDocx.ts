import { AlignmentType, Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun } from "docx";

type TNode = {
	type?: string;
	text?: string;
	content?: TNode[];
	marks?: { type: string }[];
	attrs?: { level?: number };
};

const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];

function runsOf(node: TNode): TextRun[] {
	const out: TextRun[] = [];
	for (const child of node.content ?? []) {
		if (child.type === "hardBreak") {
			out.push(new TextRun({ text: "", break: 1 }));
			continue;
		}
		if (child.type === "text") {
			const marks = (child.marks ?? []).map((m) => m.type);
			out.push(
				new TextRun({
					text: child.text ?? "",
					bold: marks.includes("bold"),
					italics: marks.includes("italic"),
					strike: marks.includes("strike"),
				}),
			);
		}
	}
	return out.length ? out : [new TextRun({ text: "" })];
}

function listParagraphs(node: TNode, ordered: boolean): Paragraph[] {
	const out: Paragraph[] = [];
	for (const item of node.content ?? []) {
		for (const p of (item.content ?? []).filter((n) => n.type === "paragraph")) {
			out.push(
				new Paragraph({
					children: runsOf(p),
					...(ordered ? { numbering: { reference: "lorely-ol", level: 0 } } : { bullet: { level: 0 } }),
				}),
			);
		}
	}
	return out;
}

function bodyParagraphs(doc: TNode): Paragraph[] {
	const out: Paragraph[] = [];
	for (const node of doc.content ?? []) {
		switch (node.type) {
			case "paragraph":
				out.push(new Paragraph({ children: runsOf(node), spacing: { after: 120 } }));
				break;
			case "heading":
				out.push(
					new Paragraph({
						children: runsOf(node),
						heading: HEADINGS[(node.attrs?.level ?? 1) - 1] ?? HeadingLevel.HEADING_3,
						spacing: { before: 240, after: 120 },
					}),
				);
				break;
			case "bulletList":
				out.push(...listParagraphs(node, false));
				break;
			case "orderedList":
				out.push(...listParagraphs(node, true));
				break;
			case "blockquote":
				for (const p of node.content ?? []) {
					out.push(new Paragraph({ children: runsOf(p), indent: { left: 720 }, spacing: { after: 120 } }));
				}
				break;
			case "horizontalRule":
				out.push(
					new Paragraph({
						children: [new TextRun({ text: "* * *" })],
						alignment: AlignmentType.CENTER,
						spacing: { before: 240, after: 240 },
					}),
				);
				break;
			case "codeBlock":
				out.push(
					new Paragraph({
						children: [new TextRun({ text: (node.content ?? []).map((c) => c.text ?? "").join("") })],
						spacing: { after: 120 },
					}),
				);
				break;
		}
	}
	return out;
}

export async function exportToDocx(
	bookTitle: string,
	author: string,
	chapters: { title: string; content: any }[],
	project?: string | null,
) {
	const children: Paragraph[] = [
		new Paragraph({
			children: [new TextRun({ text: bookTitle, bold: true, size: 56 })],
			alignment: AlignmentType.CENTER,
			spacing: { before: 3600, after: 200 },
		}),
		...(project
			? [
					new Paragraph({
						children: [new TextRun({ text: project, size: 32, color: "555555" })],
						alignment: AlignmentType.CENTER,
						spacing: { after: 800 },
					}),
				]
			: []),
		...(author
			? [
					new Paragraph({
						children: [new TextRun({ text: "by", size: 22 })],
						alignment: AlignmentType.CENTER,
						spacing: { after: 120 },
					}),
					new Paragraph({
						children: [new TextRun({ text: author, size: 28 })],
						alignment: AlignmentType.CENTER,
					}),
				]
			: []),
		new Paragraph({
			children: [new TextRun({ text: "Contents", bold: true, size: 40 })],
			pageBreakBefore: true,
			spacing: { after: 400 },
		}),
		...chapters.map((ch) => new Paragraph({ children: [new TextRun({ text: ch.title })], spacing: { after: 120 } })),
	];

	for (const ch of chapters) {
		children.push(
			new Paragraph({
				children: [new TextRun({ text: ch.title, bold: true, size: 32 })],
				alignment: AlignmentType.CENTER,
				pageBreakBefore: true,
				spacing: { before: 480, after: 480 },
			}),
		);
		if (ch.content) children.push(...bodyParagraphs(ch.content));
	}

	const doc = new Document({
		title: bookTitle,
		creator: author || "Lorely",
		styles: {
			default: {
				document: {
					run: { font: "Times New Roman", size: 24 },
					paragraph: { spacing: { line: 360 } },
				},
			},
		},
		numbering: {
			config: [
				{
					reference: "lorely-ol",
					levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.START }],
				},
			],
		},
		sections: [
			{
				properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
				children,
			},
		],
	});

	const blob = await Packer.toBlob(doc);
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${bookTitle}.docx`;
	link.click();
	URL.revokeObjectURL(url);
}
