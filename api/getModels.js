export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        const apiResponse = await fetch(url);

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            console.error('Google API Error (getModels):', errorData);
            return response.status(errorData.error.code || 500).json({ 
                error: errorData.error.message || 'Google API Error' 
            });
        }

        const data = await apiResponse.json();

        console.log('RAW GOOGLE RESPONSE:', JSON.stringify(data, null, 2)); 

        // Карта для хранения уникальных моделей
        const modelMap = new Map();

        // Фильтруем список от Google
        data.models.forEach(model => {
            // 1. Нас интересуют только модели, которые умеют "генерировать контент"
            // 2. И у которых есть 'baseModelId' (чтобы отсечь служебные)
            if (model.supportedGenerationMethods?.includes("generateContent") && model.baseModelId) {
                
                // 2. Мы сохраняем в карту. Это автоматически убирает дубликаты
                // (например, 'gemini-1.5-pro-001' и 'gemini-1.5-pro-latest')
                // и оставляет только одно имя для каждой базовой модели.
                modelMap.set(model.baseModelId, model.displayName);
            }
        });

        // 3. Превращаем карту обратно в массив
        // ( [ ['gemini-2.5-flash', 'Gemini 2.5 Flash'], ... ] )
        const uniqueModels = [...modelMap.entries()].map(([id, name]) => ({
            id: id,
            name: name
        }));

        // 4. Отправляем чистый список на сайт
        response.status(200).json(uniqueModels);

    } catch (error) {
        console.error('Internal Server Error (getModels):', error.message);
        response.status(500).json({ error: 'Failed to list models' });
    }
}