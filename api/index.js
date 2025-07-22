const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: ["https://property-doc-frontend.vercel.app"],
  credentials: true,
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static("public"));

// Create directories if they don't exist
const uploadsDir = path.join(__dirname, "uploads");
const generatedDir = path.join(__dirname, "generated");

fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(generatedDir);

// Serve static files from generated directory
app.use("/generated", express.static(generatedDir));

// Root route for health check
app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Backend is running!",
    timestamp: new Date().toISOString(),
    endpoints: {
      health: "/health",
      generateDocument: "/generate-document",
    },
  });
});

// Document generation endpoint
app.post("/generate-document", async (req, res) => {
  try {
    const { fullName, address, date, price } = req.body;

    // Validate required fields
    if (!fullName || !address || !date || !price) {
      return res.status(400).json({
        error: "All fields are required",
      });
    }

    // Read the template PDF
    const templatePath = path.join(__dirname, "document_template.pdf");

    if (!(await fs.pathExists(templatePath))) {
      return res.status(500).json({
        error: "Template file not found",
      });
    }

    const templateBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Get the first page
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      return res.status(500).json({
        error: "PDF template has no pages",
      });
    }

    const firstPage = pages[0];

    // Embed a standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Add text overlay with form data
    // You can adjust these coordinates based on your template
    const textColor = rgb(0, 0, 0); // Black color

    // Add Address - only on page 2
    if (pages.length >= 2) {
      const page2 = pages[1];
      page2.drawText(address, {
        x: 190,
        y: page2.getSize().height - 135,
        size: 11,
        font: font,
        color: textColor,
      });
    }

    // Add Price, FullName, Date - only on page 3
    if (pages.length >= 3) {
      const page3 = pages[2];
      page3.drawText(price, {
        x: 70,
        y: page3.getSize().height - 487,
        size: 11,
        font: font,
        color: textColor,
      });
      page3.drawText(fullName, {
        x: 220,
        y: page3.getSize().height - 603,
        size: 11,
        font: font,
        color: textColor,
      });
      page3.drawText(date, {
        x: 400,
        y: page3.getSize().height - 637,
        size: 11,
        font: font,
        color: textColor,
      });
    }

    // Add FullName, Date - only on page 4
    if (pages.length >= 4) {
      const page4 = pages[3];
      page4.drawText(address, {
        x: 190,
        y: page4.getSize().height - 137,
        size: 11,
        font: font,
        color: textColor,
      });
      page4.drawText(fullName, {
        x: 225,
        y: page4.getSize().height - 630,
        size: 11,
        font: font,
        color: textColor,
      });
      page4.drawText(date, {
        x: 410,
        y: page4.getSize().height - 665,
        size: 11,
        font: font,
        color: textColor,
      });
    }

    // Add FullName, Date - only on page 5
    if (pages.length >= 5) {
      const page5 = pages[4];

      page5.drawText(fullName, {
        x: 143,
        y: page5.getSize().height - 443,
        size: 11,
        font: font,
        color: textColor,
      });
      page5.drawText(date, {
        x: 120,
        y: page5.getSize().height - 512,
        size: 11,
        font: font,
        color: textColor,
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `property_document_${timestamp}.pdf`;
    const outputPath = path.join(generatedDir, filename);

    // Save the filled PDF
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);

    // Return download URL
    const downloadUrl = `http://localhost:${PORT}/generated/${filename}`;

    res.json({
      success: true,
      message: "Document generated successfully",
      downloadUrl: downloadUrl,
      filename: filename,
    });
  } catch (error) {
    console.error("Error generating document:", error);
    res.status(500).json({
      error: "Failed to generate document",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(
    `Document generation: http://localhost:${PORT}/generate-document`
  );
});
