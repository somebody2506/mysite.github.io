// api/chat.js (ВЕРСИЯ 5 - С ПАМЯТЬЮ)
//
// Принимает 'history', а не 'prompt'
// И форматирует его для Google

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    let rawGoogleResponse;

    try {
        // 1. (ИЗМЕНЕНО) Получаем 'history' и 'model'
        const { history, model } = request.body;

        if (!model) {
            return response.status(400).json({ error: 'Model is required' });
        }
        if (!history || !Array.isArray(history) || history.length === 0) {
            return response.status(400).json({ error: 'History (array) is required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

        // 2. (ИЗМЕНЕНО) Превращаем наш простой массив в формат,
        // который понимает Google (с 'parts')
        const contents = history.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        // 3. (ИЗМЕНЕНО) Отправляем Google 'contents'
        const apiRequestBody = {
            contents: contents 
        };

        // --- Остальная часть кода (наш "пуленепробиваемый" fetch) ---
        // --- остается без изменений ---
        
        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiRequestBody),
        });

        rawGoogleResponse = await apiResponse.text();

        if (!rawGoogleResponse) {
            console.error('Google API returned an empty response.');
            throw new Error('Google returned an empty response.');
        }

        const data = JSON.parse(rawGoogleResponse);

        if (!apiResponse.ok || data.error) {
            console.error('Google API Error (parsed from JSON):', data.error);
            throw new Error(data.error?.message || 'Google API Error');
        }
        
        if (!data.candidates || !data.candidates[0]) {
            console.warn('No candidates found (safety block?):', rawGoogleResponse);
            throw new Error('Google returned no answer (likely a safety block).');
        }

        if (!data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            const reason = data.candidates[0].finishReason || 'NO_TEXT';
            console.warn('Google response has no text parts:', reason, rawGoogleResponse);
            throw new Error(`Response blocked. Reason: ${reason}`);
        }

        const text = data.candidates[0].content.parts[0].text;
        response.status(200).json({ reply: text });

    } catch (error) {
        console.error('Internal Server Error (chat):', error.message);
        if (error.name === 'SyntaxError') { 
            console.error('Failed to parse Google response:', rawGoogleResponse);
        }
        response.status(500).json({ error: error.message || 'Failed to fetch from Gemini' });
    }
}