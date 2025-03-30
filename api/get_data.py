from http.server import BaseHTTPRequestHandler
import json
import os
from os.path import join as path_join
import re

# Путь к директории для хранения данных
STORAGE_DIR = "/tmp/data_storage"
os.makedirs(STORAGE_DIR, exist_ok=True)

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Извлекаем ID данных из URL
        id_pattern = re.compile(r'/api/get_data/([a-zA-Z0-9\-]+)')
        match = id_pattern.match(self.path)
        
        if not match:
            # Если ID не найден в URL
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"error": "Data ID not provided", "success": False})
            self.wfile.write(response.encode('utf-8'))
            return
        
        data_id = match.group(1)
        
        try:
            # Путь к файлу данных
            file_path = path_join(STORAGE_DIR, f"{data_id}.json")
            
            # Проверяем существование файла
            if not os.path.exists(file_path):
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({"error": f"Data with ID {data_id} not found", "success": False})
                self.wfile.write(response.encode('utf-8'))
                return
            
            # Читаем данные из файла
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Отправляем данные клиенту
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"data": data, "success": True})
            self.wfile.write(response.encode('utf-8'))
            
        except Exception as e:
            # Обработка ошибок
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"error": str(e), "success": False})
            self.wfile.write(response.encode('utf-8'))