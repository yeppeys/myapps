const axios = require('axios');
const translate = require('@iamtraction/google-translate');

const form = document.getElementById('imageForm');
const imageContainer = document.getElementById('imageContainer');
const promptInput = document.getElementById('prompt');
const stepsInput = document.getElementById('steps');
const negativePromptInput = document.getElementById('negative_prompt');
const batchSizeInput = document.getElementById('batch_size');
const restoreFacesInput = document.getElementById('restore_faces');
const progressBar = document.getElementById('progress');
const samplingStepElement = document.getElementById('sampling-step');
const samplingStepsElement = document.getElementById('sampling-steps');
const timeInfoElement = document.getElementById('time-info');

const dropArea = document.getElementById('drop-area');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const maskCanvas = document.createElement('canvas');
const maskCtx = maskCanvas.getContext('2d');
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let brushSize = 5;
let history = []; 
let originalImage;
let width; 
let height;
let originalImageDataURL; 
let maskDataURL;

form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const prompt = promptInput.value;
    const negativePrompt = negativePromptInput.value;
    const steps = stepsInput.value;
    const batchSize = batchSizeInput.value;
    const restoreFaces = restoreFacesInput.checked;
    const init_images = [originalImageDataURL]

    try {
        const [translatedPrompt, translatedNegativePrompt] = await Promise.all([
            translate(prompt, { to: 'en' }),
            translate(negativePrompt, { to: 'en' })
        ]);
        console.log('Translated Prompt:', translatedPrompt.text);
        console.log('Translated Negative Prompt:', translatedNegativePrompt.text);

        fetchProgressData();

        const response = await axios.post('http://localhost:7861/sdapi/v1/img2img', {
            prompt: translatedPrompt.text,
            negative_prompt: translatedNegativePrompt.text,
            steps,
            batch_size: batchSize,
            restore_faces: restoreFaces,
            width,
            height,
            init_images, // Добавляем оригинальное изображение
            mask: maskDataURL

        });
        const images = response.data.images;

        imageContainer.innerHTML = '';

        images.forEach(imageData => {
            const img = new Image();
            img.src = `data:image/png;base64,${imageData}`;
            imageContainer.appendChild(img);
        });
    } catch (error) {
        console.error('Ошибка:', error);
    }
});

async function fetchProgressData() {
    try {
        const response = await axios.get('http://localhost:7861/sdapi/v1/progress?skip_current_image=false');
        updatePage(response.data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
    setTimeout(fetchProgressData, 2000);
}

function updatePage(data) {
    progressBar.value = data.progress * 100;

    samplingStepElement.textContent = data.state.sampling_step;
    samplingStepsElement.textContent = data.state.sampling_steps;

    const remainingTime = formatTime(data.eta_relative);
    timeInfoElement.textContent = remainingTime;
}

function formatTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
function allowDrop(event) {
    event.preventDefault();
}

function drop(event) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const image = new Image();
        image.src = e.target.result;
        image.onload = function() {
            const width = image.width; // Ширина изображения
            const height = image.height; // Высота изображения
            canvas.width = width;
            canvas.height = height;
            maskCanvas.width = width;
            maskCanvas.height = height;
            ctx.drawImage(image, 0, 0);
            originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height); // сохраняем исходное изображение
            originalImageDataURL = canvas.toDataURL(); // Преобразуем оригинальное изображение в Data URL
        }
    }
    reader.readAsDataURL(file);
}
canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
});

canvas.addEventListener('mousemove', draw);

canvas.addEventListener('mouseup', () => {
    isDrawing = false;
    // Добавляем текущий холст в историю после отпускания мыши
    history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
});
canvas.addEventListener('mouseout', () => isDrawing = false);

function draw(e) {
    if (!isDrawing) return;
    ctx.strokeStyle = '#fff';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

document.getElementById('brush-slider').addEventListener('input', function() {
    brushSize = parseInt(this.value);
});

// Функция для отмены всех изменений рисования
document.getElementById('undo-button').addEventListener('click', function() {
    if (history.length > 0) { // проверяем, есть ли что отменять в истории
        history.pop(); // удаляем последний шаг рисования
        ctx.clearRect(0, 0, canvas.width, canvas.height); // очищаем холст
        if (history.length > 0) { // проверяем, остались ли еще элементы в истории
            // Восстанавливаем все шаги рисования, кроме последнего
            for (let i = 0; i < history.length; i++) {
                ctx.putImageData(history[i], 0, 0);
            }
        } else {
            // Если история пуста, восстанавливаем исходное изображение
            ctx.putImageData(originalImage, 0, 0);
        }
    }
});

function saveMask() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];
        if (r !== 255 || g !== 255 || b !== 255 || a === 0) {
            imageData.data[i] = 0;
            imageData.data[i + 1] = 0;
            imageData.data[i + 2] = 0;
            imageData.data[i + 3] = 255;
        }
    }
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCtx.putImageData(imageData, 0, 0);
    const maskDataURL = tempCanvas.toDataURL();
    console.log(maskDataURL);
    maskDataURL = maskCanvas.toDataURL();
}

function showMask() {
    maskCtx.drawImage(canvas, 0, 0);
    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const a = imageData.data[i + 3];
        if (r !== 255 || g !== 255 || b !== 255 || a === 0) {
            imageData.data[i] = 0;
            imageData.data[i + 1] = 0;
            imageData.data[i + 2] = 0;
            imageData.data[i + 3] = 255;
        }
    }
    maskCtx.putImageData(imageData, 0, 0);
    document.body.appendChild(maskCanvas);
}
