/**
 * utils/extractText.js - PDF Text Extraction Utility (File-based)
 *
 * This module reads a PDF file from the local filesystem and extracts
 * all the plain text content from it using the 'pdf-parse' library.
 *
 * Usage:
 *   const { extractText } = require('./utils/extractText');
 *   const text = await extractText('./uploads/resume.pdf');
 */

// 'fs' is a built-in Node.js module for reading and writing files on disk.
// We use the promises version so we can use async/await instead of callbacks.
const fs = require('fs').promises;

// 'path' is a built-in Node.js module that helps us work with file and directory paths
// in a cross-platform way (Windows vs Mac vs Linux).
const path = require('path');

// 'pdf-parse' is a third-party library that knows how to read the binary
// structure of a PDF and pull out the readable text.
const pdfParse = require('pdf-parse');

/**
 * Reads a PDF file from the filesystem and extracts its plain text content.
 *
 * @param {string} filePath - The path to the PDF file on disk (absolute or relative).
 * @returns {Promise<string>} - The extracted plain text from the PDF.
 * @throws {Error} - If the file doesn't exist, isn't a PDF, or can't be parsed.
 *
 * @example
 *   const text = await extractText('./uploads/my-resume.pdf');
 *   console.log(text); // "John Doe\nSoftware Engineer\n..."
 */
async function extractText(filePath) {
  try {
    // --- Step 1: Validate the file path ---
    // Make sure the caller actually provided a file path string.
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('A valid file path must be provided.');
    }

    // Resolve the path to an absolute path so it works regardless of
    // where the script is run from (e.g., "./uploads/resume.pdf" → full path).
    const resolvedPath = path.resolve(filePath);

    // --- Step 2: Check that the file exists ---
    // fs.access checks if the file exists and is readable.
    // If it doesn't exist, this will throw an error that we catch below.
    await fs.access(resolvedPath, fs.constants.R_OK);

    // --- Step 3: Verify the file has a .pdf extension ---
    // path.extname returns the file extension (e.g., ".pdf", ".docx").
    const extension = path.extname(resolvedPath).toLowerCase();
    if (extension !== '.pdf') {
      throw new Error(
        `Expected a .pdf file but received "${extension}" file. Only PDF files are supported.`
      );
    }

    // --- Step 4: Read the file into memory as a binary Buffer ---
    // PDFs are binary files, so we read them as a raw Buffer (not as a text string).
    const fileBuffer = await fs.readFile(resolvedPath);

    // --- Step 5: Parse the PDF and extract text ---
    // pdfParse takes the binary buffer and returns an object with:
    //   - text:     the full plain text content of the PDF
    //   - numpages: total number of pages
    //   - info:     metadata (title, author, creation date, etc.)
    const pdfData = await pdfParse(fileBuffer);

    // --- Step 6: Return the extracted text ---
    // Trim whitespace from the beginning and end for cleaner output.
    const extractedText = pdfData.text.trim();

    // Quick sanity check: warn if the PDF had no extractable text.
    // This can happen with scanned documents or image-only PDFs.
    if (!extractedText) {
      throw new Error(
        'The PDF file appears to contain no extractable text. ' +
        'It may be a scanned document or image-based PDF.'
      );
    }

    return extractedText;

  } catch (error) {
    // --- Error Handling ---
    // We catch specific error codes to give the user a helpful, descriptive message.

    if (error.code === 'ENOENT') {
      // ENOENT = "Error NO ENTry" — the file was not found at the given path.
      throw new Error(`File not found: "${filePath}". Please check the path and try again.`);
    }

    if (error.code === 'EACCES') {
      // EACCES = permission denied — the file exists but we can't read it.
      throw new Error(`Permission denied: Unable to read "${filePath}". Check file permissions.`);
    }

    // For any other error (including our custom validation errors above),
    // log it for debugging and re-throw with context.
    console.error(`[extractText] Error processing "${filePath}":`, error.message);
    throw error;
  }
}

// Export the function using CommonJS so other files can require() it.
module.exports = { extractText };
