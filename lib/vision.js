const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function analyzeImage(imageUrl) {
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is missing');
    return { labels: ['api-key-missing'], risk: 0 };
  }

  try {
    const imgResp = await fetch(imageUrl);
    if (!imgResp.ok) throw new Error('Failed to fetch image from URL');
    
    const mimeType = imgResp.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await imgResp.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

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
      }],
      safetySettings: [
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        }
      ]
    };

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const geminiData = await geminiResp.json();
    
    const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const cleanJsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJsonString);
    
    return {
      labels: result.labels || [],
      risk: result.risk || 0
    };

  } catch (error) {
    console.error('Vision API Error:', error.message);
    return { labels: ['analysis-failed'], risk: 0 };
  }
}

module.exports = { analyzeImage };
