/**
 * utils/pdfParser.js - PDF Text Extraction Utility
 * 
 * This file provides a helper function to extract raw text content from uploaded
 * PDF resume files using the 'pdf-parse' package.
 */

const pdfParse = require('pdf-parse');

/**
 * Extracts raw text from a PDF file buffer.
 * 
 * @param {Buffer} fileBuffer - The binary buffer of the uploaded PDF file.
 * @returns {Promise<string>} - The extracted raw text contents of the PDF.
 */
async function extractTextFromPDF(fileBuffer) {
  try {
    if (!fileBuffer) {
      throw new Error('No file buffer provided for PDF parsing.');
    }

    // pdfParse returns an object containing:
    // - text: raw text content of the PDF
    // - numpages: total pages
    // - info: metadata about the document
    const data = await pdfParse(fileBuffer);
    
    // Return the clean, extracted text string.
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF document:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

module.exports = {
  extractTextFromPDF
};
