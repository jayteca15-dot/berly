import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "../firebase";

const ADMIN_EMAIL = "jayteca15@gmail.com";

export type AdminAuthResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

/**
 * Sign in via Firebase Authentication.
 */
export async function adminLogin(
  email: string,
  password: string
): Promise<AdminAuthResult> {
  // Basic guard so only the expected admin email can use the panel.
  if (String(email).trim().toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return { ok: false, message: "Unauthorized admin email" };
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // If another Firebase user somehow signs in, sign them out immediately.
    const userEmail = cred.user.email || "";
    if (userEmail.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      await signOut(auth);
      return { ok: false, message: "Unauthorized admin account" };
    }

    return { ok: true, email: userEmail || email };
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? "";
    let message = "Invalid email or password";

    if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
      message = "Invalid email or password";
    } else if (code === "auth/too-many-requests") {
      message = "Too many failed attempts. Please try again later.";
    } else if (code === "auth/network-request-failed") {
      message = "Network error. Check your internet connection.";
    } else if (code === "auth/invalid-email") {
      message = "Invalid email address format.";
    }

    return { ok: false, message };
  }
}

/**
 * Sign out via Firebase Authentication.
 */
export async function adminLogout(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // Ignore sign-out errors
  }
}

/**
 * Check if a user is currently authenticated.
 * Returns the User object or null.
 */
export function adminMe(): Promise<boolean> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      unsubscribe();
      const email = user?.email || "";

      // Only treat the session as authenticated if it is the admin email.
      if (user && email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        // Defensive: sign out any non-admin user to prevent accidental access.
        try {
          await signOut(auth);
        } catch {
          // ignore
        }
        resolve(false);
        return;
      }

      resolve(!!user);
    });
  });
}

/**
 * Subscribe to auth state changes.
 */
export function onAdminAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
