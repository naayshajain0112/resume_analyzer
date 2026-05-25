const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// ✅ DEBUG: Log environment variables availability at module load
console.log('[VERIFY.JS LOADED] Environment check:');
console.log('[VERIFY.JS] APIFY_TOKEN available:', !!process.env.APIFY_TOKEN);
console.log('[VERIFY.JS] LINKEDIN_COOKIE available:', !!process.env.LINKEDIN_COOKIE);
console.log('[VERIFY.JS] GEMINI_API_KEY available:', !!process.env.GEMINI_API_KEY);
if (!process.env.LINKEDIN_COOKIE) {
  console.warn('[VERIFY.JS] ⚠️  LINKEDIN_COOKIE is not set in process.env');
  console.warn('[VERIFY.JS] Make sure .env file is in:', process.cwd());
  console.warn('[VERIFY.JS] Filtered env keys:', Object.keys(process.env).filter(k => k.includes('LINKEDIN') || k.includes('APIFY') || k.includes('GEMINI')));
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  },
});

// ── Helper: Delay utility for polling mechanism ──────────────────────────────
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Helper: Extract only needed fields from profile data ──────────────────────
const extractProfileData = (rawProfile) => {
  console.log('[EXTRACT] Extracting required fields from profile...');
  
  if (!rawProfile) {
    throw new Error('Profile data is null or undefined');
  }

  // ✅ EXTRACT: Basic profile info
  const fullName = rawProfile.full_name || null;
  const headline = rawProfile.headline || null;

  console.log('[EXTRACT] Basic info - Name:', fullName, '| Headline:', headline);

  // ✅ EXTRACT: Work experiences
  const experiences = [];
  if (Array.isArray(rawProfile.experiences) && rawProfile.experiences.length > 0) {
    rawProfile.experiences.forEach((exp, idx) => {
      const title = exp.title || null;
      const company = exp.company || null;
      const dateFrom = exp.date_from || null;
      const dateTo = exp.date_to || null;
      const duration = exp.duration || null;

      experiences.push({
        title,
        company,
        dateFrom,
        dateTo,
        duration,
      });

      console.log(`[EXTRACT] Experience ${idx + 1}: ${title} at ${company} (${duration})`);
    });
  } else {
    console.log('[EXTRACT] No work experiences found');
  }

  // ✅ EXTRACT: Educations with new field names
  const educations = [];
  if (Array.isArray(rawProfile.educations) && rawProfile.educations.length > 0) {
    rawProfile.educations.forEach((edu, idx) => {
      const school = edu.school || null;
      const degree = edu.degree || null;
      const fieldOfStudy = edu.field_of_study || null;
      const dateFrom = edu.date_from || null;
      const dateTo = edu.date_to || null;

      educations.push({
        school,
        degree,
        fieldOfStudy,
        dateFrom,
        dateTo,
      });

      console.log(`[EXTRACT] Education ${idx + 1}: ${degree} in ${fieldOfStudy} from ${school}`);
    });
  } else {
    console.log('[EXTRACT] No educations found');
  }

  // ✅ RETURN: Cleaned extracted object
  const extractedData = {
    fullName,
    headline,
    experiences,
    educations,
  };

  console.log('[EXTRACT] ✅ Successfully extracted profile data');
  return extractedData;
};

// ── Helper: Fetch LinkedIn profile using Apify API ──────────────────────────
const fetchLinkedInProfile = async (linkedinUrl) => {
  console.log('\n╔═══════════════════════════════════════════════════╗');
  console.log('║     [APIFY SCRAPER] Starting LinkedIn Profile     ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  console.log('[APIFY] Input LinkedIn URL:', linkedinUrl);

  // ✅ VALIDATE INPUT
  if (!linkedinUrl || typeof linkedinUrl !== 'string') {
    throw new Error('LinkedIn URL is required and must be a string');
  }

  // ✅ GET APIFY TOKEN
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN) {
    throw new Error('APIFY_TOKEN environment variable is not configured');
  }
  console.log('[APIFY] Token configured (length:', APIFY_TOKEN.length, ')');
  // ✅ GET LINKEDIN COOKIE
  console.log('[STEP 0] Checking LINKEDIN_COOKIE from environment...');
  console.log('[STEP 0] process.env.LINKEDIN_COOKIE value:', process.env.LINKEDIN_COOKIE ? `[SET - ${process.env.LINKEDIN_COOKIE.length} chars]` : '[UNDEFINED]');
  const LINKEDIN_COOKIE = process.env.LINKEDIN_COOKIE;
  if (!LINKEDIN_COOKIE) {
    console.log("ENV CHECK:", process.env.LINKEDIN_COOKIE ? "LOADED" : "MISSING");
    console.error('[STEP 0] ❌ LINKEDIN_COOKIE is undefined');
    console.error('[STEP 0] Current working directory:', process.cwd());
    console.error('[STEP 0] Filtered env keys:', Object.keys(process.env).filter(k => k.toUpperCase().includes('LINKEDIN') || k.toUpperCase().includes('APIFY') || k.toUpperCase().includes('GEMINI')));
    throw new Error('LINKEDIN_COOKIE environment variable is not configured');
  }
  console.log('[APIFY] ✅ LinkedIn cookie configured (length:', LINKEDIN_COOKIE.length, ')');
  
  // DEBUG: Log the LinkedIn URL being scraped
  console.log("SCRAPING URL:", linkedinUrl);
  console.log("LINKEDIN COOKIE LENGTH:", LINKEDIN_COOKIE ? LINKEDIN_COOKIE.length : 0);
  console.log("LINKEDIN COOKIE FIRST 20 CHARS:", LINKEDIN_COOKIE ? LINKEDIN_COOKIE.substring(0, 20) : "MISSING");
  
  try {
    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: TRIGGER SCRAPER - POST to start the actor run
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n[STEP 1] Triggering Apify actor...');
    const startRunUrl = `https://api.apify.com/v2/acts/harvestapi~linkedin-profile-scraper/runs?token=${APIFY_TOKEN}`;
    console.log('[STEP 1] POST to:', startRunUrl.substring(0, 80) + '...');

    const requestBody = {
      urls: [{ url: linkedinUrl }],
      cookie: `li_at=${LINKEDIN_COOKIE}`,
    };
    console.log('[STEP 1] Request body URLs:', requestBody.urls);
    console.log('[STEP 1] Cookie configured: yes');
    
    // DEBUG: Log the full request body
    console.log("APIFY REQUEST BODY:", JSON.stringify({
      urls: [{ url: linkedinUrl }],
      cookie: `li_at=${process.env.LINKEDIN_COOKIE ? "FOUND" : "MISSING"}`
    }));

    const triggerResponse = await fetch(startRunUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[STEP 1] Response status:', triggerResponse.status);

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      console.error('[STEP 1] Error response:', errorText.substring(0, 300));
      throw new Error(`Apify trigger failed: ${triggerResponse.status} ${triggerResponse.statusText}`);
    }

    const triggerData = await triggerResponse.json();
    const runId = triggerData?.data?.id;

    if (!runId) {
      console.error('[STEP 1] Missing runId in response:', triggerData);
      throw new Error('Apify response missing run ID');
    }

    console.log('[STEP 1] ✅ Run triggered, Run ID:', runId);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: POLL RUN STATUS - Wait until status is SUCCEEDED
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n[STEP 2] Polling run status every 3 seconds...');
    console.log('[STEP 2] Max timeout: 2 minutes (120 seconds)');

    let runStatus = null;
    let defaultDatasetId = null;
    let pollAttempt = 0;
    const pollInterval = 3000; // 3 seconds
    const maxTimeout = 120000; // 2 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxTimeout) {
      pollAttempt++;
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      console.log(`\n[STEP 2] Poll attempt ${pollAttempt} (elapsed: ${elapsedSeconds}s)`);

      // Wait before polling (except first attempt)
      if (pollAttempt > 1) {
        await delay(pollInterval);
      }

      try {
        const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`;
        console.log('[STEP 2] Fetching run status...');

        const statusResponse = await fetch(statusUrl);

        if (!statusResponse.ok) {
          console.warn('[STEP 2] Status fetch failed:', statusResponse.status);
          continue;
        }

        const statusData = await statusResponse.json();
        runStatus = statusData?.data?.status;
        defaultDatasetId = statusData?.data?.defaultDatasetId;

        console.log('[STEP 2] Current status:', runStatus);

        // ✅ CHECK: Run succeeded
        if (runStatus === 'SUCCEEDED') {
          console.log('[STEP 2] ✅ Run SUCCEEDED');
          break;
        }

        // ✅ CHECK: Run failed
        if (runStatus === 'FAILED') {
          const errorInfo = statusData?.data?.error?.message || 'Unknown error';
          console.error('[STEP 2] ❌ Run FAILED:', errorInfo);
          throw new Error(`Apify run failed: ${errorInfo}`);
        }

        // ✅ CHECK: Run aborted
        if (runStatus === 'ABORTED') {
          console.error('[STEP 2] ❌ Run ABORTED');
          throw new Error('Apify run was aborted');
        }

        // Status is still running (READY, RUNNING)
        console.log('[STEP 2] Still running, will poll again...');
      } catch (pollError) {
        if (pollError.message.includes('Apify run')) {
          throw pollError; // Re-throw Apify-specific errors
        }
        console.warn('[STEP 2] Poll error:', pollError.message);
        continue;
      }
    }

    // ✅ CHECK: Timeout reached
    if (runStatus !== 'SUCCEEDED') {
      const totalTime = Math.floor((Date.now() - startTime) / 1000);
      throw new Error(
        `Apify run timeout: Status is "${runStatus}" after ${totalTime} seconds. Max timeout: 120s`
      );
    }

    if (!defaultDatasetId) {
      throw new Error('Apify response missing defaultDatasetId');
    }

    console.log('[STEP 2] ✅ Default Dataset ID:', defaultDatasetId);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: FETCH DATASET ITEMS - Get the scraped profile data
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n[STEP 3] Fetching dataset items...');
    const datasetUrl = `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${APIFY_TOKEN}`;
    console.log('[STEP 3] GET:', datasetUrl.substring(0, 80) + '...');

    const datasetResponse = await fetch(datasetUrl);

    if (!datasetResponse.ok) {
      console.error('[STEP 3] Dataset fetch failed:', datasetResponse.status);
      throw new Error(`Failed to fetch dataset: ${datasetResponse.status}`);
    }

    const datasetItems = await datasetResponse.json();
    console.log('[STEP 3] Dataset items received, count:', Array.isArray(datasetItems) ? datasetItems.length : 0);

    // ✅ CHECK: Dataset is not empty
    if (!Array.isArray(datasetItems) || datasetItems.length === 0) {
      console.warn('[STEP 3] ⚠️  Dataset is empty - fetching run details for debugging');
      
      try {
        // DEBUG: Fetch and log full run details
        const runDetailRes = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}?token=${process.env.APIFY_TOKEN}`
        );
        const runDetail = await runDetailRes.json();
        
        console.log("\n=== RUN DETAILS ===");
        console.log("Status:", runDetail.data?.status);
        console.log("Full Error Info:", JSON.stringify(runDetail.data?.error, null, 2));
        console.log("Stats:", JSON.stringify(runDetail.data?.stats, null, 2));
        console.log("Exit Code:", runDetail.data?.exitCode);
        console.log("Exception:", runDetail.data?.exception);
        console.log("===================\n");
      } catch (debugError) {
        console.warn('[STEP 3] Could not fetch run details:', debugError.message);
      }
      
      throw new Error('Dataset is empty - LinkedIn profile could not be scraped or is not accessible');
    }

    const rawProfile = datasetItems[0];
    console.log('[STEP 3] ✅ First profile item retrieved');
    console.log('[STEP 3] Raw profile keys:', Object.keys(rawProfile).slice(0, 15));

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 4: EXTRACT REQUIRED FIELDS - Clean and structure the data
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('\n[STEP 4] Extracting required profile fields...');
    const extractedProfile = extractProfileData(rawProfile);

    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║   [APIFY SCRAPER] ✅ SUCCESS - PROFILE COMPLETE  ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');

    return extractedProfile;

  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════╗');
    console.error('║   [APIFY SCRAPER] ❌ ERROR - OPERATION FAILED    ║');
    console.error('╚═══════════════════════════════════════════════════╝\n');
    console.error('[APIFY ERROR] Message:', error?.message || 'Unknown error');
    console.error('[APIFY ERROR] Stack:', error?.stack?.split('\n').slice(0, 3).join('\n') || 'No stack');
    throw error;
  }
};

// ── POST /verify ─────────────────────────────────────────────────────────────
router.post('/verify', upload.single('cv'), async (req, res) => {
  try {
    console.log('\n\n╔═══════════════════════════════════════════════════╗');
    console.log('║        [VERIFY ROUTE] REQUEST RECEIVED            ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
    console.log('[STEP 0] Multer Processing');
    console.log('[STEP 0] Timestamp:', new Date().toISOString());
    console.log('[STEP 0] Request ID:', Math.random().toString(36).substring(7));
    console.log('[STEP 0] Content-Type:', req.headers['content-type']);
    console.log('[STEP 0] Method:', req.method);
    console.log('[STEP 0] Path:', req.path);

    console.log('\n[STEP 1] Route Entry - /api/verify POST');
    console.log('[STEP 1] Timestamp:', new Date().toISOString());

    // ✅ EXTRACT file from multer middleware (uploaded as 'cv' field)
    const cvFile = req.file;
    
    // ✅ EXTRACT LinkedIn URL from form data body
    const linkedinUrl = req.body?.linkedinUrl;

    // ✅ LOG file details
    console.log('\n[STEP 2] File Upload Check');
    console.log('[STEP 2] Multer req.file exists:', !!cvFile);
    console.log('[STEP 2] Multer req.file type:', typeof cvFile);
    
    if (cvFile) {
      console.log('[STEP 2] ✅ CV File Details:');
      console.log('[STEP 2]   - Field name:', cvFile.fieldname);
      console.log('[STEP 2]   - Original name:', cvFile.originalname);
      console.log('[STEP 2]   - MIME type:', cvFile.mimetype);
      console.log('[STEP 2]   - Size:', cvFile.size, 'bytes');
      console.log('[STEP 2]   - Buffer length:', cvFile.buffer?.length || 0, 'bytes');
      console.log('[STEP 2]   - Has buffer:', !!cvFile.buffer);
    } else {
      console.log('[STEP 2] ❌ NO FILE uploaded - req.file is:', typeof cvFile, cvFile);
    }

    // ✅ LOG LinkedIn URL details
    console.log('\n[STEP 3] Form Data Check');
    console.log('[STEP 3] req.body type:', typeof req.body);
    console.log('[STEP 3] req.body keys:', Object.keys(req.body || {}));
    console.log('[STEP 3] linkedinUrl received:', !!linkedinUrl);
    
    if (linkedinUrl) {
      console.log('[STEP 3] ✅ LinkedIn URL:', linkedinUrl);
      console.log('[STEP 3]   - Type:', typeof linkedinUrl);
      console.log('[STEP 3]   - Length:', linkedinUrl.length);
    } else {
      console.log('[STEP 3] ❌ NO LinkedIn URL - req.body:', req.body);
    }

    // ✅ VALIDATE: CV file must exist
    if (!cvFile) {
      console.log('\n[VALIDATION ERROR] Missing CV file');
      console.log('[VALIDATION ERROR] Available in req:', Object.keys(req));
      console.log('[VALIDATION ERROR] Available in req.file:', req.file);
      console.log('[VALIDATION ERROR] Available in req.body:', req.body);
      
      return res.status(400).json({
        success: false,
        error: 'No CV file uploaded. Please upload a PDF file.',
        details: 'The file field named "cv" was not found in the request',
        received: {
          file: !!cvFile,
          body: req.body ? Object.keys(req.body) : null
        }
      });
    }

    // ✅ VALIDATE: LinkedIn URL must exist
    if (!linkedinUrl) {
      console.log('\n[VALIDATION ERROR] Missing LinkedIn URL');
      console.log('[VALIDATION ERROR] req.body contents:', req.body);
      
      return res.status(400).json({
        success: false,
        error: 'LinkedIn URL is required. Please provide a valid LinkedIn profile URL.',
        details: 'The "linkedinUrl" field was not found in the request body',
        received: {
          file: !!cvFile,
          body: req.body ? Object.keys(req.body) : null
        }
      });
    }

    // ✅ VALIDATE: CV file should be a PDF
    if (cvFile.mimetype !== 'application/pdf') {
      console.log('[VALIDATION ERROR] Invalid file type:', cvFile.mimetype);
      return res.status(400).json({
        success: false,
        error: 'Only PDF files are allowed.',
        details: `Expected "application/pdf", got "${cvFile.mimetype}"`,
        filename: cvFile.originalname
      });
    }

    // ✅ VALIDATE: LinkedIn URL format
    if (!linkedinUrl.includes('linkedin.com')) {
      console.log('[VALIDATION ERROR] Invalid LinkedIn URL format:', linkedinUrl);
      return res.status(400).json({
        success: false,
        error: 'Invalid LinkedIn URL. Please provide a valid LinkedIn profile URL.',
        details: 'URL must contain "linkedin.com"',
        received: linkedinUrl
      });
    }

    console.log('\n[STEP 4] Validation Passed ✅');
    console.log('[STEP 4] File:', cvFile.originalname, '(' + cvFile.size + ' bytes)');
    console.log('[STEP 4] LinkedIn:', linkedinUrl);

    console.log('\n[STEP 5] Checking API Keys...');
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('[STEP 5] GEMINI_API_KEY exists:', !!apiKey, 'Length:', apiKey?.length || 0);
    if (!apiKey) {
      console.log('[ERROR] GEMINI_API_KEY not configured');
      return res.status(500).json({ success: false, error: 'GEMINI_API_KEY not configured.' });
    }

    const apifyToken = process.env.APIFY_TOKEN;
    console.log('[STEP 5] APIFY_TOKEN exists:', !!apifyToken, 'Length:', apifyToken?.length || 0);
    if (!apifyToken) {
      console.log('[ERROR] APIFY_TOKEN not configured');
      return res.status(500).json({ success: false, error: 'APIFY_TOKEN not configured in environment variables.' });
    }

    // 1. Fetch LinkedIn data using Apify scraper
    console.log('\n[STEP 6] Fetching LinkedIn profile via Apify API (harvestapi~linkedin-profile-scraper)...');
    let linkedinData = null;
    let linkedinError = null;

    try {
      console.log('[STEP 6] Calling fetchLinkedInProfile with URL:', linkedinUrl);
      linkedinData = await fetchLinkedInProfile(linkedinUrl);
      console.log('[STEP 6] ✅ LinkedIn data fetched successfully via Apify');
      console.log('[STEP 6] LinkedIn data type:', typeof linkedinData);
      
      // Safe null check - prevent accessing properties of null/undefined
      if (linkedinData === null || linkedinData === undefined) {
        console.log('[STEP 6] LinkedIn data is null/undefined');
        linkedinError = 'LinkedIn data is null or undefined';
        linkedinData = null;
      } else {
        console.log('[STEP 6] LinkedIn data keys:', Object.keys(linkedinData).slice(0, 10));
        console.log('[STEP 6] Full LinkedIn response (first 500 chars):', JSON.stringify(linkedinData, null, 2).substring(0, 500));
        
        // Validate that LinkedIn data has actual content - safely check properties
        const hasExperience = Array.isArray(linkedinData.experience) && linkedinData.experience.length > 0;
        const hasEducation = Array.isArray(linkedinData.education) && linkedinData.education.length > 0;
        const hasSkills = Array.isArray(linkedinData.skills) && linkedinData.skills.length > 0;
        
        if (!hasExperience && !hasEducation && !hasSkills) {
          linkedinError = 'LinkedIn profile returned empty data';
          linkedinData = null;
          console.log('[STEP 6] LinkedIn data is empty, treating as failed fetch');
        } else {
          console.log('[STEP 6] LinkedIn data validation passed - has content');
        }
      }
    } catch (err) {
      linkedinError = err.message;
      console.error('[STEP 6] LinkedIn fetch FAILED:');
      console.error('[STEP 6] Error message:', err.message);
      console.error('[STEP 6] Error stack:', err.stack);
      linkedinData = null; // Ensure linkedinData is null on error
    }

    // 2. Convert CV to base64
    console.log('\n[STEP 7] Converting CV to base64...');
    const cvBase64 = cvFile.buffer.toString('base64');
    console.log('[STEP 7] Base64 conversion complete, length:', cvBase64.length);
    console.log('[STEP 7] First 50 chars:', cvBase64.substring(0, 50));

    // 3. Build prompt
    const linkedinSection = linkedinData
      ? `Here is the candidate's LinkedIn profile data in JSON format:\n${JSON.stringify(linkedinData, null, 2)}`
      : `LinkedIn data could not be fetched. Reason: ${linkedinError || 'Unknown error'}. Base analysis on CV only and flag all sections as "LinkedIn Not Accessible".`;

    // Validate that linkedinSection is a string
    if (!linkedinSection || typeof linkedinSection !== 'string') {
      throw new Error('Failed to build LinkedIn section - invalid format');
    }

    const prompt = `
You are a strict professional background verification expert.

You have TWO sources:
1. Candidate's CV — attached as PDF
2. LinkedIn Profile Data — provided below

${linkedinSection}

Compare ONLY the following. Ignore phone, email, and description length.

================================================
CV VS LINKEDIN CONSISTENCY VERIFICATION REPORT
================================================

Candidate Name: [Full name from CV]
LinkedIn: ${linkedinUrl}

1. IDENTITY CHECK
   - Full Name  → CV: [name] | LinkedIn: [name] | ✅ Match / ❌ Mismatch / ⚠️ Not Accessible
   - Location   → CV: [location] | LinkedIn: [location] | ✅ Match / ❌ Mismatch / ⚠️ Not Accessible
   - Mismatch Details: [one line per mismatch or "No mismatches found"]

2. EXPERIENCE VALIDATION (MOST IMPORTANT)
   List EVERY role from EITHER source:
   | Job Title | Company | CV Dates | LinkedIn Dates | Status |
   (✅ Match, ❌ Mismatch, ⚠️ Missing from one source)

   Mismatch Details:
   - [one line per mismatch or "No mismatches found"]

3. EDUCATION CHECK
   List EVERY degree from EITHER source:
   | Degree | Institution | CV Years | LinkedIn Years | Status |

   Mismatch Details:
   - [one line per mismatch or "No mismatches found"]

4. SKILLS CONSISTENCY
   - On CV but NOT on LinkedIn: [list or "None"]
   - On LinkedIn but NOT on CV: [list or "None"]
   - Mismatch Details: [one line per gap or "No mismatches found"]

5. RED FLAGS 🚩
   - Missing roles:        [list or "None"]
   - Date inconsistencies: [list or "None"]
   - Education mismatch:   [list or "None"]
   - Skill gaps:           [list or "None"]
   - Title mismatch:       [list or "None"]

6. FINAL VERDICT
   Verdict: [ ✅ Strongly Consistent | ⚠️ Needs Clarification | ❌ Not Consistent ]
   Reason: [2-3 sentences]

================================================

STRICT RULES:
- Do NOT assume or fabricate any information
- If something exists in one source but not the other → mismatch
- Every mismatch needs a one-line explanation
- Complete every section even if data is missing
- Never leave a section blank
- You MUST complete every row of every table. Do NOT stop mid-table.
- If a field is unknown, write "N/A"
- Never leave a table incomplete. Every row must have complete information.
`;

    // 4. Call Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
    });

    console.log('\n[STEP 8] Calling Gemini API with model: gemini-2.5-flash...');
    console.log('[STEP 8] Prompt length:', prompt?.length || 0);
    
    // Validate cvBase64 before sending
    if (!cvBase64 || typeof cvBase64 !== 'string' || cvBase64.length === 0) {
      throw new Error('CV base64 conversion failed - invalid or empty base64 data');
    }
    
    console.log('[STEP 8] CV Base64 validated - length:', cvBase64.length);
    console.log('[STEP 8] Request payload prepared, sending to Gemini...');
    
    const result = await model.generateContent([
      { inlineData: { mimeType: 'application/pdf', data: cvBase64 } },
      { text: prompt },
    ]);

    console.log('\n[STEP 9] Gemini response received');
    
    // Validate result object and response
    if (!result) {
      throw new Error('Gemini API returned null or undefined result');
    }
    
    if (!result.response) {
      throw new Error('Gemini response object is missing or null');
    }
    
    console.log('[STEP 9] Response type:', typeof result);
    console.log('[STEP 9] Response keys:', Object.keys(result || {}));
    
    const reportText = result.response.text();
    
    // Validate reportText
    if (!reportText || typeof reportText !== 'string' || reportText.length === 0) {
      throw new Error('Gemini response text is empty or invalid');
    }
    
    console.log('[STEP 9] Report text generated, length:', reportText.length);
    console.log('[STEP 9] First 200 chars:', reportText.substring(0, 200));

    console.log('\n[STEP 10] Preparing response...');
    console.log('[STEP 10] Response will include: success, message, response, meta');
    
    // Safely build response object
    const responseObject = {
      success: true,
      message: 'Analysis complete',
      response: reportText,
      meta: {
        cvFileName: cvFile?.originalname || 'unknown',
        cvFileSize: cvFile?.size || 0,
        linkedinUrl: linkedinUrl || 'unknown',
        linkedinDataFetched: linkedinData !== null && linkedinData !== undefined,
        linkedinError: linkedinError || null,
        timestamp: new Date().toISOString(),
      },
    };
    
    // Validate response object structure
    if (!responseObject.response || typeof responseObject.response !== 'string') {
      throw new Error('Response object validation failed - response text is invalid');
    }
    
    console.log('[STEP 11] Response object prepared');
    console.log('[STEP 11] Response size:', JSON.stringify(responseObject).length, 'bytes');
    console.log('[STEP 11] Sending response to client...');
    console.log('\n╔═══════════════════════════════════════════════════╗');
    console.log('║         [VERIFY ROUTE] REQUEST COMPLETED ✅        ║');
    console.log('╚═══════════════════════════════════════════════════╝\n');
    
    return res.json(responseObject);

  } catch (error) {
    console.error('\n\n╔═══════════════════════════════════════════════════╗');
    console.error('║         [VERIFY ROUTE] ERROR CAUGHT! ❌            ║');
    console.error('╚═══════════════════════════════════════════════════╝\n');
    console.error('[CATCH BLOCK] Error name:', error?.name || 'Unknown');
    console.error('[CATCH BLOCK] Error message:', error?.message || 'Unknown error');
    console.error('[CATCH BLOCK] Error stack:', error?.stack || 'No stack trace');
    console.error('[CATCH BLOCK] Error object:', JSON.stringify(error, null, 2).substring(0, 500));
    console.error('\n');
    
    // Safe error response construction
    const errorMessage = error?.message || 'An unexpected error occurred';
    const errorName = error?.name || 'Error';
    const statusCode = error?.status || 500;
    
    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      errorName: errorName,
      errorStack: error?.stack?.split('\n').slice(0, 3).join(' | ') || 'No stack available',
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ MULTER ERROR HANDLER - Handle file upload errors
router.use((err, req, res, next) => {
  // Check if this is a multer error
  if (err.code === 'FILE_TOO_LARGE') {
    console.error('[MULTER ERROR] File too large:', err.message);
    return res.status(400).json({
      success: false,
      error: 'File size exceeds maximum limit of 20MB',
      details: err.message
    });
  }
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    console.error('[MULTER ERROR] File size limit exceeded:', err.message);
    return res.status(400).json({
      success: false,
      error: 'File is too large. Maximum size is 20MB.',
      details: err.message
    });
  }
  
  if (err.code === 'LIMIT_PART_COUNT') {
    console.error('[MULTER ERROR] Too many parts:', err.message);
    return res.status(400).json({
      success: false,
      error: 'Too many form fields',
      details: err.message
    });
  }
  
  if (err.message?.includes('Only PDF files are allowed')) {
    console.error('[MULTER ERROR] Invalid file type:', err.message);
    return res.status(400).json({
      success: false,
      error: 'Only PDF files are allowed',
      details: err.message
    });
  }
  
  // Pass other errors to the global error handler
  next(err);
});

module.exports = router;