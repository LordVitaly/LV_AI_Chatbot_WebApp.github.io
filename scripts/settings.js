// Список доступных моделей
const AVAILABLE_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-thinking-exp-01-21",
    "gemini-2.5-pro-exp-03-25",
    "gemini-2.0-flash-exp"
];

// Инициализация вкладки настроек
function initSettingsTab() {
    console.log("Initializing settings tab");
    
    // Заполняем список моделей
    populateModelSelect();
    
    // Инициализация слайдеров и переключателей
    initSliderEvents();
}

// Заполнение выпадающего списка моделей
function populateModelSelect() {
    const modelSelect = document.getElementById('model');
    if (!modelSelect) return;
    
    // Сохраняем текущее значение
    const currentModel = modelSelect.value;
    
    // Очищаем текущие опции
    modelSelect.innerHTML = '';
    
    // Добавляем опции моделей
    AVAILABLE_MODELS.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = getModelDisplayName(model);
        modelSelect.appendChild(option);
    });
    
    // Восстанавливаем выбранное значение, если оно есть в списке
    if (currentModel && AVAILABLE_MODELS.includes(currentModel)) {
        modelSelect.value = currentModel;
    } else if (currentModel) {
        // Если модель не в списке, но была выбрана, добавляем её
        const customOption = document.createElement('option');
        customOption.value = currentModel;
        customOption.textContent = getModelDisplayName(currentModel);
        modelSelect.appendChild(customOption);
        modelSelect.value = currentModel;
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

// Инициализация событий для слайдеров и полей настроек
function initSliders() {
    console.log("Initializing slider events");
    
    // Температура
    const temperatureSlider = document.getElementById('temperature');
    const tempValueSpan = document.getElementById('temp_value');
    
    if (temperatureSlider && tempValueSpan) {
        temperatureSlider.addEventListener('input', function() {
            tempValueSpan.textContent = this.value;
        });
    }
    
    // Top-P
    const topPSlider = document.getElementById('top_p');
    const topPValueSpan = document.getElementById('top_p_value');
    
    if (topPSlider && topPValueSpan) {
        topPSlider.addEventListener('input', function() {
            topPValueSpan.textContent = this.value;
        });
    }
    
    // Top-K
    const topKSlider = document.getElementById('top_k');
    const topKValueSpan = document.getElementById('top_k_value');
    
    if (topKSlider && topKValueSpan) {
        topKSlider.addEventListener('input', function() {
            topKValueSpan.textContent = this.value;
        });
    }
    
    // Интервал обновления при потоковом режиме
    const intervalSlider = document.getElementById('streaming_edit_interval');
    const intervalValueSpan = document.getElementById('streaming_interval_value');
    
    if (intervalSlider && intervalValueSpan) {
        intervalSlider.addEventListener('input', function() {
            intervalValueSpan.textContent = this.value;
        });
    }
}

// Инициализация событий для слайдеров и полей настроек
function initSliderEvents() {
    // Инициализируем основные слайдеры
    initSliders();
    
    // Зависимости между переключателями
    const streamingModeCheckbox = document.getElementById('streaming_mode');
    const streamingEditModeCheckbox = document.getElementById('streaming_edit_mode');
    const streamingIntervalContainer = document.getElementById('streaming_edit_interval').closest('.field');
    
    if (streamingModeCheckbox && streamingEditModeCheckbox && streamingIntervalContainer) {
        // Первоначальное состояние
        updateStreamingEditVisibility();
        
        // Обработчик изменения режима потоковой передачи
        streamingModeCheckbox.addEventListener('change', updateStreamingEditVisibility);
        
        // Обработчик изменения режима редактирования при потоковой передаче
        streamingEditModeCheckbox.addEventListener('change', updateStreamingEditVisibility);
    }
}

// Функция обновления видимости настроек редактирования при потоковой передаче
function updateStreamingEditVisibility() {
    const streamingModeCheckbox = document.getElementById('streaming_mode');
    const streamingEditModeCheckbox = document.getElementById('streaming_edit_mode');
    const streamingIntervalContainer = document.getElementById('streaming_edit_interval').closest('.field');
    
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