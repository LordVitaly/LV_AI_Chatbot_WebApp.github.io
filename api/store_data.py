from http.server import BaseHTTPRequestHandler
import json
import uuid
import os
import time
from os.path import join as path_join

# Путь к директории для хранения данных
STORAGE_DIR = "/tmp/data_storage"
os.makedirs(STORAGE_DIR, exist_ok=True)

# Время жизни данных (в секундах)
DATA_TTL = 3600  # 1 час

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Получаем длину тела запроса
        content_length = int(self.headers['Content-Length'])
        
        # Читаем тело запроса
        post_data = self.rfile.read(content_length)
        
        try:
            # Парсим JSON
            data = json.loads(post_data.decode('utf-8'))
            
            # Проверяем наличие meta-информации
            if "meta" not in data:
                data["meta"] = {}
            
            # Добавляем или обновляем время создания и истечения
            data["meta"]["created_at"] = int(time.time())
            data["meta"]["expires_at"] = int(time.time()) + DATA_TTL
            
            # Генерируем уникальный ID
            data_id = str(uuid.uuid4())
            
            # Очистка старых данных перед сохранением
            self._cleanup_old_data()
            
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
    
    def _cleanup_old_data(self):
        """Очистка устаревших данных"""
        try:
            current_time = int(time.time())
            for filename in os.listdir(STORAGE_DIR):
                if not filename.endswith('.json'):
                    continue
                    
                file_path = path_join(STORAGE_DIR, filename)
                
                try:
                    # Проверяем время создания файла
                    file_stat = os.stat(file_path)
                    file_age = current_time - file_stat.st_mtime
                    
                    # Если файл старше TTL, удаляем его
                    if file_age > DATA_TTL:
                        os.remove(file_path)
                        continue
                    
                    # Проверяем метаданные
                    with open(file_path, 'r', encoding='utf-8') as f:
                        try:
                            data = json.load(f)
                            if "meta" in data and "expires_at" in data["meta"]:
                                if current_time > data["meta"]["expires_at"]:
                                    os.remove(file_path)
                        except json.JSONDecodeError:
                            # Если файл содержит неверный JSON, удаляем его
                            os.remove(file_path)
                except Exception:
                    # Если произошла ошибка при обработке файла, просто продолжаем
                    continue
        except Exception:
            # Игнорируем ошибки при очистке, чтобы не блокировать основной функционал
            pass