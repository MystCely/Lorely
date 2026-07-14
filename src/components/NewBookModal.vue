<script lang="ts" setup>
	import { ref } from "vue";
	import { X, ImagePlus } from "lucide-vue-next";

	const emit = defineEmits<{
		close: [];
		create: [payload: { title: string; author: string }];
	}>();

	const title = ref("");
	const author = ref("");

	function submit() {
		if (!title.value.trim()) return;
		emit("create", {
			title: title.value.trim(),
			author: author.value.trim(),
		});
	}
</script>

<template>
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
		<div class="w-full max-w-lg rounded-lg border border-line bg-surface p-6 shadow-xl">
			<div class="mb-5 flex items-center justify-between">
				<h2 class="text-lg font-semibold text-ink">New book</h2>
				<button
					aria-label="Close"
					class="rounded-md p-1 text-muted transition hover:bg-canvas hover:text-ink"
					@click="emit('close')">
					<X class="h-5 w-5" />
				</button>
			</div>

			<div class="flex gap-5">
				<div
					class="flex aspect-2/3 w-40 shrink-0 flex-col items-center justify-center gap-2 rounded-md bg-linear-to-br from-violet to-forest text-white/90">
					<ImagePlus class="h-6 w-6" />
					<span class="text-xs font-medium">Add cover</span>
					<span class="text-[10px] text-white/70">coming soon</span>
				</div>

				<form class="flex flex-1 flex-col gap-4" @submit.prevent="submit">
					<div class="flex flex-col gap-1">
						<label class="text-sm text-muted" for="title">Title</label>
						<input
							id="title"
							v-model="title"
							autofocus
							class="rounded-md border border-line bg-canvas px-3 py-1.5 text-sm text-ink outline-none transition focus:border-violet"
							required
							type="text" />
					</div>

					<div class="flex flex-col gap-1">
						<label class="text-sm text-muted" for="author">Author</label>
						<input
							id="author"
							v-model="author"
							class="rounded-md border border-line bg-canvas px-3 py-1.5 text-sm text-ink outline-none transition focus:border-violet"
							type="text" />
					</div>

					<div class="mt-auto flex justify-end gap-2">
						<button
							class="rounded-md px-4 py-2 text-sm text-muted transition hover:bg-canvas hover:text-ink"
							type="button"
							@click="emit('close')">
							Cancel
						</button>
						<button
							class="rounded-md bg-violet px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
							type="submit">
							Create
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</template>
