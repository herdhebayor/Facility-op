import React from 'react'
import { MoveRight, Plug, Mop, ShelvingUnit, AirVent,LayersArrowUp,Axe} from 'lucide-react'


function Department() {
    const Departments = [
        {id: 1, name:"Electrician",shift: "1",total:'2',status: 75, icon: Plug },
        {id: 2, name:"Janitor",shift: "3",total:'3',status: 50, icon: Mop },
        {id: 3, name:"Plumber", shift: "1",total:'2',status: 100, icon: Axe },
        {id: 4, name:"AC Technician", shift: "1",total:'1',status: 25, icon: AirVent },
        {id: 5, name:"Lift Technician",shift: "1",total:'1',status: 50, icon: LayersArrowUp },
        {id: 6, name:"Carpenter",shift: "1",total:'1',status: 100, icon: ShelvingUnit },
    ]

    const iconColor =['indigo-500','emerald-500','violet-500','indigo-400','emerald-400','violet-400']
  return (
    <div className="w-full min-w-160 h-130 xl:min-w-[44.3%] rounded-2xl flex flex-col gap-4 bg-white shadow-lg border border-gray-100 p-3">
      {/* header */}
        <div className="flex items-center justify-between gap-4 text-slate-600 ">
            <h3 className='text-lg font-semibold text-indigo-500'>
                Departments Overview
            </h3>
            <button className="text-indigo-400 px-3 font-bold hover:text-indigo-500 transition">
                View all
            </button>
        </div>
        {/* task list */}
        <div className=" text-slate-600 w-full ">
            <div className="grid grid-cols-11 gap-4 text-slate-600 font-semibold p-2 mb-2">
                <div className='col-span-4'>Department</div>
                <div className='col-span-3'>on shift/Total</div>
                <div className='col-span-4'>Routine Completion</div>
            </div>
                {Departments.map((dept) => (
                    <div key={dept.id} className=" grid grid-cols-11 gap-4 text-slate-600 border border-zinc-50 rounded-2xl p-3 font-bold">
                        <div className='col-span-4 line-clamp-1 flex items-center h-full'>
                            <div className={`w-8 h-8  rounded-xl flex items-center justify-center bg-${iconColor[dept.id % iconColor.length]}/10 mr-2`}>
                                <dept.icon size={20} className={` my-auto text-${iconColor[dept.id % iconColor.length]}`}/>
                            </div>
                            {dept.name}
                        </div>
                        <div className='col-span-3 flex h-full items-center justify-center line-clamp-1'>{dept.shift}/{dept.total}</div>
                        <div className={`p-1 col-span-4 flex h-full itmes-center justify-center gap-4  rounded-md `}>
                            <span className='my-auto'>{dept.status}%</span>
                            <div className='w-full h-2 bg-neutral-50 rounded-full overflow-hidden my-auto'>
                                <div className={`h-full rounded-full ${dept.status === 100 ? 'bg-emerald-500' : dept.status >= 50 ? 'bg-amber-400' : 'bg-red-500'}`} style={{width: `${dept.status}%`}}></div>
                            </div>
                        </div>
                    </div>
                ))}
        </div>
        {/* bottom */}
        <div className="flex items-center justify-between gap-4 text-slate-600">
                    <h3 className=' font-semibold text-indigo-500'>
                        Viewing {Departments.length} departments
                    </h3>
                    <button className="text-indigo-400 px-3 py-1 flex items-center gap-2 font-bold hover:text-indigo-500 transition">
                        View all <MoveRight size={16} className="inline-block ml-1"/>
                    </button>
                </div>
    </div>
  )
}



export default Department
