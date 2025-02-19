'use strict';

const process = require('process');
const {resolve: resolvePath} = require('path');
const {once} = require('events');
const {pathToFileURL} = require('url');

const glob = require('glob');
const fullstore = require('fullstore');
const tryToCatch = require('try-to-catch');
const keypress = require('@putout/cli-keypress');

const {simpleImport} = require('./simple-import');
const {parseArgs, yargsOptions} = require('./cli/parse-args');

const supertape = require('..');
const {
    OK,
    FAIL,
    WAS_STOP,
    UNHANDLED,
    INVALID_OPTION,
    SKIPED,
} = require('./exit-codes');

const isExclude = (a) => !a.includes('node_modules');
const removeDuplicates = (a) => Array.from(new Set(a));

const filesCount = fullstore(0);

const {SUPERTAPE_CHECK_SKIPED = '0'} = process.env;

module.exports = async ({argv, cwd, stdout, stderr, exit, isStop, workerFormatter}) => {
    isStop = isStop || keypress().isStop;
    
    const [error, result] = await tryToCatch(cli, {
        argv,
        cwd,
        stdout,
        exit,
        isStop,
        workerFormatter,
    });
    
    if (error) {
        stderr.write(error.stack);
        return exit(UNHANDLED);
    }
    
    const {
        failed,
        code,
        message,
        skiped,
    } = result;
    
    if (Number(SUPERTAPE_CHECK_SKIPED) && skiped)
        return exit(SKIPED);
    
    if (failed)
        return exit(FAIL);
    
    if (code === INVALID_OPTION) {
        stderr.write(`${message}\n`);
        return exit(code);
    }
    
    if (isStop())
        return exit(WAS_STOP);
    
    return exit(OK);
};

async function cli({argv, cwd, stdout, isStop, workerFormatter}) {
    const args = parseArgs(argv);
    
    if (args.version) {
        stdout.write(`v${require('../package').version}\n`);
        return OK;
    }
    
    if (args.help) {
        const {help} = await import('./help.js');
        stdout.write(help());
        
        return OK;
    }
    
    const validateArgs = require('@putout/cli-validate-args');
    
    const error = await validateArgs(args, [
        ...yargsOptions.boolean,
        ...yargsOptions.string,
    ]);
    
    if (error)
        return {
            code: INVALID_OPTION,
            message: error.message,
        };
    
    for (const module of args.require)
        await import(module);
    
    const allFiles = [];
    
    for (const arg of args._) {
        const files = glob
            .sync(arg)
            .filter(isExclude);
        
        allFiles.push(...files);
    }
    
    const {
        format,
        checkDuplicates,
        checkScopes,
        checkAssertionsCount,
    } = args;
    
    supertape.init({
        run: false,
        quiet: true,
        format,
        isStop,
        checkDuplicates,
        checkScopes,
        checkAssertionsCount,
        workerFormatter,
    });
    
    const stream = await supertape.createStream();
    
    stream.pipe(stdout);
    
    const promises = [];
    const files = removeDuplicates(allFiles);
    
    for (const file of files) {
        // always resolve before import for windows
        const resolved = pathToFileURL(resolvePath(cwd, file));
        promises.push(simpleImport(resolved));
    }
    
    filesCount(files.length);
    
    if (!promises.length)
        return OK;
    
    await Promise.all(promises);
    const [result] = await once(supertape.run(), 'end');
    
    return result;
}

module.exports._filesCount = filesCount;
