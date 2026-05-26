/**
 * utils/geminiService.js - Gemini AI Document Comparison Service
 *
 * This module connects to Google's Gemini AI (model: gemini-2.5-flash) and
 * performs a strict, fact-based comparison between a candidate's CV/resume
 * and their LinkedIn profile text.
 *
 * It checks for consistency across identity, experience, education, and skills —
 * flagging any mismatches or missing information without making assumptions.
 *
 * Usage:
 *   const { analyzeDocuments } = require('./utils/geminiService');
 *   const result = await analyzeDocuments(cvText, linkedinText);
 */

// Load the official Google Generative AI SDK.
// This package gives us access to Gemini models via a simple API.
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables so we can access GEMINI_API_KEY from the .env file.
// NOTE: dotenv.config() should already be called in server.js before this module runs.
//       We call it here too as a safety net in case this file is used standalone.
require('dotenv').config();

/**
 * Strictly compares CV/resume text against LinkedIn profile text using Gemini AI.
 *
 * The AI is instructed to:
 *  - Compare ONLY what is explicitly stated in both documents
 *  - NOT make assumptions or infer missing information
 *  - Treat missing data as a mismatch
 *  - Ignore phone numbers and email addresses
 *  - Return ONLY valid JSON (no markdown, no extra text)
 *
 * @param {string} cvText       - Plain text extracted from the candidate's CV/resume.
 * @param {string} linkedinText - Plain text extracted from the candidate's LinkedIn profile.
 * @returns {Promise<Object>}   - Parsed JSON object containing the comparison results.
 * @throws {Error}              - If the API key is missing, the API call fails, or the response isn't valid JSON.
 *
 * @example
 *   const result = await analyzeDocuments(cvText, linkedinText);
 *   console.log(result.overallMatch);     // e.g., "MATCH" | "PARTIAL_MATCH" | "MISMATCH"
 *   console.log(result.matchPercentage);  // e.g., 72
 */
async function analyzeDocuments(cvText, linkedinText) {
  try {
    // --- Step 1: Validate the API key ---
    // The GEMINI_API_KEY must be set in the backend/.env file.
    // You can get a free key at: https://aistudio.google.com/
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error(
        'GEMINI_API_KEY is not configured. ' +
        'Please add your API key to the backend/.env file. ' +
        'Get a free key at: https://aistudio.google.com/'
      );
    }

    // --- Step 2: Validate inputs ---
    // Both documents must be provided for a meaningful comparison.
    if (!cvText || typeof cvText !== 'string' || cvText.trim().length === 0) {
      throw new Error('CV/resume text is required and cannot be empty.');
    }

    if (!linkedinText || typeof linkedinText !== 'string' || linkedinText.trim().length === 0) {
      throw new Error('LinkedIn profile text is required and cannot be empty.');
    }

    // --- Step 3: Initialize the Gemini AI client ---
    // GoogleGenerativeAI is the main class that handles authentication
    // and communication with Google's AI servers.
    const genAI = new GoogleGenerativeAI(apiKey);

    // --- Step 4: Select the model ---
    // We use "gemini-2.5-flash" — it's fast, capable, and cost-effective.
    // The responseMimeType is set to "application/json" so the model
    // returns ONLY valid JSON without any markdown wrappers.
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temperature = more deterministic, factual output
      },
    });

    // --- Step 5: Build the comparison prompt ---
    // This prompt instructs the AI to be strict, factual, and structured.
    // It explicitly tells the model what to compare and how to handle edge cases.
    const prompt = `
You are a strict document verification agent. Your job is to compare a CV/Resume against a LinkedIn profile and identify factual consistencies and inconsistencies.

## RULES (follow these exactly):
1. Compare ONLY what is explicitly written in each document.
2. Do NOT assume, infer, or fill in missing information.
3. If data is present in one document but missing in the other, mark it as a MISMATCH.
4. IGNORE phone numbers and email addresses entirely — do not compare or mention them.
5. Be case-insensitive when comparing names, titles, and company names.
6. Dates should be compared by month/year if available; minor formatting differences are acceptable.

## COMPARE THESE CATEGORIES:

### 1. Identity
- Full name
- Professional title / headline
- Location (city, country)

### 2. Experience
- Company names
- Job titles
- Employment dates (start and end)
- Order and number of roles listed

### 3. Education
- Institution names
- Degree / qualification names
- Fields of study
- Graduation dates or years

### 4. Skills
- Technical skills listed
- Certifications or licenses
- Languages

## DOCUMENTS TO COMPARE:

### CV / Resume:
"""
${cvText}
"""

### LinkedIn Profile:
"""
${linkedinText}
"""

## REQUIRED OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure (no markdown, no explanation, no extra text):

{
  "overallMatch": "MATCH | PARTIAL_MATCH | MISMATCH",
  "matchPercentage": <number between 0 and 100>,
  "summary": "<one or two sentence overall summary>",
  "categories": {
    "identity": {
      "status": "MATCH | PARTIAL_MATCH | MISMATCH",
      "findings": [
        {
          "field": "<field name>",
          "cvValue": "<value from CV or 'NOT_FOUND'>",
          "linkedinValue": "<value from LinkedIn or 'NOT_FOUND'>",
          "match": true | false
        }
      ]
    },
    "experience": {
      "status": "MATCH | PARTIAL_MATCH | MISMATCH",
      "findings": [
        {
          "field": "<company - role>",
          "cvValue": "<value from CV or 'NOT_FOUND'>",
          "linkedinValue": "<value from LinkedIn or 'NOT_FOUND'>",
          "match": true | false
        }
      ]
    },
    "education": {
      "status": "MATCH | PARTIAL_MATCH | MISMATCH",
      "findings": [
        {
          "field": "<institution - degree>",
          "cvValue": "<value from CV or 'NOT_FOUND'>",
          "linkedinValue": "<value from LinkedIn or 'NOT_FOUND'>",
          "match": true | false
        }
      ]
    },
    "skills": {
      "status": "MATCH | PARTIAL_MATCH | MISMATCH",
      "findings": [
        {
          "field": "<skill or certification>",
          "cvValue": "<value from CV or 'NOT_FOUND'>",
          "linkedinValue": "<value from LinkedIn or 'NOT_FOUND'>",
          "match": true | false
        }
      ]
    }
  },
  "redFlags": [
    "<any significant discrepancies or concerns>"
  ]
}
`;

    // --- Step 6: Send the prompt to Gemini and get a response ---
    console.log('[GeminiService] Sending documents to Gemini 2.5 Flash for comparison...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const responseText = response.text();

    // --- Step 7: Parse the response as JSON ---
    // Since we set responseMimeType to "application/json", the model should
    // return clean JSON. But we still wrap the parse in a try/catch just in case.
    let analysisResult;
    try {
      analysisResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[GeminiService] Failed to parse Gemini response as JSON:', parseError.message);
      console.error('[GeminiService] Raw response was:', responseText);
      throw new Error(
        'Gemini returned an invalid JSON response. ' +
        'This is unusual — please try again or check the input documents.'
      );
    }

    console.log('[GeminiService] Analysis complete. Overall match:', analysisResult.overallMatch);
    return analysisResult;

  } catch (error) {
    // --- Error Handling ---
    // Log the full error for debugging, then re-throw with a clean message.
    console.error('[GeminiService] Error during document analysis:', error.message);
    throw error;
  }
}

// Export using CommonJS so other files can require() this module.
module.exports = { analyzeDocuments };
