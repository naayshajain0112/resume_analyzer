import React, { useState, useEffect } from 'react';
import InputForm from './components/InputForm';

/**
 * Standalone helper function to convert a File to base64 Data URL
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - Promise that resolves to base64 string (without data: prefix)
 * @throws {Error} - If file is invalid, reading fails, or FileReader result is undefined
 */
const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    // Validate that file is a real File instance
    if (!(file instanceof File)) {
      const errorMsg = `Invalid file object: expected File instance, got ${typeof file}`;
      console.error('[readFileAsBase64]', errorMsg);
      reject(new Error(errorMsg));
      return;
    }

    console.log('[readFileAsBase64] Starting file read:', file.name, '(' + file.size + ' bytes)');

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        // Explicitly check if reader.result exists and is a string
        if (!reader.result) {
          throw new Error('FileReader.result is undefined or null - file may not have been read');
        }

        if (typeof reader.result !== 'string') {
          throw new Error(`FileReader.result is not a string: ${typeof reader.result}`);
        }

        console.log('[readFileAsBase64] FileReader.result available, length:', reader.result.length);

        // Extract base64 string from data URL
        // Format: "data:application/pdf;base64,JVBERi0xLjQK..."
        // We need just the part after the comma
        let base64String;
        if (reader.result.includes(',')) {
          base64String = reader.result.split(',')[1];
        } else {
          // Fallback: use full result if no comma found
          base64String = reader.result;
        }

        if (!base64String || base64String.trim().length === 0) {
          throw new Error('Failed to extract valid base64 data from FileReader result');
        }

        console.log('[readFileAsBase64] Successfully extracted base64, length:', base64String.length);
        resolve(base64String);
      } catch (err) {
        console.error('[readFileAsBase64] Error in onload handler:', err.message);
        reject(err);
      }
    };

    reader.onerror = () => {
      const errorMsg = `FileReader error event fired. Possible causes: permission denied, file was removed, or browser security restrictions`;
      console.error('[readFileAsBase64]', errorMsg);
      reject(new Error('Failed to read file: ' + errorMsg));
    };

    reader.onabort = () => {
      const errorMsg = 'File reading was cancelled by the user or the browser';
      console.error('[readFileAsBase64]', errorMsg);
      reject(new Error(errorMsg));
    };

    // Initiate the file read as a data URL (base64)
    console.log('[readFileAsBase64] Calling readAsDataURL...');
    reader.readAsDataURL(file);
  });
};

function App() {
  // Current view state: 'input' | 'loading' | 'result' | 'error'
  const [appState, setAppState] = useState('input');
  
  // Store details about the submitted files
  const [submitDetails, setSubmitDetails] = useState(null);
  
  // Store the backend API response (analysis results)
  const [apiResponse, setApiResponse] = useState(null);
  
  // Store any error messages that occur during API calls
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Track which loading step we're on (for the animated loading UI)
  const [loadingStep, setLoadingStep] = useState(0);

  // Dynamic status messages for the loading state to feel interactive and premium
  const loadingSteps = [
    { title: 'Extracting CV Metadata', desc: 'Parsing candidate document structure and reading textual blocks...' },
    { title: 'Resolving LinkedIn Profile', desc: 'Processing LinkedIn profile PDF and extracting profile data...' },
    { title: 'Cross-Referencing Details', desc: 'Running Gemini AI semantic mapping of experience history...' },
    { title: 'Detecting Discrepancies', desc: 'Verifying employment dates, job titles, and educational periods...' },
    { title: 'Compiling Final Report', desc: 'Formatting compliance score and structuring background checks...' }
  ];

  // Effect: Animate the loading steps while API request is in progress
  useEffect(() => {
    let interval;
    if (appState === 'loading') {
      setLoadingStep(0);
      // Update loading step every 2 seconds for visual feedback
      interval = setInterval(() => {
        setLoadingStep((prev) => {
          // Keep animation within bounds (don't exceed total steps)
          if (prev < loadingSteps.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [appState]);

  // Effect: Make API call when form is submitted
  useEffect(() => {
    // Only run when we have submit details and app is in loading state
    if (submitDetails && appState === 'loading') {
      submitToBackend(submitDetails.cvFile, submitDetails.linkedinFile);
    }
  }, [submitDetails, appState]);

  // Function to send both PDF files to the backend API
  const submitToBackend = async (cvFile, linkedinFile) => {
    try {
      if (!cvFile || !(cvFile instanceof File)) {
        throw new Error('CV file is missing or invalid. Please upload a valid PDF.');
      }
      if (!linkedinFile || !(linkedinFile instanceof File)) {
        throw new Error('LinkedIn PDF is missing or invalid. Please upload a valid PDF.');
      }

      console.log('[Frontend] Starting API call...');
      console.log('[Frontend] CV File:', cvFile.name, cvFile.size, 'bytes');
      console.log('[Frontend] LinkedIn File:', linkedinFile.name, linkedinFile.size, 'bytes');

      const formData = new FormData();
      formData.append('cv', cvFile);
      formData.append('linkedin', linkedinFile);

      console.log('[Frontend] Sending multipart form data to backend...');
      const response = await fetch('http://localhost:5000/api/verify', {
        method: 'POST',
        // Do NOT set Content-Type header - browser will set it with boundary
        // headers: { 'Content-Type': 'multipart/form-data' } // ← Remove this!
        body: formData,
      });

      console.log('[Frontend] Response status:', response.status);

      // Check if response status is OK (200-299 range)
      if (!response.ok) {
        const responseText = await response.text();
        console.log('[Frontend] Error response:', responseText.substring(0, 500));
        throw new Error(`Server error: ${response.status}`);
      }

      // Parse the successful response as JSON
      const data = await response.json();
      console.log('[Frontend] Success! Analysis result received');
      console.log('[Frontend] Response keys:', Object.keys(data));
      
      // Store the API response in state
      setApiResponse(data);
      
      // Transition to result view to display the data
      setAppState('result');
      
    } catch (error) {
      // Log error details for debugging
      console.error('[Frontend] API Error:', error.message);
      
      // Store error message and transition to error view
      setErrorMessage(error.message);
      setAppState('error');
    }
  };

  // Handler for form submission - receives CV file and LinkedIn URL from InputForm component
  const handleFormSubmit = ({ cvFile, linkedinFile }) => {
    setSubmitDetails({
      cvFileName: cvFile.name,
      linkedinFileName: linkedinFile.name,
      cvFile,
      linkedinFile,
    });
    
    // Clear any previous errors
    setErrorMessage(null);
    setApiResponse(null);
    
    // Transition to loading state
    setAppState('loading');
  };

  // Handler to reset app to initial state - called from result/error screens
  const handleReset = () => {
    setSubmitDetails(null);
    setApiResponse(null);
    setErrorMessage(null);
    setLoadingStep(0);
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
              Comparing <span className="text-slate-200 font-semibold">{submitDetails.cvFileName}</span> with <span className="text-slate-200 font-semibold">{submitDetails.linkedinFileName}</span>
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
          </div>
        )}

        {/* RESULT STATE - Display API response data */}
        {appState === 'result' && apiResponse && (
          <div className="w-full max-w-4xl mx-auto space-y-6 animate-[fadeIn_0.5s_ease-out]">
            
            {/* Header with Summary */}
            <div className="glass p-8 sm:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-green-500/10 rounded-full blur-3xl"></div>
              
              <div className="space-y-4 relative z-10">
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    Verification Complete
                  </span>
                </div>
                
                <div>
                  <h2 className="text-3xl font-extrabold text-white">Analysis Results</h2>
                  <p className="text-slate-400 text-sm mt-2 font-medium">
                    CV: <span className="text-slate-200 font-semibold">{apiResponse.files?.cv?.name}</span> ({apiResponse.files?.cv?.size} bytes)
                  </p>
                  <p className="text-slate-400 text-sm mt-1 font-medium">
                    LinkedIn PDF: <span className="text-slate-200 font-semibold">{apiResponse.meta?.linkedinFileName}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Analysis Results Display */}
            {apiResponse && (apiResponse.analysis || apiResponse.response) && (
              <div className="glass p-8 rounded-3xl shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">CV vs LinkedIn Consistency Report</h3>
                
                {/* Summary Info (if available from new response format) */}
                {apiResponse.linkedin && (
                  <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide">LinkedIn Profile</p>
                      <p className="text-white font-semibold mt-1">{apiResponse.linkedin.fullName || 'N/A'}</p>
                      <p className="text-slate-300 text-sm mt-0.5">{apiResponse.linkedin.headline || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide">Experience & Education</p>
                      <p className="text-white font-semibold mt-1">{apiResponse.linkedin.experienceCount} roles • {apiResponse.linkedin.educationCount} degrees</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide">Skills</p>
                      <p className="text-white font-semibold mt-1">{apiResponse.linkedin.skillsCount} skills listed</p>
                    </div>
                  </div>
                )}
                
                {/* Gemini Analysis Report */}
                <div className="bg-slate-950/80 p-6 rounded-2xl border border-slate-900/80 relative group">
                  {/* Copy Button (Positioned in top-right corner) */}
                  <button
                    onClick={() => {
                      const textToCopy = apiResponse.analysis || apiResponse.response;
                      navigator.clipboard.writeText(textToCopy);
                      // Show temporary success feedback
                      const btn = event.target;
                      const originalText = btn.textContent;
                      btn.textContent = 'Copied!';
                      setTimeout(() => {
                        btn.textContent = originalText;
                      }, 2000);
                    }}
                    className="absolute top-4 right-4 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-lg"
                  >
                    Copy Report
                  </button>
                  
                  {/* Display the analysis report as formatted text */}
                  <pre className="text-slate-200 text-sm overflow-auto max-h-[600px] whitespace-pre-wrap break-words font-mono leading-relaxed">
                    {apiResponse.analysis || apiResponse.response}
                  </pre>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl text-white font-semibold bg-indigo-600 hover:bg-indigo-500 transition-all duration-300 shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
              >
                Run Another Analysis
              </button>
              <button
                onClick={() => {
                  // Copy the response to clipboard for user reference
                  navigator.clipboard.writeText(JSON.stringify(apiResponse, null, 2));
                  alert('Response copied to clipboard!');
                }}
                className="px-6 py-3 rounded-xl text-slate-300 font-semibold bg-slate-800 hover:bg-slate-700 transition-all duration-300"
              >
                Copy Results
              </button>
            </div>
          </div>
        )}

        {/* ERROR STATE - Display error message */}
        {appState === 'error' && (
          <div className="w-full max-w-2xl mx-auto glass p-10 rounded-3xl shadow-2xl text-center relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/5 rounded-full blur-3xl"></div>

            <div className="relative z-10">
              {/* Error icon */}
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">Analysis Failed</h3>
              <p className="text-red-400 text-sm font-semibold mb-2">Error occurred during verification</p>
              
              {/* Display error message */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6">
                <p className="text-slate-300 text-sm font-mono text-left">
                  {errorMessage}
                </p>
              </div>

              <p className="text-slate-400 text-xs mb-6">
                Please check that the CV file is a valid PDF, the LinkedIn URL is valid, and the backend server is running on http://localhost:5000
              </p>

              {/* Reset button to go back */}
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl text-white font-semibold bg-indigo-600 hover:bg-indigo-500 transition-all duration-300 shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
              >
                Try Again
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
