module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { resumeText, role, intensity } = req.body;

    if (!resumeText || resumeText.length < 50) {
      return res.status(400).json({ error: 'Resume text too short' });
    }

    const intensityMap = {
      gentle: 'Be encouraging and kind but still identify real weaknesses clearly.',
      honest: 'Be direct and honest. Point out generic phrases, weak verbs, and missing quantification.',
      brutal: 'Be brutally honest and slightly sarcastic. Roast hard but keep it professional and constructive.'
    };

    const prompt = `You are an expert resume reviewer. Analyze this resume for the role of ${role || 'Software Engineer'}.

${intensityMap[intensity] || intensityMap.honest}

Resume:
${resumeText}

Respond ONLY with a JSON object (no markdown, no backticks) like this:
{"scores":{"overall":62,"impact":45,"clarity":70,"ats":55},"roasts":["C1","C2","C3","C4","C5"],"improved":"Full improved resume","tips":[{"tip":"Title","detail":"Detail"},{"tip":"Title","detail":"Detail"},{"tip":"Title","detail":"Detail"}]}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data.error ? data.error.message : 'Anthropic API error' });
    }

    const raw = data.content[0].text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse AI response' });
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ error: err.message || 'Something went wrong' });
  }
}
