import { defineStore } from "pinia";
import { ref } from "vue";
import type { JSONContent } from "@tiptap/vue-3";
import { supabase } from "../lib/supabaseClient.ts";

const MAX_AUTO_VERSIONS = 50;

export interface ChapterVersion {
	id: string;
	chapter_id: string;
	content: JSONContent | null;
	word_count: number;
	label: string | null;
	created_at: string;
	pinned: boolean;
}

export const useVersionsStore = defineStore("versions", () => {
	const versions = ref<ChapterVersion[]>([]);

	async function fetchVersions(chapterId: string) {
		const { data, error } = await supabase
			.from("chapter_versions")
			.select("*")
			.eq("chapter_id", chapterId)
			.order("created_at", { ascending: false });
		if (error) throw error;
		versions.value = data ?? [];
	}

	async function createVersion(
		chapterId: string,
		content: JSONContent,
		wordCount: number,
		label: string | null = null,
		pinned: boolean = false,
	) {
		const { data, error } = await supabase
			.from("chapter_versions")
			.insert({ chapter_id: chapterId, content, word_count: wordCount, label, pinned })
			.select("*")
			.single();
		if (error) throw error;
		versions.value.unshift(data);
		await pruneVersions(chapterId);
		return data as ChapterVersion;
	}

	async function deleteVersion(id: string) {
		const { error } = await supabase.from("chapter_versions").delete().eq("id", id);
		if (error) throw error;
		versions.value = versions.value.filter((v) => v.id !== id);
	}

	async function pruneVersions(chapterId: string) {
		const { data } = await supabase
			.from("chapter_versions")
			.select("id")
			.eq("chapter_id", chapterId)
			.eq("pinned", false)
			.order("created_at", { ascending: false });

		if (!data || data.length <= MAX_AUTO_VERSIONS) return;

		const ids = data.slice(MAX_AUTO_VERSIONS).map((v) => v.id);
		await supabase.from("chapter_versions").delete().in("id", ids);
		versions.value = versions.value.filter((v) => !ids.includes(v.id));
	}

	return { versions, fetchVersions, createVersion, deleteVersion };
});
