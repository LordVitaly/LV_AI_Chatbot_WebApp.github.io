// Инициализация Telegram Mini App
let tg = window.Telegram.WebApp;
tg.expand();

// Глобальные переменные для работы с персонажами
let currentEditingCharacter = null;
let characters = [];

// Константы для валидации
const CHARACTER_NAME_LIMIT = 50;
const CHARACTER_DESCRIPTION_LIMIT = 1000;
const CHARACTER_GREETING_LIMIT = 500;

// Флаг загрузки персонажей
let charactersLoaded = false;

// Инициализация функций при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация вкладок
    initTabs();
    
    // Обработчики слайдеров
    initSliders();
    
    // Загрузка данных и первоначальная настройка
    loadInitialData();
    
    // Обработчик кнопки сохранения
    document.getElementById('save_button').addEventListener('click', saveSettings);
    
    // Настраиваем обработчик событий для получения данных от Telegram
    tg.onEvent('viewportChanged', handleViewportChanged);
});

// Обработчик изменения области просмотра (для мобильных устройств)
function handleViewportChanged(event) {
    // Может потребоваться для обновления UI при изменении размера экрана
    console.log('Viewport changed:', event);
}

// Инициализация системы вкладок
function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
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
    // Отображаем персонажей, которые есть в глобальном массиве
    if (characters.length === 0) {
        const characterListElement = document.getElementById('character-list');
        if (characterListElement) {
            characterListElement.innerHTML = '<div class="character-item loading">Загрузка персонажей... Пожалуйста, проверьте, есть ли кнопки загрузки в чате.</div>';
        }
    } else {
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
    try {
        // Если есть параметр startapp, разбираем JSON из него
        if (tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
            const initialData = JSON.parse(tg.initDataUnsafe.start_param);
            
            // Заполняем данные о персонажах, если они есть
            if (initialData.characters) {
                characters = initialData.characters;
                charactersLoaded = true;
            }
            
            // Заполняем настройки модели
            if (initialData.settings) {
                const settings = initialData.settings;
                
                updateUIWithSettings(settings);
            }
            
            // Если есть текущий персонаж, выбираем его
            if (initialData.current_character) {
                const currentCharacter = initialData.current_character;
                
                // Если персонажа нет в списке, добавляем его
                if (!characters.some(c => c.name === currentCharacter.name && c.user_created === currentCharacter.user_created)) {
                    characters.push({
                        name: currentCharacter.name,
                        user_created: currentCharacter.user_created,
                        description: "",
                        greeting: "Привет!"
                    });
                }
            }
            
            // Регистрируем обработчик MainButton
            if (initialData.load_characters) {
                tg.MainButton.text = "Загрузить персонажей";
                tg.MainButton.isVisible = true;
                tg.MainButton.onClick(function() {
                    tg.sendData(JSON.stringify({action: "load_characters"}));
                });
            }
        }
        
        // Регистрируем обработчик сообщений от бота через WebApp
        tg.onEvent('message', handleBotMessage);
        
        // Обновляем интерфейс с полученными данными
        renderCharacterList();
        updateCharacterSelect();
        
        // Выбираем текущего персонажа если есть
        if (tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
            const initialData = JSON.parse(tg.initDataUnsafe.start_param);
            if (initialData.current_character) {
                const currentCharacter = initialData.current_character;
                selectCharacterInUI(currentCharacter);
            }
        }
    } catch (e) {
        console.error("Ошибка при загрузке начальных данных:", e);
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
            data = JSON.parse(message.webAppData.data);
        }
        // Or if it's a normal message with characters data
        else if (typeof message === 'string') {
            data = JSON.parse(message);
        }
        // Or if it's already an object
        else if (typeof message === 'object') {
            data = message;
        }
        
        // Process characters data if available
        if (data && data.action === "characters_chunk") {
            processCharactersChunk(data);
        }
    } catch (e) {
        console.error("Error processing message:", e);
    }
}

// Process a chunk of characters data
function processCharactersChunk(data) {
    if (data.characters && Array.isArray(data.characters)) {
        // Add these characters to our global array
        characters = [...characters, ...data.characters];
        
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
    // Модель
    if (settings.model_name) {
        const modelSelect = document.getElementById('model');
        // Проверяем, существует ли такая опция
        const modelOption = Array.from(modelSelect.options).find(opt => opt.value === settings.model_name);
        if (modelOption) {
            modelSelect.value = settings.model_name;
        } else {
            // Если нет, добавляем новую опцию
            const option = document.createElement('option');
            option.value = settings.model_name;
            option.textContent = settings.model_name;
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
}

// Выбор персонажа в UI
function selectCharacterInUI(character) {
    const characterSelect = document.getElementById('character');
    Array.from(characterSelect.options).forEach(option => {
        try {
            const optionData = JSON.parse(option.value || '{}');
            if (optionData.name === character.name && 
                optionData.user_created === character.user_created) {
                option.selected = true;
            }
        } catch (e) {}
    });
}

// Отправка настроек боту
function saveSettings() {
    const characterValue = document.getElementById('character').value;
    let character = null;
    
    if (characterValue) {
        try {
            character = JSON.parse(characterValue);
        } catch (e) {
            console.error("Ошибка при разборе значения персонажа:", e);
            
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
    
    // Добавляем созданных/измененных пользовательских персонажей
    const userCreatedCharacters = characters.filter(c => c.user_created);
    if (userCreatedCharacters.length > 0) {
        settings.characters = userCreatedCharacters;
    }
    
    try {
        const settingsJson = JSON.stringify(settings);
        console.log("Отправка настроек в Telegram:", settingsJson);
        
        // Показываем уведомление перед отправкой
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = 'Отправка настроек...';
        document.body.appendChild(notification);
        
        // Отправка данных обратно в Telegram
        tg.sendData(settingsJson);
        console.log("Данные успешно отправлены");
        
        // Обновляем уведомление об успешной отправке
        notification.textContent = 'Настройки отправлены! Пожалуйста, дождитесь подтверждения.';
        notification.className = 'notification success';
        
        // Увеличенная задержка перед закрытием, чтобы данные успели обработаться
        setTimeout(() => {
            console.log("Closing webapp after delay");
            tg.close();
        }, 5000);  // Increase to 5 seconds for better reliability
    } catch (e) {
        console.error("Ошибка отправки данных:", e);
        
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