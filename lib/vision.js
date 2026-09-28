const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function analyzeImage(imageUrl) {
  if (!GEMINI_API_KEY) {
    return { labels: ['api-key-missing'], risk: 5 };
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
            text: "You are an AI assistant for a law enforcement dashboard. Look at this image. Does it contain illegal drugs (like bags of white powder, cocaine, heroin, weed, pills)? Respond strictly in JSON: {\"labels\": [\"bag of white powder\", \"drugs\"], \"risk\": 10}. Risk should be 8-10 if it is clearly drugs, and 0 if it is a completely safe/normal image. Only output the JSON." 
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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const geminiResp = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const geminiData = await geminiResp.json();
    
    // Check for safety block
    const candidate = geminiData.candidates?.[0];
    if (candidate && candidate.finishReason !== 'STOP') {
         return { labels: [`Blocked by AI: ${candidate.finishReason}`], risk: 5 };
    }
    
    const textResponse = candidate?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
         return { labels: [`AI Error: ${JSON.stringify(geminiData)}`], risk: 5 };
    }

    const cleanJsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJsonString);
    
    return {
      labels: result.labels || [],
      risk: result.risk || 0
    };

  } catch (error) {
    console.error('Vision API Error:', error.message);
    return { labels: [`Vision API Crash: ${error.message}`], risk: 5 };
  }
}

module.exports = { analyzeImage };
