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
        const response = await axios.post('http://localhost:7861/sdapi/v1/txt2img', {
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
