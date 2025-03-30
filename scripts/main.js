// Инициализация Telegram Mini App
let tg = window.Telegram.WebApp;
tg.expand();

// Добавим debug-логирование
console.log("WebApp initializing. SDK version:", tg.version);
console.log("Initial launch parameters:", tg.initDataUnsafe);

// Глобальные переменные для работы с персонажами
let currentEditingCharacter = null;
let characters = [];
let characterNames = []; // Только имена персонажей для отображения в списке

// Константы для валидации
const CHARACTER_NAME_LIMIT = 50;
const CHARACTER_DESCRIPTION_LIMIT = 1000;
const CHARACTER_GREETING_LIMIT = 500;

// API URL
const API_BASE_URL = "/api";

// Буфер для сборки чанков с данными персонажа
window.characterDetailBuffer = {};

// Флаг редактирования персонажа
let isEditingCharacter = false;

// Флаг загрузки данных
let isDataLoading = false;

// Текущий ID пользователя
let currentUserId = 'default';

// Инициализация функций при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing WebApp UI");
    
    // Показываем индикатор загрузки немедленно
    showLoadingIndicator("Инициализация интерфейса...");
    
    // Инициализация вкладок
    initTabs();
    
    // Инициализация компонентов
    initComponents();
    
    // Настраиваем обработчик событий для получения данных от Telegram
    tg.onEvent('viewportChanged', handleViewportChanged);
    
    // Регистрируем обработчик для событий BackButton
    tg.BackButton.onClick(handleBackButton);
    
    // Извлекаем и обрабатываем данные из URL
    loadDataFromUrl();
});

// Инициализация всех компонентов интерфейса
function initComponents() {
    // Обработчики слайдеров
    initSliders();
    
    // Инициализация вкладки настроек
    initSettingsTab();
    
    // Инициализация вкладки персонажей
    initCharactersTab();
    
    // Обработчик кнопки сохранения
    document.getElementById('save_button').addEventListener('click', saveSettings);
    console.log("Save button handler registered");
}

// Функция извлечения и обработки данных из URL
function loadDataFromUrl() {
    console.log("Extracting data from URL");
    
    try {
        // Получаем параметры из URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session');
        
        if (!sessionId) {
            console.warn("No session ID found in URL");
            hideLoadingIndicator();
            
            // Запрашиваем список персонажей и настройки через API
            loadInitialDataFromApi();
            return;
        }
        
        console.log("Found session ID in URL:", sessionId);
        
        // Загружаем данные по ID сессии
        fetchSessionData(sessionId);
    } catch (e) {
        console.error("Error loading data from URL:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при обработке данных из URL', 'warning');
        
        // Запрашиваем настройки через API
        loadInitialDataFromApi();
    }
}

// Функция загрузки начальных данных через API
function loadInitialDataFromApi() {
    console.log("Loading initial data from API");
    showLoadingIndicator("Загрузка данных...");
    
    // Запрашиваем список персонажей
    fetchCharacterList()
        .then(() => {
            // После загрузки списка персонажей загружаем настройки
            return fetchSettings();
        })
        .then(() => {
            hideLoadingIndicator();
        })
        .catch((error) => {
            console.error("Error loading initial data:", error);
            hideLoadingIndicator();
            showNotification('Ошибка загрузки данных', 'error');
            setDefaultSettings();
        });
}

// Функция загрузки данных сессии
async function fetchSessionData(sessionId) {
    console.log("Fetching session data:", sessionId);
    showLoadingIndicator("Загрузка данных сессии...");
    
    try {
        const response = await fetch(`${API_BASE_URL}/init/${sessionId}`);
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Unknown error");
        }
        
        console.log("Session data fetched successfully");
        
        // Сохраняем ID пользователя
        if (result.data.user_id) {
            currentUserId = result.data.user_id;
            console.log("Current user ID:", currentUserId);
        }
        
        // Обрабатываем полученные данные
        processSessionData(result.data);
    } catch (e) {
        console.error("Error fetching session data:", e);
        hideLoadingIndicator();
        showNotification('Ошибка загрузки данных сессии: ' + e.message, 'error');
        
        // В случае ошибки загружаем данные через API
        loadInitialDataFromApi();
    }
}

// Функция запроса списка персонажей через API
async function fetchCharacterList() {
    console.log("Fetching character list from API");
    
    try {
        const url = `${API_BASE_URL}/characters?user_id=${currentUserId}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Unknown error");
        }
        
        // Обработка полученных данных
        if (result.data && result.data.character_names) {
            characterNames = result.data.character_names;
            
            // Обновляем UI
            renderCharacterList();
            updateCharacterSelect();
        }
        
        return true;
    } catch (e) {
        console.error("Error fetching character list:", e);
        throw e;
    }
}

// Функция запроса настроек через API
async function fetchSettings() {
    console.log("Fetching settings from API");
    
    try {
        const url = `${API_BASE_URL}/settings?user_id=${currentUserId}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Unknown error");
        }
        
        // Обработка полученных данных
        if (result.data) {
            updateUIWithSettings(result.data);
        }
        
        return true;
    } catch (e) {
        console.error("Error fetching settings:", e);
        throw e;
    }
}

// Функция обработки данных сессии
function processSessionData(data) {
    console.log("Processing session data");
    
    // Проверяем срок действия данных
    if (data.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        if (now > data.expires_at) {
            console.warn("Session data has expired");
            hideLoadingIndicator();
            showNotification('Данные сессии устарели, загружаем актуальные данные', 'warning');
            loadInitialDataFromApi();
            return;
        }
    }
    
    // Обрабатываем настройки
    if (data.settings) {
        updateUIWithSettings(data.settings);
    } else {
        console.warn("Session data missing settings.");
        // Загружаем настройки через API
        fetchSettings().catch(() => setDefaultSettings());
    }
    
    // Обрабатываем список имен персонажей
    if (data.character_names && Array.isArray(data.character_names)) {
        characterNames = data.character_names;
        renderCharacterList();
        updateCharacterSelect();
    } else {
        console.warn("Session data missing character_names array or it's not valid.");
        // Запрашиваем список персонажей через API
        fetchCharacterList().catch(() => {
            characterNames = [];
            renderCharacterList();
            updateCharacterSelect();
        });
    }
    
    // Обрабатываем текущего персонажа (после загрузки списка)
    if (data.current_character) {
        selectCharacterInUI(data.current_character);
    } else {
        console.warn("Session data missing current_character.");
    }
    
    // Скрываем индикатор загрузки
    hideLoadingIndicator();
    console.log("Session data processed successfully");
}

// Установка настроек по умолчанию
function setDefaultSettings() {
    console.log("Setting default settings");
    
    // Значения по умолчанию
    const defaultSettings = {
        model_name: "gemini-2.0-flash",
        temperature: 0.85,
        top_p: 0.95,
        top_k: 1,
        streaming_mode: true,
        streaming_edit_mode: true,
        streaming_edit_interval: 2.0,
        enable_message_buttons: true,
        enable_image_generation: true
    };
    
    // Обновляем UI настройками по умолчанию
    updateUIWithSettings(defaultSettings);
}

// Обработчик нажатия кнопки "Назад"
function handleBackButton() {
    console.log("Back button pressed");
    
    // Если мы редактируем персонажа, возвращаемся к списку
    if (isEditingCharacter) {
        document.getElementById('character_edit').classList.remove('active');
        isEditingCharacter = false;
        currentEditingCharacter = null;
        return;
    }
    
    // Иначе закрываем WebApp
    tg.close();
}

// Обработчик изменения области просмотра (для мобильных устройств)
function handleViewportChanged(event) {
    console.log('Viewport changed:', event);
}

// Инициализация системы вкладок
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            console.log(`Tab selected: ${tabId}`);
            
            // Активируем выбранную вкладку
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Показываем содержимое выбранной вкладки
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });
}

// Функция отображения индикатора загрузки
function showLoadingIndicator(message) {
    // Проверяем, существует ли уже индикатор
    let loadingIndicator = document.getElementById('loading-indicator');
    
    if (!loadingIndicator) {
        // Создаем индикатор, если его нет
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-indicator';
        loadingIndicator.className = 'loading-overlay';
        loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-message">${message || 'Загрузка...'}</div>
        `;
        document.body.appendChild(loadingIndicator);
        
        // Добавляем стили для индикатора, если их еще нет в CSS
        if (!document.getElementById('loading-indicator-styles')) {
            const style = document.createElement('style');
            style.id = 'loading-indicator-styles';
            style.textContent = `
                .loading-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    z-index: 9999;
                }
                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 1s linear infinite;
                    margin-bottom: 16px;
                }
                .loading-message {
                    color: white;
                    font-size: 16px;
                    text-align: center;
                    padding: 0 20px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        // Обновляем сообщение, если индикатор уже существует
        const messageElement = loadingIndicator.querySelector('.loading-message');
        if (messageElement) {
            messageElement.textContent = message || 'Загрузка...';
        }
    }
}

// Функция скрытия индикатора загрузки
function hideLoadingIndicator() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
}

// Выбор персонажа в UI
function selectCharacterInUI(character) {
    console.log("Selecting character in UI:", character);
    if (!character || !character.name) return;
    
    const characterSelect = document.getElementById('character');
    
    // Ищем опцию с этим именем
    let found = false;
    Array.from(characterSelect.options).forEach(option => {
        try {
            const optionData = JSON.parse(option.value || '{}');
            if (optionData.name === character.name) {
                console.log(`Character option found: ${character.name}`);
                option.selected = true;
                found = true;
            }
        } catch (e) {
            console.error("Error parsing character option:", e);
        }
    });
    
    // Если опция не найдена, добавляем новую
    if (!found && character.name) {
        console.log(`Adding new character option: ${character.name}`);
        const option = document.createElement('option');
        option.value = JSON.stringify({name: character.name});
        option.textContent = character.name;
        characterSelect.appendChild(option);
        option.selected = true;
    }
}

// Отправка настроек боту
async function saveSettings() {
    console.log("Saving settings...");
    showLoadingIndicator('Сохранение настроек...');
    
    const characterValue = document.getElementById('character').value;
    let character = null;
    
    if (characterValue) {
        try {
            character = JSON.parse(characterValue);
            console.log("Selected character:", character);
        } catch (e) {
            console.error("Error parsing character value:", e);
            hideLoadingIndicator();
            showNotification('Ошибка при обработке данных персонажа', 'error');
            return;
        }
    }
    
    // Собираем настройки
    const settings = {
        character: character,
        model_name: document.getElementById('model').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        top_p: parseFloat(document.getElementById('top_p').value),
        top_k: parseInt(document.getElementById('top_k').value),
        streaming_mode: document.getElementById('streaming_mode').checked,
        streaming_edit_mode: document.getElementById('streaming_edit_mode').checked,
        streaming_edit_interval: parseFloat(document.getElementById('streaming_edit_interval').value),
        enable_message_buttons: document.getElementById('enable_message_buttons').checked,
        enable_image_generation: document.getElementById('enable_image_generation').checked
    };
    
    console.log("Settings to save:", settings);
    
    try {
        // Сохраняем настройки через API
        const url = `${API_BASE_URL}/settings?user_id=${currentUserId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Unknown error");
        }
        
        console.log("Settings saved successfully via API");
        
        // Отправляем данные в Telegram для обновления настроек бота
        const settingsData = {
            action: 'save_settings',
            ...settings
        };
        
        window.Telegram.WebApp.sendData(JSON.stringify(settingsData));
        console.log("Settings sent to Telegram");
        
    } catch (e) {
        console.error("Error saving settings:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при сохранении настроек: ' + e.message, 'error');
    }
}