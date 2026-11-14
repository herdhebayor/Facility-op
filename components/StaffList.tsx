import React from 'react'

function StaffList() {
    const staffs= [
        {name:"Adebayo sikiru", department:'Electrician'},
        {name:"Idowu Adekunle", department:'Ac Technician'},
        {name:"Babajide Kehinde", department:'Lift Technician'},
        {name:"Akorede Segun", department:'Janitor'},
        {name:"Babalola Aribigbe", department:'Carpental'},
    ]
  return (
    <div className='w-auto h-45 leading-1 border-zinc-100 shadow-lg text-md bg-white rounded-2xl p-4'>
        <div className='flex items-center justify-between mb-2'>
            <h3 className='text-xl font-bold text-slate-600'>Staff on shift</h3>
            <button className='cursor-pointer outline-0 bg-transparent text-indigo-400 font-bold hover:text-500'>
                View all
            </button>
        </div>
        <div className='flex items-center gap-2'>
            {
                staffs.map((staff,index)=>(
                    <div key={index} className='flex text-sm flex-col w-fit items-center justify-center py-4'>
                        <div className='w-12 h-12 rounded-full bg-gray-400 mb-2'/>
                        <p className='font-bold text-slate-600'>
                            {staff.name}
                        </p>
                        <p className='text-slate-600 '>
                            {staff.department}
                        </p>
                    </div>
                ))
            }
            <div className='text-center'>
                <div className='w-12 h-12 rounded-full bg-gray-400'/>
                <p>More</p>
            </div>
        </div>
    </div>
  )
}

export default StaffList
