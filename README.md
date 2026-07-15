# Lorely

A clean, distraction-free web app for drafting novels. Organize your manuscripts, write, and keep your work safe in the cloud.

I'm a fiction writer, and I wanted a calmer, less cluttered place to draft my novels than what I'd been using, so I started building one. Lorely is also where I put my full-stack skills into practice: real authentication, a database with per-user security, and cloud file storage, in a TypeScript codebase I care about keeping clean.

## Tech stack

- **Framework:** Vue 3 + TypeScript (Composition API, `<script setup>`)
- **Build tool:** Vite
- **Styling:** Tailwind CSS v4 (CSS-first config, tokenized design system)
- **Routing:** Vue Router (nested routes)
- **State:** Pinia
- **Backend:** Supabase (Postgres, Auth, Storage, Row-Level Security)
- **Icons:** lucide-vue-next
- **Planned:** Tiptap (rich-text editor)

## Features

- **Email and password authentication** with route guards and sessions that persist across refreshes
- **Manuscript library.** Create, edit, and delete books, backed by a real Postgres database
- **Cover image uploads** to Supabase Storage, with a gradient fallback when there's no cover
- **Per-user data isolation** enforced by Row-Level Security, so you only ever see your own books
- **Light and dark mode** built on a tokenized theme, with one source of truth for every color
- **Keyboard-friendly modals.** Enter to submit, Escape to close

## Architecture notes

A few decisions I'm happy with:

- **Row-Level Security as the security model.** The client queries `select * from books` with no owner filter. Postgres RLS policies transparently scope every read and write to the signed-in user, so access control lives in the database rather than in frontend checks that can be bypassed.
- **A tokenized design system.** Colors, the navbar height (`--nav-h`), the font, and transition timing are all CSS variables. Change one line and the whole app updates in both light and dark mode, with no hard-coded colors anywhere.
- **One modal for create and edit.** The book form takes an optional `book` prop. When it's present, the modal opens in edit mode, pre-filled, with a Save button. When it's absent, it opens in create mode. One component instead of two near-identical ones.

## Running locally

1. Clone and install:
   ```bash
   git clone <repo-url>
   cd lorely
   npm install
   ```
2. Create a [Supabase](https://supabase.com) project, copy `.env.example` to `.env`, and fill in your project URL and publishable key:
   ```
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
3. In Supabase, create the `books` and `projects` tables with Row-Level Security enabled, and a public `covers` storage bucket. A single setup script is on the roadmap.
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Roadmap

Built at a relaxed, hobby pace. Next up:

- Rich-text editor (Tiptap) with chapters and autosave
- Version history and backups
- Word-count goals, book status, search and filter
- Export to PDF and Word

## Status

A solo work in progress. Part personal writing tool, part portfolio project, actively being built.
