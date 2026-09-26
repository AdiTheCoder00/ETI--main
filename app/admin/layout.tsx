import type { Metadata } from "next";
import "./admin.css";

// Per-request: reads the session and live lead data.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lead inbox — ETI Drone Visuals",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="adm wrap">{children}</div>;
}
