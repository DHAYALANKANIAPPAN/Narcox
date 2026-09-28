async function analyzeImage(imageUrl) {
  const key = process.env.GEMINI_API_KEY1;
  if (!key) {
    console.error('Vision: GEMINI_API_KEY1 is not set');
    return { labels: ['Vision error: API key missing'], risk: 0 };
  }

  try {
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error(`Image download failed: ${imgResp.status}`);
    let mimeType = (imgResp.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) mimeType = 'image/jpeg';
    const b64 = Buffer.from(await imgResp.arrayBuffer()).toString('base64');

    const prompt =
      'You are assisting a narcotics-control screening tool. Decide if this image shows illegal drugs or ' +
      'trafficking indicators: pills or tablets in bulk, powders, crystals, cannabis, injection equipment, ' +
      'drug packaging, weighing scales with drugs, or drug price/menu lists. ' +
      'Reply with ONLY JSON: {"label":"<short description>","risk":<integer 0-10>}. ' +
      'Use risk 0 for harmless images (people, pets, food, scenery, memes).';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: b64 } },
            { text: prompt }
          ]
        }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!resp.ok) throw new Error(`Gemini returned ${resp.status}`);
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in vision response');
    const parsed = JSON.parse(match[0]);

    return {
      labels: [String(parsed.label || 'unknown')],
      risk: Math.max(0, Math.min(10, Number(parsed.risk) || 0))
    };
  } catch (error) {
    console.error('Vision error:', error.message);
    return { labels: [`Vision error: ${error.message}`], risk: 0 };
  }
}

module.exports = { analyzeImage };

