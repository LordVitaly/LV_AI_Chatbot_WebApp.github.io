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
    
    // Регистрируем обработчик сообщений от бота
    window.Telegram.WebApp.onEvent('messageReceived', handleBotMessage);
    console.log("Registered 'messageReceived' event handler for receiving data");
    
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
        const dataId = urlParams.get('id');
        
        if (!dataId) {
            console.warn("No data ID found in URL");
            hideLoadingIndicator();
            showNotification('Отсутствует ID данных в URL', 'warning');
            
            // Запрашиваем список персонажей
            setDefaultSettings();
            return;
        }
        
        console.log("Found data ID in URL:", dataId);
        
        // Загружаем данные по ID
        fetchDataById(dataId);
    } catch (e) {
        console.error("Error loading data from URL:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при обработке данных из URL', 'warning');
        
        setDefaultSettings();
    }
}

// Функция загрузки данных по ID
async function fetchDataById(dataId) {
    console.log("Fetching data by ID:", dataId);
    showLoadingIndicator("Загрузка данных...");
    
    try {
        const response = await fetch(`${API_BASE_URL}/get_data/${dataId}`);
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Unknown error");
        }
        
        console.log("Data fetched successfully");
        
        // Обрабатываем полученные данные
        processInitialData(result.data);
    } catch (e) {
        console.error("Error fetching data by ID:", e);
        hideLoadingIndicator();
        showNotification('Ошибка загрузки данных: ' + e.message, 'error');
        
        setDefaultSettings();
    }
}

// Функция обработки полученных начальных данных
function processInitialData(data) {
    console.log("Processing initial data");
    
    // Проверяем срок действия данных
    if (data.meta && data.meta.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        if (now > data.meta.expires_at) {
            console.warn("Data has expired");
            hideLoadingIndicator();
            showNotification('Данные устарели, пожалуйста, запросите настройки заново', 'warning');
            setDefaultSettings();
            return;
        }
    }
    
    // Обрабатываем настройки
    if (data.settings) {
        updateUIWithSettings(data.settings);
    } else {
        console.warn("Initial data block missing settings.");
        // Устанавливаем настройки по умолчанию
        setDefaultSettings();
    }
    
    // Обрабатываем список имен персонажей
    if (data.character_names && Array.isArray(data.character_names)) {
        characterNames = data.character_names;
        renderCharacterList();
        updateCharacterSelect();
    } else {
        console.warn("Initial data block missing character_names array or it's not valid.");
        // Запрашиваем список персонажей от бота
        requestCharacterList();
    }
    
    // Обрабатываем текущего персонажа (после загрузки списка)
    if (data.current_character) {
        selectCharacterInUI(data.current_character);
    } else {
        console.warn("Initial data block missing current_character.");
    }
    
    // Скрываем индикатор загрузки
    hideLoadingIndicator();
    console.log("Initial data processed successfully");
}

// Функция запроса списка персонажей от бота
function requestCharacterList() {
    console.log("Requesting character list");
    
    if (isDataLoading) {
        console.log("Data loading already in progress, skipping request");
        return;
    }
    
    isDataLoading = true;
    showLoadingIndicator("Загрузка списка персонажей...");
    
    try {
        // Отправляем запрос на получение списка персонажей
        const request = {
            action: 'get_character_list'
        };
        
        window.Telegram.WebApp.sendData(JSON.stringify(request));
        console.log("Character list request sent");
    } catch (e) {
        console.error("Error requesting character list:", e);
        hideLoadingIndicator();
        isDataLoading = false;
        showNotification('Ошибка при запросе списка персонажей', 'error');
    }
}

// Обработка списка персонажей
function processCharacterList(data) {
    console.log("Processing character list data:", data);
    
    if (data.character_names && Array.isArray(data.character_names)) {
        characterNames = data.character_names;
        renderCharacterList();
        updateCharacterSelect();
        hideLoadingIndicator();
        isDataLoading = false;
        
        // Загружаем настройки по умолчанию, если они не были загружены
        setDefaultSettings();
    } else {
        console.error("Invalid character list data format");
        hideLoadingIndicator();
        isDataLoading = false;
        showNotification('Некорректный формат данных персонажей', 'error');
    }
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
    
    // Обновляем UI настройками по умолчанию, если они не были установлены
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

// Функция обработки сообщений от бота
function handleBotMessage(event) {
    console.log("Received message event:", event);
    const messageData = event.data;
    
    if (!messageData || typeof messageData !== 'string') {
        console.log("Received non-string or empty message data, skipping:", messageData);
        return;
    }
    
    console.log("Processing message data (first 200 chars):", messageData.substring(0, 200) + "...");
    
    try {
        const parsedData = JSON.parse(messageData);
        console.log("Parsed message data:", parsedData);
        
        if (!parsedData.action) {
            console.log("Received message data without 'action' field, skipping");
            return;
        }
        
        // Обработка разных типов сообщений
        if (parsedData.action === "character_details_chunk" && parsedData.data) {
            processCharacterDetailsChunk(parsedData.data);
        } 
        else if (parsedData.action === "character_list_response" && parsedData.data) {
            processCharacterList(parsedData.data);
        }
        else {
            console.log("Received message data with unknown action:", parsedData.action);
        }
        
    } catch (e) {
        console.error("Error parsing or processing message data JSON:", e);
        console.error("Original data:", messageData);
        hideLoadingIndicator();
        isDataLoading = false;
        showNotification('Ошибка обработки данных от бота', 'error');
    }
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
function saveSettings() {
    console.log("Saving settings...");
    const characterValue = document.getElementById('character').value;
    let character = null;
    
    if (characterValue) {
        try {
            character = JSON.parse(characterValue);
            console.log("Selected character:", character);
        } catch (e) {
            console.error("Error parsing character value:", e);
            showNotification('Ошибка при обработке данных персонажа', 'error');
            return;
        }
    }
    
    // Собираем настройки
    const settings = {
        action: 'save_settings',
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
    
    console.log("Collected settings:", settings);
    
    try {
        const settingsJson = JSON.stringify(settings);
        console.log("Settings JSON size:", settingsJson.length, "bytes");
        console.log("Settings JSON (first 200 chars):", settingsJson.substring(0, 200));
        
        // Показываем уведомление перед отправкой
        showLoadingIndicator('Отправка настроек...');
        
        // Отправка данных обратно в Telegram через sendData
        console.log("Sending data to Telegram using Telegram.WebApp.sendData()");
        window.Telegram.WebApp.sendData(settingsJson);
        console.log("Data sent successfully via sendData");
        
        // WebApp автоматически закроется после вызова sendData()
        
    } catch (e) {
        console.error("Error sending data:", e);
        hideLoadingIndicator();
        showNotification('Ошибка отправки данных: ' + e.message, 'error');
    }
}