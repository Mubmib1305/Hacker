const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const axios = require('axios');

let autoUpdateInterval = null;

axios.defaults.httpsAgent = new (require('https').Agent)({
  rejectUnauthorized: false
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  app.commandLine.appendSwitch('ignore-certificate-errors');
  app.commandLine.appendSwitch('allow-insecure-localhost');
  app.commandLine.appendSwitch('disable-web-security');
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', async () => {
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
  }
});

async function fetchEmergencyData() {
    try {
      const response = await axios.get('http://127.0.0.1:5000', {
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
        timeout: 30000 
      });
      
      return {
        success: true,
        data: response.data,
        timestamp: new Date().toLocaleString()
      };
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toLocaleString()
      };
    }
}

ipcMain.handle('fetch-data', async () => {
  return await fetchEmergencyData();
});

ipcMain.handle('start-auto-update', async (event, intervalSeconds) => {
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
  }
  
  const interval = intervalSeconds * 1000; 
  
  const initialResult = await fetchEmergencyData();
  event.sender.send('auto-update-data', initialResult);
  
  autoUpdateInterval = setInterval(async () => {
    try {
      const result = await fetchEmergencyData();
      event.sender.send('auto-update-data', result);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการอัพเดตอัตโนมัติ:', error);
      event.sender.send('auto-update-error', {
        success: false,
        error: error.message,
        timestamp: new Date().toLocaleString()
      });
    }
  }, interval);
  
  return { success: true, message: `เริ่มการอัพเดตอัตโนมัติทุก ${intervalSeconds} วินาที` };
});

ipcMain.handle('stop-auto-update', () => {
  if (autoUpdateInterval) {
    clearInterval(autoUpdateInterval);
    autoUpdateInterval = null;
    return { success: true, message: 'หยุดการอัพเดตอัตโนมัติแล้ว' };
  } else {
    return { success: false, message: 'ไม่ได้เปิดใช้งานการอัพเดตอัตโนมัติ' };
  }
});

ipcMain.handle('check-auto-update-status', () => {
  return { isRunning: autoUpdateInterval !== null };
});