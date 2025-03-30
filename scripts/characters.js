// Инициализация обработчиков вкладки персонажей
function initCharactersTab() {
    console.log("Initializing characters tab");
    
    const characterEditForm = document.getElementById('character_edit');
    const newCharacterButton = document.getElementById('new_character_button');
    const saveCharacterButton = document.getElementById('save_character_button');
    const cancelCharacterEditButton = document.getElementById('cancel_character_edit');
    
    // Обработчик кнопки создания нового персонажа
    newCharacterButton.addEventListener('click', () => {
        document.getElementById('character_edit_title').textContent = 'Создание персонажа';
        document.getElementById('character_name').value = '';
        document.getElementById('character_description').value = '';
        document.getElementById('character_greeting').value = 'Привет! Я новый персонаж.';
        document.getElementById('character_name').disabled = false;
        
        currentEditingCharacter = null;
        characterEditForm.classList.add('active');
        isEditingCharacter = true;
    });
    
    // Обработчик кнопки отмены редактирования
    cancelCharacterEditButton.addEventListener('click', () => {
        characterEditForm.classList.remove('active');
        currentEditingCharacter = null;
        isEditingCharacter = false;
    });
    
    // Обработчик кнопки сохранения персонажа
    saveCharacterButton.addEventListener('click', saveCharacter);
}

// Сохранение персонажа
function saveCharacter() {
    const name = document.getElementById('character_name').value.trim();
    const description = document.getElementById('character_description').value.trim();
    const greeting = document.getElementById('character_greeting').value.trim();
    
    if (!name) {
        showNotification('Имя персонажа не может быть пустым', 'error');
        return;
    }
    
    if (name.length > CHARACTER_NAME_LIMIT) {
        showNotification(`Имя персонажа не может быть длиннее ${CHARACTER_NAME_LIMIT} символов`, 'error');
        return;
    }
    
    if (description.length > CHARACTER_DESCRIPTION_LIMIT) {
        showNotification(`Описание персонажа не может быть длиннее ${CHARACTER_DESCRIPTION_LIMIT} символов`, 'error');
        return;
    }
    
    if (greeting.length > CHARACTER_GREETING_LIMIT) {
        showNotification(`Приветствие персонажа не может быть длиннее ${CHARACTER_GREETING_LIMIT} символов`, 'error');
        return;
    }
    
    // Если поле приветствия пустое, устанавливаем дефолтное значение
    const finalGreeting = greeting === '' ? 'Привет!' : greeting;
    
    // Создаем данные персонажа
    const characterData = {
        name: name,
        description: description,
        greeting: finalGreeting
    };
    
    // Собираем данные для сохранения
    const saveData = {
        action: 'save_character',
        editedCharacter: characterData
    };
    
    // Отправляем данные боту
    try {
        console.log("Sending character save request:", saveData);
        showLoadingIndicator('Сохранение персонажа...');
        
        window.Telegram.WebApp.sendData(JSON.stringify(saveData));
        console.log("Character save request sent");
        
        // Скрываем форму редактирования
        document.getElementById('character_edit').classList.remove('active');
        isEditingCharacter = false;
        currentEditingCharacter = null;
        
        // Обновляем список персонажей, если это новый персонаж
        const existingIndex = characterNames.findIndex(c => c.name === name);
        if (existingIndex === -1) {
            characterNames.push({ name: name });
            renderCharacterList();
            updateCharacterSelect();
        }
        
    } catch (e) {
        console.error("Error saving character:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при сохранении персонажа', 'error');
    }
}

// Запрос деталей персонажа
function requestCharacterDetails(name) {
    console.log(`Requesting details for character: ${name}`);
    showLoadingIndicator(`Загрузка данных персонажа ${name}...`);
    
    try {
        // Отправляем запрос на получение деталей
        const request = {
            action: 'get_character_details',
            name: name
        };
        
        window.Telegram.WebApp.sendData(JSON.stringify(request));
        console.log("Character details request sent");
    } catch (e) {
        console.error("Error requesting character details:", e);
        hideLoadingIndicator();
        showNotification('Ошибка при запросе данных персонажа', 'error');
    }
}

// Обработка чанка с данными персонажа
function processCharacterDetailsChunk(data) {
    const { name, chunk_index, total_chunks, greeting, description_part } = data;
    
    if (!name) {
        console.error("Character name is missing in chunk data");
        return;
    }
    
    console.log(`Processing character details chunk ${chunk_index + 1}/${total_chunks} for ${name}`);
    
    // Инициализируем буфер для этого персонажа, если его еще нет
    if (!window.characterDetailBuffer[name]) {
        window.characterDetailBuffer[name] = {
            descriptionParts: new Array(total_chunks),
            receivedChunks: 0,
            totalChunks: total_chunks,
            greeting: null
        };
    }
    
    const buffer = window.characterDetailBuffer[name];
    
    // Сохраняем часть описания
    buffer.descriptionParts[chunk_index] = description_part;
    
    // Сохраняем приветствие, если оно есть (обычно только в первом чанке)
    if (greeting !== undefined && greeting !== null) {
        buffer.greeting = greeting;
    }
    
    // Увеличиваем счетчик полученных чанков
    buffer.receivedChunks++;
    
    // Если получили все чанки - собираем полные данные
    if (buffer.receivedChunks === buffer.totalChunks) {
        console.log(`All ${total_chunks} chunks received for ${name}, assembling full data`);
        
        // Собираем полное описание из частей
        const fullDescription = buffer.descriptionParts.join('');
        
        // Заполняем форму редактирования
        document.getElementById('character_edit_title').textContent = 'Редактирование персонажа';
        document.getElementById('character_name').value = name;
        document.getElementById('character_name').disabled = true; // Имя нельзя менять при редактировании
        document.getElementById('character_description').value = fullDescription;
        document.getElementById('character_greeting').value = buffer.greeting || '';
        
        // Показываем форму редактирования
        document.getElementById('character_edit').classList.add('active');
        
        // Переключаемся на вкладку персонажей
        document.querySelectorAll('.tab')[1].click();
        
        // Скрываем индикатор загрузки
        hideLoadingIndicator();
        
        // Устанавливаем флаг редактирования
        isEditingCharacter = true;
        currentEditingCharacter = { name: name };
        
        // Очищаем буфер для этого персонажа
        delete window.characterDetailBuffer[name];
    } else {
        // Обновляем индикатор загрузки с прогрессом
        showLoadingIndicator(`Загрузка персонажа ${name}... (${buffer.receivedChunks}/${buffer.totalChunks})`);
    }
}

// Отображение списка персонажей
function renderCharacterList() {
    const characterListElement = document.getElementById('character-list');
    if (!characterListElement) return;
    
    characterListElement.innerHTML = '';
    
    if (characterNames.length === 0) {
        characterListElement.innerHTML = '<div class="character-item">Нет доступных персонажей</div>';
        return;
    }
    
    // Сортируем персонажей по имени
    characterNames.sort((a, b) => a.name.localeCompare(b.name));
    
    characterNames.forEach(character => {
        const characterItem = document.createElement('div');
        characterItem.className = 'character-item';
        
        // Проверяем, является ли персонаж текущим выбранным
        const characterSelect = document.getElementById('character');
        const selectedCharacterValue = characterSelect.value;
        let isSelected = false;
        
        try {
            const selectedCharacter = JSON.parse(selectedCharacterValue);
            isSelected = selectedCharacter.name === character.name;
        } catch (e) {}
        
        if (isSelected) {
            characterItem.classList.add('selected');
        }
        
        characterItem.innerHTML = `
            <div>
                <div class="character-name">${character.name}</div>
            </div>
            <div class="character-actions">
                <button class="action-button edit-character" data-name="${character.name}">Изменить</button>
                <button class="action-button select-character" data-name="${character.name}">Выбрать</button>
            </div>
        `;
        
        characterListElement.appendChild(characterItem);
    });
    
    // Добавляем обработчики событий для кнопок
    addCharacterButtonHandlers();
}

// Добавление обработчиков кнопок в списке персонажей
function addCharacterButtonHandlers() {
    document.querySelectorAll('.edit-character').forEach(button => {
        button.addEventListener('click', event => {
            const characterName = event.target.dataset.name;
            if (characterName) {
                // Запрашиваем данные персонажа для редактирования
                requestCharacterDetails(characterName);
            }
        });
    });
    
    document.querySelectorAll('.select-character').forEach(button => {
        button.addEventListener('click', event => {
            const characterName = event.target.dataset.name;
            if (characterName) {
                const characterSelect = document.getElementById('character');
                
                // Находим опцию с соответствующим именем персонажа
                Array.from(characterSelect.options).forEach(option => {
                    try {
                        const optionData = JSON.parse(option.value || '{}');
                        if (optionData.name === characterName) {
                            option.selected = true;
                            
                            // Обновляем выделение в списке персонажей
                            document.querySelectorAll('.character-item').forEach(item => {
                                item.classList.remove('selected');
                            });
                            event.target.closest('.character-item').classList.add('selected');
                            
                            // Переключаемся на вкладку настроек
                            document.querySelectorAll('.tab')[0].click();
                        }
                    } catch (e) {}
                });
            }
        });
    });
}

// Обновление выпадающего списка персонажей
function updateCharacterSelect() {
    const characterSelect = document.getElementById('character');
    if (!characterSelect) return;
    
    const selectedValue = characterSelect.value;
    let selectedOption = null;
    
    try {
        selectedOption = JSON.parse(selectedValue);
    } catch (e) {}
    
    characterSelect.innerHTML = '';
    
    // Сортируем персонажей по имени
    const sortedCharacters = [...characterNames].sort((a, b) => {
        return a.name.localeCompare(b.name);
    });
    
    sortedCharacters.forEach(char => {
        const option = document.createElement('option');
        option.value = JSON.stringify({name: char.name});
        option.textContent = char.name;
        
        if (selectedOption && selectedOption.name === char.name) {
            option.selected = true;
        }
        
        characterSelect.appendChild(option);
    });
}