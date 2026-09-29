"use client";

/**
 * A submit button for a destructive server action. Asks first; without JS the browser can't
 * ask, so the form simply posts, which is why these only ever sit behind the admin login.
 */
export function ConfirmButton({ question, children, className = "adm-link adm-danger" }: { question: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(question)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
