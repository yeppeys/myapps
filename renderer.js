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
const cfg_scaleInput = document.getElementById('cfg_scale');
const widthInput = document.getElementById('width');
const heightInput = document.getElementById('height');
const samplerSelect = document.getElementById('samplerSelect');

let currentIndex = 0;
let images = [];

// Function to fetch and populate samplers
async function fetchSamplers() {
    try {
        const response = await axios.get('http://localhost:7861/sdapi/v1/samplers');
        const samplers = response.data;
        samplers.forEach(sampler => {
            const option = document.createElement('option');
            option.value = sampler.name; // Assuming each sampler has a 'name' property
            option.textContent = sampler.name;
            samplerSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching samplers:', error);
    }
}

// Call fetchSamplers on page load
fetchSamplers();

document.getElementById('submit').addEventListener('click', async function () {
    const prompt = promptInput.value;
    const negativePrompt = negativePromptInput.value;
    const steps = stepsInput.value;
    const batchSize = batchSizeInput.value;
    const restoreFaces = restoreFacesInput.checked;
    const cfg_scale = cfg_scaleInput.value;
    const width = widthInput.value;
    const height = heightInput.value;
    const samplerName = samplerSelect.value;


    try {
        const [translatedPrompt, translatedNegativePrompt] = await Promise.all([
            translate(prompt, { to: 'en' }),
            translate(negativePrompt, { to: 'en' })
        ]);

        console.log('Translated Prompt:', translatedPrompt.text);
        console.log('Translated Negative Prompt:', translatedNegativePrompt.text);

        fetchProgressData();

        const response = await axios.post('http://localhost:7861/sdapi/v1/txt2img', {
            prompt: translatedPrompt.text,
            negative_prompt: translatedNegativePrompt.text,
            steps,
            batch_size: batchSize,
            restore_faces: restoreFaces,
            cfg_scale,
            width,
            height,
            sampler_name: samplerName
        });

        currentIndex = 0;
        images = response.data.images;

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
    setTimeout(fetchProgressData, 1000);
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

document.getElementById('editUpscale').addEventListener('click', function () {
    const displayedImageSrc = images[currentIndex];
    const encodedImage = encodeURIComponent(displayedImageSrc);
    window.location.href = `upscale.html?image=${encodedImage}`;
});


