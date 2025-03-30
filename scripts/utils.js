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

// Функция для проверки и безопасного преобразования объекта в JSON
function safeStringify(obj) {
    try {
        // Проверяем, что действие задано
        if (!obj.action) {
            console.error("Missing 'action' field in object to stringify");
            return null;
        }
        
        // Преобразуем в JSON
        const jsonString = JSON.stringify(obj);
        
        // Проверяем размер JSON
        console.log(`JSON size for action '${obj.action}': ${jsonString.length} bytes`);
        
        // Логируем первые 200 символов для отладки
        console.log(`JSON preview: ${jsonString.substring(0, 200)}${jsonString.length > 200 ? '...' : ''}`);
        
        return jsonString;
    } catch (e) {
        console.error("Error serializing object to JSON:", e);
        console.error("Object:", obj);
        return null;
    }
}