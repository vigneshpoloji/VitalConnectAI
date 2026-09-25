const express = require('express');
const router = express.Router();

function getClinicalCompatibilityFallback(bloodGroup) {
  const bg = (bloodGroup || 'O+').toUpperCase().trim();

  const rules = {
    'AB-': {
      alternatives: ['AB-', 'A-', 'B-', 'O-'],
      risk: 'Rh-sensitization protocol applies. Cannot receive Rh-positive units without risk.',
      action: 'Can receive any Rh-negative red cells. Prioritize AB- followed by A- or B-.',
    },
    'A-': {
      alternatives: ['A-', 'O-'],
      risk: 'Severe hemolytic risk if Rh+ or B-antigen red cells are transfused.',
      action: 'Prioritize A- packed red cells; reserve O- for acute trauma depletion.',
    },
    'O-': {
      alternatives: ['O- (Strict universal donor red cells only)'],
      risk: 'Can ONLY receive O-negative blood. Fatal hemolysis if A, B, or Rh+ given.',
      action: 'Alert regional blood bank reserve network immediately for emergency O- dispatch.',
    },
    'O+': {
      alternatives: ['O+', 'O-'],
      risk: 'High circulating anti-A and anti-B antibodies.',
      action: 'Transfuse O+ units; preserve O- stock for Rh-negative emergency cases.',
    },
    'B-': {
      alternatives: ['B-', 'O-'],
      risk: 'Severe intravascular hemolysis if A-antigen red cells are transfused.',
      action: 'Dispatch B- units; fall back to O- emergency units.',
    },
    'B+': {
      alternatives: ['B+', 'B-', 'O+', 'O-'],
      risk: 'Cannot receive A or AB blood.',
      action: 'Transfuse B+ or O+ units based on facility inventory.',
    },
    'A+': {
      alternatives: ['A+', 'A-', 'O+', 'O-'],
      risk: 'Circulating anti-B antibodies.',
      action: 'Transfuse available A+ or O+ packed red cells.',
    },
    'AB+': {
      alternatives: ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
      risk: 'Universal recipient for red blood cells. Lowest mismatch hazard.',
      action: 'Proceed with cross-matching and transfuse any available unit.',
    },
  };

  const selected = rules[bg] || rules['AB-'];

  return `• Acceptable Alternatives: ${selected.alternatives.join(', ')}\n• Transfusion Risks: ${selected.risk}\n• Protocol Action: ${selected.action}`;
}

router.post('/compatibility-check', async (req, res) => {
  // Set explicit headers to avoid CORS hanging
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  const { patientBloodGroup = 'AB-', urgencyLevel = 'Critical Trauma' } = req.body || {};
  const cleanGroup = String(patientBloodGroup).trim().toUpperCase();

  const apiKey = process.env.GEMINI_API_KEY;

  // 1. If key is missing or invalid, respond immediately (< 5ms)
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('YOUR_')) {
    return res.status(200).json({
      success: true,
      recommendation: getClinicalCompatibilityFallback(cleanGroup),
    });
  }

  // 2. Try Gemini with a strict 2-second timeout
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const prompt = `You are a clinical hematologist. A patient with blood group ${cleanGroup} needs urgent blood (${urgencyLevel}).
Give 3 short bullet points:
1. Acceptable alternate donor groups.
2. Immediate transfusion risk considerations.
3. Recommended clinical action if exact match is unavailable.
Keep under 60 words.`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT')), 2000)
    );

    const text = await Promise.race([
      model.generateContent(prompt).then((r) => r.response.text()),
      timeoutPromise,
    ]);

    return res.status(200).json({
      success: true,
      recommendation: text || getClinicalCompatibilityFallback(cleanGroup),
    });
  } catch (err) {
    // Immediate fallback on timeout or model error
    return res.status(200).json({
      success: true,
      recommendation: getClinicalCompatibilityFallback(cleanGroup),
    });
  }
});

module.exports = router;