const axios = require('axios');
const translate = require('@iamtraction/google-translate');

const form = document.getElementById('imageForm');
const imageContainer = document.getElementById('imageContainer');
const promptInput = document.getElementById('prompt');
const stepsInput = document.getElementById('steps');
const negative_promptInput = document.getElementById('negative_prompt');
const batch_sizeInput = document.getElementById('batch_size');
const restore_facesInput = document.getElementById('restore_faces');

form.addEventListener('submit', async function(event) {
    event.preventDefault();

    const prompt = promptInput.value;
    const negative_prompt = negative_promptInput.value;
    const steps = stepsInput.value;
    const batch_size = batch_sizeInput.value;
    const restore_faces = restore_facesInput.checked;

    try {
        const [translatedPrompt, translatedNegativePrompt] = await Promise.all([
            translate(prompt, { to: 'en' }),
            translate(negative_prompt, { to: 'en' })
        ]);
        console.log('Translated Prompt:', translatedPrompt.text);
        console.log('Translated Negative Prompt:', translatedNegativePrompt.text);

        const response = await axios.post('http://localhost:7861/sdapi/v1/txt2img', {
            prompt: translatedPrompt.text,
            negative_prompt: translatedNegativePrompt.text,
            steps,
            batch_size,
            restore_faces
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
