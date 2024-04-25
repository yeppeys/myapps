const axios = require('axios');

const form = document.getElementById('imageForm');
const imageContainer = document.getElementById('imageContainer');
const promptInput = document.getElementById('prompt');
const stepsInput = document.getElementById('steps');

form.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const prompt = promptInput.value;
    const steps = stepsInput.value;

    try {
        const response = await axios.post('http://127.0.0.1:7860/sdapi/v1/txt2img', {
            prompt,
            steps
        });
        
        const images = response.data.images;
        const imageData = images[0]; // Assuming you want to display the first image

        const img = new Image();
        img.src = `data:image/png;base64,${imageData}`;

        imageContainer.innerHTML = ''; // Clear previous image
        imageContainer.appendChild(img);
    } catch (error) {
        console.error('Ошибка:', error);
    }
});

const { dialog } = require('electron').remote;
const fs = require('fs');
const path = require('path');

const selectFileButton = document.getElementById('selectFileButton');

selectFileButton.addEventListener('click', async function() {
    // Отображение диалогового окна для выбора файла
    const filePaths = await dialog.showOpenDialog({
        properties: ['openFile']
    });

    // Проверка, что файл был выбран
    if (!filePaths.canceled && filePaths.filePaths.length > 0) {
        const selectedFilePath = filePaths.filePaths[0];
        
        // Перемещение выбранного файла в определенную папку
        const destinationFolder = 'C:\\stable-diffusion-webui\\models\\Stable-diffusion';
        const fileName = path.basename(selectedFilePath);
        const destinationPath = path.join(destinationFolder, fileName);

        fs.rename(selectedFilePath, destinationPath, (err) => {
            if (err) {
                console.error('Ошибка перемещения файла:', err);
            } else {
                console.log('Файл успешно перемещен.');
            }
        });
    }
});