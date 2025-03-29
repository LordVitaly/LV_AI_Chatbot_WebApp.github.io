// Список доступных моделей
const AVAILABLE_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-thinking-exp-01-21",
    "gemini-2.5-pro-exp-03-25"
];

// Инициализация вкладки настроек
document.addEventListener('DOMContentLoaded', function() {
    initSettingsTab();
});

// Инициализация компонентов вкладки настроек
function initSettingsTab() {
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
        "gemini-2.5-pro-exp-03-25": "Gemini 2.5 Pro"
    };
    
    return modelDisplayNames[modelName] || modelName;
}

// Инициализация событий для слайдеров и полей настроек
function initSliderEvents() {
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
    
    // Функция обновления видимости настроек редактирования при потоковой передаче
    function updateStreamingEditVisibility() {
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