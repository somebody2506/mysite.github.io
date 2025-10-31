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

        // --------------------------------------------------------
        // ВОТ ОН, НОВЫЙ ФИЛЬТР
        // --------------------------------------------------------
        const models = data.models
            .filter(model => 
                // Просто найди всё, что умеет генерировать контент
                model.supportedGenerationMethods?.includes("generateContent")
            )
            .map(model => ({
                // ID = полное имя, которое ждет API (напр. "models/gemini-2.5-pro")
                id: model.name, 
                // Имя = красивое имя для юзера (напр. "Gemini 2.5 Pro")
                name: model.displayName 
            }));
        // --------------------------------------------------------

        // Отправляем отфильтрованный список на сайт
        response.status(200).json(models);

    } catch (error) {
        console.error('Internal Server Error (getModels):', error.message);
        response.status(500).json({ error: 'Failed to list models' });
    }
}