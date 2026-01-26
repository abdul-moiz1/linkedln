import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export async function extractPdfTextFromBuffer(buffer) {
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({ 
    data: uint8Array,
    useSystemFonts: true,
    disableFontFace: true
  });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    fullText += content.items.map(i => i.str).join(" ") + "\n";
  }
  return fullText.trim();
}
