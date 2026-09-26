"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signIn, { error: null });
  return (
    <form action={action} className="form adm-login-form">
      <div className="f full">
        <label htmlFor="l-email">Email</label>
        <input id="l-email" name="email" type="email" autoComplete="username" required />
      </div>
      <div className="f full">
        <label htmlFor="l-pass">Password</label>
        <input id="l-pass" name="password" type="password" autoComplete="current-password" required />
      </div>
      <div className="send full">
        <p className={`form-note${state.error ? " is-error" : ""}`} aria-live="polite">
          {state.error ?? "Studio accounts only."}
        </p>
        <button type="submit" className="btn btn-accent" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
