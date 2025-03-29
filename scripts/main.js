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

// Флаг загрузки персонажей
let charactersLoaded = false;

// Флаг успешной загрузки настроек
let settingsLoaded = false;

// Для работы с чанками персонажей
let expectedCharacterChunks = 0;
let receivedCharacterChunks = [];

// Инициализация функций при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing WebApp UI");
    showLoadingIndicator("Загрузка данных от бота...");
    
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
    console.log("Registering message event handler for initial data");
    tg.onEvent('message', handleBotMessage);
    
    // Логируем состояние WebApp
    console.log("WebApp initialization completed");
    console.log("isExpanded:", tg.isExpanded);
    console.log("colorScheme:", tg.colorScheme);
    
    // Тайм-аут на случай, если данные не пришли
    setTimeout(checkDataLoaded, 10000);
});

// Показать индикатор загрузки
function showLoadingIndicator(message) {
    let indicator = document.getElementById('loading-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'loading-indicator';
        indicator.className = 'loading-indicator';
        indicator.style.position = 'fixed';
        indicator.style.top = '50%';
        indicator.style.left = '50%';
        indicator.style.transform = 'translate(-50%, -50%)';
        indicator.style.padding = '15px 20px';
        indicator.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        indicator.style.color = 'white';
        indicator.style.borderRadius = '10px';
        indicator.style.zIndex = '9999';
        document.body.appendChild(indicator);
    }
    indicator.textContent = message || 'Загрузка...';
    indicator.style.display = 'block';
}

// Скрыть индикатор загрузки
function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}

// Проверка, загрузились ли данные
function checkDataLoaded() {
    if (!settingsLoaded || !charactersLoaded) {
        console.warn("Initial data not fully loaded after timeout.");
        hideLoadingIndicator();
        showNotification('Не удалось загрузить все данные от бота. Отображаются неполные или стандартные настройки.', 'error', 7000);
        
        if (!charactersLoaded) {
            renderCharacterList();
            updateCharacterSelect();
            charactersLoaded = true;
        }
        
        if (!settingsLoaded) {
            settingsLoaded = true;
        }
    }
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

// Новый обработчик сообщений от бота
function handleBotMessage(event) {
    console.log("Received message event:", event);
    
    // Данные могут быть в event.data или event.data.data в зависимости от версии SDK/платформы
    let messageData = null;
    if (typeof event === 'string') {
        messageData = event;
    } else if (typeof event.data === 'string') {
        messageData = event.data;
    } else if (event.data && typeof event.data.data === 'string') {
        messageData = event.data.data;
    } else if (event.webAppData && typeof event.webAppData.data === 'string') {
        messageData = event.webAppData.data;
    }

    if (!messageData) {
        console.log("Message event doesn't contain string data, skipping.");
        return;
    }

    // Убираем маркдаун, если он есть
    if (messageData.startsWith('`') && messageData.endsWith('`')) {
        messageData = messageData.substring(1, messageData.length - 1);
    }

    console.log("Processing message data string:", messageData.substring(0, 200) + "...");

    try {
        const parsedData = JSON.parse(messageData);
        console.log("Parsed message data:", parsedData);

        if (parsedData.action === "initial_state" && parsedData.data) {
            console.log("Processing full initial_state data");
            const data = parsedData.data;
            processInitialData(data);
            hideLoadingIndicator();

        } else if (parsedData.action === "initial_settings" && parsedData.data) {
            console.log("Processing initial_settings data (chunked mode)");
            const data = parsedData.data;
            if (data.settings) {
                updateUIWithSettings(data.settings);
                settingsLoaded = true;
            }
            if (data.current_character) {
                // Запоминаем, какой персонаж должен быть выбран
                window.pendingSelectedCharacter = data.current_character;
            }
            expectedCharacterChunks = data.total_character_chunks || 0;
            receivedCharacterChunks = [];
            characters = [];
            console.log(`Expecting ${expectedCharacterChunks} character chunks.`);
            // Не скрываем индикатор, ждем чанки персонажей

        } else if (parsedData.action === "characters_chunk" && parsedData.characters) {
            console.log(`Processing characters_chunk ${parsedData.chunk_index + 1}/${parsedData.total_chunks}`);
            if (!receivedCharacterChunks[parsedData.chunk_index]) {
                receivedCharacterChunks[parsedData.chunk_index] = parsedData.characters;
                // Проверяем, все ли чанки получены
                const receivedCount = receivedCharacterChunks.filter(c => c).length;
                console.log(`Received ${receivedCount}/${expectedCharacterChunks} chunks.`);
                showLoadingIndicator(`Загрузка персонажей... (${receivedCount}/${expectedCharacterChunks})`);

                if (receivedCount === expectedCharacterChunks) {
                    console.log("All character chunks received. Combining...");
                    characters = receivedCharacterChunks.flat();
                    console.log(`Total characters loaded: ${characters.length}`);
                    charactersLoaded = true;
                    renderCharacterList();
                    updateCharacterSelect();
                    // Выбираем персонажа, если он был запомнен
                    if (window.pendingSelectedCharacter) {
                        selectCharacterInUI(window.pendingSelectedCharacter);
                        window.pendingSelectedCharacter = null;
                    }
                    hideLoadingIndicator();
                    showNotification(`Загружено ${characters.length} персонажей.`, 'success');
                }
            } else {
                console.warn(`Received duplicate chunk index: ${parsedData.chunk_index}`);
            }
        } else {
            console.log("Message data is not the expected initial state or chunk.");
        }

    } catch (e) {
        console.error("Error processing message from bot:", e);
        console.error("Original data string:", messageData);
    }
}

// Обработка полных данных
function processInitialData(data) {
    if (data.settings) {
        console.log("Loading settings from initial data");
        updateUIWithSettings(data.settings);
        settingsLoaded = true;
    } else {
        console.warn("No settings found in initial data.");
        settingsLoaded = true;
    }

    if (data.characters && Array.isArray(data.characters)) {
        console.log(`Loading ${data.characters.length} characters from initial data`);
        characters = data.characters;
        charactersLoaded = true;
        renderCharacterList();
        updateCharacterSelect();
    } else {
        console.warn("No characters array found in initial data.");
        characters = [];
        charactersLoaded = true;
        renderCharacterList();
        updateCharacterSelect();
    }

    if (data.current_character) {
        console.log("Selecting current character:", data.current_character);
        selectCharacterInUI(data.current_character);
    } else {
        console.log("No current character specified in initial data.");
        // Выбираем первого персонажа в списке, если он есть
        const characterSelect = document.getElementById('character');
        if (characterSelect.options.length > 0) {
            characterSelect.selectedIndex = 0;
        }
    }
    showNotification('Настройки и персонажи успешно загружены!', 'success');
}

// Обновление UI данными из настроек
function updateUIWithSettings(settings) {
    console.log("Updating UI with settings:", settings);
    if (!settings) {
        console.warn("updateUIWithSettings called with null or undefined settings.");
        return;
    }

    // Модель
    const modelSelect = document.getElementById('model');
    if (settings.model_name && modelSelect) {
        // Проверяем, существует ли такая опция
        let modelOption = Array.from(modelSelect.options).find(opt => opt.value === settings.model_name);
        if (modelOption) {
            console.log(`Model option found: ${settings.model_name}`);
            modelSelect.value = settings.model_name;
        } else {
            // Если нет, добавляем новую опцию
            console.log(`Adding new model option from settings: ${settings.model_name}`);
            const option = document.createElement('option');
            option.value = settings.model_name;
            option.textContent = typeof getModelDisplayName === 'function'
                ? getModelDisplayName(settings.model_name)
                : settings.model_name;
            modelSelect.appendChild(option);
            modelSelect.value = settings.model_name;
        }
    } else if (modelSelect && modelSelect.options.length > 0) {
        // Если имя модели не пришло, но опции есть, выбираем первую
        modelSelect.selectedIndex = 0;
    }

    // Параметры модели
    const tempSlider = document.getElementById('temperature');
    if (settings.temperature !== undefined && tempSlider) {
        tempSlider.value = settings.temperature;
        document.getElementById('temp_value').textContent = settings.temperature.toFixed(2);
    }
    
    const topPSlider = document.getElementById('top_p');
    if (settings.top_p !== undefined && topPSlider) {
        topPSlider.value = settings.top_p;
        document.getElementById('top_p_value').textContent = settings.top_p.toFixed(2);
    }
    
    const topKSlider = document.getElementById('top_k');
    if (settings.top_k !== undefined && topKSlider) {
        topKSlider.value = settings.top_k;
        document.getElementById('top_k_value').textContent = settings.top_k;
    }

    // Настройки ответов
    const streamingModeCheckbox = document.getElementById('streaming_mode');
    if (settings.streaming_mode !== undefined && streamingModeCheckbox) {
        streamingModeCheckbox.checked = settings.streaming_mode;
    }
    
    const streamingEditModeCheckbox = document.getElementById('streaming_edit_mode');
    if (settings.streaming_edit_mode !== undefined && streamingEditModeCheckbox) {
        streamingEditModeCheckbox.checked = settings.streaming_edit_mode;
    }
    
    const intervalSlider = document.getElementById('streaming_edit_interval');
    if (settings.streaming_edit_interval !== undefined && intervalSlider) {
        intervalSlider.value = settings.streaming_edit_interval;
        document.getElementById('streaming_interval_value').textContent = settings.streaming_edit_interval.toFixed(1);
    }
    
    const messageButtonsCheckbox = document.getElementById('enable_message_buttons');
    if (settings.enable_message_buttons !== undefined && messageButtonsCheckbox) {
        messageButtonsCheckbox.checked = settings.enable_message_buttons;
    }
    
    const imageGenCheckbox = document.getElementById('enable_image_generation');
    if (settings.enable_image_generation !== undefined && imageGenCheckbox) {
        imageGenCheckbox.checked = settings.enable_image_generation;
    }

    // Обновляем зависимости между элементами интерфейса
    if (typeof updateStreamingEditVisibility === 'function') {
        updateStreamingEditVisibility();
    } else {
        console.warn("updateStreamingEditVisibility function not found.");
    }
}

// Выбор персонажа в UI
function selectCharacterInUI(characterToSelect) {
    console.log("Attempting to select character in UI:", characterToSelect);
    if (!characterToSelect || !characterToSelect.name) {
        console.warn("Invalid character data passed to selectCharacterInUI");
        return;
    }
    const characterSelect = document.getElementById('character');
    let found = false;
    Array.from(characterSelect.options).forEach(option => {
        try {
            const optionData = JSON.parse(option.value || '{}');
            // Сравниваем имя и флаг user_created
            if (optionData.name === characterToSelect.name &&
                optionData.user_created === characterToSelect.user_created) {
                console.log(`Character option found and selected: ${characterToSelect.name} (user_created: ${characterToSelect.user_created})`);
                option.selected = true;
                found = true;
            }
        } catch (e) {
            console.error("Error parsing character option value:", option.value, e);
        }
    });

    if (!found) {
        console.warn(`Character specified by bot was not found in the dropdown:`, characterToSelect);
        // Выбираем первую опцию, если не нашли нужную
        if (characterSelect.options.length > 0) {
            characterSelect.selectedIndex = 0;
        }
    }

    // Также обновляем выделение в списке на вкладке "Персонажи"
    document.querySelectorAll('.character-item').forEach(item => {
        const button = item.querySelector('.select-character');
        if (button && button.dataset.name === characterToSelect.name && (button.dataset.userCreated === String(characterToSelect.user_created))) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// Отправка настроек боту
function saveSettings() {
    console.log("Saving settings...");
    const characterValue = document.getElementById('character').value;
    let selectedCharacter = null;
    
    if (characterValue) {
        try {
            selectedCharacter = JSON.parse(characterValue);
            console.log("Selected character:", selectedCharacter);
        } catch (e) {
            console.error("Error parsing character value:", e);
            showNotification('Ошибка при обработке данных персонажа', 'error', 5000);
            return;
        }
    }
    
    // Собираем настройки
    const settingsPayload = {
        // Отправляем выбранного персонажа
        character: selectedCharacter,
        // Отправляем настройки модели
        model_name: document.getElementById('model').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        top_p: parseFloat(document.getElementById('top_p').value),
        top_k: parseInt(document.getElementById('top_k').value),
        // Отправляем настройки ответов
        streaming_mode: document.getElementById('streaming_mode').checked,
        streaming_edit_mode: document.getElementById('streaming_edit_mode').checked,
        streaming_edit_interval: parseFloat(document.getElementById('streaming_edit_interval').value),
        enable_message_buttons: document.getElementById('enable_message_buttons').checked,
        enable_image_generation: document.getElementById('enable_image_generation').checked,
        
        // Отправляем ТОЛЬКО пользовательских персонажей
        characters: characters.filter(c => c.user_created === true)
    };
    
    console.log("Collected settings to send:", settingsPayload);
    
    try {
        const settingsJson = JSON.stringify(settingsPayload);
        console.log("Settings JSON size:", settingsJson.length, "bytes");
        
        showNotification('Сохранение настроек...', 'info');
        
        // Устанавливаем флаг для отслеживания успешной отправки
        window.settingsSent = false;
        
        // Отправка данных обратно в Telegram через sendData
        console.log("Sending data to Telegram using Telegram.WebApp.sendData()");
        window.Telegram.WebApp.sendData(settingsJson);
        console.log("Data sent successfully via sendData");
        window.settingsSent = true;
        
    } catch (e) {
        console.error("Error sending data:", e);
        showNotification('Ошибка отправки данных: ' + e.message, 'error', 5000);
    }
}

// Вспомогательная функция для уведомлений
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, duration);
}

// Обновление функции updateStreamingEditVisibility
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

// Добавляем обработчик событий для проверки статуса отправки при закрытии
window.addEventListener('beforeunload', function(e) {
    if (!window.settingsSent) {
        console.log("WebApp is closing but settings were not sent!");
    }
});