#!/usr/bin/env node
const async = require('async');
const childProcess = require('child_process');
const spawn = childProcess.spawn;
const execSync = childProcess.execSync;

const losslessTypes = ['8svx', 'aif', 'aifc', 'aiff', 'aiffc', 'al', 'amb',
  'au', 'avr', 'caf', 'flac', 'ircam', 'maud', 'nist', 'pvf', 'sb', 'sf', 'sln',
  'snd', 'sox', 'sph', 'sw',  'ub', 'ul', 'uw', 'w64', 'wav', 'wavpcm', 'wve'];

const lossyTypes = ['anb', 'gsm',
  'mp3_-0.0', 'mp3_-0.4', 'mp3_-0.9',
  'mp3_64.0', 'mp3_64.4', 'mp3_64.9',
  'mp3_128.0', 'mp3_128.4', 'mp3_128.9',
  'mp3_320.0', 'mp3_320.4', 'mp3_320.9',
  'ogg_-1', 'ogg_0', 'ogg_1',
  'ogg_2', 'ogg_3', 'ogg_4',
  'ogg_5', 'ogg_6', 'ogg_7',
  'ogg_8', 'ogg_9', 'ogg_10', 'voc'];

async.eachSeries(['sine440', 'loop01'], (sample, sampleCallback) => {
  async.eachSeries(lossyTypes, (type, cb) => {
    const cli = `${__dirname}/bin/cli.js`;
    const root = `${__dirname}/files/${sample}/`;
    const input = `${root}original.wav`;
    const script = spawn(cli, ['-r', root, '-i', input, '-t', type]);
    script.stdout.on('data', (data) => {
      console.log(`${data}`);
    });
    script.stderr.on('data', (data) => {
      console.error(`${data}`);
    });
    script.on('close', (code) => {
      cb(null, code);
    });
  }, sampleCallback);
}, () => {
  console.log('DONE!!!');
});
