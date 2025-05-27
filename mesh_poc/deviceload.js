// Функция для загрузки данных с API
async function loadData() {
    const apiUrl = getApiUrl();
    const token = getAuthToken();
    const openframeToken = getOpenFrameToken();

    if (!apiUrl) {
        showError('Пожалуйста, введите URL эндпоинта');
        return;
    }

    if (!token) {
        showError('Пожалуйста, введите Auth Cookie');
        return;
    }

    if (!openframeToken) {
        showError('Пожалуйста, введите OpenFrame Token');
        return;
    }

    // Save form data before making the request
    saveFormData();

    // Показываем индикатор загрузки
    showLoading(true);
    hideError();
    hideTable();

    try {
        // Настройка заголовков запроса
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openframeToken}`
        };

        // Выполняем запрос к API
        const response = await fetch(apiUrl + "/api/listdevices", {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Отображаем данные в таблице
        displayData(data);

    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        showError(`Ошибка при загрузке данных: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Функция для отображения данных в таблице
function displayData(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    // Проверяем, является ли data массивом
    const items = Array.isArray(data) ? data : [data];

    if (items.length === 0) {
        showError('Данные не найдены');
        return;
    }

    // Создаем строки таблицы
    items.forEach(item => {
        const row = document.createElement('tr');

        // Получаем node id (приоритет nodeid, fallback на _id)
        const nodeId = item.nodeid || item._id || 'N/A';
        
        // Сокращаем nodeId для отображения (первые 5 символов + ...)
        const displayNodeId = nodeId.length > 15 ? nodeId.substring(0, 15) + '...' : nodeId;

        // Колонка с Node ID (сокращенный вид)
        const idCell = document.createElement('td');
        idCell.textContent = displayNodeId;
        idCell.title = nodeId; // Показываем полный ID при наведении
        row.appendChild(idCell);

        // Колонка с кнопками действий
        const actionCell = document.createElement('td');
        actionCell.className = 'action-cell';

        // Кнопка Control
        const controlButton = document.createElement('button');
        controlButton.textContent = 'Control';
        controlButton.className = 'action-btn control-btn';
        controlButton.onclick = () => handleControlAction(nodeId);
        actionCell.appendChild(controlButton);

        // Кнопка Tunel
        const tunelButton = document.createElement('button');
        tunelButton.textContent = 'Tunel';
        tunelButton.className = 'action-btn tunel-btn';
        tunelButton.onclick = () => handleTunelAction(nodeId);
        actionCell.appendChild(tunelButton);

        // Кнопка Relay
        const relayButton = document.createElement('button');
        relayButton.textContent = 'Relay';
        relayButton.className = 'action-btn relay-btn';
        relayButton.onclick = () => handleRelayAction(nodeId);
        actionCell.appendChild(relayButton);

        row.appendChild(actionCell);
        tableBody.appendChild(row);
    });

    // Показываем таблицу
    showTable();
    
    // Initialize status display
    updateConnectionStatus();
}

// Обработчики для новых кнопок
function handleControlAction(nodeId) {
    console.log('Control action for node:', nodeId);
    // Connect to control endpoint
    connectToControl(nodeId);
}

function handleTunelAction(nodeId) {
    console.log('Tunel action for node:', nodeId);
    // Send tunnel message
    sendTunnelMessage(nodeId);
}

function handleRelayAction(nodeId) {
    console.log('Relay action for node:', nodeId);
    // Connect to mesh relay
    connectToMeshRelay(nodeId);
}

// Вспомогательные функции для управления UI
function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

function showTable() {
    document.getElementById('dataTable').style.display = 'table';
}

function hideTable() {
    document.getElementById('dataTable').style.display = 'none';
}