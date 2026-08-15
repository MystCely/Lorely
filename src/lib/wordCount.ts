export function countWordsInText(text: string): number {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

export function countWords(doc: any): number {
	if (!doc) return 0;
	let text = "";
	const walk = (node: any) => {
		if (typeof node?.text === "string") text += node.text + " ";
		(node?.content ?? []).forEach(walk);
	};
	walk(doc);
	return countWordsInText(text);
}
