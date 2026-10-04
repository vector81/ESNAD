import { n as isFirebaseConfigured, t as firebaseConfig } from "./public-render.js";
import { initializeApp } from "firebase/app";
import { browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence, initializeAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
//#region src/lib/firebase.ts
function parseAdminEmails(value) {
	if (!value) return [];
	return value.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
}
(() => {
	const fromEnv = parseAdminEmails(void 0);
	const baseline = ["abuali882005@gmail.com", "info@esnad.com.lb"];
	return [...new Set([...fromEnv, ...baseline])];
})()[0];
var firebaseProjectId = firebaseConfig.projectId?.trim() ?? "";
var app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
var auth = app ? initializeAuth(app, { persistence: [
	indexedDBLocalPersistence,
	browserLocalPersistence,
	browserSessionPersistence
] }) : null;
var db = app ? getFirestore(app) : null;
app && getStorage(app);
if (typeof window !== "undefined") console.info("[esnad/firebase] initialized", {
	projectId: firebaseProjectId || null,
	authDomain: firebaseConfig.authDomain || null,
	hasAuth: Boolean(auth),
	hasDb: Boolean(db)
});
function logFirebaseDebug(context, error) {
	const currentUser = auth?.currentUser;
	console.info("[esnad/firebase] debug", {
		context,
		projectId: firebaseProjectId || null,
		currentUser: currentUser ? {
			uid: currentUser.uid,
			email: currentUser.email
		} : null,
		error: error instanceof Error ? {
			name: error.name,
			message: error.message
		} : error ?? null
	});
}
async function waitForAuthenticatedUser() {
	if (!auth) return null;
	if (typeof auth.authStateReady === "function") await auth.authStateReady();
	else if (!auth.currentUser) await new Promise((resolve) => {
		const unsubscribe = onAuthStateChanged(auth, () => {
			unsubscribe();
			resolve();
		});
	});
	const currentUser = auth.currentUser;
	if (!currentUser) {
		logFirebaseDebug("waitForAuthenticatedUser:no-user");
		return null;
	}
	await currentUser.getIdToken();
	logFirebaseDebug("waitForAuthenticatedUser:ready");
	return currentUser;
}
//#endregion
export { auth, db, logFirebaseDebug, waitForAuthenticatedUser };
