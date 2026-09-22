import type { ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

const NAV_GROUPS = [
  {
    label: "Overview",
    adminOnly: false,
    items: [{ to: "/admin", label: "Dashboard", exact: true }],
  },
  {
    label: "Hazard data",
    adminOnly: false,
    items: [
      { to: "/admin/districts", label: "Districts", exact: false },
      { to: "/admin/glaciers", label: "Glaciers", exact: false },
      { to: "/admin/lakes", label: "Lakes", exact: false },
    ],
  },
  {
    label: "Alerts & response",
    adminOnly: false,
    items: [
      { to: "/admin/alerts", label: "Alerts", exact: false },
      { to: "/admin/protocols", label: "Protocols", exact: false },
    ],
  },
  {
    label: "Health workforce",
    adminOnly: false,
    items: [
      { to: "/admin/chw-profiles", label: "CHW profiles", exact: false },
      { to: "/admin/cases", label: "Cases", exact: false },
      { to: "/admin/facilities", label: "Facilities", exact: false },
    ],
  },
  {
    label: "People & access",
    adminOnly: true,
    items: [
      { to: "/admin/users", label: "Users & roles", exact: false },
      { to: "/admin/audit", label: "Audit log", exact: false },
    ],
  },
  {
    label: "Platform",
    adminOnly: true,
    items: [
      { to: "/admin/system-health", label: "System health", exact: false },
      { to: "/admin/sync", label: "Sync activity", exact: false },
    ],
  },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const { isCryoHealthAdmin } = useAuth();
  const loc = useLocation();

  const groups = NAV_GROUPS.filter((g) => !g.adminOnly || isCryoHealthAdmin);

  return (
    <SidebarProvider className="min-h-0">
      <div className="flex w-full">
        <Sidebar
          collapsible="none"
          className="hidden border-e-2 md:flex"
          style={{ borderColor: "var(--color-line)" }}
        >
          <SidebarContent>
            {groups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const active = item.exact
                        ? loc.pathname === item.to
                        : loc.pathname.startsWith(item.to);
                      return (
                        <SidebarMenuItem key={item.to}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            className="rounded-none border-s-[3px] border-transparent data-[active=true]:border-[var(--color-accent)]"
                          >
                            <Link to={item.to}>{item.label}</Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>
        </Sidebar>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </SidebarProvider>
  );
}
