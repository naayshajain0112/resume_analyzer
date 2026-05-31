/**
 * routes/resume.js - Resume Analyzer Routes
 * 
 * This file defines the Express routes for handling resume uploads.
 * It uses 'multer' to process file uploads, extracts text using the PDF parser utility,
 * and calls the Gemini AI utility to generate structured evaluation analysis.
 */

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const router = express.Router();

// Import our custom utility helper functions
const { extractTextFromPDF } = require('../utils/pdfParser');
const { analyzeResumeWithGemini } = require('../utils/gemini');

// ==========================================
// 1. CONFIGURE MULTER UPLOAD STORAGE
// ==========================================
// Use disk storage so PDF and DOCX files can be inspected by type-specific parsers.
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
  }
});

// ALTERNATIVE (Disk Storage): If you would rather save files to the 'uploads/' folder:
/*
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Specifies upload folder
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});
*/

// Set up the file size limit (e.g., 5MB) and validate that uploaded files are PDFs or DOCX files.
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 Megabytes
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'), false);
    }
  }
});

// ==========================================
// 2. ENDPOINT: POST /api/resume/analyze
// ==========================================
// This route expects:
// - A multipart/form-data upload with a file key named 'resume'
// - An optional text field key named 'jobDescription'
router.post('/analyze', upload.single('resume'), async (req, res, next) => {
  try {
    // 1. Verify that a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing resume upload file. Please upload a valid PDF or DOCX.'
      });
    }

    // 2. Extract jobDescription if provided from body parameters
    const jobDescription = req.body.jobDescription || '';

    console.log(`[Resume Route] File received: ${req.file.originalname} (${req.file.size} bytes)`);
    console.log(`[Resume Route] Job description provided: ${jobDescription ? 'Yes' : 'No'}`);

    // 3. Extract text content based on file type
    const uploadedFilePath = req.file.path;
    const fileType = req.file.mimetype;
    let extractedText = '';

    if (fileType === 'application/pdf') {
      console.log('[Resume Route] Extracting text from PDF...');
      const pdfBuffer = fs.readFileSync(uploadedFilePath);
      extractedText = await extractTextFromPDF(pdfBuffer);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      console.log('[Resume Route] Extracting text from DOCX...');
      const result = await mammoth.extractRawText({ path: uploadedFilePath });
      extractedText = result.value;
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Only PDF and DOCX files are allowed'
      });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Could not extract text content from the uploaded file. The document might be scanned, corrupted, or empty.'
      });
    }

    console.log(`[Resume Route] Text extracted successfully. Length: ${extractedText.length} characters.`);

    // 4. Send resume text and job description to Google Gemini AI
    console.log('[Resume Route] Sending text to Gemini AI for analysis...');
    const analysisResponseString = await analyzeResumeWithGemini(extractedText, jobDescription);

    // 5. Parse the returned string into JSON (Gemini will return raw JSON due to the responseMimeType config)
    let analysisJSON;
    try {
      analysisJSON = JSON.parse(analysisResponseString);
    } catch (parseError) {
      console.warn('[Resume Route] Failed to parse Gemini response as JSON. Sending raw response.', parseError);
      analysisJSON = {
        rawAnalysis: analysisResponseString
      };
    }

    // 6. Return successful response to the frontend client
    return res.json({
      status: 'success',
      filename: req.file.originalname,
      characterCount: extractedText.length,
      analysis: analysisJSON
    });

  } catch (error) {
    // Forward the error to Express's global error handler
    console.error('[Resume Route Endpoint Error]:', error);
    next(error);
  }
});

module.exports = router;
