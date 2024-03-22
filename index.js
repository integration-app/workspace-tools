#!/usr/bin/env node

const { program } = require('commander');
const { exportPackage } = require('./src/commands/exportPackage')
const { importPackage } = require('./src/commands/importPackage')


program
    .command('export')
    .description('Export Workspace as a package')
    .action(exportPackage)

program
    .command('import')
    .description('Export Workspace as a package')
    .action(importPackage)


program.parse(process.argv);