import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  fetchSiteSettings,
  saveSiteSettingsToFirestore,
  subscribeSiteSettings,
} from "./api/firestoreService";

export type GalleryMode = "numbered" | "custom";

export interface SiteSettings {
  contact: {
    addressLines: string[];
    mapUrl: string;
    phoneDisplay: string;
    phoneTel: string;
    whatsappDigits: string;
    email: string;
    hours: string;
  };
  socials: {
    instagramUrl: string;
    facebookUrl: string;
  };
  media: {
    heroVideoUrl: string;
    heroPosterUrl: string;
    heroVideoFit: "cover" | "contain";
    heroVideoPosition: string;
  };
  promotions: {
    enabled: boolean;
    items: Array<{
      id: string;
      title: string;
      description: string;
      badge: string; // e.g. "Special" / "New" / "Limited"
      ctaText: string; // e.g. "Book on WhatsApp"
      imageUrl: string;
      /** ISO date string; if set and expired, it won’t display publicly */
      validUntil: string;
    }>;
  };
  gallery: {
    /** Bump this number to force-refresh internal /gallery/* assets in browsers. */
    assetVersion: number;
    mode: GalleryMode;
    initialCount: number;
    pageSize: number;
    /** How gallery tiles fit inside their frames */
    tileFit: "cover" | "contain";

    /** Featured nails designs (images) shown in the “Our Work” section */
    featuredNails: {
      enabled: boolean;
      title: string;
      imageUrls: string[];
    };

    /** (Legacy) Featured video shown in the “Our Work” section */
    featuredVideo: {
      enabled: boolean;
      url: string;
      posterUrl: string;
      title: string;
    };

    numbered: {
      folder: string;
      start: number;
      end: number;
      extension: string;
      /** Optional custom ordering for numbered images (e.g. [5,1,12]). */
      order: number[];
    };
    customImages: string[];
  };
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  contact: {
    addressLines: [
      "248 Ben Viljoen St",
      "Pretoria North, Pretoria, 0116",
      "South Africa",
    ],
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=248+Ben+Viljoen+St,+Pretoria+North,+Pretoria,+0116,+South+Africa",
    phoneDisplay: "+27 69 288 8445",
    phoneTel: "+27692888445",
    whatsappDigits: "27692888445",
    email: "info@berlybeauty.co.za",
    hours: "Mon - Sun: 7:00 AM - 7:00 PM",
  },
  socials: {
    instagramUrl:
      "https://www.instagram.com/salonberlybeauty10?igsh=MW42ZmFjY295NTk1eQ==",
    facebookUrl: "https://www.facebook.com/share/1HRogBAxNy/",
  },
  media: {
    heroVideoUrl: "/gallery/1.mp4",
    heroPosterUrl: "/gallery/1.jpeg",
    heroVideoFit: "cover",
    heroVideoPosition: "50% 15%",
  },
  promotions: {
    enabled: true,
    items: [],
  },
  gallery: {
    assetVersion: 1,
    mode: "numbered",
    // Show 11 images initially (professional), but allow loading more.
    initialCount: 11,
    pageSize: 12,
    // Default tile behavior: fill the frame (more editorial)
    tileFit: "cover",

    featuredNails: {
      enabled: true,
      title: "Nails Designs",
      // Add your nails design images into public/gallery/ and reference them here.
      // Example: /gallery/nails1.jpeg
      imageUrls: [
        "/gallery/nails1.jpeg",
        "/gallery/nails2.jpeg",
        "/gallery/nails3.jpeg",
      ],
    },

    // Legacy (kept for backwards compatibility)
    featuredVideo: {
      enabled: false,
      url: "/gallery/nails.mp4",
      posterUrl: "/gallery/nails.jpeg",
      title: "Nails",
    },

    numbered: {
      folder: "/gallery",
      start: 1,
      // Default range supports many internal images (e.g. 1.jpeg ... 50.jpeg)
      end: 50,
      extension: "jpeg",
      // Optional custom ordering for numbered images. Empty = natural order.
      order: [],
    },
    customImages: [],
  },
};

function mergeSettings(partial: Partial<SiteSettings> | null): SiteSettings {
  if (!partial) return deepClone(DEFAULT_SITE_SETTINGS);

  const s = partial as SiteSettings;
  return {
    contact: {
      ...DEFAULT_SITE_SETTINGS.contact,
      ...(s.contact ?? {}),
    },
    socials: {
      ...DEFAULT_SITE_SETTINGS.socials,
      ...(s.socials ?? {}),
    },
    media: {
      ...DEFAULT_SITE_SETTINGS.media,
      ...(s.media ?? {}),
    },
    promotions: {
      ...DEFAULT_SITE_SETTINGS.promotions,
      ...(s.promotions ?? {}),
      items: Array.isArray(s.promotions?.items)
        ? s.promotions!.items
        : DEFAULT_SITE_SETTINGS.promotions.items,
    },
    gallery: {
      ...DEFAULT_SITE_SETTINGS.gallery,
      ...(s.gallery ?? {}),
      assetVersion:
        typeof s.gallery?.assetVersion === "number"
          ? s.gallery.assetVersion
          : DEFAULT_SITE_SETTINGS.gallery.assetVersion,
      tileFit: (s.gallery?.tileFit ?? DEFAULT_SITE_SETTINGS.gallery.tileFit) as SiteSettings["gallery"]["tileFit"],

      featuredNails: {
        ...DEFAULT_SITE_SETTINGS.gallery.featuredNails,
        ...(s.gallery?.featuredNails ?? {}),
        imageUrls: Array.isArray(s.gallery?.featuredNails?.imageUrls)
          ? (s.gallery!.featuredNails!.imageUrls as string[])
          : DEFAULT_SITE_SETTINGS.gallery.featuredNails.imageUrls,
      },

      // Legacy (kept for backwards compatibility)
      featuredVideo: {
        ...DEFAULT_SITE_SETTINGS.gallery.featuredVideo,
        ...(s.gallery?.featuredVideo ?? {}),
      },

      numbered: {
        ...DEFAULT_SITE_SETTINGS.gallery.numbered,
        ...(s.gallery?.numbered ?? {}),
        order: Array.isArray(s.gallery?.numbered?.order)
          ? (s.gallery!.numbered!.order as number[])
          : DEFAULT_SITE_SETTINGS.gallery.numbered.order,
      },
      customImages: Array.isArray(s.gallery?.customImages)
        ? s.gallery!.customImages
        : DEFAULT_SITE_SETTINGS.gallery.customImages,
    },
  };
}

// Keep localStorage as fallback for offline / pre-Firebase usage
const STORAGE_KEY = "berly_site_settings_v1";

function loadFromLocalStorage(): SiteSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return deepClone(DEFAULT_SITE_SETTINGS);
  try {
    const parsed = JSON.parse(raw) as Partial<SiteSettings>;
    return mergeSettings(parsed);
  } catch {
    return deepClone(DEFAULT_SITE_SETTINGS);
  }
}

function saveToLocalStorage(settings: SiteSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function buildGalleryImageList(settings: SiteSettings): string[] {
  if (settings.gallery.mode === "custom") {
    return settings.gallery.customImages.filter(Boolean);
  }

  const { folder, start, end, extension, order } = settings.gallery.numbered;
  const safeStart = Math.max(1, Math.floor(start || 1));
  const safeEnd = Math.max(safeStart, Math.floor(end || safeStart));
  const ext = (extension || "jpeg").replace(/^\./, "");

  // Cache-buster for internal assets so replaced /gallery/*.jpeg files refresh.
  const v =
    typeof settings.gallery.assetVersion === "number"
      ? settings.gallery.assetVersion
      : 1;

  const range = Array.from({ length: safeEnd - safeStart + 1 }, (_, i) => safeStart + i);

  // If admin provided a manual order list, use it (filtered to range and unique),
  // and then append any remaining numbers that weren’t included.
  const manual = Array.isArray(order) && order.length > 0;
  const baseOrdered = manual
    ? Array.from(
        new Set(
          order
            .map((n) => Math.floor(Number(n)))
            .filter((n) => Number.isFinite(n) && n >= safeStart && n <= safeEnd)
        )
      )
    : [];

  const baseSet = new Set(baseOrdered);
  const orderedNumbers = manual
    ? [...baseOrdered, ...range.filter((n) => !baseSet.has(n))]
    : range;

  return orderedNumbers.map((n) => `${folder}/${n}.${ext}?v=${v}`);
}

interface SiteSettingsContextType {
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
  updateSettings: (updater: (prev: SiteSettings) => SiteSettings) => void;
  resetSettings: () => void;
  loading: boolean;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | null>(null);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<SiteSettings>(() =>
    loadFromLocalStorage()
  );
  const [loading, setLoading] = useState(true);
  const [firestoreAvailable, setFirestoreAvailable] = useState(false);

  // Load from Firestore on mount, then subscribe to live updates
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function init() {
      try {
        // Try to fetch from Firestore first
        const remote = await fetchSiteSettings();
        if (remote) {
          const merged = mergeSettings(remote as Partial<SiteSettings>);
          setSettingsState(merged);
          saveToLocalStorage(merged);
          setFirestoreAvailable(true);
        } else {
          // No settings in Firestore yet — use local and push to Firestore
          const local = loadFromLocalStorage();
          try {
            await saveSiteSettingsToFirestore(
              JSON.parse(JSON.stringify(local)) as Record<string, unknown>
            );
            setFirestoreAvailable(true);
          } catch {
            // Firestore not configured yet, use localStorage
          }
        }

        // Subscribe to live updates
        unsubscribe = subscribeSiteSettings((data) => {
          if (data) {
            const merged = mergeSettings(data as Partial<SiteSettings>);
            setSettingsState(merged);
            saveToLocalStorage(merged);
            setFirestoreAvailable(true);
          }
        });
      } catch {
        // Firestore not available — continue with localStorage
        console.info("Firestore not available, using localStorage for settings");
      } finally {
        setLoading(false);
      }
    }

    init();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const value = useMemo<SiteSettingsContextType>(() => {
    return {
      settings,
      loading,
      setSettings: (next) => {
        setSettingsState(next);
        saveToLocalStorage(next);
        if (firestoreAvailable) {
          saveSiteSettingsToFirestore(
            JSON.parse(JSON.stringify(next)) as Record<string, unknown>
          ).catch(() => {});
        }
      },
      updateSettings: (updater) => {
        setSettingsState((prev) => {
          const next = updater(prev);
          saveToLocalStorage(next);
          if (firestoreAvailable) {
            saveSiteSettingsToFirestore(
              JSON.parse(JSON.stringify(next)) as Record<string, unknown>
            ).catch(() => {});
          }
          return next;
        });
      },
      resetSettings: () => {
        const def = deepClone(DEFAULT_SITE_SETTINGS);
        setSettingsState(def);
        saveToLocalStorage(def);
        if (firestoreAvailable) {
          saveSiteSettingsToFirestore(
            JSON.parse(JSON.stringify(def)) as Record<string, unknown>
          ).catch(() => {});
        }
      },
    };
  }, [settings, loading, firestoreAvailable]);

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const ctx = useContext(SiteSettingsContext);
  if (!ctx)
    throw new Error("useSiteSettings must be used within SiteSettingsProvider");
  return ctx;
}
