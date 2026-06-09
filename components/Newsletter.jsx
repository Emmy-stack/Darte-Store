import React from 'react'
import Title from './Title'

const Newsletter = () => {
    return (
        <div className='flex flex-col items-center mx-4 my-36'>
            <Title title="Join Newsletter" description="Subscribe to get exclusive deals, new arrivals, and insider updates delivered straight to your inbox every week." visibleButton={false} />
            <div className='flex bg-zinc-100 dark:bg-zinc-800/40 text-sm p-1 rounded-full w-full max-w-xl my-10 border-2 border-white dark:border-zinc-700/30 ring ring-zinc-200/50 dark:ring-zinc-800/50'>
                <input className='flex-1 pl-5 !bg-transparent !border-none outline-none text-slate-700 dark:text-slate-200' type="text" placeholder='Enter your email address' />
                <button className='font-medium bg-green-500 text-white px-7 py-3 rounded-full hover:scale-103 active:scale-95 transition'>Get Updates</button>
            </div>
        </div>
    )
}

export default Newsletter