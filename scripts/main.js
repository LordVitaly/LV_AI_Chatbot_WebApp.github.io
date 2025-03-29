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

// Инициализация функций при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing WebApp UI");
    
    // Инициализация вкладок
    initTabs();
    
    // Обработчики слайдеров
    initSliders();
    
    // Загрузка данных и первоначальная настройка
    loadInitialData();
    
    // Обработчик кнопки сохранения
    document.getElementById('save_button').addEventListener('click', saveSettings);
    console.log("Save button handler registered");
    
    // Настраиваем обработчик событий для получения данных от Telegram
    tg.onEvent('viewportChanged', handleViewportChanged);
    
    // Регистрируем обработчик для событий BackButton
    tg.BackButton.onClick(handleBackButton);
    
    // Логируем состояние WebApp
    console.log("WebApp initialization completed");
    console.log("isExpanded:", tg.isExpanded);
    console.log("colorScheme:", tg.colorScheme);
});

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
            
            // Если выбрана вкладка персонажей, проверяем нужно ли загрузить персонажей
            if (tabId === 'characters' && !charactersLoaded) {
                loadCharacters();
            }
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

// Загрузка списка персонажей
function loadCharacters() {
    console.log("Loading characters...");
    
    // Отображаем персонажей, которые есть в глобальном массиве
    if (characters.length === 0) {
        console.log("No characters available yet");
        const characterListElement = document.getElementById('character-list');
        if (characterListElement) {
            characterListElement.innerHTML = '<div class="character-item loading">Загрузка персонажей... Пожалуйста, проверьте, есть ли кнопки загрузки в чате.</div>';
        }
    } else {
        console.log(`Rendering ${characters.length} characters`);
        renderCharacterList();
        charactersLoaded = true;
    }
    
    // Уведомляем пользователя, если персонажи не были загружены
    if (characters.length === 0) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = 'Для загрузки персонажей, вернитесь в чат Telegram и нажмите на кнопку "Загрузить персонажей"';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 5000);
    }
}

// Получаем текущие настройки и список персонажей
function loadInitialData() {
    console.log("Loading initial data");
    try {
        // Если есть параметр startapp или start, разбираем JSON из него
        let initialData = null;
        
        if (tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
            console.log("Start parameter found:", tg.initDataUnsafe.start_param);
            try {
                initialData = JSON.parse(tg.initDataUnsafe.start_param);
                console.log("Parsed initial data from start_param:", initialData);
            } catch (e) {
                console.error("Error parsing start_param:", e);
            }
        } 
        
        // Попробуем получить данные из URL параметра start
        if (!initialData) {
            const urlParams = new URLSearchParams(window.location.search);
            const startParam = urlParams.get('start');
            if (startParam) {
                console.log("Start parameter found in URL:", startParam);
                try {
                    initialData = JSON.parse(startParam);
                    console.log("Parsed initial data from URL:", initialData);
                } catch (e) {
                    console.error("Error parsing URL start parameter:", e);
                }
            }
        }
        
        if (initialData) {
            // Заполняем данные о персонажах, если они есть
            if (initialData.characters && initialData.characters.length > 0) {
                console.log(`Loading ${initialData.characters.length} characters from initial data`);
                characters = initialData.characters;
                charactersLoaded = true;
            }
            
            // Заполняем настройки модели
            if (initialData.settings) {
                console.log("Loading settings from initial data");
                updateUIWithSettings(initialData.settings);
                settingsLoaded = true;
            }
            
            // Если есть текущий персонаж, выбираем его
            if (initialData.current_character) {
                console.log("Current character found:", initialData.current_character);
                const currentCharacter = initialData.current_character;
                
                // Если персонажа нет в списке, добавляем его
                if (!characters.some(c => c.name === currentCharacter.name && c.user_created === currentCharacter.user_created)) {
                    console.log("Adding current character to the list");
                    characters.push({
                        name: currentCharacter.name,
                        user_created: currentCharacter.user_created,
                        description: "",
                        greeting: "Привет!"
                    });
                }
                
                // Выбираем персонажа в UI
                selectCharacterInUI(currentCharacter);
            }
            
            // Регистрируем обработчик MainButton
            if (initialData.load_characters) {
                console.log("Setting up MainButton for character loading");
                tg.MainButton.text = "Загрузить персонажей";
                tg.MainButton.isVisible = true;
                tg.MainButton.onClick(function() {
                    console.log("MainButton clicked, sending load_characters request");
                    tg.sendData(JSON.stringify({action: "load_characters"}));
                });
            }
        } else {
            console.log("No initial data found, using default settings");
            
            // Показываем уведомление
            if (!settingsLoaded) {
                const notification = document.createElement('div');
                notification.className = 'notification';
                notification.textContent = 'Не удалось загрузить настройки. Используются значения по умолчанию.';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 3000);
            }
        }
        
        // Регистрируем обработчик сообщений от бота через WebApp
        console.log("Registering message event handler");
        tg.onEvent('message', handleBotMessage);
        
        // Обновляем интерфейс с полученными данными
        renderCharacterList();
        updateCharacterSelect();
    } catch (e) {
        console.error("Error loading initial data:", e);
        
        // Показываем уведомление об ошибке
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = 'Ошибка при загрузке начальных данных. Пожалуйста, попробуйте позже.';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 5000);
    }
}

// Обработчик сообщений от бота
function handleBotMessage(message) {
    console.log("Received message from bot:", message);
    
    // Try to parse the message as JSON
    try {
        let data;
        
        // Check if this is a callback message with characters data
        if (message.webAppData) {
            console.log("Message contains webAppData");
            data = JSON.parse(message.webAppData.data);
        }
        // Or if it's a normal message with characters data
        else if (typeof message === 'string') {
            console.log("Message is a string, trying to parse as JSON");
            data = JSON.parse(message);
        }
        // Or if it's already an object
        else if (typeof message === 'object') {
            console.log("Message is an object");
            data = message;
        }
        
        console.log("Parsed message data:", data);
        
        // Process characters data if available
        if (data && data.action === "characters_chunk") {
            console.log(`Processing characters chunk ${data.chunk_index + 1}/${data.total_chunks}`);
            processCharactersChunk(data);
        }
        
        // Process settings data if available
        if (data && data.action === "settings_update") {
            console.log("Processing settings update");
            if (data.settings) {
                updateUIWithSettings(data.settings);
                settingsLoaded = true;
            }
        }
    } catch (e) {
        console.error("Error processing message:", e);
    }
}

// Process a chunk of characters data
function processCharactersChunk(data) {
    if (data.characters && Array.isArray(data.characters)) {
        console.log(`Processing ${data.characters.length} characters in chunk ${data.chunk_index + 1}/${data.total_chunks}`);
        
        // Add these characters to our global array
        characters = [...characters, ...data.characters];
        console.log(`Total characters after adding chunk: ${characters.length}`);
        
        // Update the UI
        renderCharacterList();
        updateCharacterSelect();
        
        // Show notification
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = `Загружено ${data.characters.length} персонажей (часть ${data.chunk_index + 1}/${data.total_chunks})`;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 3000);
        
        // Set the flag to indicate characters are loaded
        charactersLoaded = true;
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
            
            // Показываем уведомление об ошибке
            const notification = document.createElement('div');
            notification.className = 'notification';
            notification.textContent = 'Ошибка при обработке данных персонажа';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 5000);
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
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = 'Отправка настроек...';
        document.body.appendChild(notification);
        
        // Устанавливаем флаг для отслеживания успешной отправки
        window.settingsSent = false;
        
        // Отправка данных обратно в Telegram через sendData
        console.log("Sending data to Telegram using Telegram.WebApp.sendData()");
        window.Telegram.WebApp.sendData(settingsJson);
        console.log("Data sent successfully via sendData");
        window.settingsSent = true;
        
        // Обновляем уведомление об успешной отправке
        notification.textContent = 'Настройки обновлены! Пожалуйста, дождитесь подтверждения.';
        notification.className = 'notification success';
        
        // WebApp автоматически закроется после вызова sendData()
        
    } catch (e) {
        console.error("Error sending data:", e);
        
        // Показываем уведомление об ошибке
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = 'Ошибка отправки данных: ' + e.message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 5000);
    }
}

// Добавляем обработчик событий для проверки статуса отправки при закрытии
window.addEventListener('beforeunload', function(e) {
    if (!window.settingsSent) {
        console.log("WebApp is closing but settings were not sent!");
        // Возможно, сохранить флаг в localStorage, чтобы показать сообщение при следующем открытии
    }
});