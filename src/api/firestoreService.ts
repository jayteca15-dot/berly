import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db } from "../firebase";

// =====================================================================
// SITE SETTINGS
// =====================================================================

const SETTINGS_DOC = "siteConfig";
const SETTINGS_COLLECTION = "settings";

export async function fetchSiteSettings(): Promise<Record<string, unknown> | null> {
  try {
    const ref = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data() as Record<string, unknown>;
    return null;
  } catch (err) {
    console.warn("Firestore: could not fetch settings", err);
    return null;
  }
}

export async function saveSiteSettingsToFirestore(data: Record<string, unknown>): Promise<boolean> {
  try {
    const ref = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
    await setDoc(ref, data, { merge: true });
    return true;
  } catch (err) {
    console.warn("Firestore: could not save settings", err);
    return false;
  }
}

export function subscribeSiteSettings(
  callback: (data: Record<string, unknown> | null) => void
): Unsubscribe {
  const ref = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) callback(snap.data() as Record<string, unknown>);
      else callback(null);
    },
    (err) => {
      console.warn("Firestore settings listener error", err);
      callback(null);
    }
  );
}

// =====================================================================
// APPOINTMENTS
// =====================================================================

const APPOINTMENTS_COLLECTION = "appointments";

export interface FirestoreAppointment {
  id?: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  service: string;
  message: string;
  status: "pending" | "confirmed";
}

export async function fetchAppointments(): Promise<FirestoreAppointment[]> {
  try {
    const q = query(
      collection(db, APPOINTMENTS_COLLECTION),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreAppointment));
  } catch (err) {
    console.warn("Firestore: could not fetch appointments", err);
    return [];
  }
}

export async function addAppointment(
  data: Omit<FirestoreAppointment, "id">
): Promise<string | null> {
  try {
    const ref = await addDoc(collection(db, APPOINTMENTS_COLLECTION), data);
    return ref.id;
  } catch (err) {
    console.warn("Firestore: could not add appointment", err);
    return null;
  }
}

export async function updateAppointmentStatus(
  id: string,
  status: "pending" | "confirmed"
): Promise<boolean> {
  try {
    const ref = doc(db, APPOINTMENTS_COLLECTION, id);
    await updateDoc(ref, { status });
    return true;
  } catch (err) {
    console.warn("Firestore: could not update appointment", err);
    return false;
  }
}

export async function deleteAppointment(id: string): Promise<boolean> {
  try {
    const ref = doc(db, APPOINTMENTS_COLLECTION, id);
    await deleteDoc(ref);
    return true;
  } catch (err) {
    console.warn("Firestore: could not delete appointment", err);
    return false;
  }
}

export async function deleteAllAppointments(): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, APPOINTMENTS_COLLECTION));
    const deletes = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletes);
    return true;
  } catch (err) {
    console.warn("Firestore: could not delete all appointments", err);
    return false;
  }
}

export function subscribeAppointments(
  callback: (data: FirestoreAppointment[]) => void
): Unsubscribe {
  const q = query(
    collection(db, APPOINTMENTS_COLLECTION),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as FirestoreAppointment)
      );
      callback(list);
    },
    (err) => {
      console.warn("Firestore appointments listener error", err);
    }
  );
}

// =====================================================================
// REVIEWS
// =====================================================================

const REVIEWS_COLLECTION = "reviews";

export interface FirestoreReview {
  id?: string;
  name: string;
  service: string;
  rating: number;
  text: string;
  date: string;
}

export async function fetchReviews(): Promise<FirestoreReview[]> {
  try {
    const q = query(
      collection(db, REVIEWS_COLLECTION),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreReview));
  } catch (err) {
    console.warn("Firestore: could not fetch reviews", err);
    return [];
  }
}

export async function addReview(
  data: Omit<FirestoreReview, "id">
): Promise<string | null> {
  try {
    const ref = await addDoc(collection(db, REVIEWS_COLLECTION), data);
    return ref.id;
  } catch (err) {
    console.warn("Firestore: could not add review", err);
    return null;
  }
}

export function subscribeReviews(
  callback: (data: FirestoreReview[]) => void
): Unsubscribe {
  const q = query(
    collection(db, REVIEWS_COLLECTION),
    orderBy("date", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as FirestoreReview)
      );
      callback(list);
    },
    (err) => {
      console.warn("Firestore reviews listener error", err);
    }
  );
}

export async function deleteReview(id: string): Promise<boolean> {
  try {
    const ref = doc(db, REVIEWS_COLLECTION, id);
    await deleteDoc(ref);
    return true;
  } catch (err) {
    console.warn("Firestore: could not delete review", err);
    return false;
  }
}
