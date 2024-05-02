const axios = require('axios');

const form = document.getElementById('imageForm');
const imageContainer = document.getElementById('imageContainer');
const promptInput = document.getElementById('prompt');
const stepsInput = document.getElementById('steps');
const negative_promptInput = document.getElementById('negative_prompt');
const batch_sizeInput = document.getElementById('batch_size');
const restore_facesInput = document.getElementById('restore_faces')

form.addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const prompt = promptInput.value;
    const negative_prompt = negative_promptInput.value;
    const steps = stepsInput.value;
    const batch_size = batch_sizeInput.value;
    const restore_faces = restore_facesInput.checked;

    try {
        const response = await axios.post('http://localhost:7861/sdapi/v1/txt2img', {
            prompt,
            negative_prompt,
            steps,
            batch_size,
            restore_faces
        });
        console.log(this.restore_faces);
        const images = response.data.images;

        // Clear previous images
        imageContainer.innerHTML = '';

        // Display all images
        images.forEach(imageData => {
            const img = new Image();
            img.src = `data:image/png;base64,${imageData}`;
            imageContainer.appendChild(img);
        });
    } catch (error) {
        console.error('Ошибка:', error);
    }
});