// Инициализация обработчиков вкладки персонажей
document.addEventListener('DOMContentLoaded', function() {
    initCharactersTab();
});

// Инициализация вкладки персонажей
function initCharactersTab() {
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
    });
    
    // Обработчик кнопки отмены редактирования
    cancelCharacterEditButton.addEventListener('click', () => {
        characterEditForm.classList.remove('active');
        currentEditingCharacter = null;
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
        alert('Имя персонажа не может быть пустым');
        return;
    }
    
    if (name.length > CHARACTER_NAME_LIMIT) {
        alert(`Имя персонажа не может быть длиннее ${CHARACTER_NAME_LIMIT} символов`);
        return;
    }
    
    if (description.length > CHARACTER_DESCRIPTION_LIMIT) {
        alert(`Описание персонажа не может быть длиннее ${CHARACTER_DESCRIPTION_LIMIT} символов`);
        return;
    }
    
    if (greeting.length > CHARACTER_GREETING_LIMIT) {
        alert(`Приветствие персонажа не может быть длиннее ${CHARACTER_GREETING_LIMIT} символов`);
        return;
    }
    
    // Если поле приветствия пустое, устанавливаем дефолтное значение
    const finalGreeting = greeting === '' ? 'Привет!' : greeting;
    
    if (currentEditingCharacter) {
        // Обновляем существующего персонажа
        const index = characters.findIndex(c => c.name === currentEditingCharacter.name && 
                                             c.user_created === currentEditingCharacter.user_created);
        if (index !== -1) {
            characters[index].description = description;
            characters[index].greeting = finalGreeting;
        }
    } else {
        // Проверяем, существует ли персонаж с таким именем
        const existingCharacter = characters.find(c => c.name === name);
        if (existingCharacter) {
            alert(`Персонаж с именем "${name}" уже существует`);
            return;
        }
        
        // Создаем нового персонажа
        characters.push({
            name: name,
            description: description,
            greeting: finalGreeting,
            user_created: true,
            is_ai_generated: false
        });
    }
    
    // Обновляем список персонажей
    renderCharacterList();
    updateCharacterSelect();
    
    // Скрываем форму редактирования
    document.getElementById('character_edit').classList.remove('active');
    currentEditingCharacter = null;
}

// Отображение списка персонажей
function renderCharacterList() {
    const characterListElement = document.getElementById('character-list');
    if (!characterListElement) return;
    
    characterListElement.innerHTML = '';
    
    if (characters.length === 0) {
        characterListElement.innerHTML = '<div class="character-item">Нет доступных персонажей</div>';
        return;
    }
    
    // Сортируем персонажей по имени
    characters.sort((a, b) => a.name.localeCompare(b.name));
    
    characters.forEach(character => {
        const characterItem = document.createElement('div');
        characterItem.className = 'character-item';
        
        // Проверяем, является ли персонаж текущим выбранным
        const characterSelect = document.getElementById('character');
        const selectedCharacterValue = characterSelect.value;
        let isSelected = false;
        
        try {
            const selectedCharacter = JSON.parse(selectedCharacterValue);
            isSelected = selectedCharacter.name === character.name && 
                       selectedCharacter.user_created === character.user_created;
        } catch (e) {}
        
        if (isSelected) {
            characterItem.classList.add('selected');
        }
        
        const truncatedDescription = character.description && character.description.length > 50 
            ? character.description.substring(0, 50) + '...' 
            : character.description || 'Нет описания';
        
        characterItem.innerHTML = `
            <div>
                <div class="character-name">${character.name}</div>
                <div class="character-info">${character.user_created ? 'Пользовательский' : 'Системный'}</div>
                <div class="character-info">${truncatedDescription}</div>
            </div>
            <div class="character-actions">
                ${character.user_created ? `<button class="action-button edit-character" data-name="${character.name}">Изменить</button>` : ''}
                <button class="action-button select-character" data-name="${character.name}" data-user-created="${character.user_created}">Выбрать</button>
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
            const character = characters.find(c => c.name === characterName && c.user_created === true);
            
            if (character) {
                document.getElementById('character_edit_title').textContent = 'Редактирование персонажа';
                document.getElementById('character_name').value = character.name;
                document.getElementById('character_description').value = character.description || '';
                document.getElementById('character_greeting').value = character.greeting || 'Привет!';
                document.getElementById('character_name').disabled = true;
                
                currentEditingCharacter = character;
                document.getElementById('character_edit').classList.add('active');
            }
        });
    });
    
    document.querySelectorAll('.select-character').forEach(button => {
        button.addEventListener('click', event => {
            const characterName = event.target.dataset.name;
            const userCreated = event.target.dataset.userCreated === 'true';
            const character = characters.find(c => c.name === characterName && c.user_created === userCreated);
            
            if (character) {
                const characterSelect = document.getElementById('character');
                
                // Находим опцию с соответствующим именем персонажа
                Array.from(characterSelect.options).forEach(option => {
                    try {
                        const optionData = JSON.parse(option.value || '{}');
                        if (optionData.name === characterName && optionData.user_created === userCreated) {
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
    
    // Сортируем персонажей: системные сначала, затем пользовательские
    const sortedCharacters = [...characters].sort((a, b) => {
        if (a.user_created === b.user_created) {
            return a.name.localeCompare(b.name);
        }
        return a.user_created ? 1 : -1;
    });
    
    sortedCharacters.forEach(char => {
        const option = document.createElement('option');
        option.value = JSON.stringify({name: char.name, user_created: char.user_created});
        option.textContent = char.name + (char.user_created ? ' [Пользовательский]' : '');
        
        if (selectedOption && selectedOption.name === char.name && selectedOption.user_created === char.user_created) {
            option.selected = true;
        }
        
        characterSelect.appendChild(option);
    });
}