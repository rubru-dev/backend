import { redirect } from "next/navigation";

/**
 * Root page — just redirect to dashboard.
 * Middleware will send unauthenticated users to /login.
 */
export default function RootPage() {
  redirect("/dashboard");
}
