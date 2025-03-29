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
});

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
            if (tabId === 'characters' && characters.length === 0) {
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
    renderCharacterList();
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
        }
        
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
    
    // Отправка данных обратно в Telegram
    tg.sendData(JSON.stringify(settings));
    tg.close();
}