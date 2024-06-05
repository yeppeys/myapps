const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function uploadModel() {
    const modelFileInput = document.getElementById('modelFileInput');
    const filePath = modelFileInput.files[0].path; 

    const destinationPath = 'C:/stable-diffusion-webui/models/Stable-diffusion';

    const fileName = path.basename(filePath);
    

    fs.rename(filePath, path.join(destinationPath, fileName), async (err) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Модель успешно загружена и перемещена.');
        showNotification('Модель успешно загружена и перемещена.');

        try {
            await axios.post('http://localhost:7861/sdapi/v1/refresh-checkpoints');
            console.log('Чекпоинты успешно обновлены.');
            showNotification('Чекпоинты успешно обновлены.');
            fetchModelsAndPopulateSelect();
        } catch (error) {
            console.error('Ошибка при отправке POST запроса для обновления чекпоинтов:', error);
            showNotification('Ошибка при отправке POST запроса для обновления чекпоинтов:', error);
        }
    });
}
async function fetchModelsAndPopulateSelect() {
    try {
        const response = await axios.get('http://localhost:7861/sdapi/v1/sd-models');
        const models = response.data;
        const selectElement = document.getElementById('modelSelect');

        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.title;
            option.text = model.title;
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка при получении списка моделей:', error);
        showNotification('Ошибка при получении списка моделей:', error);
    }
}

async function selectModel() {
    const selectElement = document.getElementById('modelSelect');
    const selectedTitle = selectElement.value;

    try {
        await axios.post('http://localhost:7861/sdapi/v1/options', {
            sd_model_checkpoint: selectedTitle
        });
        console.log(`Модель "${selectedTitle}" успешно выбрана.`);
        showNotification(`Модель "${selectedTitle}" успешно выбрана.`);
    } catch (error) {
        console.error('Ошибка при отправке POST запроса:', error);
        showNotification('Ошибка при отправке POST запроса:', error);
    }
}

function showNotification(message) {
    var notificationContainer = document.querySelector('.notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.classList.add('notification-container');
        document.body.appendChild(notificationContainer);
    }
    
    var notification = document.createElement('div');
    notification.classList.add('notification');
    notification.textContent = message;
    notificationContainer.appendChild(notification);
    
    setTimeout(function() {
        notification.remove();
        if (notificationContainer.children.length === 0) {
            notificationContainer.remove();
        }
    }, 3000);
}

fetchModelsAndPopulateSelect();