'use strict';

const express = require('express');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static('web'));

app.get('/api/ai/status', (req, res) => {
  if (!GEMINI_API_KEY) return res.status(200).json({ online: false, model: GEMINI_MODEL });
  return res.json({ online: true, model: GEMINI_MODEL });
});

app.post('/api/ai', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) return res.status(503).json({ error: 'AI backend not configured' });

    const { question, properties, smiles, cid } = req.body || {};

    const lines = [];
    lines.push('You are an expert chemistry assistant embedded in a molecule viewer.');
    lines.push('Be concise, correct, and avoid speculation. If data is missing, say so.');
    lines.push('Use the provided properties as ground truth.');
    lines.push('Respond in plain text, no markdown.');

    const context = {
      cid: cid ?? null,
      smiles: smiles ?? null,
      properties: properties ?? {},
    };

    const userText = [
      'User question:', String(question || 'Give a brief property summary.'), '',
      'Context JSON:', JSON.stringify(context, null, 2)
    ].join('\n');

    const prompt = lines.join('\n') + '\n\n' + userText;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;

    const body = {
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 600
      }
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'Gemini request failed', details: text });
    }
    const j = await r.json();
    const answer = j?.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer produced.';
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err && err.message || err) });
  }
});

app.listen(PORT, () => {
  console.log(`AI MolExplorer server running on http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) {
    console.log('Warning: GEMINI_API_KEY is not set. AI endpoint will be offline.');
  } else {
    console.log(`Using Gemini model: ${GEMINI_MODEL}`);
  }
});
