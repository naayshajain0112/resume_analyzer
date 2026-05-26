const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// Multer: store uploaded files in memory as buffers
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

router.post('/verify', upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'linkedin', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('[POST /api/verify] Request received');

    const cvFile = req.files?.cv?.[0];
    const linkedinFile = req.files?.linkedin?.[0];

    // Validate both files are present
    if (!cvFile) {
      console.warn('[POST /api/verify] No CV file uploaded');
      return res.status(400).json({ success: false, error: 'No CV file uploaded. Please upload a PDF.' });
    }

    if (!linkedinFile) {
      console.warn('[POST /api/verify] No LinkedIn PDF uploaded');
      return res.status(400).json({ success: false, error: 'No LinkedIn profile PDF uploaded.' });
    }

    console.log('[POST /api/verify] CV file:', cvFile.originalname, cvFile.size, 'bytes');
    console.log('[POST /api/verify] LinkedIn PDF:', linkedinFile.originalname, linkedinFile.size, 'bytes');

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      return res.status(500).json({ success: false, error: 'GEMINI_API_KEY not configured in .env file.' });
    }

    // Convert both PDFs to base64 for Gemini
    const cvBase64 = cvFile.buffer.toString('base64');
    const linkedinBase64 = linkedinFile.buffer.toString('base64');
    console.log('[POST /api/verify] Both PDFs converted to base64, sending to Gemini...');

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    const prompt = `
You are a strict professional background verification expert.

You are given TWO documents:

1. Candidate CV / Resume
2. LinkedIn Profile PDF Export

Compare both documents carefully and generate a concise CV vs LinkedIn Consistency Verification Report.

IMPORTANT RULES:

* Be strict and factual.
* Do NOT assume missing information.
* Do NOT hallucinate or invent details.
* Compare only explicitly stated information.
* Ignore LinkedIn headlines, summaries, banners, and profile taglines.
* Extract job roles ONLY from the Experience section.
* Do NOT use markdown tables.
* Do NOT use code blocks.
* Return plain text only.
* Keep the report under 500 words.
* Maximum 3 lines per experience entry.
* Maximum 3 lines per education entry.
* Compare ONLY the 5 most recent roles.
* Stop immediately after Final Verdict.

Generate the report in EXACTLY this structure:

================================================
CV VS LINKEDIN CONSISTENCY VERIFICATION REPORT
==============================================

1. CANDIDATE IDENTITY

* Full Name on CV:
* Full Name on LinkedIn:
* Match Status:
* Identity Discrepancies:

2. WORK EXPERIENCE COMPARISON

Experience 1

* Company:
* Role Match:
* Date Match:
* Status:

Repeat for remaining roles.

3. WORK EXPERIENCE DISCREPANCIES

* List each discrepancy in one short sentence.
* If none, write: None found.

4. EDUCATION COMPARISON

Education 1

* Degree Match:
* Institution Match:
* Year Match:
* Status:

5. EDUCATION DISCREPANCIES

* List each discrepancy in one short sentence.
* If none, write: None found.

6. SKILLS COMPARISON

* Skills in CV but missing in LinkedIn:
* Skills in LinkedIn but missing in CV:

7. MAJOR RED FLAGS

* List only serious inconsistencies.
* If none, write: None found.

8. FINAL VERDICT

* Verdict:
* Reason:

Allowed verdicts:

* ✅ Strongly Consistent
* ⚠️ Needs Clarification
* ❌ Not Consistent

`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: cvBase64,
        },
      },
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: linkedinBase64,
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
        linkedinFileName: linkedinFile.originalname,
        linkedinFileSize: linkedinFile.size,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('[POST /api/verify] Error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
});

module.exports = router;
