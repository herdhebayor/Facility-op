import React from 'react'

function ActivityFeed() {
  return (
    <div className='w-auto  bg-white text-md p-4 rounded-2xl h-45 leading-1 border-zinc-100 shadow-lg'>
        <div className='flex justify-between items-center font-bold w-full text-slate-600 mb-2'>
            <h3 className='text-xl'>Activity Feed</h3>
            <button className='outline-0 bg-transparent text-indigo-400 hover:text-indigo-500'>
                View all
            </button>
        </div>
        <div className='text-slate-600 py-2'>
            <div className='flex justify-between gap-4 items-center text-center py-1'>
                <p className='col-span-2 my-1 py-2 line-clamp-1'>Adebayo sikiru added a new task</p>
                <p className='cols-span-1 my-1 py-2'>30 mins ago</p>
            </div>
            <div className='flex justify-between gap-4 items-center text-center py-1'>
                <p className='col-span-2 my-1 py-2 line-clamp-1 overflow-hidden'>Idowu Adekunle completed a task</p>
                <p className='cols-span-1 my-1 py-2'>1hr ago</p>
            </div>
            <div className='flex justify-between gap-4 items-center text-center py-1'>
                <p className='col-span-2 my-1 py-2 line-clamp-1'>Babajide Kehinde reported a task</p>
                <p className='cols-span-1 my-1 py-2'>30 mins ago</p>
            </div>
        </div>
      
    </div>
  )
}

export default ActivityFeed
