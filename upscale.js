const axios = require('axios');

const form = document.getElementById('imageForm');
const imageContainer = document.getElementById('imageContainer');
const upscalingResize = document.getElementById('resize');
const progressBar = document.getElementById('progress');
const upscaleSelect = document.getElementById('upscaleSelect');

let width;
let height;
let originalImageDataURL;
let images = [];
let currentIndex = 0;

// Заполнение списка апскейлеров при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    await populateUpscaleSelect();
    loadImageFromURL();
});

form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const selectedUpscaler = upscaleSelect.value;

    const postData = {
        upscaling_resize: parseFloat(upscalingResize.value),
        upscaler_1: selectedUpscaler,
        upscaler_2: "None",
        image: originalImageDataURL.split(',')[1]  // Удаляем "data:image/png;base64,"
    };

    try {
        fetchProgressData();

        const response = await axios.post('http://localhost:7861/sdapi/v1/extra-single-image', postData);

        const receivedImage = response.data.image;
        if (receivedImage) {
            images = [receivedImage];
            console.log(images);
            console.log(response);

            displayImage(currentIndex);

            document.getElementById('prevBtn').style.display = 'none';
            document.getElementById('nextBtn').style.display = 'none';
            document.getElementById('imageNumber').style.display = 'none';

            document.getElementById('prevBtn').removeEventListener('click', handlePrevClick);
            document.getElementById('nextBtn').removeEventListener('click', handleNextClick);

            document.getElementById('prevBtn').addEventListener('click', handlePrevClick);
            document.getElementById('nextBtn').addEventListener('click', handleNextClick);
        } else {
            console.error('Не удалось получить изображение из ответа.');
        }
    } catch (error) {
        console.error('Ошибка:', error);
    }
});

async function populateUpscaleSelect() {
    try {
        const response = await axios.get('http://localhost:7861/sdapi/v1/upscalers');
        const upscalers = response.data;

        upscalers.forEach(upscaler => {
            const option = document.createElement('option');
            option.value = upscaler.name;
            option.textContent = upscaler.name;
            upscaleSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Ошибка при получении списка апскейлеров:', error);
    }
}

function displayImage(index) {
    const displayedImage = document.getElementById('displayedImage');
    const imageNumber = document.getElementById('imageNumber');
    displayedImage.src = `data:image/png;base64,${images[index]}`;
    imageNumber.textContent = `${index + 1}/${images.length}`;
}

function handlePrevClick() {
    currentIndex = (currentIndex > 0) ? currentIndex - 1 : images.length - 1;
    displayImage(currentIndex);
}

function handleNextClick() {
    currentIndex = (currentIndex < images.length - 1) ? currentIndex + 1 : 0;
    displayImage(currentIndex);
}

async function fetchProgressData() {
    try {
        const response = await axios.get('http://localhost:7861/sdapi/v1/progress?skip_current_image=false');
        updatePage(response.data);
    } catch (error) {
        console.error('Ошибка при получении данных прогресса:', error);
    }
    setTimeout(fetchProgressData, 100);
}

function updatePage(data) {
    progressBar.value = data.progress * 100;

    document.getElementById('sampling-step').textContent = data.state.sampling_step;
    document.getElementById('sampling-steps').textContent = data.state.sampling_steps;

    const remainingTime = formatTime(data.eta_relative);
    document.getElementById('time-info').textContent = remainingTime;
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
    reader.onload = function (e) {
        const image = new Image();
        image.src = e.target.result;
        image.onload = function () {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            width = image.width;
            height = image.height;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(image, 0, 0);
            originalImageDataURL = canvas.toDataURL();
        }
    }
    reader.readAsDataURL(file);
}

function loadImageFromURL() {
    const params = new URLSearchParams(window.location.search);
    const imageSrc = params.get('image');
    if (imageSrc) {
        const image = new Image();
        image.src = `data:image/png;base64,${imageSrc}`;
        image.onload = function () {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            width = image.width;
            height = image.height;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(image, 0, 0);
            originalImageDataURL = canvas.toDataURL();
        };
    }
}
