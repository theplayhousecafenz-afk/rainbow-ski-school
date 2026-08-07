/**
 * Client-side PDF generation using html2canvas + jsPDF.
 * Captures a DOM element and downloads it as a PDF — no print dialog.
 *
 * @param elementId  The `id` of the element to capture
 * @param filename   The filename for the downloaded PDF (should end in .pdf)
 */
export async function generatePdf(elementId: string, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const element = document.getElementById(elementId)
  if (!element) {
    console.error(`generatePdf: element #${elementId} not found`)
    return
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    // Skip elements marked no-print (nav buttons, date pickers, etc.)
    ignoreElements: (el) =>
      el.classList.contains('no-print') || el.classList.contains('pdf-ignore'),
  })

  const imgData = canvas.toDataURL('image/jpeg', 0.95)

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  // Scale the captured image to fit the page width
  const scaledH = (canvas.height * pageW) / canvas.width

  let heightLeft = scaledH
  let position = 0

  pdf.addImage(imgData, 'JPEG', 0, position, pageW, scaledH)
  heightLeft -= pageH

  // Add extra pages if content overflows
  while (heightLeft > 0) {
    position -= pageH
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, pageW, scaledH)
    heightLeft -= pageH
  }

  pdf.save(filename)
}
