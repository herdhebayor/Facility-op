import React from 'react'
import { UserRoundGroup, Timer,ClipboardList, LoaderCircle,ClipboardMinus } from 'lucide-react'

function StaffStats() {
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-slate-600">
        {/* Status */}
        <div className="w-full rounded-lg flex flex-wrap items-start gap-4 bg-white shadow-sm border border-gray-100 p-4">
          {/* icon */}
          <div className="w-8 h-8 flex-wrap rounded-full flex items-center justify-center bg-indigo-500/10">
            <UserRoundGroup size={20} className="text-indigo-500"/>
          </div>
          <div >
            <p>Total staffs</p>
            <h1 className="text-xl font-bold">48</h1>
            <button className="bg-transparent outline-0 cursor-pointer text-indigo-500 hover:underline">View all</button>
          </div>
        </div>
        {/* Shift */}
        <div className="w-full rounded-lg flex flex-wrap items-start gap-4 bg-white shadow-sm border border-gray-100 p-4">
          {/* icon */}
          <div className="w-8 h-8 flex-wrap rounded-full flex items-center justify-center bg-emerald-500/10">
            <Timer size={20} className="text-emerald-500"/>
          </div>
          <div>
            <p>Total staffs</p>
            <h1 className="text-xl font-bold">48</h1>
            <button className="bg-transparent outline-0 text-emerald-500 cursor-pointer hover:underline">View all</button>
          </div>
        </div>
        {/*Pending Tasks */}
        <div className="w-full rounded-lg flex flex-wrap items-start gap-4 bg-white shadow-sm border border-gray-100 p-4">
          {/* icon */}
          <div className="w-8 h-8 flex-wrap rounded-full flex items-center justify-center bg-amber-500/10">
            <ClipboardList size={20} className="text-amber-500"/>
          </div>
          <div >
            <p>Pending tasks</p>
            <h1 className="text-xl font-bold">48</h1>
            <button className="bg-transparent outline-0 text-amber-500 cursor-pointer hover:underline">View all</button>
          </div>
        </div>
        {/* Routine Completed */}
        <div className="w-full rounded-lg flex flex-wrap items-start gap-4 bg-white shadow-sm border border-gray-100 p-4">
          {/* icon */}
          <div className="w-8 h-8 flex-wrap rounded-full flex items-center justify-center bg-indigo-400/10">
            <LoaderCircle size={20} className="text-indigo-400"/>
          </div>
          <div >
            <p>Routine</p>
            <h1 className="text-xl font-bold">80%</h1>
            <button className="bg-transparent outline-0 text-indigo-400 cursor-pointer hover:underline">View all</button>
          </div>
        </div>
        {/* Reports */}
        <div className="w-full rounded-lg flex flex-wrap items-start gap-4 bg-white shadow-sm border border-gray-100 p-4">
          {/* icon */}
          <div className="w-8 h-8 flex-wrap rounded-full flex items-center justify-center bg-red-500/10">
            <ClipboardMinus size={20} className="text-red-500"/>
          </div>
          <div >
            <p>New Reports</p>
            <h1 className="text-xl font-bold">48</h1>
            <button className="bg-transparent outline-0 text-red-500 cursor-pointer hover:underline">View all</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffStats
