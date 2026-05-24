const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// Multer: store uploaded file in memory as a buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

router.post('/verify', upload.single('cv'), async (req, res) => {
  try {
    console.log('[POST /api/verify] Request received');

    // Extract uploaded file and LinkedIn URL
    const cvFile = req.file;
    const linkedinUrl = req.body.linkedinUrl;

    // Validate inputs
    if (!cvFile) {
      console.warn('[POST /api/verify] No CV file uploaded');
      return res.status(400).json({ success: false, error: 'No CV file uploaded. Please upload a PDF.' });
    }

    if (!linkedinUrl || linkedinUrl.trim().length === 0) {
      console.warn('[POST /api/verify] Missing LinkedIn URL');
      return res.status(400).json({ success: false, error: 'LinkedIn URL is required.' });
    }

    console.log('[POST /api/verify] CV file:', cvFile.originalname, cvFile.size, 'bytes');
    console.log('[POST /api/verify] LinkedIn URL:', linkedinUrl);

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(500).json({ success: false, error: 'GEMINI_API_KEY not configured in .env file.' });
    }

    // Convert PDF buffer to base64 for Gemini
    const cvBase64 = cvFile.buffer.toString('base64');
    console.log('[POST /api/verify] PDF converted to base64, sending to Gemini...');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });

    // Structured prompt for the verification report
    const prompt = `
You are a strict professional background verification expert.

Analyze the attached CV (PDF) against this LinkedIn profile: ${linkedinUrl}

Generate a CV vs LinkedIn Consistency Verification Report in EXACTLY this format:

================================================
CV VS LINKEDIN CONSISTENCY VERIFICATION REPORT
================================================

1. CANDIDATE IDENTITY
   - Full Name on CV:
   - Full Name on LinkedIn:
   - Match: ✅ Yes / ❌ No

2. WORK EXPERIENCE COMPARISON
   List each role in a table format:
   | Role | Company | CV Dates | LinkedIn Dates | Status |
   (Use ✅ Match, ❌ Mismatch, ⚠️ Missing from one source)

3. WORK EXPERIENCE DISCREPANCIES
   - [List each discrepancy in one clear line]
   - Example: "Software Engineer at XYZ (2020-2022) on CV but listed as Intern on LinkedIn"
   (Write "None found" if no discrepancies)

4. EDUCATION COMPARISON
   | Degree | Institution | CV Years | LinkedIn Years | Status |

5. EDUCATION DISCREPANCIES
   - [List each discrepancy in one clear line]
   (Write "None found" if no discrepancies)

6. SKILLS COMPARISON
   - Skills on CV but NOT on LinkedIn:
   - Skills on LinkedIn but NOT on CV:

7. MAJOR RED FLAGS 🚩
   - [List each red flag in one line]
   (Write "None found" if profile looks clean)

8. FINAL VERDICT
   Verdict: [ ✅ Strongly Consistent | ⚠️ Needs Clarification | ❌ Not Consistent ]
   Reason: [2-3 sentences explaining the verdict]

================================================

RULES:
- Be strict. Do not assume or give benefit of the doubt.
- Only report what is explicitly stated in the CV.
- If LinkedIn data is not accessible, note it clearly and base analysis on CV content only.
- Never fabricate information.
`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: cvBase64,
        },
      },
      { text: prompt },
    ]);

    const reportText = result.response.text();
    console.log('[POST /api/verify] Report generated successfully');

    return res.json({
      success: true,
      message: 'Analysis complete',
      response: reportText,
      meta: {
        cvFileName: cvFile.originalname,
        cvFileSize: cvFile.size,
        linkedinUrl: linkedinUrl,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[POST /api/verify] Error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

module.exports = router;