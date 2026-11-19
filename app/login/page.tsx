
import companyExist from '@/lib/companyExist'
import { redirect } from 'next/navigation'
import LoginPage from './loginUi'

export default async function Login() {
    const companyHasBeenRegistered = await companyExist()
    if(!companyHasBeenRegistered ){
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

