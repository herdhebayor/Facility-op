import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AdminOverView from "@/components/AdminOverView";

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/unauthorized");

  return <AdminOverView />;
}
