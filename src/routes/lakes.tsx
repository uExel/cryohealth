import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/lakes")({
  component: () => <Outlet />,
});
