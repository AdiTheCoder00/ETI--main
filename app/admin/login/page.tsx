import Link from "next/link";
import { redirect } from "next/navigation";
import { Mark } from "@/components/Mark";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function Login() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className="adm-login">
      <Link href="/" className="brand">
        <Mark />
        <b>ETI</b>
        <span>Drone Visuals</span>
      </Link>
      <h1 className="display">Lead inbox</h1>
      <LoginForm />
    </div>
  );
}
