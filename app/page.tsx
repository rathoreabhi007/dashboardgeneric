'use client';

import { FaChartLine, FaCheckCircle, FaCog, FaServer, FaBars, FaTimes } from 'react-icons/fa';
import { useState } from 'react';

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openNewInstance = (type: string) => {
    // Generate a unique ID using timestamp and random number
    const uniqueId = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // Open in a new window/tab
    window.open(`/instances/${type}/${uniqueId}`, '_blank');
  };

  return (
    <div className="relative isolate bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-emerald-400 font-semibold text-lg">HSBC</span>
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-300 hover:text-emerald-400 focus:outline-none"
              >
                {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
              </button>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-emerald-400 transition-colors">Features</a>
              <a href="#" className="text-gray-300 hover:text-emerald-400 transition-colors">Documentation</a>
              <a href="#" className="text-gray-300 hover:text-emerald-400 transition-colors">Support</a>
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} pb-4`}>
            <div className="flex flex-col space-y-4">
              <a href="#features" className="text-gray-300 hover:text-emerald-400 transition-colors">Features</a>
              <a href="#" className="text-gray-300 hover:text-emerald-400 transition-colors">Documentation</a>
              <a href="#" className="text-gray-300 hover:text-emerald-400 transition-colors">Support</a>
            </div>
          </div>
        </div>
      </nav>

      {/* Background gradient */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-emerald-400 to-cyan-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
      </div>

      <div className="flex flex-col min-h-screen">
        {/* Hero section with reduced padding */}
        <div className="px-6 pt-24 pb-8 sm:pt-32 sm:pb-12 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 sm:text-6xl">
            Generic Control Dashboard
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-300">
            In House Reconciliation Framework - A comprehensive solution for monitoring and managing reconciliation processes.
          </p>
        </div>
      </div>

        {/* Features section with adjusted padding */}
        <div id="features" className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          {/* Feature 1 */}
          <div
            onClick={() => openNewInstance('completeness')}
              className="group rounded-lg border border-slate-700 p-6 transition-all duration-300 ease-in-out bg-slate-800/50 backdrop-blur-sm hover:bg-slate-800/70 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer transform-gpu"
          >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <FaCheckCircle size={24} />
                </div>
            <h3 className="text-lg font-semibold text-emerald-400">GENERIC COMPLETENESS CONTROL</h3>
              </div>
            <p className="mt-2 text-gray-300">
              Monitor and verify data completeness across systems, ensuring all required information is present and accurately reconciled.
            </p>
          </div>

          {/* Feature 2 */}
          <div
            onClick={() => openNewInstance('quality')}
              className="group rounded-lg border border-slate-700 p-6 transition-all duration-300 ease-in-out bg-slate-800/50 backdrop-blur-sm hover:bg-slate-800/70 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer transform-gpu"
          >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <FaChartLine size={24} />
                </div>
            <h3 className="text-lg font-semibold text-emerald-400">GENERIC QUALITY & ASSURANCE CONTROL</h3>
              </div>
            <p className="mt-2 text-gray-300">
              Ensure data quality and integrity through comprehensive validation checks and quality assurance protocols.
            </p>
          </div>

          {/* Feature 3 */}
          <div
            onClick={() => openNewInstance('batch')}
              className="group rounded-lg border border-slate-700 p-6 transition-all duration-300 ease-in-out bg-slate-800/50 backdrop-blur-sm hover:bg-slate-800/70 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer transform-gpu"
          >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <FaServer size={24} />
                </div>
            <h3 className="text-lg font-semibold text-emerald-400">GENERIC BATCH RUN CONTROL</h3>
              </div>
            <p className="mt-2 text-gray-300">
              Manage and monitor batch processing operations with real-time tracking and execution control capabilities.
            </p>
          </div>

          {/* Feature 4 */}
          <div
            onClick={() => openNewInstance('config')}
              className="group rounded-lg border border-slate-700 p-6 transition-all duration-300 ease-in-out bg-slate-800/50 backdrop-blur-sm hover:bg-slate-800/70 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer transform-gpu"
          >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                  <FaCog size={24} />
                </div>
            <h3 className="text-lg font-semibold text-emerald-400">GENERIC AUTO CONFIG CHECKER</h3>
              </div>
            <p className="mt-2 text-gray-300">
              Automatically verify and validate system configurations, ensuring alignment with established standards and requirements.
            </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">
        <div className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-emerald-400 to-cyan-400 opacity-20 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]" />
      </div>
    </div>
  );
}
