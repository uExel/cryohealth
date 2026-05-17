import { Link, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Mountain, Languages } from "lucide-react";

const NAV = [
  { to: "/", key: "home" },
  { to: "/dashboard", key: "dashboard" },
  { to: "/lakes", key: "lakes" },
  { to: "/alerts", key: "alerts" },
  { to: "/data", key: "data" },
] as const;

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { user, isAdmin, isCHW, signOut } = useAuth();
  const loc = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <div className="rounded-md bg-primary p-1.5 text-primary-foreground">
            <Mountain className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-foreground">{t("appName")}</div>
            <div className="text-[10px] text-muted-foreground">Gilgit Baltistan</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to));
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(n.key)}
              </Link>
            );
          })}
          {isCHW && (
            <Link to="/chw" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              {t("chw")}
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              {t("admin")}
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLang(lang === "en" ? "ur" : "en")}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-secondary"
          >
            <Languages className="h-3 w-3" />
            {lang === "en" ? "اردو" : "EN"}
          </button>
          {user ? (
            <button
              onClick={() => signOut()}
              className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-secondary"
            >
              {t("signOut")}
            </button>
          ) : (
            <Link
              to="/login"
              className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}