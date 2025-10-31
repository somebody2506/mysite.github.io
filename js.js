// ===================================
// 1. GLOBAL CONSTANTS & FUNCTIONS
// ===================================

// --- Volume Icons ---
const volumeIcons = {
    'mute': '<img src="./mute.svg" alt="Muted" class="w-5 h-5">',
    'min': '<img src="./min.svg" alt="Min Volume" class="w-5 h-5">',
    'medium': '<img src="./mid.svg" alt="Medium Volume" class="w-5 h-5">',
    'max': '<img src="./max.svg" alt="Max Volume" class="w-5 h-5">'
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

    if (volume === 0) { iconKey = 'mute'; } 
    else if (volume <= 33) { iconKey = 'min'; } 
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
const API_KEY = 'YOUR_API_KEY'; // !!! Получите свой бесплатный ключ на https://www.exchangerate-api.com/
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
        
    const rateFrom = exchangeRates[fromCode] ? exchangeRates[fromCode].rate : 1;
    const rateTo = exchangeRates[toCode] ? exchangeRates[toCode].rate : 1;
        
    // Формула: (Сумма * Курс_От) / Курс_В
    const result = (amount * rateFrom) / rateTo;
        
    resultDisplay.textContent = `${result.toFixed(2)} ${toCode}`;
}

// Function to populate the <select> fields
function populateCurrencySelectors() {
    const currencyFromSelect = document.getElementById('currency-from');
    const currencyToSelect = document.getElementById('currency-to');
    
    if (!currencyFromSelect || !currencyToSelect) return;
    
    const sortedCodes = Object.keys(exchangeRates).sort();
    const currentFromValue = currencyFromSelect.value;
    const currentToValue = currencyToSelect.value;
        
    // Очищаем списки
    while (currencyFromSelect.options.length > 1) { currencyFromSelect.remove(1); }
    while (currencyToSelect.options.length > 1) { currencyToSelect.remove(1); }
        
    // Добавляем все валюты
    sortedCodes.forEach(code => {
        if (code !== 'UAH') {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${exchangeRates[code].txt} (${code})`;
                
            currencyFromSelect.appendChild(option.cloneNode(true));
            currencyToSelect.appendChild(option);
        }
    });
        
    // Восстанавливаем выбранные значения
    currencyFromSelect.value = currentFromValue;
    currencyToSelect.value = currentToValue;
}

// Function to fetch and parse NBU XML data
async function fetchExchangeRates() {
    const dateDisplay = document.getElementById('exchange-date');

    if (dateDisplay) { dateDisplay.textContent = 'Last updated: Loading...'; }
    
    try {
        const response = await fetch(EXCHANGE_API_URL);
        
        if (!response.ok) { throw new Error(`HTTP Error: ${response.status} ${response.statusText}`); }

        // Поскольку мы используем прокси, ответ должен быть в формате JSON, содержащем исходный текст XML
        const data = await response.json(); 
        const text = data.contents;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        if (xmlDoc.getElementsByTagName('parsererror').length > 0) { throw new Error("Parsing Error: Invalid XML content."); }
            
        const currencies = xmlDoc.getElementsByTagName('currency');
        if (currencies.length === 0) { throw new Error("Data Error: No currency entries found."); }

        // Парсинг и заполнение
        for (let i = 0; i < currencies.length; i++) {
            const currency = currencies[i];
            const code = currency.getElementsByTagName('cc')[0].textContent;
            const rate = parseFloat(currency.getElementsByTagName('rate')[0].textContent);
            const txt = currency.getElementsByTagName('txt')[0].textContent;
            const date = currency.getElementsByTagName('exchangedate')[0].textContent;

            exchangeRates[code] = { rate: rate, txt: txt, exchangedate: date };
            if (date && date !== latestExchangeDate) { latestExchangeDate = date; }
        }

        // Успех
        populateCurrencySelectors();
        if (dateDisplay) { dateDisplay.textContent = `Last updated: ${latestExchangeDate}`; }
        convertCurrency();

    } catch (error) {
        // Вывод ошибки на сайт
        console.error('NBU Fetch Error:', error);
        let displayMessage = 'Error loading data.';
        
        if (error.name === 'TypeError' || String(error).includes('Failed to fetch')) {
             displayMessage = 'Error: CORS/Network Blocked. Please run via Web Server!';
        } else {
             displayMessage = `Error: ${error.message}`;
        }
        
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
});