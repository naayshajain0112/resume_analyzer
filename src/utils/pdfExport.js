import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Export a rendered React component to a styled PDF with optimized file size
 * Uses JPEG compression and reduced scale to minimize file size while maintaining quality
 *
 * @param {HTMLElement} elementRef - Reference to the DOM element to export
 * @param {string} filename - Name of the PDF file (without .pdf extension)
 * @param {Object} options - Additional options
 * @returns {Promise<void>}
 */
export const exportComponentToPDF = async (elementRef, filename = 'report', options = {}) => {
  try {
    if (!elementRef) {
      throw new Error('Element reference is required for PDF export');
    }

    console.log('[PDF Export] Starting optimized export process...');
    console.log('[PDF Export] Target element:', elementRef);
    console.log('[PDF Export] Filename:', filename);

    // ✅ STEP 1: Wait for fonts to load (critical for proper rendering)
    console.log('[PDF Export] Waiting for fonts to load...');
    await document.fonts.ready;
    console.log('[PDF Export] Fonts loaded ✅');

    // ✅ STEP 2: Apply PDF export styling (remove heavy shadows/effects)
    console.log('[PDF Export] Applying PDF export styling...');
    const cloneElement = elementRef.cloneNode(true);
    
    // Add export class to remove heavy styling
    cloneElement.classList.add('pdf-export-mode');
    
    // Append to body temporarily to ensure proper styling calculation
    // ⭐ FIX: Keep visibility visible so html2canvas can render it
    cloneElement.style.position = 'absolute';
    cloneElement.style.left = '-9999px';
    cloneElement.style.top = '-9999px';
    cloneElement.style.width = elementRef.offsetWidth + 'px';
    cloneElement.style.visibility = 'visible';
    cloneElement.style.display = 'block';
    document.body.appendChild(cloneElement);

    console.log('[PDF Export] Clone element created, width:', cloneElement.offsetWidth);

    // ✅ STEP 3: Convert HTML to Canvas with OPTIMIZED settings
    console.log('[PDF Export] Converting HTML to canvas with optimized scale...');
    const canvas = await html2canvas(cloneElement, {
      scale: 1.5, // ⭐ REDUCED from 2 to 1.5 - balances quality vs file size
      useCORS: true, // Allow cross-origin images
      logging: false, // Disable verbose logging
      backgroundColor: '#ffffff', // White background
      windowHeight: cloneElement.scrollHeight,
      windowWidth: cloneElement.offsetWidth,
      imageTimeout: 10000, // 10 second timeout for images
      allowTaint: true, // Allow tainted canvas for better compatibility
    });

    console.log('[PDF Export] Canvas created successfully');
    console.log('[PDF Export] Canvas size:', canvas.width, 'x', canvas.height);
    console.log('[PDF Export] Canvas area (pixels):', canvas.width * canvas.height);

    // ✅ STEP 4: Convert canvas to JPEG with compression
    // ⭐ SWITCH TO JPEG WITH 0.75 QUALITY FOR MASSIVE SIZE REDUCTION
    console.log('[PDF Export] Converting canvas to JPEG with 0.75 quality compression...');
    const imgData = canvas.toDataURL('image/jpeg', 0.75);
    console.log('[PDF Export] JPEG data URL created, length:', imgData.length);

    // ✅ STEP 5: Remove temporary clone element
    document.body.removeChild(cloneElement);
    console.log('[PDF Export] Clone element removed');

    // ✅ STEP 6: Create PDF document
    console.log('[PDF Export] Creating PDF document...');
    
    // Calculate dimensions for A4 page
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate aspect ratio to fit page
    const imgWidth = pdfWidth - 10; // 5mm margins on each side
    const imgHeight = (canvas.height / canvas.width) * imgWidth;
    let heightLeft = imgHeight;
    let position = 5; // Top margin

    console.log('[PDF Export] PDF dimensions:', pdfWidth, 'x', pdfHeight);
    console.log('[PDF Export] Image dimensions:', imgWidth, 'x', imgHeight);

    // ✅ STEP 7: Add JPEG image to PDF with page breaks
    console.log('[PDF Export] Adding JPEG content to PDF...');
    // ⭐ CHANGED FROM 'PNG' TO 'JPEG'
    pdf.addImage(imgData, 'JPEG', 5, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
    position = heightLeft + 10;

    // Add additional pages if content is longer than one page
    let pageCount = 1;
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      // ⭐ CHANGED FROM 'PNG' TO 'JPEG'
      pdf.addImage(imgData, 'JPEG', 5, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      pageCount++;
    }

    console.log('[PDF Export] Added', pageCount, 'page(s) to PDF');

    // ✅ STEP 8: Set PDF metadata
    pdf.setProperties({
      title: filename,
      subject: 'CV vs LinkedIn Verification Report',
      author: 'Resume Analyser',
      keywords: 'verification, CV, LinkedIn, report',
      creator: 'Resume Analyser App',
    });

    // ✅ STEP 9: Save PDF
    const pdfFilename = `${filename}.pdf`;
    console.log('[PDF Export] Saving PDF as:', pdfFilename);
    pdf.save(pdfFilename);

    console.log('[PDF Export] ✅ PDF exported successfully with optimized size!');
    return true;

  } catch (error) {
    console.error('[PDF Export] ❌ Error during export:', error);
    throw new Error(`PDF export failed: ${error.message}`);
  }
};

/**
 * Alternative export method using simpler direct rendering with JPEG compression
 * Use this if html2canvas has issues with specific elements
 * ⭐ OPTIMIZED: Uses JPEG compression and reduced scale
 */
export const exportComponentToPDFSimple = async (elementRef, filename = 'report') => {
  try {
    console.log('[PDF Simple Export] Starting optimized simple export...');

    if (!elementRef) {
      throw new Error('Element reference is required');
    }

    // Wait for fonts
    await document.fonts.ready;

    // Create canvas with dimensions based on content
    // ⭐ REDUCED scale from 2 to 1.5 for better performance
    const canvas = await html2canvas(elementRef, {
      scale: 1.5,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    const imgWidth = pageWidth - 20; // Leave margins
    const imgHeight = (canvas.height / canvas.width) * imgWidth;

    let heightLeft = imgHeight;
    let position = 10;
    const pageHeightAvailable = pageHeight - 20; // Account for margins

    // ⭐ CHANGED TO JPEG WITH 0.75 QUALITY COMPRESSION
    const jpegData = canvas.toDataURL('image/jpeg', 0.75);
    console.log('[PDF Simple Export] JPEG data created, length:', jpegData.length);

    // ⭐ CHANGED FROM 'PNG' TO 'JPEG'
    pdf.addImage(
      jpegData,
      'JPEG',
      10,
      position,
      imgWidth,
      imgHeight
    );

    heightLeft -= pageHeightAvailable;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      // ⭐ CHANGED FROM 'PNG' TO 'JPEG'
      pdf.addImage(
        jpegData,
        'JPEG',
        10,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageHeightAvailable;
    }

    pdf.save(`${filename}.pdf`);
    console.log('[PDF Simple Export] ✅ Optimized export complete!');
    return true;

  } catch (error) {
    console.error('[PDF Simple Export] ❌ Error:', error);
    throw error;
  }
};
