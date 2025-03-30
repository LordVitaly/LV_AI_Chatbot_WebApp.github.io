// Функция для добавления элемента отображения debug-информации на страницу
function initDebugPanel() {
    // Проверяем, включен ли режим отладки (через URL параметр или localStorage)
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.get('debug') === 'true' || localStorage.getItem('debugMode') === 'true';
    
    if (!debugMode) {
        return;
    }
    
    console.log("Debug mode enabled");
    
    // Создаем панель отладки
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        max-height: 30vh;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        z-index: 10000;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    `;
    
    // Создаем заголовок панели
    const debugHeader = document.createElement('div');
    debugHeader.style.cssText = `
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
        border-bottom: 1px solid #555;
        padding-bottom: 5px;
    `;
    
    // Заголовок
    const debugTitle = document.createElement('span');
    debugTitle.innerText = 'Debug Panel';
    debugTitle.style.fontWeight = 'bold';
    
    // Кнопки управления
    const debugControls = document.createElement('div');
    
    // Кнопка очистки логов
    const clearButton = document.createElement('button');
    clearButton.innerText = 'Clear';
    clearButton.style.cssText = `
        background: none;
        border: 1px solid #ccc;
        color: white;
        padding: 2px 5px;
        margin-right: 5px;
        cursor: pointer;
        font-size: 10px;
    `;
    clearButton.onclick = () => {
        const logsContainer = document.getElementById('debug-logs');
        if (logsContainer) {
            logsContainer.innerHTML = '';
        }
    };
    
    // Кнопка закрытия панели
    const closeButton = document.createElement('button');
    closeButton.innerText = 'Close';
    closeButton.style.cssText = `
        background: none;
        border: 1px solid #ccc;
        color: white;
        padding: 2px 5px;
        cursor: pointer;
        font-size: 10px;
    `;
    closeButton.onclick = () => {
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
            debugPanel.remove();
            localStorage.setItem('debugMode', 'false');
        }
    };
    
    debugControls.appendChild(clearButton);
    debugControls.appendChild(closeButton);
    
    debugHeader.appendChild(debugTitle);
    debugHeader.appendChild(debugControls);
    
    // Контейнер для логов
    const logsContainer = document.createElement('div');
    logsContainer.id = 'debug-logs';
    logsContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    `;
    
    // Собираем панель
    debugPanel.appendChild(debugHeader);
    debugPanel.appendChild(logsContainer);
    
    // Добавляем на страницу
    document.body.appendChild(debugPanel);
    
    // Перехватываем стандартные методы консоли
    interceptConsole();
}

// Перехват методов консоли для отображения на debug-панели
function interceptConsole() {
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info
    };
    
    // Функция добавления записи в лог
    function addLogEntry(type, args) {
        const logsContainer = document.getElementById('debug-logs');
        if (!logsContainer) return;
        
        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            padding: 2px 5px;
            margin-bottom: 2px;
            border-left: 3px solid ${getColorForType(type)};
            word-break: break-all;
        `;
        
        // Время
        const timestamp = new Date().toTimeString().split(' ')[0];
        const timeSpan = document.createElement('span');
        timeSpan.innerText = `[${timestamp}] `;
        timeSpan.style.color = '#aaa';
        
        // Тип лога
        const typeSpan = document.createElement('span');
        typeSpan.innerText = `[${type}] `;
        typeSpan.style.color = getColorForType(type);
        
        // Содержимое
        const contentSpan = document.createElement('span');
        contentSpan.innerText = args.map(arg => {
            try {
                if (typeof arg === 'object') {
                    return JSON.stringify(arg);
                }
                return String(arg);
            } catch (e) {
                return String(arg);
            }
        }).join(' ');
        
        logEntry.appendChild(timeSpan);
        logEntry.appendChild(typeSpan);
        logEntry.appendChild(contentSpan);
        
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
    
    // Получение цвета в зависимости от типа сообщения
    function getColorForType(type) {
        switch (type) {
            case 'log': return '#ccc';
            case 'error': return '#f66';
            case 'warn': return '#fd7';
            case 'info': return '#6cf';
            default: return '#ccc';
        }
    }
    
    // Перехватываем методы консоли
    console.log = function() {
        addLogEntry('log', Array.from(arguments));
        originalConsole.log.apply(console, arguments);
    };
    
    console.error = function() {
        addLogEntry('error', Array.from(arguments));
        originalConsole.error.apply(console, arguments);
    };
    
    console.warn = function() {
        addLogEntry('warn', Array.from(arguments));
        originalConsole.warn.apply(console, arguments);
    };
    
    console.info = function() {
        addLogEntry('info', Array.from(arguments));
        originalConsole.info.apply(console, arguments);
    };
}

// Ждем загрузки DOM и инициализируем панель отладки
document.addEventListener('DOMContentLoaded', initDebugPanel);

// Функция для обработки и отображения ошибок JavaScript
function initGlobalErrorHandler() {
    window.addEventListener('error', function(event) {
        console.error('Uncaught error:', event.error.message);
        console.error('Stack trace:', event.error.stack);
        
        showErrorNotification(`JavaScript Error: ${event.error.message}`);
        
        return false;
    });
    
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        
        let message = 'Unknown error';
        if (event.reason) {
            message = event.reason.message || String(event.reason);
        }
        
        showErrorNotification(`Promise Error: ${message}`);
        
        return false;
    });
}

// Функция показа уведомления об ошибке
function showErrorNotification(message) {
    // Проверяем, есть ли функция showNotification из основного скрипта
    if (typeof showNotification === 'function') {
        showNotification(message, 'error', 5000);
    } else {
        // Если нет, создаем свое уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 30vh;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(220, 53, 69, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10001;
            max-width: 90%;
            text-align: center;
            font-family: sans-serif;
            font-size: 14px;
        `;
        notification.innerText = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Инициализируем обработчик ошибок
document.addEventListener('DOMContentLoaded', initGlobalErrorHandler);

// Включить режим отладки программно (для отладки)
function enableDebugMode() {
    localStorage.setItem('debugMode', 'true');
    window.location.reload();
}

// Отключить режим отладки программно
function disableDebugMode() {
    localStorage.setItem('debugMode', 'false');
    window.location.reload();
}