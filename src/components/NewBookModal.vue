<script lang="ts" setup>
	import { ref, computed, onMounted, onUnmounted } from "vue";
	import { X, ImagePlus, ChevronDown, BookText, User, Folder, Check } from "lucide-vue-next";
	import type { Book } from "../stores/books";

	const props = defineProps<{ book?: Book | null; saving?: boolean; error?: string }>();

	const MAX_COVER_BYTES = 10 * 1024 * 1024;
	const coverError = ref("");

	const emit = defineEmits<{
		close: [];
		submit: [payload: { title: string; author: string; coverFile: File | null }];
	}>();

	const isEdit = computed(() => !!props.book);

	const title = ref(props.book?.title ?? "");
	const author = ref(props.book?.author ?? "");
	const coverFile = ref<File | null>(null);
	const coverPreview = ref(props.book?.cover_image ?? "");
	const titleInput = ref<HTMLInputElement | null>(null);

	const projectOptions = [{ value: "none", label: "None" }];
	const project = ref("none");
	const projectOpen = ref(false);
	const selectedProject = computed(() => projectOptions.find((p) => p.value === project.value)?.label ?? "None");

	function onKeyDown(e: KeyboardEvent) {
		if (e.key !== "Escape") return;
		if (projectOpen.value) {
			projectOpen.value = false;
			return;
		}
		emit("close");
	}

	onMounted(() => {
		titleInput.value?.focus();
		window.addEventListener("keydown", onKeyDown);
	});

	onUnmounted(() => window.removeEventListener("keydown", onKeyDown));

	function onCoverChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0] ?? null;
		coverError.value = "";
		if (file && file.size > MAX_COVER_BYTES) {
			coverError.value = "That image is over 10 MB. Please choose a smaller one.";
			coverFile.value = null;
			return;
		}
		coverFile.value = file;
		if (file) coverPreview.value = URL.createObjectURL(file);
	}

	function submit() {
		if (props.saving) return;
		if (!title.value.trim()) return;
		emit("submit", {
			title: title.value.trim(),
			author: author.value.trim(),
			coverFile: coverFile.value,
		});
	}
</script>

<template>
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
		<div class="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl">
			<div class="mb-5 flex items-center justify-between">
				<h2 class="text-xl font-semibold text-ink">{{ isEdit ? "Edit book" : "New book" }}</h2>
				<button
					aria-label="Close"
					class="cursor-pointer rounded-md p-1 text-muted transition hover:bg-canvas hover:text-ink"
					@click="emit('close')">
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="flex gap-5">
				<label
					class="group relative flex aspect-2/3 w-36 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 self-start mt-4 overflow-hidden rounded-xl bg-linear-to-br from-grad-start to-grad-end text-white/90">
					<img v-if="coverPreview" :src="coverPreview" alt="" class="absolute inset-0 h-full w-full object-cover" />
					<template v-else>
						<ImagePlus class="h-6 w-6" />
						<span class="text-sm font-medium">Add Cover</span>
					</template>

					<div
						v-if="coverPreview"
						class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 text-white opacity-0 backdrop-blur-sm transition duration-300 group-hover:opacity-100">
						<ImagePlus class="h-6 w-6" />
						<span class="text-xs font-medium">Change cover</span>
					</div>

					<input type="file" accept="image/png, image/jpeg, image/webp" class="hidden" @change="onCoverChange" />
				</label>

				<form class="flex flex-1 flex-col gap-3.5" @submit.prevent="submit">
					<div>
						<label for="title" class="mb-1.5 block text-sm font-medium text-ink">Title</label>
						<div class="relative">
							<BookText class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
							<input
								id="title"
								v-model="title"
								ref="titleInput"
								required
								type="text"
								placeholder="Untitled draft"
								class="w-full rounded-2xl border border-line bg-canvas py-3 pl-12 pr-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-violet" />
						</div>
					</div>

					<div>
						<label for="author" class="mb-1.5 block text-sm font-medium text-ink">Author</label>
						<div class="relative">
							<User class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
							<input
								id="author"
								v-model="author"
								type="text"
								placeholder="Author name"
								class="w-full rounded-2xl border border-line bg-canvas py-3 pl-12 pr-4 text-sm text-ink outline-none transition placeholder:text-muted focus:border-violet" />
						</div>
					</div>

					<div>
						<label class="mb-1.5 block text-sm font-medium text-ink">Project</label>
						<div class="relative">
							<button
								type="button"
								@click="projectOpen = !projectOpen"
								class="relative flex w-full cursor-pointer items-center rounded-2xl border bg-canvas py-3 pl-12 pr-4 text-left text-sm text-ink transition"
								:class="projectOpen ? 'border-violet' : 'border-line'">
								<Folder class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
								<span>{{ selectedProject }}</span>
								<ChevronDown class="ml-auto h-4 w-4 text-muted transition" :class="{ 'rotate-180': projectOpen }" />
							</button>

							<div
								v-if="projectOpen"
								class="absolute left-0 right-0 top-full z-20 mt-2 rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
								<button
									v-for="p in projectOptions"
									:key="p.value"
									type="button"
									@click="
										project = p.value;
										projectOpen = false;
									"
									class="flex w-full cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition"
									:class="project === p.value ? 'bg-violet/10 font-medium text-violet' : 'text-ink hover:bg-canvas'">
									{{ p.label }}
									<Check v-if="project === p.value" class="h-4 w-4" />
								</button>
							</div>
						</div>
						<div v-if="projectOpen" class="fixed inset-0 z-10" @click="projectOpen = false"></div>
					</div>

					<div class="mt-1 flex items-center justify-end gap-2">
						<p v-if="coverError || error" class="mr-auto text-sm text-red-400">{{ coverError || error }}</p>
						<button
							class="cursor-pointer rounded-full px-5 py-2 text-sm text-muted transition hover:bg-canvas hover:text-ink"
							type="button"
							@click="emit('close')">
							Cancel
						</button>
						<button
							class="cursor-pointer rounded-full bg-violet px-5 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
							type="submit"
							:disabled="saving">
							{{ saving ? "Saving..." : isEdit ? "Save" : "Create" }}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>
