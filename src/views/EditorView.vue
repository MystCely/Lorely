<script lang="ts" setup>
	import { ref, onMounted, onBeforeUnmount, computed } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import { storeToRefs } from "pinia";

	import { useEditor, EditorContent } from "@tiptap/vue-3";
	import StarterKit from "@tiptap/starter-kit";
	import TextAlign from "@tiptap/extension-text-align";
	import type { JSONContent } from "@tiptap/vue-3";

	import {
		Plus,
		Download,
		FileText,
		FileDown,
		PanelLeft,
		BookText,
		LayoutGrid,
		Settings,
		Bold,
		Italic,
		Strikethrough,
		Heading1,
		Heading2,
		List,
		ListOrdered,
		Target,
		Timer,
		BookOpen,
		Trash2,
		Pencil,
		Underline,
		Heading3,
		Quote,
		Minus,
		Undo2,
		Redo2,
		AlignLeft,
		AlignCenter,
		AlignRight,
		AlignJustify,
		SeparatorHorizontal,
		History,
		Archive,
		RotateCcw,
		ChevronRight,
	} from "lucide-vue-next";

	import { useChaptersStore, type Chapter } from "../stores/chapters";
	import { useBooksStore } from "../stores/books";
	import { useEditorUiStore } from "../stores/editorUi";
	import { useVersionsStore, type ChapterVersion } from "../stores/versions.ts";

	import { exportToPdf } from "../lib/exportPdf";
	import { exportToDocx } from "../lib/exportDocx";
	import { exportToEpub } from "../lib/exportEpub";

	import { PageBreak } from "../lib/pageBreak";
	import { daysLeft } from "../lib/trash.ts";
	import { countWords, countWordsInText } from "../lib/wordCount.ts";

	const route = useRoute();
	const router = useRouter();

	const chaptersStore = useChaptersStore();
	const booksStore = useBooksStore();
	const editorUi = useEditorUiStore();
	const versionStore = useVersionsStore();

	const { versions } = storeToRefs(versionStore);
	const { activeChapters, archivedChapters, trashedChapters } = storeToRefs(chaptersStore);
	const { chaptersCollapsed } = storeToRefs(editorUi);

	const {
		fetchChapters,
		addChapter,
		getChapter,
		updateChapter,
		trashChapter,
		archiveChapter,
		restoreChapter,
		deleteChapterForever,
	} = chaptersStore;

	const SNAPSHOT_INTERVAL = 10 * 60 * 1000;
	const lastSnapshotAt = new Map<string, number>();
	const sessionBaseline = new Map<string, JSONContent>();
	const lastSnapshotJson = new Map<string, string>();

	const pendingRestore = ref<ChapterVersion | null>(null);
	const pendingDeleteVersion = ref<ChapterVersion | null>(null);

	const showHistory = ref(false);
	const showExport = ref(false);

	const showArchivedChapters = ref(false);
	const showTrashedChapters = ref(false);

	const purgingChapter = ref<Chapter | null>(null);
	const deletingChapter = ref<Chapter | null>(null);

	const selectedIds = ref<Set<string>>(new Set());
	const editingChapterId = ref<string | null>(null);
	const activeChapterId = ref<string | null>(null);

	const editingTitle = ref("");

	const loading = ref(true);
	const saveState = ref<"idle" | "saving" | "saved" | "error">("idle");

	const chapterWords = ref(0);

	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let isLoadingChapter = false;

	const formats = [
		{ value: "pdf", label: "PDF", soon: false },
		{ value: "docx", label: "Word", soon: false },
		{ value: "epub", label: "ePub", soon: false },
	] as const;

	const format = ref<"pdf" | "docx" | "epub">("pdf");

	const vFocus = { mounted: (el: HTMLElement) => el.focus() };

	const editor = useEditor({
		extensions: [StarterKit, TextAlign.configure({ types: ["heading", "paragraph"] }), PageBreak],
		content: "",
		editorProps: { attributes: { class: "prose dark:prose-invert max-w-none min-h-[70vh] focus:outline-none" } },
		onUpdate: ({ editor }) => {
			chapterWords.value = countWordsInText(editor.getText());
			if (isLoadingChapter) return;
			scheduleSave();
		},
	});

	const otherChaptersWords = computed(() =>
		activeChapters.value.reduce(
			(total, c) => (c.id === activeChapterId.value ? total : total + countWords(c.content)),
			0,
		),
	);

	const manuscriptWords = computed(() => otherChaptersWords.value + chapterWords.value);

	onMounted(async () => {
		await fetchChapters(String(route.params.id));
		booksStore.fetchBook(String(route.params.id));
		loading.value = false;

		const wanted = route.query.chapter as string | undefined;
		const initial = activeChapters.value.find((c) => c.id === wanted) ?? activeChapters.value[0];
		if (initial) selectChapter(initial.id);

		window.addEventListener("keydown", onKeyDown);
	});

	onBeforeUnmount(() => {
		if (saveTimer) {
			clearTimeout(saveTimer);
			saveActiveChapter();
		}
		editor?.value?.destroy();

		window.removeEventListener("keydown", onKeyDown);
	});

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			if (pendingDeleteVersion.value) return;
			if (purgingChapter.value) return;
			if (pendingRestore.value) {
				pendingRestore.value = null;
				return;
			}
			if (showHistory.value) {
				showHistory.value = false;
				return;
			}
			if (showExport.value) {
				showExport.value = false;
				return;
			}
			// Delete-chapter dialog deliberately ignores Escape.
			return;
		}

		if ((e.metaKey || e.ctrlKey) && e.key.toLocaleLowerCase() === "s") {
			e.preventDefault();
			clearTimeout(saveTimer);
			saveTimer = undefined;
			saveActiveChapter();
		}
	}

	async function selectChapter(id: string) {
		if (id === activeChapterId.value) return;

		clearTimeout(saveTimer);
		saveTimer = undefined;
		saveActiveChapter();

		activeChapterId.value = id;
		isLoadingChapter = true;
		editor.value?.commands.setContent(getChapter(id)?.content ?? "");
		const loaded = getChapter(id)?.content;
		if (loaded) sessionBaseline.set(id, loaded);
		chapterWords.value = countWordsInText(editor.value?.getText() ?? "");
		isLoadingChapter = false;

		router.replace({ query: { ...route.query, chapter: id } });
	}

	async function saveActiveChapter() {
		if (!activeChapterId.value || !editor.value) return;
		const id = activeChapterId.value;
		saveState.value = "saving";
		try {
			const json = editor.value.getJSON();
			await updateChapter(id, { content: json });
			saveState.value = "saved";
			maybeSnapshot(id, json);
		} catch {
			saveState.value = "error";
		}
	}

	function scheduleSave() {
		saveState.value = "saving";
		clearTimeout(saveTimer);
		saveTimer = setTimeout(saveActiveChapter, 1500);
	}

	async function handleAddChapter() {
		const chapter = await addChapter(String(route.params.id));
		selectChapter(chapter.id);
	}

	function startRename(chapter: Chapter) {
		editingChapterId.value = chapter.id;
		editingTitle.value = chapter.title;
	}

	async function saveRename() {
		const id = editingChapterId.value;
		if (!id) return;
		editingChapterId.value = null;
		const title = editingTitle.value.trim();
		if (title && title !== getChapter(id)?.title) await updateChapter(id, { title });
	}

	function cancelRename() {
		editingChapterId.value = null;
	}

	async function confirmDeleteChapter() {
		const chapter = deletingChapter.value;
		if (!chapter) return;
		const wasActive = activeChapterId.value === chapter.id;
		if (wasActive) {
			clearTimeout(saveTimer);
			saveTimer = undefined;
			activeChapterId.value = null;
		}
		await trashChapter(chapter.id);
		deletingChapter.value = null;
		if (wasActive) {
			const next = activeChapters.value[0];
			if (next) selectChapter(next.id);
			else editor.value?.commands.setContent("");
		}
	}

	async function confirmPurgeChapter() {
		if (!purgingChapter.value) return;
		await deleteChapterForever(purgingChapter.value.id);
		purgingChapter.value = null;
	}

	function openExport() {
		selectedIds.value = new Set(activeChapters.value.map((c) => c.id));
		showExport.value = true;
	}

	function toggleExportChapter(id: string) {
		const next = new Set(selectedIds.value);
		next.has(id) ? next.delete(id) : next.add(id);
		selectedIds.value = next;
	}

	async function runExport() {
		await saveActiveChapter();
		const book = booksStore.getBook(String(route.params.id));
		const title = book?.title ?? "Manuscript";
		const author = book?.author ?? "";
		const chosen = activeChapters.value
			.filter((c) => selectedIds.value.has(c.id))
			.map((c) => ({ title: c.title, content: c.content }));

		try {
			if (format.value === "pdf") await exportToPdf(title, author, chosen);
			else if (format.value === "docx") await exportToDocx(title, author, chosen);
			else if (format.value === "epub") await exportToEpub(title, author, chosen, book?.cover_image);
		} catch (e) {
			console.error("Export failed:", e);
		}
		showExport.value = false;
	}

	async function snapshot(
		chapterId: string,
		content: JSONContent,
		label: string | null = null,
		pinned: boolean = false,
	) {
		const json = JSON.stringify(content);
		if (!pinned && lastSnapshotJson.get(chapterId) === json) return;
		try {
			await versionStore.createVersion(chapterId, content, countWords(content), label, pinned);
			lastSnapshotJson.set(chapterId, json);
		} catch (e) {
			console.error("Snapshot failed:", e);
		}
	}

	async function maybeSnapshot(chapterId: string, current: JSONContent) {
		const now = Date.now();
		const baseline = sessionBaseline.get(chapterId);

		if (baseline) {
			sessionBaseline.delete(chapterId);
			if (countWords(baseline) > 0) {
				await snapshot(chapterId, baseline);
				lastSnapshotAt.set(chapterId, now);
				return;
			}
		}

		if (now - (lastSnapshotAt.get(chapterId) ?? 0) < SNAPSHOT_INTERVAL) return;
		await snapshot(chapterId, current);
		lastSnapshotAt.set(chapterId, now);
	}

	async function openHistory() {
		if (!activeChapterId.value) return;
		await saveActiveChapter();
		await versionStore.fetchVersions(activeChapterId.value);
		showHistory.value = true;
	}

	async function saveManualVersion() {
		if (!activeChapterId.value || !editor.value) return;
		await snapshot(activeChapterId.value, editor.value.getJSON(), "Saved by you", true);
		await versionStore.fetchVersions(activeChapterId.value);
	}

	async function restoreVersion(version: ChapterVersion) {
		if (!activeChapterId.value || !editor.value) return;
		pendingRestore.value = null;
		await snapshot(activeChapterId.value, editor.value.getJSON(), "Before restore");
		isLoadingChapter = true;
		editor.value.commands.setContent(version.content ?? "");
		isLoadingChapter = false;
		await saveActiveChapter();
		showHistory.value = false;
	}

	async function removeVersion(version: ChapterVersion) {
		pendingDeleteVersion.value = null;
		try {
			await versionStore.deleteVersion(version.id);
		} catch (e) {
			console.error("Delete version failed:", e);
		}
	}

	function formatVersionDate(iso: string) {
		return new Date(iso).toLocaleString(undefined, {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}
</script>

<template>
	<div class="flex h-full flex-col gap-6 p-3">
		<!-- Full-width toolbar -->
		<div class="panel flex items-center gap-1 rounded-2xl px-3 py-2">
			<button
				:disabled="!editor?.can().undo()"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
				type="button"
				@click="editor?.chain().focus().undo().run()">
				<Undo2 class="h-4 w-4" />
			</button>
			<button
				:disabled="!editor?.can().redo()"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
				type="button"
				@click="editor?.chain().focus().redo().run()">
				<Redo2 class="h-4 w-4" />
			</button>

			<div class="mx-2 h-5 w-px bg-line"></div>
			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive('bold') }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().toggleBold().run()">
				<Bold class="h-4 w-4" />
			</button>
			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive('italic') }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().toggleItalic().run()">
				<Italic class="h-4 w-4" />
			</button>
			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive('underline') }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().toggleUnderline().run()">
				<Underline class="h-4 w-4" />
			</button>
			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive('strike') }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().toggleStrike().run()">
				<Strikethrough class="h-4 w-4" />
			</button>

			<div class="mx-2 h-5 w-px bg-line"></div>

			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive('heading', { level: 1 }) }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().toggleHeading({ level: 1 }).run()">
				<Heading1 class="h-4 w-4" />
			</button>
			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive('heading', { level: 2 }) }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().toggleHeading({ level: 2 }).run()">
				<Heading2 class="h-4 w-4" />
			</button>
			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive('heading', { level: 3 }) }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().toggleHeading({ level: 3 }).run()">
				<Heading3 class="h-4 w-4" />
			</button>

			<div class="mx-2 h-5 w-px bg-line"></div>

			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive('bulletList') }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().toggleBulletList().run()">
				<List class="h-4 w-4" />
			</button>
			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive('orderedList') }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().toggleOrderedList().run()">
				<ListOrdered class="h-4 w-4" />
			</button>

			<div class="mx-2 h-5 w-px bg-line"></div>

			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive({ textAlign: 'left' }) }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().setTextAlign('left').run()">
				<AlignLeft class="h-4 w-4" />
			</button>
			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive({ textAlign: 'center' }) }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().setTextAlign('center').run()">
				<AlignCenter class="h-4 w-4" />
			</button>
			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive({ textAlign: 'right' }) }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().setTextAlign('right').run()">
				<AlignRight class="h-4 w-4" />
			</button>
			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive({ textAlign: 'justify' }) }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().setTextAlign('justify').run()">
				<AlignJustify class="h-4 w-4" />
			</button>

			<button
				:class="{ 'bg-canvas text-ink': editor?.isActive('blockquote') }"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().toggleBlockquote().run()">
				<Quote class="h-4 w-4" />
			</button>

			<button
				aria-label="Scene break"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().setHorizontalRule().run()">
				<Minus class="h-4 w-4" />
			</button>
			<button
				aria-label="Page break"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				type="button"
				@click="editor?.chain().focus().setPageBreak().run()">
				<SeparatorHorizontal class="h-4 w-4" />
			</button>

			<div class="ml-auto flex items-center gap-3 pr-1 text-xs text-muted">
				<span>{{ chapterWords.toLocaleString() }} words</span>
				<span v-if="saveState !== 'idle'">
					{{ saveState === "saving" ? "Saving..." : saveState === "error" ? "Couldn't save" : "Saved" }}
				</span>
			</div>
		</div>

		<div class="flex min-h-0 flex-1 gap-3">
			<!-- Icon rail -->
			<nav class="panel flex w-16 shrink-0 flex-col items-center gap-4 rounded-2xl py-4">
				<button
					aria-label="Toggle chapters"
					class="cursor-pointer rounded-full p-2.5 text-muted transition hover:bg-canvas hover:text-ink"
					type="button"
					@click="editorUi.toggleChapters">
					<PanelLeft class="h-5 w-5" />
				</button>
				<button aria-label="Manuscript" class="rounded-full bg-canvas p-2.5 text-ink" type="button">
					<BookText class="h-5 w-5" />
				</button>
				<button
					aria-label="Planner"
					class="cursor-pointer rounded-full p-2.5 text-muted transition hover:bg-canvas hover:text-ink"
					type="button">
					<LayoutGrid class="h-5 w-5" />
				</button>
				<button
					aria-label="Export"
					class="cursor-pointer rounded-full p-2.5 text-muted transition hover:bg-canvas hover:text-ink"
					type="button"
					@click="openExport">
					<FileDown class="h-5 w-5" />
				</button>
				<button
					aria-label="Version history"
					class="cursor-pointer rounded-full p-2.5 text-muted transition hover:bg-canvas hover:text-ink"
					type="button"
					@click="openHistory">
					<History class="h-5 w-5" />
				</button>
				<button
					aria-label="Settings"
					class="mt-auto cursor-pointer rounded-full p-2.5 text-muted transition hover:bg-canvas hover:text-ink"
					type="button">
					<Settings class="h-5 w-5" />
				</button>
			</nav>

			<!-- Chapters sidebar (collapsible) -->
			<div
				:class="chaptersCollapsed ? 'w-0 opacity-0' : 'w-72 opacity-100'"
				class="shrink-0 overflow-hidden rounded-2xl transition-all duration-300 ease-out">
				<aside class="panel flex h-full w-72 flex-col rounded-2xl">
					<div class="flex gap-2 p-4">
						<button
							class="flex cursor-pointer items-center gap-1.5 rounded-full bg-violet px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
							type="button"
							@click="handleAddChapter">
							<Plus class="h-4 w-4" />
							Add new
						</button>
						<button
							class="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-ink transition hover:bg-canvas"
							type="button">
							<Download class="h-4 w-4" />
							Import
						</button>
					</div>
					<div class="flex-1 overflow-y-auto px-3 pb-3">
						<p v-if="loading" class="px-2 py-1 text-sm text-muted">Loading…</p>
						<p v-else-if="!activeChapters.length" class="px-2 py-1 text-sm text-muted">No chapters yet.</p>
						<!-- Chapter list -->
						<nav v-else class="flex flex-col gap-1">
							<div
								v-for="chapter in activeChapters"
								:key="chapter.id"
								:class="
									editingChapterId === chapter.id
										? ''
										: chapter.id === activeChapterId
											? 'bg-canvas font-medium text-ink'
											: 'text-muted hover:bg-canvas/60 hover:text-ink'
								"
								class="group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition">
								<div v-if="editingChapterId === chapter.id" class="relative w-full">
									<FileText class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
									<input
										v-model="editingTitle"
										v-focus
										class="w-full rounded-2xl border border-line bg-canvas py-3 pl-12 pr-4 text-sm text-ink outline-none transition focus:border-violet"
										@blur="cancelRename"
										@keydown.enter.prevent="saveRename"
										@keydown.esc="cancelRename" />
								</div>

								<template v-else>
									<FileText class="h-4 w-4 shrink-0" />
									<button
										class="min-w-0 flex-1 cursor-pointer truncate text-left"
										type="button"
										@click="selectChapter(chapter.id)">
										{{ chapter.title }}
									</button>
									<button
										aria-label="Rename chapter"
										class="shrink-0 cursor-pointer rounded p-1 text-muted opacity-0 transition hover:bg-canvas hover:text-ink group-hover:opacity-100"
										type="button"
										@click.stop="startRename(chapter)">
										<Pencil class="h-3.5 w-3.5" />
									</button>
									<button
										type="button"
										aria-label="Archive chapter"
										@click.stop="archiveChapter(chapter.id)"
										class="shrink-0 cursor-pointer rounded p-1 text-muted opacity-0 transition hover:bg-canvas hover:text-ink group-hover:opacity-100">
										<Archive class="h-3.5 w-3.5" />
									</button>
									<button
										aria-label="Delete chapter"
										class="shrink-0 cursor-pointer rounded p-1 text-muted opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
										type="button"
										@click.stop="deletingChapter = chapter">
										<Trash2 class="h-3.5 w-3.5" />
									</button>
								</template>
							</div>
						</nav>

						<div v-if="archivedChapters.length" class="mt-6">
							<button
								type="button"
								class="flex w-full cursor-pointer items-center gap-1.5 px-2 text-xs font-medium text-muted transition hover:text-ink"
								@click="showArchivedChapters = !showArchivedChapters">
								<ChevronRight class="h-3.5 w-3.5 transition" :class="{ 'rotate-90': showArchivedChapters }" />
								Archived ({{ archivedChapters.length }})
							</button>
							<div v-if="showArchivedChapters" class="mt-1 flex flex-col gap-0.5">
								<div
									v-for="chapter in archivedChapters"
									:key="chapter.id"
									class="group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-canvas/60">
									<span class="min-w-0 flex-1 truncate">{{ chapter.title }}</span>
									<button
										type="button"
										aria-label="Restore chapter"
										@click="restoreChapter(chapter.id)"
										class="shrink-0 cursor-pointer rounded p-1 opacity-0 transition hover:text-ink group-hover:opacity-100">
										<RotateCcw class="h-3.5 w-3.5" />
									</button>
								</div>
							</div>
						</div>

						<div v-if="trashedChapters.length" class="mt-4">
							<button
								type="button"
								class="flex w-full cursor-pointer items-center gap-1.5 px-2 text-xs font-medium text-muted transition hover:text-ink"
								@click="showTrashedChapters = !showTrashedChapters">
								<ChevronRight class="h-3.5 w-3.5 transition" :class="{ 'rotate-90': showTrashedChapters }" />
								Trash ({{ trashedChapters.length }})
							</button>
							<div v-if="showTrashedChapters" class="mt-1 flex flex-col gap-0.5">
								<div
									v-for="chapter in trashedChapters"
									:key="chapter.id"
									class="group flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted transition hover:bg-canvas/60">
									<div class="min-w-0 flex-1">
										<p class="truncate">{{ chapter.title }}</p>
										<p class="text-xs text-muted/70">{{ daysLeft(chapter.deleted_at) }} days left</p>
									</div>
									<button
										type="button"
										aria-label="Restore chapter"
										@click="restoreChapter(chapter.id)"
										class="shrink-0 cursor-pointer rounded p-1 opacity-0 transition hover:text-ink group-hover:opacity-100">
										<RotateCcw class="h-3.5 w-3.5" />
									</button>
									<button
										type="button"
										aria-label="Delete permanently"
										@click="purgingChapter = chapter"
										class="shrink-0 cursor-pointer rounded p-1 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100">
										<Trash2 class="h-3.5 w-3.5" />
									</button>
								</div>
							</div>
						</div>

						<div v-if="purgingChapter" class="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
							<div class="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-xl">
								<h2 class="text-lg font-semibold text-ink">Delete permanently?</h2>
								<p class="mt-2 text-sm text-muted">
									“{{ purgingChapter.title }}” and its version history will be gone for good.
								</p>
								<div class="mt-6 flex justify-end gap-2">
									<button
										type="button"
										class="cursor-pointer rounded-full px-5 py-2 text-sm text-muted transition hover:bg-canvas hover:text-ink"
										@click="purgingChapter = null">
										Cancel
									</button>
									<button
										type="button"
										class="cursor-pointer rounded-full bg-red-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-600"
										@click="confirmPurgeChapter">
										Delete
									</button>
								</div>
							</div>
						</div>
					</div>
				</aside>
			</div>

			<!-- Editor -->
			<main class="min-w-0 flex-1 overflow-y-auto">
				<div
					v-if="activeChapterId"
					class="mx-auto mb-8 max-w-3xl rounded-xs border border-line bg-surface px-6 py-8 md:px-10 lg:px-16 lg:py-14 shadow-sm">
					<EditorContent :editor="editor" />
				</div>
				<p v-else-if="!loading" class="p-8 text-sm text-muted">Select or create a chapter to start writing.</p>
			</main>

			<!-- Right sidebar -->
			<aside class="panel hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto rounded-2xl p-4 xl:flex">
				<div class="rounded-xl bg-canvas/40 p-4">
					<div class="flex items-center gap-2 text-sm font-medium text-ink">
						<Target class="h-4 w-4" />
						Word count
					</div>
					<p class="mt-2 text-xl font-semibold text-ink">{{ manuscriptWords.toLocaleString() }}</p>
					<p class="mt-0.5 text-xs text-muted">{{ chapterWords.toLocaleString() }} in this chapter</p>
				</div>
				<div class="rounded-xl bg-canvas/40 p-4">
					<div class="flex items-center gap-2 text-sm font-medium text-ink">
						<Timer class="h-4 w-4" />
						Sprint timer
					</div>
					<p class="mt-1.5 text-xs text-muted">Coming soon</p>
				</div>
				<div class="rounded-xl bg-canvas/40 p-4">
					<div class="flex items-center gap-2 text-sm font-medium text-ink">
						<BookOpen class="h-4 w-4" />
						Thesaurus
					</div>
					<p class="mt-1.5 text-xs text-muted">Coming soon</p>
				</div>
			</aside>
		</div>

		<!--	Delete chapter modal	-->
		<div
			v-if="deletingChapter"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			@click.self="deletingChapter = null">
			<div class="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-xl">
				<h2 class="text-lg font-semibold text-ink">Move to trash?</h2>
				<p class="mt-2 text-sm text-muted">
					“{{ deletingChapter.title }}” stays in the trash for 30 days, then it’s gone.
				</p>
				<div class="mt-6 flex justify-end gap-2">
					<button
						class="cursor-pointer rounded-full px-5 py-2 text-sm text-muted transition hover:bg-canvas hover:text-ink"
						type="button"
						@click="deletingChapter = null">
						Cancel
					</button>
					<button
						class="cursor-pointer rounded-full bg-red-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-600"
						type="button"
						@click="confirmDeleteChapter">
						Delete
					</button>
				</div>
			</div>
		</div>

		<!--	Export modal	-->
		<div
			v-if="showExport"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			@click.self="showExport = false">
			<div class="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
				<h2 class="text-xl font-semibold text-ink">Export</h2>
				<p class="mt-1 my-8 text-sm text-muted">Choose a format and the chapters to include.</p>

				<p class="mt-5 mb-2 text-m font-medium text-ink">Format</p>
				<div class="flex gap-2">
					<button
						v-for="f in formats"
						:key="f.value"
						:class="
							format === f.value
								? 'border-violet bg-violet/10 text-violet'
								: 'border-line text-muted hover:bg-canvas hover:text-ink'
						"
						:disabled="f.soon"
						class="flex-1 cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40"
						type="button"
						@click="format = f.value">
						{{ f.label }}
						<span v-if="f.soon" class="ml-1 text-xs">soon</span>
					</button>
				</div>

				<p class="mt-5 mb-2 text-m font-medium text-ink">Chapters</p>
				<div class="max-h-56 space-y-1 overflow-y-auto">
					<label
						v-for="chapter in activeChapters"
						:key="chapter.id"
						class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink transition hover:bg-canvas">
						<input
							:checked="selectedIds.has(chapter.id)"
							class="h-4 w-4 accent-violet"
							type="checkbox"
							@change="toggleExportChapter(chapter.id)" />
						<span class="truncate">{{ chapter.title }}</span>
					</label>
				</div>

				<div class="mt-6 flex justify-end gap-2">
					<button
						class="cursor-pointer rounded-full px-5 py-2 text-sm text-muted transition hover:bg-canvas hover:text-ink"
						type="button"
						@click="showExport = false">
						Cancel
					</button>
					<button
						:disabled="selectedIds.size === 0"
						class="cursor-pointer rounded-full bg-violet px-5 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
						type="button"
						@click="runExport">
						Export
					</button>
				</div>
			</div>
		</div>

		<!--	History modal	-->
		<div
			v-if="showHistory"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			@click.self="showHistory = false">
			<div class="flex max-h-[70vh] w-full max-w-md flex-col rounded-2xl border border-line bg-surface p-6 shadow-xl">
				<h2 class="text-lg font-semibold text-ink">Version history</h2>
				<p class="mt-1 text-sm text-muted">Earlier versions of this chapter.</p>

				<button
					class="mt-4 cursor-pointer self-start rounded-full border border-line px-4 py-2 text-sm text-ink transition hover:bg-canvas"
					type="button"
					@click="saveManualVersion">
					Save a version now
				</button>

				<div class="mt-4 flex-1 space-y-1 overflow-y-auto">
					<p v-if="!versions.length" class="px-2 py-1 text-sm text-muted">No versions yet.</p>

					<div
						v-for="version in versions"
						:key="version.id"
						class="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-canvas">
						<div class="min-w-0">
							<p class="truncate text-ink">{{ version.label ?? formatVersionDate(version.created_at) }}</p>
							<p class="text-xs text-muted">
								{{ version.label ? formatVersionDate(version.created_at) + " · " : "" }}{{ version.word_count }} words
							</p>
						</div>

						<div class="flex shrink-0 items-center gap-1">
							<button
								class="cursor-pointer rounded-full px-3 py-1.5 text-xs text-violet transition hover:bg-violet/10"
								type="button"
								@click="pendingRestore = version">
								Restore
							</button>
							<button
								aria-label="Delete version"
								class="cursor-pointer rounded p-1.5 text-muted transition hover:bg-red-500/10 hover:text-red-400"
								type="button"
								@click="pendingDeleteVersion = version">
								<Trash2 class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>
				</div>

				<div class="mt-5 flex justify-end">
					<button
						class="cursor-pointer rounded-full px-5 py-2 text-sm text-muted transition hover:bg-canvas hover:text-ink"
						type="button"
						@click="showHistory = false">
						Close
					</button>
				</div>
			</div>

			<div
				v-if="pendingRestore"
				class="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4"
				@click.self="pendingRestore = null">
				<div class="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-xl">
					<h2 class="text-lg font-semibold text-ink">Restore this version?</h2>
					<p class="mt-2 text-sm text-muted">
						Your current text is saved as a new version first, so you can undo this.
					</p>
					<div class="mt-6 flex justify-end gap-2">
						<button
							class="cursor-pointer rounded-full px-5 py-2 text-sm text-muted transition hover:bg-canvas hover:text-ink"
							type="button"
							@click="pendingRestore = null">
							Cancel
						</button>
						<button
							class="cursor-pointer rounded-full bg-violet px-5 py-2 text-sm font-medium text-white transition hover:brightness-110"
							type="button"
							@click="restoreVersion(pendingRestore)">
							Restore
						</button>
					</div>
				</div>
			</div>

			<div v-if="pendingDeleteVersion" class="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
				<div class="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-xl">
					<h2 class="text-lg font-semibold text-ink">Delete this version?</h2>
					<p class="mt-2 text-sm text-muted">This can’t be undone.</p>
					<div class="mt-6 flex justify-end gap-2">
						<button
							class="cursor-pointer rounded-full px-5 py-2 text-sm text-muted transition hover:bg-canvas hover:text-ink"
							type="button"
							@click="pendingDeleteVersion = null">
							Cancel
						</button>
						<button
							class="cursor-pointer rounded-full bg-red-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-600"
							type="button"
							@click="removeVersion(pendingDeleteVersion)">
							Delete
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
