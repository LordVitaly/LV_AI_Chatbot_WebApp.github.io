// Инициализация Telegram Mini App
let tg = window.Telegram.WebApp;
tg.expand();

// Добавим debug-логирование
console.log("WebApp initializing. SDK version:", tg.version);
console.log("Initial launch parameters:", tg.initDataUnsafe);

// Глобальные переменные
let characterNames = []; // Имена персонажей
let isEditingCharacter = false;
let currentEditingCharacter = null;
let currentUserId = 'default';

// Константы для валидации
const CHARACTER_NAME_LIMIT = 50;
const CHARACTER_DESCRIPTION_LIMIT = 1000;
const CHARACTER_GREETING_LIMIT = 500;

// API URL
const API_BASE_URL = "/api";

// Инициализация функций при загрузке документа
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing WebApp UI");
    
    // Показываем индикатор загрузки 
    showLoadingIndicator("Инициализация интерфейса...");
    
    // Инициализация вкладок
    initTabs();
    
    // Инициализация компонентов
    initComponents();
    
    // Настраиваем обработчик событий для получения данных от Telegram
    tg.onEvent('viewportChanged', handleViewportChanged);
    
    // Регистрируем обработчик для событий BackButton
    tg.BackButton.onClick(handleBackButton);
    
    // Параметры из URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('user_id')) {
        currentUserId = urlParams.get('user_id');
        console.log("User ID from URL:", currentUserId);
    }
    
    // Запрашиваем персонажей через API
    fetchCharacterList();
});

// Инициализация всех компонентов интерфейса
function initComponents() {
    console.log("Initializing components");
    
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

// Запрос списка персонажей через API
async function fetchCharacterList() {
    console.log("Fetching character list from API");
    showLoadingIndicator("Запрос списка персонажей...");
    
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
        
        hideLoadingIndicator();
    } catch (e) {
        console.error("Error fetching character list:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при загрузке списка персонажей: ' + e.message, 'error');
        
        // Устанавливаем пустой список в случае ошибки
        characterNames = [];
        renderCharacterList();
        updateCharacterSelect();
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
        
    } catch (e) {
        console.error("Error fetching character details:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при загрузке данных персонажа: ' + e.message, 'error');
    }
}

// Обработка данных персонажа
function processCharacterDetails(data) {
    console.log("Processing character details:", data);
    hideLoadingIndicator();
    
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
                fetchCharacterDetails(characterName);
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

// Функция сохранения персонажа
async function saveCharacter() {
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
    
    console.log("Saving character:", characterData);
    showLoadingIndicator('Сохранение персонажа...');
    
    try {
        // Сохраняем персонажа через API
        const url = `${API_BASE_URL}/characters?user_id=${currentUserId}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(characterData)
        });
        
        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || "Unknown error");
        }
        
        console.log("Character saved successfully via API");
        
        // Отправляем данные в Telegram для обновления настроек бота
        const saveData = {
            action: 'save_character',
            editedCharacter: characterData
        };
        
        window.Telegram.WebApp.sendData(JSON.stringify(saveData));
        console.log("Character save request sent to Telegram");
        
        // Скрываем форму редактирования
        document.getElementById('character_edit').classList.remove('active');
        isEditingCharacter = false;
        currentEditingCharacter = null;
        
        // Скрываем кнопку "Назад"
        tg.BackButton.hide();
        
        // Обновляем список персонажей
        setTimeout(() => {
            hideLoadingIndicator();
            fetchCharacterList();
        }, 1000);
        
    } catch (e) {
        console.error("Error saving character:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при сохранении персонажа: ' + e.message, 'error');
    }
}

// Отправка настроек боту
async function saveSettings() {
    console.log("Saving settings...");
    showLoadingIndicator('Отправка настроек...');
    
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