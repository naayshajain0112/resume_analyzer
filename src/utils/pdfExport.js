import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Export a rendered React component to a styled PDF
 * Captures the actual DOM with all Tailwind styling and converts to high-quality PDF
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

    console.log('[PDF Export] Starting export process...');
    console.log('[PDF Export] Target element:', elementRef);
    console.log('[PDF Export] Filename:', filename);

    // ✅ STEP 1: Wait for fonts to load (critical for proper rendering)
    console.log('[PDF Export] Waiting for fonts to load...');
    await document.fonts.ready;
    console.log('[PDF Export] Fonts loaded ✅');

    // ✅ STEP 2: Create a clone of the element for canvas conversion
    // This prevents modifying the original DOM
    const cloneElement = elementRef.cloneNode(true);
    
    // Append to body temporarily to ensure proper styling calculation
    cloneElement.style.position = 'absolute';
    cloneElement.style.left = '-9999px';
    cloneElement.style.top = '-9999px';
    cloneElement.style.width = elementRef.offsetWidth + 'px';
    document.body.appendChild(cloneElement);

    console.log('[PDF Export] Clone element created, width:', cloneElement.offsetWidth);

    // ✅ STEP 3: Convert HTML to Canvas with high quality
    console.log('[PDF Export] Converting HTML to canvas...');
    const canvas = await html2canvas(cloneElement, {
      scale: 2, // 2x scale for high resolution (crisp text)
      useCORS: true, // Allow cross-origin images
      logging: true,
      backgroundColor: '#ffffff', // White background
      windowHeight: cloneElement.scrollHeight,
      windowWidth: cloneElement.offsetWidth,
      imageTimeout: 10000, // 10 second timeout for images
      onclone: (clonedDocument) => {
        // Ensure all styles are applied to the cloned document
        const clonedElement = clonedDocument.body.querySelector('[data-pdf-export]');
        if (clonedElement) {
          clonedElement.style.display = 'block';
          clonedElement.style.visibility = 'visible';
        }
      },
    });

    console.log('[PDF Export] Canvas created successfully');
    console.log('[PDF Export] Canvas size:', canvas.width, 'x', canvas.height);

    // ✅ STEP 4: Remove temporary clone element
    document.body.removeChild(cloneElement);
    console.log('[PDF Export] Clone element removed');

    // ✅ STEP 5: Create PDF document
    console.log('[PDF Export] Creating PDF document...');
    const imgData = canvas.toDataURL('image/png');
    
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

    // ✅ STEP 6: Add image to PDF with page breaks for long content
    console.log('[PDF Export] Adding content to PDF...');
    pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
    position = heightLeft + 10;

    // Add additional pages if content is longer than one page
    let pageCount = 1;
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 5, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
      pageCount++;
    }

    console.log('[PDF Export] Added', pageCount, 'page(s) to PDF');

    // ✅ STEP 7: Set PDF metadata
    pdf.setProperties({
      title: filename,
      subject: 'CV vs LinkedIn Verification Report',
      author: 'Resume Analyser',
      keywords: 'verification, CV, LinkedIn, report',
      creator: 'Resume Analyser App',
    });

    // ✅ STEP 8: Save PDF
    const pdfFilename = `${filename}.pdf`;
    console.log('[PDF Export] Saving PDF as:', pdfFilename);
    pdf.save(pdfFilename);

    console.log('[PDF Export] ✅ PDF exported successfully!');
    return true;

  } catch (error) {
    console.error('[PDF Export] ❌ Error during export:', error);
    throw new Error(`PDF export failed: ${error.message}`);
  }
};

/**
 * Alternative export method using simpler direct rendering
 * Use this if html2canvas has issues with specific elements
 */
export const exportComponentToPDFSimple = async (elementRef, filename = 'report') => {
  try {
    console.log('[PDF Simple Export] Starting simple export...');

    if (!elementRef) {
      throw new Error('Element reference is required');
    }

    // Wait for fonts
    await document.fonts.ready;

    // Create canvas with dimensions based on content
    const canvas = await html2canvas(elementRef, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
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

    pdf.addImage(
      canvas.toDataURL('image/png'),
      'PNG',
      10,
      position,
      imgWidth,
      imgHeight
    );

    heightLeft -= pageHeightAvailable;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        10,
        position,
        imgWidth,
        imgHeight
      );
      heightLeft -= pageHeightAvailable;
    }

    pdf.save(`${filename}.pdf`);
    console.log('[PDF Simple Export] ✅ Export complete!');
    return true;

  } catch (error) {
    console.error('[PDF Simple Export] ❌ Error:', error);
    throw error;
  }
};
