export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 1. Достаем prompt и model
        const { prompt, model } = request.body;

        if (!prompt) {
            return response.status(400).json({ error: 'Prompt is required' });
        }
        // 2. (НОВОЕ) Простая проверка, что модель вообще прислали
        if (!model) {
            return response.status(400).json({ error: 'Model is required' });
        }

        // 3. Тайно берем API-ключ
        const apiKey = process.env.GEMINI_API_KEY;

        // 4. (ИЗМЕНЕНО) 'model' теперь приходит прямо из запроса
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const apiRequestBody = {
            contents: [
                { parts: [ { text: prompt } ] }
            ]
        };

        // 5. Отправляем запрос в Google
        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiRequestBody),
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error('Google API Error (chat):', errorData);
            return response.status(errorData.error.code || 500).json({ 
                error: errorData.error.message || 'Google API Error' 
            });
        }

        const data = await apiResponse.json();
        
        // 6. Обрабатываем ответ
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            console.error('Unexpected Google API response structure:', data);
            throw new Error('Invalid response structure from Google');
        }

        const text = data.candidates[0].content.parts[0].text;

        // 7. Отправляем чистый текст обратно
        response.status(200).json({ reply: text });

    } catch (error) {
        console.error('Internal Server Error (chat):', error.message);
        response.status(500).json({ error: error.message || 'Failed to fetch from Gemini' });
    }
}