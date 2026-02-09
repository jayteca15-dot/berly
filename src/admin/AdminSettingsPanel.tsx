import { useEffect, useMemo, useState } from "react";
import {
  buildGalleryImageList,
  DEFAULT_SITE_SETTINGS,
  type SiteSettings,
  useSiteSettings,
} from "../siteSettings";

function clampInt(value: string, min: number, max: number) {
  const n = Math.floor(Number(value));
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeUrlInput(url: string) {
  const v = url.trim();
  return v;
}

function promptForUrl(label: string, current: string) {
  const next = window.prompt(label, current);
  if (next == null) return null;
  return normalizeUrlInput(next);
}

export function AdminSettingsPanel() {
  const { settings, setSettings, resetSettings } = useSiteSettings();

  const [draft, setDraft] = useState<SiteSettings>(() => settings);
  const [savedAt, setSavedAt] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [newImageUrl, setNewImageUrl] = useState<string>("");

  const [nailsPreviewFailed, setNailsPreviewFailed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setNailsPreviewFailed({});
  }, [draft.gallery.assetVersion, JSON.stringify(draft.gallery.featuredNails.imageUrls || [])]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings]
  );

  const onSave = () => {
    setSettings(draft);
    setSavedAt(new Date().toLocaleTimeString());
    setError("");
  };

  const onResetDefaults = () => {
    if (!window.confirm("Reset website settings to defaults?")) return;
    resetSettings();
    setDraft(DEFAULT_SITE_SETTINGS);
    setSavedAt("");
    setError("");
  };

  // ─────────────────────────────────────────────
  // Promotions
  // ─────────────────────────────────────────────
  const createPromoId = () =>
    `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const addPromotion = () => {
    const id = createPromoId();
    setDraft((p) => ({
      ...p,
      promotions: {
        ...p.promotions,
        items: [
          {
            id,
            title: "New Special",
            description: "",
            badge: "Special",
            ctaText: "Book on WhatsApp",
            imageUrl: "",
            validUntil: "",
          },
          ...p.promotions.items,
        ],
      },
    }));
  };

  const removePromotion = (id: string) => {
    setDraft((p) => ({
      ...p,
      promotions: {
        ...p.promotions,
        items: p.promotions.items.filter((x) => x.id !== id),
      },
    }));
  };

  const updatePromotion = (
    id: string,
    patch: Partial<SiteSettings["promotions"]["items"][number]>
  ) => {
    setDraft((p) => ({
      ...p,
      promotions: {
        ...p.promotions,
        items: p.promotions.items.map((x) =>
          x.id === id ? { ...x, ...patch } : x
        ),
      },
    }));
  };

  const movePromotion = (id: string, direction: -1 | 1) => {
    setDraft((p) => {
      const list = [...p.promotions.items];
      const idx = list.findIndex((x) => x.id === id);
      const next = idx + direction;
      if (idx < 0 || next < 0 || next >= list.length) return p;
      const temp = list[idx];
      list[idx] = list[next];
      list[next] = temp;
      return { ...p, promotions: { ...p.promotions, items: list } };
    });
  };

  // ─────────────────────────────────────────────
  // Gallery: internal preview + ordering
  // ─────────────────────────────────────────────
  const internalNumberedImages = useMemo(() => {
    if (draft.gallery.mode !== "numbered") return [] as string[];
    return buildGalleryImageList(draft);
  }, [
    draft.gallery.mode,
    draft.gallery.assetVersion,
    draft.gallery.numbered.folder,
    draft.gallery.numbered.start,
    draft.gallery.numbered.end,
    draft.gallery.numbered.extension,
    draft.gallery.numbered.order,
  ]);

  const internalPreview = useMemo(
    () => internalNumberedImages.slice(0, 24),
    [internalNumberedImages]
  );

  const numberedRange = useMemo(() => {
    const safeStart = Math.max(1, Math.floor(draft.gallery.numbered.start || 1));
    const safeEnd = Math.max(
      safeStart,
      Math.floor(draft.gallery.numbered.end || safeStart)
    );
    return Array.from(
      { length: safeEnd - safeStart + 1 },
      (_, i) => safeStart + i
    );
  }, [draft.gallery.numbered.start, draft.gallery.numbered.end]);

  // This is the actual number order used on the public site:
  // manual order (unique) + remaining range.
  const effectiveNumberOrder = useMemo(() => {
    const safeStart = numberedRange[0] ?? 1;
    const safeEnd = numberedRange[numberedRange.length - 1] ?? safeStart;

    const manual = Array.isArray(draft.gallery.numbered.order)
      ? draft.gallery.numbered.order
      : [];

    const baseOrdered =
      manual.length > 0
        ? Array.from(
            new Set(
              manual
                .map((n) => Math.floor(Number(n)))
                .filter(
                  (n) => Number.isFinite(n) && n >= safeStart && n <= safeEnd
                )
            )
          )
        : [];

    const baseSet = new Set(baseOrdered);
    return manual.length > 0
      ? [...baseOrdered, ...numberedRange.filter((n) => !baseSet.has(n))]
      : numberedRange;
  }, [draft.gallery.numbered.order, numberedRange]);

  const getEffectiveNumberOrder = (p: SiteSettings) => {
    const safeStart = Math.max(1, Math.floor(p.gallery.numbered.start || 1));
    const safeEnd = Math.max(
      safeStart,
      Math.floor(p.gallery.numbered.end || safeStart)
    );
    const range = Array.from(
      { length: safeEnd - safeStart + 1 },
      (_, i) => safeStart + i
    );

    const manual = Array.isArray(p.gallery.numbered.order)
      ? p.gallery.numbered.order
      : [];

    if (manual.length === 0) return range;

    const baseOrdered = Array.from(
      new Set(
        manual
          .map((n) => Math.floor(Number(n)))
          .filter((n) => Number.isFinite(n) && n >= safeStart && n <= safeEnd)
      )
    );

    const baseSet = new Set(baseOrdered);
    return [...baseOrdered, ...range.filter((n) => !baseSet.has(n))];
  };

  const moveNumberedOrder = (index: number, direction: -1 | 1) => {
    setDraft((p) => {
      const current = getEffectiveNumberOrder(p);
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return p;
      const tmp = current[index];
      current[index] = current[nextIndex];
      current[nextIndex] = tmp;

      return {
        ...p,
        gallery: {
          ...p.gallery,
          numbered: {
            ...p.gallery.numbered,
            order: current,
          },
        },
      };
    });
  };

  const moveNumberedOrderTo = (fromIndex: number, toIndex: number) => {
    setDraft((p) => {
      const current = getEffectiveNumberOrder(p);
      if (fromIndex < 0 || fromIndex >= current.length) return p;
      if (toIndex < 0 || toIndex >= current.length) return p;
      if (fromIndex === toIndex) return p;

      const [item] = current.splice(fromIndex, 1);
      current.splice(toIndex, 0, item);

      return {
        ...p,
        gallery: {
          ...p.gallery,
          numbered: {
            ...p.gallery.numbered,
            order: current,
          },
        },
      };
    });
  };

  const setManualNumberedOrderFromText = (text: string) => {
    const safeStart = numberedRange[0] ?? 1;
    const safeEnd = numberedRange[numberedRange.length - 1] ?? safeStart;

    const nums = text
      .split(/[\s,]+/)
      .map((x) => Math.floor(Number(x)))
      .filter((n) => Number.isFinite(n) && n >= safeStart && n <= safeEnd);

    const unique = Array.from(new Set(nums));

    setDraft((p) => ({
      ...p,
      gallery: {
        ...p.gallery,
        numbered: {
          ...p.gallery.numbered,
          order: unique,
        },
      },
    }));
  };

  const clearManualNumberedOrder = () => {
    setDraft((p) => ({
      ...p,
      gallery: {
        ...p.gallery,
        numbered: {
          ...p.gallery.numbered,
          order: [],
        },
      },
    }));
  };

  // ─────────────────────────────────────────────
  // Gallery: custom URLs + positioning
  // ─────────────────────────────────────────────
  const addCustomImageUrl = () => {
    const url = normalizeUrlInput(newImageUrl);
    if (!url) return;
    setDraft((prev) => ({
      ...prev,
      gallery: {
        ...prev.gallery,
        mode: "custom",
        customImages: [url, ...prev.gallery.customImages],
      },
    }));
    setNewImageUrl("");
  };

  const removeCustomImageAt = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      gallery: {
        ...prev.gallery,
        customImages: prev.gallery.customImages.filter((_, i) => i !== index),
      },
    }));
  };

  const moveCustomImageTo = (fromIndex: number, toIndex: number) => {
    setDraft((prev) => {
      const list = [...prev.gallery.customImages];
      if (fromIndex < 0 || fromIndex >= list.length) return prev;
      if (toIndex < 0 || toIndex >= list.length) return prev;
      if (fromIndex === toIndex) return prev;
      const [item] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, item);
      return { ...prev, gallery: { ...prev.gallery, customImages: list } };
    });
  };

  const replaceCustomImageUrl = (index: number) => {
    setDraft((prev) => {
      const current = prev.gallery.customImages[index] || "";
      const next = promptForUrl("Replace image URL", current);
      if (next == null) return prev;
      if (!next.trim()) return prev;
      const list = [...prev.gallery.customImages];
      list[index] = next;
      return {
        ...prev,
        gallery: { ...prev.gallery, mode: "custom", customImages: list },
      };
    });
  };

  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragFromNumberedIndex, setDragFromNumberedIndex] = useState<number | null>(null);

  // ─────────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────────
  const inputClass =
    "w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-amber-600 outline-none transition-colors bg-white text-sm";
  const labelClass =
    "block text-[11px] tracking-[0.25em] uppercase text-stone-400 mb-2 font-medium";
  const sectionClass =
    "bg-white border border-stone-200 rounded-2xl shadow-sm p-6 space-y-5";
  const btnPrimary =
    "px-5 py-2.5 bg-stone-900 text-white text-[13px] font-medium hover:bg-stone-800 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const btnSecondary =
    "px-5 py-2.5 border border-stone-200 bg-white text-[13px] text-stone-600 hover:text-stone-800 hover:border-stone-300 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif text-stone-900">Website Settings</h2>
          <p className="text-stone-500 text-sm mt-1">
            Media is served from the repository at
            <code className="mx-1 px-1 py-0.5 bg-stone-100 rounded text-[12px]">public/gallery/</code>.
            Add or replace files there and redeploy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={onResetDefaults} className={btnSecondary}>
            Reset Defaults
          </button>
          <button
            onClick={() => {
              setDraft(settings);
              setSavedAt("");
              setError("");
            }}
            disabled={!isDirty}
            className={btnSecondary}
          >
            Discard
          </button>
          <button onClick={onSave} disabled={!isDirty} className={btnPrimary}>
            Save Changes
          </button>
        </div>
      </div>

      {/* Status */}
      {(error || savedAt) && (
        <div
          className={
            "p-4 rounded-2xl border text-sm " +
            (error
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700")
          }
        >
          {error ? error : `Saved at ${savedAt}`}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Contact Details */}
        <section className={sectionClass}>
          <h4 className="text-[11px] tracking-[0.3em] uppercase text-stone-400 font-semibold">
            Contact Details
          </h4>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Phone (Display)</label>
              <input
                value={draft.contact.phoneDisplay}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    contact: { ...p.contact, phoneDisplay: e.target.value },
                  }))
                }
                className={inputClass}
                placeholder="+27 69 288 8445"
              />
            </div>
            <div>
              <label className={labelClass}>Phone (tel:)</label>
              <input
                value={draft.contact.phoneTel}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    contact: { ...p.contact, phoneTel: e.target.value },
                  }))
                }
                className={inputClass}
                placeholder="+27692888445"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>WhatsApp Digits</label>
              <input
                value={draft.contact.whatsappDigits}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    contact: { ...p.contact, whatsappDigits: e.target.value },
                  }))
                }
                className={inputClass}
                placeholder="27692888445"
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                value={draft.contact.email}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    contact: { ...p.contact, email: e.target.value },
                  }))
                }
                className={inputClass}
                placeholder="info@berlybeauty.co.za"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Hours</label>
            <input
              value={draft.contact.hours}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  contact: { ...p.contact, hours: e.target.value },
                }))
              }
              className={inputClass}
              placeholder="Mon - Sun: 7:00 AM - 7:00 PM"
            />
          </div>

          <div>
            <label className={labelClass}>Address (one line per row)</label>
            <textarea
              rows={3}
              value={draft.contact.addressLines.join("\n")}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  contact: {
                    ...p.contact,
                    addressLines: e.target.value
                      .split("\n")
                      .map((l) => l.trim())
                      .filter(Boolean),
                  },
                }))
              }
              className={inputClass + " resize-none"}
            />
          </div>

          <div>
            <label className={labelClass}>Google Maps URL</label>
            <input
              value={draft.contact.mapUrl}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  contact: { ...p.contact, mapUrl: e.target.value },
                }))
              }
              className={inputClass}
            />
            <a
              href={draft.contact.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-[12px] text-amber-700 hover:text-amber-800"
            >
              Preview map link →
            </a>
          </div>
        </section>

        {/* Social & Hero */}
        <section className={sectionClass}>
          <h4 className="text-[11px] tracking-[0.3em] uppercase text-stone-400 font-semibold">
            Social Links
          </h4>

          <div>
            <label className={labelClass}>Instagram URL</label>
            <input
              value={draft.socials.instagramUrl}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  socials: { ...p.socials, instagramUrl: e.target.value },
                }))
              }
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Facebook URL</label>
            <input
              value={draft.socials.facebookUrl}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  socials: { ...p.socials, facebookUrl: e.target.value },
                }))
              }
              className={inputClass}
            />
          </div>

          <div className="pt-4 border-t border-stone-100">
            <h4 className="text-[11px] tracking-[0.3em] uppercase text-stone-400 font-semibold mb-5">
              Hero Background
            </h4>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Hero Video URL</label>
                <input
                  value={draft.media.heroVideoUrl}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      media: { ...p.media, heroVideoUrl: e.target.value },
                    }))
                  }
                  className={inputClass}
                  placeholder="/gallery/1.mp4"
                />
                <p className="mt-1.5 text-[11px] text-stone-400">
                  Tip: put your file at
                  <code className="mx-1 px-1 py-0.5 bg-stone-100 rounded">
                    public/gallery/1.mp4
                  </code>
                  then use
                  <code className="mx-1 px-1 py-0.5 bg-stone-100 rounded">
                    /gallery/1.mp4
                  </code>
                  here.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Video Fit</label>
                  <select
                    value={draft.media.heroVideoFit}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        media: {
                          ...p.media,
                          heroVideoFit:
                            e.target.value as SiteSettings["media"]["heroVideoFit"],
                        },
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="cover">Cover (fills, may crop)</option>
                    <option value="contain">Contain (full, no crop)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Video Position</label>
                  <input
                    value={draft.media.heroVideoPosition}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        media: { ...p.media, heroVideoPosition: e.target.value },
                      }))
                    }
                    className={inputClass}
                    placeholder="50% 15%"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Poster Image URL</label>
                <input
                  value={draft.media.heroPosterUrl}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      media: { ...p.media, heroPosterUrl: e.target.value },
                    }))
                  }
                  className={inputClass}
                  placeholder="/gallery/1.jpeg"
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Appointments */}
      <section className={sectionClass}>
        <h4 className="text-[11px] tracking-[0.3em] uppercase text-stone-400 font-semibold">
          Appointments
        </h4>
        <p className="text-stone-500 text-sm mt-2">
          Bookings are handled via WhatsApp only.
        </p>
      </section>

      {/* Promotions / Specials */}
      <section className={sectionClass}>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h4 className="text-[11px] tracking-[0.3em] uppercase text-stone-400 font-semibold">
              Promotions / Specials
            </h4>
            <p className="text-stone-500 text-sm mt-2">
              Add specials that show on the public website (use an expiry date if
              needed). Add images by using a URL or by placing an image inside
              <code className="mx-1 px-1 py-0.5 bg-stone-100 rounded text-[12px]">
                public/gallery/
              </code>
              and referencing it like
              <code className="mx-1 px-1 py-0.5 bg-stone-100 rounded text-[12px]">
                /gallery/promo1.jpeg
              </code>
              .
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.promotions.enabled}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    promotions: { ...p.promotions, enabled: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
              />
              Enabled
            </label>
            <button type="button" onClick={addPromotion} className={btnPrimary}>
              Add Special
            </button>
          </div>
        </div>

        {draft.promotions.items.length === 0 ? (
          <div className="mt-5 p-10 border border-dashed border-stone-200 rounded-2xl text-center text-stone-400 text-sm">
            No specials yet. Click “Add Special” to create one.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {draft.promotions.items.map((item, idx) => (
              <div
                key={item.id}
                className="rounded-2xl border border-stone-200 bg-stone-50 overflow-hidden"
              >
                <div className="p-5 bg-white flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] tracking-[0.25em] uppercase text-stone-400 font-semibold">
                      Special {idx + 1}
                    </p>
                    <div className="mt-3 grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Title</label>
                        <input
                          value={item.title}
                          onChange={(e) =>
                            updatePromotion(item.id, { title: e.target.value })
                          }
                          className={inputClass}
                          placeholder="e.g. Wigs Install Special"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Badge</label>
                        <input
                          value={item.badge}
                          onChange={(e) =>
                            updatePromotion(item.id, { badge: e.target.value })
                          }
                          className={inputClass}
                          placeholder="Special"
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className={labelClass}>Description</label>
                      <textarea
                        rows={3}
                        value={item.description}
                        onChange={(e) =>
                          updatePromotion(item.id, {
                            description: e.target.value,
                          })
                        }
                        className={inputClass + " resize-none"}
                        placeholder="Describe the promotion..."
                      />
                    </div>
                    <div className="mt-4 grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>CTA Text</label>
                        <input
                          value={item.ctaText}
                          onChange={(e) =>
                            updatePromotion(item.id, { ctaText: e.target.value })
                          }
                          className={inputClass}
                          placeholder="Book on WhatsApp"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Valid Until (optional)</label>
                        <input
                          type="date"
                          value={item.validUntil ? item.validUntil.slice(0, 10) : ""}
                          onChange={(e) =>
                            updatePromotion(item.id, {
                              validUntil: e.target.value
                                ? new Date(e.target.value + "T00:00:00").toISOString()
                                : "",
                            })
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-[300px] flex-shrink-0">
                    <label className={labelClass}>Image URL (optional)</label>
                    <input
                      value={item.imageUrl}
                      onChange={(e) =>
                        updatePromotion(item.id, { imageUrl: e.target.value })
                      }
                      className={inputClass}
                      placeholder="/gallery/promo1.jpeg or https://..."
                    />

                    <div className="mt-3 rounded-2xl border border-stone-200 bg-stone-100 overflow-hidden">
                      <div className="aspect-[4/3] relative">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt="Promotion"
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-sm">
                            No image
                          </div>
                        )}
                      </div>
                    </div>

                    {item.imageUrl ? (
                      <div className="mt-3 flex items-center gap-2">
                        <a
                          href={item.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[12px] text-amber-700 hover:text-amber-800"
                        >
                          Open image →
                        </a>
                        <button
                          type="button"
                          onClick={() => updatePromotion(item.id, { imageUrl: "" })}
                          className={btnSecondary}
                        >
                          Clear
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="px-5 py-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => movePromotion(item.id, -1)}
                      disabled={idx === 0}
                      className={btnSecondary}
                    >
                      Move Up
                    </button>
                    <button
                      type="button"
                      onClick={() => movePromotion(item.id, 1)}
                      disabled={idx === draft.promotions.items.length - 1}
                      className={btnSecondary}
                    >
                      Move Down
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePromotion(item.id)}
                    className={
                      btnSecondary + " hover:text-red-600 hover:border-red-200"
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Gallery */}
      <section className={sectionClass}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h4 className="text-[11px] tracking-[0.3em] uppercase text-stone-400 font-semibold">
              Gallery (Our Work)
            </h4>
            <p className="text-stone-500 text-sm mt-2">
              Recommended (free): use <b>Numbered</b> mode and put files in
              <code className="mx-1 px-1 py-0.5 bg-stone-100 rounded text-[12px]">
                public/gallery/
              </code>
              (e.g. <code className="px-1 py-0.5 bg-stone-100 rounded">1.jpeg</code>,
              <code className="px-1 py-0.5 bg-stone-100 rounded">2.jpeg</code>,
              <code className="px-1 py-0.5 bg-stone-100 rounded">nails.mp4</code>)
              and redeploy.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-stone-500">Mode</label>
            <select
              value={draft.gallery.mode}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  gallery: {
                    ...p.gallery,
                    mode: e.target.value as SiteSettings["gallery"]["mode"],
                  },
                }))
              }
              className="px-3 py-2 border border-stone-200 bg-white text-sm rounded-xl outline-none focus:border-amber-600"
            >
              <option value="numbered">Numbered (internal)</option>
              <option value="custom">Custom (URLs)</option>
            </select>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 pt-2">
          {/* Controls */}
          <div className="lg:col-span-1 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Initial Count</label>
                <input
                  type="number"
                  min={4}
                  max={60}
                  value={draft.gallery.initialCount}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      gallery: {
                        ...p.gallery,
                        initialCount: clampInt(e.target.value, 4, 60),
                      },
                    }))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Load More Size</label>
                <input
                  type="number"
                  min={4}
                  max={60}
                  value={draft.gallery.pageSize}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      gallery: {
                        ...p.gallery,
                        pageSize: clampInt(e.target.value, 4, 60),
                      },
                    }))
                  }
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Tile Fit</label>
              <select
                value={draft.gallery.tileFit}
                onChange={(e) =>
                  setDraft((p) => ({
                    ...p,
                    gallery: {
                      ...p.gallery,
                      tileFit: e.target.value as SiteSettings["gallery"]["tileFit"],
                    },
                  }))
                }
                className={inputClass}
              >
                <option value="cover">Fill tile (may crop)</option>
                <option value="contain">Fit entire image (no crop)</option>
              </select>
            </div>

            {/* Cache buster */}
            <div className="p-5 border border-stone-200 bg-stone-50 rounded-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-stone-700 font-medium">
                    Refresh Gallery Images
                  </p>
                  <p className="text-[12px] text-stone-500 mt-1">
                    If you replaced internal files and redeployed, click refresh so
                    visitors load the latest versions.
                  </p>
                  <p className="text-[11px] text-stone-400 mt-2">
                    Current version:{" "}
                    <span className="text-stone-600 font-medium">
                      {draft.gallery.assetVersion ?? 1}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      gallery: {
                        ...p.gallery,
                        assetVersion: (p.gallery.assetVersion ?? 1) + 1,
                      },
                    }))
                  }
                  className={btnSecondary}
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Featured nails designs (images) */}
            <div className="p-5 border border-stone-200 bg-stone-50 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm text-stone-700 font-medium">Featured Nails Designs</p>
                  <p className="text-[12px] text-stone-500 mt-1">
                    These images show in the “Our Work” section under a Featured block.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // One-click: pull from the current gallery list so it always shows something
                      const list =
                        draft.gallery.mode === "custom"
                          ? draft.gallery.customImages
                          : buildGalleryImageList(draft);

                      setDraft((p) => ({
                        ...p,
                        gallery: {
                          ...p.gallery,
                          featuredNails: {
                            ...p.gallery.featuredNails,
                            enabled: true,
                            title: p.gallery.featuredNails.title || "Nails Designs",
                            imageUrls: list.slice(0, 8),
                          },
                          featuredVideo: { ...p.gallery.featuredVideo, enabled: false },
                        },
                      }));
                    }}
                    className={btnSecondary}
                  >
                    Use from Gallery
                  </button>

                  <label className="inline-flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={draft.gallery.featuredNails.enabled}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          gallery: {
                            ...p.gallery,
                            featuredNails: {
                              ...p.gallery.featuredNails,
                              enabled: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                    />
                    Enabled
                  </label>
                </div>
              </div>

              <div>
                <label className={labelClass}>Title</label>
                <input
                  value={draft.gallery.featuredNails.title}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      gallery: {
                        ...p.gallery,
                        featuredNails: {
                          ...p.gallery.featuredNails,
                          title: e.target.value,
                        },
                      },
                    }))
                  }
                  className={inputClass}
                  placeholder="Nails Designs"
                />
              </div>

              <div>
                <label className={labelClass}>Image URLs (one per line)</label>
                <textarea
                  rows={4}
                  value={(draft.gallery.featuredNails.imageUrls || []).join("\n")}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      gallery: {
                        ...p.gallery,
                        featuredNails: {
                          ...p.gallery.featuredNails,
                          imageUrls: e.target.value
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean),
                        },
                        // Ensure legacy video is off when using nails images.
                        featuredVideo: { ...p.gallery.featuredVideo, enabled: false },
                      },
                    }))
                  }
                  className={inputClass + " resize-none"}
                  placeholder="/gallery/nails1.jpeg\n/gallery/nails2.jpeg\nhttps://..."
                />
                <p className="text-[11px] text-stone-400 mt-2">
                  Tip: add internal files to <code className="px-1 py-0.5 bg-stone-100 rounded">public/gallery/</code> and reference them like <code className="px-1 py-0.5 bg-stone-100 rounded">/gallery/nails1.jpeg</code>.
                </p>
              </div>

              {/* Preview */}
              {draft.gallery.featuredNails.imageUrls?.length ? (
                <div className="grid grid-cols-4 gap-2">
                  {draft.gallery.featuredNails.imageUrls.slice(0, 8).map((src, idx) => {
                    const failed = !!nailsPreviewFailed[src];

                    return (
                      <div
                        key={`${src}_${idx}`}
                        className="relative aspect-square rounded-xl border border-stone-200 bg-white overflow-hidden"
                        title={src}
                      >
                        {!failed ? (
                          <img
                            src={src}
                            alt={`Nails design ${idx + 1}`}
                            className={
                              "absolute inset-0 w-full h-full " +
                              (draft.gallery.tileFit === "contain"
                                ? "object-contain bg-black/5"
                                : "object-cover")
                            }
                            loading="lazy"
                            decoding="async"
                            onError={() =>
                              setNailsPreviewFailed((p) => ({ ...p, [src]: true }))
                            }
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-stone-50 text-stone-400 text-[11px] text-center px-2">
                            Missing image
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 border border-dashed border-stone-200 rounded-2xl text-center text-stone-400 text-sm">
                  Add nail design image URLs to display a featured nails section on the website.
                </div>
              )}
            </div>

            {/* Mode-specific controls */}
            {draft.gallery.mode === "numbered" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-stone-600 font-medium">
                    Internal (public/gallery)
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        gallery: {
                          ...p.gallery,
                          mode: "numbered",
                          initialCount: 11,
                          pageSize: 12,
                          numbered: {
                            ...p.gallery.numbered,
                            folder: "/gallery",
                            start: 1,
                            end: 50,
                            extension: "jpeg",
                            order: [],
                          },
                          featuredNails: {
                            ...p.gallery.featuredNails,
                            enabled: true,
                            title: "Nails Designs",
                            imageUrls: [
                              "/gallery/nails1.jpeg",
                              "/gallery/nails2.jpeg",
                              "/gallery/nails3.jpeg",
                            ],
                          },
                          featuredVideo: {
                            ...p.gallery.featuredVideo,
                            enabled: false,
                          },
                        },
                      }))
                    }
                    className={btnSecondary}
                  >
                    Use Defaults
                  </button>
                </div>

                <div>
                  <label className={labelClass}>Folder</label>
                  <input
                    value={draft.gallery.numbered.folder}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        gallery: {
                          ...p.gallery,
                          numbered: {
                            ...p.gallery.numbered,
                            folder: e.target.value,
                          },
                        },
                      }))
                    }
                    className={inputClass}
                    placeholder="/gallery"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Start</label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={draft.gallery.numbered.start}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          gallery: {
                            ...p.gallery,
                            numbered: {
                              ...p.gallery.numbered,
                              start: clampInt(e.target.value, 1, 999),
                              order: [],
                            },
                          },
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>End</label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={draft.gallery.numbered.end}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          gallery: {
                            ...p.gallery,
                            numbered: {
                              ...p.gallery.numbered,
                              end: clampInt(e.target.value, 1, 999),
                              order: [],
                            },
                          },
                        }))
                      }
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Ext</label>
                    <input
                      value={draft.gallery.numbered.extension}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          gallery: {
                            ...p.gallery,
                            numbered: {
                              ...p.gallery.numbered,
                              extension: e.target.value.replace(".", ""),
                              order: [],
                            },
                          },
                        }))
                      }
                      className={inputClass}
                      placeholder="jpeg"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-stone-700 font-medium">
                        Image Positioning
                      </p>
                      <p className="text-[12px] text-stone-500 mt-1">
                        Reorder internal numbered images without renaming files.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={clearManualNumberedOrder}
                      className={btnSecondary}
                    >
                      Reset Order
                    </button>
                  </div>

                  <div>
                    <label className={labelClass}>Manual Order (optional)</label>
                    <textarea
                      rows={2}
                      value={(draft.gallery.numbered.order || []).join(", ")}
                      onChange={(e) => setManualNumberedOrderFromText(e.target.value)}
                      className={inputClass + " resize-none"}
                      placeholder="Example: 5, 1, 2, 10"
                    />
                    <p className="text-[11px] text-stone-400 mt-2">
                      Leave empty to use natural order.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {effectiveNumberOrder.slice(0, 24).map((n, idx) => (
                      <div
                        key={`${n}_${idx}`}
                        draggable
                        onDragStart={(e) => {
                          setDragFromNumberedIndex(idx);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(idx));
                        }}
                        onDragOver={(e) => {
                          if (dragFromNumberedIndex === null) return;
                          if (dragFromNumberedIndex === idx) return;
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragFromNumberedIndex === null) return;
                          moveNumberedOrderTo(dragFromNumberedIndex, idx);
                          setDragFromNumberedIndex(null);
                        }}
                        onDragEnd={() => setDragFromNumberedIndex(null)}
                        className={
                          "flex items-center justify-between gap-3 px-3 py-2 rounded-xl border bg-white cursor-move select-none transition-colors " +
                          (dragFromNumberedIndex === idx
                            ? "border-amber-400 ring-2 ring-amber-200"
                            : "border-stone-200")
                        }
                        title="Drag to reorder"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-stone-200 bg-stone-50 text-stone-500 flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
                            </svg>
                          </span>
                          <div className="min-w-0">
                            <span className="block text-[11px] tracking-[0.25em] uppercase text-stone-400">
                              Position {idx + 1}
                            </span>
                            <span className="block text-sm text-stone-700 font-medium truncate">
                              Image {n}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveNumberedOrder(idx, -1)}
                            disabled={idx === 0}
                            className="px-2.5 py-1 border border-stone-200 text-stone-600 rounded-lg text-[11px] disabled:opacity-40"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveNumberedOrder(idx, 1)}
                            disabled={idx === effectiveNumberOrder.length - 1}
                            className="px-2.5 py-1 border border-stone-200 text-stone-600 rounded-lg text-[11px] disabled:opacity-40"
                          >
                            Down
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Add Image by URL</label>
                  <div className="flex gap-2">
                    <input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      className={inputClass + " flex-1"}
                      placeholder="https://.../image.jpg or /gallery/12.jpeg"
                    />
                    <button
                      type="button"
                      onClick={addCustomImageUrl}
                      className={btnPrimary}
                    >
                      Add
                    </button>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-2">
                    Tip: you can also point to internal images like
                    <code className="mx-1 px-1 py-0.5 bg-stone-100 rounded">
                      /gallery/12.jpeg
                    </code>
                    after you add them to the project and redeploy.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            {draft.gallery.mode === "custom" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {draft.gallery.customImages.length === 0 ? (
                  <div className="col-span-full p-12 border border-dashed border-stone-200 rounded-2xl text-center text-stone-400 text-sm">
                    No custom images yet. Add URLs above.
                  </div>
                ) : (
                  draft.gallery.customImages.map((src, idx) => (
                    <div
                      key={`${src.slice(0, 24)}_${idx}`}
                      draggable
                      onDragStart={(e) => {
                        setDragFromIndex(idx);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(idx));
                      }}
                      onDragOver={(e) => {
                        if (dragFromIndex === null) return;
                        if (dragFromIndex === idx) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragFromIndex === null) return;
                        moveCustomImageTo(dragFromIndex, idx);
                        setDragFromIndex(null);
                      }}
                      onDragEnd={() => setDragFromIndex(null)}
                      className={
                        "relative group aspect-square border bg-stone-50 overflow-hidden rounded-xl cursor-move select-none transition-colors " +
                        (dragFromIndex === idx
                          ? "border-amber-400 ring-2 ring-amber-200"
                          : "border-stone-200")
                      }
                      title="Drag to reorder"
                    >
                      {draft.gallery.tileFit === "contain" ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
                          <img
                            src={src}
                            alt={`Gallery ${idx + 1}`}
                            className="max-w-full max-h-full object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ) : (
                        <img
                          src={src}
                          alt={`Gallery ${idx + 1}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      )}

                      <div className="absolute inset-x-2 top-2 flex justify-between pointer-events-none">
                        <span className="pointer-events-none inline-flex items-center px-2 py-1 rounded-full bg-white/80 border border-stone-200 text-[10px] tracking-widest uppercase text-stone-600">
                          Drag
                        </span>
                      </div>

                      <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => replaceCustomImageUrl(idx)}
                              className="px-2.5 py-1 bg-white/90 border border-stone-200 text-stone-600 rounded-lg text-[11px]"
                            >
                              Replace URL
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomImageAt(idx)}
                            className="px-2.5 py-1 bg-white/90 border border-stone-200 text-stone-600 rounded-lg text-[11px] hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-stone-600 font-medium">
                    Internal Preview <span className="text-stone-400">(first 24)</span>
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Total: {internalNumberedImages.length}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {internalPreview.map((src, idx) => (
                    <div
                      key={`${src}_${idx}`}
                      data-internal-preview-tile
                      className="relative aspect-square border border-stone-200 bg-stone-50 overflow-hidden rounded-xl"
                    >
                      <img
                        src={src}
                        alt={`Internal ${idx + 1}`}
                        className={
                          "absolute inset-0 w-full h-full " +
                          (draft.gallery.tileFit === "contain"
                            ? "object-contain bg-black/5"
                            : "object-cover")
                        }
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          const tile = (e.currentTarget as HTMLImageElement).closest(
                            "[data-internal-preview-tile]"
                          ) as HTMLElement | null;
                          if (tile) tile.style.display = "none";
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
