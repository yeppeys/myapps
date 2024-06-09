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
const denoisingStrength = document.getElementById('denoising_strength');
const cfg_scaleInput = document.getElementById('cfg_scale');
const samplerSelect = document.getElementById('samplerSelect');


const dropArea = document.getElementById('drop-area');
const canvas = document.getElementById('canvas');
const placeholder = dropArea.querySelector('.placeholder');
const droppedImage = document.getElementById('droppedImage');

let width;
let height;
let originalImageDataURL;

async function fetchSamplers() {
    try {
        const response = await axios.get('http://localhost:7861/sdapi/v1/samplers');
        const samplers = response.data;
        samplers.forEach(sampler => {
            const option = document.createElement('option');
            option.value = sampler.name;
            option.textContent = sampler.name;
            samplerSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching samplers:', error);
    }
}

fetchSamplers();

document.getElementById('submit').addEventListener('click', async function () {

    const prompt = promptInput.value;
    const negativePrompt = negativePromptInput.value;
    const steps = stepsInput.value;
    const batchSize = batchSizeInput.value;
    const restoreFaces = restoreFacesInput.checked;
    const init_images = [originalImageDataURL];
    const denoising_strength = denoisingStrength.value;
    const cfg_scale = cfg_scaleInput.value;
    const samplerName = samplerSelect.value;

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
            scheduler: 'Automatic',
            denoising_strength,
            width,
            height,
            init_images,
            sampler_name: samplerName,
            cfg_scale
        });

            currentIndex = 0;
            images = response.data.images;
            console.log(images);
            console.log(response);

            if (images.length > 0) {
                displayImage(currentIndex);

                if (images.length === 1) {
                    document.getElementById('prevBtn').style.display = 'none';
                    document.getElementById('nextBtn').style.display = 'none';
                    document.getElementById('imageNumber').style.display = 'none';
                } else {
                    document.getElementById('prevBtn').style.display = 'block';
                    document.getElementById('nextBtn').style.display = 'block';
                    document.getElementById('imageNumber').style.display = 'block';
                }
            }

            document.getElementById('prevBtn').removeEventListener('click', handlePrevClick);
            document.getElementById('nextBtn').removeEventListener('click', handleNextClick);

            document.getElementById('prevBtn').addEventListener('click', handlePrevClick);
            document.getElementById('nextBtn').addEventListener('click', handleNextClick);

        } catch (error) {
            console.error('Ошибка:', error);
        }
    });

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
        console.error('Error fetching data:', error);
    }
    setTimeout(fetchProgressData, 100);
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
document.getElementById('editUpscale').addEventListener('click', function () {
    const displayedImageSrc = images[currentIndex];
    const encodedImage = encodeURIComponent(displayedImageSrc);
    window.location.href = `upscale.html?image=${encodedImage}`;
});