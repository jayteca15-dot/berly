import {
  useState,
  useEffect,
  useMemo,
  createContext,
  useContext,
  ReactNode,
  type CSSProperties,
} from "react";
import {
  SiteSettingsProvider,
  buildGalleryImageList,
  useSiteSettings,
} from "./siteSettings";
import { AdminSettingsPanel } from "./admin/AdminSettingsPanel";

// Auth Context
import { adminLogin, adminLogout, adminMe } from "./api/adminAuth";

// Firestore
import {
  addReview as addReviewToFirestore,
  subscribeReviews,
  deleteReview as deleteReviewFromFirestore,
  type FirestoreReview,
} from "./api/firestoreService";

interface AuthContextType {
  isAuthenticated: boolean;
  authChecked: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    adminMe()
      .then((ok) => setIsAuthenticated(ok))
      .finally(() => setAuthChecked(true));
  }, []);

  const login = async (email: string, password: string) => {
    const result = await adminLogin(email, password);
    if (result.ok) {
      setIsAuthenticated(true);
      setAuthChecked(true);
      return { ok: true };
    }
    setIsAuthenticated(false);
    setAuthChecked(true);
    return { ok: false, message: result.message };
  };

  const logout = async () => {
    await adminLogout();
    setIsAuthenticated(false);
    setAuthChecked(true);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, authChecked, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

type Page = "home" | "admin-login" | "admin-dashboard";

/* ─────────────────────────────────────────────
   NAVBAR
   ───────────────────────────────────────────── */
function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const onHero = !scrolled;
  const links = ["Home", "Services", "Specials", "Gallery", "Reviews", "Contact"];

  return (
    <nav
      className={
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500 " +
        (onHero
          ? "bg-stone-950/40 backdrop-blur-md"
          : "bg-white/95 backdrop-blur-md shadow-lg")
      }
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Brand */}
          <a href="#home" className="flex items-center gap-3 group">
            <div
              className={
                "w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all duration-300 " +
                (onHero
                  ? "border-amber-400/60 group-hover:border-amber-300"
                  : "border-amber-700 group-hover:bg-amber-700")
              }
            >
              <span
                className={
                  "font-serif text-lg font-bold transition-colors duration-300 " +
                  (onHero ? "text-amber-300" : "text-amber-700 group-hover:text-white")
                }
              >
                B
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span
                className={
                  "text-lg font-serif tracking-widest transition-colors duration-300 " +
                  (onHero ? "text-white" : "text-stone-800")
                }
              >
                BERLY
              </span>
              <span
                className={
                  "text-[10px] tracking-[0.35em] uppercase transition-colors duration-300 " +
                  (onHero ? "text-white/60" : "text-stone-400")
                }
              >
                Beauty
              </span>
            </div>
          </a>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-8">
            {links.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className={
                  "text-[13px] tracking-widest uppercase font-medium transition-all duration-300 relative group " +
                  (onHero
                    ? "text-white/85 hover:text-white"
                    : "text-stone-500 hover:text-stone-900")
                }
              >
                {item}
                <span
                  className={
                    "absolute -bottom-1 left-0 w-0 h-[2px] transition-all duration-300 group-hover:w-full " +
                    (onHero ? "bg-amber-400" : "bg-amber-700")
                  }
                />
              </a>
            ))}
            <a
              href="#contact"
              className={
                "ml-2 px-7 py-2.5 text-[13px] tracking-widest uppercase font-medium transition-all duration-300 rounded-full " +
                (onHero
                  ? "bg-amber-600 text-white hover:bg-amber-500"
                  : "bg-stone-900 text-white hover:bg-stone-800")
              }
            >
              Book Now
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={
              "lg:hidden w-11 h-11 flex items-center justify-center rounded-full focus:outline-none transition-all " +
              (onHero
                ? "bg-white/15 border border-white/20"
                : "bg-stone-100 border border-stone-200")
            }
            aria-label="Toggle menu"
          >
            <div className="w-5 h-4 relative flex flex-col justify-between">
              <span
                className={
                  "w-full h-[2px] rounded transition-all duration-300 " +
                  (onHero ? "bg-white" : "bg-stone-700") +
                  (isOpen ? " rotate-45 translate-y-[7px]" : "")
                }
              />
              <span
                className={
                  "w-full h-[2px] rounded transition-all duration-300 " +
                  (onHero ? "bg-white" : "bg-stone-700") +
                  (isOpen ? " opacity-0" : "")
                }
              />
              <span
                className={
                  "w-full h-[2px] rounded transition-all duration-300 " +
                  (onHero ? "bg-white" : "bg-stone-700") +
                  (isOpen ? " -rotate-45 -translate-y-[7px]" : "")
                }
              />
            </div>
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className={
            "lg:hidden overflow-hidden transition-all duration-500 " +
            (isOpen ? "max-h-[400px] pb-6" : "max-h-0")
          }
        >
          <div
            className={
              "rounded-2xl p-5 mt-2 space-y-1 " +
              (onHero ? "bg-stone-950/80 backdrop-blur-xl" : "bg-stone-50")
            }
          >
            {links.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setIsOpen(false)}
                className={
                  "block py-2.5 px-3 rounded-xl text-[13px] tracking-widest uppercase font-medium transition-colors " +
                  (onHero
                    ? "text-white/85 hover:text-white hover:bg-white/10"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100")
                }
              >
                {item}
              </a>
            ))}
            <a
              href="#contact"
              onClick={() => setIsOpen(false)}
              className={
                "block mt-3 px-6 py-3 text-[13px] tracking-widest uppercase font-medium text-center rounded-full transition-all " +
                (onHero
                  ? "bg-amber-600 text-white hover:bg-amber-500"
                  : "bg-stone-900 text-white hover:bg-stone-800")
              }
            >
              Book Now
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────────
   HERO
   ───────────────────────────────────────────── */
function Hero() {
  const { settings } = useSiteSettings();
  const poster = settings.media.heroPosterUrl || "/gallery/1.jpeg";
  const videoUrl = settings.media.heroVideoUrl || "/gallery/1.mp4";

  return (
    <section
      id="home"
      className="min-h-screen relative flex items-center bg-stone-950"
    >
      {/* Video background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-stone-950"
          style={{
            backgroundImage: `url('${poster}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <video
          key={videoUrl}
          className="absolute inset-0 w-full h-full"
          style={{
            objectFit: settings.media.heroVideoFit || "cover",
            objectPosition: settings.media.heroVideoPosition || "50% 15%",
          }}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={poster}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>

        {/* Color grade overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/55 to-stone-950/85" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(1000px 500px at 20% 20%, rgba(245, 158, 11, 0.18), transparent 55%), radial-gradient(1000px 600px at 80% 30%, rgba(255, 255, 255, 0.08), transparent 55%)" }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-32 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-9 bb-fade-up">
            <div className="space-y-3">
              <p className="text-amber-300/95 text-[13px] tracking-[0.35em] uppercase font-medium">
                Berly Beauty
              </p>
              <div className="w-12 h-[2px] bg-amber-400/70" />
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.06]">
              Embrace Your
              <span className="block italic text-amber-300/95">Crown &amp; Culture</span>
            </h1>

            <p className="text-lg text-white/70 leading-relaxed max-w-xl">
              Expert hair braiding, wigs, locs, nails and African attire — crafted with care, finished to perfection, and styled to celebrate your beauty.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a
                href="#contact"
                className="group px-9 py-4 bg-amber-600 text-white text-[13px] tracking-widest uppercase font-medium hover:bg-amber-500 transition-all duration-300 text-center rounded-full bb-soft-shadow"
              >
                <span className="flex items-center justify-center gap-2">
                  Book Now
                  <svg
                    className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </span>
              </a>
              <a
                href="#services"
                className="px-9 py-4 border border-white/25 text-white/85 text-[13px] tracking-widest uppercase font-medium hover:border-white/50 hover:text-white transition-all duration-300 text-center rounded-full"
              >
                Explore Services
              </a>
            </div>

            <div className="pt-4">
              <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bb-glass">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/10 border border-white/15">
                  <svg className="w-4 h-4 text-amber-300/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 21s-8-4.5-8-11a8 8 0 0116 0c0 6.5-8 11-8 11z" />
                  </svg>
                </span>
                <div>
                  <p className="text-[11px] tracking-[0.35em] uppercase text-white/60">Location</p>
                  <p className="text-sm text-white/85">Pretoria North</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:flex items-center justify-center">
            <div className="w-80 h-80 rounded-full border border-white/10 flex items-center justify-center bb-float">
              <div className="w-64 h-64 rounded-full border border-amber-400/20 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto border border-amber-400/30 rounded-full flex items-center justify-center bg-white/5">
                    <svg
                      className="w-8 h-8 text-amber-300/70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                  </div>
                  <p className="text-white/45 text-[11px] tracking-[0.4em] uppercase">
                    Quality • Craft • Care
                  </p>
                </div>
              </div>
            </div>

            {/* subtle corner badge */}
            <div className="absolute -bottom-6 -right-2 bb-glass rounded-2xl px-5 py-4 bb-soft-shadow">
              <p className="text-[11px] tracking-[0.35em] uppercase text-white/60">Bookings</p>
              <p className="text-white/85 text-sm mt-1">Via WhatsApp</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   SERVICES
   ───────────────────────────────────────────── */
function Services() {
  const services = [
    {
      key: "wigs", title: "Premium Wigs", category: "Hair",
      description: "High-quality wigs expertly installed and styled for a natural finish and confident wear.",
      price: "Starts from R450",
      highlights: ["Lace Front", "Custom Coloring", "Install & Styling"],
      icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
      featured: true,
    },
    {
      key: "braids", title: "Braids", category: "Hair",
      description: "Classic and modern braiding styles executed with neat parts, smooth finishes and lasting hold.",
      price: "Starts from R250",
      highlights: ["Knotless", "Box Braids", "Cornrows"],
      icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>),
      featured: true,
    },
    {
      key: "bohemia", title: "Bohemia Braids", category: "Hair",
      description: "Soft, romantic braids with wavy ends for an effortless boho finish.",
      highlights: ["Boho Knotless", "Wavy Ends", "Custom Length"],
      icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>),
    },
    {
      key: "locs", title: "Locs", category: "Hair",
      description: "Installations, retwists and styling that support healthy growth and a clean look.",
      highlights: ["Installations", "Retwists", "Interlocking"],
      icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>),
    },
    {
      key: "microbonding", title: "Microbonding", category: "Hair",
      description: "Seamless extensions for natural-looking length and volume.",
      highlights: ["Nano Tips", "I-Tip", "Maintenance"],
      icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>),
    },
    {
      key: "nails", title: "Nails", category: "Beauty",
      description: "Clean, detailed finishes from everyday sets to statement nail art.",
      highlights: ["Gel", "Acrylic", "Nail Art"],
      icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>),
    },
    {
      key: "attire", title: "African Attire", category: "Fashion",
      description: "Custom design and tailoring using authentic fabrics — made to fit.",
      highlights: ["Design", "Sewing", "Alterations"],
      icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>),
    },
    {
      key: "massage", title: "Massage", category: "Wellness",
      description: "Relaxing treatments designed to relieve tension and support recovery.",
      highlights: ["Deep Tissue", "Swedish", "Aromatherapy"],
      icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>),
    },
    {
      key: "makeup", title: "Makeup", category: "Beauty",
      description: "Professional makeup for events, bridal and photoshoots — camera-ready.",
      highlights: ["Bridal", "Everyday Glam", "Events"],
      icon: (<svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>),
    },
  ];

  const featured = services.filter((s) => s.featured);
  const standard = services.filter((s) => !s.featured);

  return (
    <section id="services" className="py-28 bg-gradient-to-b from-white via-stone-50 to-white bb-section">
      <div className="bb-grid-overlay" />
      <div className="bb-noise-overlay" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
        {/* Header */}
        <div
          className="max-w-2xl mb-16 bb-reveal"
          style={{ "--bb-delay": "0ms" } as CSSProperties}
        >
          <p className="text-amber-700 text-[13px] tracking-[0.35em] uppercase font-medium mb-4">Our Expertise</p>
          <h2 className="text-4xl md:text-5xl font-serif text-stone-900 leading-tight">Services &amp; Treatments</h2>
          <div className="w-12 h-[2px] bg-amber-600 mt-6 mb-6" />
          <p className="text-stone-500 leading-relaxed">
            A curated list of what we do best. For services without listed pricing, please enquire — final cost depends on length, design complexity and finishing.
          </p>
        </div>

        {/* Featured */}
        <div className="grid gap-5 lg:grid-cols-2 mb-6">
          {featured.map((s) => (
            <div key={s.key} className="group relative overflow-hidden rounded-3xl bg-white border border-stone-200/80 hover:shadow-2xl hover:shadow-stone-200/50 transition-all duration-500">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-500/8 blur-3xl" />
              </div>
              <div className="relative p-8 md:p-10">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.35em] text-stone-400 font-medium">{s.category}</p>
                    <h3 className="text-2xl md:text-3xl font-serif text-stone-900 mt-2">{s.title}</h3>
                  </div>
                  {s.price && (
                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[13px] font-medium bg-amber-50 text-amber-800 border border-amber-100/80">
                      {s.price}
                    </span>
                  )}
                </div>
                <p className="text-stone-500 mt-4 leading-relaxed">{s.description}</p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {s.highlights.map((h) => (
                    <span key={h} className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] text-stone-600 bg-stone-50 border border-stone-200/80">{h}</span>
                  ))}
                </div>
                <div className="mt-8 flex items-center gap-4">
                  <a href="#contact" className="px-7 py-3 bg-stone-900 text-white text-[12px] tracking-[0.25em] uppercase font-medium hover:bg-stone-800 transition-colors rounded-full">Book Now</a>
                  <a href="#contact" className="inline-flex items-center gap-2 text-[12px] tracking-[0.25em] uppercase font-medium text-stone-400 hover:text-amber-700 transition-colors">
                    Enquire
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Standard */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {standard.map((s) => (
            <div key={s.key} className="group rounded-3xl bg-white border border-stone-200/80 hover:shadow-xl hover:shadow-stone-200/50 hover:-translate-y-0.5 transition-all duration-500">
              <div className="p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.35em] text-stone-400 font-medium">{s.category}</p>
                    <h3 className="text-xl font-serif text-stone-900 mt-2 group-hover:text-amber-800 transition-colors">{s.title}</h3>
                  </div>
                  <div className="w-11 h-11 rounded-2xl border border-stone-200 flex items-center justify-center text-stone-400 bg-stone-50 group-hover:bg-amber-600 group-hover:border-amber-600 group-hover:text-white transition-all duration-300">
                    {s.icon}
                  </div>
                </div>
                <div className="mt-4">
                  {s.price ? (
                    <span className="text-amber-800 font-medium text-sm">{s.price}</span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-stone-50 text-stone-500 border border-stone-200/80">Enquire</span>
                  )}
                </div>
                <p className="text-stone-500 text-sm leading-relaxed mt-4">{s.description}</p>
                <ul className="mt-5 space-y-2">
                  {s.highlights.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-stone-600">
                      <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  <a href="#contact" className="inline-flex items-center gap-2 text-[12px] tracking-[0.2em] uppercase font-medium text-stone-400 hover:text-amber-700 transition-colors">
                    Book Now
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   GALLERY
   ───────────────────────────────────────────── */
function Specials() {
  const { settings } = useSiteSettings();

  const items = useMemo(() => {
    if (!settings.promotions?.enabled) return [];
    const now = Date.now();
    return (settings.promotions.items || [])
      .filter((x) => {
        if (!x) return false;
        if (!x.title?.trim()) return false;
        if (!x.validUntil) return true;
        const t = new Date(x.validUntil).getTime();
        return Number.isNaN(t) ? true : t >= now;
      })
      .slice(0, 12);
  }, [settings.promotions]);

  return (
    <section id="specials" className="py-24 bg-white bb-section">
      <div className="bb-noise-overlay" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 bb-reveal" style={{ "--bb-delay": "60ms" } as CSSProperties}>
          <div className="max-w-2xl">
            <p className="text-amber-700 text-[13px] tracking-[0.35em] uppercase font-medium mb-4">Special Offers</p>
            <h2 className="text-4xl md:text-5xl font-serif text-stone-900 leading-tight">Specials</h2>
            <div className="w-12 h-[2px] bg-amber-600 mt-6 mb-6" />
            <p className="text-stone-500 leading-relaxed">
              Limited-time promotions and seasonal offers. Book on WhatsApp to secure your slot.
            </p>
          </div>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 text-[13px] tracking-widest uppercase font-medium text-stone-400 hover:text-amber-700 transition-colors"
          >
            Book on WhatsApp
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>

        {!settings.promotions?.enabled ? (
          <div className="p-10 rounded-3xl border border-stone-200 bg-stone-50 text-center">
            <p className="text-stone-600 font-medium">Specials are currently unavailable.</p>
            <p className="text-stone-500 text-sm mt-1">Please check back soon.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 rounded-3xl border border-stone-200 bg-stone-50 text-center">
            <p className="text-stone-600 font-medium">No current specials.</p>
            <p className="text-stone-500 text-sm mt-1">Follow us on social media for announcements.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((p) => (
              <div
                key={p.id}
                className="group rounded-3xl overflow-hidden border border-stone-200 bg-white hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-500"
              >
                <div className="relative h-48 bg-stone-100">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-sm">
                      Add an image in Admin Settings
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                  {(p.badge || "").trim() ? (
                    <span className="absolute top-4 left-4 inline-flex items-center px-3 py-1.5 rounded-full text-[11px] tracking-widest uppercase font-medium bg-white/85 text-stone-900 border border-white/60">
                      {p.badge}
                    </span>
                  ) : null}
                </div>

                <div className="p-6">
                  <h3 className="font-serif text-xl text-stone-900 group-hover:text-amber-800 transition-colors">
                    {p.title}
                  </h3>
                  {p.description?.trim() ? (
                    <p className="text-stone-500 text-sm leading-relaxed mt-3 whitespace-pre-wrap">
                      {p.description}
                    </p>
                  ) : (
                    <p className="text-stone-400 text-sm mt-3">Details coming soon.</p>
                  )}

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <a
                      href="#contact"
                      className="inline-flex items-center gap-2 text-[12px] tracking-[0.25em] uppercase font-medium text-stone-400 hover:text-amber-700 transition-colors"
                    >
                      {(p.ctaText || "Book Now").trim()}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </a>
                    {p.validUntil ? (
                      <span className="text-[11px] text-stone-400">
                        Valid until {new Date(p.validUntil).toLocaleDateString("en-ZA", {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   GALLERY
   ───────────────────────────────────────────── */
function Gallery() {
  const { settings } = useSiteSettings();

  const allImages = buildGalleryImageList(settings);
  const totalImages = allImages.length;
  const pageSize = settings.gallery.pageSize ?? 12;
  const initialCount = settings.gallery.initialCount ?? 11;

  const [visibleCount, setVisibleCount] = useState(initialCount);
  const [failed, setFailed] = useState<string[]>([]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Gallery tile fit is controlled by admin settings only.
  const effectiveFit = settings.gallery.tileFit ?? "cover";

  useEffect(() => { setVisibleCount(initialCount); }, [initialCount, settings.gallery.mode]);
  useEffect(() => { setFailed([]); }, [settings.gallery.mode, settings.gallery.numbered.end, settings.gallery.customImages.length]);

  const rawVisible = allImages.slice(0, visibleCount);
  const images = useMemo(() => {
    const failedSet = new Set(failed);
    return rawVisible.filter((src) => !failedSet.has(src));
  }, [rawVisible, failed]);

  const featuredNails = settings.gallery.featuredNails;

  const [nailsFailed, setNailsFailed] = useState<string[]>([]);

  // Reset nails failures when the list changes or version bumps
  useEffect(() => {
    setNailsFailed([]);
  }, [
    settings.gallery.assetVersion,
    JSON.stringify(settings.gallery.featuredNails?.imageUrls || []),
  ]);

  const normalizeFeaturedUrl = (input: string): string => {
    let url = (input || "").trim();
    if (!url) return "";

    const folder = settings.gallery.numbered.folder || "/gallery";
    const ext = (settings.gallery.numbered.extension || "jpeg").replace(/^\./, "");

    // Allow shorthand numbers like: "12" -> /gallery/12.jpeg
    if (/^\d+$/.test(url)) {
      url = `${folder}/${url}.${ext}`;
    }

    // Allow file names like: "nails1.jpeg" or "nails1" (assume /gallery/)
    if (!/^https?:\/\//i.test(url)) {
      if (url.startsWith("gallery/")) url = `/${url}`;
      if (!url.startsWith("/")) {
        if (!url.includes("/")) url = `/gallery/${url}`;
        else url = `/${url}`;
      }

      // If it's an internal path without an extension, append the configured extension.
      const pathOnly = url.split("?")[0];
      const last = pathOnly.split("/").pop() || "";
      if (last && !last.includes(".")) {
        url = `${pathOnly}.${ext}${url.includes("?") ? url.slice(url.indexOf("?")) : ""}`;
      }
    }

    // Cache-bust internal gallery assets
    const v = typeof settings.gallery.assetVersion === "number" ? settings.gallery.assetVersion : 1;
    const isInternal = url.startsWith("/gallery/") || url.startsWith(folder + "/");

    if (isInternal) {
      if (/[?&]v=\d+/.test(url)) {
        url = url.replace(/([?&]v=)\d+/, `$1${v}`);
      } else {
        url += url.includes("?") ? `&v=${v}` : `?v=${v}`;
      }
    }

    return url;
  };

  const nailsAll = useMemo(() => {
    const list = (featuredNails?.imageUrls || [])
      .map(normalizeFeaturedUrl)
      .filter(Boolean);
    // Deduplicate (keep order)
    return Array.from(new Set(list));
  }, [featuredNails?.imageUrls, settings.gallery.assetVersion]);

  const nailsImages = useMemo(() => {
    const failedSet = new Set(nailsFailed);
    return nailsAll.filter((src) => !failedSet.has(src));
  }, [nailsAll, nailsFailed]);

  const mosaic = [
    "col-span-6 md:col-span-4 row-span-2",
    "col-span-6 md:col-span-4 row-span-1",
    "col-span-6 md:col-span-4 row-span-1",
    "col-span-6 md:col-span-4 row-span-2",
    "col-span-6 md:col-span-8 row-span-2",
    "col-span-6 md:col-span-4 row-span-2",
    "col-span-6 md:col-span-4 row-span-1",
    "col-span-6 md:col-span-4 row-span-1",
  ];

  const [lightboxItems, setLightboxItems] = useState<string[]>([]);

  const openLightbox = (list: string[], index: number) => {
    setLightboxItems(list);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };
  const closeLightbox = () => setLightboxOpen(false);

  const next = () => {
    setLightboxIndex((i) =>
      lightboxItems.length ? (i + 1) % lightboxItems.length : 0
    );
  };
  const prev = () => {
    setLightboxIndex((i) =>
      lightboxItems.length
        ? (i - 1 + lightboxItems.length) % lightboxItems.length
        : 0
    );
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen, lightboxItems.length]);

  const lightboxSrc = lightboxItems[lightboxIndex];

  return (
    <section id="gallery" className="py-28 bg-gradient-to-b from-white via-stone-50 to-white bb-section">
      <div className="bb-grid-overlay" />
      <div className="bb-noise-overlay" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16 bb-reveal" style={{ "--bb-delay": "80ms" } as CSSProperties}>
          <div className="max-w-2xl">
            <p className="text-amber-700 text-[13px] tracking-[0.35em] uppercase font-medium mb-4">Portfolio</p>
            <h2 className="text-4xl md:text-5xl font-serif text-stone-900 leading-tight">Our Work</h2>
            <div className="w-12 h-[2px] bg-amber-600 mt-6 mb-6" />
            <p className="text-stone-500 leading-relaxed">A curated collection of our work. Tap an image to view it in full.</p>
          </div>

          <div className="flex items-center justify-start md:justify-end">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-stone-50 border border-stone-200 text-[12px] text-stone-500">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Tap an image to view full size
            </span>
          </div>
        </div>

        {/* Image grid */}
        <div className="grid grid-cols-12 gap-2.5 md:gap-3 auto-rows-[110px] sm:auto-rows-[130px] md:auto-rows-[150px] lg:auto-rows-[170px]" style={{ gridAutoFlow: "dense" }}>
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => openLightbox(images, index)}
              data-gallery-tile
              className={
                mosaic[index % mosaic.length] +
                " relative overflow-hidden rounded-2xl bg-stone-100 border border-stone-100 hover:shadow-xl transition-all duration-500 focus:outline-none group"
              }
              aria-label={`Open gallery image ${index + 1}`}
            >
              {effectiveFit === "contain" ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                  <img
                    src={src}
                    alt={`Berly Beauty work ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="max-w-full max-h-full object-contain"
                    onError={() =>
                      setFailed((prev) => (prev.includes(src) ? prev : [...prev, src]))
                    }
                  />
                </div>
              ) : (
                <img
                  src={src}
                  alt={`Berly Beauty work ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  onError={() =>
                    setFailed((prev) => (prev.includes(src) ? prev : [...prev, src]))
                  }
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                <span className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                    />
                  </svg>
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Featured nails designs */}
        {featuredNails?.enabled ? (
          <div className="mt-12 max-w-5xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-stone-400 font-medium">Featured</p>
                <h3 className="text-xl font-serif text-stone-900 mt-1">{featuredNails.title || "Nails Designs"}</h3>
              </div>
              <a
                href="#contact"
                className="hidden sm:inline-flex items-center gap-2 text-[12px] tracking-[0.2em] uppercase font-medium text-stone-400 hover:text-amber-700 transition-colors"
              >
                Book Now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>

            {nailsImages.length === 0 ? (
              <div className="p-10 rounded-3xl border border-stone-200 bg-white text-center">
                <p className="text-stone-700 font-medium">Nails designs will appear here.</p>
                <p className="text-stone-500 text-sm mt-1">
                  Add your nail images in Admin → Website Settings → Gallery → Featured Nails Designs.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {nailsImages.slice(0, 8).map((src, idx) => (
                  <button
                    key={`${src}_${idx}`}
                    type="button"
                    onClick={() => openLightbox(nailsImages, idx)}
                    className="relative overflow-hidden rounded-2xl border border-stone-100 bg-stone-100 aspect-square group focus:outline-none hover:shadow-xl transition-all"
                    aria-label={`Open nails design ${idx + 1}`}
                  >
                    {effectiveFit === "contain" ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white">
                        <img
                          src={src}
                          alt={`Nails design ${idx + 1}`}
                          className="max-w-full max-h-full object-contain"
                          loading="lazy"
                          decoding="async"
                          onError={() =>
                            setNailsFailed((prev) =>
                              prev.includes(src) ? prev : [...prev, src]
                            )
                          }
                        />
                      </div>
                    ) : (
                      <img
                        src={src}
                        alt={`Nails design ${idx + 1}`}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                        onError={() =>
                          setNailsFailed((prev) =>
                            prev.includes(src) ? prev : [...prev, src]
                          )
                        }
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Load more / Instagram */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
          {totalImages > initialCount ? (
            visibleCount < totalImages ? (
              <button type="button" onClick={() => setVisibleCount((v) => Math.min(totalImages, v + pageSize))}
                className="px-9 py-3.5 border-2 border-amber-700 text-amber-700 text-[13px] tracking-widest uppercase font-medium hover:bg-amber-700 hover:text-white transition-all duration-300 rounded-full">
                Load More
              </button>
            ) : (
              <button type="button" onClick={() => setVisibleCount(initialCount)}
                className="px-9 py-3.5 border border-stone-300 text-stone-500 text-[13px] tracking-widest uppercase font-medium hover:border-stone-400 hover:text-stone-700 transition-all duration-300 rounded-full">
                Show Less
              </button>
            )
          ) : null}
          <a href={settings.socials.instagramUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[13px] tracking-widest uppercase font-medium text-stone-400 hover:text-amber-700 transition-colors">
            View on Instagram <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </a>
        </div>

        {/* Lightbox */}
        {lightboxOpen && lightboxSrc ? (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog" aria-modal="true" aria-label="Image viewer"
            onMouseDown={(e) => { if (e.target === e.currentTarget) closeLightbox(); }}>
            <div className="relative w-full max-w-5xl">
              <div className="absolute -top-12 left-0 right-0 flex items-center justify-between text-white/70 text-[12px] tracking-widest uppercase">
                <span>{lightboxIndex + 1} / {lightboxItems.length}</span>
                <button type="button" onClick={closeLightbox} className="px-3 py-2 text-white/70 hover:text-white transition-colors">Close</button>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-black border border-white/10">
                <img src={lightboxSrc} alt="Selected work" className="w-full max-h-[80vh] object-contain bg-black" />
                <button type="button" onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-colors" aria-label="Previous">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button type="button" onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-colors" aria-label="Next">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <div className="mt-4" />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   REVIEWS
   ───────────────────────────────────────────── */
interface Review { id: string; name: string; service: string; rating: number; text: string; date: string; }

function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeReviews((firestoreReviews: FirestoreReview[]) => {
      setReviews(
        firestoreReviews.map((r) => ({
          id: r.id || String(Date.now()),
          name: r.name,
          service: r.service,
          rating: r.rating,
          text: r.text,
          date: r.date,
        }))
      );
    });
    return () => unsubscribe();
  }, []);

  const serviceOptions = [
    "Premium Wigs",
    "Braids",
    "Bohemia Braids",
    "Locs",
    "Microbonding",
    "Nails",
    "African Attire",
    "Massage",
    "Makeup",
  ];

  // Filters & sorting
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [minRating, setMinRating] = useState<number>(0);
  const [sortMode, setSortMode] = useState<"newest" | "highest" | "lowest">(
    "newest"
  );
  const [visible, setVisible] = useState(8);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // Reset visible when filters change
    setVisible(8);
  }, [serviceFilter, minRating, sortMode]);

  const filtered = useMemo(() => {
    let list = [...reviews];

    if (serviceFilter !== "all") {
      list = list.filter((r) => r.service === serviceFilter);
    }

    if (minRating > 0) {
      list = list.filter((r) => r.rating >= minRating);
    }

    if (sortMode === "highest") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortMode === "lowest") {
      list.sort((a, b) => a.rating - b.rating);
    } else {
      // newest
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return list;
  }, [reviews, serviceFilter, minRating, sortMode]);

  const visibleReviews = filtered.slice(0, visible);
  const canLoadMore = visible < filtered.length;

  const averageRating = reviews.length
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-ZA", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Form
  const [formData, setFormData] = useState({
    name: "",
    service: "",
    rating: 5,
    text: "",
    website: "", // honeypot
  });
  const [submitted, setSubmitted] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [formError, setFormError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const MAX_REVIEW_LEN = 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Honeypot (bots)
    if (formData.website.trim()) return;

    const name = formData.name.trim();
    const service = formData.service.trim();
    const text = formData.text.trim();

    if (name.length < 2) {
      setFormError("Please enter your name.");
      return;
    }
    if (!service) {
      setFormError("Please select a service.");
      return;
    }
    if (text.length < 10) {
      setFormError("Please write a short review (at least 10 characters).");
      return;
    }

    setIsSubmitting(true);
    const id = await addReviewToFirestore({
      name,
      service,
      rating: formData.rating,
      text: text.slice(0, MAX_REVIEW_LEN),
      date: new Date().toISOString(),
    });

    setIsSubmitting(false);

    if (!id) {
      setFormError("Could not submit your review right now. Please try again.");
      return;
    }

    setFormData({ name: "", service: "", rating: 5, text: "", website: "" });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <section id="reviews" className="py-28 bg-stone-950 text-white bb-section">
      <div className="bb-noise-overlay" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-16 bb-reveal" style={{ "--bb-delay": "60ms" } as CSSProperties}>
          <p className="text-amber-400/80 text-[13px] tracking-[0.35em] uppercase font-medium mb-4">
            Client Reviews
          </p>
          <h2 className="text-4xl md:text-5xl font-serif leading-tight">
            Reviews & Feedback
          </h2>
          <div className="w-12 h-[2px] bg-amber-400/60 mx-auto mt-6 mb-8" />

          {/* Rating summary */}
          {reviews.length > 0 ? (
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10">
              <span className="text-3xl font-serif text-amber-400">
                {averageRating.toFixed(1)}
              </span>
              <div className="flex flex-col items-start gap-0.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-3.5 h-3.5 ${
                        star <= Math.round(averageRating)
                          ? "text-amber-400"
                          : "text-stone-600"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-[11px] text-stone-400">
                  {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-stone-400">Be the first to leave a review.</p>
          )}
        </div>

        <div className="grid lg:grid-cols-5 gap-12">
          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-stone-800/60 backdrop-blur-sm rounded-3xl p-8 border border-stone-700/50 sticky top-28">
              <h3 className="text-xl font-serif mb-2">Leave a Review</h3>
              <p className="text-stone-400 text-sm mb-6">
                Your review will appear publicly once submitted.
              </p>

              {submitted && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-900/30 border border-emerald-700/50 text-emerald-300 text-sm flex items-center gap-2">
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Thank you. Your review has been submitted.
                </div>
              )}

              {formError && (
                <div className="mb-6 p-4 rounded-2xl bg-red-900/20 border border-red-800/40 text-red-300 text-sm">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Honeypot */}
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div>
                  <label className="block text-[11px] tracking-[0.3em] uppercase text-stone-400 mb-2">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-stone-900/60 border border-stone-600/50 rounded-xl text-white placeholder-stone-500 focus:border-amber-500/60 outline-none transition-colors"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-[11px] tracking-[0.3em] uppercase text-stone-400 mb-2">
                    Service *
                  </label>
                  <select
                    required
                    value={formData.service}
                    onChange={(e) =>
                      setFormData({ ...formData, service: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-stone-900/60 border border-stone-600/50 rounded-xl text-white focus:border-amber-500/60 outline-none transition-colors appearance-none"
                  >
                    <option value="">Select a service</option>
                    {serviceOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] tracking-[0.3em] uppercase text-stone-400 mb-2">
                    Rating *
                  </label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, rating: star })
                        }
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="p-0.5 focus:outline-none transition-transform hover:scale-110"
                        aria-label={`Set rating to ${star}`}
                      >
                        <svg
                          className={`w-7 h-7 transition-colors ${
                            star <= (hoveredRating || formData.rating)
                              ? "text-amber-400"
                              : "text-stone-600"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-[11px] tracking-[0.3em] uppercase text-stone-400">
                      Your Review *
                    </label>
                    <span className="text-[11px] text-stone-500">
                      {formData.text.length}/{MAX_REVIEW_LEN}
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    maxLength={MAX_REVIEW_LEN}
                    value={formData.text}
                    onChange={(e) =>
                      setFormData({ ...formData, text: e.target.value })
                    }
                    className="mt-2 w-full px-4 py-3 bg-stone-900/60 border border-stone-600/50 rounded-xl text-white placeholder-stone-500 focus:border-amber-500/60 outline-none transition-colors resize-none"
                    placeholder="Share your experience at Berly Beauty..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-amber-600 text-white text-[13px] tracking-widest uppercase font-medium hover:bg-amber-500 transition-colors rounded-full disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting…" : "Submit Review"}
                </button>
              </form>
            </div>
          </div>

          {/* Reviews list */}
          <div className="lg:col-span-3 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-stone-300">
                  Reviews ({filtered.length})
                </h3>
                <p className="text-[12px] text-stone-500 mt-1">
                  Filter by service and rating.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="px-3 py-2 bg-stone-950/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 outline-none focus:border-amber-500/60"
                >
                  <option value="all">All services</option>
                  {serviceOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>

                <select
                  value={String(minRating)}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="px-3 py-2 bg-stone-950/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 outline-none focus:border-amber-500/60"
                >
                  <option value="0">Any rating</option>
                  <option value="5">5 stars</option>
                  <option value="4">4+ stars</option>
                  <option value="3">3+ stars</option>
                  <option value="2">2+ stars</option>
                  <option value="1">1+ stars</option>
                </select>

                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                  className="px-3 py-2 bg-stone-950/50 border border-stone-700/50 rounded-xl text-sm text-stone-200 outline-none focus:border-amber-500/60"
                >
                  <option value="newest">Newest</option>
                  <option value="highest">Highest rated</option>
                  <option value="lowest">Lowest rated</option>
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border border-stone-700/50 bg-stone-800/30">
                <svg
                  className="w-14 h-14 text-stone-600 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <p className="text-stone-300 font-medium">No reviews found</p>
                <p className="text-stone-500 text-sm mt-1">
                  Try changing the filters, or be the first to leave a review.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {visibleReviews.map((review) => {
                    const isExpanded = expandedId === review.id;
                    const longText = review.text.length > 220;

                    return (
                      <div
                        key={review.id}
                        className="p-6 rounded-2xl border border-stone-700/40 hover:border-stone-600/50 transition-colors bg-stone-800/30"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
                              <span className="text-sm font-serif font-bold text-white">
                                {review.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-white text-sm">
                                {review.name}
                              </h4>
                              <p className="text-[12px] text-amber-400/80">
                                {review.service}
                              </p>
                            </div>
                          </div>
                          <span className="text-[11px] text-stone-500">
                            {formatDate(review.date)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= review.rating
                                    ? "text-amber-400"
                                    : "text-stone-600"
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-[12px] text-stone-500">
                            {review.rating}/5
                          </span>
                        </div>

                        <p
                          className={
                            "text-stone-200 leading-relaxed text-sm whitespace-pre-wrap" +
                            (isExpanded ? "" : "")
                          }
                          style={
                            !isExpanded
                              ? {
                                  display: "-webkit-box",
                                  WebkitLineClamp: 4,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }
                              : undefined
                          }
                        >
                          {review.text}
                        </p>

                        {longText && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId(isExpanded ? null : review.id)
                              }
                              className="text-[12px] tracking-widest uppercase font-medium text-stone-400 hover:text-amber-300 transition-colors"
                            >
                              {isExpanded ? "Show less" : "Read more"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex items-center justify-center">
                  {canLoadMore ? (
                    <button
                      type="button"
                      onClick={() => setVisible((v) => v + 8)}
                      className="px-9 py-3.5 border border-white/15 text-white/80 text-[13px] tracking-widest uppercase font-medium hover:border-white/30 hover:text-white transition-all duration-300 rounded-full"
                    >
                      Load more
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   CONTACT
   ───────────────────────────────────────────── */
function Contact() {
  const { settings } = useSiteSettings();

  const contactItems = [
    {
      title: "Visit Us",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />,
      icon2: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
      content: (
        <a href={settings.contact.mapUrl} target="_blank" rel="noopener noreferrer" className="text-stone-500 hover:text-amber-700 transition-colors block leading-relaxed">
          {settings.contact.addressLines.map((line, idx) => (<span key={idx} className="block">{line}</span>))}
        </a>
      ),
    },
    {
      title: "Call Us",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />,
      content: (
        <div className="space-y-2">
          <a href={`tel:${settings.contact.phoneTel}`} className="text-stone-500 hover:text-amber-700 transition-colors block">{settings.contact.phoneDisplay}</a>
          <a href={`https://wa.me/${settings.contact.whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-green-600 hover:text-green-700 transition-colors text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
            WhatsApp
          </a>
        </div>
      ),
    },
    {
      title: "Email Us",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
      content: <a href={`mailto:${settings.contact.email}`} className="text-stone-500 hover:text-amber-700 transition-colors">{settings.contact.email}</a>,
    },
    {
      title: "Hours",
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
      content: <p className="text-stone-500">{settings.contact.hours}</p>,
    },
  ];

  return (
    <section id="contact" className="py-28 bg-gradient-to-b from-white via-stone-50 to-white bb-section">
      <div className="bb-grid-overlay" />
      <div className="bb-noise-overlay" />
      <div className="max-w-4xl mx-auto px-6 lg:px-8 relative">
        {/* Header */}
        <div className="text-center mb-16 bb-reveal" style={{ "--bb-delay": "70ms" } as CSSProperties}>
          <p className="text-amber-700 text-[13px] tracking-[0.35em] uppercase font-medium mb-4">Contact</p>
          <h2 className="text-4xl md:text-5xl font-serif text-stone-900 leading-tight">Get In Touch</h2>
          <div className="w-12 h-[2px] bg-amber-600 mx-auto mt-6 mb-6" />
          <p className="text-stone-500 leading-relaxed max-w-lg mx-auto">
            Visit us, give us a call, or click "Book Now" to schedule your beauty experience.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {contactItems.map((item) => (
            <div key={item.title} className="flex items-start gap-5 p-6 bg-white rounded-2xl border border-stone-200/80 hover:shadow-lg hover:shadow-stone-200/50 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl border border-amber-200 bg-amber-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon}
                  {item.icon2}
                </svg>
              </div>
              <div>
                <h4 className="font-serif text-lg text-stone-800 mb-1.5">{item.title}</h4>
                {item.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────
   FOOTER
   ───────────────────────────────────────────── */
function Footer({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const { settings } = useSiteSettings();
  const currentYear = new Date().getFullYear();

  const socials = [
    {
      name: "Instagram", url: settings.socials.instagramUrl,
      icon: (<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="5" strokeWidth={1.4} /><path strokeWidth={1.4} d="M16 11.37a4 4 0 11-7.999.001A4 4 0 0116 11.37z" /><path d="M17.5 6.5h.01" strokeWidth={1.6} strokeLinecap="round" /></svg>),
    },
    {
      name: "Facebook", url: settings.socials.facebookUrl,
      icon: (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13 22v-8h3l1-4h-4V7a1 1 0 011-1h3V2h-3a4 4 0 00-4 4v4H7v4h3v8h3z" /></svg>),
    },
  ];

  return (
    <footer className="bg-stone-950 text-stone-300">
      <div className="max-w-5xl mx-auto px-6 lg:px-8 py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-3">
            <p className="text-[11px] tracking-[0.35em] uppercase text-stone-500 font-medium">Visit Us</p>
            <a href={settings.contact.mapUrl} target="_blank" rel="noopener noreferrer" className="block text-sm leading-relaxed text-stone-400 hover:text-amber-300 transition-colors">
              {settings.contact.addressLines.map((line, idx) => (<span key={idx} className="block">{line}</span>))}
            </a>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] tracking-[0.35em] uppercase text-stone-500 font-medium">Contact</p>
            <div className="space-y-2.5">
              <a href={`tel:${settings.contact.phoneTel}`} className="flex items-center gap-2 text-sm text-stone-400 hover:text-amber-300 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                {settings.contact.phoneDisplay}
              </a>
              <a href={`https://wa.me/${settings.contact.whatsappDigits}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-stone-400 hover:text-amber-300 transition-colors">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>
                {settings.contact.phoneDisplay}
              </a>
              <a href={`mailto:${settings.contact.email}`} className="flex items-center gap-2 text-sm text-stone-400 hover:text-amber-300 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {settings.contact.email}
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] tracking-[0.35em] uppercase text-stone-500 font-medium">Socials</p>
            <div className="flex gap-2.5">
              {socials.map((social) => (
                <a key={social.name} href={social.url} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-stone-700 hover:border-amber-400 hover:text-amber-300 flex items-center justify-center transition-all text-stone-400" aria-label={social.name}>
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 mt-10 pt-6 grid grid-cols-3 items-center text-[13px] text-stone-500">
          <div />
          <p className="text-center">© {currentYear} Berly Beauty. All rights reserved.</p>
          <div className="flex justify-end">
            {onNavigate && (
              <button onClick={() => onNavigate("admin-login")} className="text-stone-600 hover:text-stone-300 transition-colors text-[12px]">Admin</button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────────
   ADMIN LOGIN
   ───────────────────────────────────────────── */
function AdminLogin({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await login(email, password);
    if (result.ok) { onNavigate("admin-dashboard"); }
    else { setError(result.message || "Invalid email or password"); }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border-2 border-amber-400/60 mb-4">
            <span className="font-serif text-2xl font-bold text-amber-400">B</span>
          </div>
          <h1 className="text-2xl font-serif text-white mb-1">Admin Portal</h1>
          <p className="text-stone-500 text-sm">Berly Beauty Management</p>
        </div>

        <div className="bg-stone-900 rounded-3xl p-8 border border-stone-800">
          <h2 className="text-xl font-serif text-white mb-6">Sign In</h2>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-900/20 border border-red-800/40 text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] tracking-[0.3em] uppercase text-stone-500 mb-2">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-700 rounded-xl text-white placeholder-stone-600 focus:border-amber-500/60 outline-none transition-colors" placeholder="admin@berlybeauty.co.za" />
            </div>
            <div>
              <label className="block text-[11px] tracking-[0.3em] uppercase text-stone-500 mb-2">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-stone-950 border border-stone-700 rounded-xl text-white placeholder-stone-600 focus:border-amber-500/60 outline-none transition-colors" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 bg-amber-600 text-white text-[13px] tracking-widest uppercase font-medium hover:bg-amber-500 transition-colors rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isLoading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Signing In...</>
              ) : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-stone-800">
            <button onClick={() => onNavigate("home")}
              className="w-full text-center text-stone-500 hover:text-amber-400 text-sm transition-colors flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Website
            </button>
          </div>
        </div>

        <p className="text-stone-600 text-[12px] text-center mt-6">© {new Date().getFullYear()} Berly Beauty. Admin access only.</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ADMIN DASHBOARD
   ───────────────────────────────────────────── */
const SERVICE_LABELS: Record<string, string> = {
  wigs: "Premium Wigs",
  braids: "Braids",
  bohemia: "Bohemia Braids",
  locs: "Locs",
  microbonding: "Microbonding",
  nails: "Nails",
  attire: "African Attire",
  massage: "Massage",
  makeup: "Makeup",
};

function formatTime24To12(time: string) {
  const [h, m] = time.split(":").map((v) => parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDateShort(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function AdminDashboard({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const { logout } = useAuth();
  const [currentTab, setCurrentTab] = useState<"reviews" | "settings">("reviews");
  const [adminReviews, setAdminReviews] = useState<Review[]>([]);
  const [reviewServiceFilter, setReviewServiceFilter] = useState<string>("all");
  const [reviewModal, setReviewModal] = useState<Review | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeReviews((firestoreReviews: FirestoreReview[]) => {
      setAdminReviews(
        firestoreReviews.map((r) => ({
          id: r.id || String(Date.now()),
          name: r.name,
          service: r.service,
          rating: r.rating,
          text: r.text,
          date: r.date,
        }))
      );
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logout();
    onNavigate("home");
  };

  const reviewServiceOptions = useMemo(() => {
    const set = new Set(adminReviews.map((r) => r.service).filter(Boolean));
    return Array.from(set).sort();
  }, [adminReviews]);

  const reviewsFiltered = useMemo(() => {
    const list =
      reviewServiceFilter === "all"
        ? adminReviews
        : adminReviews.filter((r) => r.service === reviewServiceFilter);

    return [...list].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [adminReviews, reviewServiceFilter]);

  const removeReview = async (id: string) => {
    if (!window.confirm("Delete this review?")) return;
    await deleteReviewFromFirestore(id);
  };

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-stone-950 text-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full border-2 border-amber-400/60 flex items-center justify-center flex-shrink-0">
                <span className="font-serif text-sm font-bold text-amber-400">B</span>
              </div>
              <div className="min-w-0 hidden sm:block">
                <h1 className="font-serif text-sm leading-tight">Berly Beauty</h1>
                <p className="text-[11px] text-stone-500">Admin Panel</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate("home")}
                className="px-3 py-2 text-stone-400 hover:text-white text-[13px] transition-colors"
              >
                View Site
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 text-[13px] rounded-full transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1 p-1 bg-white border border-stone-200 rounded-full shadow-sm">
            {(["reviews", "settings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                className={
                  "px-5 py-2.5 text-[13px] font-medium transition-all rounded-full " +
                  (currentTab === tab
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-500 hover:text-stone-700")
                }
              >
                {tab === "reviews" ? "Reviews" : "Website Settings"}
              </button>
            ))}
          </div>
        </div>

        {currentTab === "reviews" ? (
          <>
            {/* Reviews header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-serif text-stone-900">Reviews</h2>
                <p className="text-stone-500 text-sm mt-1">Moderate and manage reviews shown on the website.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={reviewServiceFilter}
                  onChange={(e) => setReviewServiceFilter(e.target.value)}
                  className="px-3 py-2 border border-stone-200 bg-white text-sm rounded-xl outline-none focus:border-amber-600"
                >
                  <option value="all">All services</option>
                  {reviewServiceOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white border border-stone-200 shadow-sm overflow-hidden rounded-2xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px]">
                  <thead className="bg-stone-50">
                    <tr>
                      {["Client", "Service", "Rating", "Date", "Review", "Actions"].map((h) => (
                        <th
                          key={h}
                          className={`px-5 py-3.5 text-[11px] font-semibold text-stone-400 uppercase tracking-[0.25em] ${
                            h === "Actions" ? "text-right" : "text-left"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {reviewsFiltered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <p className="text-stone-600 font-medium">No reviews found</p>
                          <p className="text-stone-400 text-sm mt-1">New reviews will appear here when clients submit them.</p>
                        </td>
                      </tr>
                    ) : (
                      reviewsFiltered.map((r) => (
                        <tr key={r.id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="px-5 py-4">
                            <p className="font-medium text-stone-900 text-sm">{r.name}</p>
                          </td>
                          <td className="px-5 py-4 text-sm text-stone-600">{r.service}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={"w-3.5 h-3.5 " + (star <= r.rating ? "text-amber-600" : "text-stone-300")}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                </svg>
                              ))}
                              <span className="text-[12px] text-stone-400 ml-1">{r.rating}/5</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-stone-600">{formatDateShort(r.date)}</td>
                          <td className="px-5 py-4 text-sm text-stone-600 max-w-[380px]">
                            <button
                              type="button"
                              onClick={() => setReviewModal(r)}
                              className="text-left hover:text-stone-900 transition-colors"
                              title="View full review"
                            >
                              <p className="overflow-hidden text-ellipsis whitespace-nowrap">{r.text}</p>
                            </button>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setReviewModal(r)}
                                className="px-3 py-1.5 text-[12px] border border-stone-200 text-stone-600 hover:text-stone-900 rounded-lg transition-colors"
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => removeReview(r.id)}
                                className="px-3 py-1.5 text-[12px] border border-stone-200 text-stone-500 hover:text-red-600 hover:border-red-200 rounded-lg transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3.5 border-t border-stone-100 flex items-center justify-between text-[12px] text-stone-400">
                <p>
                  Showing <span className="text-stone-600">{reviewsFiltered.length}</span> of{" "}
                  <span className="text-stone-600">{adminReviews.length}</span> review(s)
                </p>
                <p>Delete reviews that are inappropriate or spam.</p>
              </div>
            </div>

            {/* Review modal */}
            {reviewModal && (
              <div
                className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                role="dialog"
                aria-modal="true"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) setReviewModal(null);
                }}
              >
                <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl">
                  <div className="p-6 bg-stone-950 text-white flex items-start justify-between">
                    <div>
                      <p className="text-[11px] tracking-[0.35em] uppercase text-white/60">Review</p>
                      <h3 className="font-serif text-xl mt-1">{reviewModal.name}</h3>
                      <p className="text-white/60 text-sm mt-1">{reviewModal.service} · {formatDateShort(reviewModal.date)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReviewModal(null)}
                      className="w-9 h-9 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center"
                      aria-label="Close"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className={"w-4 h-4 " + (star <= reviewModal.rating ? "text-amber-600" : "text-stone-300")} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      ))}
                      <span className="text-sm text-stone-500 ml-2">{reviewModal.rating}/5</span>
                    </div>
                    <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{reviewModal.text}</p>

                    <div className="mt-6 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setReviewModal(null)}
                        className="px-5 py-2.5 border border-stone-200 text-stone-600 hover:text-stone-900 rounded-full transition-colors"
                      >
                        Close
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await removeReview(reviewModal.id);
                          setReviewModal(null);
                        }}
                        className="px-5 py-2.5 bg-stone-900 text-white hover:bg-stone-800 rounded-full transition-colors"
                      >
                        Delete Review
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <AdminSettingsPanel />
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BOOKING MODAL (WhatsApp only)
   ───────────────────────────────────────────── */
function BookingModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { settings } = useSiteSettings();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    date: "",
    time: "",
    service: "",
    message: "",
  });

  const handleWhatsAppBooking = () => {
    const serviceLabel = formData.service
      ? SERVICE_LABELS[formData.service] || formData.service
      : "";

    const dateFormatted = formData.date
      ? new Date(formData.date + "T00:00:00").toLocaleDateString("en-ZA", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

    const timeFormatted = formData.time ? formatTime24To12(formData.time) : "";

    const name = [formData.firstName.trim(), formData.lastName.trim()]
      .filter(Boolean)
      .join(" ");

    const lines: string[] = ["Hi Berly Beauty", "", "Appointment request"]; // keep clean + professional

    if (name) lines.push(`Name: ${name}`);
    if (formData.phone.trim()) lines.push(`Phone: ${formData.phone.trim()}`);
    if (formData.email.trim()) lines.push(`Email: ${formData.email.trim()}`);
    if (serviceLabel) lines.push(`Service: ${serviceLabel}`);
    if (dateFormatted) lines.push(`Date: ${dateFormatted}`);
    if (timeFormatted) lines.push(`Time: ${timeFormatted}`);

    const note = formData.message.trim();
    if (note) {
      lines.push("", "Message:", note);
    }

    if (lines.length <= 3) {
      lines.push("Please assist me with a booking.");
    }

    lines.push("", "Thank you.");

    const whatsappNumber = settings.contact.whatsappDigits || "27692888445";
    window.open(
      `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        lines.join("\n")
      )}`,
      "_blank"
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleWhatsAppBooking();
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      date: "",
      time: "",
      service: "",
      message: "",
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-stone-950 text-white p-6 rounded-t-3xl flex items-center justify-between z-10">
          <div>
            <h3 className="font-serif text-xl">Book via WhatsApp</h3>
            <p className="text-stone-400 text-sm mt-0.5">
              This will open WhatsApp with your details.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] tracking-[0.25em] uppercase text-stone-400 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-amber-600 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.25em] uppercase text-stone-400 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-amber-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] tracking-[0.25em] uppercase text-stone-400 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-amber-600 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[11px] tracking-[0.25em] uppercase text-stone-400 mb-2">
                Phone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-amber-600 outline-none transition-colors"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-[11px] tracking-[0.25em] uppercase text-stone-400 mb-2">
                  Preferred Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-amber-600 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.25em] uppercase text-stone-400 mb-2">
                  Preferred Time *
                </label>
                <input
                  type="time"
                  required
                  min="07:00"
                  max="19:00"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-amber-600 outline-none transition-colors"
                />
                <p className="mt-1.5 text-[11px] text-stone-400">{settings.contact.hours}</p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] tracking-[0.25em] uppercase text-stone-400 mb-2">
                Service *
              </label>
              <select
                required
                value={formData.service}
                onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-amber-600 outline-none transition-colors appearance-none"
              >
                <option value="">Select a service</option>
                {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] tracking-[0.25em] uppercase text-stone-400 mb-2">
                Message
              </label>
              <textarea
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:border-amber-600 outline-none transition-colors resize-none"
                placeholder="Any special requests or notes..."
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-green-600 text-white text-[13px] tracking-widest uppercase font-medium hover:bg-green-500 transition-colors rounded-full flex items-center justify-center gap-2.5"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              Send on WhatsApp
            </button>

            <p className="text-[11px] text-stone-400 text-center">
              WhatsApp opens in a new tab. We will confirm your booking as soon as possible.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PUBLIC SITE
   ───────────────────────────────────────────── */
function PublicSite({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    const handleBookNowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const bookNowLink = target.closest('a[href="#contact"]');
      if (bookNowLink) {
        e.preventDefault();
        setIsBookingModalOpen(true);
      }
    };

    document.addEventListener("click", handleBookNowClick);

    // Reveal-on-scroll for premium section motion
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const revealElements = Array.from(
      document.querySelectorAll<HTMLElement>(".bb-reveal")
    );

    if (prefersReduced) {
      revealElements.forEach((el) => el.classList.add("bb-revealed"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).classList.add("bb-revealed");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12 }
      );

      revealElements.forEach((el) => io.observe(el));

      return () => {
        document.removeEventListener("click", handleBookNowClick);
        io.disconnect();
      };
    }

    return () => document.removeEventListener("click", handleBookNowClick);
  }, []);

  return (
    <div className="font-sans antialiased">
      <Navbar />
      <Hero />
      <Services />
      <Specials />
      <Gallery />
      <Reviews />
      <Contact />
      <Footer onNavigate={onNavigate} />
      <BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   APP
   ───────────────────────────────────────────── */
export function App() {
  return (
    <SiteSettingsProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SiteSettingsProvider>
  );
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const { isAuthenticated, authChecked } = useAuth();

  const navigate = (page: Page) => { setCurrentPage(page); window.scrollTo(0, 0); };

  useEffect(() => {
    if (!authChecked) return;
    if (isAuthenticated && currentPage === "admin-login") navigate("admin-dashboard");
    if (!isAuthenticated && currentPage === "admin-dashboard") navigate("admin-login");
  }, [isAuthenticated, currentPage, authChecked]);

  if (!authChecked && (currentPage === "admin-dashboard" || currentPage === "admin-login")) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-stone-400 text-[13px] tracking-widest uppercase">Loading…</div>
      </div>
    );
  }

  switch (currentPage) {
    case "admin-login": return <AdminLogin onNavigate={navigate} />;
    case "admin-dashboard": return isAuthenticated ? <AdminDashboard onNavigate={navigate} /> : <AdminLogin onNavigate={navigate} />;
    default: return <PublicSite onNavigate={navigate} />;
  }
}
