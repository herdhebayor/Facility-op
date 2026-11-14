
import companyExist from '@/lib/companyExist'
import { redirect } from 'next/navigation'
import LoginPage from './loginUi'

export default async function Login() {
    const companyHasBeenRegistered = await companyExist()
    console.log(companyHasBeenRegistered)
    if(!companyHasBeenRegistered ){
      console.log(companyHasBeenRegistered)
      redirect('/register')
    }
  return (
    <div>
      {
        companyHasBeenRegistered && <LoginPage/>
      }
      
    </div>
  )
}

