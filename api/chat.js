export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { prompt } = request.body;
        if (!prompt) {
            return response.status(400).json({ error: 'Prompt is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const apiRequestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ]
        };


        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiRequestBody),
        });

        if (!apiResponse.ok) {

            const errorData = await apiResponse.text();
            console.error('Google API Error:', errorData);
            throw new Error(`Google API Error: ${apiResponse.statusText}`);
        }

        const data = await apiResponse.json();

        const text = data.candidates[0].content.parts[0].text;


        response.status(200).json({ reply: text });

    } catch (error) {
        console.error('Internal Server Error:', error);
        response.status(500).json({ error: 'Failed to fetch from Gemini' });
    }
}