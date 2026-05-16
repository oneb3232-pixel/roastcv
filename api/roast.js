module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeText, role, intensity } = req.body;

  if (!resumeText || resumeText.length < 50) {
    return res.status(400).json({ error: 'Resume text too short' });
  }

  const intensityMap = {
    gentle: 'Be encouraging and kind but still identify real weaknesses clearly.',
    honest: 'Be direct and honest. Point out generic phrases, weak verbs, and missing quantification.',
    brutal: 'Be brutally honest and slightly sarcastic. Roast hard but keep it professional and constructive.'
  };

  const prompt = `You are an expert resume reviewer and hiring manager. Analyze this resume for the role of ${role}.

${intensityMap[intensity] || intensityMap.honest}

Resume:
${resumeText}

Respond ONLY with a JSON object (no markdown, no backticks, no extra text) in this exact format:
{
  "scores": { "overall": 62, "impact": 45, "clarity": 70, "ats": 55 },
  "roasts": ["Criticism 1","Criticism 2","Criticism 3","Criticism 4","Criticism 5"],
  "improved": "Full improved resume text with stronger action verbs, quantified achievements, and better structure",
  "tips": [
    {"tip": "Tip title", "detail": "Explanation"},
    {"tip": "Tip title", "detail": "Explanation"},
    {"tip": "Tip title", "detail": "Explanation"}
  ]
}
Scores are 0-100. Be accurate — a mediocre resume scores 40-65, not 85+.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const raw = data.content.map(b => b.text || '').join('');
    const result = JSON.parse(raw.replace(/```json|```/g, '').trim());

    return res.status(200).json(result);

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
