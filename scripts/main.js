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
    
    // Обработчики слайдеров
    initSliders();
    
    // Обработчик кнопки сохранения
    document.getElementById('save_button').addEventListener('click', saveSettings);
    console.log("Save button handler registered");
    
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

// Функция извлечения и обработки данных из URL
function loadDataFromUrl() {
    console.log("Extracting data from URL");
    
    try {
        // Получаем параметры из URL
        const urlParams = new URLSearchParams(window.location.search);
        const encodedData = urlParams.get('data');
        
        if (!encodedData) {
            console.warn("No data parameter found in URL");
            hideLoadingIndicator();
            
            // Запрашиваем список персонажей
            requestCharacterList();
            return;
        }
        
        // Декодируем base64 в строку
        let jsonData;
        try {
            jsonData = atob(encodedData);
            console.log("Decoded data from URL (first 200 chars):", jsonData.substring(0, 200));
        } catch (decodeError) {
            console.error("Error decoding base64 data:", decodeError);
            hideLoadingIndicator();
            showNotification('Ошибка декодирования данных. Загружаем данные напрямую...', 'warning', 3000);
            
            // Запрашиваем список персонажей
            requestCharacterList();
            return;
        }
        
        // Парсим JSON
        try {
            const initialData = JSON.parse(jsonData);
            console.log("Parsed initial data:", initialData);
            
            // Обрабатываем полученные данные
            processInitialData(initialData);
        } catch (parseError) {
            console.error("Error parsing JSON data:", parseError);
            hideLoadingIndicator();
            showNotification('Ошибка обработки JSON. Загружаем данные напрямую...', 'warning', 3000);
            
            // Запрашиваем список персонажей
            requestCharacterList();
        }
        
    } catch (e) {
        console.error("Error loading data from URL:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при обработке данных из URL. Загружаем данные напрямую...', 'warning', 3000);
        
        // Запрашиваем список персонажей
        requestCharacterList();
    }
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

// Обработка чанка с данными персонажа
function processCharacterDetailsChunk(data) {
    const { name, chunk_index, total_chunks, greeting, description_part } = data;
    
    if (!name) {
        console.error("Character name is missing in chunk data");
        return;
    }
    
    console.log(`Processing character details chunk ${chunk_index + 1}/${total_chunks} for ${name}`);
    
    // Инициализируем буфер для этого персонажа, если его еще нет
    if (!window.characterDetailBuffer[name]) {
        window.characterDetailBuffer[name] = {
            descriptionParts: new Array(total_chunks),
            receivedChunks: 0,
            totalChunks: total_chunks,
            greeting: null
        };
    }
    
    const buffer = window.characterDetailBuffer[name];
    
    // Сохраняем часть описания
    buffer.descriptionParts[chunk_index] = description_part;
    
    // Сохраняем приветствие, если оно есть (обычно только в первом чанке)
    if (greeting !== undefined && greeting !== null) {
        buffer.greeting = greeting;
    }
    
    // Увеличиваем счетчик полученных чанков
    buffer.receivedChunks++;
    
    // Если получили все чанки - собираем полные данные
    if (buffer.receivedChunks === buffer.totalChunks) {
        console.log(`All ${total_chunks} chunks received for ${name}, assembling full data`);
        
        // Собираем полное описание из частей
        const fullDescription = buffer.descriptionParts.join('');
        
        // Заполняем форму редактирования
        document.getElementById('character_edit_title').textContent = 'Редактирование персонажа';
        document.getElementById('character_name').value = name;
        document.getElementById('character_name').disabled = true; // Имя нельзя менять при редактировании
        document.getElementById('character_description').value = fullDescription;
        document.getElementById('character_greeting').value = buffer.greeting || '';
        
        // Показываем форму редактирования
        document.getElementById('character_edit').classList.add('active');
        
        // Переключаемся на вкладку персонажей
        document.querySelectorAll('.tab')[1].click();
        
        // Скрываем индикатор загрузки
        hideLoadingIndicator();
        
        // Устанавливаем флаг редактирования
        isEditingCharacter = true;
        currentEditingCharacter = { name: name };
        
        // Очищаем буфер для этого персонажа
        delete window.characterDetailBuffer[name];
    } else {
        // Обновляем индикатор загрузки с прогрессом
        showLoadingIndicator(`Загрузка персонажа ${name}... (${buffer.receivedChunks}/${buffer.totalChunks})`);
    }
}

// Функция обработки полученных начальных данных
function processInitialData(data) {
    console.log("Processing initial data from URL");
    
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

// Функция отображения уведомления
function showNotification(message, type = 'info', duration = 3000) {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Удаляем уведомление через указанное время
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, duration);
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

// Инициализация обработчиков слайдеров
function initSliders() {
    document.getElementById('temperature').addEventListener('input', function() {
        document.getElementById('temp_value').textContent = this.value;
    });
    
    document.getElementById('top_p').addEventListener('input', function() {
        document.getElementById('top_p_value').textContent = this.value;
    });
    
    document.getElementById('top_k').addEventListener('input', function() {
        document.getElementById('top_k_value').textContent = this.value;
    });
    
    document.getElementById('streaming_edit_interval').addEventListener('input', function() {
        document.getElementById('streaming_interval_value').textContent = this.value;
    });
    
    // Связываем обработчики для зависимых настроек
    document.getElementById('streaming_mode').addEventListener('change', updateStreamingEditVisibility);
    document.getElementById('streaming_edit_mode').addEventListener('change', updateStreamingEditVisibility);
}

// Функция обновления видимости настроек редактирования при потоковой передаче
function updateStreamingEditVisibility() {
    const streamingModeCheckbox = document.getElementById('streaming_mode');
    const streamingEditModeCheckbox = document.getElementById('streaming_edit_mode');
    const streamingIntervalContainer = document.getElementById('streaming_edit_interval').closest('.field');
    
    if (streamingModeCheckbox && streamingEditModeCheckbox && streamingIntervalContainer) {
        if (!streamingModeCheckbox.checked) {
            streamingEditModeCheckbox.disabled = true;
            streamingEditModeCheckbox.checked = false;
            streamingIntervalContainer.style.display = 'none';
        } else {
            streamingEditModeCheckbox.disabled = false;
            
            if (streamingEditModeCheckbox.checked) {
                streamingIntervalContainer.style.display = 'block';
            } else {
                streamingIntervalContainer.style.display = 'none';
            }
        }
    }
}

// Обновление UI данными из настроек
function updateUIWithSettings(settings) {
    console.log("Updating UI with settings:", settings);
    
    // Модель
    if (settings.model_name) {
        const modelSelect = document.getElementById('model');
        // Проверяем, существует ли такая опция
        const modelOption = Array.from(modelSelect.options).find(opt => opt.value === settings.model_name);
        if (modelOption) {
            console.log(`Model option found: ${settings.model_name}`);
            modelSelect.value = settings.model_name;
        } else {
            // Если нет, добавляем новую опцию
            console.log(`Adding new model option: ${settings.model_name}`);
            const option = document.createElement('option');
            option.value = settings.model_name;
            option.textContent = getModelDisplayName(settings.model_name);
            modelSelect.appendChild(option);
            modelSelect.value = settings.model_name;
        }
    }
    
    // Параметры модели
    if (settings.temperature !== undefined) {
        const tempSlider = document.getElementById('temperature');
        tempSlider.value = settings.temperature;
        document.getElementById('temp_value').textContent = settings.temperature;
    }
    
    if (settings.top_p !== undefined) {
        const topPSlider = document.getElementById('top_p');
        topPSlider.value = settings.top_p;
        document.getElementById('top_p_value').textContent = settings.top_p;
    }
    
    if (settings.top_k !== undefined) {
        const topKSlider = document.getElementById('top_k');
        topKSlider.value = settings.top_k;
        document.getElementById('top_k_value').textContent = settings.top_k;
    }
    
    // Настройки ответов
    if (settings.streaming_mode !== undefined) {
        document.getElementById('streaming_mode').checked = settings.streaming_mode;
    }
    
    if (settings.streaming_edit_mode !== undefined) {
        document.getElementById('streaming_edit_mode').checked = settings.streaming_edit_mode;
    }
    
    if (settings.streaming_edit_interval !== undefined) {
        const intervalSlider = document.getElementById('streaming_edit_interval');
        intervalSlider.value = settings.streaming_edit_interval;
        document.getElementById('streaming_interval_value').textContent = settings.streaming_edit_interval;
    }
    
    if (settings.enable_message_buttons !== undefined) {
        document.getElementById('enable_message_buttons').checked = settings.enable_message_buttons;
    }
    
    if (settings.enable_image_generation !== undefined) {
        document.getElementById('enable_image_generation').checked = settings.enable_image_generation;
    }
    
    // Обновляем зависимости между элементами интерфейса
    updateStreamingEditVisibility();
}

// Получение отображаемого имени модели
function getModelDisplayName(modelName) {
    // Здесь можно добавить псевдонимы для улучшения читаемости
    const modelDisplayNames = {
        "gemini-2.0-flash": "Gemini 2.0 Flash",
        "gemini-2.0-flash-lite": "Gemini 2.0 Flash Lite",
        "gemini-2.0-flash-thinking-exp-01-21": "Gemini 2.0 Flash Thinking",
        "gemini-2.5-pro-exp-03-25": "Gemini 2.5 Pro",
        "gemini-2.0-flash-exp": "Gemini 2.0 Flash Exp"
    };
    
    return modelDisplayNames[modelName] || modelName;
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

// Запрос деталей персонажа
function requestCharacterDetails(name) {
    console.log(`Requesting details for character: ${name}`);
    showLoadingIndicator(`Загрузка данных персонажа ${name}...`);
    
    try {
        // Отправляем запрос на получение деталей
        const request = {
            action: 'get_character_details',
            name: name
        };
        
        window.Telegram.WebApp.sendData(JSON.stringify(request));
        console.log("Character details request sent");
    } catch (e) {
        console.error("Error requesting character details:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при запросе данных персонажа', 'error');
    }
}

// Отображение списка персонажей
function renderCharacterList() {
    const characterListElement = document.getElementById('character-list');
    if (!characterListElement) return;
    
    characterListElement.innerHTML = '';
    
    if (characterNames.length === 0) {
        characterListElement.innerHTML = '<div class="character-item">Нет доступных персонажей</div>';
        return;
    }
    
    // Сортируем персонажей по имени
    characterNames.sort((a, b) => a.name.localeCompare(b.name));
    
    characterNames.forEach(character => {
        const characterItem = document.createElement('div');
        characterItem.className = 'character-item';
        
        // Проверяем, является ли персонаж текущим выбранным
        const characterSelect = document.getElementById('character');
        const selectedCharacterValue = characterSelect.value;
        let isSelected = false;
        
        try {
            const selectedCharacter = JSON.parse(selectedCharacterValue);
            isSelected = selectedCharacter.name === character.name;
        } catch (e) {}
        
        if (isSelected) {
            characterItem.classList.add('selected');
        }
        
        characterItem.innerHTML = `
            <div>
                <div class="character-name">${character.name}</div>
            </div>
            <div class="character-actions">
                <button class="action-button edit-character" data-name="${character.name}">Изменить</button>
                <button class="action-button select-character" data-name="${character.name}">Выбрать</button>
            </div>
        `;
        
        characterListElement.appendChild(characterItem);
    });
    
    // Добавляем обработчики событий для кнопок
    addCharacterButtonHandlers();
}

// Добавление обработчиков кнопок в списке персонажей
function addCharacterButtonHandlers() {
    document.querySelectorAll('.edit-character').forEach(button => {
        button.addEventListener('click', event => {
            const characterName = event.target.dataset.name;
            if (characterName) {
                // Запрашиваем данные персонажа для редактирования
                requestCharacterDetails(characterName);
            }
        });
    });
    
    document.querySelectorAll('.select-character').forEach(button => {
        button.addEventListener('click', event => {
            const characterName = event.target.dataset.name;
            if (characterName) {
                const characterSelect = document.getElementById('character');
                
                // Находим опцию с соответствующим именем персонажа
                Array.from(characterSelect.options).forEach(option => {
                    try {
                        const optionData = JSON.parse(option.value || '{}');
                        if (optionData.name === characterName) {
                            option.selected = true;
                            
                            // Обновляем выделение в списке персонажей
                            document.querySelectorAll('.character-item').forEach(item => {
                                item.classList.remove('selected');
                            });
                            event.target.closest('.character-item').classList.add('selected');
                            
                            // Переключаемся на вкладку настроек
                            document.querySelectorAll('.tab')[0].click();
                        }
                    } catch (e) {}
                });
            }
        });
    });
    
    // Добавляем обработчик для кнопки создания нового персонажа
    const newCharacterButton = document.getElementById('new_character_button');
    if (newCharacterButton) {
        newCharacterButton.addEventListener('click', () => {
            document.getElementById('character_edit_title').textContent = 'Создание персонажа';
            document.getElementById('character_name').value = '';
            document.getElementById('character_description').value = '';
            document.getElementById('character_greeting').value = 'Привет! Я новый персонаж.';
            document.getElementById('character_name').disabled = false;
            
            currentEditingCharacter = null;
            document.getElementById('character_edit').classList.add('active');
            isEditingCharacter = true;
        });
    }
    
    // Обработчик кнопки отмены редактирования
    const cancelEditButton = document.getElementById('cancel_character_edit');
    if (cancelEditButton) {
        cancelEditButton.addEventListener('click', () => {
            document.getElementById('character_edit').classList.remove('active');
            currentEditingCharacter = null;
            isEditingCharacter = false;
        });
    }
    
    // Обработчик кнопки сохранения персонажа
    const saveCharacterButton = document.getElementById('save_character_button');
    if (saveCharacterButton) {
        saveCharacterButton.addEventListener('click', saveCharacter);
    }
}

// Функция сохранения персонажа
function saveCharacter() {
    const name = document.getElementById('character_name').value.trim();
    const description = document.getElementById('character_description').value.trim();
    const greeting = document.getElementById('character_greeting').value.trim();
    
    if (!name) {
        showNotification('Имя персонажа не может быть пустым', 'error');
        return;
    }
    
    if (name.length > CHARACTER_NAME_LIMIT) {
        showNotification(`Имя персонажа не может быть длиннее ${CHARACTER_NAME_LIMIT} символов`, 'error');
        return;
    }
    
    if (description.length > CHARACTER_DESCRIPTION_LIMIT) {
        showNotification(`Описание персонажа не может быть длиннее ${CHARACTER_DESCRIPTION_LIMIT} символов`, 'error');
        return;
    }
    
    if (greeting.length > CHARACTER_GREETING_LIMIT) {
        showNotification(`Приветствие персонажа не может быть длиннее ${CHARACTER_GREETING_LIMIT} символов`, 'error');
        return;
    }
    
    // Если поле приветствия пустое, устанавливаем дефолтное значение
    const finalGreeting = greeting === '' ? 'Привет!' : greeting;
    
    // Создаем данные персонажа
    const characterData = {
        name: name,
        description: description,
        greeting: finalGreeting
    };
    
    // Собираем данные для сохранения
    const saveData = {
        action: 'save_character',
        editedCharacter: characterData
    };
    
    // Отправляем данные боту
    try {
        console.log("Sending character save request:", saveData);
        showLoadingIndicator('Сохранение персонажа...');
        
        window.Telegram.WebApp.sendData(JSON.stringify(saveData));
        console.log("Character save request sent");
        
        // Скрываем форму редактирования
        document.getElementById('character_edit').classList.remove('active');
        isEditingCharacter = false;
        currentEditingCharacter = null;
        
        // Обновляем список персонажей, если это новый персонаж
        const existingIndex = characterNames.findIndex(c => c.name === name);
        if (existingIndex === -1) {
            characterNames.push({ name: name });
            renderCharacterList();
            updateCharacterSelect();
        }
        
    } catch (e) {
        console.error("Error saving character:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при сохранении персонажа', 'error');
    }
}

// Обновление выпадающего списка персонажей
function updateCharacterSelect() {
    const characterSelect = document.getElementById('character');
    if (!characterSelect) return;
    
    const selectedValue = characterSelect.value;
    let selectedOption = null;
    
    try {
        selectedOption = JSON.parse(selectedValue);
    } catch (e) {}
    
    characterSelect.innerHTML = '';
    
    // Сортируем персонажей по имени
    const sortedCharacters = [...characterNames].sort((a, b) => {
        return a.name.localeCompare(b.name);
    });
    
    sortedCharacters.forEach(char => {
        const option = document.createElement('option');
        option.value = JSON.stringify({name: char.name});
        option.textContent = char.name;
        
        if (selectedOption && selectedOption.name === char.name) {
            option.selected = true;
        }
        
        characterSelect.appendChild(option);
    });
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