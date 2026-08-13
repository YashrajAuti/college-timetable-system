/**
 * MMIT Institutional Timetable A4 Landscape PDF Export Utility
 * Ensures non-empty, print-ready, high-resolution PDF download with full headers, matrix, workloads, and signatures.
 */

export async function exportTimetableToPDF(elementId: string, filename: string = 'MMIT_Timetable.pdf') {
  const container = document.getElementById(elementId);

  if (!container) {
    alert('Error: Timetable element not found for export.');
    return;
  }

  // Pre-render Validation
  if (container.innerText.trim().length === 0 || container.querySelector('table') === null) {
    alert('Error: Timetable data has not rendered yet. Please wait for the matrix to load before downloading PDF.');
    return;
  }

  try {
    // Load script tags dynamically if html2canvas/jspdf are not bundled
    await loadScriptIfNeeded('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', 'html2canvas');
    await loadScriptIfNeeded('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf');

    const html2canvas = (window as any).html2canvas;
    const { jsPDF } = (window as any).jspdf;

    if (!html2canvas || !jsPDF) {
      // Fallback to browser print if script loading fails
      window.print();
      return;
    }

    // Render high resolution canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');

    // Create A4 Landscape PDF (297mm x 210mm)
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pdfWidth = 297;
    const pdfHeight = 210;

    const imgWidth = pdfWidth - 20; // 10mm margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, Math.min(imgHeight, pdfHeight - 20));
    heightLeft -= (pdfHeight - 20);

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position + 10, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('PDF Generation error:', error);
    // Print fallback
    window.print();
  }
}

function loadScriptIfNeeded(src: string, globalName: string): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any)[globalName]) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // Proceed to print fallback if script blocked
    document.head.appendChild(script);
  });
}
