import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "ur";
const dict: Record<Lang, Record<string, string>> = {
  en: {
    appName: "CryoHealth",
    tagline: "GLOF Early Warning & Offline AI Health Assistant",
    home: "Home",
    dashboard: "Dashboard",
    lakes: "Hazard Map",
    alerts: "Alerts",
    chw: "CHW Workspace",
    admin: "Admin",
    data: "Open Data",
    about: "About",
    login: "Sign in",
    signOut: "Sign out",
    demoBanner:
      "Hazard data on this site is live. Case and health records shown are sample data. CryoHealth is in field testing and not yet approved for clinical use.",
  },
  ur: {
    appName: "کرائیو ہیلتھ",
    tagline: "گلوف ابتدائی انتباہ اور آف لائن AI ہیلتھ معاون",
    home: "ہوم",
    dashboard: "ڈیش بورڈ",
    lakes: "خطرے کا نقشہ",
    alerts: "انتباہات",
    chw: "ہیلتھ ورکر",
    admin: "ایڈمن",
    data: "اوپن ڈیٹا",
    about: "تعارف",
    login: "سائن ان",
    signOut: "سائن آؤٹ",
    demoBanner:
      "اس سائٹ پر خطرے کا ڈیٹا حقیقی وقت میں فعال ہے۔ دکھائے گئے کیس اور صحت کے ریکارڈ نمونہ ڈیٹا ہیں۔ کرائیو ہیلتھ فیلڈ ٹیسٹنگ کے مرحلے میں ہے اور ابھی طبی استعمال کے لیے منظور شدہ نہیں۔",
  },
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? (localStorage.getItem("ch_lang") as Lang | null) : null;
    if (saved) setLang(saved);
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("ch_lang", lang);
    if (typeof document !== "undefined") {
      // RTL mirrors row direction and text alignment — the reading order
      // actually flips, this is not a mirrored copy of the LTR layout only.
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
    }
  }, [lang]);
  const t = (k: string) => dict[lang][k] ?? dict.en[k] ?? k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
