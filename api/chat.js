// Это наш бэкенд.
// ТЕПЕРЬ ОН УМЕЕТ ВЫБИРАТЬ МОДЕЛЬ

// 1. Белый список моделей, которые мы разрешаем использовать.
const ALLOWED_MODELS = [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-pro' // Наш старый добрый друг
];

// 2. Модель по умолчанию, если придет что-то непонятное.
const DEFAULT_MODEL = 'gemini-pro';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 3. Достаем и prompt, и (НОВОЕ) model из запроса
        const { prompt, model: requestedModel } = request.body;

        if (!prompt) {
            return response.status(400).json({ error: 'Prompt is required' });
        }

        // 4. ПРОВЕРКА:
        // Используем модель, которую просит пользователь, 
        // ТОЛЬКО ЕСЛИ она есть в нашем белом списке.
        // Иначе — используем модель по умолчанию.
        const modelToUse = ALLOWED_MODELS.includes(requestedModel) 
            ? requestedModel 
            : DEFAULT_MODEL;

        // 5. Тайно берем API-ключ
        const apiKey = process.env.GEMINI_API_KEY;

        // 6. (ИЗМЕНЕНО) Динамически строим URL на основе
        // проверенной модели 'modelToUse'
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${apiKey}`;

        const apiRequestBody = {
            contents: [
                { parts: [ { text: prompt } ] }
            ]
        };

        // 7. Отправляем запрос в Google
        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiRequestBody),
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json(); // Читаем ошибку от Google
            console.error('Google API Error:', errorData);
            // Возвращаем пользователю понятное сообщение об ошибке от Google
            return response.status(errorData.error.code || 500).json({ 
                error: errorData.error.message || 'Google API Error' 
            });
        }

        const data = await apiResponse.json();
        
        // 8. Обрабатываем ответ
        // Добавляем проверку, что ответ вообще пришел
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
            console.error('Unexpected Google API response structure:', data);
            throw new Error('Invalid response structure from Google');
        }

        const text = data.candidates[0].content.parts[0].text;

        // 9. Отправляем чистый текст обратно
        response.status(200).json({ reply: text });

    } catch (error) {
        console.error('Internal Server Error:', error.message);
        // Отдаем более общую ошибку, если сломалось что-то у нас
        response.status(500).json({ error: error.message || 'Failed to fetch from Gemini' });
    }
}