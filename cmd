#!/usr/bin/env node

const { Console } = require('@rhinojs/console');
const BuildCommand = require('./src/cmds/build');

const cmd = new Console();

// Registrar comandos aqui...
cmd.command(new BuildCommand());

cmd.run();