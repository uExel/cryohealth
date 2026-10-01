import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Languages, Menu, Moon, Sun, X } from "lucide-react";
import logoMark from "@/assets/cryohealth-logo-mark.svg";

const NAV = [
  { to: "/", key: "home" },
  { to: "/dashboard", key: "dashboard" },
  { to: "/lakes", key: "lakes" },
  { to: "/alerts", key: "alerts" },
  { to: "/data", key: "data" },
  { to: "/about", key: "about" },
] as const;

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, signOut } = useAuth();
  const loc = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-40 border-b-2 bg-background"
      style={{ borderColor: "var(--color-line)" }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img src={logoMark} alt="" className="h-8 w-8" />
          <div className="leading-tight">
            <div className="text-sm text-foreground">
              <span className="font-extrabold">CRYO</span>
              <span className="font-normal">HEALTH</span>
            </div>
            <div className="ch-label ch-muted hidden text-[9px] tracking-[0.1em] sm:block">
              Scalable solution for glacier-dependent regions
            </div>
          </div>
        </Link>
        {!user && (
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active =
                loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to));
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`border-b-[3px] px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-[var(--color-accent)] text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(n.key)}
                </Link>
              );
            })}
          </nav>
        )}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {!user && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
              className="inline-flex h-11 w-11 items-center justify-center border-2 border-border bg-background text-foreground md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
          <button
            onClick={() => setLang(lang === "en" ? "ur" : "en")}
            aria-label="Switch language"
            className="inline-flex h-11 items-center gap-1 border-2 border-border bg-background px-2 py-1 text-xs text-foreground hover:bg-secondary"
          >
            <Languages className="h-3 w-3" />
            <span className="hidden sm:inline">{lang === "en" ? "اردو" : "EN"}</span>
          </button>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle dark mode"
            className="inline-flex h-11 w-11 items-center justify-center border-2 border-border bg-background text-foreground hover:bg-secondary"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
          {user ? (
            <button
              onClick={() => signOut()}
              className="border-2 border-border bg-background px-2.5 py-1 text-xs text-foreground hover:bg-secondary"
            >
              {t("signOut")}
            </button>
          ) : (
            <Link
              to="/login"
              className="bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground hover:bg-[var(--color-accent-ink)] sm:px-3"
            >
              {t("login")}
            </Link>
          )}
        </div>
      </div>
      {!user && (
        <nav
          id="mobile-navigation"
          className={`${mobileMenuOpen ? "block" : "hidden"} border-t-2 px-4 py-2 md:hidden`}
          style={{ borderColor: "var(--color-line)" }}
        >
          {NAV.map((n) => {
            const active = loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to));

            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`block border-b border-border py-3 text-sm ${
                  active ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                {t(n.key)}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
