import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { currentUploadMode } from "@/lib/env";
import { AdminHeader } from "../../AdminHeader";
import { FlightForm } from "../FlightForm";

export default async function NewFlight() {
  const admin = await requireAdmin();
  return (
    <>
      <AdminHeader admin={admin} current="work" />
      <p className="adm-crumb">
        <Link href="/admin/work">Work</Link> / New flight
      </p>
      <div className="adm-title">
        <h1 className="display">Add a flight</h1>
      </div>
      <FlightForm flight={null} mode={currentUploadMode()} />
    </>
  );
}
