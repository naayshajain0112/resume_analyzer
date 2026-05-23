import React, { useState, useEffect } from 'react';
import InputForm from './components/InputForm';

function App() {
  const [appState, setAppState] = useState('input');
  const [submitDetails, setSubmitDetails] = useState(null);
  const [loadingStep, setLoadingStep] = useState(0);

  // Dynamic status messages for the loading state to feel interactive and premium
  const loadingSteps = [
    { title: 'Extracting CV Metadata', desc: 'Parsing candidate document structure and reading textual blocks...' },
    { title: 'Resolving LinkedIn Profile', desc: 'Querying LinkedIn databases and extracting profile fields...' },
    { title: 'Cross-Referencing Details', desc: 'Running Gemini AI semantic mapping of experience history...' },
    { title: 'Detecting Discrepancies', desc: 'Verifying employment dates, job titles, and educational periods...' },
    { title: 'Compiling Final Report', desc: 'Formatting compliance score and structuring background checks...' }
  ];

  useEffect(() => {
    let interval;
    if (appState === 'loading') {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => {
          if (prev < loadingSteps.length - 1) {
            return prev + 1;
          } else {
            // Automatically transitions to report once loading completes (e.g., after 10s)
            clearInterval(interval);
            setAppState('report');
            return prev;
          }
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [appState]);

  const handleFormSubmit = ({ linkedinUrl, file }) => {
    setSubmitDetails({
      linkedinUrl,
      fileName: file.name,
      fileSize: (file.size / (1024 * 1024)).toFixed(2)
    });
    setAppState('loading');
  };

  const handleReset = () => {
    setSubmitDetails(null);
    setAppState('input');
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      {/* Top Navigation / Brand */}
      <header className="w-full max-w-7xl mx-auto mb-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="px-4 py-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg shadow-indigo-500/5 backdrop-blur-md flex items-center justify-center hover:border-slate-700/80 transition-all duration-300">
              <span className="font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-indigo-100 to-slate-200 font-['Outfit']">
                Resume Analyser
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex items-center justify-center py-6">
        
        {/* INPUT STATE */}
        {appState === 'input' && (
          <div className="w-full flex flex-col items-center">
            {/* Title / Hero */}
            <div className="text-center mb-8 max-w-xl animate-float">
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 via-purple-300 to-pink-200">
                  CV vs. LinkedIn
                </span>
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">
                  Consistency Checker
                </span>
              </h1>
            </div>
            
            <InputForm onSubmit={handleFormSubmit} />
          </div>
        )}

        {/* LOADING STATE */}
        {appState === 'loading' && submitDetails && (
          <div className="w-full max-w-xl mx-auto glass p-10 rounded-3xl shadow-2xl text-center relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl"></div>

            {/* Scanning radar visualizer */}
            <div className="relative w-36 h-36 mx-auto mb-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-indigo-500/20 animate-ping"></div>
              <div className="absolute inset-2 rounded-full border border-purple-500/30 animate-pulse-slow"></div>
              
              <div className="w-24 h-24 rounded-full bg-slate-900 border-2 border-indigo-500/40 flex items-center justify-center relative overflow-hidden shadow-inner shadow-indigo-500/20">
                {/* Horizontal scan beam */}
                <div className="absolute w-full h-[3px] bg-gradient-to-r from-transparent via-indigo-400 to-transparent top-0 animate-[bounce_3s_ease-in-out_infinite] shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                
                {/* Document comparison graphic icons */}
                <div className="flex space-x-2 text-indigo-400 animate-pulse">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-2">Analyzing Profiles</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8 font-medium">
              Comparing <span className="text-slate-200 font-semibold">{submitDetails.fileName}</span> with LinkedIn URL data.
            </p>

            {/* Stepper Display */}
            <div className="space-y-4 text-left max-w-sm mx-auto bg-slate-950/50 p-6 rounded-2xl border border-slate-900">
              {loadingSteps.map((step, idx) => (
                <div key={idx} className="flex items-start space-x-3 transition-opacity duration-300">
                  <div className="mt-1 flex-shrink-0">
                    {loadingStep > idx ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : loadingStep === idx ? (
                      <div className="w-5 h-5 rounded-full border border-indigo-500 flex items-center justify-center relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping"></div>
                        <div className="w-2 h-2 rounded-full bg-indigo-500 absolute"></div>
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-800 flex items-center justify-center text-slate-700 text-xs">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold transition-colors duration-300 ${loadingStep === idx ? 'text-indigo-400' : loadingStep > idx ? 'text-slate-300' : 'text-slate-600'}`}>
                      {step.title}
                    </p>
                    {loadingStep === idx && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {step.desc}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Dev skip button */}
            <button
              onClick={() => setAppState('report')}
              className="mt-8 text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider underline underline-offset-4"
            >
              Skip Wait & Generate Report
            </button>
          </div>
        )}

        {/* REPORT STATE */}
        {appState === 'report' && submitDetails && (
          <div className="w-full max-w-4xl mx-auto space-y-6 animate-[fadeIn_0.5s_ease-out]">
            
            {/* Header Compliance Overview Panel */}
            <div className="glass p-8 sm:p-10 rounded-3xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    Verification Warning
                  </span>
                  <span className="text-xs text-slate-500 font-semibold font-mono">
                    ID: SHIELD-998822
                  </span>
                </div>
                
                <div>
                  <h2 className="text-3xl font-extrabold text-white">Consistency Assessment</h2>
                  <p className="text-slate-400 text-sm mt-1.5 font-medium">
                    Verified CV: <span className="text-slate-200 font-semibold">{submitDetails.fileName}</span>
                  </p>
                  <p className="text-slate-400 text-sm mt-1 font-medium truncate max-w-lg">
                    LinkedIn: <a href={submitDetails.linkedinUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">{submitDetails.linkedinUrl}</a>
                  </p>
                </div>
              </div>

              {/* Radial Score Indicator */}
              <div className="flex items-center gap-5 bg-slate-950/40 p-6 rounded-2xl border border-slate-900">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                    <circle cx="48" cy="48" r="40" stroke="url(#scoreGrad)" strokeWidth="8" fill="transparent"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - 0.85)} // 85% Score
                      strokeLinecap="round" />
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-extrabold text-white">85%</span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Match</span>
                  </div>
                </div>
                <div className="text-left space-y-1">
                  <p className="text-sm font-bold text-slate-200">High Reliability</p>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-[160px]">
                    Main content matches. Minor employment interval conflicts found.
                  </p>
                </div>
              </div>
            </div>

            {/* Deep Section Checks comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Left Column Checklist summary */}
              <div className="md:col-span-1 glass p-6 rounded-3xl space-y-6">
                <h3 className="text-lg font-bold text-white tracking-wide border-b border-slate-900 pb-3">
                  Verification Checklist
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-xl border border-emerald-500/20 text-emerald-400">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-semibold text-slate-200">Skills Matching</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">Pass</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-xl border border-emerald-500/20 text-emerald-400">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-semibold text-slate-200">Education Check</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 rounded-md border border-emerald-500/20">Pass</span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-slate-950/40 rounded-xl border border-amber-500/20 text-amber-400">
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm font-semibold text-slate-200">Work Dates</span>
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500/10 rounded-md border border-amber-500/20">Review</span>
                  </div>
                </div>
              </div>

              {/* Right Column Detailed Comparison */}
              <div className="md:col-span-2 glass p-6 rounded-3xl space-y-6">
                <h3 className="text-lg font-bold text-white tracking-wide border-b border-slate-900 pb-3">
                  Identified Discrepancies
                </h3>

                <div className="space-y-4">
                  {/* Item 1 */}
                  <div className="bg-slate-950/30 border border-slate-950 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Google — Senior Software Engineer</span>
                      <span className="text-[10px] font-bold tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase">
                        Date Mismatch
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block mb-1 text-[10px] uppercase tracking-wider">Candidate CV</span>
                        <span className="text-slate-200 font-semibold text-sm">Jan 2021 — Dec 2023</span>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block mb-1 text-[10px] uppercase tracking-wider">LinkedIn Profile</span>
                        <span className="text-slate-200 font-semibold text-sm">Jul 2020 — Nov 2023</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      LinkedIn profile shows the candidate started 6 months earlier than listed on the CV. Verify exact payroll or tenure certificates.
                    </p>
                  </div>

                  {/* Item 2 */}
                  <div className="bg-slate-950/30 border border-slate-950 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">Netflix — Tech Lead</span>
                      <span className="text-[10px] font-bold tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase">
                        Title Mismatch
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block mb-1 text-[10px] uppercase tracking-wider">Candidate CV</span>
                        <span className="text-slate-200 font-semibold text-sm">Lead Software Engineer</span>
                      </div>
                      <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block mb-1 text-[10px] uppercase tracking-wider">LinkedIn Profile</span>
                        <span className="text-slate-200 font-semibold text-sm">Senior Software Engineer</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Job title listed as Tech/Lead on the CV, whereas LinkedIn refers to the profile as Senior Engineer. Verify delegation authority.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Actions bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-6 glass rounded-3xl gap-4">
              <button
                onClick={handleReset}
                className="w-full sm:w-auto flex items-center justify-center px-5 py-3 rounded-xl text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all font-semibold text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.334 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
                Verify New Candidate
              </button>
              
              <button
                type="button"
                onClick={() => alert('Downloading PDF Report...')}
                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 transition-all border border-indigo-400/20 text-center flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Report (PDF)
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Footer copyright */}
      <footer className="w-full max-w-7xl mx-auto mt-10 text-center text-slate-600 text-xs font-semibold">
        <p>© 2026 resume analyser. All rights reserved.</p>
        <p className="mt-1 text-slate-700">Powered by Gemini 1.5 Pro & React Vite Stack</p>
      </footer>
    </div>
  );
}

export default App;
