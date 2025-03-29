// Инициализация Telegram Mini App
let tg = window.Telegram.WebApp;
tg.expand();

// Добавим debug-логирование
console.log("WebApp initializing. SDK version:", tg.version);
console.log("Initial launch parameters:", tg.initDataUnsafe);

// Глобальные переменные для работы с персонажами
let currentEditingCharacter = null;
let characters = [];

// Константы для валидации
const CHARACTER_NAME_LIMIT = 50;
const CHARACTER_DESCRIPTION_LIMIT = 1000;
const CHARACTER_GREETING_LIMIT = 500;

// Флаг успешной загрузки настроек
let settingsLoaded = false;
// Флаг успешной загрузки ВСЕХ персонажей
let charactersFullyLoaded = false;
// Флаг отправки запроса данных
let dataRequested = false;

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
    
    // Инициализируем списки для отображения пустых данных
    renderCharacterList();
    updateCharacterSelect();
    
    // Логируем состояние WebApp
    console.log("WebApp initialization completed");
    console.log("isExpanded:", tg.isExpanded);
    console.log("colorScheme:", tg.colorScheme);
    
    // ЗАПРАШИВАЕМ ДАННЫЕ У БОТА ПОСЛЕ ИНИЦИАЛИЗАЦИИ
    requestInitialData();
    
    // Тайм-аут на случай, если данные не пришли
    setTimeout(checkDataLoaded, 20000);  // Увеличиваем таймаут до 20 секунд
});

// Функция запроса данных от бота
function requestInitialData() {
    if (dataRequested) {
        console.log("Initial data already requested, skipping duplicate request");
        return;
    }
    
    console.log("Requesting initial data from the bot...");
    showLoadingIndicator("Запрос данных от бота...");
    
    try {
        // Отправляем запрос на получение данных
        window.Telegram.WebApp.sendData(JSON.stringify({ action: "request_initial_data" }));
        console.log("Initial data request sent via sendData");
        dataRequested = true;
        // Не скрываем индикатор здесь, ждем данные от бота
    } catch (e) {
        console.error("Error sending initial data request:", e);
        hideLoadingIndicator();
        showNotification('Не удалось отправить запрос на получение данных боту.', 'error', 7000);
        
        // Помечаем как "загруженные", чтобы убрать таймаут
        settingsLoaded = true;
        charactersFullyLoaded = true;
        renderCharacterList();
        updateCharacterSelect();
    }
}

// Обработчик сообщений от бота
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
        
        // 1. Полные начальные данные (если поместились в одно сообщение)
        if (parsedData.action === "initial_state" && parsedData.data) {
            console.log("Processing full initial_state data");
            processInitialData(parsedData.data);
            settingsLoaded = true;
            charactersFullyLoaded = true;
            hideLoadingIndicator();
            showNotification('Настройки и персонажи успешно загружены!', 'success');
        }
        // 2. Только начальные настройки (данные большие)
        else if (parsedData.action === "initial_settings" && parsedData.data) {
            console.log("Processing initial_settings data (chunked mode start)");
            // Применяем настройки и текущего персонажа
            if (parsedData.data.settings) {
                updateUIWithSettings(parsedData.data.settings);
                settingsLoaded = true;
                // Сбрасываем текущих персонажей перед загрузкой чанков
                characters = [];
                renderCharacterList();
                updateCharacterSelect();
            }
            if (parsedData.data.current_character) {
                // Запоминаем, какой персонаж должен быть выбран после загрузки всех
                window.pendingSelectedCharacter = parsedData.data.current_character;
            }
            // Не скрываем индикатор загрузки - ждем чанки с персонажами
            showLoadingIndicator("Загрузка персонажей...");
            charactersFullyLoaded = false;
        }
        // 3. Чанк с персонажами
        else if (parsedData.action === "characters_chunk" && parsedData.characters) {
            console.log(`Processing characters_chunk ${parsedData.chunk_index + 1}/${parsedData.total_chunks}`);
            
            // Добавляем персонажей из чанка
            characters = characters.concat(parsedData.characters || []);
            console.log(`Total characters after adding chunk: ${characters.length}`);
            
            // Обновляем интерфейс
            renderCharacterList();
            updateCharacterSelect();
            
            // Если это последний чанк
            if (parsedData.chunk_index + 1 >= parsedData.total_chunks) {
                charactersFullyLoaded = true;
                hideLoadingIndicator();
                showNotification(`Загружено ${characters.length} персонажей.`, 'success');
                // Если был ожидающий выбранный персонаж, применяем его
                if (window.pendingSelectedCharacter) {
                    selectCharacterInUI(window.pendingSelectedCharacter);
                    window.pendingSelectedCharacter = null;
                }
            } else {
                // Обновляем текст индикатора загрузки
                showLoadingIndicator(`Загрузка персонажей... (${parsedData.chunk_index + 1}/${parsedData.total_chunks})`);
            }
        }
        else {
            console.log("Received message data with unknown action:", parsedData.action);
        }
        
    } catch (e) {
        console.error("Error parsing or processing message data JSON:", e);
        console.error("Original data:", messageData);
        // Не скрываем индикатор, если ошибка во время загрузки чанков
        if (!settingsLoaded || !charactersFullyLoaded) {
            showLoadingIndicator("Ошибка загрузки данных");
            showNotification('Ошибка обработки данных от бота', 'error');
        }
    }
}

// Функция обработки полученных полных данных
function processInitialData(data) {
    console.log("Processing complete initial data block");
    
    // Обрабатываем настройки
    if (data.settings) {
        updateUIWithSettings(data.settings);
        settingsLoaded = true;
    } else {
        console.warn("Initial data block missing settings.");
    }
    
    // Обрабатываем список персонажей
    if (data.characters && Array.isArray(data.characters)) {
        characters = data.characters;
        renderCharacterList();
        updateCharacterSelect();
        charactersFullyLoaded = true;
    } else {
        console.warn("Initial data block missing characters array.");
        characters = [];
        renderCharacterList();
        updateCharacterSelect();
        charactersFullyLoaded = true;
    }
    
    // Обрабатываем текущего персонажа (после загрузки списка)
    if (data.current_character) {
        selectCharacterInUI(data.current_character);
    } else {
        console.warn("Initial data block missing current_character.");
    }
    
    console.log("Complete initial data processed successfully");
}

// Функция проверки загрузки данных после таймаута
function checkDataLoaded() {
    if (!settingsLoaded || !charactersFullyLoaded) {
        console.warn("Initial data not fully loaded after timeout");
        hideLoadingIndicator();
        
        // Показываем ошибку только если что-то действительно не загрузилось
        if (!settingsLoaded) {
            showNotification('Не удалось загрузить настройки от бота.', 'error', 7000);
        } else if (!charactersFullyLoaded) {
            showNotification('Не удалось загрузить полный список персонажей от бота.', 'error', 7000);
        }
        
        // Показываем то, что есть, чтобы интерфейс не был пустым
        if (!charactersFullyLoaded) {
            renderCharacterList();
            updateCharacterSelect();
            charactersFullyLoaded = true;  // Предотвращаем повторное срабатывание
        }
        if (!settingsLoaded) {
            settingsLoaded = true;  // Предотвращаем повторное срабатывание
        }
    } else {
        console.log("Data check: Settings and Characters seem loaded.");
    }
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
    const characterSelect = document.getElementById('character');
    Array.from(characterSelect.options).forEach(option => {
        try {
            const optionData = JSON.parse(option.value || '{}');
            if (optionData.name === character.name && 
                optionData.user_created === character.user_created) {
                console.log(`Character option found: ${character.name} (user_created: ${character.user_created})`);
                option.selected = true;
            }
        } catch (e) {
            console.error("Error parsing character option:", e);
        }
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
    
    // Добавляем созданных/измененных пользовательских персонажей
    const userCreatedCharacters = characters.filter(c => c.user_created);
    if (userCreatedCharacters.length > 0) {
        console.log(`Adding ${userCreatedCharacters.length} user-created characters to settings`);
        settings.characters = userCreatedCharacters;
    }
    
    try {
        const settingsJson = JSON.stringify(settings);
        console.log("Settings JSON size:", settingsJson.length, "bytes");
        console.log("Settings JSON (first 200 chars):", settingsJson.substring(0, 200));
        
        // Показываем уведомление перед отправкой
        showNotification('Отправка настроек...', 'info');
        
        // Устанавливаем флаг для отслеживания успешной отправки
        window.settingsSent = false;
        
        // Отправка данных обратно в Telegram через sendData
        console.log("Sending data to Telegram using Telegram.WebApp.sendData()");
        window.Telegram.WebApp.sendData(settingsJson);
        console.log("Data sent successfully via sendData");
        window.settingsSent = true;
        
        // Обновляем уведомление об успешной отправке
        showNotification('Настройки обновляются! Пожалуйста, дождитесь подтверждения.', 'success');
        
        // WebApp автоматически закроется после вызова sendData()
        
    } catch (e) {
        console.error("Error sending data:", e);
        showNotification('Ошибка отправки данных: ' + e.message, 'error');
    }
}

// Добавляем обработчик событий для проверки статуса отправки при закрытии
window.addEventListener('beforeunload', function(e) {
    if (!window.settingsSent) {
        console.log("WebApp is closing but settings were not sent!");
        // Возможно, сохранить флаг в localStorage, чтобы показать сообщение при следующем открытии
    }
});