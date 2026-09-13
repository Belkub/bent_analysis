import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON body parser with generous limit for high-res photo uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Multi-modal Oxide Recognition endpoint (Powered by Gemini 2.5 Flash)
  app.post('/api/recognize-oxides', async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Missing imageBase64 in request body' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY environment variable is not set on the server.',
        });
      }

      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `You are a specialist in chemical analysis, mineralogy, and laboratory document processing.
Analyze this photo or document containing oxide concentrations in bentonite clay.

The text may be:
1. Handwritten notes (often cursive in green or blue ink, with or without '=' sign, e.g.:
   Al2O3 = 28 or Al2O3 28
   SiO2 = 54 or SiO2 54
   Fe2O3 = 1,5 or Fe2O3 1.5
   CaO = 3,2 or CaO 3.2
   Na2O = 0,85 or Na2O 0.85)
2. Printed laboratory tables (e.g. XRF / РФА reports with sample names like 'Пр-5' and columns of oxides).

Rule: The concentration of an oxide is the numerical value nearest to its chemical formula (either on the same line or in the column directly underneath).
Note: Russian handwriting uses commas for decimal points: '1,5' means 1.5, '0,85' means 0.85, '3,2' means 3.2.
Subscripts in formulas (like Al₂O₃, SiO₂, Fe₂O₃, Na₂O, CaO, MgO, K₂O, TiO₂, MnO, P₂O₅, SO₃) are parts of the formula, NOT percentage values!
Sample identifiers like 'Пр-5' or 'Sample 1' are sample names, NOT oxide concentrations.

Extract all detected oxides and their numerical percentage values (numbers only).
Allowed keys: Al2O3, SiO2, Fe2O3, CaO, Na2O, MgO, K2O, TiO2, MnO, P2O5, SO3.

Return ONLY a JSON object with this exact structure:
{
  "oxides": {
    "Al2O3": 28,
    "SiO2": 54,
    "Fe2O3": 1.5,
    "CaO": 3.2,
    "Na2O": 0.85
  },
  "rawLines": [
    "Al2O3 = 28%",
    "SiO2 = 54%",
    "Fe2O3 = 1.5%",
    "CaO = 3.2%",
    "Na2O = 0.85%"
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/jpeg',
            },
          },
          { text: prompt },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = response.text?.trim() || '{}';
      let parsedData: any = {};
      try {
        parsedData = JSON.parse(responseText);
      } catch (parseErr) {
        // Fallback: strip potential markdown codeblocks
        const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedData = JSON.parse(cleaned);
      }

      return res.json({
        success: true,
        oxides: parsedData.oxides || {},
        rawLines: parsedData.rawLines || [],
      });
    } catch (err: any) {
      console.error('Server error recognizing oxides:', err);
      return res.status(500).json({
        error: err.message || 'Ошибка распознавания изображения',
      });
    }
  });

  // Vite middleware in development vs static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
