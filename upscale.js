const axios = require('axios');

const form = document.getElementById('imageForm');
const imageContainer = document.getElementById('imageContainer');
const upscalingResize = document.getElementById('resize');
const upscaleSelect = document.getElementById('upscaleSelect');
const dropArea = document.getElementById('drop-area');
const canvas = document.getElementById('canvas');
const placeholder = dropArea.querySelector('.placeholder');
const droppedImage = document.getElementById('droppedImage');

let width;
let height;
let originalImageDataURL;
let images = [];
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await populateUpscaleSelect();
    loadImageFromURL();
});

form.addEventListener('submit', async function (event) {
    event.preventDefault();

    const selectedUpscaler = upscaleSelect.value;

    const postData = {
        upscaling_resize: upscalingResize.value,
        upscaling_crop: true,
        upscaler_1: selectedUpscaler,
        image: originalImageDataURL.split(',')[1]
    };

    try {
        showNotification('Идёт процесс апскейла', false);

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

            clearNotifications();
            showNotification('Апскейл завершен', true);
        } else {
            console.error('Не удалось получить изображение из ответа.');
            clearNotifications();
            showNotification('Ошибка при апскейле', true);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        clearNotifications();
        showNotification('Ошибка при апскейле', true);
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

function showNotification(message, autoHide) {
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
    
    if (autoHide) {
        setTimeout(function() {
            notification.remove();
            if (notificationContainer.children.length === 0) {
                notificationContainer.remove();
            }
        }, 3000);
    }
}

function clearNotifications() {
    var notificationContainer = document.querySelector('.notification-container');
    if (notificationContainer) {
        notificationContainer.remove();
    }
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
            width = image.width;
            height = image.height;
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const aspectRatio = image.width / image.height;
            let drawWidth, drawHeight, offsetX, offsetY;

            if (image.width > image.height) {
                drawWidth = canvas.width;
                drawHeight = canvas.width / aspectRatio;
                offsetX = 0;
                offsetY = (canvas.height - drawHeight) / 2;
            } else {
                drawHeight = canvas.height;
                drawWidth = canvas.height * aspectRatio;
                offsetX = (canvas.width - drawWidth) / 2;
                offsetY = 0;
            }

            ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
            originalImageDataURL = canvas.toDataURL();
            placeholder.style.display = 'none';
            droppedImage.style.display = 'block';
            droppedImage.src = originalImageDataURL;
            canvas.style.display = 'none';
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
            const ctx = canvas.getContext('2d');
            width = image.width;
            height = image.height;
            canvas.width = 512;
            canvas.height = 512;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const aspectRatio = image.width / image.height;
            let drawWidth, drawHeight, offsetX, offsetY;

            if (image.width > image.height) {
                drawWidth = canvas.width;
                drawHeight = canvas.width / aspectRatio;
                offsetX = 0;
                offsetY = (canvas.height - drawHeight) / 2;
            } else {
                drawHeight = canvas.height;
                drawWidth = canvas.height * aspectRatio;
                offsetX = (canvas.width - drawWidth) / 2;
                offsetY = 0;
            }

            ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
            originalImageDataURL = canvas.toDataURL();
            placeholder.style.display = 'none';
            droppedImage.style.display = 'block';
            droppedImage.src = originalImageDataURL;
            canvas.style.display = 'none';
        };
    }
}
document.getElementById('editInpaint').addEventListener('click', function () {
    const displayedImageSrc = images[currentIndex];
    const encodedImage = encodeURIComponent(displayedImageSrc);
    window.location.href = `inpaint.html?image=${encodedImage}`;
});
document.getElementById('editImgtoimg').addEventListener('click', function () {
    const displayedImageSrc = images[currentIndex];
    const encodedImage = encodeURIComponent(displayedImageSrc);
    window.location.href = `imgtoimg.html?image=${encodedImage}`;
});



