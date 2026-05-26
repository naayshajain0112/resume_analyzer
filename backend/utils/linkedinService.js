/**
 * utils/linkedinService.js
 *
 * LinkedIn Profile Data Fetching Service
 *
 * This module provides a function to fetch structured LinkedIn profile data
 * from a LinkedIn scraping API. It handles API communication, error handling,
 * and returns clean, structured profile information.
 *
 * The service reads the LinkedIn API key from environment variables and
 * makes HTTP requests to the scraping API with the LinkedIn profile URL.
 */

const axios = require('axios');

/**
 * Fetch structured LinkedIn profile data
 *
 * Sends a request to the LinkedIn scraping API with a LinkedIn profile URL
 * and returns the structured profile data including name, headline, location,
 * experience, education, and skills.
 *
 * @param {string} linkedinUrl - The LinkedIn profile URL (e.g., https://linkedin.com/in/username)
 * @returns {Promise<Object>} - Structured profile data or error
 * @throws {Error} - If API call fails or data cannot be extracted
 *
 * Example return value:
 * {
 *   fullName: "John Doe",
 *   headline: "Senior Software Engineer at Tech Corp",
 *   location: "San Francisco, CA",
 *   experiences: [{ title: "Engineer", company: "Tech Corp", duration: "2020-Present" }],
 *   education: [{ school: "MIT", degree: "BS Computer Science" }],
 *   skills: ["JavaScript", "React", "Node.js"]
 * }
 */
const getLinkedInData = async (linkedinUrl) => {
  try {
    // Get the API key from environment variables
    const apiKey = process.env.LINKEDIN_API_KEY;

    // Validate that API key is configured
    if (!apiKey || apiKey === 'your_linkedin_api_key_here') {
      console.error('[linkedinService] LINKEDIN_API_KEY not configured in environment');
      throw new Error(
        'LinkedIn API key not configured. Add LINKEDIN_API_KEY to your .env file.'
      );
    }

    console.log('[linkedinService] Fetching LinkedIn profile:', linkedinUrl);

    // Make API request to LinkedIn scraping service
    // This assumes you have a service like ProxyCurl or similar configured
    const response = await axios.get('https://api.nubela.co/v1/linkedin/profile', {
      params: {
        linkedin_profile_url: linkedinUrl,
        extra: 'include',
        github_profile_id: 'include',
        facebook_profile_id: 'include',
        twitter_profile_id: 'include',
        api_key: apiKey,
      },
      timeout: 30000, // 30 second timeout
    });

    console.log('[linkedinService] Successfully fetched LinkedIn profile data');

    // Extract and structure the profile data
    const profileData = response.data;

    // Build clean structured object from API response
    const structuredData = {
      fullName: profileData.full_name || 'Unknown',
      headline: profileData.headline || '',
      location: profileData.location || '',
      experiences: (profileData.experiences || []).map((exp) => ({
        title: exp.title || '',
        company: exp.company || '',
        location: exp.location || '',
        startDate: exp.starts_at || {},
        endDate: exp.ends_at || {},
        description: exp.description || '',
      })),
      education: (profileData.education || []).map((edu) => ({
        school: edu.school || '',
        degree: edu.degree_name || '',
        fieldOfStudy: edu.field_of_study || '',
        startDate: edu.starts_at || {},
        endDate: edu.ends_at || {},
      })),
      skills: (profileData.skills || []).map((skill) => skill.name || skill),
    };

    console.log('[linkedinService] Structured data keys:', Object.keys(structuredData));

    return structuredData;
  } catch (error) {
    console.error('[linkedinService] Error fetching LinkedIn data:', error.message);

    // Handle specific error cases
    if (error.response?.status === 404) {
      throw new Error('LinkedIn profile not found. Please check the URL and try again.');
    }

    if (error.response?.status === 401) {
      throw new Error('LinkedIn API authentication failed. Check your API key.');
    }

    if (error.code === 'ECONNABORTED') {
      throw new Error('LinkedIn API request timed out. Please try again.');
    }

    // Re-throw the error with context
    throw new Error(`Failed to fetch LinkedIn profile: ${error.message}`);
  }
};

// Export the function using CommonJS syntax
module.exports = {
  getLinkedInData,
};
