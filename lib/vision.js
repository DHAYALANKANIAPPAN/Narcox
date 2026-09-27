const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function analyzeImage(imageUrl) {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is missing');
    return { labels: ['api-key-missing'], risk: 0 };
  }

  try {
    // 1. Download the image from Telegram/Instagram
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error('Failed to fetch image from URL');
    
    const mimeType = imgResp.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await imgResp.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    // 2. Prepare the prompt for Gemini
    const payload = {
      contents: [{
        parts: [
          { 
            text: "Analyze this image for illegal drugs (weed, cocaine, meth, pills), drug paraphernalia, contraband, or weapons. You must respond in STRICT JSON format like this: {\"labels\": [\"drug\", \"pills\", \"weed\"], \"risk\": 8}. The risk score must be an integer from 0 to 10. If it contains drugs or weapons, risk should be between 7 and 10. If it is a perfectly normal/safe image, risk should be 0. Output nothing except the JSON." 
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }]
    };

    // 3. Send to Gemini 1.5 Flash
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const geminiData = await geminiResp.json();
    
    // 4. Parse the response
    const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    // Clean up Markdown JSON blocks if Gemini adds them (e.g., ```json ... ```)
    const cleanJsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const result = JSON.parse(cleanJsonString);
    
    return {
      labels: result.labels || [],
      risk: result.risk || 0
    };

  } catch (error) {
    console.error('Vision API Error:', error.message);
    // If it fails, just return risk 0 so the server doesn't crash
    return { labels: ['analysis-failed'], risk: 0 };
  }
}

module.exports = { analyzeImage };
