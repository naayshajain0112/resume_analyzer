import React, { useState, useRef } from 'react';

export default function InputForm({ onSubmit }) {
  // State for the CV file upload
  const [cvFile, setCvFile] = useState(null);
  
  // State for the LinkedIn profile URL input
  const [linkedinUrl, setLinkedinUrl] = useState('');
  
  // Track if the file zone is currently active during drag-and-drop
  const [dragActive, setDragActive] = useState(false);
  
  // Store validation errors to display to the user
  const [errors, setErrors] = useState({});
  
  // Create ref for the CV file input element
  const cvFileInputRef = useRef(null);

  // Handle drag enter/leave events - manage visual feedback during drag operations
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true); // Highlight the zone being dragged over
    } else if (e.type === 'dragleave') {
      setDragActive(false); // Remove highlight when dragging leaves
    }
  };

  // Handle file drop event - user dropped a file into the drop zone
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  // Handle file selection via the hidden file input
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  // Validate that the file is a PDF, then update the CV state
  const validateAndSetFile = (selectedFile) => {
    // Only accept PDF files
    const validTypes = ['application/pdf'];
    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
    
    if (validTypes.includes(selectedFile.type) || fileExtension === 'pdf') {
      // File is valid - store it
      setCvFile(selectedFile);
      setErrors((prev) => ({ ...prev, cv: null }));
    } else {
      // Set an error if the file type is invalid
      setErrors((prev) => ({ 
        ...prev, 
        cv: 'Only PDF files are allowed. Please upload a PDF document.' 
      }));
    }
  };

  // Validate form and submit - called when user clicks "Run Consistency Verification" button
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    // Check if CV file was uploaded
    if (!cvFile) {
      newErrors.cv = 'CV document is required';
    }

    // Check if LinkedIn URL was provided
    if (!linkedinUrl) {
      newErrors.linkedinUrl = 'LinkedIn profile URL is required';
    } else if (!linkedinUrl.includes('linkedin.com/')) {
      // Validate it's a proper LinkedIn URL
      newErrors.linkedinUrl = 'Please enter a valid LinkedIn URL (e.g., linkedin.com/in/username)';
    }

    // If there are any validation errors, display them and stop submission
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Both CV and LinkedIn URL are valid - pass them to the parent App component for API submission
    onSubmit({ cvFile, linkedinUrl });
  };

  // Trigger file input dialog for CV file
  const triggerCvFileInput = () => {
    cvFileInputRef.current.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto glass p-8 sm:p-10 rounded-3xl shadow-2xl transition-all duration-500 hover:border-slate-800">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 mb-4 border border-indigo-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
          Verify Alignment
        </h2>
        <p className="text-slate-400 font-medium text-sm sm:text-base">
          Analyze background check variables. Compare LinkedIn credentials with the candidate's CV using Gemini AI.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* LinkedIn URL Input */}
        <div>
          <label htmlFor="linkedinUrl" className="block text-sm font-semibold text-slate-300 mb-2">
            LinkedIn Profile URL
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-400 transition-colors">
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
            </div>
            <input
              type="text"
              id="linkedinUrl"
              value={linkedinUrl}
              onChange={(e) => {
                setLinkedinUrl(e.target.value);
                // Clear error when user starts typing
                if (errors.linkedinUrl) setErrors((prev) => ({ ...prev, linkedinUrl: null }));
              }}
              placeholder="https://www.linkedin.com/in/candidate-profile"
              className={`block w-full pl-12 pr-4 py-3.5 bg-slate-900/60 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all duration-300 ${
                errors.linkedinUrl ? 'border-red-500/60 focus:border-red-500' : 'border-slate-800 focus:border-indigo-500'
              }`}
            />
          </div>
          {errors.linkedinUrl && (
            <p className="mt-2 text-xs font-semibold text-red-400 flex items-center">
              <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.linkedinUrl}
            </p>
          )}
        </div>

        {/* CV File Drag and Drop Zone */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Upload CV (PDF)
          </label>
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerCvFileInput}
            className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group ${
              dragActive
                ? 'border-indigo-500 bg-indigo-500/5'
                : cvFile
                  ? 'border-emerald-500/60 bg-emerald-500/5'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
            }`}
          >
            <input
              type="file"
              ref={cvFileInputRef}
              onChange={handleFileChange}
              accept=".pdf,application/pdf"
              className="hidden"
            />

            {!cvFile ? (
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-xl bg-slate-800/80 text-slate-400 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  Drag CV here, or <span className="text-indigo-400 group-hover:text-indigo-300 transition-colors">browse</span>
                </p>
                <p className="mt-1.5 text-xs text-slate-500">
                  PDF format only (Max 10MB)
                </p>
              </div>
            ) : (
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-200 truncate max-w-md">
                      {cvFile.name}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {(cvFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCvFile(null);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {errors.cv && (
            <p className="mt-2 text-xs font-semibold text-red-400 flex items-center">
              <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.cv}
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className="w-full flex items-center justify-center px-6 py-4 rounded-xl text-white font-semibold text-base transition-all duration-300 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:via-purple-500 hover:to-pink-500 shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] border border-white/10"
        >
          <span>Run Consistency Verification</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
