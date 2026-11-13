# Admin re-design proposal (#75)

Direction: minimal, compact, dark. One accent, status as green / amber / red dots, 13px body, 28px rows, 26px controls, primary button white on black. Every screen, modal and state of `client/src` is covered by a mockup in `mockups/` (one PNG per ticket group, 1280 wide, placeholder data only).

## 1. Decisions taken (owner, 2026-11-11)

- **Bucket picker in the top bar only.** No bucket sidebar or rail. The 300px sidebar, bucket cards, bucket search, "Total Buckets / Total Files" and the `BucketDetails` stub are deleted.
- **Primary button is white** (`fg-0` on `bg-0`), not accent. Accent is reserved for selection, links, focus, the set icon.
- **Context-menu actions without a server endpoint are omitted, not disabled.** Server routes on `main` cover upload, buckets, presigned URLs, manifests, collections CRUD and (on PR #78) generate-sizes. There is no rename, object delete or ZIP endpoint, so the menu has Open, Download (per size), Copy public URL and Add to collection… only.
- **No per-set status dots in the tree.** `FileTreeResponse.tree` is `TreeNode[]` (`id, parentId, name, depth, isFolder, childCount, size, presignedUrl`): no manifest data, so a dot would need a manifest fetch per set. Gaps show in the details panel and in `SizeChips` only.
- **Settings button removed.** It only logged to the console. A real Settings page returns in #121 (mockups 10a–10c).
- **One PR per ticket**, in the order below; 1 first so the #13 / #23 UI lands on the new design.

## 2. Reference branches

Only `feat/context-menu` (8 commits, last touched 2026-08-01, 51 commits behind `main`) is a re-design attempt; it is a reference, not a base. Taken from it: the Radix `ContextMenu` primitive (`client/src/components/ui/context-menu.tsx`), the rule that colour is reserved for destructive items, no icons in menu items with right-aligned mono sizes, per-node-type item sets, and node components split into `explorer/nodes/`. Not taken: its `wip` `toggleExpanded`, `fileName.split("_")[0]` variant labels (`main` has `getVariantType` / `pickPreviewVariant`), `IMAGE_VARIANT_ORDER` (superseded by `PREVIEW_ORDER`), and the disabled Download-all-ZIP item.

`13-generate-missing-sizes` (PR #78) and `23-per-file-upload-results` (PR #79) carry the only client changes outside `main` that the re-design must land on: a "Generate missing sizes" button + error line in `set-info.tsx`, and the `UploadFileResult` complete screen in `screen.complete.tsx`.

## 3. What falls short today

- **Three palettes at once**: `slate` (header, panels), `neutral` (sidebar, dialog, menus), `sky` (everything interactive) plus `blue-900` pills on the complete screen and an unused `--background`. Nothing is tokenised.
- **Density**: 64px header, 300px sidebar of 4-line bucket cards, `p-6` on every details section, ~40px tree rows. The sizes strip and the collection section each need a scroll to reach.
- **Hierarchy**: six `size-8 rounded-lg bg-sky-500/20` icon tiles with subtitles ("Cloud File Management", "File Preview & Details"). Every heading has an icon.
- **Accent overload**: sky on folder icons, chevrons, file icons, badges, buttons, links, focus. Selection and a primary button look the same.
- **Inconsistent controls**: `PRIMARY_BUTTON_CLASS` (sky), upload submit (light neutral), folder-select buttons (`bg-neutral-500`), ghost text buttons; five input stylings; `window.prompt` / `window.confirm` for rename, new collection, new folder and every destructive action.
- **States**: `ProcessingScreen` and `ErrorScreen` are one-line placeholders; the upload error screen loses the picked files. Legacy gaps are handled (good) but read as inline "(mismatched)" text.
- **Keyboard / a11y**: tree is a list of `<button>`s, no `role="tree"`, no arrow keys, no `aria-selected`; browser-default focus rings on dark; the collection tiles are `div role=button` with no visible focus; `Dialog` uses the shadcn light defaults overridden per call site.

## 4. Design tokens

CSS variables in `globals.css`, exposed through `tailwind.config.ts` `theme.extend`; delete `PRIMARY_BUTTON_CLASS` / `FIELD_CLASS`.

| Role | Token | Value | Tailwind |
|---|---|---|---|
| Canvas | `--bg-0` | `#0b0c0e` | `bg-canvas` |
| Panel | `--bg-1` | `#121316` | `bg-panel` |
| Raised (inputs, chips, hover) | `--bg-2` | `#191b1f` | `bg-raised` |
| Pressed / menu hover | `--bg-3` | `#22252b` | `bg-pressed` |
| Hairline | `--line` | `#262930` | `border-line` |
| Strong border (inputs, menus) | `--line-strong` | `#353943` | `border-line-strong` |
| Text | `--fg-0 / 1 / 2` | `#e8eaed / #a4a9b3 / #80868f` | `text-fg / text-fg-1 / text-fg-2` |
| Accent (selection, links, focus) | `--accent` | `#7cb8ff` | `text-accent`, `bg-accent/12` |
| Status | `--ok / --warn / --err` | `#4ade80 / #fbbf24 / #f87171` | `text-ok` etc, `bg-ok/10` |

- **Type**: 13px body / 12px secondary / 11px captions and chips; Geist Sans; Geist Mono for paths, keys, sizes, counts, slugs. Weights 400 and 500 (600 for dialog titles). Uppercase only for 11px section labels at `.06em`.
- **Spacing**: 4px grid. Row 28px (menu item 24px), control 26px, panel header 34px, top bar 36px, modal header 40px, modal footer 44px, chip / badge 18px.
- **Radii**: 3 / 5 / 8px. Chips and menu items 3; buttons, inputs, rows 5; panels, modals, menus 8. Pills only for status badges.
- **Status is dot + text**, never a filled row. Amber = gap (missing, mismatched, no alt, refused, client-side warning). Red = failure (failed upload, no manifest, unreadable manifest, request error). Green = present / stored / saved.
- **Focus**: `:focus-visible` 2px accent outline, 1px offset; inputs swap border to accent.
- **Motion**: 100ms colour transitions, Radix enter / exit on menus and dialogs, one indeterminate bar for uploads and generate.

### Density target
A 1440×900 viewport shows the top bar, ~26 tree rows, and the full details panel (preview + inspector with sizes and collection fields) with no scrolling.

## 5. Component rules

See `mockups/01-tokens-primitives.png` for every primitive in every state.

- **Buttons**: `primary` (white), `default` (raised + strong border), `ghost`, `icon` (26×26); `danger` is a text-colour modifier. Disabled = 45% opacity. Pending = spinner + "…ing" label, disabled.
- **Inputs / selects**: 26px, raised bg, strong border, accent border on focus, red border + 11px red line when a save failed. Label above in 11px `fg-2`. Save-on-blur fields show "Saved" / "Could not save · reason" below.
- **Chips** (`SizeChips`): 18px mono `name width`; `missing` = dashed outline; `mismatched` = amber tint + ` ≠` with the reason in `title`; `notApplicable` hidden; original is a chip too.
- **Badges**: pill, dot + count / word. Used in the details header, upload summary, collection rows and tiles.
- **StateMessage**: icon + title + message, no circle tile; `inline` becomes a 12px notice bar (neutral / error / ok).
- **Tree row**: 28px, 16px indent, chevron slot always reserved, set rows get the accent set icon, right side mono count or size. Selected = accent 2px left stripe + 12% fill; hover = raised; focus = 2px inset outline.
- **Menus**: 24px items, no icons, mono right-aligned size or shortcut, separator before destructive items, destructive in `--err`.
- **Modals**: 40px header (title, mono subtitle, actions, close), body on `bg-1`, 44px footer on `bg-0` with actions right and secondary info left. `small` 420px for confirm / prompt, default 720px, `wide` 860px.
- **Feedback**: no toast system. "Copy URL" swaps its label to "Copied" for 1.5s; generate-sizes tints the written rows green; saves show a line under the field.

## 6. Mockup index

| File | Ticket | Screens / states |
|---|---|---|
| [`mockups/01-tokens-primitives`](mockups/01-tokens-primitives.png) | 1 | Tokens, type, radii, heights, focus; buttons (primary / default / ghost / icon / danger / disabled / pending); inputs (idle / focus / disabled / invalid / icon / select / saved); checkbox (off / on / indeterminate / locked); chips, badges, counts, kbd; StateMessage empty / loading / error; notice bar neutral / error / ok; Dialog shell; ConfirmDialog pending; PromptDialog |
| [`mockups/02-topbar-bucket-picker`](mockups/02-topbar-bucket-picker.png) | 2 | Top bar with picker open; top bar closed with a file selected and with nothing selected; page `/`; "Unable to retrieve buckets"; "No buckets found" |
| [`mockups/03-tree`](mockups/03-tree.png) | 3 | Loaded with partial notice, hover, keyboard focus, selected, long name, text and video rows; loading; request failed with Retry; empty bucket; filter with matches; filter with no matches |
| [`mockups/04-details`](mockups/04-details.png) | 4 | Set selected (sizes rows, collection fields); video selected; plain file selected (+ "Copied"); nothing selected; manifest loading; legacy set with no manifest; unreadable manifest; manifest request failed; set not in a collection (alt disabled); collections failed to load; "Could not save" on a field |
| [`mockups/05-context-menu`](mockups/05-context-menu.png) | 5 | Set row menu with Download submenu; folder row menu; plain file row menu; Add to collection… submenu |
| [`mockups/06-dialogs`](mockups/06-dialogs.png) | 6 | Confirm: delete collection, remove photo, move sets (with list); Prompt: new folder (invalid), new collection, rename collection (server error) |
| [`mockups/07a-collections-list`](mockups/07a-collections-list.png) | 7 | List with rows, hover, no-alt badges, per-row error, partial notice; loading; failed; empty |
| [`mockups/07b-collections-detail`](mockups/07b-collections-detail.png) | 7 | Detail with photo selected and a drag in progress (lifted tile, drop indicator, focus ring, missing tile); no photo selected; reorder failed; missing-in-bucket photo selected |
| [`mockups/07c-collections-pick`](mockups/07c-collections-pick.png) | 7 | Add sets (filter, indeterminate / ticked / locked rows, "in X" note); Create (name, slug hint, partial notice, create error, disabled submit) |
| [`mockups/08a-upload-select`](mockups/08a-upload-select.png) | 8 | Idle with nothing picked (folder rows, drop zone); idle with files picked in a leaf folder, client-side warnings, drag-over strip |
| [`mockups/08b-upload-progress-error`](mockups/08b-upload-progress-error.png) | 8 | Uploading (indeterminate bar, close disabled); request failed with files kept |
| [`mockups/08c-upload-complete`](mockups/08c-upload-complete.png) | 8 (stacked on #79) | Mixed stored / refused / failed; all stored; nothing stored |
| [`mockups/09-size-status`](mockups/09-size-status.png) | 9 (stacked on #78) | SizeChips in every state (complete, missing, mismatched, small source, no manifest, loading); Sizes block with Generate idle / generating / generated; generate failed part-way; no original kept; collection editor strip |
| [`mockups/07d-collections-pick-previews`](mockups/07d-collections-pick-previews.png) | #111 | Set picker with row thumbnails and the Picked tray |
| [`mockups/10a-settings-hooks`](mockups/10a-settings-hooks.png) | #121 | `/settings` Deploy hooks tab: hook rows (quiet ok, red failure), pending notice, Deploy now; tab bar with an illustrative second tab; top-bar deploy status on the dashboard (pending / ok / failed / none); inline Test and Deploy now results |
| [`mockups/10b-settings-add-hook`](mockups/10b-settings-add-hook.png) | #121 | Add hook (https error after blur, valid); Edit hook (Replace URL); Delete hook (ConfirmDialog, pending); server error |
| [`mockups/10c-settings-empty`](mockups/10c-settings-empty.png) | #121 | No hooks yet; loading; failed to load |

## 7. Ticket breakdown (ordered, one PR each)

### 1. Tokens and primitives
**Covers**: `globals.css`, `tailwind.config.ts`, `ui/button.tsx` (new), `ui/input.tsx` + `ui/select.tsx` (new), `ui/chip.tsx` + `ui/badge.tsx` (new), `ui/state-message.tsx`, `ui/dialog.tsx`, `ui/confirm-dialog.tsx` + `ui/prompt-dialog.tsx` (new, built on Dialog), `ui/scroll-area.tsx`, `ui/separator.tsx`; delete `PRIMARY_BUTTON_CLASS` / `FIELD_CLASS` and swap every call site to the primitives with no layout change.
**Mockups**: `01-tokens-primitives.png`.
**Acceptance**: every colour in `client/src` comes from a token (no `slate-*`, `neutral-*`, `sky-*`, `blue-*`, `red-*`, `amber-*`, `green-*` classes remain); `Button` has `primary / default / ghost / icon` + `danger` + disabled + pending; `Input` / `Select` have focus and invalid states; `StateMessage` renders `lg / sm / inline` in the new shape; `Dialog` is dark by default; `ConfirmDialog` / `PromptDialog` exist and are exported but not yet wired; `:focus-visible` ring on every control; lint + type check pass.
**Blockers**: none.

### 2. Top bar, bucket picker and page states
**Covers**: `explorer/header.tsx` → `explorer/top-bar.tsx`, new `explorer/bucket-picker.tsx`, `explorer/index.tsx` and `layout.main-content.tsx` (drop `Sidebar`); delete `layout.sidebar.tsx`, `bucket/card.tsx`, `bucket/list.tsx`, `bucket/search.tsx`, `bucket/details.tsx`, `bucketSearchTerm` in `explorer-provider.tsx`; `app/page.tsx`; the `StateMessage` screens in `app/dashboard/page.tsx`.
**Mockups**: `02-topbar-bucket-picker.png`.
**Acceptance**: 36px bar with brand, picker, breadcrumb of the active node, Collections (ghost + count), Upload (primary); no Settings; picker lists every bucket with region, count, size (lower-bound wording when `partial`) and a tick on the active one; choosing a bucket updates `?bucket=&region=` through nuqs exactly as `BucketList` does today; `/` and the two page-level states use the new tokens; the `h-screen` grid has no scroll at 1440×900.
**Blockers**: 1.

### 3. File tree
**Covers**: `explorer/index.tsx` `FileTree` → `explorer/tree.tsx` + `explorer/nodes/{folder,file,set}.tsx` (from the branch), `panel.browser.tsx` (pane head, notice, footer), `partial-notice.tsx` (uses the notice bar), `utils.ts` `getDepthPadding`.
**Mockups**: `03-tree.png`.
**Acceptance**: 28px rows at 16px indent, chevron slot reserved, selected stripe, hover, visible focus; `role="tree"` / `treeitem`, `aria-expanded`, `aria-selected`; `↑ ↓ → ← ⏎` navigation, `/` focuses the filter, `esc` clears it; client-side filter keeps ancestors and highlights matches, with a "No matches" state; collapse-all; loading / failed (with Retry) / empty states; footer shows the item count (lower-bound wording when `partial`) and total size; no manifest requests are made to render rows.
**Blockers**: 1 (2 is independent but shares `explorer/index.tsx`; branch from whichever merges first).

### 4. Details panel
**Covers**: `panel.details.tsx` (header, preview, inspector), `set-info.tsx` → `explorer/sizes.tsx` (rows), `panel.collection.tsx` (fields), `photo-text-fields.tsx` (save result line).
**Mockups**: `04-details.png`.
**Acceptance**: header with name, folder, status badge, Open, Copy URL ("Copied" for 1.5s); checkerboard preview with size chips, `<video controls>` for videos, file icon + type for other files; inspector key / value (Public URL, Original, Inline blur, Created); Sizes rows from `sizeStatuses` with dot states and a link per present row; Collection select + alt + caption with disabled placeholder when not in a collection; states: nothing selected, manifest loading (skeleton), 404 "No manifest" (tree files listed as chips), 422 "Unreadable manifest", manifest request failed with Retry, collections failed, "Could not save" under the field; `window.prompt` / `confirm` calls stay until ticket 6 (unchanged behaviour).
**Blockers**: 1.

### 5. Context menu
**Covers**: `ui/context-menu.tsx` (ported, re-tokened), `explorer/nodes/*` (wrap rows), item sets per node type, clipboard + download helpers.
**Mockups**: `05-context-menu.png`.
**Acceptance**: set rows: Open, Download › (sizes present in the tree, mono size), Copy public URL, Add to collection… › (collections with a tick on the current one, New collection…, Remove from X); plain file rows: Open, Download, Copy public URL; folder rows: Expand / Collapse, Copy path, Add n sets to collection…; no Rename, Delete or ZIP items; `⇧F10` / menu key opens on the focused row; Add / Move / Remove go through the existing `useSetMembers` / `useCreateCollection` mutations and the ticket 6 dialogs when they exist (until then the existing `confirm` in `panel.collection.tsx`).
**Blockers**: 3, 6 (for the dialogs; can stack on 6's branch).

### 6. Confirm and prompt dialogs
**Covers**: wire `ConfirmDialog` / `PromptDialog` into `collections-modal/screen.list.tsx` (rename, delete), `screen.detail.tsx` (remove), `confirm-move.ts` (create, add sets), `panel.collection.tsx` (new collection, remove, move), `upload-modal/folder-select` (new folder).
**Mockups**: `06-dialogs.png`.
**Acceptance**: zero `window.confirm` / `window.prompt` in `client/src`; each dialog names the thing and the consequence (alt text and captions deleted, collection removed when empty, sets listed on a move); destructive action is a red-text default button; pending state disables both buttons and spins the action; a server error stays in the dialog with Retry; Enter submits, Escape cancels; new-folder rejects `/`.
**Blockers**: 1.

### 7. Collections modal
**Covers**: `collections-modal/index.tsx` (shell, header per screen), `screen.list.tsx`, `screen.detail.tsx`, `screen.create.tsx`, `add-sets.tsx`, `set-picker.tsx`, `collection-thumb.tsx`.
**Mockups**: `07a-collections-list.png`, `07b-collections-detail.png`, `07c-collections-pick.png`.
**Acceptance**: list rows at 44px with cover thumb, name, slug · count, "n no alt" badge, rename / delete icons, per-row error line, partial notice; loading / failed (Retry) / empty (with New collection) states; detail with 96px tiles (position, Cover, No alt, "Missing in bucket", drop indicator, lifted tile at 40%, focus ring), editor column with Saved / Could not save lines, Set as cover, Remove, `SizeChips`; "no photo selected" hint; reorder failure notice with the saved order restored; missing-in-bucket photo editable with cover disabled; Add sets and Create as 28px picker rows with checkbox (ticked / indeterminate / locked), "in X" note, a client-side filter, footer counts, disabled submit until valid, error notice; modal titles and widths per screen.
**Blockers**: 1, 6, 9 (for `SizeChips` in the editor; use the existing strip until 9 merges).

### 8. Upload modal
**Covers**: `upload-modal/index.tsx`, `provider.tsx` (files move into the provider), `screen.upload.tsx`, `folder-select/*` (breadcrumb, rows, filter, New folder via PromptDialog), `image-grid/*` → file list rows + drop zone, `screen.processing.tsx`, `screen.error.tsx`, `screen.complete.tsx`.
**Mockups**: `08a-upload-select.png`, `08b-upload-progress-error.png`, `08c-upload-complete.png`.
**Acceptance**: header "Upload" + mono destination; destination breadcrumb (each crumb goes up), folder filter, New folder, 28px rows, "no sub-folders" state; drop zone (idle / drag-over) and real drag-and-drop; 48px file rows with thumb, name, dimensions · size, remove, "Add files"; client-side amber warnings for a source under 800px and for a set name already in the folder; footer count · bytes, Cancel, Upload n files (disabled when empty); uploading: indeterminate bar, rows kept, close / Cancel / Upload disabled; failed: server message in a notice, files kept, Back to files, Retry; complete: summary badges, one row per `UploadFileResult` (chips linking to variants, or refused / failed badge with reason), Retry failed (failed only), Upload more, Done; all-stored and nothing-stored variants.
**Blockers**: 1, 6. The complete screen targets `UploadResponse.results`, so this PR stacks on PR #79's branch (`23-per-file-upload-results`) until it merges.

### 9. Size status strip and generate missing sizes
**Covers**: `explorer/size-chips.tsx` (new, shared), `explorer/sizes.tsx` (Generate button + states), `set-info.tsx` removed.
**Mockups**: `09-size-status.png`.
**Acceptance**: `SizeChips` renders every `sizeStatuses` state plus the original chip and a "No manifest" badge and a loading skeleton; the collection editor uses it; the details Sizes block shows "Generate n missing sizes" only when `manifest.source` exists and a size is missing; generating state spins the missing rows and disables the button; on success the rows named in `GenerateSizesResponse.generated` are tinted green and a notice says what was generated; on failure the notice carries the server message and the manifest is refetched (as #78 does) so part-way rows read as present; when no original is kept a one-line hint points to #14.
**Blockers**: 1, 4. Stacks on PR #78's branch (`13-generate-missing-sizes`) until it merges.

**Order**: 1 → (2, 3, 4, 6 in parallel) → 5 after 3 and 6 → 9 after 4 → 7 and 8 after 6 (7 after 9 for the chips). Nothing here touches the server.

## 8. Open items for the owner

- **Page `/`**: mocked as a brand + "Open the dashboard" link. If it should redirect to `/dashboard` instead, ticket 2 does that in `app/page.tsx` and the mockup's first page state is dropped.
- **Upload client-side warnings** (source under 800px, set name already in the folder): cheap to compute from the picked file and the loaded tree, but a third place that knows the rules. Say if they should be dropped and left to the server's `refused` result.
- **Dashboard error boundary** (`app/dashboard/layout.tsx` TODO): not in scope; the page-level `StateMessage` screens cover the fetch failures that exist today.
