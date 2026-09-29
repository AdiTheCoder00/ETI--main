import type { SiteSettings } from "@/lib/settings";

/** Profiles only appear once they're filled in at /admin/site; a link to instagram.com itself goes nowhere. */
export function Footer({ settings }: { settings: SiteSettings }) {
  const profiles = [
    ["Instagram", settings.instagram],
    ["YouTube", settings.youtube],
    ["LinkedIn", settings.linkedin],
  ].filter(([, href]) => href);

  return (
    <footer className="foot">
      <span>
        © {new Date().getFullYear()} ETI Drone Visuals, {settings.office.split(",")[0]}
      </span>
      {profiles.length > 0 && (
        <nav aria-label="Social">
          {profiles.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noopener">
              {label}
            </a>
          ))}
        </nav>
      )}
    </footer>
  );
}
