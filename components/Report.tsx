import React from 'react'

function Report() {
    const reports=[
        {name:'Fix AC leakage in A1', priority:'High', time:"30 mins ago"},
        {name:'Fix water heater in B1', priority:'High', time:"1hr mins ago"},
        {name:'Fix AC leakage in A1', priority:'Medium', time:"30 mins ago"},
    ]
  return (
    <div className='w-auto bg-white p-4 flex flex-col justify-between rounded-2xl leading-1 text-md h-45 border-zinc-100 shadow-lg'>
        <div className='flex justify-between items-center font-bold w-full text-slate-600 mb-2'>
            <h3 className='text-xl'>Recent Report</h3>
            <button className='outline-0 bg-transparent text-indigo-400 hover:text-indigo-500'>
                View all
            </button>
        </div>
        <div className='text-slate-600'>
            {
                reports.map((report,index)=>(
                <div key={index} className='grid grid-cols-4 items-center py-1'>
                    <p className='col-span-2 my-1 py-2'>{report.name}</p>
                    <p className='cols-span-1 my-1 py-2'>{report.time}</p>
                    <p className={`col-span-1 my-1 py-2 text-center ${report.priority === 'High' ? 'text-red-500 ' : report.priority === 'Medium' ? 'text-amber-400 ' : 'text-emerald-400'}`}>
                        {report.priority}
                    </p>
                </div>
                ))
            }
        </div>
      
    </div>
  )
}

export default Report
