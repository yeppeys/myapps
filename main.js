const { app, BrowserWindow } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let serverProcess; 
let serverPID; 
let loadingWindow;

function createLoadingWindow() {
    loadingWindow = new BrowserWindow({
        width: 300,
        height: 200,
        frame: false, 
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
}

function createMainWindow() {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('closed', function () {
        if (serverPID) {
            exec(`taskkill /PID ${serverPID} /F`, (err, stdout, stderr) => {
                if (err) {
                    console.error('Error killing server process:', err);
                } else if (stderr) {
                    console.error('Error killing server process:', stderr);
                } else {
                    console.log('Server process killed successfully.');
                    app.quit();
                }
            });
        } else {
            app.quit();
        }
    });
}

app.whenReady().then(() => {
    createLoadingWindow(); 
    startServer();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

function startServer() {
    const command = 'powershell -NoLogo -WindowStyle Hidden -Command "cd C://stable-diffusion-webui; ./webui.bat --nowebui --disable-nan-check"';

    serverProcess = exec(command, { detached: true, shell: true });

    serverProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
        const match = data.toString().match(/Started server process \[(\d+)\]/);
        if (match && match[1]) {
            serverPID = parseInt(match[1]);
            console.log(`Server process PID: ${serverPID}`);
            if (loadingWindow) {
                loadingWindow.close();
                createMainWindow();
            }
        }
    });

    serverProcess.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
    });
}




