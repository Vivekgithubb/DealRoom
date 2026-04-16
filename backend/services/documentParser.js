const pdf = require("pdf-parse");
const xlsx = require("xlsx");

/**
 * Parses binary file buffer based on MIME type to plain text.
 * Truncates output to 4000 characters to stay within LLM context limits.
 */
async function parseDocument(fileBuffer, mimeType) {
  let rawText = "";

  try {
    if (mimeType === "application/pdf") {
      const data = await pdf(fileBuffer);
      rawText = data.text;
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      const workbook = xlsx.read(fileBuffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      // Convert to CSV as it's a good representation of table data for LLMs
      rawText = xlsx.utils.sheet_to_csv(sheet);
    } else if (mimeType === "text/plain") {
      rawText = fileBuffer.toString("utf-8");
    } else {
      console.warn(`[Parser] Unsupported MIME type: ${mimeType}. Attempting raw string conversion.`);
      rawText = fileBuffer.toString("utf-8");
    }

    // Clean up excessive whitespace
    rawText = rawText.replace(/\s+/g, " ").trim();

    // Truncate to 4000 chars as per performance requirement
    return rawText.slice(0, 4000);
  } catch (err) {
    console.error("[Parser] Error parsing document:", err.message);
    return "";
  }
}

module.exports = { parseDocument };
