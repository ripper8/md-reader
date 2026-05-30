import * as pdfjsLib from 'pdfjs-dist';

// Configures the Web Worker locally to comply with strict Chrome Extension Content Security Policy (CSP)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let extractedText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Sort text items by vertical positioning (y-coordinate descending) then horizontal (x-coordinate ascending)
    const items = textContent.items as any[];
    
    // PDF coordinates have (0,0) at the bottom-left of the page.
    // So we sort by Y-coordinate descending (top of page first), then X-coordinate ascending (left-to-right).
    items.sort((a, b) => {
      const yA = a.transform[5];
      const yB = b.transform[5];
      if (Math.abs(yA - yB) > 5) {
        return yB - yA; // Sort top-to-bottom
      }
      return a.transform[4] - b.transform[4]; // Sort left-to-right
    });

    let pageText = `\n\n<!-- Page ${i} -->\n\n`;
    let lastY = -1;
    let line = '';

    for (const item of items) {
      const currentY = item.transform[5];
      
      if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
        // Vertical offset indicates a new line
        pageText += line.trim() + '\n';
        line = item.str + ' ';
      } else {
        line += item.str + ' ';
      }
      lastY = currentY;
    }
    pageText += line.trim() + '\n';
    
    // Heuristics: Convert bullet points (•, ▪, -) to clean Markdown list items (- )
    pageText = pageText.split('\n').map(l => {
      const trimmed = l.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('▪') || trimmed.startsWith('–') || trimmed.startsWith('—')) {
        return '- ' + trimmed.substring(1).trim();
      }
      return l;
    }).join('\n');

    extractedText += pageText;
  }

  return extractedText.trim();
}
