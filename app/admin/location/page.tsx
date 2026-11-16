
import { getSessionUser } from "@/lib/auth";
import {redirect} from 'next/navigation'
import {getSession} from "@/lib/auth"
import LocationUi from './LocationUi'

export default async function LocationPage() {
  const user = await getSessionUser()
  const session = await getSession()

  if(!session){
    redirect('/login')
  }

  console.log(user)
  return <LocationUi user={user}/>
  
}
