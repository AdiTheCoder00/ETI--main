"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { href: "/work", label: "Work" },
  { href: "#services", label: "Services" },
  { href: "#studio", label: "Studio" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Escape closes the menu, and it shuts itself when the window widens past the drawer breakpoint
  // so the state never comes back stale on the next narrow view.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      document.getElementById("menubtn")?.focus();
    };
    const wide = window.matchMedia("(min-width: 1024px)");
    const onWide = () => wide.matches && setOpen(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);
  // off the homepage the section anchors have to travel there first; SiteMotion only
  // intercepts the bare "#..." form, so the smooth scroll still works where it exists
  const home = usePathname() === "/";
  const to = (href: string) => (home || !href.startsWith("#") ? href : `/?intro=skip${href}`);
  const homeLink = home ? "#top" : "/?intro=skip#top";

  return (
    <header className="nav wrap" id="nav">
      <a href={homeLink} className="brand">
        <b>ETI</b>
        <span>Drone Visuals</span>
      </a>
      <nav className="links" aria-label="Main">
        {links.map((l) => (
          <a key={l.href} href={to(l.href)}>
            {l.label}
          </a>
        ))}
        <a href={to("#contact")}>Contact</a>
        <a href={to("#contact")} className="cta">
          Get a quote
        </a>
        <button
          type="button"
          className="menubtn"
          id="menubtn"
          aria-expanded={open}
          aria-controls="drawer"
          aria-label="Menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="burger" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>
      </nav>
      <div className={`drawer${open ? " open" : ""}`} id="drawer">
        {[...links, { href: "#contact", label: "Get a quote" }].map((l, i) => (
          <a key={l.label} href={to(l.href)} onClick={close} style={{ "--i": i } as React.CSSProperties}>
            <span>{l.label}</span>
          </a>
        ))}
      </div>
    </header>
  );
}
