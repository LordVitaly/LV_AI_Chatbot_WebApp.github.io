from http.server import BaseHTTPRequestHandler
import json
import os
import time
from os.path import join as path_join

# Путь к директории для хранения данных
STORAGE_DIR = "/tmp/settings_data"
os.makedirs(STORAGE_DIR, exist_ok=True)

# Значения по умолчанию
DEFAULT_SETTINGS = {
    "model_name": "gemini-2.0-flash",
    "temperature": 0.85,
    "top_p": 0.95,
    "top_k": 1,
    "streaming_mode": True,
    "streaming_edit_mode": True,
    "streaming_edit_interval": 2.0,
    "enable_message_buttons": True,
    "enable_image_generation": True
}

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Получение настроек пользователя
        user_id = 'default'
        if '?' in self.path:
            query = self.path.split('?')[1]
            params = dict(param.split('=') for param in query.split('&') if '=' in param)
            user_id = params.get('user_id', 'default')
        
        self.log_message(f"GET request for settings with user_id: {user_id}")
        
        try:
            # Путь к файлу настроек
            file_path = path_join(STORAGE_DIR, f"settings_{user_id}.json")
            
            # Проверяем существование файла
            if os.path.exists(file_path):
                # Читаем настройки из файла
                with open(file_path, 'r', encoding='utf-8') as f:
                    settings = json.load(f)
                self.log_message(f"Loaded settings from file for user {user_id}")
            else:
                # Используем настройки по умолчанию
                settings = DEFAULT_SETTINGS
                self.log_message(f"Using default settings for user {user_id}")
            
            # Отправляем настройки клиенту
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"success": True, "data": settings})
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            self.log_error(f"Error handling GET request: {str(e)}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"error": str(e), "success": False})
            self.wfile.write(response.encode('utf-8'))
    
    def do_POST(self):
        # Сохранение настроек пользователя
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        
        user_id = 'default'
        if '?' in self.path:
            query = self.path.split('?')[1]
            params = dict(param.split('=') for param in query.split('&') if '=' in param)
            user_id = params.get('user_id', 'default')
        
        self.log_message(f"POST request for settings with user_id: {user_id}")
        
        try:
            # Парсим JSON
            settings = json.loads(post_data.decode('utf-8'))
            
            # Проверяем обязательные поля
            required_fields = ['model_name', 'temperature', 'top_p', 'top_k']
            for field in required_fields:
                if field not in settings:
                    raise ValueError(f"Missing required field: {field}")
            
            # Нормализуем типы данных
            if 'temperature' in settings:
                settings['temperature'] = float(settings['temperature'])
            if 'top_p' in settings:
                settings['top_p'] = float(settings['top_p'])
            if 'top_k' in settings:
                settings['top_k'] = int(settings['top_k'])
            if 'streaming_edit_interval' in settings:
                settings['streaming_edit_interval'] = float(settings['streaming_edit_interval'])
            
            # Обрабатываем булевы значения
            bool_fields = ['streaming_mode', 'streaming_edit_mode', 'enable_message_buttons', 'enable_image_generation']
            for field in bool_fields:
                if field in settings:
                    if isinstance(settings[field], str):
                        settings[field] = settings[field].lower() in ('true', 'yes', '1')
            
            # Добавляем метаданные
            settings["updated_at"] = int(time.time())
            settings["user_id"] = user_id
            
            # Сохраняем настройки во временном хранилище
            file_path = path_join(STORAGE_DIR, f"settings_{user_id}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(settings, f, ensure_ascii=False)
            
            self.log_message(f"Settings saved for user {user_id}")
            
            # Отправляем подтверждение клиенту
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"success": True})
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            self.log_error(f"Error handling POST request: {str(e)}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"error": str(e), "success": False})
            self.wfile.write(response.encode('utf-8'))
    
    def do_OPTIONS(self):
        # Настройка CORS для предварительных запросов
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()