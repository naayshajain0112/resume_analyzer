/**
 * utils/gemini.js - Google Gemini AI Integration Utility
 * 
 * This file handles connection with the Google Gemini API using the official SDK (@google/generative-ai).
 * It sends the extracted resume text along with the target job description to the Gemini model
 * for scoring, feedback, and optimization suggestions.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Sends resume text and target job description to Google Gemini AI for parsing and feedback.
 * 
 * @param {string} resumeText - Raw text extracted from the candidate's resume.
 * @param {string} jobDescription - Optional target job description to analyze match quality.
 * @returns {Promise<string>} - Text analysis response from the Gemini model (usually Markdown or JSON).
 */
async function analyzeResumeWithGemini(resumeText, jobDescription = '') {
  try {
    // 1. Ensure API Key exists
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error(
        'Gemini API key is not configured. Please add GEMINI_API_KEY to your backend/.env file.'
      );
    }

    // 2. Initialize the Google Generative AI Client
    const genAI = new GoogleGenerativeAI(apiKey);

    // 3. Select the AI Model
    // We use 'gemini-1.5-flash' because it is extremely fast, highly competent, and cost-effective.
    // For deeper analysis, you can also use 'gemini-1.5-pro'.
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      // We can also configure generation parameters like responseMimeType to enforce JSON output if desired
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    // 4. Draft a descriptive analysis prompt
    const basePrompt = `
      You are an expert Applicant Tracking System (ATS) agent and professional career coach.
      Analyze the following resume text and compare it with the provided job description (if any).
      Provide a highly detailed analysis in a clean JSON format.

      Resume Text:
      "${resumeText}"

      Target Job Description (If blank, perform a general, comprehensive resume review):
      "${jobDescription}"

      Your output MUST be a valid JSON object matching the following structure exactly, with no additional markdown formatting outside the JSON:
      {
        "matchPercentage": 75, // integer value between 0 and 100 representing how well the resume matches the job description (use 0 if no job description is provided, but rate overall quality out of 100 instead)
        "overallSummary": "Candidate has a strong background in frontend engineering but lacks database experience...",
        "strengths": [
          "Strong proficiency in React and modern UI state management.",
          "Clear, impact-driven description of past projects."
        ],
        "weaknesses": [
          "Missing SQL or NoSQL database references which are listed in the job description.",
          "Short tenure at the latest two positions."
        ],
        "recommendedSkills": [
          "Docker",
          "Node.js/Express",
          "MongoDB"
        ],
        "atsOptimizationSuggestions": [
          "Reformat the professional summary to include keywords like 'Agile Development' and 'Microservices'.",
          "Quantify achievements in the second role (e.g., 'improved page load speeds by 20%')."
        ]
      }
    `;

    // 5. Query the Gemini Model
    const result = await model.generateContent(basePrompt);
    const response = await result.response;
    const responseText = response.text();

    return responseText;
  } catch (error) {
    console.error('Error during Gemini API request:', error);
    throw new Error(`Gemini AI Analysis failed: ${error.message}`);
  }
}

module.exports = {
  analyzeResumeWithGemini
};
