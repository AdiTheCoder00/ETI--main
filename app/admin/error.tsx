"use client";

/**
 * The lead inbox failed to load. On a new deployment that is almost always missing Supabase settings
 * (production refuses to fall back to the local file store), so say where to look instead of showing
 * a bare 500. Nothing from the error itself is shown: in production it is redacted anyway.
 */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="adm-login">
      <h1 className="display">Lead inbox unavailable</h1>
      <p className="adm-note">
        The inbox couldn’t load. On a new deployment, check that the Supabase keys and ADMIN_EMAILS are set (see the
        README); otherwise the database may be down.
      </p>
      <button type="button" className="btn btn-accent" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
