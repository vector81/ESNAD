import { renderToString } from "react-dom/server";
import { Suspense, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { geoGraticule, geoOrthographic, geoPath } from "d3-geo";
import katex from "katex";
//#region src/lib/publicAuth.ts
var auth = null;
var ready = null;
function loadPublicAuth() {
	ready ??= import("./firebase-CDYWQsgv.js").then((module) => {
		auth = module.auth;
		return auth;
	});
	return ready;
}
//#endregion
//#region src/lib/firebaseConfig.ts
var firebaseConfig = {
	apiKey: "AIzaSyA6I1fo0uGqrjBHdJXb3Wmav4E6pySLolI",
	authDomain: "esnad-ebc17.firebaseapp.com",
	projectId: "esnad-ebc17",
	storageBucket: "esnad-ebc17.firebasestorage.app",
	messagingSenderId: "140153770891",
	appId: "1:140153770891:web:e75dfdf946ba4adf1d558e",
	measurementId: "G-0T4N51814R"
};
var isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);
//#endregion
//#region src/contexts/PublicSessionContext.tsx
var DEMO_USER_STORAGE_KEY = "esnad_demo_public_user";
var PublicSessionContext = createContext(void 0);
function emptyLibrarySnapshot() {
	return {
		saved_item_ids: [],
		purchased_item_ids: []
	};
}
function getDemoUser() {
	if (typeof window === "undefined") return null;
	try {
		const stored = window.localStorage.getItem(DEMO_USER_STORAGE_KEY);
		return stored ? JSON.parse(stored) : null;
	} catch {
		return null;
	}
}
function setDemoUser(user) {
	if (typeof window === "undefined") return;
	if (!user) {
		window.localStorage.removeItem(DEMO_USER_STORAGE_KEY);
		return;
	}
	window.localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(user));
}
function mapFirebaseUser(user) {
	return {
		uid: user.uid,
		email: user.email ?? "",
		displayName: user.displayName?.trim() || user.email?.split("@")[0] || "Esnad Reader"
	};
}
function PublicSessionProvider({ children }) {
	const [user, setUser] = useState(() => !isFirebaseConfigured ? getDemoUser() : null);
	const [library, setLibrary] = useState(() => emptyLibrarySnapshot());
	const [loading, setLoading] = useState(() => Boolean(isFirebaseConfigured));
	const refreshLibrary = useCallback(async () => {
		const { getLibrarySnapshot } = await import("./library-Cx5LdTvZ.js");
		setLibrary(user ? await getLibrarySnapshot(user) : emptyLibrarySnapshot());
	}, [user]);
	useEffect(() => {
		if (!isFirebaseConfigured) return;
		let cancelled = false;
		let unsubscribe;
		let idleId;
		let timerId;
		const restoreSession = async () => {
			const [instance, { onAuthStateChanged }] = await Promise.all([loadPublicAuth(), import("firebase/auth")]);
			if (cancelled || !instance) return;
			unsubscribe = onAuthStateChanged(instance, (nextUser) => {
				if (nextUser) setUser(mapFirebaseUser(nextUser));
				else {
					setUser(null);
					setLibrary(emptyLibrarySnapshot());
				}
				setLoading(false);
			});
		};
		const restore = () => void restoreSession().catch((error) => {
			console.warn("[esnad] Session restoration unavailable", error);
			if (!cancelled) setLoading(false);
		});
		const schedule = () => {
			if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(restore, { timeout: 1500 });
			else timerId = window.setTimeout(restore, 0);
		};
		if (document.readyState === "complete") schedule();
		else window.addEventListener("load", schedule, { once: true });
		return () => {
			cancelled = true;
			unsubscribe?.();
			window.removeEventListener("load", schedule);
			if (idleId !== void 0) window.cancelIdleCallback(idleId);
			if (timerId !== void 0) window.clearTimeout(timerId);
		};
	}, []);
	useEffect(() => {
		if (!user) return void 0;
		let cancelled = false;
		import("./library-Cx5LdTvZ.js").then(({ getLibrarySnapshot }) => getLibrarySnapshot(user)).then((snapshot) => {
			if (!cancelled) setLibrary(snapshot);
		}).catch(() => {
			if (!cancelled) setLibrary(emptyLibrarySnapshot());
		});
		return () => {
			cancelled = true;
		};
	}, [user]);
	const signInUser = useCallback(async (email, password) => {
		if (!isFirebaseConfigured) {
			const demoUser = {
				uid: `demo-${email.toLowerCase()}`,
				email: email.toLowerCase(),
				displayName: email.split("@")[0]
			};
			setDemoUser(demoUser);
			setUser(demoUser);
			return;
		}
		const [instance, { signInWithEmailAndPassword }] = await Promise.all([loadPublicAuth(), import("firebase/auth")]);
		if (!instance) throw new Error("تعذر تحميل تسجيل الدخول.");
		setUser(mapFirebaseUser((await signInWithEmailAndPassword(instance, email, password)).user));
	}, []);
	const registerUser = useCallback(async (name, email, password) => {
		if (!isFirebaseConfigured) {
			const demoUser = {
				uid: `demo-${email.toLowerCase()}`,
				email: email.toLowerCase(),
				displayName: name.trim() || email.split("@")[0]
			};
			setDemoUser(demoUser);
			setUser(demoUser);
			return;
		}
		const [instance, { createUserWithEmailAndPassword, updateProfile }] = await Promise.all([loadPublicAuth(), import("firebase/auth")]);
		if (!instance) throw new Error("تعذر تحميل تسجيل الدخول.");
		const credentials = await createUserWithEmailAndPassword(instance, email, password);
		await updateProfile(credentials.user, { displayName: name.trim() });
		setUser(mapFirebaseUser(credentials.user));
	}, []);
	const signOutUser = useCallback(async () => {
		if (!isFirebaseConfigured) {
			setDemoUser(null);
			setUser(null);
			setLibrary(emptyLibrarySnapshot());
			return;
		}
		const [instance, { signOut }] = await Promise.all([loadPublicAuth(), import("firebase/auth")]);
		if (instance) await signOut(instance);
		setUser(null);
		setLibrary(emptyLibrarySnapshot());
	}, []);
	const value = useMemo(() => ({
		user,
		loading,
		library,
		refreshLibrary,
		signInUser,
		registerUser,
		signOutUser
	}), [
		user,
		loading,
		library,
		refreshLibrary,
		signInUser,
		registerUser,
		signOutUser
	]);
	return /* @__PURE__ */ jsx(PublicSessionContext.Provider, {
		value,
		children
	});
}
function usePublicSession() {
	const context = useContext(PublicSessionContext);
	if (!context) throw new Error("usePublicSession must be used inside PublicSessionProvider");
	return context;
}
//#endregion
//#region src/lib/publicationIdMap.ts
var PUBLICATION_ID_MAP = {
	"5143394": "0c4524af-b0c3-4677-98d6-afd0784505e8",
	"3938615": "0d9cec73-34ce-40f7-9810-bc00fd37e761",
	"5267397": "19b3ccbd-4b1e-4e10-8c4c-fab5cff9ad68",
	"6892149": "2b48b8f1-927e-4e79-a70b-d0748072b320",
	"9893292": "34144b82-9a58-418b-b43c-eaa0fa6b235a",
	"3395983": "388d4355-ede6-422e-bb33-8d6761c1e680",
	"2663958": "39641bbd-ade4-4ccd-b2b3-ed47f7ddd747",
	"1926718": "5d0b5ece-dfa6-4359-bb9e-03d96294df25",
	"9534802": "5e33bf79-a880-4a35-b147-16be29fefa7a",
	"5556057": "71fdb47a-eb17-4704-a13a-a82ce4be9362",
	"8044958": "72c8e9e3-9f73-40ba-a0f0-fedb88652156",
	"5171944": "7f822f92-b6cf-4a3c-963e-09eba2458af1",
	"4297835": "81759c2b-33b9-47f5-8cb1-845966538103",
	"3001546": "8eb62131-624e-4a12-a42c-11709b38eda1",
	"7193246": "a26721d4-b4fa-4542-9689-e763fa6b9c22",
	"3064572": "b1c54007-f429-49c0-a19f-0e4fc10ce12a",
	"7230859": "b4eb44d2-8a9a-42ad-8a8f-e651629a45db",
	"4070119": "b78ba0f1-b7a5-4f85-bb8f-a7af10373bdf",
	"3440399": "c4d7c4c1-45a3-4ad3-a3c6-d6cd26b231d6",
	"1912143": "c668f12a-49f3-4548-8672-d7f02f26f558",
	"8629683": "c9d10643-5fe3-44e0-b35e-2a3c6f91d127",
	"2728521": "e532cf7f-92fb-4b7a-a0b9-95ea2ca1496d",
	"8866951": "f6c73482-7e7f-40e4-a28e-86269793456d"
};
//#endregion
//#region src/lib/publications.ts
var PUBLICATION_CATEGORIES = [
	{
		id: "studies",
		label_ar: "دراسات",
		label_en: "Studies"
	},
	{
		id: "policy-paper",
		label_ar: "ورقة سياسية",
		label_en: "Policy Paper"
	},
	{
		id: "economic-paper",
		label_ar: "ورقة اقتصادية",
		label_en: "Economic Paper"
	},
	{
		id: "analytical-paper",
		label_ar: "ورقة تحليلية",
		label_en: "Analytical Paper"
	},
	{
		id: "reports",
		label_ar: "تقارير",
		label_en: "Reports"
	},
	{
		id: "strategic-estimate",
		label_ar: "تقدير موقف",
		label_en: "Strategic Estimate"
	},
	{
		id: "situation-assessment",
		label_ar: "تقييم وضعية",
		label_en: "Situation Assessment"
	},
	{
		id: "legal-paper",
		label_ar: "ورقة قانونية",
		label_en: "Legal Paper"
	},
	{
		id: "opinion-article",
		label_ar: "مقالات رأي",
		label_en: "Opinion Articles"
	},
	{
		id: "cultural-article",
		label_ar: "مقالة ثقافية",
		label_en: "Cultural Article"
	},
	{
		id: "cultural-paper",
		label_ar: "ورقة ثقافية",
		label_en: "Cultural Paper"
	},
	{
		id: "foresight",
		label_ar: "استشراف",
		label_en: "Foresight"
	},
	{
		id: "position-analysis",
		label_ar: "تحليل موقف",
		label_en: "Position Analysis"
	},
	{
		id: "expert-survey",
		label_ar: "استطلاع رأي الخبراء",
		label_en: "Expert Survey"
	},
	{
		id: "periodic-reports",
		label_ar: "تقارير دورية",
		label_en: "Periodic Reports"
	},
	{
		id: "case-monitoring",
		label_ar: "متابعة حالة",
		label_en: "Case Monitoring"
	},
	{
		id: "media-analysis",
		label_ar: "تحليل إعلامي",
		label_en: "Media Analysis"
	},
	{
		id: "policy-analysis",
		label_ar: "تحليل السياسات",
		label_en: "Policy Analysis"
	},
	{
		id: "psychological-studies",
		label_ar: "دراسات نفسية",
		label_en: "Psychological Studies"
	},
	{
		id: "analysis-summary",
		label_ar: "خلاصة تحليلات",
		label_en: "Analysis Summary"
	},
	{
		id: "information-file",
		label_ar: "ملف معلومات",
		label_en: "Information File"
	},
	{
		id: "documents",
		label_ar: "وثائق",
		label_en: "Documents"
	},
	{
		id: "translations",
		label_ar: "ترجمات",
		label_en: "Translations"
	},
	{
		id: "profile",
		label_ar: "بروفايل",
		label_en: "Profile"
	},
	{
		id: "concept",
		label_ar: "مفهوم",
		label_en: "Concept"
	},
	{
		id: "infographic",
		label_ar: "إنفوغرافيك",
		label_en: "Infographic"
	}
];
var LOCAL_STORAGE_KEY = "esnad_publications_catalog";
var shouldUsePublicApi = isFirebaseConfigured && typeof fetch !== "undefined" && true;
var transliterate = null;
var transliterationReady = null;
function loadTransliteration() {
	transliterationReady ??= import("any-ascii").then((module) => {
		transliterate = module.default;
	});
	return transliterationReady;
}
function slugify(value) {
	return value.trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function slugifyLatin(value) {
	return (transliterate ? transliterate(value) : value).trim().toLowerCase().replace(/['"`´]+/g, "").replace(/&/g, " and ").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function clampCoverPosition(value) {
	const num = Number(value);
	if (!Number.isFinite(num)) return 50;
	return Math.min(100, Math.max(0, num));
}
var clampCoverPositionY = clampCoverPosition;
function deriveNumericPublicationId(value) {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return String(1e6 + (hash >>> 0) % 9e6);
}
function getPublicPublicationId(publication) {
	return [
		publication.public_id,
		publication.publicId,
		publication.numeric_id,
		publication.numericId,
		publication.article_id,
		publication.articleId,
		publication.id
	].map((candidate) => String(candidate || "").trim()).find((candidate) => /^\d+$/.test(candidate)) || deriveNumericPublicationId(publication.id);
}
function getCoverObjectPosition(publication) {
	return `${clampCoverPosition(publication.cover_position_x ?? 50)}% ${clampCoverPosition(publication.cover_position_y)}%`;
}
function getShareSlug(publication) {
	return getPublicPublicationId(publication);
}
function normalizeTags(value) {
	if (!value) return [];
	return (Array.isArray(value) ? value : value.split(",")).map((item) => item.trim()).filter(Boolean);
}
function normalizePublication(id, raw) {
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const price = Number(raw.price_aud ?? 0);
	const kind = raw.kind === "book" ? "book" : raw.kind === "article" ? "article" : raw.kind === "research-paper" ? "research-paper" : raw.type === "book" ? "book" : "research-paper";
	const type = kind === "book" ? "book" : "article";
	const workflowStage = raw.workflow_stage === "in_review" ? "in_review" : raw.workflow_stage === "needs_revision" ? "needs_revision" : raw.workflow_stage === "approved" ? "approved" : raw.workflow_stage === "published" ? "published" : "draft";
	return {
		id,
		...raw.public_id !== void 0 ? { public_id: raw.public_id } : {},
		...raw.publicId !== void 0 ? { publicId: raw.publicId } : {},
		...raw.numeric_id !== void 0 ? { numeric_id: raw.numeric_id } : {},
		...raw.numericId !== void 0 ? { numericId: raw.numericId } : {},
		...raw.article_id !== void 0 ? { article_id: raw.article_id } : {},
		...raw.articleId !== void 0 ? { articleId: raw.articleId } : {},
		slug: raw.slug?.trim() || slugify(raw.title_en || raw.title_ar || id),
		slug_ar: raw.slug_ar?.trim() || raw.slugAr?.trim() || raw.slug?.trim() || "",
		slug_latin: raw.slug_latin?.trim() || raw.slugLatin?.trim() || raw.slug_en?.trim() || raw.slugEn?.trim() || slugifyLatin(raw.title_en || raw.title_ar || raw.slug || id),
		kind,
		type,
		status: raw.status === "published" || workflowStage === "published" ? "published" : "draft",
		workflow_stage: workflowStage,
		access_tier: raw.access_tier === "paid" ? "paid" : "free",
		price_aud: Number.isFinite(price) ? Math.max(0, price) : 0,
		category: raw.category ?? "studies",
		topic_ar: raw.topic_ar?.trim() || "",
		topic_en: raw.topic_en?.trim() || "",
		title_ar: raw.title_ar?.trim() || "إصدار بلا عنوان",
		title_en: raw.title_en?.trim() || raw.title_ar?.trim() || "Untitled publication",
		headline_ar: raw.headline_ar?.trim() || "",
		headline_en: raw.headline_en?.trim() || "",
		abstract_ar: raw.abstract_ar?.trim() || "",
		abstract_en: raw.abstract_en?.trim() || raw.abstract_ar?.trim() || "",
		description_ar: raw.description_ar?.trim() || "",
		description_en: raw.description_en?.trim() || raw.description_ar?.trim() || "",
		author_ar: raw.author_ar?.trim() || "مركز إسناد",
		author_en: raw.author_en?.trim() || raw.author_ar?.trim() || "Esnad Center",
		cover_image: raw.cover_image?.trim() || "",
		cover_position_x: clampCoverPosition(raw.cover_position_x ?? 50),
		cover_position_y: clampCoverPositionY(raw.cover_position_y),
		pdf_url: raw.pdf_url?.trim() || "",
		featured: Boolean(raw.featured),
		language_mode: raw.language_mode === "ar" || raw.language_mode === "en" || raw.language_mode === "both" ? raw.language_mode : "both",
		pages: Number.isFinite(Number(raw.pages)) ? Math.max(1, Number(raw.pages)) : 1,
		tags_ar: normalizeTags(raw.tags_ar),
		tags_en: normalizeTags(raw.tags_en),
		published_at: raw.published_at?.trim() || now,
		created_at: raw.created_at?.trim() || now,
		updated_at: raw.updated_at?.trim() || now,
		content_json: raw.content_json ?? null,
		toc: Array.isArray(raw.toc) ? raw.toc : []
	};
}
function isPublicationPublic(publication) {
	return publication.status === "published" || publication.workflow_stage === "published";
}
function matchesSearch(publication, search) {
	const needle = search.trim().toLowerCase();
	if (!needle) return true;
	return [
		publication.title_ar,
		publication.title_en,
		publication.abstract_ar,
		publication.abstract_en,
		publication.author_ar,
		publication.author_en,
		publication.topic_ar,
		publication.topic_en,
		...publication.tags_ar,
		...publication.tags_en
	].join(" ").toLowerCase().includes(needle);
}
function filterPublication(publication, filters) {
	if (!isPublicationPublic(publication)) return false;
	if (filters.kind && filters.kind !== "all" && publication.kind !== filters.kind) return false;
	if (filters.category && filters.category !== "all" && publication.category !== filters.category) return false;
	if (filters.access_tier && filters.access_tier !== "all" && publication.access_tier !== filters.access_tier) return false;
	if (filters.topic?.trim()) {
		const topic = filters.topic.trim().toLowerCase();
		if (!publication.topic_ar.toLowerCase().includes(topic) && !publication.topic_en.toLowerCase().includes(topic)) return false;
	}
	return matchesSearch(publication, filters.search ?? "");
}
async function listPublishedPublicationsFromFirestore() {
	const { db } = await import("./firebase-CDYWQsgv.js");
	const { collection, getDocs, query, where } = await import("firebase/firestore");
	await loadTransliteration();
	if (!db || !isFirebaseConfigured) return sortByPublished(readLocalPublications()).filter(isPublicationPublic);
	const [publishedByStatus, publishedByWorkflow] = await Promise.all([getDocs(query(collection(db, "publications"), where("status", "==", "published"))), getDocs(query(collection(db, "publications"), where("workflow_stage", "==", "published")))]);
	const items = /* @__PURE__ */ new Map();
	for (const snapshot of [publishedByStatus, publishedByWorkflow]) for (const item of snapshot.docs) items.set(item.id, normalizePublication(item.id, item.data()));
	return sortByPublished([...items.values()]);
}
function sortByPublished(items) {
	return [...items].sort((left, right) => new Date(right.published_at).getTime() - new Date(left.published_at).getTime());
}
function readLocalPublications() {
	if (typeof window === "undefined") return [];
	const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
	if (!stored) return [];
	try {
		const parsed = JSON.parse(stored);
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}
async function getPublicApiHeaders() {
	const token = await auth?.currentUser?.getIdToken().catch(() => "");
	return token ? { Authorization: `Bearer ${token}` } : void 0;
}
async function listPublicationsFromApi() {
	const initial = document.getElementById("initial-catalog-data")?.textContent;
	if (initial && !auth?.currentUser) {
		const parsed = JSON.parse(initial);
		if (Array.isArray(parsed)) return parsed;
	}
	const response = await fetch("/api/publications", { headers: await getPublicApiHeaders() });
	const payload = await response.json().catch(() => null);
	if (!response.ok) throw new Error("تعذر تحميل الإصدارات حالياً.");
	return Array.isArray(payload?.publications) ? payload.publications : [];
}
async function getPublicationFromApi(reference) {
	const initial = document.getElementById("initial-publication-data")?.textContent;
	if (initial && !auth?.currentUser) {
		const parsed = JSON.parse(initial);
		if ([
			parsed.id,
			getPublicPublicationId(parsed),
			parsed.slug,
			parsed.slug_ar,
			parsed.slug_en
		].includes(reference)) return parsed;
	}
	const params = new URLSearchParams({ reference });
	const response = await fetch(`/api/publications?${params.toString()}`, { headers: await getPublicApiHeaders() });
	const payload = await response.json().catch(() => null);
	if (response.status === 404) return null;
	if (!response.ok) throw new Error("تعذر تحميل الإصدار حالياً.");
	return payload?.publication ?? null;
}
function getPublicationCategoryLabel(category, language) {
	const categoryMeta = PUBLICATION_CATEGORIES.find((item) => item.id === category);
	if (!categoryMeta) return category;
	return language === "ar" ? categoryMeta.label_ar : categoryMeta.label_en;
}
function getPublicationKindLabel(kind, language) {
	if (kind === "book") return language === "ar" ? "كتاب" : "Book";
	if (kind === "article") return language === "ar" ? "مقال" : "Article";
	return language === "ar" ? "ورقة بحثية" : "Research Paper";
}
function getPublicationTitle(publication, language) {
	return language === "ar" ? publication.title_ar : publication.title_en || publication.title_ar;
}
function getPublicationHeadline(publication, language) {
	if (language === "ar") return publication.headline_ar?.trim() || publication.headline_en?.trim() || publication.title_ar || publication.title_en || "";
	return publication.headline_en?.trim() || publication.headline_ar?.trim() || publication.title_en || publication.title_ar || "";
}
function getPublicationAbstract(publication, language) {
	return language === "ar" ? publication.abstract_ar || publication.abstract_en : publication.abstract_en || publication.abstract_ar;
}
function getPublicationDescription(publication, language) {
	return language === "ar" ? publication.description_ar || publication.description_en : publication.description_en || publication.description_ar;
}
function getPublicationAuthor(publication, language) {
	return language === "ar" ? publication.author_ar || publication.author_en : publication.author_en || publication.author_ar;
}
function getPublicationTopic(publication, language) {
	return language === "ar" ? publication.topic_ar || publication.topic_en : publication.topic_en || publication.topic_ar;
}
function formatCurrency(amount, language) {
	return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-AU", {
		style: "currency",
		currency: "AUD",
		maximumFractionDigits: 0
	}).format(amount);
}
async function listPublications(filters = {}) {
	if (!isFirebaseConfigured) return sortByPublished(readLocalPublications()).filter((item) => filterPublication(item, filters));
	if (shouldUsePublicApi) return (await listPublicationsFromApi().catch((error) => {
		console.warn("[esnad] Publication API unavailable", error);
		return listPublishedPublicationsFromFirestore();
	})).filter((item) => filterPublication(item, filters));
	return (await listPublishedPublicationsFromFirestore()).filter((item) => filterPublication(item, filters));
}
async function getPublishedPublicationDocumentById(id) {
	const { db } = await import("./firebase-CDYWQsgv.js");
	const { doc, getDoc } = await import("firebase/firestore");
	await loadTransliteration();
	if (!db) return null;
	try {
		const snapshot = await getDoc(doc(db, "publications", id));
		if (!snapshot.exists()) return null;
		const publication = normalizePublication(snapshot.id, snapshot.data());
		return isPublicationPublic(publication) ? publication : null;
	} catch {
		return null;
	}
}
async function getPublicationBySlug(slug) {
	const trimmedSlug = slug.trim();
	const matchSlug = (item) => [
		item.id,
		getPublicPublicationId(item),
		item.slug,
		item.slug_ar,
		item.slugAr,
		item.slug_latin,
		item.slugLatin,
		item.slug_en,
		item.slugEn,
		slugifyLatin(item.title_en || item.title_ar || item.slug)
	].map((candidate) => candidate?.trim()).includes(trimmedSlug);
	if (!isFirebaseConfigured) {
		await loadTransliteration();
		return readLocalPublications().find(matchSlug) ?? null;
	}
	if (shouldUsePublicApi) return getPublicationFromApi(trimmedSlug).catch((error) => {
		console.warn("[esnad] Publication API unavailable", error);
		return getPublicationBySlugFromFirestore(trimmedSlug);
	});
	return getPublicationBySlugFromFirestore(trimmedSlug);
}
async function getPublicationBySlugFromFirestore(trimmedSlug) {
	const { db, logFirebaseDebug } = await import("./firebase-CDYWQsgv.js");
	const { collection, getDocs, query, where } = await import("firebase/firestore");
	await loadTransliteration();
	if (!db) return null;
	const matchSlug = (item) => [
		item.id,
		getPublicPublicationId(item),
		item.slug,
		item.slug_ar,
		item.slugAr,
		item.slug_latin,
		item.slugLatin,
		item.slug_en,
		item.slugEn,
		slugifyLatin(item.title_en || item.title_ar || item.slug)
	].map((candidate) => candidate?.trim()).includes(trimmedSlug);
	try {
		const mappedId = /^\d+$/.test(trimmedSlug) ? PUBLICATION_ID_MAP[trimmedSlug] : void 0;
		if (mappedId) {
			const mappedPublication = await getPublishedPublicationDocumentById(mappedId);
			if (mappedPublication) return mappedPublication;
		}
		const byId = await getPublishedPublicationDocumentById(trimmedSlug);
		if (byId) return byId;
		for (const slugField of [
			"slug",
			"slug_ar",
			"slugAr",
			"slug_latin",
			"slugLatin",
			"slug_en",
			"slugEn"
		]) {
			const [bySlugStatus, bySlugWorkflow] = await Promise.all([getDocs(query(collection(db, "publications"), where(slugField, "==", trimmedSlug), where("status", "==", "published"))), getDocs(query(collection(db, "publications"), where(slugField, "==", trimmedSlug), where("workflow_stage", "==", "published")))]);
			for (const snapshot of [bySlugStatus, bySlugWorkflow]) if (!snapshot.empty) {
				const d = snapshot.docs[0];
				return normalizePublication(d.id, d.data());
			}
		}
		return (await listPublishedPublicationsFromFirestore()).find(matchSlug) ?? null;
	} catch (error) {
		logFirebaseDebug("getPublicationBySlug:error", error);
		throw error;
	}
}
//#endregion
//#region src/lib/analytics.ts
var POSTHOG_TOKEN = "".trim();
var POSTHOG_HOST = ("".trim(), "https://us.i.posthog.com");
var isPostHogEnabled = Boolean(POSTHOG_TOKEN);
var ANONYMOUS_ID_KEY = "esnad_analytics_distinct_id";
var CONSENT_KEY = "esnad_analytics_consent_v2";
var CONSENT_EVENT = "esnad:analytics-consent";
var currentDistinctId = "";
var currentCompanyDomain = null;
var postHogReady = null;
function getAnalyticsConsentStatus() {
	if (typeof window === "undefined") return null;
	try {
		const status = window.localStorage.getItem(CONSENT_KEY);
		return status === "accepted" ? status : null;
	} catch {
		return null;
	}
}
function hasAnalyticsConsent() {
	return getAnalyticsConsentStatus() === "accepted";
}
function startPostHog() {
	if (!isPostHogEnabled || postHogReady || !hasAnalyticsConsent()) return;
	postHogReady = import("posthog-js").then(({ default: posthog }) => {
		posthog.init(POSTHOG_TOKEN, {
			api_host: POSTHOG_HOST,
			autocapture: true,
			capture_pageview: false,
			capture_pageleave: true,
			defaults: "2026-01-30",
			person_profiles: "identified_only"
		});
		return posthog;
	});
	postHogReady.catch(() => {
		postHogReady = null;
	});
}
function withPostHog(action) {
	startPostHog();
	postHogReady?.then(action).catch(() => {});
}
function setAnalyticsConsentStatus(status) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(CONSENT_KEY, status);
	} catch {
		return;
	}
	startPostHog();
	if (isPostHogEnabled) withPostHog((sdk) => sdk.opt_in_capturing());
	window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: status }));
}
function subscribeAnalyticsConsent(listener) {
	if (typeof window === "undefined") return () => void 0;
	const handler = (event) => {
		listener(event.detail);
	};
	window.addEventListener(CONSENT_EVENT, handler);
	return () => window.removeEventListener(CONSENT_EVENT, handler);
}
function capture(event, properties) {
	if (typeof window === "undefined") return;
	if (!hasAnalyticsConsent()) return;
	startPostHog();
	sendServerEvent(event, properties);
}
function getAnonymousDistinctId() {
	if (typeof window === "undefined") return `anon_${Date.now()}`;
	const stored = window.localStorage.getItem(ANONYMOUS_ID_KEY);
	if (stored) return stored;
	const generated = `anon_${crypto.randomUUID()}`;
	window.localStorage.setItem(ANONYMOUS_ID_KEY, generated);
	return generated;
}
async function sendServerEvent(event, properties) {
	const distinctId = currentDistinctId || getAnonymousDistinctId();
	await fetch("/api/track-event", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		keepalive: true,
		body: JSON.stringify({
			event,
			distinct_id: distinctId,
			properties: {
				...properties,
				visitor_company_domain: currentCompanyDomain,
				$current_url: window.location.href,
				$host: window.location.host,
				$pathname: window.location.pathname,
				$referrer: document.referrer || null
			}
		})
	}).catch(() => {
		if (isPostHogEnabled) withPostHog((sdk) => sdk.capture(event, properties));
	});
}
function trackPublicationView(publication, language) {
	capture(publication.kind === "article" ? "article_viewed" : "publication_viewed", {
		publication_id: publication.id,
		publication_slug: getShareSlug(publication),
		publication_kind: publication.kind,
		publication_type: publication.type,
		publication_category: publication.category,
		publication_title: getPublicationTitle(publication, language),
		publication_title_ar: publication.title_ar,
		publication_title_en: publication.title_en,
		publication_author: getPublicationAuthor(publication, language),
		publication_author_ar: publication.author_ar,
		publication_author_en: publication.author_en,
		publication_access_tier: publication.access_tier,
		publication_published_at: publication.published_at,
		has_pdf: Boolean(publication.pdf_url || publication.has_pdf),
		language,
		path: window.location.pathname,
		url: window.location.href
	});
}
function trackPublicationReadTime(publication, language, readingSeconds, maxScrollDepth, readSessionId) {
	capture(publication.kind === "article" ? "article_read_time" : "publication_read_time", {
		publication_id: publication.id,
		publication_slug: getShareSlug(publication),
		publication_kind: publication.kind,
		publication_type: publication.type,
		publication_category: publication.category,
		publication_title: getPublicationTitle(publication, language),
		publication_author: getPublicationAuthor(publication, language),
		publication_access_tier: publication.access_tier,
		reading_seconds: Math.max(0, Math.round(readingSeconds)),
		max_scroll_depth: Math.max(0, Math.min(100, Math.round(maxScrollDepth))),
		read_session_id: readSessionId,
		language,
		path: window.location.pathname,
		url: window.location.href
	});
}
startPostHog();
//#endregion
//#region src/components/public/CookieConsentBanner.tsx
function CookieConsentBanner() {
	const location = useLocation();
	const [status, setStatus] = useState(() => getAnalyticsConsentStatus());
	const isEnglish = location.pathname.startsWith("/en");
	useEffect(() => subscribeAnalyticsConsent(setStatus), []);
	if (status) return null;
	const copy = isEnglish ? {
		title: "Analytics cookies",
		body: "We use analytics cookies to count anonymous visits and understand general location and page performance.",
		accept: "Accept"
	} : {
		title: "ملفات تعريف الارتباط",
		body: "نستخدم ملفات التحليلات لقياس الزيارات المجهولة ومعرفة الموقع العام وأداء الصفحات.",
		accept: "قبول"
	};
	return /* @__PURE__ */ jsx("div", {
		className: "cookie-modal",
		dir: isEnglish ? "ltr" : "rtl",
		role: "presentation",
		children: /* @__PURE__ */ jsxs("section", {
			className: "cookie-modal__dialog",
			"aria-labelledby": "cookie-modal-title",
			role: "dialog",
			"aria-modal": "true",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "cookie-modal__copy",
				children: [/* @__PURE__ */ jsx("strong", {
					id: "cookie-modal-title",
					children: copy.title
				}), /* @__PURE__ */ jsx("p", { children: copy.body })]
			}), /* @__PURE__ */ jsx("div", {
				className: "cookie-modal__actions",
				children: /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "btn btn--primary",
					onClick: () => setAnalyticsConsentStatus("accepted"),
					children: copy.accept
				})
			})]
		})
	});
}
//#endregion
//#region src/lib/articleCoverFallbacks.js
var ARTICLE_COVER_FALLBACKS = {
	"01899275-a950-45b7-922a-0e71a5e35b7a": "/assets/article-covers/01899275-a950-45b7-922a-0e71a5e35b7a.png",
	"fd7a55a3-7964-4c9f-82c5-2a741e3e278d": "/assets/article-covers/fd7a55a3-7964-4c9f-82c5-2a741e3e278d.png",
	"6d6b83d5-be1a-41da-b562-4d8e5f92596c": "/assets/article-covers/6d6b83d5-be1a-41da-b562-4d8e5f92596c.png",
	"56e0dfb5-e39c-433c-81c5-c9cc94a92ac7": "/assets/article-covers/56e0dfb5-e39c-433c-81c5-c9cc94a92ac7.png",
	"c3988698-cbb4-4cb2-87cf-78c174f7acf5": "/assets/article-covers/c3988698-cbb4-4cb2-87cf-78c174f7acf5.png",
	"d713e358-d198-49fb-8f46-e23c1ee60950": "/assets/article-covers/d713e358-d198-49fb-8f46-e23c1ee60950.png",
	"da67e138-ddc0-40ca-8176-ac5f1d88361b": "/assets/article-covers/da67e138-ddc0-40ca-8176-ac5f1d88361b.png",
	"e2a8244b-472a-4fca-8061-37fc8d42a036": "/assets/article-covers/e2a8244b-472a-4fca-8061-37fc8d42a036.png",
	"388d4355-ede6-422e-bb33-8d6761c1e680": "/assets/article-covers/388d4355-ede6-422e-bb33-8d6761c1e680.png",
	"5d0b5ece-dfa6-4359-bb9e-03d96294df25": "/assets/article-covers/5d0b5ece-dfa6-4359-bb9e-03d96294df25.png",
	"71fdb47a-eb17-4704-a13a-a82ce4be9362": "/assets/article-covers/71fdb47a-eb17-4704-a13a-a82ce4be9362.png",
	"7f822f92-b6cf-4a3c-963e-09eba2458af1": "/assets/article-covers/7f822f92-b6cf-4a3c-963e-09eba2458af1.png",
	"8eb62131-624e-4a12-a42c-11709b38eda1": "/assets/article-covers/8eb62131-624e-4a12-a42c-11709b38eda1.png",
	"c668f12a-49f3-4548-8672-d7f02f26f558": "/assets/article-covers/c668f12a-49f3-4548-8672-d7f02f26f558.png",
	"b1c54007-f429-49c0-a19f-0e4fc10ce12a": "/assets/article-covers/b1c54007-f429-49c0-a19f-0e4fc10ce12a.png"
};
//#endregion
//#region src/lib/seoMetadata.js
var HOME_DESCRIPTION = "مركز إسناد للدراسات والأبحاث، المعروف أيضاً باسم مركز اسناد: مكتبة عربية للدراسات السياسية والقانونية والمقالات والكتب.";
var PAGE_SEO = {
	"/": {
		title: "مركز إسناد للدراسات والأبحاث",
		description: HOME_DESCRIPTION
	},
	"/about": {
		title: "مركز اسناد الإلكتروني للدراسات والأبحاث | إسناد",
		description: "تعرّف إلى مركز إسناد للدراسات والأبحاث، المعروف باسم مركز اسناد الالكتروني، ورسالته في نشر الدراسات والأوراق البحثية والمقالات باللغة العربية."
	}
};
var PUBLICATION_SEO = {
	"9928005": {
		title: "موقف الكنيسة الكاثوليكية من إسرائيل والصهيونية | إسناد",
		description: "دراسة في موقف الكنيسة الكاثوليكية من اليهودية والصهيونية وإسرائيل، والمصالحة اللاهوتية والنقد السياسي، مع مراجع بينها أعمال ماسيمو فاجيولي."
	},
	"7230859": {
		title: "رماة ماهرون: المسيّرات وتغيّر معادلات حرب لبنان | إسناد",
		description: "رماة ماهرون على جبهة لبنان: دراسة في دور مشغّلي المسيّرات وكيف تتحول الأداة الصغيرة إلى سلاح استراتيجي يغيّر معادلات الحرب."
	}
};
function publicationPublicId(pub) {
	const numeric = [
		pub.public_id,
		pub.publicId,
		pub.numeric_id,
		pub.numericId,
		pub.article_id,
		pub.articleId,
		pub.id
	].find((v) => /^\d+$/.test(String(v || "")));
	if (numeric) return String(numeric);
	let hash = 2166136261;
	for (const char of pub.id || "") {
		hash ^= char.charCodeAt(0);
		hash = Math.imul(hash, 16777619);
	}
	return String(1e6 + (hash >>> 0) % 9e6);
}
function publicationPath(pub) {
	return `/${pub.kind === "book" ? "books" : "library"}/${publicationPublicId(pub)}`;
}
function shortText(value, limit) {
	const text = String(value || "").replace(/\s+/g, " ").trim();
	if (text.length <= limit) return text;
	const cut = text.slice(0, limit - 1);
	return `${cut.slice(0, cut.lastIndexOf(" ") > limit / 2 ? cut.lastIndexOf(" ") : cut.length)}…`;
}
function contentText(node) {
	return node?.text || (node?.content || []).map(contentText).join(" ");
}
function publicationSeo(pub) {
	return PUBLICATION_SEO[publicationPublicId(pub)] || {
		title: `${shortText(pub.headline_ar || pub.title_ar, 50)} | إسناد`,
		description: shortText(pub.abstract_ar || pub.description_ar || contentText(pub.content_json) || `قراءة ${pub.title_ar}، من إصدارات مركز إسناد للدراسات والأبحاث.`, 154)
	};
}
function breadcrumbs(items) {
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map(([name, path], index) => ({
			"@type": "ListItem",
			position: index + 1,
			name,
			item: `https://esnads.net${path === "/" ? "" : path}`
		}))
	};
}
function publicationBreadcrumbs(pub) {
	return breadcrumbs([
		["الرئيسية", "/"],
		["المكتبة البحثية", "/library"],
		[pub.title_ar, publicationPath(pub)]
	]);
}
function normalize(text) {
	return String(text || "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/[\u064b-\u065f\u0670\u0640]/g, "").toLowerCase();
}
var topicPatterns = [
	/لبنان|لبناني|سلاح|مقاوم|مسيرات|رماة|نعيم قاسم/,
	/اسراييل|اسرائيل|ايران|حرب|عدوان|سنتكوم|اباده|تجريم الصمت|هيمنه/,
	/دين|ديني|كنيس|كاثوليك|لاهوت|يهود|ابراهيم|حج|خامني|خامنئي|قيم/,
	/قياد|ثقه|نفسي|نرجسي|كذب|وعي/,
	/تعليم|امتحان|تقييم/,
	/مطر|هطول|سحب/,
	/يمن|سعود|قطر|عراق|سوري|واشنطن|خليج|اردن/
];
function relatedPublications(pub, items, limit = 4) {
	const text = normalize(`${pub.title_ar} ${pub.topic_ar || ""}`);
	const topics = topicPatterns.map((pattern) => pattern.test(text));
	return items.filter((item) => item.id !== pub.id && item.kind !== "book").map((item) => {
		const candidate = normalize(`${item.title_ar} ${item.topic_ar || ""}`);
		return {
			item,
			score: topics.reduce((score, yes, i) => score + (yes && topicPatterns[i].test(candidate) ? 10 : 0), 0) + text.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 4).filter((word) => candidate.includes(word)).length + (item.category === pub.category ? 1 : 0)
		};
	}).filter((entry) => entry.score > 1).sort((a, b) => b.score - a.score || String(b.item.published_at).localeCompare(String(a.item.published_at))).slice(0, limit).map((entry) => entry.item);
}
//#endregion
//#region src/lib/structuredData.js
var SEO_SITE_URL = "https://esnads.net";
var SEO_SITE_NAME = "مركز إسناد للدراسات والأبحاث";
var SEO_ALTERNATE_NAMES = [
	"اسناد",
	"مركز اسناد",
	"مركز إسناد",
	"Esnads",
	"Esnad",
	"esnads.net"
];
function createOrganizationStructuredData() {
	return {
		"@type": "Organization",
		"@id": `${SEO_SITE_URL}/#organization`,
		name: SEO_SITE_NAME,
		alternateName: [...SEO_ALTERNATE_NAMES],
		url: SEO_SITE_URL,
		logo: `${SEO_SITE_URL}/newlogo.png`,
		sameAs: []
	};
}
function getPublicationImage(pub) {
	const image = pub.cover_image || ARTICLE_COVER_FALLBACKS[pub.id] || "";
	return image ? new URL(image, SEO_SITE_URL).href : "";
}
function isoDate(value) {
	if (!value) return void 0;
	const date = new Date(value);
	return Number.isFinite(date.getTime()) ? date.toISOString() : void 0;
}
function createArticleStructuredData(pub, { url, image = getPublicationImage(pub) }) {
	const organization = createOrganizationStructuredData();
	const author = pub.author_ar?.trim() || pub.author_en?.trim() || "";
	const datePublished = isoDate(pub.published_at) || isoDate(pub.created_at);
	const dateModified = isoDate(pub.updated_at) || datePublished;
	const publicationImage = image || getPublicationImage(pub);
	return {
		"@context": "https://schema.org",
		"@type": "Article",
		"@id": `${url}#article`,
		headline: pub.headline_ar?.trim() || pub.title_ar?.trim() || "",
		name: pub.title_ar?.trim() || "",
		description: publicationSeo(pub).description,
		inLanguage: "ar",
		url,
		mainEntityOfPage: {
			"@type": "WebPage",
			"@id": url
		},
		publisher: organization,
		author: !author || ["مركز إسناد", "مركز إسناد للدراسات والأبحاث"].includes(author) ? {
			"@type": "Organization",
			"@id": organization["@id"],
			name: author || "مركز إسناد للدراسات والأبحاث"
		} : {
			"@type": "Person",
			name: author
		},
		image: publicationImage ? [new URL(publicationImage, SEO_SITE_URL).href] : [],
		...datePublished ? { datePublished } : {},
		...dateModified ? { dateModified } : {}
	};
}
function serializeStructuredData(data) {
	return JSON.stringify(data).replace(/</g, "\\u003c");
}
//#endregion
//#region src/hooks/usePageMeta.ts
var SITE_NAME = "إسناد";
var SITE_URL = "https://esnads.net";
var DEFAULT_TITLE_AR = "مركز إسناد للدراسات والأبحاث";
var DEFAULT_TITLE_EN = "Esnad Center for Studies and Research";
var DEFAULT_DESCRIPTION_AR = HOME_DESCRIPTION;
var DEFAULT_DESCRIPTION_EN = "A bilingual platform for studies, research papers, books, and analytical articles.";
function upsertMeta(attribute, key, content) {
	let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
	if (!element) {
		element = document.createElement("meta");
		element.setAttribute(attribute, key);
		document.head.appendChild(element);
	}
	element.setAttribute("content", content);
}
function upsertLink(rel, href) {
	let element = document.head.querySelector(`link[rel="${rel}"]`);
	if (!element) {
		element = document.createElement("link");
		element.setAttribute("rel", rel);
		document.head.appendChild(element);
	}
	element.setAttribute("href", href);
}
function getRouteMeta(pathname, language) {
	const isEnglish = language === "en";
	const base = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
	const meta = { path: pathname };
	if (!isEnglish && PAGE_SEO[base]) return {
		...PAGE_SEO[base],
		path: pathname
	};
	if (base.startsWith("/library")) {
		meta.title = isEnglish ? "Research library" : "المكتبة البحثية";
		meta.description = isEnglish ? "Published Esnad research papers, studies, reports, and articles." : "أرشيف إسناد المنشور من الدراسات والأوراق البحثية والتقارير والمقالات.";
	} else if (base.startsWith("/articles")) {
		meta.title = isEnglish ? "Articles" : "المقالات";
		meta.description = isEnglish ? "Latest Esnad analytical and opinion articles." : "أحدث مقالات إسناد التحليلية ومقالات الرأي.";
	} else if (base.startsWith("/books")) {
		meta.title = isEnglish ? "Books" : "الكتب";
		meta.description = isEnglish ? "Published Esnad books with metadata and summaries." : "كتب إسناد المنشورة مع البيانات التعريفية والملخصات.";
	} else if (base.startsWith("/about")) meta.title = isEnglish ? "About the center" : "من نحن";
	else if (base.startsWith("/contact")) meta.title = isEnglish ? "Contact us" : "تواصل معنا";
	else if (base.startsWith("/auth") || base.startsWith("/login") || base.startsWith("/register") || base.startsWith("/dashboard")) {
		meta.title = base.startsWith("/dashboard") ? isEnglish ? "My account" : "حسابي" : isEnglish ? "Sign in" : "الدخول";
		meta.noindex = true;
	}
	return meta;
}
function usePageMeta(language, meta) {
	const { title, description, path, image, noindex } = meta ?? {};
	const hasMeta = meta !== null;
	useEffect(() => {
		if (!hasMeta) return;
		const defaultTitle = language === "en" ? DEFAULT_TITLE_EN : DEFAULT_TITLE_AR;
		const pageTitle = title ? title.includes(" | ") || title === DEFAULT_TITLE_AR ? title : `${title} | ${SITE_NAME}` : defaultTitle;
		const pageDescription = description || (language === "en" ? DEFAULT_DESCRIPTION_EN : DEFAULT_DESCRIPTION_AR);
		document.title = pageTitle;
		upsertMeta("name", "description", pageDescription);
		upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");
		upsertMeta("property", "og:title", title || defaultTitle);
		upsertMeta("property", "og:site_name", SEO_SITE_NAME);
		upsertMeta("property", "og:description", pageDescription);
		upsertMeta("name", "twitter:title", title || defaultTitle);
		upsertMeta("name", "twitter:description", pageDescription);
		if (path) {
			const basePath = path.replace(/^\/en(?=\/|$)/, "") || "/";
			const canonicalPath = path === "/en" ? "/en" : basePath;
			const url = canonicalPath === "/" ? SITE_URL : `${SITE_URL}${canonicalPath}`;
			upsertLink("canonical", url);
			upsertMeta("property", "og:url", url);
			document.head.querySelectorAll("link[rel=\"alternate\"][hreflang]").forEach((link) => link.remove());
			if (basePath === "/") for (const [lang, href] of [
				["ar", SITE_URL],
				["en", `${SITE_URL}/en`],
				["x-default", SITE_URL]
			]) {
				const link = document.createElement("link");
				link.rel = "alternate";
				link.hreflang = lang;
				link.href = href;
				document.head.appendChild(link);
			}
			document.getElementById("route-breadcrumb-jsonld")?.remove();
			if ([
				"/library",
				"/articles",
				"/books"
			].includes(basePath)) {
				const script = document.createElement("script");
				script.id = "route-breadcrumb-jsonld";
				script.type = "application/ld+json";
				script.textContent = JSON.stringify(breadcrumbs([["الرئيسية", "/"], [title || "المكتبة", basePath]]));
				document.head.appendChild(script);
			}
		}
		if (image) {
			upsertMeta("property", "og:image", image);
			upsertMeta("name", "twitter:image", image);
		}
	}, [
		language,
		title,
		description,
		path,
		image,
		noindex,
		hasMeta
	]);
}
//#endregion
//#region src/components/ui/wireframe-dotted-globe.tsx
var COUNTRIES_DATA_URL = "/data/countries.json";
var DEFAULT_RED_COUNTRIES = [
	"Algeria",
	"Bahrain",
	"Comoros",
	"Djibouti",
	"Egypt",
	"Iraq",
	"Jordan",
	"Kuwait",
	"Lebanon",
	"Libya",
	"Mauritania",
	"Morocco",
	"Oman",
	"Palestine",
	"Qatar",
	"Saudi Arabia",
	"Somalia",
	"Sudan",
	"Syria",
	"Tunisia",
	"United Arab Emirates",
	"Yemen"
];
var DEFAULT_BLUE_COUNTRIES = [
	"United States of America",
	"United Kingdom",
	"France",
	"Germany",
	"China",
	"Turkey",
	"Türkiye",
	"India",
	"Japan",
	"Canada",
	"Australia",
	"Brazil",
	"Indonesia",
	"Malaysia"
];
var BASE_ROTATION = [-30, -15];
function cssColor(token, fallback) {
	return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}
function WireframeDottedGlobe({ size = 144, className = "", spinDurationMs = 1400, ariaLabel = "Globe", redCountries = DEFAULT_RED_COUNTRIES, blueCountries = DEFAULT_BLUE_COUNTRIES }) {
	const canvasRef = useRef(null);
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const context = canvas.getContext("2d");
		if (!context) return;
		const redFill = cssColor("--accent", "#E63946");
		const blueFill = cssColor("--blue-light", "#5BA3E6");
		const inkFill = cssColor("--text", "#222222");
		const outlineColor = "rgba(17, 17, 17, 0.45)";
		const graticuleColor = "rgba(17, 17, 17, 0.12)";
		const edgeColor = "rgba(17, 17, 17, 0.2)";
		const redSet = new Set(redCountries.map((name) => name.toLowerCase()));
		const blueSet = new Set(blueCountries.map((name) => name.toLowerCase()));
		let displaySize = size;
		let radius = (size - 4) / 2;
		const projection = geoOrthographic().clipAngle(90);
		const path = geoPath(projection, context);
		const graticule = geoGraticule()();
		let redFeatures = [];
		let blueFeatures = [];
		let plainFeatures = [];
		let allFeatures = [];
		const rotation = [BASE_ROTATION[0], BASE_ROTATION[1]];
		let frame = null;
		let disposed = false;
		const setupCanvas = () => {
			const rect = canvas.getBoundingClientRect();
			displaySize = Math.max(24, Math.round(rect.width || size));
			const dpr = window.devicePixelRatio || 1;
			canvas.width = Math.round(displaySize * dpr);
			canvas.height = Math.round(displaySize * dpr);
			context.setTransform(dpr, 0, 0, dpr, 0, 0);
			radius = (displaySize - 4) / 2;
			projection.scale(radius).translate([displaySize / 2, displaySize / 2]);
		};
		const strokeFeatures = (features, style, width) => {
			context.beginPath();
			features.forEach((feature) => {
				path(feature);
			});
			context.strokeStyle = style;
			context.lineWidth = width;
			context.stroke();
		};
		const fillFeatures = (features, style) => {
			context.beginPath();
			features.forEach((feature) => {
				path(feature);
			});
			context.fillStyle = style;
			context.fill();
		};
		const render = () => {
			context.clearRect(0, 0, displaySize, displaySize);
			context.beginPath();
			context.arc(displaySize / 2, displaySize / 2, radius, 0, 2 * Math.PI);
			context.fillStyle = "#ffffff";
			context.fill();
			context.strokeStyle = edgeColor;
			context.lineWidth = 1;
			context.stroke();
			context.beginPath();
			path(graticule);
			context.strokeStyle = graticuleColor;
			context.lineWidth = .75;
			context.stroke();
			if (allFeatures.length > 0) {
				fillFeatures(plainFeatures, inkFill);
				fillFeatures(redFeatures, redFill);
				fillFeatures(blueFeatures, blueFill);
				strokeFeatures(allFeatures, outlineColor, .6);
			}
		};
		const applyRotation = () => {
			projection.rotate([rotation[0], rotation[1]]);
			render();
		};
		const spin = () => {
			if (frame !== null) return;
			const startLambda = rotation[0];
			const start = performance.now();
			const step = (now) => {
				if (disposed) return;
				const t = Math.min(1, (now - start) / spinDurationMs);
				rotation[0] = startLambda + 360 * (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
				if (t < 1) {
					applyRotation();
					frame = requestAnimationFrame(step);
				} else {
					frame = null;
					rotation[0] = startLambda;
					applyRotation();
				}
			};
			frame = requestAnimationFrame(step);
		};
		let dragPointer = null;
		let dragMoved = false;
		let dragStartX = 0;
		let dragStartY = 0;
		let dragStartRotation = [0, 0];
		const handlePointerDown = (event) => {
			if (frame !== null) {
				cancelAnimationFrame(frame);
				frame = null;
			}
			dragPointer = event.pointerId;
			dragMoved = false;
			dragStartX = event.clientX;
			dragStartY = event.clientY;
			dragStartRotation = [rotation[0], rotation[1]];
			canvas.setPointerCapture(event.pointerId);
		};
		const handlePointerMove = (event) => {
			if (dragPointer !== event.pointerId) return;
			const dx = event.clientX - dragStartX;
			const dy = event.clientY - dragStartY;
			if (!dragMoved && Math.hypot(dx, dy) < 4) return;
			dragMoved = true;
			const sensitivity = 180 / displaySize;
			rotation[0] = dragStartRotation[0] + dx * sensitivity;
			rotation[1] = Math.max(-90, Math.min(90, dragStartRotation[1] - dy * sensitivity));
			applyRotation();
		};
		const handlePointerEnd = (event) => {
			if (dragPointer !== event.pointerId) return;
			dragPointer = null;
		};
		const preventNativeDrag = (event) => {
			event.preventDefault();
		};
		const handleClick = (event) => {
			event.preventDefault();
			event.stopPropagation();
			if (dragMoved) {
				dragMoved = false;
				return;
			}
			spin();
		};
		canvas.addEventListener("pointerdown", handlePointerDown);
		canvas.addEventListener("pointermove", handlePointerMove);
		canvas.addEventListener("pointerup", handlePointerEnd);
		canvas.addEventListener("pointercancel", handlePointerEnd);
		canvas.addEventListener("dragstart", preventNativeDrag);
		canvas.addEventListener("click", handleClick);
		setupCanvas();
		applyRotation();
		const observer = new ResizeObserver(() => {
			setupCanvas();
			applyRotation();
		});
		observer.observe(canvas);
		fetch(COUNTRIES_DATA_URL).then((response) => {
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return response.json();
		}).then((countries) => {
			if (disposed) return;
			allFeatures = countries.features.filter((feature) => feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon");
			const colorOf = (feature) => {
				const name = (feature.properties?.name ?? "").toLowerCase();
				if (redSet.has(name)) return "red";
				if (blueSet.has(name)) return "blue";
				return null;
			};
			redFeatures = allFeatures.filter((feature) => colorOf(feature) === "red");
			blueFeatures = allFeatures.filter((feature) => colorOf(feature) === "blue");
			plainFeatures = allFeatures.filter((feature) => colorOf(feature) === null);
			render();
		}).catch((error) => {
			console.error("Failed to load globe country data", error);
		});
		return () => {
			disposed = true;
			observer.disconnect();
			if (frame !== null) cancelAnimationFrame(frame);
			canvas.removeEventListener("pointerdown", handlePointerDown);
			canvas.removeEventListener("pointermove", handlePointerMove);
			canvas.removeEventListener("pointerup", handlePointerEnd);
			canvas.removeEventListener("pointercancel", handlePointerEnd);
			canvas.removeEventListener("dragstart", preventNativeDrag);
			canvas.removeEventListener("click", handleClick);
			context.setTransform(1, 0, 0, 1, 0, 0);
		};
	}, [
		size,
		spinDurationMs,
		redCountries,
		blueCountries
	]);
	return /* @__PURE__ */ jsx("span", {
		className: `wireframe-globe${className ? ` ${className}` : ""}`,
		role: "img",
		"aria-label": ariaLabel,
		children: /* @__PURE__ */ jsx("canvas", {
			ref: canvasRef,
			className: "wireframe-globe__canvas"
		})
	});
}
//#endregion
//#region src/lib/navigation.ts
function buildLocalizedPath(language, path) {
	if (language === "ar") return path;
	if (path === "/") return "/en";
	return `/en${path}`;
}
function buildPublicationPath(publication, language) {
	return buildLocalizedPath(language, `${publication.kind === "book" ? "/books" : "/library"}/${getShareSlug(publication)}`);
}
//#endregion
//#region src/components/public/PublicSiteShell.tsx
function getNavItems(language) {
	return [
		{
			path: "/",
			label: language === "ar" ? "الرئيسية" : "Home"
		},
		{
			path: "/library",
			label: language === "ar" ? "المكتبة" : "Library"
		},
		{
			path: "/articles",
			label: language === "ar" ? "مقالات" : "Articles"
		},
		{
			path: "/about",
			label: language === "ar" ? "من نحن" : "About"
		}
	];
}
function PublicSiteShell({ language, children, noindex = false }) {
	const location = useLocation();
	const navigate = useNavigate();
	const { user, signOutUser } = usePublicSession();
	const navItems = getNavItems(language);
	const [searchValue, setSearchValue] = useState("");
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	usePageMeta(language, {
		...getRouteMeta(location.pathname, language),
		...noindex ? { noindex: true } : {}
	});
	useEffect(() => {
		if (!mobileNavOpen) return;
		const original = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = original;
		};
	}, [mobileNavOpen]);
	const alternateLanguage = language === "ar" ? "en" : "ar";
	const alternatePath = language === "ar" ? `/en${location.pathname === "/" ? "" : location.pathname}${location.search}` : `${location.pathname.replace(/^\/en/, "") || "/"}${location.search}`;
	useEffect(() => {
		document.documentElement.lang = language;
		document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
		document.body.dir = language === "ar" ? "rtl" : "ltr";
	}, [language]);
	const handleSearchSubmit = (event) => {
		event.preventDefault();
		const query = searchValue.trim();
		const target = buildLocalizedPath(language, "/library");
		navigate(query ? `${target}?q=${encodeURIComponent(query)}` : target);
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "page",
		dir: language === "ar" ? "rtl" : "ltr",
		children: [
			/* @__PURE__ */ jsx("header", {
				className: "header",
				children: /* @__PURE__ */ jsxs("div", {
					className: "container header__inner",
					children: [
						/* @__PURE__ */ jsxs(Link, {
							className: "brand-lockup",
							to: buildLocalizedPath(language, "/"),
							"aria-label": language === "ar" ? "مركز إسناد للدراسات والأبحاث" : "Esnad Center for Studies and Research",
							children: [/* @__PURE__ */ jsx(WireframeDottedGlobe, {
								className: "brand-lockup__globe",
								ariaLabel: language === "ar" ? "كرة أرضية" : "Globe"
							}), /* @__PURE__ */ jsxs("span", {
								className: "brand-lockup__text",
								children: [/* @__PURE__ */ jsx("span", {
									className: "brand-lockup__name",
									children: language === "ar" ? "مركز إسناد" : "Esnad Center"
								}), /* @__PURE__ */ jsx("span", {
									className: "brand-lockup__sub",
									children: language === "ar" ? "للدراسات والأبحاث" : "for Studies and Research"
								})]
							})]
						}),
						/* @__PURE__ */ jsx("nav", {
							className: "nav",
							children: navItems.map((item) => {
								const href = buildLocalizedPath(language, item.path);
								return /* @__PURE__ */ jsx(Link, {
									className: `nav__link${(href === buildLocalizedPath(language, "/") ? location.pathname === href : location.pathname === href || location.pathname.startsWith(`${href}/`)) ? " nav__link--active" : ""}`,
									to: href,
									children: item.label
								}, item.path);
							})
						}),
						/* @__PURE__ */ jsxs("button", {
							className: "header__menu-toggle",
							type: "button",
							"aria-label": language === "ar" ? "القائمة" : "Menu",
							"aria-expanded": mobileNavOpen,
							onClick: () => setMobileNavOpen((v) => !v),
							children: [
								/* @__PURE__ */ jsx("span", {}),
								/* @__PURE__ */ jsx("span", {}),
								/* @__PURE__ */ jsx("span", {})
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "header__actions",
							children: [
								/* @__PURE__ */ jsx("form", {
									className: "header__search",
									onSubmit: handleSearchSubmit,
									children: /* @__PURE__ */ jsx("input", {
										className: "header__search-input",
										type: "search",
										placeholder: language === "ar" ? "بحث..." : "Search...",
										value: searchValue,
										onChange: (e) => setSearchValue(e.target.value)
									})
								}),
								/* @__PURE__ */ jsx("button", {
									className: "header__lang-toggle",
									onClick: () => navigate(alternatePath),
									type: "button",
									children: alternateLanguage.toUpperCase()
								}),
								user ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Link, {
									className: "btn btn--brand btn--sm",
									to: buildLocalizedPath(language, "/dashboard"),
									children: language === "ar" ? "حسابي" : "Account"
								}), /* @__PURE__ */ jsx("button", {
									className: "btn btn--ghost btn--sm",
									onClick: () => void signOutUser(),
									type: "button",
									children: language === "ar" ? "خروج" : "Sign out"
								})] }) : /* @__PURE__ */ jsx(Link, {
									className: "btn btn--brand btn--sm",
									to: buildLocalizedPath(language, "/login"),
									children: language === "ar" ? "دخول" : "Login"
								})
							]
						})
					]
				})
			}),
			mobileNavOpen ? /* @__PURE__ */ jsx("div", {
				className: "mobile-drawer__backdrop",
				onClick: () => setMobileNavOpen(false),
				"aria-hidden": "true"
			}) : null,
			/* @__PURE__ */ jsxs("aside", {
				className: `mobile-drawer${mobileNavOpen ? " mobile-drawer--open" : ""}`,
				"aria-hidden": !mobileNavOpen,
				children: [/* @__PURE__ */ jsx("nav", {
					className: "mobile-drawer__nav",
					children: navItems.map((item) => {
						const href = buildLocalizedPath(language, item.path);
						return /* @__PURE__ */ jsx(Link, {
							className: `mobile-drawer__link${(href === buildLocalizedPath(language, "/") ? location.pathname === href : location.pathname === href || location.pathname.startsWith(`${href}/`)) ? " mobile-drawer__link--active" : ""}`,
							onClick: () => setMobileNavOpen(false),
							to: href,
							children: item.label
						}, item.path);
					})
				}), /* @__PURE__ */ jsxs("div", {
					className: "mobile-drawer__actions",
					children: [/* @__PURE__ */ jsx("button", {
						className: "btn btn--ghost btn--sm",
						type: "button",
						onClick: () => {
							setMobileNavOpen(false);
							navigate(alternatePath);
						},
						children: alternateLanguage.toUpperCase()
					}), user ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Link, {
						className: "btn btn--brand btn--sm",
						to: buildLocalizedPath(language, "/dashboard"),
						children: language === "ar" ? "حسابي" : "Account"
					}), /* @__PURE__ */ jsx("button", {
						className: "btn btn--ghost btn--sm",
						onClick: () => void signOutUser(),
						type: "button",
						children: language === "ar" ? "خروج" : "Sign out"
					})] }) : /* @__PURE__ */ jsx(Link, {
						className: "btn btn--brand btn--sm",
						to: buildLocalizedPath(language, "/login"),
						children: language === "ar" ? "دخول" : "Login"
					})]
				})]
			}),
			/* @__PURE__ */ jsx("main", {
				className: "main",
				children: /* @__PURE__ */ jsx("div", {
					className: "container",
					children
				})
			}),
			/* @__PURE__ */ jsx("footer", {
				className: "footer",
				children: /* @__PURE__ */ jsxs("div", {
					className: "container footer__inner",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "footer__brand",
						children: [/* @__PURE__ */ jsx("strong", { children: language === "ar" ? "إسناد" : "Esnad" }), /* @__PURE__ */ jsx("p", { children: language === "ar" ? "مركز إسناد للدراسات والأبحاث" : "Esnad Center for Studies and Research" })]
					}), /* @__PURE__ */ jsxs("div", {
						className: "footer__links",
						children: [
							/* @__PURE__ */ jsx("a", {
								href: "/feed.xml",
								children: language === "ar" ? "خلاصة الإصدارات" : "RSS feed"
							}),
							/* @__PURE__ */ jsx(Link, {
								to: buildLocalizedPath(language, "/library"),
								children: language === "ar" ? "المكتبة" : "Library"
							}),
							/* @__PURE__ */ jsx(Link, {
								to: buildLocalizedPath(language, "/articles"),
								children: language === "ar" ? "مقالات" : "Articles"
							}),
							/* @__PURE__ */ jsx(Link, {
								to: buildLocalizedPath(language, "/about"),
								children: language === "ar" ? "من نحن" : "About"
							})
						]
					})]
				})
			})
		]
	});
}
//#endregion
//#region src/lib/seoTopics.js
var SEO_TOPICS = {
	studies: {
		title: "دراسات وأبحاث",
		intro: "دراسات مركز إسناد في السياسة والمجتمع والدين والتعليم، مع قراءات تحليلية في القضايا الإقليمية وتحولات المنطقة."
	},
	"opinion-article": {
		title: "مقالات الرأي والتحليل",
		intro: "مقالات رأي وقراءات تحليلية في الشأن اللبناني والعربي والإقليمي، من إصدارات مركز إسناد للدراسات والأبحاث."
	},
	"legal-paper": {
		title: "أوراق ودراسات قانونية",
		intro: "أوراق في القانون الدولي والمسؤولية القانونية ومسارات العدالة، تقدم قراءة بحثية في قضايا لبنان والمنطقة."
	},
	"strategic-estimate": {
		title: "تقديرات استراتيجية",
		intro: "تقديرات بحثية تستعرض الاحتمالات والقدرات والمصالح في القضايا الأمنية والسياسية والتقنية في المنطقة."
	},
	"policy-paper": {
		title: "أوراق سياسية",
		intro: "أوراق سياسية تناقش الخيارات والضغوط والمصالح الإقليمية، وتضع التطورات الراهنة في سياقها البحثي."
	},
	"position-analysis": {
		title: "تحليل المواقف والخطابات",
		intro: "قراءات تحليلية في المواقف والخطابات السياسية، وعلاقتها بالهوية والوعي العام والتحولات الإقليمية."
	},
	documents: {
		title: "وثائق وقراءات تاريخية",
		intro: "وثائق ومواد بحثية وتاريخية تساعد على فهم تاريخ لبنان وشخصياته وسياقاته السياسية والاجتماعية."
	},
	"situation-assessment": {
		title: "تقييم الأوضاع",
		intro: "تقييمات بحثية للتطورات الميدانية والسياسية وتأثيرها في لبنان والمنطقة، من منشورات مركز إسناد."
	},
	"economic-paper": {
		title: "أوراق اقتصادية",
		intro: "أوراق اقتصادية من مركز إسناد تناقش التحولات الاقتصادية والسياسات العامة وآثارها الاجتماعية."
	},
	"analytical-paper": {
		title: "أوراق تحليلية",
		intro: "أوراق تحليلية تدرس القضايا الراهنة وأبعادها السياسية والاجتماعية، ضمن المكتبة البحثية لمركز إسناد."
	},
	reports: {
		title: "تقارير بحثية",
		intro: "تقارير بحثية تجمع المعطيات وتعرض التطورات الراهنة في سياقاتها المحلية والإقليمية."
	},
	"cultural-article": {
		title: "مقالات ثقافية",
		intro: "مقالات ثقافية تتناول الفكر والهوية والمجتمع وعلاقتها بتحولات المجال العام."
	},
	"cultural-paper": {
		title: "أوراق ثقافية",
		intro: "أوراق ثقافية تبحث في قضايا الفكر والثقافة والوعي، من إصدارات مركز إسناد."
	},
	foresight: {
		title: "دراسات استشرافية",
		intro: "دراسات استشرافية تستعرض السيناريوهات المستقبلية والعوامل التي تؤثر في مساراتها."
	},
	"expert-survey": {
		title: "استطلاعات رأي الخبراء",
		intro: "استطلاعات لرأي الخبراء تقدم وجهات نظر بحثية في القضايا السياسية والاجتماعية الراهنة."
	},
	"periodic-reports": {
		title: "تقارير دورية",
		intro: "تقارير دورية تتابع التطورات عبر الزمن وتضعها في إطار بحثي يساعد على المقارنة والفهم."
	},
	"case-monitoring": {
		title: "متابعة الحالات",
		intro: "مواد بحثية تتابع حالات وتطورات محددة وتوثق مساراتها ومعطياتها الأساسية."
	},
	"media-analysis": {
		title: "تحليل إعلامي",
		intro: "تحليلات إعلامية تتناول الخطابات والصور والتغطيات ودورها في تشكيل الرأي العام."
	},
	"policy-analysis": {
		title: "تحليل السياسات",
		intro: "أبحاث في تحليل السياسات وخياراتها ونتائجها وآثارها على المجتمع والمنطقة."
	},
	"psychological-studies": {
		title: "دراسات نفسية",
		intro: "دراسات نفسية في السلوك والقيادة والثقة والوعي ضمن سياقات سياسية واجتماعية متنوعة."
	},
	"analysis-summary": {
		title: "خلاصات تحليلية",
		intro: "خلاصات تحليلية تعرض أبرز الاستنتاجات والقراءات البحثية في القضايا الراهنة."
	},
	"information-file": {
		title: "ملفات معلومات",
		intro: "ملفات معلومات تجمع المعطيات والوثائق المرجعية لدعم القراءة البحثية المتأنية."
	},
	translations: {
		title: "ترجمات بحثية",
		intro: "ترجمات بحثية تتيح للقارئ العربي الاطلاع على قراءات ومصادر من لغات أخرى."
	},
	profile: {
		title: "ملفات الشخصيات",
		intro: "ملفات بحثية عن الشخصيات وسياقاتها التاريخية والسياسية والفكرية."
	},
	concept: {
		title: "مفاهيم بحثية",
		intro: "مواد تعريفية وتحليلية في المفاهيم الأساسية المستخدمة في الدراسات السياسية والاجتماعية."
	},
	infographic: {
		title: "عرض المعلومات بصرياً",
		intro: "مواد تعرض المعلومات والمعطيات البحثية بصورة بصرية تسهّل قراءتها ومقارنتها."
	}
};
//#endregion
//#region src/lib/articleImageAssets.js
var ARTICLE_IMAGE_ASSETS = {
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1779253360/esnad/yvala3gtudaycedcmo9w.jpg": {
		"480": "/assets/article-images/b80f2b7fd6fc-480.webp",
		"640": "/assets/article-images/b80f2b7fd6fc-640.webp",
		"900": "/assets/article-images/b80f2b7fd6fc-900.webp",
		"1200": "/assets/article-images/b80f2b7fd6fc-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1779365160/esnad/rlraumlqtv4oyz21c8xo.jpg": {
		"480": "/assets/article-images/c56e39aa10e5-480.webp",
		"640": "/assets/article-images/c56e39aa10e5-640.webp",
		"900": "/assets/article-images/c56e39aa10e5-900.webp",
		"1200": "/assets/article-images/c56e39aa10e5-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1779488727/esnad/wc4eugk2y9nzce9fffzb.jpg": {
		"480": "/assets/article-images/8201b026bc22-480.webp",
		"640": "/assets/article-images/8201b026bc22-640.webp",
		"900": "/assets/article-images/8201b026bc22-900.webp",
		"1200": "/assets/article-images/8201b026bc22-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1779618505/esnad/sqbms8qyikjzawl3ttj3.webp": {
		"480": "/assets/article-images/5db5e12e0073-480.webp",
		"640": "/assets/article-images/5db5e12e0073-640.webp",
		"900": "/assets/article-images/5db5e12e0073-900.webp",
		"1200": "/assets/article-images/5db5e12e0073-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1779891010/esnad/ppwatrixfnlevietnta1.png": {
		"480": "/assets/article-images/42df03a9afa8-480.webp",
		"640": "/assets/article-images/42df03a9afa8-640.webp",
		"900": "/assets/article-images/42df03a9afa8-900.webp",
		"1200": "/assets/article-images/42df03a9afa8-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1780065094/esnad/r5wlo8soge4rlbjb8t15.webp": {
		"480": "/assets/article-images/4e3c58389c21-480.webp",
		"640": "/assets/article-images/4e3c58389c21-640.webp",
		"900": "/assets/article-images/4e3c58389c21-900.webp",
		"1200": "/assets/article-images/4e3c58389c21-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1780338289/esnad/cjtue9sn0fv7xdn4rojw.png": {
		"480": "/assets/article-images/93cf80cbae0d-480.webp",
		"640": "/assets/article-images/93cf80cbae0d-640.webp",
		"900": "/assets/article-images/93cf80cbae0d-900.webp",
		"1200": "/assets/article-images/93cf80cbae0d-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1780943956/esnad/khwbdol8emo2svbneinz.png": {
		"480": "/assets/article-images/24addc54da88-480.webp",
		"640": "/assets/article-images/24addc54da88-640.webp",
		"900": "/assets/article-images/24addc54da88-900.webp",
		"1200": "/assets/article-images/24addc54da88-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1781528507/esnad/ecrog52s3joaskvq20zw.jpg": {
		"480": "/assets/article-images/b8aec4478b91-480.webp",
		"640": "/assets/article-images/b8aec4478b91-640.webp",
		"900": "/assets/article-images/b8aec4478b91-900.webp",
		"1200": "/assets/article-images/b8aec4478b91-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1785502567/esnad/sfb0lhetizxd9kqp6ppl.webp": {
		"480": "/assets/article-images/cdc7d817b213-480.webp",
		"640": "/assets/article-images/cdc7d817b213-640.webp",
		"900": "/assets/article-images/cdc7d817b213-900.webp",
		"1200": "/assets/article-images/cdc7d817b213-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1785503269/esnad/uslv9f0g4sflzfcqiqll.jpg": {
		"480": "/assets/article-images/8743bc1fdacb-480.webp",
		"640": "/assets/article-images/8743bc1fdacb-640.webp",
		"900": "/assets/article-images/8743bc1fdacb-900.webp",
		"1200": "/assets/article-images/8743bc1fdacb-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1785506807/esnad/zkjfunk24ohkk3exkrqa.jpg": {
		"480": "/assets/article-images/504d9902d597-480.webp",
		"640": "/assets/article-images/504d9902d597-640.webp",
		"900": "/assets/article-images/504d9902d597-900.webp",
		"1200": "/assets/article-images/504d9902d597-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1785508189/esnad/jrlta0kg1ymujnkvixia.jpg": {
		"480": "/assets/article-images/dc2b80130c9f-480.webp",
		"640": "/assets/article-images/dc2b80130c9f-640.webp",
		"900": "/assets/article-images/dc2b80130c9f-900.webp",
		"1200": "/assets/article-images/dc2b80130c9f-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1786960384/esnad/fzgnhgmyaq11uxwc6b3s.jpg": {
		"480": "/assets/article-images/ccebe2ca1858-480.webp",
		"640": "/assets/article-images/ccebe2ca1858-640.webp",
		"900": "/assets/article-images/ccebe2ca1858-900.webp",
		"1200": "/assets/article-images/ccebe2ca1858-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1786960408/esnad/yk8zu0rzr5o3r17azkqw.jpg": {
		"480": "/assets/article-images/e80cf95998a4-480.webp",
		"640": "/assets/article-images/e80cf95998a4-640.webp",
		"900": "/assets/article-images/e80cf95998a4-900.webp",
		"1200": "/assets/article-images/e80cf95998a4-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1786960982/esnad/acvohrl11xglfbqahza3.jpg": {
		"480": "/assets/article-images/d286058c8008-480.webp",
		"640": "/assets/article-images/d286058c8008-640.webp",
		"900": "/assets/article-images/d286058c8008-900.webp",
		"1200": "/assets/article-images/d286058c8008-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1790078668/esnad/nbrrrcph4kgxezi4vpkb.jpg": {
		"480": "/assets/article-images/dbf51ecd1901-480.webp",
		"640": "/assets/article-images/dbf51ecd1901-640.webp",
		"900": "/assets/article-images/dbf51ecd1901-900.webp",
		"1200": "/assets/article-images/dbf51ecd1901-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1790078871/esnad/q6ubhdqrkptqryveyecs.jpg": {
		"480": "/assets/article-images/693e749eea92-480.webp",
		"640": "/assets/article-images/693e749eea92-640.webp",
		"900": "/assets/article-images/693e749eea92-900.webp",
		"1200": "/assets/article-images/693e749eea92-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1790080843/esnad/bshohgf8ggcltzyyerxz.jpg": {
		"480": "/assets/article-images/e1350a508f8b-480.webp",
		"640": "/assets/article-images/e1350a508f8b-640.webp",
		"900": "/assets/article-images/e1350a508f8b-900.webp",
		"1200": "/assets/article-images/e1350a508f8b-1200.webp"
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1790080853/esnad/m8bvupmziyi163mjjofe.jpg": {
		"480": "/assets/article-images/d909335b9d67-480.webp",
		"640": "/assets/article-images/d909335b9d67-640.webp",
		"900": "/assets/article-images/d909335b9d67-900.webp",
		"1200": "/assets/article-images/d909335b9d67-1200.webp"
	}
};
//#endregion
//#region src/lib/articleImageDimensions.js
var ARTICLE_IMAGE_DIMENSIONS = {
	"https://media.al-akhbar.com/store/archive/image/2025/9/2/bb9a2c92-1e36-4ec2-81ad-526dd7e1be6a.jpg?width=1000": {
		"width": 1e3,
		"height": 1461
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1779253360/esnad/yvala3gtudaycedcmo9w.jpg": {
		"width": 1024,
		"height": 559
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1779365160/esnad/rlraumlqtv4oyz21c8xo.jpg": {
		"width": 1288,
		"height": 768
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1779488727/esnad/wc4eugk2y9nzce9fffzb.jpg": {
		"width": 533,
		"height": 559
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1779618505/esnad/sqbms8qyikjzawl3ttj3.webp": {
		"width": 1078,
		"height": 636
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1779891010/esnad/ppwatrixfnlevietnta1.png": {
		"width": 1024,
		"height": 757
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1780065094/esnad/r5wlo8soge4rlbjb8t15.webp": {
		"width": 1500,
		"height": 1e3
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1780338289/esnad/cjtue9sn0fv7xdn4rojw.png": {
		"width": 1408,
		"height": 768
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1780943956/esnad/khwbdol8emo2svbneinz.png": {
		"width": 1408,
		"height": 718
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1781528507/esnad/ecrog52s3joaskvq20zw.jpg": {
		"width": 1024,
		"height": 572
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1785502567/esnad/sfb0lhetizxd9kqp6ppl.webp": {
		"width": 1500,
		"height": 1e3
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1785503269/esnad/uslv9f0g4sflzfcqiqll.jpg": {
		"width": 448,
		"height": 446
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1785506807/esnad/zkjfunk24ohkk3exkrqa.jpg": {
		"width": 187,
		"height": 190
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1785508189/esnad/jrlta0kg1ymujnkvixia.jpg": {
		"width": 642,
		"height": 535
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1786960384/esnad/fzgnhgmyaq11uxwc6b3s.jpg": {
		"width": 800,
		"height": 450
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1786960761/esnad/x4cokphd07soldppeowd.jpg": {
		"width": 624,
		"height": 383
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1786960818/esnad/avmqfvoghbbayyxs1q0y.jpg": {
		"width": 624,
		"height": 383
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1786960982/esnad/acvohrl11xglfbqahza3.jpg": {
		"width": 728,
		"height": 707
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1790078871/esnad/q6ubhdqrkptqryveyecs.jpg": {
		"width": 1081,
		"height": 1455
	},
	"https://res.cloudinary.com/di3atf0hx/image/upload/f_auto,q_auto,w_2400,c_limit/v1790080843/esnad/bshohgf8ggcltzyyerxz.jpg": {
		"width": 1081,
		"height": 1455
	}
};
//#endregion
//#region src/lib/articleImages.js
function priorityArticleImage(content) {
	const find = (node) => {
		if (node?.type === "image" || node?.type === "figure") return String(node.attrs?.src || "");
		for (const child of node?.content || []) {
			const image = find(child);
			if (image) return image;
		}
		return "";
	};
	for (const node of content?.content?.slice(0, 2) || []) {
		const image = find(node);
		if (image) return image;
	}
	return "";
}
function articleImageUrl(src, priority = false, requestedWidth) {
	if (!/res\.cloudinary\.com\/.+?\/image\/upload\//.test(src)) return src;
	const width = requestedWidth || (priority ? 900 : 1200);
	if (ARTICLE_IMAGE_ASSETS[src]?.[width]) return ARTICLE_IMAGE_ASSETS[src][width];
	return /\/image\/upload\/[^/]*[fq]_[^/]*\//.test(src) ? src.replace(/\/image\/upload\/([^/]+)\//, `/image/upload/$1/w_${width},c_limit/`) : src.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
}
var ARTICLE_IMAGE_SIZES = "(max-width: 800px) calc(100vw - 106px), 800px";
function articleImageSrcSet(src) {
	return /res\.cloudinary\.com\/.+?\/image\/upload\//.test(src) ? [
		480,
		640,
		900,
		1200
	].map((width) => `${articleImageUrl(src, true, width)} ${width}w`).join(", ") : "";
}
function articleImageSize(src) {
	return ARTICLE_IMAGE_DIMENSIONS[src] || {
		width: 1200,
		height: 675
	};
}
//#endregion
//#region src/lib/initialPageHtml.js
var escapeHtml = (value) => String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#39;");
function displayImage(pub, width) {
	const image = getPublicationImage(pub);
	if (ARTICLE_IMAGE_ASSETS[image]) return ARTICLE_IMAGE_ASSETS[image][width] || ARTICLE_IMAGE_ASSETS[image][900];
	if (!/res\.cloudinary\.com\/.+?\/image\/upload\//.test(image)) return image;
	return /\/image\/upload\/[^/]*[fq]_[^/]*\//.test(image) ? image.replace(/\/image\/upload\/([^/]+)\//, `/image/upload/$1/w_${width},c_limit/`) : image.replace("/image/upload/", `/image/upload/f_auto,q_auto,w_${width},c_limit/`);
}
var categoryLabels = {
	studies: "دراسات",
	"opinion-article": "مقالات رأي",
	"legal-paper": "ورقة قانونية",
	"strategic-estimate": "تقدير موقف",
	"policy-paper": "ورقة سياسية",
	"position-analysis": "تحليل موقف",
	documents: "وثائق",
	"situation-assessment": "تقييم وضعية"
};
function imagePosition(pub) {
	return `${Number.isFinite(Number(pub.cover_position_x)) ? Number(pub.cover_position_x) : 50}% ${Number.isFinite(Number(pub.cover_position_y)) ? Number(pub.cover_position_y) : 50}%`;
}
function homeHeroInnerHtml(pub, language = "ar") {
	const ar = language === "ar", prefix = ar ? "" : "/en";
	const title = pub ? ar ? pub.title_ar : pub.title_en || pub.title_ar : "";
	return `<div class="home-hero__copy"><span class="home-badge">${ar ? SEO_SITE_NAME : "Esnad Center for Studies and Research"}</span><h1 class="home-hero__title">${ar ? "مكتبة بحثية عربية للدراسات والأوراق والكتب" : "An Arabic research library for studies, papers, and books"}</h1><p class="home-hero__sub">${ar ? "منصة متخصصة في نشر وأرشفة وبيع الإصدارات البحثية. تجمع بين الوصول المفتوح والمحتوى المدفوع في تجربة تصفح نظيفة ومركزة." : "A specialized platform for publishing, archiving, and selling research publications."}</p><div class="home-hero__actions"><a class="btn btn--brand" href="${prefix}/library">${ar ? "تصفح المكتبة" : "Browse library"}</a><a class="btn btn--brand-outline" href="${prefix}/articles">${ar ? "استكشف المقالات" : "Explore articles"}</a></div></div>${pub ? `<a class="home-hero__card" href="${prefix}${publicationPath(pub)}"><div class="home-hero__card-media">${getPublicationImage(pub) ? `<img alt="${escapeHtml(pub.title_ar)}" src="${escapeHtml(displayImage(pub, 800))}" srcset="${escapeHtml(articleImageSrcSet(getPublicationImage(pub)))}" sizes="(max-width: 800px) calc(100vw - 58px), 480px" width="800" height="450" decoding="async" fetchpriority="high" style="object-position:${imagePosition(pub)}"/>` : "<div class=\"home-hero__card-media-placeholder\"></div>"}</div><div class="home-hero__card-body"><span class="home-tag">${escapeHtml(categoryLabels[pub.category] || SEO_TOPICS[pub.category]?.title || pub.category)}</span><h2 class="home-hero__card-title">${escapeHtml(title)}</h2></div></a>` : "<div class=\"home-hero__card home-hero__card--empty\"></div>"}`;
}
//#endregion
//#region src/components/public/HomeHero.tsx
function HomeHero({ publication, language }) {
	return /* @__PURE__ */ jsx("section", {
		className: "home-hero",
		dangerouslySetInnerHTML: { __html: homeHeroInnerHtml(publication, language) }
	});
}
//#endregion
//#region src/pages/public/ResearchHomePage.tsx
function formatNumber(value, language) {
	return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-AU").format(value);
}
function getStatsLabels(language) {
	return {
		publications: language === "ar" ? "إصدار منشور" : "Publications",
		authors: language === "ar" ? "باحث ومؤلف" : "Researchers",
		years: language === "ar" ? "سنة من الخبرة" : "Years of work",
		categories: language === "ar" ? "تصنيفاً بحثياً" : "Research categories"
	};
}
function computeStats(items, language) {
	const publicationsCount = items.length;
	const authors = /* @__PURE__ */ new Set();
	for (const item of items) {
		const a = (item.author_ar || item.author_en || "").trim();
		if (a) authors.add(a);
	}
	let earliestYear = (/* @__PURE__ */ new Date()).getFullYear();
	for (const item of items) {
		const stamp = item.published_at || item.created_at;
		if (!stamp) continue;
		const year = new Date(stamp).getFullYear();
		if (Number.isFinite(year) && year > 1900 && year < earliestYear) earliestYear = year;
	}
	const yearsActive = Math.max(1, (/* @__PURE__ */ new Date()).getFullYear() - earliestYear + 1);
	const usedCategories = /* @__PURE__ */ new Set();
	for (const item of items) if (item.category) usedCategories.add(item.category);
	return {
		publications: formatNumber(publicationsCount, language),
		authors: formatNumber(authors.size, language),
		years: formatNumber(yearsActive, language),
		categories: formatNumber(usedCategories.size, language)
	};
}
function ResearchHomePage({ language, initialPublications }) {
	const [items, setItems] = useState(() => initialPublications || (typeof document !== "undefined" ? JSON.parse(document.getElementById("initial-catalog-data")?.textContent || "[]") : []));
	const [activeCategory, setActiveCategory] = useState("all");
	const [email, setEmail] = useState("");
	const [newsletterStatus, setNewsletterStatus] = useState("idle");
	useEffect(() => {
		listPublications({ kind: "all" }).then(setItems).catch(() => setItems([]));
	}, []);
	const stats = useMemo(() => computeStats(items, language), [items, language]);
	const heroFeature = useMemo(() => items.find((item) => item.featured) ?? items[0], [items]);
	const spotlight = useMemo(() => items.find((item) => item.featured) ?? items[0], [items]);
	const latest = useMemo(() => items.slice(0, 4), [items]);
	const filteredCategories = useMemo(() => PUBLICATION_CATEGORIES.filter((category) => Boolean(SEO_TOPICS[category.id]) && items.some((item) => item.category === category.id)), [items]);
	const statsLabels = getStatsLabels(language);
	const handleNewsletter = async (event) => {
		event.preventDefault();
		const value = email.trim();
		if (!value) return;
		setNewsletterStatus("submitting");
		try {
			if (!(await fetch("/api/subscribe", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email: value,
					language
				})
			})).ok) throw new Error("subscribe request failed");
			setNewsletterStatus("success");
			setEmail("");
		} catch {
			setNewsletterStatus("error");
		}
	};
	return /* @__PURE__ */ jsxs(PublicSiteShell, {
		language,
		children: [
			/* @__PURE__ */ jsx(HomeHero, {
				publication: heroFeature,
				language
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "categories-strip",
				"aria-label": language === "ar" ? "التصنيفات" : "Categories",
				children: [/* @__PURE__ */ jsx(Link, {
					className: `category-pill${activeCategory === "all" ? " category-pill--active" : ""}`,
					to: buildLocalizedPath(language, "/library"),
					onClick: () => setActiveCategory("all"),
					children: language === "ar" ? "الكل" : "All"
				}), filteredCategories.map((category) => /* @__PURE__ */ jsx(Link, {
					className: `category-pill${activeCategory === category.id ? " category-pill--active" : ""}`,
					to: `/topics/${category.id}`,
					onClick: () => setActiveCategory(category.id),
					children: getPublicationCategoryLabel(category.id, language)
				}, category.id))]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "home-section",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "home-section__head",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "home-section__title",
						children: language === "ar" ? "أحدث الإصدارات" : "Latest releases"
					}), /* @__PURE__ */ jsx(Link, {
						className: "home-section__link",
						to: buildLocalizedPath(language, "/library"),
						children: language === "ar" ? "عرض الكل ←" : "View all →"
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "latest-grid",
					children: latest.map((publication) => /* @__PURE__ */ jsxs(Link, {
						className: "latest-card",
						to: buildPublicationPath(publication, language),
						children: [/* @__PURE__ */ jsx("div", {
							className: "latest-card__media",
							children: getPublicationImage(publication) ? /* @__PURE__ */ jsx("img", {
								width: "800",
								height: "450",
								alt: getPublicationTitle(publication, language),
								src: displayImage(publication, 800),
								srcSet: articleImageSrcSet(getPublicationImage(publication)),
								sizes: "(max-width: 800px) calc(100vw - 58px), 360px",
								loading: "lazy",
								decoding: "async",
								style: { objectPosition: getCoverObjectPosition(publication) }
							}) : /* @__PURE__ */ jsx("div", { className: "latest-card__media-placeholder" })
						}), /* @__PURE__ */ jsxs("div", {
							className: "latest-card__body",
							children: [/* @__PURE__ */ jsx("span", {
								className: "home-tag",
								children: getPublicationCategoryLabel(publication.category, language)
							}), /* @__PURE__ */ jsx("h3", {
								className: "latest-card__title",
								children: getPublicationTitle(publication, language)
							})]
						})]
					}, publication.id))
				})]
			}),
			spotlight ? /* @__PURE__ */ jsx("section", {
				className: "spotlight-band",
				children: /* @__PURE__ */ jsxs("div", {
					className: "container spotlight-band__inner",
					children: [/* @__PURE__ */ jsx("div", {
						className: "spotlight-band__media",
						children: getPublicationImage(spotlight) ? /* @__PURE__ */ jsx("img", {
							width: "1200",
							height: "675",
							alt: getPublicationTitle(spotlight, language),
							src: displayImage(spotlight, 1200),
							srcSet: articleImageSrcSet(getPublicationImage(spotlight)),
							sizes: "(max-width: 800px) calc(100vw - 58px), 600px",
							loading: "lazy",
							decoding: "async",
							style: { objectPosition: getCoverObjectPosition(spotlight) }
						}) : null
					}), /* @__PURE__ */ jsxs("div", {
						className: "spotlight-band__copy",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "spotlight-band__eyebrow",
								children: language === "ar" ? "مختارات المركز" : "Featured spotlight"
							}),
							/* @__PURE__ */ jsx("h2", {
								className: "spotlight-band__title",
								children: getPublicationTitle(spotlight, language)
							}),
							/* @__PURE__ */ jsx("p", {
								className: "spotlight-band__excerpt",
								children: getPublicationAbstract(spotlight, language) || (language === "ar" ? "إصدار مميز من سلسلة دراسات وأوراق المركز." : "A featured release from the center.")
							}),
							/* @__PURE__ */ jsx(Link, {
								className: "btn btn--brand",
								to: buildPublicationPath(spotlight, language),
								children: language === "ar" ? "اقرأ الإصدار" : "Read publication"
							})
						]
					})]
				})
			}) : null,
			/* @__PURE__ */ jsxs("section", {
				className: "stats-band",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "stat-block",
						children: [/* @__PURE__ */ jsx("span", {
							className: "stat-number",
							children: stats.publications
						}), /* @__PURE__ */ jsx("span", {
							className: "stat-label",
							children: statsLabels.publications
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "stat-block",
						children: [/* @__PURE__ */ jsx("span", {
							className: "stat-number",
							children: stats.authors
						}), /* @__PURE__ */ jsx("span", {
							className: "stat-label",
							children: statsLabels.authors
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "stat-block",
						children: [/* @__PURE__ */ jsx("span", {
							className: "stat-number",
							children: stats.years
						}), /* @__PURE__ */ jsx("span", {
							className: "stat-label",
							children: statsLabels.years
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "stat-block",
						children: [/* @__PURE__ */ jsx("span", {
							className: "stat-number",
							children: stats.categories
						}), /* @__PURE__ */ jsx("span", {
							className: "stat-label",
							children: statsLabels.categories
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "newsletter-strip",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "newsletter-strip__title",
						children: language === "ar" ? "اشتراك مجاني" : "Free subscription"
					}),
					/* @__PURE__ */ jsx("p", {
						className: "newsletter-strip__sub",
						children: language === "ar" ? "احصل على أحدث الإصدارات والتقارير مباشرة إلى بريدك." : "Receive the latest releases and reports straight to your inbox."
					}),
					/* @__PURE__ */ jsxs("form", {
						className: "newsletter-strip__form",
						onSubmit: handleNewsletter,
						children: [/* @__PURE__ */ jsx("input", {
							className: "newsletter-strip__input",
							type: "email",
							required: true,
							value: email,
							onChange: (event) => setEmail(event.target.value),
							placeholder: language === "ar" ? "بريدك الإلكتروني" : "Your email"
						}), /* @__PURE__ */ jsx("button", {
							className: "btn btn--brand",
							type: "submit",
							disabled: newsletterStatus === "submitting",
							children: language === "ar" ? "اشترك" : "Subscribe"
						})]
					}),
					newsletterStatus === "success" ? /* @__PURE__ */ jsx("p", {
						className: "newsletter-strip__feedback newsletter-strip__feedback--ok",
						children: language === "ar" ? "تم الاشتراك بنجاح." : "Subscribed successfully."
					}) : null,
					newsletterStatus === "error" ? /* @__PURE__ */ jsx("p", {
						className: "newsletter-strip__feedback newsletter-strip__feedback--err",
						children: language === "ar" ? "تعذر إتمام الاشتراك. حاول لاحقاً." : "Subscription failed. Try again."
					}) : null
				]
			})
		]
	});
}
//#endregion
//#region src/lib/cloudinary.ts
function sanitizeEnvValue(value) {
	const normalized = value?.trim() ?? "";
	if (!normalized) return "";
	const lowered = normalized.toLowerCase();
	return [
		"your-",
		"your_",
		"placeholder",
		"example",
		"changeme",
		"<",
		"cloud_name",
		"upload_preset"
	].some((fragment) => lowered.includes(fragment)) ? "" : normalized;
}
sanitizeEnvValue("di3atf0hx");
sanitizeEnvValue("ablecare_docs");
sanitizeEnvValue("esnad");
function optimizeCloudinaryUrl(url, options = {}) {
	if (!url) return "";
	if (!/res\.cloudinary\.com\/.+?\/image\/upload\//.test(url)) return url;
	const width = options.width && Number.isFinite(options.width) ? Math.round(options.width) : null;
	if (/\/image\/upload\/[^/]*[fq]_[^/]*\//.test(url)) {
		if (!width) return url;
		return url.replace(/\/image\/upload\/([^/]+)\//, `/image/upload/$1/w_${width},c_limit/`);
	}
	const parts = ["f_auto", "q_auto"];
	if (width) parts.push(`w_${width}`, "c_limit");
	return url.replace("/image/upload/", `/image/upload/${parts.join(",")}/`);
}
//#endregion
//#region src/components/public/PublicationCard.tsx
function getPublicationPath(publication, language) {
	return `${language === "en" ? "/en" : ""}/${publication.kind === "book" ? "books" : "library"}/${getShareSlug(publication)}`;
}
function PublicationCard({ publication, language }) {
	const publishedDate = new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-AU", {
		dateStyle: "medium",
		timeZone: "UTC"
	}).format(new Date(publication.published_at));
	return /* @__PURE__ */ jsx("article", {
		className: "card",
		children: /* @__PURE__ */ jsxs(Link, {
			className: "card__link",
			to: getPublicationPath(publication, language),
			children: [/* @__PURE__ */ jsx("div", {
				className: "card__media",
				children: getPublicationImage(publication) ? /* @__PURE__ */ jsx("img", {
					alt: getPublicationTitle(publication, language),
					src: optimizeCloudinaryUrl(getPublicationImage(publication), { width: 800 }),
					loading: "lazy",
					width: "800",
					height: "450",
					decoding: "async",
					style: { objectPosition: getCoverObjectPosition(publication) }
				}) : /* @__PURE__ */ jsx("div", {
					style: {
						aspectRatio: "16 / 10",
						background: "var(--bg-subtle)",
						display: "grid",
						placeItems: "center",
						color: "var(--text-muted)",
						fontSize: "14px",
						fontWeight: 600
					},
					children: language === "ar" ? "إسناد" : "Esnad"
				})
			}), /* @__PURE__ */ jsxs("div", {
				className: "card__body",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "card__meta",
						children: [/* @__PURE__ */ jsx("span", { children: getPublicationAuthor(publication, language) }), /* @__PURE__ */ jsx("span", { children: publishedDate })]
					}),
					/* @__PURE__ */ jsx("h3", {
						className: "card__title",
						children: getPublicationHeadline(publication, language)
					}),
					/* @__PURE__ */ jsx("p", {
						className: "card__text",
						children: getPublicationAbstract(publication, language)
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "card__meta",
						children: [/* @__PURE__ */ jsx("span", {
							className: "badge badge--accent",
							children: getPublicationCategoryLabel(publication.category, language)
						}), /* @__PURE__ */ jsx("span", {
							className: "badge badge--neutral",
							children: publication.access_tier === "free" ? language === "ar" ? "مجاني" : "Free" : formatCurrency(publication.price_aud, language)
						})]
					})
				]
			})]
		})
	});
}
//#endregion
//#region src/lib/payments.ts
async function createCheckoutSession(publicationId, token, language) {
	const response = await fetch("/api/checkout-session", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			publicationId,
			language
		})
	});
	const payload = await response.json().catch(() => null);
	if (!response.ok) throw new Error(payload?.error || "تعذر بدء عملية الشراء حالياً.");
	return payload;
}
async function downloadPurchasedPublicationPdf(publicationId, token) {
	const response = await fetch("/api/publication-download", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ publicationId })
	});
	if (!response.ok) {
		const payload = await response.json().catch(() => null);
		throw new Error(payload?.error || "تعذر تنزيل ملف PDF.");
	}
	return response.blob();
}
//#endregion
//#region src/reader/lib/render-pm-json.tsx
function renderEquation(expression, displayMode) {
	try {
		return /* @__PURE__ */ jsx("span", { dangerouslySetInnerHTML: { __html: katex.renderToString(expression, {
			throwOnError: false,
			displayMode
		}) } });
	} catch {
		return /* @__PURE__ */ jsx("span", { children: expression });
	}
}
function renderMarks(text, marks) {
	if (!marks || marks.length === 0) return text;
	return marks.reduce((children, mark) => {
		switch (mark.type) {
			case "bold": return /* @__PURE__ */ jsx("strong", { children }, mark.type);
			case "italic": return /* @__PURE__ */ jsx("em", { children }, mark.type);
			case "underline": return /* @__PURE__ */ jsx("u", { children }, mark.type);
			case "strike": return /* @__PURE__ */ jsx("s", { children }, mark.type);
			case "subscript": return /* @__PURE__ */ jsx("sub", { children }, mark.type);
			case "superscript": return /* @__PURE__ */ jsx("sup", { children }, mark.type);
			case "highlight": {
				const color = mark.attrs?.color;
				return /* @__PURE__ */ jsx("mark", {
					style: typeof color === "string" && color ? { background: color } : void 0,
					children
				}, mark.type);
			}
			case "textStyle": {
				const style = {};
				const fontFamily = mark.attrs?.fontFamily;
				const fontSize = mark.attrs?.fontSize;
				const color = mark.attrs?.color;
				if (typeof fontFamily === "string" && fontFamily) style.fontFamily = fontFamily;
				if (typeof fontSize === "string" && fontSize) style.fontSize = fontSize;
				if (typeof color === "string" && color) style.color = color;
				if (Object.keys(style).length === 0) return children;
				return /* @__PURE__ */ jsx("span", {
					style,
					children
				}, mark.type);
			}
			case "code": return /* @__PURE__ */ jsx("code", { children }, mark.type);
			case "link": return /* @__PURE__ */ jsx("a", {
				href: String(mark.attrs?.href || "#"),
				target: "_blank",
				rel: "noreferrer",
				children
			}, mark.type);
			default: return children;
		}
	}, text);
}
function renderNode(node, index, priorityImage = "") {
	const imageSrc = String(node.attrs?.src || "");
	const priority = Boolean(imageSrc && imageSrc === priorityImage);
	const dimensions = articleImageSize(imageSrc);
	switch (node.type) {
		case "text": return /* @__PURE__ */ jsx("span", { children: renderMarks(node.text || "", node.marks) }, index);
		case "paragraph": return /* @__PURE__ */ jsx("p", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }, index);
		case "heading": switch (node.attrs?.level) {
			case 1: return /* @__PURE__ */ jsx("h2", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }, index);
			case 2: return /* @__PURE__ */ jsx("h2", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }, index);
			case 3: return /* @__PURE__ */ jsx("h3", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }, index);
			case 4: return /* @__PURE__ */ jsx("h4", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }, index);
			default: return /* @__PURE__ */ jsx("h2", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }, index);
		}
		case "bulletList": return /* @__PURE__ */ jsx("ul", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }, index);
		case "orderedList": return /* @__PURE__ */ jsx("ol", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }, index);
		case "listItem": return /* @__PURE__ */ jsx("li", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }, index);
		case "blockquote": return /* @__PURE__ */ jsx("blockquote", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }, index);
		case "codeBlock": return /* @__PURE__ */ jsx("pre", { children: /* @__PURE__ */ jsx("code", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }) }, index);
		case "image": return /* @__PURE__ */ jsx("img", {
			src: articleImageUrl(imageSrc, priority),
			srcSet: priority ? articleImageSrcSet(imageSrc) || void 0 : void 0,
			sizes: priority && articleImageSrcSet(imageSrc) ? ARTICLE_IMAGE_SIZES : void 0,
			alt: /[\u0600-\u06ff]/.test(String(node.attrs?.alt || "")) ? String(node.attrs?.alt) : "صورة توضيحية ضمن المقال",
			loading: priority ? "eager" : "lazy",
			fetchPriority: priority ? "high" : void 0,
			width: dimensions.width,
			height: dimensions.height,
			decoding: "async",
			style: {
				maxWidth: "100%",
				height: "auto",
				borderRadius: 8,
				margin: "1em 0"
			}
		}, index);
		case "hardBreak": return /* @__PURE__ */ jsx("br", {}, index);
		case "table": return /* @__PURE__ */ jsx("table", {
			style: {
				width: "100%",
				borderCollapse: "collapse",
				margin: "1em 0"
			},
			children: /* @__PURE__ */ jsx("tbody", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) })
		}, index);
		case "tableRow": return /* @__PURE__ */ jsx("tr", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }, index);
		case "tableHeader": return /* @__PURE__ */ jsx("th", {
			style: {
				border: "1px solid #e5e5e5",
				padding: "10px 12px",
				background: "#f7f7f5"
			},
			children: node.content?.map((n, i) => renderNode(n, i, priorityImage))
		}, index);
		case "tableCell": return /* @__PURE__ */ jsx("td", {
			style: {
				border: "1px solid #e5e5e5",
				padding: "10px 12px"
			},
			children: node.content?.map((n, i) => renderNode(n, i, priorityImage))
		}, index);
		case "equation": return /* @__PURE__ */ jsx("span", {
			style: {
				display: node.attrs?.displayMode ? "block" : "inline",
				textAlign: node.attrs?.displayMode ? "center" : "inherit",
				margin: node.attrs?.displayMode ? "1em 0" : "0 4px"
			},
			children: renderEquation(String(node.attrs?.expression || ""), Boolean(node.attrs?.displayMode))
		}, index);
		case "figure": return /* @__PURE__ */ jsxs("figure", {
			style: {
				margin: "1.2em 0",
				textAlign: "center"
			},
			children: [/* @__PURE__ */ jsx("img", {
				src: articleImageUrl(imageSrc, priority),
				srcSet: priority ? articleImageSrcSet(imageSrc) || void 0 : void 0,
				sizes: priority && articleImageSrcSet(imageSrc) ? ARTICLE_IMAGE_SIZES : void 0,
				alt: /[\u0600-\u06ff]/.test(String(node.attrs?.alt || "")) ? String(node.attrs?.alt) : String(node.attrs?.caption || "صورة توضيحية ضمن المقال"),
				loading: priority ? "eager" : "lazy",
				fetchPriority: priority ? "high" : void 0,
				width: dimensions.width,
				height: dimensions.height,
				decoding: "async",
				style: {
					maxWidth: "100%",
					height: "auto",
					borderRadius: 8
				}
			}), node.attrs?.caption ? /* @__PURE__ */ jsx("figcaption", {
				style: {
					marginTop: 8,
					fontSize: 14,
					color: "var(--text-muted)"
				},
				children: String(node.attrs.caption)
			}) : null]
		}, index);
		case "citation": return /* @__PURE__ */ jsxs("sup", {
			style: {
				color: "var(--accent)",
				fontWeight: 600,
				margin: "0 2px"
			},
			children: [
				"[",
				String(node.attrs?.text || ""),
				"]"
			]
		}, index);
		case "footnote": return /* @__PURE__ */ jsxs("div", {
			style: {
				display: "flex",
				gap: 10,
				alignItems: "flex-start",
				padding: "12px 14px",
				background: "var(--bg-subtle)",
				borderRadius: 8,
				margin: "1em 0"
			},
			children: [/* @__PURE__ */ jsx("sup", {
				style: {
					fontWeight: 700,
					color: "var(--accent)"
				},
				children: String(node.attrs?.id || "")
			}), /* @__PURE__ */ jsx("span", {
				style: {
					flex: 1,
					fontSize: 14
				},
				children: String(node.attrs?.content || "")
			})]
		}, index);
		default: return /* @__PURE__ */ jsx("div", { children: node.content?.map((n, i) => renderNode(n, i, priorityImage)) }, index);
	}
}
function renderPmJson(content) {
	if (!content) return null;
	const doc = content;
	if (!doc.content) return null;
	const priorityImage = priorityArticleImage(doc);
	return /* @__PURE__ */ jsx(Fragment, { children: doc.content.map((node, index) => renderNode(node, index, priorityImage)) });
}
//#endregion
//#region src/lib/siteLinks.ts
function normalizeUrl(value) {
	return value?.trim().replace(/\/+$/, "") ?? "";
}
function joinPath(baseUrl, path) {
	if (!baseUrl) return "";
	if (!path || path === "/") return baseUrl;
	return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
function runtimeOrigin() {
	if (typeof window !== "undefined" && window.location?.origin) return normalizeUrl(window.location.origin);
	return "";
}
var publicSiteUrl = normalizeUrl(void 0);
normalizeUrl(void 0);
function getPublicSiteUrl(path = "/") {
	return joinPath(publicSiteUrl || runtimeOrigin() || "https://esnads.net", path);
}
//#endregion
//#region src/hooks/useArticleStructuredData.ts
function useArticleStructuredData(publication) {
	useEffect(() => {
		if (!publication || publication.kind === "book") return;
		const data = createArticleStructuredData(publication, {
			url: `${SEO_SITE_URL}/library/${getShareSlug(publication)}`,
			image: publication.cover_image ? optimizeCloudinaryUrl(publication.cover_image, { width: 1200 }) : ""
		});
		let script = document.getElementById("publication-jsonld");
		if (!script) {
			script = document.createElement("script");
			script.id = "publication-jsonld";
			script.type = "application/ld+json";
			document.head.appendChild(script);
		}
		script.textContent = serializeStructuredData(data);
		let breadcrumb = document.getElementById("publication-breadcrumb-jsonld");
		if (!breadcrumb) {
			breadcrumb = document.createElement("script");
			breadcrumb.id = "publication-breadcrumb-jsonld";
			breadcrumb.type = "application/ld+json";
			document.head.appendChild(breadcrumb);
		}
		breadcrumb.textContent = serializeStructuredData(publicationBreadcrumbs(publication));
		return () => {
			script.remove();
			breadcrumb.remove();
		};
	}, [publication]);
}
//#endregion
//#region src/pages/public/PublicationPage.tsx
function createReadSessionId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function getCurrentScrollDepth() {
	const documentElement = document.documentElement;
	const body = document.body;
	const scrollTop = window.scrollY || documentElement.scrollTop || body.scrollTop || 0;
	const viewportHeight = window.innerHeight || documentElement.clientHeight || 1;
	const scrollHeight = Math.max(documentElement.scrollHeight, body.scrollHeight, viewportHeight);
	if (scrollHeight <= viewportHeight) return 100;
	return Math.max(0, Math.min(100, (scrollTop + viewportHeight) / scrollHeight * 100));
}
function PublicationPage({ language, initialPublication }) {
	const { slug } = useParams();
	const navigate = useNavigate();
	const { user, library, refreshLibrary, loading: sessionLoading } = usePublicSession();
	const [publication, setPublication] = useState(() => initialPublication || (typeof document !== "undefined" ? JSON.parse(document.getElementById("initial-publication-data")?.textContent || "null") : null));
	const [related, setRelated] = useState([]);
	const [message, setMessage] = useState("");
	const [loading, setLoading] = useState(() => !initialPublication && (typeof document === "undefined" || !document.getElementById("initial-publication-data")));
	const [loadFailed, setLoadFailed] = useState(false);
	const [analyticsConsentStatus, setAnalyticsConsentStatus] = useState(() => getAnalyticsConsentStatus());
	const trackedViewRef = useRef(null);
	usePageMeta(language, useMemo(() => {
		if (!publication) return loading ? null : { noindex: true };
		const abstract = getPublicationAbstract(publication, language) || "";
		const section = publication.kind === "book" ? "/books" : "/library";
		return {
			title: publicationSeo(publication).title,
			description: publicationSeo(publication).description || abstract,
			path: buildLocalizedPath(language, `${section}/${getShareSlug(publication)}`),
			image: getPublicationImage(publication) ? optimizeCloudinaryUrl(getPublicationImage(publication), { width: 1200 }) : void 0
		};
	}, [
		language,
		publication,
		loading
	]));
	useArticleStructuredData(publication);
	useEffect(() => {
		if (!slug) return;
		let cancelled = false;
		const initial = JSON.parse(document.getElementById("initial-publication-data")?.textContent || "null");
		const hasInitial = Boolean(initial && [
			initial.id,
			getShareSlug(initial),
			initial.slug
		].includes(slug));
		setLoading(!hasInitial);
		setLoadFailed(false);
		if (!hasInitial) setPublication(null);
		setRelated([]);
		getPublicationBySlug(slug).then((item) => {
			if (cancelled) return;
			setPublication(item);
			return item;
		}).then((item) => {
			if (cancelled || !item) {
				if (!cancelled) setRelated([]);
				return;
			}
			return listPublications({ kind: "all" }).then((items) => {
				if (!cancelled) setRelated(relatedPublications(item, items));
			}).catch(() => {});
		}).catch(() => {
			if (!cancelled) setLoadFailed(true);
		}).finally(() => {
			if (!cancelled) setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [
		sessionLoading,
		slug,
		user?.uid
	]);
	useEffect(() => {
		return subscribeAnalyticsConsent(setAnalyticsConsentStatus);
	}, []);
	useEffect(() => {
		if (!publication || !slug) return;
		if (language === "en") return;
		const canonicalSlug = getShareSlug(publication);
		const section = publication.kind === "book" ? "/books" : "/library";
		if (slug === canonicalSlug && window.location.pathname.replace(/\/$/, "") === `${section}/${canonicalSlug}`) return;
		navigate(buildLocalizedPath(language, `${section}/${canonicalSlug}`), { replace: true });
	}, [
		language,
		navigate,
		publication,
		slug
	]);
	useEffect(() => {
		if (analyticsConsentStatus !== "accepted") return;
		if (!publication) return;
		const viewKey = `${publication.id}:${language}`;
		if (trackedViewRef.current === viewKey) return;
		trackedViewRef.current = viewKey;
		trackPublicationView(publication, language);
	}, [
		analyticsConsentStatus,
		language,
		publication
	]);
	useEffect(() => {
		if (analyticsConsentStatus !== "accepted") return;
		if (!publication) return;
		const readSessionId = createReadSessionId();
		let visibleStartedAt = document.visibilityState === "visible" ? performance.now() : null;
		let activeMilliseconds = 0;
		let reportedMilliseconds = 0;
		let maxScrollDepth = getCurrentScrollDepth();
		const updateScrollDepth = () => {
			maxScrollDepth = Math.max(maxScrollDepth, getCurrentScrollDepth());
		};
		const accrueVisibleTime = () => {
			if (visibleStartedAt === null) return;
			const now = performance.now();
			activeMilliseconds += Math.max(0, now - visibleStartedAt);
			visibleStartedAt = now;
		};
		const reportReadTime = () => {
			updateScrollDepth();
			accrueVisibleTime();
			const deltaMilliseconds = activeMilliseconds - reportedMilliseconds;
			const readingSeconds = Math.round(deltaMilliseconds / 1e3);
			if (readingSeconds < 3) return;
			reportedMilliseconds += readingSeconds * 1e3;
			trackPublicationReadTime(publication, language, readingSeconds, maxScrollDepth, readSessionId);
		};
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") {
				accrueVisibleTime();
				visibleStartedAt = null;
				reportReadTime();
				return;
			}
			if (visibleStartedAt === null) visibleStartedAt = performance.now();
		};
		const handlePageHide = () => {
			reportReadTime();
		};
		window.addEventListener("scroll", updateScrollDepth, { passive: true });
		window.addEventListener("pagehide", handlePageHide);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			window.removeEventListener("scroll", updateScrollDepth);
			window.removeEventListener("pagehide", handlePageHide);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			reportReadTime();
		};
	}, [
		analyticsConsentStatus,
		language,
		publication
	]);
	const isSaved = publication ? library.saved_item_ids.includes(publication.id) : false;
	const isPurchased = publication ? library.purchased_item_ids.includes(publication.id) : false;
	const canAccess = Boolean(publication && (publication.access_tier === "free" || isPurchased || publication.can_access));
	const hasPdf = Boolean(publication?.pdf_url || publication?.has_pdf);
	const publishedDate = useMemo(() => publication ? new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-AU", {
		dateStyle: "long",
		timeZone: "UTC"
	}).format(new Date(publication.published_at)) : "", [language, publication]);
	const handleSaveToggle = async () => {
		if (!publication) return;
		if (!user) {
			navigate(buildLocalizedPath(language, "/login"));
			return;
		}
		const { toggleSavedItem } = await import("./library-Cx5LdTvZ.js");
		await toggleSavedItem(user, publication.id, !isSaved);
		await refreshLibrary();
		setMessage(!isSaved ? language === "ar" ? "تمت إضافة الإصدار إلى المحفوظات." : "Saved to your library." : language === "ar" ? "تمت إزالة الإصدار من المحفوظات." : "Removed from saved items.");
	};
	const handleGenerateArticlePdf = async () => {
		if (!publication) return;
		const [{ jsPDF }, html2canvasMod] = await Promise.all([import("jspdf"), import("html2canvas")]);
		const html2canvas = html2canvasMod.default;
		const titleAr = publication.title_ar || publication.title_en;
		const abstractAr = publication.abstract_ar || publication.abstract_en;
		const contentSource = document.querySelector(".pub-pdf-source");
		const contentHtml = contentSource ? contentSource.outerHTML : `<p>${escapeHtml(publication.description_ar || publication.description_en || "")}</p>`;
		const arabicFontStack = "'Noto Naskh Arabic', 'Amiri', 'Cairo', 'Segoe UI', Tahoma, sans-serif";
		const stage = document.createElement("div");
		stage.setAttribute("dir", "rtl");
		stage.setAttribute("lang", "ar");
		stage.style.cssText = [
			"position: fixed",
			"top: 0",
			"left: -10000px",
			"width: 794px",
			"padding: 56px 60px",
			"background: #ffffff",
			"color: #111111",
			`font-family: ${arabicFontStack}`,
			"line-height: 1.95",
			"font-size: 16px",
			"box-sizing: border-box",
			"direction: rtl",
			"text-align: right"
		].join(";");
		stage.innerHTML = `
      <h1 style="font-family:${arabicFontStack};font-size:30px;font-weight:700;line-height:1.4;margin:0 0 16px;color:#000;direction:rtl;text-align:right;">${escapeHtml(titleAr)}</h1>
      ${abstractAr ? `<p style="font-family:${arabicFontStack};font-size:15px;line-height:1.95;color:#333;margin:0 0 22px;direction:rtl;text-align:right;">${escapeHtml(abstractAr)}</p>` : ""}
      <div style="border-top:1px solid #ddd;margin:0 0 22px;"></div>
      <div class="article-print-body" style="font-family:${arabicFontStack};font-size:15px;line-height:2;color:#111;direction:rtl;text-align:right;">${contentHtml}</div>
    `;
		stage.querySelectorAll("img").forEach((img) => {
			img.style.maxWidth = "100%";
			img.style.height = "auto";
			img.removeAttribute("loading");
		});
		stage.querySelectorAll(".article-print-body *").forEach((el) => {
			el.style.background = "transparent";
			el.style.boxShadow = "none";
			if (el.tagName === "A") el.style.color = "#000";
		});
		document.body.appendChild(stage);
		try {
			if (document.fonts && document.fonts.ready) await document.fonts.ready;
			const canvas = await html2canvas(stage, {
				scale: 2,
				backgroundColor: "#ffffff",
				useCORS: true,
				allowTaint: false,
				logging: false,
				windowWidth: stage.scrollWidth,
				windowHeight: stage.scrollHeight
			});
			const imgData = canvas.toDataURL("image/jpeg", .95);
			const pdf = new jsPDF({
				unit: "pt",
				format: "a4",
				compress: true
			});
			const pageWidth = pdf.internal.pageSize.getWidth();
			const pageHeight = pdf.internal.pageSize.getHeight();
			const imgWidth = pageWidth;
			const imgHeight = canvas.height * imgWidth / canvas.width;
			let heightLeft = imgHeight;
			let position = 0;
			pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, void 0, "FAST");
			heightLeft -= pageHeight;
			while (heightLeft > 0) {
				position -= pageHeight;
				pdf.addPage();
				pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, void 0, "FAST");
				heightLeft -= pageHeight;
			}
			const fileName = `${getShareSlug(publication) || "publication"}.pdf`;
			pdf.save(fileName);
		} finally {
			stage.remove();
		}
	};
	const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => {
		switch (char) {
			case "&": return "&amp;";
			case "<": return "&lt;";
			case ">": return "&gt;";
			case "\"": return "&quot;";
			default: return "&#39;";
		}
	});
	const handleDownloadPdf = async () => {
		if (!publication || !hasPdf) return;
		const baseName = getShareSlug(publication) || getPublicationTitle(publication, language) || "publication";
		const fileName = baseName.endsWith(".pdf") ? baseName : `${baseName}.pdf`;
		try {
			const blob = publication.access_tier === "paid" ? await (async () => {
				if (!isFirebaseConfigured || !auth?.currentUser) throw new Error("auth_required");
				const token = await auth.currentUser.getIdToken();
				return downloadPurchasedPublicationPdf(publication.id, token);
			})() : await (async () => {
				if (!publication.pdf_url) throw new Error("missing_pdf_url");
				const response = await fetch(publication.pdf_url, { credentials: "omit" });
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				return response.blob();
			})();
			const objectUrl = URL.createObjectURL(blob);
			const anchor = document.createElement("a");
			anchor.href = objectUrl;
			anchor.download = fileName;
			document.body.appendChild(anchor);
			anchor.click();
			anchor.remove();
			setTimeout(() => URL.revokeObjectURL(objectUrl), 1e3);
		} catch {
			if (publication.access_tier === "free" && publication.pdf_url) {
				const anchor = document.createElement("a");
				anchor.href = publication.pdf_url;
				anchor.download = fileName;
				anchor.target = "_blank";
				anchor.rel = "noreferrer";
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
				return;
			}
			setMessage(language === "ar" ? "تعذر تنزيل ملف PDF حالياً." : "Could not download the PDF right now.");
		}
	};
	const handlePurchase = async () => {
		if (!publication) return;
		if (!user) {
			navigate(buildLocalizedPath(language, "/login"));
			return;
		}
		if (!isFirebaseConfigured || !auth?.currentUser) {
			setMessage(language === "ar" ? "الدفع غير متاح حالياً." : "Payment is not available right now.");
			return;
		}
		const token = await auth.currentUser.getIdToken();
		const session = await createCheckoutSession(publication.id, token, language);
		if (!session?.url) {
			setMessage(language === "ar" ? "تعذر بدء عملية الدفع حالياً." : "Could not start checkout right now.");
			return;
		}
		window.location.href = session.url;
	};
	const shareUrl = useMemo(() => {
		if (!publication) return "";
		const section = publication.kind === "book" ? "books" : "library";
		const latinSlug = getShareSlug(publication);
		return getPublicSiteUrl(`${language === "en" ? "/en" : ""}/${section}/${latinSlug}`);
	}, [publication, language]);
	const shareText = useMemo(() => publication ? getPublicationTitle(publication, language) : "", [publication, language]);
	const shareToWhatsApp = () => {
		if (!shareUrl) return;
		window.open(`https://wa.me/?text=${encodeURIComponent(shareUrl)}`, "_blank", "noopener,noreferrer");
	};
	const shareToTwitter = () => {
		if (!shareUrl) return;
		const params = new URLSearchParams({
			url: shareUrl,
			text: shareText
		});
		window.open(`https://twitter.com/intent/tweet?${params.toString()}`, "_blank", "noopener,noreferrer");
	};
	const shareToFacebook = () => {
		if (!shareUrl) return;
		const params = new URLSearchParams({ u: shareUrl });
		window.open(`https://www.facebook.com/sharer/sharer.php?${params.toString()}`, "_blank", "noopener,noreferrer");
	};
	const shareToInstagram = async () => {
		if (!shareUrl) return;
		try {
			await navigator.clipboard.writeText(shareUrl);
		} catch {}
		setMessage(language === "ar" ? "تم نسخ الرابط. افتح إنستغرام والصقه في منشورك أو قصتك." : "Link copied. Open Instagram and paste it in your post or story.");
	};
	const copyShareLink = async () => {
		if (!shareUrl) return;
		await navigator.clipboard.writeText(shareUrl);
		setMessage(language === "ar" ? "تم نسخ رابط المشاركة." : "Share link copied.");
	};
	if (loading) return /* @__PURE__ */ jsx(PublicSiteShell, {
		language,
		children: /* @__PURE__ */ jsxs("div", {
			className: "detail-layout pub-skeleton",
			"aria-busy": "true",
			"aria-live": "polite",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "sr-only",
					children: language === "ar" ? "جار تحميل الإصدار..." : "Loading publication..."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "detail-content",
					children: [
						/* @__PURE__ */ jsx("span", { className: "skeleton skeleton--badge" }),
						/* @__PURE__ */ jsx("span", { className: "skeleton skeleton--title" }),
						/* @__PURE__ */ jsx("span", { className: "skeleton skeleton--text" }),
						/* @__PURE__ */ jsx("span", { className: "skeleton skeleton--text skeleton--text-short" }),
						/* @__PURE__ */ jsx("div", { className: "skeleton skeleton--toolbar" }),
						/* @__PURE__ */ jsxs("section", {
							className: "panel",
							children: [
								/* @__PURE__ */ jsx("span", { className: "skeleton skeleton--text" }),
								/* @__PURE__ */ jsx("span", { className: "skeleton skeleton--text" }),
								/* @__PURE__ */ jsx("span", { className: "skeleton skeleton--text" }),
								/* @__PURE__ */ jsx("span", { className: "skeleton skeleton--text skeleton--text-short" })
							]
						}),
						/* @__PURE__ */ jsx("section", {
							className: "panel",
							children: /* @__PURE__ */ jsx("span", { className: "skeleton skeleton--block" })
						})
					]
				}),
				/* @__PURE__ */ jsxs("aside", {
					className: "detail-sidebar",
					children: [
						/* @__PURE__ */ jsx("span", { className: "skeleton skeleton--cover" }),
						/* @__PURE__ */ jsx("span", { className: "skeleton skeleton--btn" }),
						/* @__PURE__ */ jsx("span", { className: "skeleton skeleton--btn" })
					]
				})
			]
		})
	});
	if (!publication) return /* @__PURE__ */ jsx(PublicSiteShell, {
		language,
		noindex: true,
		children: /* @__PURE__ */ jsx("div", {
			className: "empty",
			children: loadFailed ? language === "ar" ? "تعذر تحميل الإصدار. يرجى المحاولة بعد قليل." : "Unable to load this publication. Please try again shortly." : language === "ar" ? "الإصدار غير موجود." : "Publication not found."
		})
	});
	return /* @__PURE__ */ jsx(PublicSiteShell, {
		language,
		children: /* @__PURE__ */ jsxs("div", {
			className: "detail-layout",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "detail-content",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: `badge kind-badge kind-badge--${publication.kind}`,
						children: getPublicationKindLabel(publication.kind, language)
					}),
					/* @__PURE__ */ jsx("h1", {
						className: "title-1",
						children: getPublicationTitle(publication, language)
					}),
					/* @__PURE__ */ jsx("p", {
						className: "body-muted",
						style: { fontSize: 17 },
						children: getPublicationAbstract(publication, language)
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "detail-toolbar",
						children: [
							/* @__PURE__ */ jsx("span", { children: publishedDate }),
							/* @__PURE__ */ jsx("span", { children: publication.access_tier === "free" ? language === "ar" ? "وصول مجاني" : "Free access" : formatCurrency(publication.price_aud, language) }),
							isPurchased ? /* @__PURE__ */ jsx("span", { children: language === "ar" ? "تم الشراء" : "Purchased" }) : null
						]
					}),
					message ? /* @__PURE__ */ jsx("div", {
						className: "notice notice--success",
						children: message
					}) : null,
					/* @__PURE__ */ jsx("section", {
						className: "panel",
						children: canAccess ? publication.content_json ? /* @__PURE__ */ jsx("div", {
							className: "reader-body detail-prose pub-pdf-source",
							children: renderPmJson(publication.content_json)
						}) : /* @__PURE__ */ jsx("p", {
							className: "body-muted pub-pdf-source",
							children: getPublicationDescription(publication, language)
						}) : /* @__PURE__ */ jsx("div", {
							className: "empty",
							children: language === "ar" ? "هذا الإصدار مدفوع. يرجى تسجيل الدخول وإتمام الشراء لقراءة المحتوى الكامل." : "This is a paid publication. Sign in and complete purchase to read the full content."
						})
					}),
					/* @__PURE__ */ jsxs("section", {
						className: "panel pub-pdf-preview",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "title-3 mb-2",
							children: language === "ar" ? "معاينة PDF" : "PDF Preview"
						}), publication.pdf_url ? /* @__PURE__ */ jsx("iframe", {
							className: "pdf-frame",
							src: `${publication.pdf_url}#page=1&toolbar=0&navpanes=0`,
							title: getPublicationTitle(publication, language)
						}) : hasPdf ? /* @__PURE__ */ jsx("div", {
							className: "empty",
							children: canAccess ? language === "ar" ? "ملف PDF متاح للتنزيل الآمن." : "The PDF is available as a secure download." : language === "ar" ? "معاينة PDF متاحة بعد الشراء." : "PDF preview is available after purchase."
						}) : /* @__PURE__ */ jsx("div", {
							className: "empty",
							children: language === "ar" ? "لا توجد معاينة PDF متاحة." : "No PDF preview available."
						})]
					}),
					related.length > 0 && /* @__PURE__ */ jsxs("section", {
						className: "pub-related",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "panel__head",
							children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
								className: "eyebrow",
								children: language === "ar" ? "ذات صلة" : "Related"
							}), /* @__PURE__ */ jsx("h2", {
								className: "title-2",
								children: language === "ar" ? "مزيد من الإصدارات" : "More publications"
							})] }), /* @__PURE__ */ jsx(Link, {
								className: "btn btn--secondary btn--sm",
								to: buildLocalizedPath(language, publication.kind === "book" ? "/books" : "/library"),
								children: language === "ar" ? "عرض المزيد" : "View more"
							})]
						}), /* @__PURE__ */ jsx("div", {
							className: "grid-3",
							children: related.map((item) => /* @__PURE__ */ jsx(PublicationCard, {
								language,
								publication: item
							}, item.id))
						})]
					})
				]
			}), /* @__PURE__ */ jsxs("aside", {
				className: "detail-sidebar",
				children: [
					getPublicationImage(publication) ? /* @__PURE__ */ jsx("img", {
						alt: getPublicationTitle(publication, language),
						src: optimizeCloudinaryUrl(getPublicationImage(publication), { width: 1200 }),
						width: "1200",
						height: "675",
						loading: "lazy",
						fetchPriority: "auto",
						decoding: "async",
						style: { objectPosition: getCoverObjectPosition(publication) }
					}) : null,
					/* @__PURE__ */ jsxs("div", {
						className: "detail-actions",
						children: [
							canAccess ? hasPdf ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("button", {
								className: "btn btn--primary",
								onClick: () => void handleDownloadPdf(),
								type: "button",
								children: language === "ar" ? "تنزيل PDF" : "Download PDF"
							}), publication.pdf_url ? /* @__PURE__ */ jsx("a", {
								className: "btn btn--secondary",
								href: publication.pdf_url,
								rel: "noreferrer",
								target: "_blank",
								children: language === "ar" ? "قراءة في نافذة جديدة" : "Open in new tab"
							}) : null] }) : /* @__PURE__ */ jsx("button", {
								className: "btn btn--primary",
								onClick: () => void handleGenerateArticlePdf(),
								type: "button",
								children: language === "ar" ? "تنزيل PDF" : "Download PDF"
							}) : /* @__PURE__ */ jsx("button", {
								className: "btn btn--primary",
								onClick: () => void handlePurchase(),
								type: "button",
								children: language === "ar" ? `شراء ${formatCurrency(publication.price_aud, language)}` : `Buy for ${formatCurrency(publication.price_aud, language)}`
							}),
							user ? /* @__PURE__ */ jsx("button", {
								className: "btn btn--secondary",
								onClick: () => void handleSaveToggle(),
								type: "button",
								children: isSaved ? language === "ar" ? "إزالة من المحفوظات" : "Remove from saved" : language === "ar" ? "حفظ الإصدار" : "Save item"
							}) : null,
							/* @__PURE__ */ jsxs("div", {
								className: "share-row",
								children: [/* @__PURE__ */ jsx("span", {
									className: "share-row__label",
									children: language === "ar" ? "مشاركة" : "Share"
								}), /* @__PURE__ */ jsxs("div", {
									className: "share-row__buttons",
									children: [
										/* @__PURE__ */ jsx("button", {
											"aria-label": "WhatsApp",
											className: "share-btn share-btn--whatsapp",
											onClick: shareToWhatsApp,
											title: "WhatsApp",
											type: "button",
											children: /* @__PURE__ */ jsx("svg", {
												"aria-hidden": "true",
												viewBox: "0 0 24 24",
												width: "18",
												height: "18",
												children: /* @__PURE__ */ jsx("path", {
													fill: "currentColor",
													d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488"
												})
											})
										}),
										/* @__PURE__ */ jsx("button", {
											"aria-label": "X / Twitter",
											className: "share-btn share-btn--twitter",
											onClick: shareToTwitter,
											title: "X",
											type: "button",
											children: /* @__PURE__ */ jsx("svg", {
												"aria-hidden": "true",
												viewBox: "0 0 24 24",
												width: "18",
												height: "18",
												children: /* @__PURE__ */ jsx("path", {
													fill: "currentColor",
													d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
												})
											})
										}),
										/* @__PURE__ */ jsx("button", {
											"aria-label": "Facebook",
											className: "share-btn share-btn--facebook",
											onClick: shareToFacebook,
											title: "Facebook",
											type: "button",
											children: /* @__PURE__ */ jsx("svg", {
												"aria-hidden": "true",
												viewBox: "0 0 24 24",
												width: "18",
												height: "18",
												children: /* @__PURE__ */ jsx("path", {
													fill: "currentColor",
													d: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073"
												})
											})
										}),
										/* @__PURE__ */ jsx("button", {
											"aria-label": "Instagram",
											className: "share-btn share-btn--instagram",
											onClick: () => void shareToInstagram(),
											title: "Instagram",
											type: "button",
											children: /* @__PURE__ */ jsx("svg", {
												"aria-hidden": "true",
												viewBox: "0 0 24 24",
												width: "18",
												height: "18",
												children: /* @__PURE__ */ jsx("path", {
													fill: "currentColor",
													d: "M12 2.163c3.204 0 3.584.012 4.849.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.849.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163m0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0m0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8m6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881"
												})
											})
										}),
										/* @__PURE__ */ jsx("button", {
											"aria-label": language === "ar" ? "نسخ الرابط" : "Copy link",
											className: "share-btn share-btn--link",
											onClick: () => void copyShareLink(),
											title: language === "ar" ? "نسخ الرابط" : "Copy link",
											type: "button",
											children: /* @__PURE__ */ jsx("svg", {
												"aria-hidden": "true",
												viewBox: "0 0 24 24",
												width: "18",
												height: "18",
												children: /* @__PURE__ */ jsx("path", {
													fill: "none",
													stroke: "currentColor",
													strokeWidth: "1.8",
													strokeLinecap: "round",
													strokeLinejoin: "round",
													d: "M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07L11.5 5.43M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07L12.5 18.57"
												})
											})
										})
									]
								})]
							})
						]
					}),
					/* @__PURE__ */ jsxs("dl", {
						className: "detail-meta",
						children: [
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: language === "ar" ? "التصنيف" : "Category" }), /* @__PURE__ */ jsx("dd", { children: /* @__PURE__ */ jsx(Link, {
								to: `/topics/${publication.category}`,
								children: getPublicationCategoryLabel(publication.category, "ar")
							}) })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: language === "ar" ? "الموضوع" : "Topic" }), /* @__PURE__ */ jsx("dd", { children: getPublicationTopic(publication, language) || "—" })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: language === "ar" ? "الكاتب" : "Author" }), /* @__PURE__ */ jsx("dd", { children: getPublicationAuthor(publication, language) })] }),
							/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("dt", { children: language === "ar" ? "الصفحات" : "Pages" }), /* @__PURE__ */ jsx("dd", { children: publication.pages })] })
						]
					})
				]
			})]
		})
	});
}
//#endregion
//#region src/server/renderPublicPage.tsx
function renderPublicPage({ path, language, publications, publication }) {
	return renderToString(/* @__PURE__ */ jsx(MemoryRouter, {
		initialEntries: [path],
		children: /* @__PURE__ */ jsxs(PublicSessionProvider, { children: [/* @__PURE__ */ jsx(Suspense, {
			fallback: /* @__PURE__ */ jsx("div", {
				className: "container",
				style: { minHeight: "100vh" },
				"aria-busy": "true",
				children: "جار التحميل…"
			}),
			children: /* @__PURE__ */ jsxs(Routes, { children: [
				/* @__PURE__ */ jsx(Route, {
					path: "/",
					element: /* @__PURE__ */ jsx(ResearchHomePage, {
						language,
						initialPublications: publications
					})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/en",
					element: /* @__PURE__ */ jsx(ResearchHomePage, {
						language,
						initialPublications: publications
					})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/library/:slug",
					element: /* @__PURE__ */ jsx(PublicationPage, {
						language,
						initialPublication: publication
					})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/en/library/:slug",
					element: /* @__PURE__ */ jsx(PublicationPage, {
						language,
						initialPublication: publication
					})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/books/:slug",
					element: /* @__PURE__ */ jsx(PublicationPage, {
						language,
						initialPublication: publication
					})
				}),
				/* @__PURE__ */ jsx(Route, {
					path: "/en/books/:slug",
					element: /* @__PURE__ */ jsx(PublicationPage, {
						language,
						initialPublication: publication
					})
				})
			] })
		}), /* @__PURE__ */ jsx(CookieConsentBanner, {})] })
	}));
}
//#endregion
export { isFirebaseConfigured as n, renderPublicPage, firebaseConfig as t };
