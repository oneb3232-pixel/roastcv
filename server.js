const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/generate', async (req, res) => {
  console.log('Request received:', JSON.stringify(req.body));
  const { role, company, exp, round, skills, focus } = req.body;
  if (!role) return res.status(400).json({ error: 'Role is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log('API Key exists:', !!apiKey, 'Length:', apiKey ? apiKey.length : 0);
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const expMap = { fresher:'fresher with 0-1 year experience', junior:'junior with 1-3 years', mid:'mid-level with 3-5 years', senior:'senior with 5+ years' };

  const prompt = `You are an expert Indian interview coach. Generate interview questions for:
Role: ${role}
${company ? 'Company: '+company : ''}
Experience: ${expMap[exp]||'mid-level'}
Round: ${round} interview
Skills: ${skills||'General'}

Generate exactly 10 questions with detailed answers. Respond ONLY with JSON:
{"questions":[{"num":1,"type":"Technical","question":"Q?","answer":"Answer."}],"tips":["Tip 1","Tip 2","Tip 3"]}
Types: Technical, Behavioural, Situational, HR`;

  try {
    console.log('Calling Anthropic API...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':apiKey, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:2000, messages:[{role:'user',content:prompt}] })
    });

    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', JSON.stringify(data).substring(0,300));

    if (!response.ok) return res.status(500).json({ error: data.error?.message||'API error' });

    const raw = data.content[0].text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Parse error' });
    res.json(JSON.parse(jsonMatch[0]));

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
