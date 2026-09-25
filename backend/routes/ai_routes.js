// backend/routes/ai_routes.js
const express = require('express');
const { GoogleGenAI } = require('@google/genai');
const BloodBank = require('../models/bloodBank_model');

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const BLOOD_COMPATIBILITY = {
  'O-': { canGiveTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], canReceiveFrom: ['O-'] },
  'O+': { canGiveTo: ['O+', 'A+', 'B+', 'AB+'], canReceiveFrom: ['O-', 'O+'] },
  'A-': { canGiveTo: ['A-', 'A+', 'AB-', 'AB+'], canReceiveFrom: ['O-', 'A-'] },
  'A+': { canGiveTo: ['A+', 'AB+'], canReceiveFrom: ['O-', 'O+', 'A-', 'A+'] },
  'B-': { canGiveTo: ['B-', 'B+', 'AB-', 'AB+'], canReceiveFrom: ['O-', 'B-'] },
  'B+': { canGiveTo: ['B+', 'AB+'], canReceiveFrom: ['O-', 'O+', 'B-', 'B+'] },
  'AB-': { canGiveTo: ['AB-', 'AB+'], canReceiveFrom: ['O-', 'A-', 'B-', 'AB-'] },
  'AB+': { canGiveTo: ['AB+'], canReceiveFrom: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] },
};

// Target active models
const MODEL_CANDIDATES = [
  'gemini-3.6-flash',
  'gemini-2.0-flash',
];

// Helper: Sleep utility for retrying on 503 high demand
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Call Gemini with a single retry on temporary 503 overload
async function callGeminiWithRetry(modelName, contents, config, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config,
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      const is503 = err.message && (err.message.includes('503') || err.message.includes('high demand'));
      if (is503 && attempt < retries) {
        const backoffMs = (attempt + 1) * 1000;
        console.warn(`[VitalAI] 503 high demand on ${modelName}. Retrying in ${backoffMs}ms (Attempt ${attempt + 1}/${retries})...`);
        await delay(backoffMs);
        continue;
      }
      throw err;
    }
  }
  return null;
}

router.post('/query', async (req, res) => {
  try {
    const { prompt, context = 'general', district = 'Kamareddy' } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, message: 'Prompt query required' });
    }

    const cleanPrompt = prompt.toLowerCase();

    // 1. Instant Local Check: Blood Compatibility
    for (const [group, matrix] of Object.entries(BLOOD_COMPATIBILITY)) {
      if (cleanPrompt.includes(group.toLowerCase())) {
        if (cleanPrompt.includes('receive') || cleanPrompt.includes('need') || cleanPrompt.includes('accept')) {
          return res.json({
            success: true,
            source: 'protocol',
            response: `* Patient Blood Group: **${group}**\n* Compatible Red Cell Donors: **${matrix.canReceiveFrom.join(', ')}**\n* In emergency trauma without crossmatch: O- is prioritized\n\n**Suggestions:**\n* Check nearby blood banks for ${matrix.canReceiveFrom[0]} inventory\n* Submit a hospital emergency broadcast if reserves are low`,
          });
        }
        if (cleanPrompt.includes('give') || cleanPrompt.includes('donate') || cleanPrompt.includes('compatible')) {
          return res.json({
            success: true,
            source: 'protocol',
            response: `* Donor Blood Group: **${group}**\n* Can Safely Donate To: **${matrix.canGiveTo.join(', ')}**\n\n**Suggestions:**\n* View open hospital requirements for matching patients\n* Join an upcoming regional blood drive in your district`,
          });
        }
      }
    }

    // 2. Instant Local Check: Live MongoDB Inventory Counts
    if (cleanPrompt.includes('stock') || cleanPrompt.includes('inventory') || cleanPrompt.includes('units available')) {
      const banks = await BloodBank.find({ district: new RegExp(`^${district.trim()}$`, 'i') });
      let totalUnits = 0;
      banks.forEach((b) => {
        Object.values(b.stockUnits || {}).forEach((u) => {
          totalUnits += Number(u) || 0;
        });
      });

      return res.json({
        success: true,
        source: 'database',
        response: `* District: **${district}**\n* Connected Blood Banks: **${banks.length}**\n* Total Available Units: **${totalUnits} units**\n\n**Suggestions:**\n* Open Inventory tab to see units per blood group\n* Check incoming hospital requests in your area`,
      });
    }

    // 3. Query Gemini AI with Retry & Fallback
    const systemInstruction = `You are VitalAI.
Portal context: '${context}', District: '${district}'.
STRICT RULES:
1. Always format responses strictly as clear bullet points (*), never in paragraphs.
2. Answer only the exact question asked without unrelated explanations or filler text.
3. Always end with a '**Suggestions:**' section listing 2-3 relevant next actions or follow-up topics for the user.`;

    let replyText = null;
    let successfulModel = null;

    for (const modelName of MODEL_CANDIDATES) {
      try {
        replyText = await callGeminiWithRetry(
          modelName,
          prompt,
          {
            systemInstruction,
            temperature: 0.2,
          },
          2 // 2 retries on 503
        );

        if (replyText) {
          successfulModel = modelName;
          console.log(`[VitalAI Gemini Success]: Handled by ${modelName}`);
          break;
        }
      } catch (err) {
        console.warn(`VitalAI ${modelName} failed:`, err.message?.substring(0, 110));
      }
    }

    if (replyText) {
      return res.json({
        success: true,
        source: 'gemini',
        model: successfulModel,
        response: replyText,
      });
    }

    // Graceful fallback if cloud provider temporary high demand persists
    return res.json({
      success: true,
      source: 'fallback',
      response: `* VitalConnectAI is monitoring live network operations.\n* Whole blood donation interval is 90 days for males and 120 days for females.\n* Standard cold storage for RBCs is maintained between 2°C and 6°C.\n\n**Suggestions:**\n* Search blood availability by group in the Find Blood section\n* Review upcoming blood donation camps in your district`,
    });
  } catch (err) {
    console.error('[AI Query Fatal Error]:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;