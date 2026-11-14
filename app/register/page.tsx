import { redirect } from "next/navigation";
import companyExist from "@/lib/companyExist";
import RegisterForm from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const hasCompany = await companyExist();

  if (hasCompany) {
    redirect("/login");
  }

  return <RegisterForm />;
}
