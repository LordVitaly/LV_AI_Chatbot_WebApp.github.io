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
    
    // Извлекаем данные пользователя из initDataUnsafe
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        currentUserId = tg.initDataUnsafe.user.id.toString();
        console.log("User ID from Telegram:", currentUserId);
    }
    
    // Извлекаем и обрабатываем данные из URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('user_id')) {
        currentUserId = urlParams.get('user_id');
        console.log("User ID from URL parameters:", currentUserId);
    }
    
    // Загружаем данные
    loadInitialDataFromApi();
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

// Функция запроса списка персонажей через API
async function fetchCharacterList() {
    console.log("Fetching character list from API");
    
    try {
        const url = `${API_BASE_URL}/characters?user_id=${currentUserId}`;
        console.log("Fetching from URL:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Character list response:", result);
        
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
        
        // В случае ошибки, используем пустой список
        characterNames = [];
        renderCharacterList();
        updateCharacterSelect();
        
        throw e;
    }
}

// Функция запроса настроек через API
async function fetchSettings() {
    console.log("Fetching settings from API");
    
    try {
        const url = `${API_BASE_URL}/settings?user_id=${currentUserId}`;
        console.log("Fetching from URL:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Settings response:", result);
        
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

// Запрос данных персонажа через API
async function fetchCharacterDetails(name) {
    console.log("Fetching character details:", name);
    showLoadingIndicator("Загрузка данных персонажа...");
    
    try {
        const url = `${API_BASE_URL}/characters/${encodeURIComponent(name)}?user_id=${currentUserId}`;
        console.log("Fetching from URL:", url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Character details response:", result);
        
        if (!result.success) {
            throw new Error(result.error || "Unknown error");
        }
        
        // Обработка полученных данных
        if (result.data) {
            processCharacterDetails(result.data);
        }
        
        hideLoadingIndicator();
        return true;
    } catch (e) {
        console.error("Error fetching character details:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при загрузке данных персонажа: ' + e.message, 'error');
        return false;
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
        tg.BackButton.hide();
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

// Обработка данных персонажа
function processCharacterDetails(data) {
    console.log("Processing character details:", data);
    
    if (!data || !data.name) {
        console.error("Invalid character data");
        showNotification('Некорректные данные персонажа', 'error');
        return;
    }
    
    // Заполняем форму редактирования
    document.getElementById('character_edit_title').textContent = 'Редактирование персонажа';
    document.getElementById('character_name').value = data.name;
    document.getElementById('character_name').disabled = true; // Имя нельзя менять при редактировании
    document.getElementById('character_description').value = data.description || "";
    document.getElementById('character_greeting').value = data.greeting || "";
    
    // Показываем форму редактирования
    document.getElementById('character_edit').classList.add('active');
    
    // Переключаемся на вкладку персонажей
    document.querySelectorAll('.tab')[1].click();
    
    // Устанавливаем флаг редактирования
    isEditingCharacter = true;
    currentEditingCharacter = { name: data.name };
    
    // Показываем кнопку "Назад"
    tg.BackButton.show();
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
        
        // Показываем уведомление об успешном сохранении
        hideLoadingIndicator();
        showNotification('Настройки успешно сохранены', 'success');
        
    } catch (e) {
        console.error("Error saving settings:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при сохранении настроек: ' + e.message, 'error');
    }
}