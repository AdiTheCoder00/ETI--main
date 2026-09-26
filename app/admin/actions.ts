"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAllowedAdmin, requireAdmin } from "@/lib/auth";
import { isLocalMode } from "@/lib/env";
import { statusSchema } from "@/lib/leads/schema";
import { getLeadStore } from "@/lib/leads/store";
import { createAuthClient } from "@/lib/supabase/server";

export async function setLeadStatus(form: FormData): Promise<void> {
  await requireAdmin();
  const id = String(form.get("id") ?? "");
  const status = statusSchema.safeParse(form.get("status"));
  if (!id || !status.success) return;
  const store = await getLeadStore();
  await store.setStatus(id, status.data);
  revalidatePath("/admin");
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
