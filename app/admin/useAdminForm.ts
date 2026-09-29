"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { AdminFormState } from "@/lib/admin-form";

/**
 * useActionState plus the contact form's two habits: submit inside a transition so an error
 * keeps what was typed (React would otherwise reset the form), and move focus to the first
 * field that needs fixing. Without JS the form still posts to the action.
 */
export function useAdminForm<F extends string>(
  action: (prev: AdminFormState<F>, form: FormData) => Promise<AdminFormState<F>>,
  fieldOrder: readonly F[],
) {
  const [state, dispatch, pending] = useActionState(action, { ok: null, message: null });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const first = fieldOrder.find((f) => state.fieldErrors?.[f]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"],[data-field="${first}"]`)?.focus();
  }, [state, fieldOrder]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  }

  const err = (f: F) => state.fieldErrors?.[f];
  const invalid = (f: F) => (err(f) ? { "aria-invalid": true as const, "aria-describedby": `${f}-err` } : {});

  return { state, pending, formRef, formProps: { ref: formRef, action: dispatch, onSubmit, noValidate: true }, err, invalid };
}
