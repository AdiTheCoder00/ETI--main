"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/work", label: "Work" },
  { href: "#services", label: "Services" },
  { href: "#studio", label: "Studio" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
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
          <svg className="bars" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M3 8h18M3 16h18" />
          </svg>
          <svg className="x" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>
      </nav>
      <div className={`drawer${open ? " open" : ""}`} id="drawer">
        {links.map((l) => (
          <a key={l.href} href={to(l.href)} onClick={close}>
            {l.label}
          </a>
        ))}
        <a href={to("#contact")} onClick={close}>
          Get a quote
        </a>
      </div>
    </header>
  );
}
