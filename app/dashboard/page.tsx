import DashboardClient from "./DashboardClient";
import { getSessionUser } from "@/lib/auth";
import { getSession } from "@/lib/auth";
import {redirect} from 'next/navigation'

export default async function DashboardPage() {
  const session = await getSession()
  const user = await getSessionUser();
  

  if(!session){
    redirect('/login')
  }
 

  return <DashboardClient user={user} />;
}
