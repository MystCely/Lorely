import { Node } from "@tiptap/core";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		pageBreak: {
			setPageBreak: () => ReturnType;
		};
	}
}

export const PageBreak = Node.create({
	name: "pageBreak",
	group: "block",

	parseHTML() {
		return [{ tag: "div[data-page-break]" }];
	},

	renderHTML() {
		return ["div", { "data-page-break": "" }];
	},

	addCommands() {
		return {
			setPageBreak:
				() =>
				({ commands }) =>
					commands.insertContent({ type: this.name }),
		};
	},
});
