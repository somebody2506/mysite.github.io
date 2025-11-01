// ===================================
// 1. GLOBAL CONSTANTS & FUNCTIONS
// ===================================

// --- Volume Icons ---
const volumeIcons = {
    'mute': '<img src="svg/mute.svg" alt="Muted" class="w-5 h-5">',
    'min': '<img src="svg/min.svg" alt="Min Volume" class="w-5 h-5">',
    'medium': '<img src="svg/mid.svg" alt="Medium Volume" class="w-5 h-5">',
    'max': '<img src="svg/max.svg" alt="Max Volume" class="w-5 h-5">'
};

// --- Phone Number Slider Logic ---
function formatPhoneNumber(sliderValue) {
    let s = String(sliderValue).padStart(10, '0');
    return `+38 ${s.substring(0, 3)} ${s.substring(3, 6)} ${s.substring(6, 8)} ${s.substring(8, 10)}`;
}

// --- Volume Control Helpers ---
function updateVolumeIcon(volume) {
    const container = document.getElementById('volume-icon-container');
    let iconKey;

    if (volume <= 33) { iconKey = 'min'; } 
    else if (volume <= 66) { iconKey = 'medium'; } 
    else { iconKey = 'max'; }
    
    const newHtml = volumeIcons[iconKey];
    if (container && container.innerHTML !== newHtml) {
        container.innerHTML = newHtml;
    }
}

function styleVolumeSlider(slider) {
    const min = slider.min ? parseInt(slider.min) : 0;
    const max = slider.max ? parseInt(slider.max) : 100;
    const val = slider.value ? parseInt(slider.value) : 0;
    const percentage = ((val - min) / (max - min)) * 100;
    
    const startColor = '#60a5fa'; 
    const endColor = '#2563eb';   
    const unfilledColor = '#e5e7eb'; 
    
    slider.style.background = `linear-gradient(to right, ${startColor} 0%, ${endColor} ${percentage}%, ${unfilledColor} ${percentage}%, ${unfilledColor} 100%)`;
}


// --- Playtime Persistence Logic (Cookies) ---
const COOKIE_KEY = 'seal_playtime_seconds';
let totalSeconds = 0;
let intervalId = null;

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for(let i=0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

function formatTime(seconds) {
    const totalDays = Math.floor(seconds / 86400);
    let remainderSeconds = seconds % 86400;

    const h = Math.floor(remainderSeconds / 3600);
    remainderSeconds %= 3600;
    const m = Math.floor(remainderSeconds / 60);
    const s = remainderSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');
    return `${totalDays} Day${totalDays !== 1 ? 's' : ''}, ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

function updatePlaytimeDisplay() {
    const displayElement = document.getElementById('total-playtime');
    if (displayElement) { displayElement.textContent = formatTime(totalSeconds); }
}

function startTimer() {
    if (intervalId !== null) return; 
    intervalId = setInterval(() => {
        totalSeconds++;
        updatePlaytimeDisplay();
        setCookie(COOKIE_KEY, totalSeconds, 365); 
    }, 1000);
}

function stopTimer() {
    if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
        setCookie(COOKIE_KEY, totalSeconds, 365);
    }
}


// ===================================
// 2. CURRENCY CONVERTER LOGIC (GLOBAL)
// ===================================
const API_KEY = '7c88b240c96c83d83e28c124'; // !!! СЮДА ВСТАВЬТЕ ВАШ КЛЮЧ
const EXCHANGE_API_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/USD`; 

let exchangeRates = {}; // Будет заполнено из API
let latestExchangeDate = '';

// Main conversion logic
function convertCurrency() {
    const amountFromInput = document.getElementById('amount-from');
    const resultDisplay = document.getElementById('conversion-result');
    const currencyFromSelect = document.getElementById('currency-from');
    const currencyToSelect = document.getElementById('currency-to');

    if (!amountFromInput || !resultDisplay || !currencyFromSelect || !currencyToSelect) return;

    const amount = parseFloat(amountFromInput.value);
    if (isNaN(amount) || amount <= 0) {
        resultDisplay.textContent = '0.00 ' + currencyToSelect.value;
        return;
    }

    const fromCode = currencyFromSelect.value;
    const toCode = currencyToSelect.value;
        
    // Получаем курсы относительно UAH, которые мы рассчитали при загрузке
    const rateFrom = exchangeRates[fromCode] ? exchangeRates[fromCode].rate : 1;
    const rateTo = exchangeRates[toCode] ? exchangeRates[toCode].rate : 1;
        
    // Формула: (Сумма * Курс_Откуда_к_UAH) / Курс_Куда_к_UAH
    // Пример: 100 USD в EUR
    // rateFrom (USD) = 40.5
    // rateTo (EUR) = 43.2
    // (100 * 40.5) / 43.2 = 93.75 EUR
    const result = (amount * rateFrom) / rateTo;
        
    resultDisplay.textContent = `${result.toFixed(2)} ${toCode}`;
}

// Function to populate the <select> fields
function populateCurrencySelectors() {
    const currencyFromSelect = document.getElementById('currency-from');
    const currencyToSelect = document.getElementById('currency-to');
    
    if (!currencyFromSelect || !currencyToSelect) return;
    
    const sortedCodes = Object.keys(exchangeRates).sort();
    
    // Сохраняем текущие значения, если они есть
    const currentFromValue = currencyFromSelect.value;
    const currentToValue = currencyToSelect.value;
        
    // --- ИСПРАВЛЕНИЕ ---
    // Очищаем ОБА списка ПОЛНОСТЬЮ
    while (currencyFromSelect.options.length > 0) { currencyFromSelect.remove(0); }
    while (currencyToSelect.options.length > 0) { currencyToSelect.remove(0); }
        
    // --- ИСПРАВЛЕНИЕ ---
    // Добавляем *все* валюты, включая UAH
    sortedCodes.forEach(code => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = code; // У этого API нет полных имен (txt), поэтому просто используем код
        
        currencyFromSelect.appendChild(option.cloneNode(true));
        currencyToSelect.appendChild(option);
    });
        
    // --- ИСПРАВЛЕНИЕ ---
    // Устанавливаем значения:
    // Либо старые (если были), либо по умолчанию (UAH -> USD)
    currencyFromSelect.value = currentFromValue ? currentFromValue : 'USD';
    currencyToSelect.value = currentToValue ? currentToValue : 'UAH';
}

// Function to fetch and parse NBU XML data (НОВАЯ ВЕРСИЯ)
async function fetchExchangeRates() {
    const dateDisplay = document.getElementById('exchange-date');

    if (dateDisplay) { dateDisplay.textContent = 'Last updated: Loading...'; }

    // Проверка, что ключ API был изменен
    if (API_KEY === 'YOUR_API_KEY') {
        const errorMsg = 'Error: API_KEY not set in js.js!';
        console.error("Please get a free API key from exchangerate-api.com and update API_KEY in js.js");
        if (dateDisplay) { dateDisplay.textContent = `Last updated: ${errorMsg}`; }
        return;
    }
    
    try {
        const response = await fetch(EXCHANGE_API_URL);
        
        if (!response.ok) { throw new Error(`HTTP Error: ${response.status} ${response.statusText}`); }

        // Парсим ответ как JSON, а не XML
        const data = await response.json(); 
        
        if (data.result === 'error') {
            throw new Error(`API Error: ${data['error-type']}`);
        }

        // data.conversion_rates - это курсы относительно USD (базовая валюта API)
        // Пример: { "USD": 1, "UAH": 40.5, "EUR": 0.94 }
        const rates = data.conversion_rates;
        
        // Нам нужен курс UAH к USD, чтобы пересчитать все
        const uahPerUsd = rates['UAH'];
        if (!uahPerUsd) {
            throw new Error("UAH rate not found in API response.");
        }

        // Очищаем старые курсы
        exchangeRates = {}; 
        latestExchangeDate = new Date(data.time_last_update_unix * 1000).toLocaleDateString();

        // Добавляем UAH (курс 1:1 к самому себе)
        exchangeRates['UAH'] = { rate: 1, txt: 'Українська гривня' };
        
        // Пересчитываем все курсы относительно UAH
        // Формула: (Курс UAH к USD) / (Курс ВАЛЮТЫ к USD) = Курс ВАЛЮТЫ к UAH
        for (const code in rates) {
            if (code !== 'UAH') {
                const uahPerCode = uahPerUsd / rates[code];
                exchangeRates[code] = { 
                    rate: uahPerCode, 
                    txt: code // Используем код вместо полного имени
                };
            }
        }

        // Успех
        populateCurrencySelectors();
        if (dateDisplay) { dateDisplay.textContent = `Last updated: ${latestExchangeDate}`; }
        convertCurrency();

    } catch (error) {
        // Вывод ошибки на сайт
        console.error('Fetch Error:', error);
        let displayMessage = `Error: ${error.message}`;
        if (dateDisplay) { dateDisplay.textContent = `Last updated: ${displayMessage}`; }
    }
}

// ===================================
// 3. VIDEO CAROUSEL LOGIC (GLOBAL)
// ===================================
let currentVideoIndex = 0;

function updateVideoCarousel() {
    // Получаем элементы
    const videoWrapper = document.getElementById('video-wrapper');
    const videoItems = document.querySelectorAll('.video-item');
    const prevButton = document.getElementById('prev-video');
    const nextButton = document.getElementById('next-video');

    // Проверка, что всё на месте
    if (!videoWrapper || !prevButton || !nextButton || videoItems.length === 0) return;

    const totalVideos = videoItems.length;

    // --- 1. Сдвиг ленты ---
    const offset = -currentVideoIndex * 100;
    videoWrapper.style.transform = `translateX(${offset}%)`;

    // --- 2. Логика: Показать/спрятать кнопки ---

    // Управляем кнопкой "Назад" (prev)
    if (currentVideoIndex === 0) {
        prevButton.classList.add('hidden'); // Прячем, если мы на первом видео
    } else {
        prevButton.classList.remove('hidden'); // Показываем в остальных случаях
    }

    // Управляем кнопкой "Вперед" (next)
    if (currentVideoIndex === totalVideos - 1) {
        nextButton.classList.add('hidden'); // Прячем, если мы на последнем видео
    } else {
        nextButton.classList.remove('hidden'); // Показываем в остальных случаях
    }
    
    // --- 3. Логика: Обновить точки ---
    updatePaginationDots();
}

// ===================================
// 4. НОВАЯ ФУНКЦИЯ: СОЗДАНИЕ ТОЧЕК
// ===================================
function createPaginationDots(videoCount) {
    const paginationContainer = document.getElementById('video-pagination');
    if (!paginationContainer) return;

    // Очищаем старые точки, если они есть
    paginationContainer.innerHTML = '';

    // Создаем по одной точке для каждого видео
    for (let i = 0; i < videoCount; i++) {
        const dot = document.createElement('button');
        dot.classList.add('pagination-dot', 'w-3', 'h-3', 'rounded-full', 'bg-gray-400', 'hover:bg-gray-600', 'transition-colors', 'pointer-events-auto');
        dot.setAttribute('aria-label', `Go to video ${i + 1}`);
        
        // Добавляем обработчик клика, чтобы по точке можно было перейти к слайду
        dot.addEventListener('click', () => {
            currentVideoIndex = i;
            updateVideoCarousel(); 
        });
        
        paginationContainer.appendChild(dot);
    }
}

// ===================================
// 5. НОВАЯ ФУНКЦИЯ: ОБНОВЛЕНИЕ ТОЧЕК
// ===================================
function updatePaginationDots() {
    const dots = document.querySelectorAll('.pagination-dot');
    if (dots.length === 0) return;

    dots.forEach((dot, index) => {
        if (index === currentVideoIndex) {
            // Активная точка
            dot.classList.remove('bg-gray-400', 'hover:bg-gray-600');
            dot.classList.add('bg-white', 'scale-110');
            dot.setAttribute('disabled', 'true'); // Делаем активную точку некликабельной
        } else {
            // Неактивные точки
            dot.classList.add('bg-gray-400', 'hover:bg-gray-600');
            dot.classList.remove('bg-white', 'scale-110');
            dot.removeAttribute('disabled'); // Убедимся, что на нее можно нажать
        }
    });
}


// =========================================================
// 6. ОСНОВНОЙ БЛОК: DOMContentLoaded (ИНИЦИАЛИЗАЦИЯ)
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    // Получение основных элементов
    const audio = document.getElementById('seal-audio');
    const toggleBtn = document.getElementById('toggle-play-btn');
    const phoneSlider = document.getElementById('phone-slider');
    const display = document.getElementById('phone-number-display');
    const volumeSlider = document.getElementById('volume-slider');
    let isPlaying = false;
    
    // --- 1. Phone Slider Initialization ---
    if (display && phoneSlider) {
        display.textContent = formatPhoneNumber(phoneSlider.value);
        phoneSlider.addEventListener('input', function() { display.textContent = formatPhoneNumber(this.value); });
    }

    // --- 2. Playtime Initialization ---
    const savedSeconds = getCookie(COOKIE_KEY);
    if (savedSeconds) { totalSeconds = parseInt(savedSeconds, 10); }
    updatePlaytimeDisplay(); 

    // --- 3. Volume Control Initialization ---
    if (volumeSlider && audio) {
        audio.volume = volumeSlider.value / 100;
        updateVolumeIcon(parseInt(volumeSlider.value));
        styleVolumeSlider(volumeSlider);
        volumeSlider.addEventListener('input', function() {
            const volume = parseInt(this.value);
            audio.volume = volume / 100;
            updateVolumeIcon(volume); 
            styleVolumeSlider(this);
        });
    }

    // --- 4. Radio Control Initialization ---
    if (toggleBtn && audio) {
        toggleBtn.addEventListener('click', () => {
            if (isPlaying) { audio.pause(); } 
            else { audio.play().then(() => {}).catch(error => { console.error("Audio Playback Error:", error); }); }
        });
        audio.addEventListener('play', () => {
            isPlaying = true; startTimer();
            toggleBtn.textContent = 'Stop';
            toggleBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
            toggleBtn.classList.add('bg-red-500', 'hover:bg-red-600');
        });
        audio.addEventListener('pause', () => {
            isPlaying = false; stopTimer();
            toggleBtn.textContent = 'Play';
            toggleBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
            toggleBtn.classList.add('bg-green-500', 'hover:bg-green-600');
        });
        audio.addEventListener('error', (e) => {
            console.error("Audio Load Error. Check stream URL:", e);
            isPlaying = false; stopTimer(); toggleBtn.textContent = 'Play';
            toggleBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
            toggleBtn.classList.add('bg-green-500', 'hover:bg-green-600');
        });
    }
    
    // --- 5. Currency Converter Initialization ---
    const converterAmountInput = document.getElementById('amount-from');
    const converterCurrencyFromSelect = document.getElementById('currency-from');
    const converterCurrencyToSelect = document.getElementById('currency-to');
    const converterSwapButton = document.getElementById('swap-currencies');

    if (converterAmountInput && converterCurrencyFromSelect && converterCurrencyToSelect) {
        fetchExchangeRates(); // 👈 Запускаем загрузку данных
        
        converterAmountInput.addEventListener('input', convertCurrency);
        converterCurrencyFromSelect.addEventListener('change', convertCurrency);
        converterCurrencyToSelect.addEventListener('change', convertCurrency);

        if (converterSwapButton) {
            converterSwapButton.addEventListener('click', () => {
                const temp = converterCurrencyFromSelect.value;
                converterCurrencyFromSelect.value = converterCurrencyToSelect.value;
                converterCurrencyToSelect.value = temp;
                convertCurrency(); 
            });
        }
    }
    
    // --- 6. Video Carousel Initialization --- (ЭТОТ БЛОК ТОЖЕ ОБНОВЛЕН)
    const prevVideoButton = document.getElementById('prev-video');
    const nextVideoButton = document.getElementById('next-video');
    const videoItems = document.querySelectorAll('.video-item');

    if (prevVideoButton && nextVideoButton && videoItems.length > 0) {
        
        // СНАЧАЛА СОЗДАЕМ ТОЧКИ
        createPaginationDots(videoItems.length); 
        
        // ОБНОВЛЕННАЯ ЛОГИКА КЛИКА
        prevVideoButton.addEventListener('click', () => {
            if (currentVideoIndex > 0) {
                currentVideoIndex--;
                updateVideoCarousel();
            }
        });

        // ОБНОВЛЕННАЯ ЛОГИКА КЛИКА
        nextVideoButton.addEventListener('click', () => {
            const totalVideos = videoItems.length;
            if (currentVideoIndex < totalVideos - 1) {
                currentVideoIndex++;
                updateVideoCarousel();
            }
        });

        // Этот вызов обновит кнопки И точки при первой загрузке (спрячет "назад")
        updateVideoCarousel(); 
    }

// --- 7. AI Chat Initialization (ENTER-TO-SEND & "THINKING" INDICATOR) ---
        const chatInput = document.getElementById('chat-input');
        const chatButton = document.getElementById('chat-button');
        const modelSelect = document.getElementById('model-select');
        const chatHistoryContainer = document.getElementById('chat-history-container');

        const MODEL_PREFERENCE_KEY = 'gemini_model_preference';
        const DEFAULT_MODEL_ID = 'models/gemini-2.5-flash';

        let conversationHistory = [];

        function setModelSelection(models) {
            const savedModel = localStorage.getItem(MODEL_PREFERENCE_KEY);
            const savedModelExists = models.some(model => model.id === savedModel);

            if (savedModel && savedModelExists) {
                modelSelect.value = savedModel;
            } else {
                const defaultModelExists = models.some(model => model.id === DEFAULT_MODEL_ID);
                if (defaultModelExists) {
                    modelSelect.value = DEFAULT_MODEL_ID;
                }
            }
        }

        // Вспомогательная функция для отрисовки сообщения (без изменений)
        function appendMessage(sender, text) {
            if (!chatHistoryContainer) return;
            
            const messageElement = document.createElement('div');
            messageElement.classList.add('mb-2');
            messageElement.style.whiteSpace = 'pre-wrap'; 

            if (sender === 'user') {
                messageElement.classList.add('text-right');
                messageElement.innerHTML = `<span class="inline-block p-2 bg-blue-600 text-white rounded-lg">${text}</span>`;
            } else {
                messageElement.classList.add('text-left');
                if (sender === 'error') {
                    messageElement.innerHTML = `<span class="inline-block p-2 bg-red-800 text-red-100 rounded-lg">${text}</span>`;
                } else { // 'model'
                    messageElement.innerHTML = `<span class="inline-block p-2 bg-gray-700 text-white rounded-lg">${text}</span>`;
                }
            }
            
            chatHistoryContainer.appendChild(messageElement);
            chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
        }

        async function populateModels() {
            try {
                chatButton.setAttribute('disabled', 'true');
                chatButton.classList.add('opacity-50', 'cursor-not-allowed');
                if (chatHistoryContainer) chatHistoryContainer.innerHTML = '<p class="text-gray-400">Loading model list...</p>';

                const response = await fetch('/api/getModels'); 
                if (!response.ok) throw new Error('Failed to get model list.');

                const models = await response.json(); 

                modelSelect.innerHTML = ''; 
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id; 
                    option.textContent = model.name; 
                    modelSelect.appendChild(option);
                });
                
                setModelSelection(models); 
                
                chatButton.removeAttribute('disabled');
                chatButton.classList.remove('opacity-50', 'cursor-not-allowed');
                if (chatHistoryContainer) chatHistoryContainer.innerHTML = '<p class="text-gray-400">Ready.</p>';

            } catch (error) {
                console.error('Failed to populate models:', error);
                modelSelect.innerHTML = '<option value="" disabled>Loading error</option>';
                if (chatHistoryContainer) chatHistoryContainer.innerHTML = `<p class="text-red-500">Error: ${error.message}</p>`;
            }
        }

        // Проверяем, что все элементы на месте
        if (chatButton && chatInput && chatHistoryContainer && modelSelect) {
            
            populateModels();

            modelSelect.addEventListener('change', () => {
                localStorage.setItem(MODEL_PREFERENCE_KEY, modelSelect.value);
            });

            // (ИЗМЕНЕНО) Создаем функцию-обработчик отправки
            const handleSend = async () => {
                const prompt = chatInput.value.trim(); 
                const selectedModel = modelSelect.value; 

                if (!prompt) return; 
                if (!selectedModel) {
                    appendMessage('error', 'Error: Models are not loaded.');
                    return;
                }

                appendMessage('user', prompt);
                conversationHistory.push({ role: 'user', text: prompt });
                chatInput.value = ''; // Очищаем инпут СРАЗУ

                chatButton.setAttribute('disabled', 'true');
                chatButton.classList.add('opacity-50', 'cursor-not-allowed');

                // --- (НОВОЕ) Индикатор "Думаю..." ---
                // 1. Добавляем сообщение "Thinking..."
                appendMessage('model', 'Thinking...');
                // 2. Находим его, чтобы потом обновить
                const thinkingMessageElement = chatHistoryContainer.lastElementChild;
                const thinkingSpan = thinkingMessageElement ? thinkingMessageElement.querySelector('span') : null;
                // --- (КОНЕЦ НОВОГО) ---

                try {
                    const response = await fetch('/api/chat', { 
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            history: conversationHistory, 
                            model: selectedModel 
                        }), 
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Server error');
                    }

                    const data = await response.json();
                    
                    // --- (ИЗМЕНЕНО) ---
                    // 3. Обновляем "Thinking..." настоящим ответом
                    if (thinkingSpan) {
                        thinkingSpan.textContent = data.reply;
                    } else {
                        // Запасной вариант, если что-то пошло не так
                        appendMessage('model', data.reply);
                    }
                    // --- (КОНЕЦ ИЗМЕНЕНИЯ) ---
                    
                    conversationHistory.push({ role: 'model', text: data.reply });

                } catch (error) {
                    console.error('Chat Error:', error);
                    
                    // --- (ИЗМЕНЕНО) ---
                    // 4. Обновляем "Thinking..." текстом ошибки
                    if (thinkingSpan) {
                        thinkingSpan.textContent = `Error: ${error.message}`;
                        thinkingSpan.classList.replace('bg-gray-700', 'bg-red-800');
                        thinkingSpan.classList.add('text-red-100');
                    } else {
                        // Запасной вариант
                        appendMessage('error', `Error: ${error.message}`);
                    }
                    // --- (КОНЕЦ ИЗМЕНЕНИЯ) ---

                } finally {
                    chatButton.removeAttribute('disabled');
                    chatButton.classList.remove('opacity-50', 'cursor-not-allowed');
                }
            };
            
            // 1. Вешаем обработчик на КЛИК
            chatButton.addEventListener('click', handleSend);

            // 2. (НОВОЕ) Вешаем обработчик на НАЖАТИЕ КЛАВИШИ
            chatInput.addEventListener('keydown', (event) => {
                // Если нажат Enter И НЕ нажат Shift
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault(); // Запретить перенос строки
                    handleSend();           // Вызвать нашу функцию отправки
                }
                // Если нажат Shift + Enter, 'if' не сработает,
                // и браузер по умолчанию добавит новую строку.
            });
        }
});

