process.once("message", async (workerData) => {
try {
  const buffer = Buffer.from(workerData.buffer);
  let text;
  if (workerData.type === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer), isEvalSupported: false });
    try { text = (await parser.getText()).text; } finally { await parser.destroy(); }
  } else {
    const mammoth = await import("mammoth");
    text = (await mammoth.extractRawText({ buffer })).value;
  }
  process.send({ text: text.slice(0, 40000) });
} catch { process.send({ error: "Unable to extract text. Upload a valid, unencrypted PDF or DOCX with selectable text." }); }
finally { process.disconnect(); }
});
