const ejs = require('ejs');
const mkdirp = require('mkdirp');
const Nightmare = require('nightmare');
const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const execSync = childProcess.execSync;
const templateString = fs.readFileSync(`${__dirname}/../template.ejs`, 'utf-8')
  .toString();
const template = ejs.compile(templateString);
const maxLoop = 50;
const videoFrameCount = 10;

module.exports = exports = function buildFiles(root, input, typeName, cb) {
  root = path.resolve(root);
  input = path.resolve(input);
  if (!checkPath(root, 'isDirectory')) {
    return cb(new Error(`Root "${root}" must be a valid directory.`));
  }
  if (!checkPath(input, 'isFile')) {
    return cb(new Error(`Input "${input}" must be a valid file.`));
  }
  const sampleName = path.basename(input);
  const start = Date.now();
  const [ type, compression ] = typeName.split('_');
  const videos = [];
  let lastVideo;
  let frameCount = 0;
  const dir = `${root}/${typeName}/`;
  mkdirp.sync(dir);
  let finishedFile = `${dir}finished.txt`;
  let file = input;
  let sha1 = '';
  if (fs.existsSync(finishedFile)) {
    const returnMessage = `Skipping file generation. If you would like to regenerate
the files, please delete the file "${finishedFile}" and try again.\n`;
    console.log(returnMessage);
    return cb(null, returnMessage);
  }
  let i = 0;
  let nightmare = Nightmare({ show: false });
  nightmare = nightmare.viewport(1440, 900)
    .on('console', (type, ...args) => console[type](...args));
  for (i = 1; i <= maxLoop; i++) {
    console.log(`Creating ${dir}* (${i}) from ${input}`);
    // setup file names
    let audioFile = `${dir}audio/${i}.${type}`;
    let infoFile = `${dir}info/${i}.json`;
    let waveformFile = `${dir}waveform/${i}.png`;
    let spectrogramFile = `${dir}spectrogram/${i}.png`;
    let htmlFile = `${dir}html/${i}.html`;
    let screenshotFile = `${dir}screenshot/${i}.png`;
    // setup directories
    [audioFile, infoFile, waveformFile, spectrogramFile,
      htmlFile, screenshotFile].forEach(
      (file) => mkdirp.sync(path.dirname(file))
    );
    // build audio
    const cFlag = compression ? ` -C ${compression}` : '';
    execSync(`sox ${file}${cFlag} ${audioFile}`);
    // get info
    const info = {
      File: `${i}.${type}`
    };
    execSync(`soxi ${audioFile}`).toString()
      .split('\n').filter((l) => l.indexOf(':') >= 0).forEach((line) => {
        const index = line.indexOf(':');
        const key = line.substr(0, index).trim();
        const val = line.substr(index + 1).trim();
        info[key] = val;
      });
    delete info['Input File'];
    info['Sox Command'] = `sox
${path.basename(file)}${cFlag}
${path.basename(audioFile)}`.split('\n').join(' ');
    info['SHA-1'] = execSync(`shasum ${audioFile} | awk '{print $1}'`)
      .toString().trim();
    fs.writeFileSync(infoFile, JSON.stringify(info, null, '  '), 'utf-8');
    // build waveform
    execSync(`ffmpeg -y -i ${audioFile} -filter_complex \
"showwavespic=s=600x120:colors=white,negate[a];\
color=black:600x120[c];[c][a]alphamerge" ${waveformFile}`, {
      stdio: ['pipe', 'ignore', 'ignore']
    });
    // build spectrogram
    execSync(`sox ${audioFile} -n spectrogram -c "" -o ${spectrogramFile}`);
    // setup video
    if (frameCount >= videoFrameCount) {
      frameCount = 0;
    }
    if (frameCount === 0) {
      videos.push({
        frameStart: i,
        audioFile, infoFile, waveformFile, spectrogramFile,
        htmlFile, screenshotFile, info, frames: []
      });
    }
    lastVideo = videos[videos.length - 1];
    lastVideo.frames.push(screenshotFile);
    frameCount++;
    // build html
    nightmare = buildHtml(nightmare, dir, i, type, info, htmlFile, screenshotFile);
    // get ready for next loop
    if (info['SHA-1'] === sha1) {
      i = Number.MAX_VALUE;
    }
    file = audioFile;
    sha1 = info['SHA-1'];
  }
  // setup video for last frame
  const vid = {};
  Object.keys(lastVideo).forEach((key) => {
    vid[key] = lastVideo[key]
  });
  vid.frames = [ lastVideo.screenshotFile ];
  vid.frameStart = maxLoop;
  videos.push(vid);
  // handle cleanup and video creation
  nightmare.end().then((result) => {
    //  ffmpeg -y -i ./files/sine440/mp3_128.0/audio/1.mp3 -f image2 -start_number 1 -r 10 -i ./files/sine440/mp3_128.0/screenshot/%d.png -vframes 10 -vcodec mpeg4 ./ztest.mp4
    // create videos
    const vidFiles = [];
    videos.forEach((v, num) => {
      const vidFile = `${dir}video-${num + 1}.mp4`;
      const numFrames = videoFrameCount;
      const seconds = parseFloat(v.info.Duration.split(':')[2].split(' '));
      const fps = numFrames / seconds;
      vidFiles.push(vidFile);
      execSync(`ffmpeg -y -i ${v.audioFile} \
-f image2 -start_number ${v.frameStart} -r ${fps} \
-i ${dir}screenshot/%d.png \
-vframes ${numFrames} -vcodec mpeg4 ${vidFile}`);
    });
    const videoList = `file ${vidFiles.join('\nfile ')}`;
    const videoListPath = `${dir}video-all.txt`;
    fs.writeFileSync(videoListPath, videoList, 'utf-8');
    execSync(`ffmpeg -safe 0 -f concat -i ${videoListPath} -c copy ${dir}video-all.mp4`);
    execSync(`find . -type f -name 'video*.mp4' -not -name 'video-all.mp4' -delete`);
    execSync(`find . -type f -name 'video-all.txt' -delete`);
    const end = Date.now();
    const time = end - start;
    const finishedString = `Finished at ${Date(end)} in ${time}ms.`;
    fs.writeFileSync(
      finishedFile,
      finishedString,
      'utf-8'
    );
    const returnMessage = `${sampleName} / ${typeName} : ${finishedString}`;
    console.log(returnMessage);
    return cb(null, returnMessage);
  }).catch((error) => {
    return cb(error);
  });
}

function buildHtml(nightmare, dir, sampleNum, type, info, htmlFile, screenshotFile) {
  const htmlString = template({ sampleNum, type, info });
  const printMessage = `Screenshotting: ${htmlFile}`;
  fs.writeFileSync(htmlFile, htmlString, 'utf-8');
  return nightmare.goto(`file://${htmlFile}`)
    .wait(50)
    .evaluate((msg) => { console.log(msg); }, printMessage)
    .screenshot(screenshotFile, { x: 0, y: 0, width: 1200, height: 695 });
}

function checkPath(p, fnName) {
  let valid = false;
  try {
    const stats = fs.statSync(p);
    valid = stats[fnName]();
  } catch (error) {}
  return valid;
}
