const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function analyzeImage(imageUrl) {
  if (!GEMINI_API_KEY) {
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
            text: "List the items, objects, or substances visible in this image. Respond strictly with a JSON object containing a single key 'labels' which is an array of strings. Example: {\"labels\": [\"table\", \"white powder\", \"plastic bag\"]}. Do not include markdown." 
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
    
    const candidate = geminiData.candidates?.[0];
    if (candidate && candidate.finishReason !== 'STOP') {
         return { labels: [`Blocked by AI: ${candidate.finishReason}`], risk: 0 };
    }
    
    const textResponse = candidate?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
         return { labels: [`AI Error: ${JSON.stringify(geminiData)}`], risk: 0 };
    }

    const cleanJsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJsonString);
    const labels = result.labels || [];
    const labelsStr = labels.join(' ').toLowerCase();

    const drugKeywords = ['drug', 'powder', 'cocaine', 'meth', 'weed', 'marijuana', 'pill', 'syringe', 'needle', 'narcotic', 'heroin', 'mdma', 'crack', 'lsd'];
    
    let risk = 0;
    if (drugKeywords.some(keyword => labelsStr.includes(keyword))) {
      risk = 10;
    }

    return { labels, risk };

  } catch (error) {
    console.error('Vision API Error:', error.message);
    return { labels: [`Vision API Crash: ${error.message}`], risk: 0 };
  }
}

module.exports = { analyzeImage };
