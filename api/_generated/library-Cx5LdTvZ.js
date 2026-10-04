import { n as isFirebaseConfigured } from "./public-render.js";
import { db } from "./firebase-CDYWQsgv.js";
import { arrayRemove, arrayUnion, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
//#region src/lib/library.ts
var DEMO_LIBRARY_PREFIX = "esnad_library_";
function getLocalStorageKey(user) {
	return `${DEMO_LIBRARY_PREFIX}${user.uid}`;
}
function readLocalSnapshot(user) {
	if (typeof window === "undefined") return {
		saved_item_ids: [],
		purchased_item_ids: []
	};
	try {
		const stored = window.localStorage.getItem(getLocalStorageKey(user));
		if (!stored) return {
			saved_item_ids: [],
			purchased_item_ids: []
		};
		const parsed = JSON.parse(stored);
		return {
			saved_item_ids: parsed.saved_item_ids ?? [],
			purchased_item_ids: parsed.purchased_item_ids ?? []
		};
	} catch {
		return {
			saved_item_ids: [],
			purchased_item_ids: []
		};
	}
}
function writeLocalSnapshot(user, snapshot) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(getLocalStorageKey(user), JSON.stringify(snapshot));
}
async function getLibrarySnapshot(user) {
	if (!db || !isFirebaseConfigured) return readLocalSnapshot(user);
	const snapshot = await getDoc(doc(db, "user_libraries", user.uid));
	if (!snapshot.exists()) return {
		saved_item_ids: [],
		purchased_item_ids: []
	};
	const data = snapshot.data();
	return {
		saved_item_ids: Array.isArray(data.saved_item_ids) ? data.saved_item_ids : [],
		purchased_item_ids: Array.isArray(data.purchased_item_ids) ? data.purchased_item_ids : []
	};
}
async function toggleSavedItem(user, publicationId, saved) {
	if (!db || !isFirebaseConfigured) {
		const current = readLocalSnapshot(user);
		const next = saved ? {
			...current,
			saved_item_ids: current.saved_item_ids.includes(publicationId) ? current.saved_item_ids : [...current.saved_item_ids, publicationId]
		} : {
			...current,
			saved_item_ids: current.saved_item_ids.filter((item) => item !== publicationId)
		};
		writeLocalSnapshot(user, next);
		return next;
	}
	await setDoc(doc(db, "user_libraries", user.uid), {
		saved_item_ids: saved ? arrayUnion(publicationId) : arrayRemove(publicationId),
		updated_at: serverTimestamp()
	}, { merge: true });
	return getLibrarySnapshot(user);
}
//#endregion
export { getLibrarySnapshot, toggleSavedItem };
