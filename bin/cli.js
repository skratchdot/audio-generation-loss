#!/usr/bin/env node
var buildFiles = require('../lib/index.js');
var appInfo = require('../package.json');
var program = require('commander');

program
  .version(appInfo.version, '-v, --version')
  .option('-r, --root <root>', 'The directory where files will be written')
  .option('-i, --input <input>', 'The input audio file')
  .option('-t, --type <type>', 'The type of audio files to be generated')
  .parse(process.argv);

['root', 'input', 'type'].forEach((key) => {
  const val = program[key];
  if (typeof val !== 'string' || val.length === 0) {
    console.error(`  Invalid --${key} option.`);
    process.exit(0);
  }
});

const { root, input, type } = program;
buildFiles(root, input, type, (err, msg) => {
  if (err) {
    console.error(`  ${err.message}`);
  } else {
    console.log(msg);
  }
  process.exit(0);
});
