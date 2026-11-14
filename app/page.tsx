import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role === "staff") {
    redirect("/shift");
  }

  if (session.role === "manager") {
    redirect("/manager");
  }

  redirect("/dashboard");
}