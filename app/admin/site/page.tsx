import { requireAdmin } from "@/lib/auth";
import { getContentStore } from "@/lib/content/store";
import { AdminHeader } from "../AdminHeader";
import { SettingsForm } from "./SettingsForm";

export default async function SiteDetails() {
  const admin = await requireAdmin();
  const settings = await (await getContentStore()).getSettings();
  return (
    <>
      <AdminHeader admin={admin} current="site" />
      <div className="adm-title">
        <h1 className="display">Site details</h1>
      </div>
      <p className="adm-sub">
        The facts about the studio that appear on the site. The year, phone and profiles are optional: leave one empty
        and the site leaves it out rather than guess.
      </p>
      <SettingsForm settings={settings} />
    </>
  );
}
