import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export const generatePDF = async (items) => {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  // Cover Page
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  page.drawText('Certificate IV in Real Estate Practice', {
    x: 50,
    y: height - 150,
    size: 30,
    font: timesBoldFont,
    color: rgb(0, 0.3, 0.7),
  });

  page.drawText('Course Material Export', {
    x: 50,
    y: height - 200,
    size: 20,
    font: timesRomanFont,
  });

  // Table of Contents
  page = pdfDoc.addPage();
  page.drawText('Table of Contents', { x: 50, y: height - 50, size: 20, font: timesBoldFont });
  items.forEach((item, index) => {
    page.drawText(`${index + 1}. ${item.title}`, {
      x: 50,
      y: height - 80 - (index * 20),
      size: 12,
      font: timesRomanFont,
    });
  });

  // Content Sections
  for (const item of items) {
    page = pdfDoc.addPage();
    page.drawText(item.title, { x: 50, y: height - 50, size: 18, font: timesBoldFont });
    page.drawText(`${item.unitCode} - ${item.stateName}`, { x: 50, y: height - 70, size: 10, font: timesRomanFont, color: rgb(0.5, 0.5, 0.5) });

    // Improved parsing for headings and bold
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = item.content;

    let yPos = height - 100;
    const processNode = (node) => {
      if (yPos < 50) {
        page = pdfDoc.addPage();
        yPos = height - 50;
      }

      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          page.drawText(text, {
            x: 50,
            y: yPos,
            size: 11,
            font: timesRomanFont,
            maxWidth: width - 100,
          });
          yPos -= 15;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        let fontSize = 11;
        let font = timesRomanFont;

        if (tag === 'h1') { fontSize = 16; font = timesBoldFont; }
        else if (tag === 'h2') { fontSize = 14; font = timesBoldFont; }
        else if (tag === 'b' || tag === 'strong') { font = timesBoldFont; }

        if (['h1', 'h2', 'p', 'div'].includes(tag)) yPos -= 5;

        // Draw children or current element text
        if (['h1', 'h2', 'p', 'b', 'strong', 'span'].includes(tag)) {
           const text = node.textContent.trim();
           if (text) {
             page.drawText(text, {
               x: 50,
               y: yPos,
               size: fontSize,
               font: font,
               maxWidth: width - 100,
             });
             yPos -= fontSize + 4;
           }
        } else {
          Array.from(node.childNodes).forEach(processNode);
        }
      }
    };

    Array.from(tempDiv.childNodes).forEach(processNode);
  }

  // Add Page Numbers
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    p.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: width / 2 - 30,
      y: 30,
      size: 10,
      font: timesRomanFont,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Guide_Export_${Date.now()}.pdf`;
  link.click();
};
