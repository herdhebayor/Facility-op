import React from 'react'
import Link from 'next/link'
import {SearchX} from 'lucide-react'

function Notfound() {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-[calc(100%-100px)] bg-white">
      <SearchX className='w-30 h-30 text-red-500' />
      <h1 className='text-[15vh] font-bold text-shadow-indigo-400 text-slate-900'>404</h1>
      <p className='text-slate-900 text-md'>The page you are looking for does not exist.</p>
      <Link href="/" className='mt-4 p-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600  '>Go back to Home</Link>
    </div>
  )
}

export default Notfound
