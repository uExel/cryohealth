import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider, ROLE_ROUTES, isPublicPath } from "@/lib/auth";
import { getToken, decodeUser } from "@/lib/auth-client";
import { SiteHeader } from "@/components/cryohealth/SiteHeader";
import { DemoBanner } from "@/components/cryohealth/DemoBanner";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CryoHealth — GLOF early warning & offline AI health" },
      {
        name: "description",
        content:
          "Open-source GLOF early warning and offline AI health assistant for community health workers in glacier-dependent regions of the Hindu Kush–Himalaya.",
      },
      { name: "author", content: "CryoHealth contributors" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "CryoHealth" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "CryoHealth",
              url: "https://cryohealth.io",
              logo: "https://cryohealth.io/favicon.ico",
              sameAs: ["https://github.com/uExel/cryohealth.io"],
            },
            {
              "@type": "WebSite",
              name: "CryoHealth",
              url: "https://cryohealth.io",
              description:
                "Open-source GLOF early warning and offline AI health assistant for glacier-dependent regions.",
            },
          ],
        }),
      },
    ],
  }),
  beforeLoad: async ({ location }) => {
    const token = getToken();
    const user = token ? decodeUser(token) : null;
    if (user) {
      const { pathname } = location;
      // Let authenticated users into their role workspace, login, and the
      // public alerts feed (where CHWs acknowledge alerts). For any other
      // public/static page, send them to their role's entry point instead.
      if (
        pathname === "/admin" ||
        pathname.startsWith("/admin/") ||
        pathname === "/chw" ||
        pathname === "/login" ||
        pathname === "/alerts"
      ) {
        return;
      }
      if (isPublicPath(pathname)) {
        throw redirect({ to: ROLE_ROUTES[user.role], replace: true });
      }
    }
    return;
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <I18nProvider>
            <DemoBanner />
            <SiteHeader />
            <Outlet />
            <Toaster richColors position="top-right" />
          </I18nProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
