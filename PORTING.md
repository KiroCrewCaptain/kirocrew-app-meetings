# Porting notes: built-in → external app

This repository was ported from Kiro Crew's built-in Meetings at KiroCrew `main`
`55439d8770` (the last commit touching the app is `fa3537e2d7`):

- the backend, `src/kiro_crew/apps/builtins/meetings/` (`app.json`,
  `ATTRIBUTION.md`, `agents/*.json`, `backend/**/*.py`);
- the skill, which shipped in Kiro Crew core:
  `src/kiro_crew/builtin_skills/meetings/SKILL.md`;
- the dashboard page, `website/src/apps/meetings/`, its store art,
  `website/public/app-assets/meetings/`, and the capture worklet it loads,
  `website/public/pcm-worklet.js`;
- the `apps.meetings.*` strings of `website/src/i18n/locales/*.json` (plus
  `en.manual.json`);
- the tests: the nineteen `test/test_meetings_*.py` files with
  `test/meetings_helpers.py` and `test/meetings_routes_helpers.py`, the meetings
  case of `test/test_owner_only_files.py`, and the frontend tests
  `website/src/test/Meetings*.test.ts(x)`, `sketchSrcdoc.test.ts`,
  `UseMeetingSessionCoverage.test.tsx`, `UseMeetingTranscription*.test.tsx`,
  `website/src/apps/meetings/api.coverage.test.ts`,
  `TaskReviewView.coverage.test.tsx` and
  `components/TaskSidebar.{coverage,typingDuringPoll}.test.tsx`.

Paths with a line number below refer to that commit. A **gap** is something the
built-in gets from Kiro Crew that an external app has no public way to get yet;
closing one is a Kiro Crew change (a generic, app-agnostic App Kit seam), not a
change here.

## Kept in step with the built-in

The built-in kept changing after the snapshot. Every change to its files up to
Kiro Crew `main` `6d07df11cf` is carried here, in this repository's structure:

| Kiro Crew commit | What it changed | Here |
|---|---|---|
| `2656b98061` (#30078) | Moved the app's pins of core behaviour into the app's own tests; added the broadcast bar IME-guard, narrow-split and settings `staleTime` UI tests | `tests/test_real_host_pins.py` (the forced demuxer for every import suffix and the startup sweep's store row, checked in a real-host run), `tests/test_translation_start_priority.py`, `ui/tests/BroadcastBarImeGuard.test.tsx`, `ui/tests/meetingsSplitsNarrow.test.ts`, `ui/tests/settingsStaleTime.test.ts`. Its `meetingsBoundary.test.ts` pins the dashboard's own imports, which `ui/tests/externalSeams.test.tsx` covers here. The transcript's owner-only mode was already `tests/test_owner_only_files.py` |
| `f44f8dff9a` (#30863) | The meeting menu's Export items: a notes agent's output saved as Markdown | `ui/src/components/ExportMenuItems.tsx`, `ui/tests/MeetingsExport.test.tsx`; `saveBlob` restated in `ui/src/host/download.ts` (gap U5) |
| `4610325386` (#30873) | Rotate the transcription socket before the server's cap; the review's close control pending while the held finals flush | `ui/src/hooks/useMeetingTranscription.ts`, `useMeetingSession.ts`, `MeetingView.tsx`, `TaskReviewView.tsx`, and their tests, `ui/tests/TaskReviewViewClosing.test.tsx` |
| `90a555fd78` (#25573) | A refused Start names the blocking meeting's id, and the notice opens it | `backend/routes/meeting_lifecycle.py`, `ui/src/api.ts`, `MeetingsPage.tsx`, `MeetingView.tsx`, `components/AgentPanel.tsx`, `hooks/useMeetingSession.ts`, and their tests |
| `e28abd2785` (#32190) | Finish a meeting delete a held file interrupted: `session.json` goes last, a Windows sharing violation is waited out | `backend/store.py`; `remove_with_retry` restated in `backend/_fs.py`; `tests/test_store.py` |
| `1d285a35bd` (#32659) | Agent turns and untrusted text on the App Kit's level-2 seams; the manifest declares `permissions.agentTurns` | `ctx.turns` and `ctx.untrusted` through `backend/_host.py` (below), `app.json`, `tests/test_slot_key.py` |
| `eed0a065c0` (#33012) | Keep focus on the sync-calendar button while it runs | `ui/src/MeetingsPage.tsx`, `ui/tests/MeetingsPageCov80.test.tsx` |

The `apps.meetings.*` strings those changes added are in every `ui/i18n/<locale>.json`,
and the dashboard's confirm-dialog fix of `74467256cb` (#30514, long unbroken
words wrap in a dialog body) is carried to the local `ui/src/host/ConfirmDialog.tsx`.

## What carried over unchanged

- `app.json` `name` (`meetings`), `version` (`0.1.0`), `author` (`adunuthu`),
  `tags`, `permissions` (`/api/apps/meetings`, `/api/apps/meetings/*`,
  `/api/ws/stt`, `network`, `storage`, `agentTurns`), `platform`, `agents`,
  `defaultEnabled: false` and every display field (`displayName`, `description`,
  `highlights`, `useCases`, `configuration`). `tests/test_manifest_contract.py`
  compares them with the built-in's manifest (`tests/fixtures/builtin-app.json`),
  because adoption refuses a manifest that widens a grant or forces the app off.
- The three agent specs, byte for byte (`tests/fixtures/builtin-agents/`), so the
  registered agents are `meetings/meetings-note-taker`,
  `meetings/meetings-sketch-artist` and `meetings/meetings-task-extractor`, as
  before.
- The skill, byte for byte (`tests/fixtures/builtin-skill-SKILL.md`), with its
  `name: meetings` / `app: meetings` frontmatter.
- Every route's method, validation, status codes, error `code`s and response
  shape apart from the renamed settings path below. The handler bodies, the
  meeting session and its batching agent queues, the dictionary, translation, the
  store's containment barrier and its transaction locks, the providers and the
  calendar poller are the built-in's files with their imports changed.
- The data location: the gateway hands an app's hooks
  `ctx.data_dir = <data home>/apps/meetings/data`, the directory the built-in
  resolved through `app_data_dir("meetings")` (`backend/store.py:52`, `:102`).
  Every file name in it is unchanged, so a user's meetings, notes, edits,
  dictionary, calendar cache and task ledger are read as they are.
- The page's markup, class strings and behaviour (`ui/src/`), and its strings in
  all 12 dashboard locales.

## What changed, and why

| Built-in | Here | Why |
|---|---|---|
| `"backend": {"routes": "backend.routes:register_routes"}` (`app.json:45-47`) | `"backend": {"hooks": {"routes": "backend.hooks:register_routes", "on_startup": …, "on_shutdown": …}}` | Top-level `backend.routes` is read only by the built-in boot loop (`src/kiro_crew/dashboard/routes/system.py`, the `BUILTIN_NAMES` loop). An external app's routes go through the gateway's `RouteRegistry`. The hook loader resolves `backend.routes` to the FILE `backend/routes.py`, and `backend/routes/` is a package, so the entry points live in `backend/hooks.py`. |
| `register_routes(app: web.Application)` adding 41 absolute routes to `app.router` (`backend/routes/__init__.py:160-333`) | `register_routes(ctx) -> list[Route]` (`backend/hooks.py`), the table in `routes.route_table()`, relative paths, handlers `(request, ctx)` | The `hooks.routes` contract. `Route` is the app's own frozen dataclass (`backend/_host.py`), accepted structurally from App Kit level 1. |
| `GET`/`PUT /api/apps/meetings/config` (`backend/routes/__init__.py:170-174`) | `GET`/`PUT /api/apps/meetings/settings`, same bodies | The gateway serves `/api/apps/{name}/config` itself (`src/kiro_crew/apps/routes.py:250-251`) ahead of the registry's catch-all, so an app route there is never reached. The page calls `/settings`. |
| `app.on_startup` / `app.on_cleanup` appends: data-dir init + orphan repair, the calendar poller, the drain-and-end of a live meeting (`backend/routes/__init__.py:323-333`) | `hooks.on_startup(ctx)` / `hooks.on_shutdown(ctx)`, calling `routes.start` / `routes.stop` in the same order | `on_shutdown` runs on disable and uninstall too, not only at gateway exit, so a disabled app ends its live meeting (flushing its queued transcript) and stops its poller. |
| `_common.require_enabled` (`backend/routes/_common.py:268-284`) on every route, and the poller's per-tick `is_app_enabled` (`backend/calendar_poller.py:121`) | Removed | `RouteRegistry` deregisters an app's routes on disable, so a disabled app answers 404; the poller only runs between `on_startup` and `on_shutdown`. The `app_disabled` 403 is gone; the page never branched on it. |
| `_common.require_owner` and the inline gate in `/import`, both on `is_owner_dashboard_request` + `_owner_denial_response(…, "dashboard_owner_required")` (`backend/routes/_common.py:287-315`, `backend/routes/audio_import.py:434-447`) | `ctx.require_owner(request, verb)` through `_common.owner_denied` | The level-1 owner gate, the same host predicate (`is_owner_dashboard_request`: an app token and a non-owner subject are refused). The host returns its own 403 `owner_only` (or its 401 for a stale session) and audits the denial as `meetings.<verb>`; the app still audits the allow. `ui/src/hooks/useNoteDraft.ts` accepts both codes. A gateway without the seam refuses every caller of the 25 gated routes, the owner included. |
| `kiro_crew.security.redact` (`backend/routes/_common.py:38`, `routes/tasks.py:55`, `routes/meeting_lifecycle.py:50`, `routes/agents.py:34`, `domain/translate.py:47`, `domain/session.py:44`, `providers/calendar.py:61`, `providers/tasks.py:45`) | `ctx.scrub.outbound(text).text` (`_host.redact`) | The level-0 scrub seam, which applies the gateway's active policy on top of the same baseline passes. With no scrubber, or one that raises, the text is replaced by a fixed "withheld" marker: nothing is stored or shown unscanned. |
| `llm_helpers.stream_and_collect` under `ToolApprovalPolicy.HOOK_BASED` / `REJECT_ALL`, `shared_crew.turn_gate.run_admitted_or_raise`, and the session and hook managers read off `request.app["state"]` (`backend/domain/session.py:43`, `:204-288`; `domain/translate.py:100-146`; `routes/_common.py:705-725`) | `ctx.turns.run(key, batch, agent=…, timeout_secs=…, cancel_ack_secs=…)` for the agents, `ctx.turns.run_oneshot(prompt, label="translate")` for live translation, `ctx.turns.has_session` for `abandoned` (`_host.turns`) | The level-2 agent-turn seam, the built-in's own path since `1d285a35bd`: the host fixes the app identity, the hook gate (the one-shot rejects every tool), Crew-automation admission, the cancel-then-reset budget and the lease release. The keys are unchanged (`meetings-<agent>-<meeting>`, `meetings-translate-<hex>`); an agent id outside the seam's key alphabet is keyed by its digest, as in the built-in. `app.json` declares `permissions.agentTurns`, as the built-in does. Without the seam no agent session starts and nothing is translated, which is the built-in's behaviour on a gateway with no session manager |
| `security.{contains_injection, audit_injection_dropped}`, `context.{neutralize_untrusted_text, UNTRUSTED_CALENDAR_FENCE_OPEN, UNTRUSTED_CALENDAR_FENCE_CLOSE}` (`backend/domain/session.py:38-44`, `:1043-1066`, `:1131-1133`) | `ctx.untrusted.{flagged, neutralize, fence, fence_markers, record_dropped}` (`_host.contains_injection`, `neutralize_untrusted_text`, `fence_untrusted_calendar`, `record_injection_dropped`) | The level-2 untrusted-text seam, the built-in's own path since `1d285a35bd`. The drop is still logged as `meetings_calendar_<field>` with agent `meetings`. Without the seam, or when a call fails, every field is withheld, nothing unneutralized is fenced, and a drop is one `ctx.audit` row |
| `sel().log_api_access(caller="app:meetings", operation="meetings.<verb>", …)` (`backend/store.py:85-95`, `routes/_common.py:318-330`, `providers/tasks.py:212-217`) and `sel().log_tool_invocation(tool_name="meetings.agent_init", …)` (`domain/session.py:1290-1297`) | `ctx.audit.record(verb, outcome, …)` (`_host.audit`), redacted then truncated | The level-0 audit seam. It prefixes the app name itself, so the rows read `meetings.<verb>` as before, with caller `app:meetings`; the agent-init row is now an API-access row of the same name. |
| `app_data_dir("meetings")` (`backend/store.py:52`, `:102`) | `ctx.data_dir`, bound by the hooks (`_host.bind`) | An external app has no ambient data home. The store, the poller and the worker threads reach the bound context; with none bound, `store.data_dir()` raises rather than guessing a location. |
| Absolute self-imports `from kiro_crew.apps.builtins.meetings.backend …` (every backend module) | Relative imports | Hook files load into a synthetic package (App Kit `manifest-reference.md`, "Importing your own modules"). |
| Package `__init__.py` re-exporting `register_routes` (`__init__.py:19`) | Removed | Only the built-in boot loop reads it. |
| `kiro_crew.atomic_write.{atomic_write, read_bytes_with_retry, replace_with_retry}`, `kiro_crew.owner_only_files.{ensure_directory, owner_only_opener_for}`, `kiro_crew.user_json.loads_user_json` (`backend/store.py:53-57`, `domain/dictionary.py:46`, `providers/tasks.py:44`), and `kiro_crew.platform_compat.remove_with_retry` (added by `e28abd2785`) | `backend/_fs.py` | Small and carrying no security decision beyond file modes, so restated (gap 6). |
| `kiro_crew.platform_compat.{is_link_or_junction, strip_extended_length_prefix, IS_WINDOWS}`, `kiro_crew.loop_lock.LoopBoundLock` (`backend/store.py:55`, `routes/audio_import.py:61`, `routes/_common.py:37`, `routes/tasks.py:54`) | `backend/_compat.py` | The same; exercised by this repository's tests on every OS the manifest names. |
| `kiro_crew.hooks.get_global_hook_store` re-export (`backend/routes/_common.py:36`) | Removed | Nothing read it. |
| `iconUrl` / `heroImage*` as absolute `/app-assets/meetings/*.svg`, `screenshots` `/app-assets/…` (`app.json:57-69`) | `iconPath` / `heroImage*` / `screenshots` as repo-relative PNGs under `assets/` | A registry app's art is repo-relative, and the catalog's publish step refuses SVG for a non-builtin source. The PNGs were rendered from the built-in SVGs (kept beside them): the icon at 512×512 on an opaque tile with `--ico-a` / `--ico-b` resolved to fixed colours, the heroes at 1200×675. The screenshot is this repository's own `docs/media/main-light.png`. |
| `ui.pages` `[{"route": "/meetings", "icon": "CalendarClock"}]`, page compiled into the dashboard (`app.json:48-56`, `website/src/apps/builtinRegistry.ts:68`) | `ui.entry: "dist/index.mjs"` (a committed ESM bundle built from `ui/src/`), `ui.pages` `[{"route": "/apps/meetings"}]`, no `icon` | An installed app ships its page as a bundle AppHost loads. The legacy `/meetings` route and `CalendarClock` glyph of an adopted record come from Kiro Crew's adoption pin, never from this manifest. |
| App Store copy keys in the dashboard catalogs (`website/src/components/appstore/appManifest.ts:273-288`) | `l10n` block in `app.json` for the 11 non-English locales | The listing copy travels with the app. It is the `apps.meetings.manifest` subtree of `ui/i18n/<locale>.json`, kept equal by a test. |
| Skill under Kiro Crew's `builtin_skills/`, synced into every install | `skills/meetings`, declared in `app.json` `skills` | An app's skill ships with the app. Unchanged. |
| No `license`, no `minKiroCrewVersion` | `"license": "Apache-2.0"`, `"minKiroCrewVersion": "0.13.0"` | The built-in's code shipped under Kiro Crew's Apache-2.0 licence, which is this repository's `LICENSE`. 0.13.0 is the first Kiro Crew release line with App Kit level 1: the 0.12.0 line has no `apps/app_sdk_level.py`, and its route registry skips any record that is not its own `AppRoute`, so every route would answer 404 there. |

## Gateway functions with no App Kit seam: reached through `backend/_host.py`

These are what is left once agent turns and untrusted text moved onto the App
Kit's level-2 seams (above). Nothing in `backend/` but `_host.py` names
`kiro_crew`, and `_host.py` imports it only lazily, by name, at call time (`_host._host_attr`, `_host._host_module`;
`tests/test_no_host_imports.py` pins both). These are the gateway's own controls
and services: copying them would leave a control that looks present and drifts
from the one the gateway enforces. Each is looked up when it is needed; when the
gateway lacks it, the operation that needs it is **refused**, never run without
it, and `register_routes` reports the reason through `ctx.health`
(`tests/test_host_seams.py`).

| Built-in import | Where | Without it | Seam Kiro Crew needs |
|---|---|---|---|
| `kiro_crew.link_unfurl.{vet_unfurl_url, UnfurlRejected}` | `backend/providers/calendar.py:58`, `:803-805` | Every calendar URL is refused | a public-address (SSRF) vet on the context that returns the approved addresses for pinning |
| `kiro_crew.hooks.safe_read_file_bytes` | `backend/providers/calendar.py:58`, `:1031` | No local calendar file is read | a gated, link-refusing file read on the context |
| `kiro_crew.hooks.validate_file_path` | `backend/routes/audio_import.py:74`, `:114` | Every recording path is denied | a file gate on the context (canonicalize, refuse sensitive paths) |
| `kiro_crew.pinned_fs.{PinnedPathRefusal, copy_file_pinned, is_reparse_point, pin_parent, supports_pinned_walk}` | `backend/routes/audio_import.py:75-81`, `:227-290`, `:494` | The import answers 501 (no pinned walk), and no file is copied by name | a descriptor-pinned copy on the context |
| `kiro_crew.sandbox.prime_voice_runtime_sandbox_paths` | `backend/routes/audio_import.py:82`, `:176` | No recording is staged (the import fails) | an agent-denied staging directory on the context |
| `kiro_crew.transcribe.{is_available, load_stt_config, transcribe_audio, audio_exceeds_secs, batch_duration_cap_secs, provider_splits_oversized, transcribe_oversized_in_segments}` | `backend/routes/audio_import.py:152`, `:533-540` | The import answers 503 `transcription_unavailable` | a batch speech-to-text seam on the context |
| `kiro_crew.messaging.raster.{sniff_raster_mime, SNIFF_BYTES}` | `backend/domain/images.py:35`, `:52` | No pasted picture is accepted | a raster sniffer on the context (it adds no reach) |
| `kiro_crew.executors.subprocess_executor` | `backend/routes/__init__.py:43`, `routes/tasks.py:53`, `providers/calendar.py:60` | The loop's default pool | an executor on the context |

This suite runs against `tests/fakehost.py`. The same suite was also run against
the real controls of Kiro Crew `55439d8770` (`MEETINGS_REAL_HOST=1`, with that
checkout's `src/` on `PYTHONPATH`): the real injection screen, neutralizer and
fence markers, file gate and gated read, pinned walk and copy, SSRF vet, raster
sniffer and `ScrubSDK`. It passes unchanged apart from the three tests of the
fakes themselves, which that mode skips. It was run again against Kiro Crew
`6d07df11cf`, where the screen, neutralizer and markers are those of its
`UntrustedTextSDK` (the drop recorder stays the fake's, since the real one writes
the gateway's security event log) and `tests/test_real_host_pins.py` runs too. The app was also installed, trusted and
enabled on an isolated gateway of that commit with the built-in removed, where the
41 routes registered through the structural records, the three agents and the
skill registered, and a meeting ran end to end on a live model (the pictures in
`docs/media/`).

## Remaining gaps

1. **SSRF, file and recording controls.** The table above: each is a private
   module name a Kiro Crew refactor can move; the fallbacks keep that failure
   closed and reported, but the feature stops until a seam replaces it. (Agent
   turns and untrusted text, the first two gaps of the original port, are closed:
   both run on the App Kit's level-2 seams.)
2. **Core names this app's protected data paths.** The agents may not read or
   rewrite the owner's edits, nor write the owner's notes, because Kiro Crew lists
   them itself: `apps/meetings/data/edits` is a sensitive path and a sandbox leaf
   (`src/kiro_crew/security/paths_lists.py:177`, `src/kiro_crew/sandbox_leaves.py:184`),
   `apps/meetings/data/notes` is on the write-only fence
   (`src/kiro_crew/security/paths_lists.py:1263`), and the startup sweep tightens
   `apps/meetings/data` (`src/kiro_crew/owner_only_files.py:910`). The data path
   is unchanged, so this protection holds for an installed copy, but the names
   cannot leave core yet:
   - the `notes/` write fence needs an app-declared agent-read-only (write-only
     fence) subdirectory seam, which awaits an owner ruling (App Kit spec §32a,
     "Not here": "a write-only fence an app declares for itself is not yet an
     approved seam");
   - the `edits/` leaf is the shape the in-flight manifest-declared credential
     masks (`credentialMasks`, App Kit level 3, kirodotdev/KiroCrew#32652) cover;
     until that lands this manifest cannot declare it.
   The tests that pin those entries (`test/test_meetings_minutes.py`
   `test_agent_file_tools_cannot_read_or_overwrite_an_owner_edit`,
   `test/test_meetings_note.py` `test_the_tree_is_on_the_write_only_fence_and_stays_readable`)
   test core's lists, so they stay in Kiro Crew with them.
3. **Execution trust.** A built-in's in-gateway Python is exempt from the
   third-party execution gate (`src/kiro_crew/apps/execution.py`,
   `is_builtin_app`). This copy's hooks load only when the operator trusts it. For
   an existing user Kiro Crew's adoption writes that grant for this repository; a
   fresh install goes through the normal trust dialog.
4. **Skill duplicate on adoption.** Kiro Crew's builtin-skill sync has already
   copied `meetings` into users' `<data home>/skills/` as a real directory. The
   app's own skill then gets only its namespaced link (`skills/meetings/meetings`),
   so until core stops shipping and prunes its copy both are present.
5. **Store listing localization and sidebar glyph.** The catalog's publish step
   does not carry `l10n` yet, and the `CalendarClock` glyph and `/meetings` route
   are shown only for an adopted record. A fresh install lives at
   `/apps/meetings` with the `iconPath` image.
6. **File helper drift.** `backend/_fs.py` keeps the temp-file + rename, the
   `0600` file and `0700` directory modes and a short Windows sharing-violation
   retry; it drops the host's descriptor-pinned variants, its xattr carry-over and
   its elapsed-time retry budget. Because every file this app writes is inside its
   data directory, the owner-only rule the host applies "inside the data home" is
   applied to all of them (`tests/test_owner_only_files.py`).
7. **Background agent work on disable.** An agent turn already in flight when the
   app is disabled finishes in the gateway; `on_shutdown` drains the queues and
   ends the meeting, but cannot cancel a turn the gateway is running.
8. **Core references that move with the built-in.** Kiro Crew still names this app
   in `src/kiro_crew/apps/builtins/__init__.py:14`,
   `src/kiro_crew/metrics/feature_usage.py:206`,
   `src/kiro_crew/security_posture.py:1249-1264` (posture rows for the built-in's
   files), `website/src/apps/builtinRegistry.ts:68`,
   `website/src/components/appstore/appManifest.ts:273-288`, the
   `apps.meetings.*` catalog keys, and the data paths of gap 2. Each goes when the
   built-in goes. `test/test_core_meetings_decoupling.py` pins that list. Kiro Crew
   tests that use the app's data path or files as a fixture
   (`test/test_owner_only_files.py:1159-1197`,
   `test/test_lenient_read_rewrite_ratchet.py:85`, `test/link_screen_sites.py:90`)
   stay in Kiro Crew and follow them.

## UI

The page is `ui/src/`, ported from `website/src/apps/meetings/` with the same
markup, class strings and behaviour. `npm run build` in `ui/` writes the committed
`ui/dist/index.mjs`; CI rebuilds it and fails on a difference. Every API call goes
through the host's scoped client (`useAppApi().raw`, handed to `api.setTransport`
by the root), so a path outside `permissions.api` is refused in the browser; the
backend's `error` and `code` are read back out of the client's refusal.
framer-motion and react-virtuoso are bundled; everything else the page imports is
a module the dashboard provides. The dashboard modules the page used that the SDK
does not publish are under `ui/src/host/`:

| Built-in import | Here |
|---|---|
| `i18n/t.i18nT` with `apps.meetings.*` keys | `t()` in `ui/src/i18n.ts` over `ui/i18n/<locale>.json` (all 12 locales): the subtree, with `en.manual.json`'s additions in English, plus `components.confirmDialog.cancel` |
| `i18n/format.fmtTime` / `fmtDateFields` | the SDK's `fmtTime`; `fmtDateFields` restated over the SDK's `activeLocale` |
| `components/ui` primitives, `ErrorNotice`, `Clickable`, `MarkdownRenderer` | the same components from `@kirocrew/app-sdk/ui`; `IconButton` (not in the SDK) restated |
| `components/SimpleSelect` | the SDK's level-1 `Select`, feature-detected, with a native `<select>` on an older host |
| `MarkdownRenderer`'s `BasePathCtx` (relative images in the note preview) | not in the SDK: the note's relative image paths are made absolute against the note's folder before rendering (gap U1) |
| `components/ConfirmDialog.useConfirm` | restated over the SDK's `Modal` and `Btn`, without the guide's confirm marker |
| `components/ui/dropdown-menu` (Radix) | a small local menu with the same API and keyboard contract (gap U2) |
| `hooks/useImeGuard` | the SDK's |
| `hooks/useEscapeLayer`, `hooks/modalLayer`, `hooks/useMenuKeyboard` | restated, without the remote-Crew stand-down and the shared document IME latch (gap U2) |
| `hooks/mic.reportIfMicDenied` | restated; it calls the desktop shell's `electronAPI.reportMicDenied` when present (gap U3) |
| `lib/dictationText` | copied |
| `lib/basePath.withBase` | the base read from the bundle's own URL at run time |
| `lib/vendorPaths.MERMAID_RUNTIME_PATH` | the same host path `/vendor/mermaid.min.js` (gap U3) |
| `/pcm-worklet.js` (a dashboard asset) | `ui/pcm-worklet.js`, a copy served beside the bundle |
| `react-router-dom` `Link` to Settings → Voice | `ui/src/host/Link.tsx` over the SDK's `useNavigate` |
| `utils/download.saveBlob` (the Markdown export) | restated in `ui/src/host/download.ts`, without the Android in-app browser hand-off (gap U5) |
| `react-redux` dispatch of `addNotification` | the SDK's `useNotify` |

UI gaps:

- **U1.** `BasePathCtx` is not published, so the note preview rewrites relative
  image paths itself.
- **U2.** The dashboard's dropdown menu, escape-layer registry and IME latch are
  not App Kit surfaces; the local stand-ins do not coordinate with the host's own
  layers (a host dialog opened over this page does not take Escape from them).
- **U3.** The page still reaches four host surfaces that are not App Kit
  contracts: the speech socket `/api/ws/stt` (declared in `permissions.api`), the
  Mermaid runtime at `/vendor/mermaid.min.js` that the sketch frame's CSP allows,
  the dashboard's file route `/api/file-raw` that the SDK's `MarkdownRenderer`
  uses for note images, and the desktop shell's microphone-denied bridge.
- **U4.** The page keeps the built-in's Tailwind utility classes and the
  dashboard's CSS custom properties; they render because the dashboard's
  stylesheet still carries them.
- **U5.** The dashboard's `saveBlob` (the meeting menu's Markdown export) is not
  an App Kit surface. `ui/src/host/download.ts` restates its object-URL download
  and the desktop shell's download announcement, but not its Android in-app
  browser hand-off, which uploads the file to the dashboard's artifact route,
  outside this app's `permissions.api`. In such a browser the export reports
  "Download failed" instead of saving.

## Tests

| Built-in test | Here | Change |
|---|---|---|
| `test/test_meetings_*.py` (19 files) | `tests/test_*.py` (the `meetings_` prefix dropped) | Imports only, apart from: the route fixtures serve the records `register_routes` returns through `tests/harness.py` (the registry's matching, the token middleware's identity); `/config` cases call `/settings`; the enable-gate cases became `tests/test_route_registration.py` (the route table, no gateway-owned suffix, structural records, the context bound, no file touched, a disabled app serving nothing) and the poller's hook tests; the owner-gate cases expect the host's `owner_only` and read the denial from the context's gate; a traversal id is refused by the registry (404) and by `safe_meeting_id` (400); `kiro_crew.transcribe`, the pinned walk, the SSRF vet's lifts and the file gate are the fake host's; the AST test of `llm_helpers` became tests that a dispatch hands `ctx.turns` the key, agent and budget and nothing that could choose an identity or policy; the turn fakes are `fakehost.FakeAgentTurns` (the host's `AgentTurnSDK` session handling over the fake session manager) and `fakehost.FakeUntrusted` |
| `test_meetings_minutes.py::test_agent_file_tools_cannot_read_or_overwrite_an_owner_edit`, `test_meetings_note.py::test_the_tree_is_on_the_write_only_fence_and_stays_readable` | Stay in Kiro Crew | They test core's path lists (gap 2) |
| `test/test_owner_only_files.py` (the meeting transcript case) | `tests/test_owner_only_files.py` | Owner-only everywhere, since the data directory is always in the data home |
| `kiro_crew.testing.wait`, `test/conftest.py` `assert_rejected_without_backtracking`, `test/named_cases_helpers.py` | `tests/waits.py`, `tests/redos.py`, `tests/named_cases_helpers.py` | Restated or copied |
| the 22 frontend test files, and the five the built-in has added since | `ui/tests/`, all with the same cases | Run by vitest on happy-dom (the dashboard's own test DOM) with SDK stand-ins (`ui/tests/stubs/`) that mirror the host components' roles and classes the tests read; notifications are read from the `useNotify` stub instead of the Redux store; the source-text cases read this repository's files |
| `test/test_meetings_slot_key.py` (added by `1d285a35bd`) | `tests/test_slot_key.py` | The key alphabet checked against `FakeAgentTurns.check_key` |
| `src/kiro_crew/apps/builtins/meetings/tests/` (added by `2656b98061`) | `tests/test_translation_start_priority.py`, `tests/test_real_host_pins.py` | The demuxer and startup-sweep pins read Kiro Crew itself, so they run in a real-host run only; the transcript's owner-only mode is `tests/test_owner_only_files.py` |
| (none) | `tests/test_host_seams.py`, `tests/test_no_host_imports.py`, `tests/test_manifest_contract.py`, `tests/test_manifest_host_parser.py`, `ui/tests/externalSeams.test.tsx` | Every fail-closed path; only `_host.py` reaches `kiro_crew`, lazily; manifest parity, the `l10n` block, PNG art, hooks, skill and agents byte for byte, the committed bundle's imports and its freedom from Node globals, an adoptable tree; `app.json` through Kiro Crew's own parser (CI's `host-parser` job); the catalogs, the transport, no private dashboard import, the local stand-ins and the older-host select |

## What Kiro Crew keeps doing

The release that adds adoption still ships the built-in. A user's built-in record
moves onto this repository at the commit Kiro Crew pins, after the tree is fetched
and verified; a record that cannot move keeps running the built-in copy,
unchanged. Removing the built-in, its skill, its catalog keys and the core
references of gaps 2 and 8 is a later release, after the seams of gaps 1 and 2
exist.

## Release handoff: one commit for both pins

1. Call the full 40-hex SHA of the commit to pin `C` (`git rev-parse HEAD`).
2. In the Kiro Crew release PR that adds adoption, run
   `python3 scripts/adoption_pin.py compute <this URL> C` and add the row it prints
   to `src/kiro_crew/apps/adoption-pins.json`; then
   `python3 scripts/adoption_pin.py verify`.
3. The KiroCrewApps row for `meetings` switches from `"type": "builtin"` to
   `"type": "git"`, this URL, `"ref": "C"`, never a branch name.
4. Check that both files name the same `C`, and that GitHub serves it.
