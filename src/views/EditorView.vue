<script lang="ts" setup>
	import { ref, onMounted, onBeforeUnmount } from "vue";
	import { useRoute, useRouter } from "vue-router";
	import { storeToRefs } from "pinia";
	import { useEditor, EditorContent } from "@tiptap/vue-3";
	import StarterKit from "@tiptap/starter-kit";
	import {
		Plus,
		Download,
		FileText,
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
	} from "lucide-vue-next";
	import { useChaptersStore, type Chapter } from "../stores/chapters";
	import { useBooksStore } from "../stores/books";
	import { useEditorUiStore } from "../stores/editorUi";

	const route = useRoute();
	const router = useRouter();
	const chaptersStore = useChaptersStore();
	const booksStore = useBooksStore();
	const { chapters } = storeToRefs(chaptersStore);
	const { fetchChapters, addChapter, getChapter, updateChapter, deleteChapter } = chaptersStore;

	const editorUi = useEditorUiStore();
	const { chaptersCollapsed } = storeToRefs(editorUi);

	const editingChapterId = ref<string | null>(null);
	const editingTitle = ref("");
	const deletingChapter = ref<Chapter | null>(null);

	const activeChapterId = ref<string | null>(null);
	const loading = ref(true);
	const saveState = ref<"idle" | "saving" | "saved" | "error">("idle");
	let saveTimer: ReturnType<typeof setTimeout> | undefined;
	let isLoadingChapter = false;

	const vFocus = { mounted: (el: HTMLElement) => el.focus() };

	const editor = useEditor({
		extensions: [StarterKit],
		content: "",
		editorProps: { attributes: { class: "prose dark:prose-invert max-w-none min-h-[70vh] focus:outline-none" } },
		onUpdate: () => {
			if (isLoadingChapter) return;
			scheduleSave();
		},
	});

	onMounted(async () => {
		await fetchChapters(String(route.params.id));
		booksStore.fetchBook(String(route.params.id));
		loading.value = false;

		const wanted = route.query.chapter as string | undefined;
		const initial = chapters.value.find((c) => c.id === wanted) ?? chapters.value[0];
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
		isLoadingChapter = false;

		router.replace({ query: { ...route.query, chapter: id } });
	}

	async function saveActiveChapter() {
		if (!activeChapterId.value || !editor.value) return;
		const id = activeChapterId.value;
		saveState.value = "saving";
		try {
			await updateChapter(id, { content: editor.value.getJSON() });
			saveState.value = "saved";
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
		await deleteChapter(chapter.id);
		deletingChapter.value = null;
		if (wasActive) {
			const next = chapters.value[0];
			if (next) selectChapter(next.id);
			else editor.value?.commands.setContent("");
		}
	}
</script>

<template>
	<div class="flex h-full flex-col gap-6 p-3">
		<!-- Full-width toolbar -->
		<div class="panel flex items-center gap-1 rounded-2xl px-3 py-2">
			<button
				type="button"
				@click="editor?.chain().focus().toggleBold().run()"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				:class="{ 'bg-canvas text-ink': editor?.isActive('bold') }">
				<Bold class="h-4 w-4" />
			</button>
			<button
				type="button"
				@click="editor?.chain().focus().toggleItalic().run()"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				:class="{ 'bg-canvas text-ink': editor?.isActive('italic') }">
				<Italic class="h-4 w-4" />
			</button>
			<button
				type="button"
				@click="editor?.chain().focus().toggleStrike().run()"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				:class="{ 'bg-canvas text-ink': editor?.isActive('strike') }">
				<Strikethrough class="h-4 w-4" />
			</button>

			<div class="mx-2 h-5 w-px bg-line"></div>

			<button
				type="button"
				@click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				:class="{ 'bg-canvas text-ink': editor?.isActive('heading', { level: 1 }) }">
				<Heading1 class="h-4 w-4" />
			</button>
			<button
				type="button"
				@click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				:class="{ 'bg-canvas text-ink': editor?.isActive('heading', { level: 2 }) }">
				<Heading2 class="h-4 w-4" />
			</button>

			<div class="mx-2 h-5 w-px bg-line"></div>

			<button
				type="button"
				@click="editor?.chain().focus().toggleBulletList().run()"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				:class="{ 'bg-canvas text-ink': editor?.isActive('bulletList') }">
				<List class="h-4 w-4" />
			</button>
			<button
				type="button"
				@click="editor?.chain().focus().toggleOrderedList().run()"
				class="cursor-pointer rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink"
				:class="{ 'bg-canvas text-ink': editor?.isActive('orderedList') }">
				<ListOrdered class="h-4 w-4" />
			</button>

			<span v-if="saveState !== 'idle'" class="ml-auto pr-3 text-xs text-muted">
				{{ saveState === "saving" ? "Saving..." : saveState === "error" ? "Couldn't save" : "Saved" }}
			</span>
		</div>

		<div class="flex min-h-0 flex-1 gap-3">
			<!-- Icon rail -->
			<nav class="panel flex w-16 shrink-0 flex-col items-center gap-4 rounded-2xl py-4">
				<button
					type="button"
					aria-label="Toggle chapters"
					@click="editorUi.toggleChapters"
					class="cursor-pointer rounded-full p-2.5 text-muted transition hover:bg-canvas hover:text-ink">
					<PanelLeft class="h-5 w-5" />
				</button>
				<button type="button" aria-label="Manuscript" class="rounded-full bg-canvas p-2.5 text-ink">
					<BookText class="h-5 w-5" />
				</button>
				<button
					type="button"
					aria-label="Planner"
					class="cursor-pointer rounded-full p-2.5 text-muted transition hover:bg-canvas hover:text-ink">
					<LayoutGrid class="h-5 w-5" />
				</button>
				<button
					type="button"
					aria-label="Settings"
					class="mt-auto cursor-pointer rounded-full p-2.5 text-muted transition hover:bg-canvas hover:text-ink">
					<Settings class="h-5 w-5" />
				</button>
			</nav>

			<!-- Chapters sidebar (collapsible) -->
			<div
				class="shrink-0 overflow-hidden rounded-2xl transition-all duration-300 ease-out"
				:class="chaptersCollapsed ? 'w-0 opacity-0' : 'w-72 opacity-100'">
				<aside class="panel flex h-full w-72 flex-col rounded-2xl">
					<div class="flex gap-2 p-4">
						<button
							type="button"
							@click="handleAddChapter"
							class="flex cursor-pointer items-center gap-1.5 rounded-full bg-violet px-4 py-2 text-sm font-medium text-white transition hover:brightness-110">
							<Plus class="h-4 w-4" />
							Add new
						</button>
						<button
							type="button"
							class="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-ink transition hover:bg-canvas">
							<Download class="h-4 w-4" />
							Import
						</button>
					</div>
					<div class="flex-1 overflow-y-auto px-3 pb-3">
						<p v-if="loading" class="px-2 py-1 text-sm text-muted">Loading…</p>
						<p v-else-if="!chapters.length" class="px-2 py-1 text-sm text-muted">No chapters yet.</p>
						<!-- Chapter list -->
						<nav v-else class="flex flex-col gap-1">
							<div
								v-for="chapter in chapters"
								:key="chapter.id"
								class="group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition"
								:class="
									editingChapterId === chapter.id
										? ''
										: chapter.id === activeChapterId
											? 'bg-canvas font-medium text-ink'
											: 'text-muted hover:bg-canvas/60 hover:text-ink'
								">
								<div v-if="editingChapterId === chapter.id" class="relative w-full">
									<FileText class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
									<input
										v-focus
										v-model="editingTitle"
										@keydown.enter.prevent="saveRename"
										@keydown.esc="cancelRename"
										@blur="cancelRename"
										class="w-full rounded-2xl border border-line bg-canvas py-3 pl-12 pr-4 text-sm text-ink outline-none transition focus:border-violet" />
								</div>

								<template v-else>
									<FileText class="h-4 w-4 shrink-0" />
									<button
										type="button"
										@click="selectChapter(chapter.id)"
										class="min-w-0 flex-1 cursor-pointer truncate text-left">
										{{ chapter.title }}
									</button>
									<button
										type="button"
										aria-label="Rename chapter"
										@click.stop="startRename(chapter)"
										class="shrink-0 cursor-pointer rounded p-1 text-muted opacity-0 transition hover:bg-canvas hover:text-ink group-hover:opacity-100">
										<Pencil class="h-3.5 w-3.5" />
									</button>
									<button
										type="button"
										aria-label="Delete chapter"
										@click.stop="deletingChapter = chapter"
										class="shrink-0 cursor-pointer rounded p-1 text-muted opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100">
										<Trash2 class="h-3.5 w-3.5" />
									</button>
								</template>
							</div>
						</nav>
					</div>
				</aside>
			</div>

			<!-- Editor -->
			<main class="flex-1 overflow-y-auto">
				<div
					v-if="activeChapterId"
					class="mx-auto mb-8 max-w-3xl rounded-xs border border-line bg-surface px-16 py-14 shadow-sm">
					<EditorContent :editor="editor" />
				</div>
				<p v-else-if="!loading" class="p-8 text-sm text-muted">Select or create a chapter to start writing.</p>
			</main>

			<!-- Right sidebar (placeholders) -->
			<aside class="panel flex w-72 shrink-0 flex-col gap-4 overflow-y-auto rounded-2xl p-4">
				<div class="rounded-xl bg-canvas/40 p-4">
					<div class="flex items-center gap-2 text-sm font-medium text-ink">
						<Target class="h-4 w-4" />
						Word goal
					</div>
					<p class="mt-1.5 text-xs text-muted">Coming soon</p>
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
		<div
			v-if="deletingChapter"
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			@click.self="deletingChapter = null">
			<div class="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-xl">
				<h2 class="text-lg font-semibold text-ink">Delete chapter</h2>
				<p class="mt-2 text-sm text-muted">Delete “{{ deletingChapter.title }}”? This can’t be undone.</p>
				<div class="mt-6 flex justify-end gap-2">
					<button
						type="button"
						class="cursor-pointer rounded-full px-5 py-2 text-sm text-muted transition hover:bg-canvas hover:text-ink"
						@click="deletingChapter = null">
						Cancel
					</button>
					<button
						type="button"
						class="cursor-pointer rounded-full bg-red-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-red-600"
						@click="confirmDeleteChapter">
						Delete
					</button>
				</div>
			</div>
		</div>
	</div>
</template>
