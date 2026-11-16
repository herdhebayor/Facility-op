import React from 'react'
import { MoveRight } from 'lucide-react'


function TaskDash() {
    const tasks = [
        {id: 1, name:"Fix the leaking pipe", department: "Plumber", priority: "High", shift: "1",status: "Pending"},
        {id: 2, name:"Clean the lobby", department: "Janitor", priority: "Medium", shift: "3",status: "In Progress"},
        {id: 3, name:"Update patient records", department: "Admin", priority: "Low", shift: "0",status: "Completed"},
        {id: 4, name:"Inspect fire safety equipment", department: "Safety", priority: "High", shift: "2",status: "Pending"},
        {id: 5, name:"Prepare monthly financial report", department: "Finance", priority: "Medium", shift: "1",status: "In Progress"},
        {id: 6, name:"Conduct staff training session", department: "Supervisor", priority: "Low", shift: "3",status: "Completed"},
    ]
  return (
    <div className="w-full min-w-160 h-130 xl:min-w-[54.3%] rounded-2xl flex flex-col gap-4 bg-white shadow-lg border border-gray-100 p-3">
      {/* header */}
        <div className="flex items-center justify-between gap-4 text-slate-600 ">
            <h3 className='text-lg font-semibold text-indigo-500'>
                Task
            </h3>
            <button className="text-indigo-400 px-3 py-1 font-bold hover:text-indigo-500  ">
                View all
            </button>
        </div>
        {/* task list */}
        <div className=" text-slate-600 w-full ">
            <div className="grid grid-cols-12 gap-4 text-slate-600 text-center font-semibold p-2 mb-2">
                <div className='col-span-5 text-left'>Task</div>
                <div className='col-span-2'>Department</div>
                <div className='col-span-2'>Priority</div>
                <div className='col-span-2'>Status</div>
                <div className='col-span-1'>Shift</div>
                
            </div>
                {tasks.map((task) => (
                    <div key={task.id} className="grid grid-cols-12 gap-4 text-slate-600 border border-zinc-50 rounded-2xl p-3 font-bold">
                        <div className='col-span-5 flex items-center  h-full line-clamp-1'>{task.name}</div>
                        <div className='col-span-2 h-full flex items-center justify-center line-clamp-1'>{task.department}</div>
                        <div className={`p-1 col-span-2 h-full flex items-center justify-center line-clamp-1 rounded-md ${task.priority === 'High' ? 'text-red-500 bg-red-500/10' : task.priority === 'Medium' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>{task.priority}</div>
                        <div className={`p-1 line-clamp-1 h-full flex items-center justify-center col-span-2 rounded-md ${task.status === 'Pending' ? 'text-amber-500 bg-amber-500/10' : task.status === 'In Progress' ? 'text-indigo-500 bg-indigo-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>{task.status}</div>
                        <div className={`col-span-1 flex h-full items-center rounded-md justify-center ${task.shift === '0' ? 'text-slate-400 bg-slate-400/10' : 'text-emerald-500 bg-emerald-500/10'}`}>{task.shift}</div>
                        
                    </div>
                ))}
        </div>
        {/* bottom */}
        <div className="flex items-center justify-between gap-4 text-slate-600">
                    <h3 className=' font-semibold text-indigo-500'>
                        Viewing {tasks.length} tasks
                    </h3>
                    <button className="text-indigo-400 px-3 py-1 flex items-center gap-2 font-bold hover:text-indigo-500  ">
                        View all tasks <MoveRight size={16} className="inline-block ml-1"/>
                    </button>
                </div>
    </div>
  )
}



export default TaskDash
