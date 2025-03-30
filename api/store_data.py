from http.server import BaseHTTPRequestHandler
import json
import uuid
import os
from os.path import join as path_join

# Путь к директории для хранения данных
STORAGE_DIR = "/tmp/data_storage"
os.makedirs(STORAGE_DIR, exist_ok=True)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Получаем длину тела запроса
        content_length = int(self.headers['Content-Length'])
        
        # Читаем тело запроса
        post_data = self.rfile.read(content_length)
        
        try:
            # Парсим JSON
            data = json.loads(post_data.decode('utf-8'))
            
            # Генерируем уникальный ID
            data_id = str(uuid.uuid4())
            
            # Сохраняем данные во временном хранилище
            file_path = path_join(STORAGE_DIR, f"{data_id}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False)
            
            # Отправляем ID назад клиенту
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            response = json.dumps({"id": data_id, "success": True})
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            # Обработка ошибок
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
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()