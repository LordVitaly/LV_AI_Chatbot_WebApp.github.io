from http.server import BaseHTTPRequestHandler
import json
import os
import re
from os.path import join as path_join
import urllib.parse

# Путь к директории для хранения данных
STORAGE_DIR = "/tmp/character_data"
os.makedirs(STORAGE_DIR, exist_ok=True)

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Извлекаем имя персонажа из URL
        name_pattern = re.compile(r'/api/get_character(?:\?name=([^&]+))?')
        match = name_pattern.match(self.path)
        
        if not match or not match.group(1):
            # Если имя не найдено в URL
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"error": "Character name not provided", "success": False})
            self.wfile.write(response.encode('utf-8'))
            return
        
        character_name = urllib.parse.unquote(match.group(1))
        
        try:
            # Поскольку мы не можем напрямую взаимодействовать с файловой системой бота,
            # мы проверяем, есть ли уже сохраненные данные о персонаже
            file_path = path_join(STORAGE_DIR, f"{character_name}.json")
            
            # Проверяем существование файла
            if os.path.exists(file_path):
                # Читаем данные из файла
                with open(file_path, 'r', encoding='utf-8') as f:
                    character_data = json.load(f)
                
                # Отправляем данные клиенту
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({"data": character_data, "success": True})
                self.wfile.write(response.encode('utf-8'))
            else:
                # Если данных нет, отправляем ошибку
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({
                    "error": f"Character '{character_name}' data not found", 
                    "success": False
                })
                self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            # Обработка ошибок
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"error": str(e), "success": False})
            self.wfile.write(response.encode('utf-8'))
    
    def do_POST(self):
        """Сохранение данных о персонаже"""
        # Получаем длину тела запроса
        content_length = int(self.headers['Content-Length'])
        
        # Читаем тело запроса
        post_data = self.rfile.read(content_length)
        
        try:
            # Парсим JSON
            data = json.loads(post_data.decode('utf-8'))
            
            if "name" not in data:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({"error": "Character name not provided", "success": False})
                self.wfile.write(response.encode('utf-8'))
                return
            
            character_name = data["name"]
            
            # Сохраняем данные персонажа
            file_path = path_join(STORAGE_DIR, f"{character_name}.json")
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False)
            
            # Отправляем подтверждение клиенту
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"success": True})
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
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()