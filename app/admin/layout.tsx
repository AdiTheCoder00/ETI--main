import type { Metadata } from "next";
import "./admin.css";

// Per-request: reads the session and live data.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — ETI Drone Visuals",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="adm wrap">
      {children}
    </main>
  );
}
