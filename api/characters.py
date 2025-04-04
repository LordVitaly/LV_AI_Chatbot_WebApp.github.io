from http.server import BaseHTTPRequestHandler
import json
import os
import re
import time
from os.path import join as path_join
import urllib.parse

# Путь к директории для хранения данных персонажей
STORAGE_DIR = "/tmp/character_data"
os.makedirs(STORAGE_DIR, exist_ok=True)

# Для имитации базы данных персонажей, если не используем реальную БД
DEFAULT_CHARACTERS = [
    {"name": "AI_Assistant", "description": "Полезный AI ассистент", "greeting": "Привет! Я AI ассистент."},
    {"name": "Capitano", "description": "Капитан корабля", "greeting": "Приветствую на борту!"},
    {"name": "Дотторе", "description": "Умный доктор", "greeting": "Здравствуйте, чем могу помочь?"},
    {"name": "Роберт", "description": "Дружелюбный собеседник", "greeting": "Привет, я Роберт!"},
    {"name": "Цзин Юань", "description": "Мудрый советник", "greeting": "Приветствую, путник."}
]

class handler(BaseHTTPRequestHandler):
    def log_request(self, code='-', size='-'):
        self.log_message('"%s" %s %s',
                         self.requestline, str(code), str(size))

    def do_GET(self):
        self.log_message(f"Processing GET request: {self.path}")
        
        # Используем регулярное выражение для извлечения параметров из URL
        list_pattern = re.compile(r'/api/characters(?:\?user_id=([^&]+))?$')
        detail_pattern = re.compile(r'/api/characters/([^/]+)(?:\?user_id=([^&]+))?$')
        
        list_match = list_pattern.match(self.path)
        detail_match = detail_pattern.match(self.path)
        
        if list_match:
            # Запрос на получение списка персонажей
            user_id = list_match.group(1) or 'default'
            self.log_message(f"Character list request for user_id: {user_id}")
            self._handle_list_request(user_id)
        elif detail_match:
            # Запрос на получение детальной информации о персонаже
            character_name = urllib.parse.unquote(detail_match.group(1))
            user_id = detail_match.group(2) or 'default'
            self.log_message(f"Character detail request for: {character_name}, user_id: {user_id}")
            self._handle_detail_request(character_name, user_id)
        else:
            # Неверный URL
            self.log_message(f"Invalid URL format: {self.path}")
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"error": "Endpoint not found", "success": False})
            self.wfile.write(response.encode('utf-8'))
    
    def do_POST(self):
        # Обработка запроса на создание/обновление персонажа
        self.log_message(f"Processing POST request: {self.path}")
        
        if self.path.startswith('/api/characters'):
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                self.log_message(f"Received character data: {json.dumps(data)[:100]}...")
                
                # Проверяем наличие необходимых полей
                if 'name' not in data:
                    self.log_message("Missing required field: name")
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    
                    response = json.dumps({"error": "Character name is required", "success": False})
                    self.wfile.write(response.encode('utf-8'))
                    return
                
                # Получаем user_id из query параметра или используем значение по умолчанию
                user_id = 'default'
                if '?' in self.path:
                    query = self.path.split('?')[1]
                    params = dict(param.split('=') for param in query.split('&') if '=' in param)
                    user_id = params.get('user_id', 'default')
                
                # Сохраняем персонажа
                character_name = data['name']
                description = data.get('description', '')
                greeting = data.get('greeting', 'Привет!')
                
                character_data = {
                    "name": character_name,
                    "description": description,
                    "greeting": greeting,
                    "user_id": user_id,
                    "created_at": int(time.time())
                }
                
                # Сохраняем в локальное хранилище
                file_path = path_join(STORAGE_DIR, f"{character_name}_{user_id}.json")
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(character_data, f, ensure_ascii=False)
                
                self.log_message(f"Character '{character_name}' saved for user {user_id}")
                
                # Отправляем успешный ответ
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({"success": True, "data": character_data})
                self.wfile.write(response.encode('utf-8'))
                
            except json.JSONDecodeError as e:
                self.log_message(f"JSON decode error: {str(e)}")
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({"error": f"Invalid JSON: {str(e)}", "success": False})
                self.wfile.write(response.encode('utf-8'))
            
            except Exception as e:
                self.log_message(f"Error handling character save: {str(e)}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({"error": str(e), "success": False})
                self.wfile.write(response.encode('utf-8'))
        else:
            self.log_message(f"Invalid endpoint: {self.path}")
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"error": "Endpoint not found", "success": False})
            self.wfile.write(response.encode('utf-8'))
    
    def do_OPTIONS(self):
        # Настройка CORS для предварительных запросов
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def _handle_list_request(self, user_id):
        try:
            # Получаем список персонажей из локального хранилища
            character_names = []
            
            # Сначала добавляем стандартных персонажей
            for char in DEFAULT_CHARACTERS:
                character_names.append({"name": char["name"]})
            
            # Теперь ищем пользовательских персонажей
            user_suffix = f"_{user_id}.json"
            for filename in os.listdir(STORAGE_DIR):
                if filename.endswith(user_suffix):
                    try:
                        char_name = filename.replace(user_suffix, "")
                        if not any(c["name"] == char_name for c in character_names):
                            character_names.append({"name": char_name})
                    except Exception:
                        continue
            
            # Сортируем по имени
            character_names.sort(key=lambda x: x["name"])
            
            # Отправляем список персонажей
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({
                "success": True, 
                "data": {
                    "character_names": character_names
                }
            })
            self.wfile.write(response.encode('utf-8'))
            
            self.log_message(f"Returned {len(character_names)} characters for user {user_id}")
            
        except Exception as e:
            self.log_message(f"Error handling character list request: {str(e)}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"error": str(e), "success": False})
            self.wfile.write(response.encode('utf-8'))
    
    def _handle_detail_request(self, character_name, user_id):
        try:
            # Ищем персонажа в локальном хранилище
            file_path = path_join(STORAGE_DIR, f"{character_name}_{user_id}.json")
            
            character_data = None
            
            if os.path.exists(file_path):
                # Считываем данные персонажа из файла
                with open(file_path, 'r', encoding='utf-8') as f:
                    character_data = json.load(f)
                self.log_message(f"Loaded character data from file: {character_name}")
            else:
                # Ищем персонажа в стандартных персонажах
                for char in DEFAULT_CHARACTERS:
                    if char["name"] == character_name:
                        character_data = char
                        self.log_message(f"Found character in default list: {character_name}")
                        break
                
                if character_data is None:
                    self.log_message(f"Character not found: {character_name}")
            
            if character_data:
                # Персонаж найден
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({"success": True, "data": character_data})
                self.wfile.write(response.encode('utf-8'))
            else:
                # Персонаж не найден
                self.send_response(404)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                
                response = json.dumps({"error": f"Character {character_name} not found", "success": False})
                self.wfile.write(response.encode('utf-8'))
                
        except Exception as e:
            self.log_message(f"Error handling character detail request: {str(e)}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response = json.dumps({"error": str(e), "success": False})
            self.wfile.write(response.encode('utf-8'))