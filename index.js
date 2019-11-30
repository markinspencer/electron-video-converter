const electron = require('electron');
const ffmpeg = require('fluent-ffmpeg');
const _ = require('lodash');

const { app, BrowserWindow, ipcMain } = electron;

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: { backgroundThrottling: false }
  });

  mainWindow.loadURL(`file:${__dirname}/src/index.html`);
});

ipcMain.on('videos:added', (e, videos) => {
  const promises = _.map(videos, video => {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(video.path, (err, metadata) => {
        if (err) reject(err);

        video.duration = metadata.format.duration;
        video.format = 'avi';
        resolve(video);
      });
    });
  });

  Promise.all(promises)
    .then(results => mainWindow.webContents.send('metadata:complete', results))
    .catch(console.error);
});

ipcMain.on('conversion:start', (e, videos) => {
  _.each(videos, video => {
    const outputDir = video.path.split(video.name)[0];
    const outputName = video.name.split('.')[0];
    const outputPath = `${outputDir}${outputName}.${video.format}`;

    ffmpeg(video.path)
      .output(outputPath)
      .on('end', () =>
        mainWindow.webContents.send('conversion:end', {
          video,
          outputPath
        })
      )
      .run();
  });
});
