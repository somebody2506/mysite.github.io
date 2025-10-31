// api/chat.js (ВЕРСИЯ 4 - ПУЛЕНЕПРОБИВАЕМАЯ)
//
// Мы больше не доверяем Google.
// 1. Читаем ответ как .text()
// 2. Проверяем, не пустой ли он.
// 3. ТОЛЬКО ПОТОМ парсим как JSON.

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    let rawGoogleResponse; // Переменная для отладки

    try {
        const { prompt, model } = request.body;
        if (!prompt || !model) {
            return response.status(400).json({ error: 'Prompt and model are required' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const apiRequestBody = {
            contents: [{ parts: [{ text: prompt }] }]
        };

        // 1. Отправляем запрос в Google
        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiRequestBody),
        });

        // 2. ЧИТАЕМ ОТВЕТ КАК ТЕКСТ (!!!)
        rawGoogleResponse = await apiResponse.text();

        // 3. ПРОВЕРЯЕМ, не пустой ли он
        if (!rawGoogleResponse) {
            console.error('Google API returned an empty response.');
            throw new Error('Google returned an empty response.');
        }

        // 4. ТЕПЕРЬ ПЫТАЕМСЯ ПАРСИТЬ
        const data = JSON.parse(rawGoogleResponse);

        // 5. Проверяем, была ли это ошибка (уже из JSON)
        if (!apiResponse.ok || data.error) {
            console.error('Google API Error (parsed from JSON):', data.error);
            throw new Error(data.error?.message || 'Google API Error');
        }
        
        // 6. Обрабатываем УСПЕШНЫЙ ответ
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

        // 7. Отправляем чистый текст обратно
        response.status(200).json({ reply: text });

    } catch (error) {
        // ЭТОТ БЛОК ТЕПЕРЬ ПОЙМАЕТ ВСЁ
        console.error('Internal Server Error (chat):', error.message);
        
        // (Для отладки) Если ошибка была в парсинге, логируем сырой ответ
        if (error.name === 'SyntaxError') { // SyntaxError = это ошибка JSON.parse()
            console.error('Failed to parse Google response:', rawGoogleResponse);
        }
        
        response.status(500).json({ error: error.message || 'Failed to fetch from Gemini' });
    }
}