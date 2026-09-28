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
            text: "You are an AI assistant for law enforcement. Analyze this image for illegal drugs (like white powder, cocaine, weed, pills). You MUST respond with a JSON object containing exactly two keys: 'labels' (an array of strings describing what you found) and 'risk' (an integer from 0 to 10). If the image contains drugs, set risk to 8, 9, or 10. If the image is completely safe and normal (like a poster, a flyer, or a landscape), you MUST set risk to 0. Example of safe image: {\"labels\": [\"poster\"], \"risk\": 0}. Do not include markdown formatting." 
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
    
    let geminiData;
    // Retry loop for 503 High Demand errors
    for (let attempts = 0; attempts < 3; attempts++) {
      const geminiResp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      geminiData = await geminiResp.json();
      
      // If it's NOT a 503 error, we break out of the retry loop
      if (!geminiData.error || geminiData.error.code !== 503) {
        break;
      }
      
      if (attempts < 2) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
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
