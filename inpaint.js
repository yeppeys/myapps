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
const denoisingStrength = document.getElementById('denoising_strength')

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
let currentIndex = 0;
let images = [];

form.addEventListener('submit', async function (event) {
	event.preventDefault();

	const prompt = promptInput.value;
	const negativePrompt = negativePromptInput.value;
	const steps = stepsInput.value;
	const batchSize = batchSizeInput.value;
	const restoreFaces = restoreFacesInput.checked;
	const init_images = [originalImageDataURL]
	const denoising_strength = denoisingStrength.value;

	try {
		const [translatedPrompt, translatedNegativePrompt] = await Promise.all([
			translate(prompt, { to: 'en' }),
			translate(negativePrompt, { to: 'en' })
		]);
		console.log('Translated Prompt:', translatedPrompt.text);
		console.log('Translated Negative Prompt:', translatedNegativePrompt.text);

		fetchProgressData();
		saveMask();

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
			mask: maskDataURL,
			inpainting_fill: 32,
			inpaint_full_res: false,
			inpaint_full_res_padding: 0,
			inpainting_mask_invert: 0,
			mask_blur_x: 4,
			mask_blur_y: 4,
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
			const width = image.width;
			const height = image.height;
			canvas.width = width;
			canvas.height = height;
			maskCanvas.width = width;
			maskCanvas.height = height;
			ctx.drawImage(image, 0, 0);
			originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
			originalImageDataURL = canvas.toDataURL();
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

document.getElementById('brush-slider').addEventListener('input', function () {
	brushSize = parseInt(this.value);
});


document.getElementById('undo-button').addEventListener('click', function () {
	if (history.length > 0) {
		history.pop();
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (history.length > 0) {
			for (let i = 0; i < history.length; i++) {
				ctx.putImageData(history[i], 0, 0);
			}
		} else {
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
	maskDataURL = tempCanvas.toDataURL();
	console.log(maskDataURL);
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
function loadImageFromURL() {
    const params = new URLSearchParams(window.location.search);
    const imageSrc = params.get('image');
    if (imageSrc) {
        const image = new Image();
        image.src = `data:image/png;base64,${imageSrc}`;
        image.onload = function () {
            canvas.width = image.width;
            canvas.height = image.height;
            ctx.drawImage(image, 0, 0);
            originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
            originalImageDataURL = canvas.toDataURL();
        };
    }
}