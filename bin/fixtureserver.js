#!/usr/bin/env node
// binary glue code for creating a CLI application on top of our server module
const { argv } = require('yargs');
const fixtureserver = require('../index.js');

fixtureserver.start({
  docroot: argv.docroot,
  host: argv.host,
  port: argv.port,
});
