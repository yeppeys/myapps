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

form.addEventListener('submit', async function (event) {
	event.preventDefault();

	const prompt = promptInput.value;
	const negativePrompt = negativePromptInput.value;
	const steps = stepsInput.value;
	const batchSize = batchSizeInput.value;
	const restoreFaces = restoreFacesInput.checked;

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
			restore_faces: restoreFaces
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

