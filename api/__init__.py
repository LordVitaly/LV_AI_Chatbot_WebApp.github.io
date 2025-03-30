from http.server import BaseHTTPRequestHandler
import json
import os
import uuid
import time
from os.path import join as path_join

# Путь к директории для хранения сессионных данных
STORAGE_DIR = "/tmp/init_data"
os.makedirs(STORAGE_DIR, exist_ok=True)

# Время жизни данных (в секундах)
DATA_TTL = 3600  # 1 час

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path.startswith('/api/init'):
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # Парсим данные запроса
                data = json.loads(post_data.decode('utf-8'))
                
                # Добавляем информацию о времени создания и истечения срока
                data["created_at"] = int(time.time())
                data["expires_at"] = int(time.time()) + DATA_TTL
                
                # Генерируем уникальную сессию
                session_id = str(uuid.uuid4())
                
                # Очищаем старые данные
                self._cleanup_old_data()
                
                # Сохраняем данные во временном хранилище
                file_path = path_join(STORAGE_DIR, f"{session_id}.json")
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False)
                
                # Отправляем ID сессии
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({"success": True, "session_id": session_id})
                self.wfile.write(response.encode('utf-8'))
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({"error": str(e), "success": False})
                self.wfile.write(response.encode('utf-8'))
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"error": "Endpoint not found", "success": False})
            self.wfile.write(response.encode('utf-8'))
    
    def do_GET(self):
        # Получение начальных данных по ID сессии
        import re
        
        pattern = re.compile(r'/api/init/([a-f0-9-]+)$')
        match = pattern.match(self.path)
        
        if match:
            session_id = match.group(1)
            self._handle_get_init_data(session_id)
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*') 
            self.end_headers()
            
            response = json.dumps({"error": "Invalid session ID", "success": False})
            self.wfile.write(response.encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*') 
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def _handle_get_init_data(self, session_id):
        try:
            file_path = path_join(STORAGE_DIR, f"{session_id}.json")
            
            if not os.path.exists(file_path):
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({"error": "Session not found", "success": False})
                self.wfile.write(response.encode('utf-8'))
                return
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Проверка срока действия
            current_time = int(time.time())
            if current_time > data.get("expires_at", 0):
                # Удаляем просроченный файл
                os.remove(file_path)
                
                self.send_response(410)  # Gone
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({"error": "Session expired", "success": False})
                self.wfile.write(response.encode('utf-8'))
                return
            
            # Отправляем данные клиенту
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"success": True, "data": data})
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"error": str(e), "success": False})
            self.wfile.write(response.encode('utf-8'))
    
    def _cleanup_old_data(self):
        try:
            current_time = int(time.time())
            
            for filename in os.listdir(STORAGE_DIR):
                if not filename.endswith('.json'):
                    continue
                
                file_path = path_join(STORAGE_DIR, filename)
                
                try:
                    # Проверяем метаданные в файле
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    # Если срок действия истек, удаляем файл
                    if current_time > data.get("expires_at", 0):
                        os.remove(file_path)
                        
                except Exception:
                    # Если произошла ошибка при чтении файла,
                    # проверяем время создания файла и удаляем, если он старше TTL
                    try:
                        file_stat = os.stat(file_path)
                        if current_time - file_stat.st_mtime > DATA_TTL:
                            os.remove(file_path)
                    except Exception:
                        pass
                        
        except Exception:
            # Игнорируем ошибки в процессе очистки
            pass