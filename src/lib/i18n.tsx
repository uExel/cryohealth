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
    login: "Sign in",
    signOut: "Sign out",
    demoBanner: "Demonstration platform — not for clinical use. Data is synthetic.",
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
    login: "سائن ان",
    signOut: "سائن آؤٹ",
    demoBanner: "یہ ایک مظاہراتی پلیٹ فارم ہے — طبی استعمال کے لیے نہیں۔ ڈیٹا مصنوعی ہے۔",
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
  }, [lang]);
  const t = (k: string) => dict[lang][k] ?? dict.en[k] ?? k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
