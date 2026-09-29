"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AdminFormState } from "@/lib/admin-form";
import { isAllowedAdmin, requireAdmin } from "@/lib/auth";
import { isLocalMode } from "@/lib/env";
import { notesSchema, statusSchema } from "@/lib/leads/schema";
import { getLeadStore } from "@/lib/leads/store";
import { createAuthClient } from "@/lib/supabase/server";

const leadId = (form: FormData) => String(form.get("id") ?? "").slice(0, 64);

export async function setLeadStatus(form: FormData): Promise<void> {
  await requireAdmin();
  const id = leadId(form);
  const status = statusSchema.safeParse(form.get("status"));
  if (!id || !status.success) return;
  const store = await getLeadStore();
  await store.setStatus(id, status.data);
  revalidatePath("/admin", "layout");
}

export async function saveLeadNotes(_prev: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = leadId(form);
  const notes = notesSchema.safeParse(String(form.get("notes") ?? "").trim());
  if (!id) return { ok: false, message: "That lead is missing." };
  if (!notes.success) return { ok: false, message: notes.error.issues[0].message };
  const store = await getLeadStore();
  if (!(await store.setNotes(id, notes.data))) return { ok: false, message: "That lead no longer exists." };
  revalidatePath("/admin");
  return { ok: true, message: "Saved." };
}

export async function deleteLead(form: FormData): Promise<void> {
  await requireAdmin();
  const id = leadId(form);
  if (!id) return;
  const store = await getLeadStore();
  await store.remove(id);
  revalidatePath("/admin", "layout");
}

export type SignInState = { error: string | null };

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  if (isLocalMode()) redirect("/admin");
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password didn’t match." };
  if (!isAllowedAdmin(data.user?.email)) {
    await supabase.auth.signOut();
    return { error: "This account doesn’t have access to the lead inbox." };
  }
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  if (!isLocalMode()) {
    const supabase = await createAuthClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
