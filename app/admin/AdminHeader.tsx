import Link from "next/link";
import { Mark } from "@/components/Mark";
import type { Admin } from "@/lib/auth";
import { signOut } from "./actions";

const SECTIONS = [
  { href: "/admin", key: "leads", label: "Leads" },
  { href: "/admin/dashboard", key: "dashboard", label: "Dashboard" },
  { href: "/admin/work", key: "work", label: "Work" },
  { href: "/admin/site", key: "site", label: "Site details" },
] as const;

export type Section = (typeof SECTIONS)[number]["key"];

export function AdminHeader({ admin, current }: { admin: Admin; current: Section }) {
  return (
    <>
      <header className="adm-head">
        <Link href="/" className="brand">
          <Mark />
          <b>ETI</b>
          <span>Drone Visuals</span>
        </Link>
        <div className="adm-who">
          <span>{admin.email}</span>
          {!admin.local && (
            <form action={signOut}>
              <button type="submit" className="adm-link">
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>
      <nav className="adm-nav" aria-label="Admin">
        {SECTIONS.map((s) => (
          <Link key={s.key} href={s.href} aria-current={s.key === current ? "page" : undefined}>
            {s.label}
          </Link>
        ))}
      </nav>
      {admin.local && (
        <p className="adm-note">
          Local mode: Supabase isn’t configured, so everything here reads and writes files in <code>.data/</code> and
          there is no login. Production requires Supabase.
        </p>
      )}
    </>
  );
}
