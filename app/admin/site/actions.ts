"use server";

import { revalidatePath } from "next/cache";
import { fieldErrorsFrom, type AdminFormState } from "@/lib/admin-form";
import { requireAdmin } from "@/lib/auth";
import { refreshPublicPages } from "@/lib/content/refresh";
import { getContentStore } from "@/lib/content/store";
import { DEFAULT_SETTINGS, settingsSchema, type SettingsField } from "@/lib/settings";

export async function saveSettings(_prev: AdminFormState<SettingsField>, form: FormData): Promise<AdminFormState<SettingsField>> {
  await requireAdmin();
  const fields = Object.keys(DEFAULT_SETTINGS) as SettingsField[];
  const parsed = settingsSchema.safeParse(Object.fromEntries(fields.map((f) => [f, String(form.get(f) ?? "")])));
  if (!parsed.success) {
    return { ok: false, message: "Nothing was saved. Check the fields marked below.", fieldErrors: fieldErrorsFrom<SettingsField>(parsed.error) };
  }
  const store = await getContentStore();
  await store.saveSettings(parsed.data);
  refreshPublicPages();
  revalidatePath("/admin/site");
  return { ok: true, message: "Saved. The site shows the new details now." };
}
