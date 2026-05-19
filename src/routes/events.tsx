import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/events")({
  component: () => <Navigate to="/feed" />,
});
