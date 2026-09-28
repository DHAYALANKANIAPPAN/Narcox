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
            text: "You are an AI for law enforcement. Look at this image. Tell me what is in it. If it contains illegal drugs (white powder, cocaine, pills, weed) or drug paraphernalia, set risk to 10. If it is just a normal safe image (like a poster, flyer, person, or normal object), set risk to 0. Reply ONLY with a raw JSON object with two keys: \"labels\" (an array of strings describing the items in the image) and \"risk\" (the number 10 or 0). No markdown, no other text." 
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
    for (let attempts = 0; attempts < 3; attempts++) {
      const geminiResp = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      geminiData = await geminiResp.json();
      
      if (!geminiData.error || geminiData.error.code !== 503) {
        break;
      }
      
      if (attempts < 2) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
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
    
    // Force risk to 10 if we see obvious drug words in the labels, just in case the AI set it to 0
    let finalRisk = result.risk || 0;
    const labelsStr = (result.labels || []).join(' ').toLowerCase();
    if (finalRisk === 0 && (labelsStr.includes('powder') || labelsStr.includes('drug') || labelsStr.includes('cocaine') || labelsStr.includes('meth'))) {
      finalRisk = 10;
    }

    return {
      labels: result.labels || [],
      risk: finalRisk
    };

  } catch (error) {
    console.error('Vision API Error:', error.message);
    return { labels: [`Vision API Crash: ${error.message}`], risk: 5 };
  }
}

module.exports = { analyzeImage };
