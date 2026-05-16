const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/generate', async (req, res) => {
  const { role, company, exp, round, skills, focus } = req.body;

  if (!role) return res.status(400).json({ error: 'Role is required' });

  const expMap = {
    fresher: 'fresher with 0-1 year experience',
    junior: 'junior with 1-3 years experience',
    mid: 'mid-level with 3-5 years experience',
    senior: 'senior with 5+ years experience'
  };

  const prompt = `You are an expert Indian interview coach. Generate interview questions and answers for:

Role: ${role}
${company ? 'Company: ' + company : ''}
Experience: ${expMap[exp] || 'mid-level'}
Round: ${round} interview
Skills: ${skills || 'General'}
Focus areas: ${focus || 'Technical, Behavioural'}

Generate exactly 10 interview questions with detailed answers.

Respond ONLY with a JSON object (no markdown, no backticks):
{
  "questions": [
    {
      "num": 1,
      "type": "Technical",
      "question": "Question text here?",
      "answer": "Detailed answer with specific examples. 3-4 sentences minimum."
    }
  ],
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}
Types: Technical, Behavioural, Situational, HR`;

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
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API error' });

    const raw = data.content[0].text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const result = JSON.parse(jsonMatch[0]);
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
