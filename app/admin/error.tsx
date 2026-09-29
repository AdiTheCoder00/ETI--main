"use client";

/**
 * An admin page failed to load. On a new deployment that is almost always missing Supabase settings
 * or the admin migration not yet run (production refuses to fall back to the local files), so say where
 * to look instead of showing a bare 500. Nothing from the error itself is shown: in production it is
 * redacted anyway.
 */
export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="adm-login">
      <h1 className="display">Admin unavailable</h1>
      <p className="adm-note">
        This page couldn’t load. On a new deployment, check that the Supabase keys and ADMIN_EMAILS are set and that
        both files in supabase/migrations have been run (see the README); otherwise the database may be down.
      </p>
      <button type="button" className="btn btn-accent" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
