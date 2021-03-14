#!/usr/bin/env node

const prompts = require('prompts');
const util = require('util');
const path = require('path');
const exec = util.promisify(require('child_process').exec);
const { spawn } = require('promisify-child-process');
const logger = require('../src/lib/logger');
const { renameSync, readFileSync, unlinkSync, writeFileSync } = require('fs');

const dir = () => path.resolve('.');
const dirname = () => path.basename(dir());

const getRepos = async () => {
    let { stdout, stderr } = await exec('gh api /user');
    let user; 

    if (stderr) throw new Error(stderr);
    try {
        user = JSON.parse(stdout);
    } catch (e) {
        throw e;
    }

    ({ stdout, stderr } = await exec('gh api /user/orgs'));

    if (stderr) throw new Error(stderr);
    try {
        const orgs = JSON.parse(stdout);
        return [user, ...orgs];
    } catch (e) {
        throw e;
    }
}

const makeRepo = async (name) => {
    logger.info`Creating repository ${name} in ${dir()}`;
    return spawn('gh', ['repo', 'create', name], { cwd: dir(), stdio: 'inherit' });;
}

const cloneRepo = async (name) => {
    return spawn('gh', ['repo', 'clone', name, '.'], {cwd: dir(), stdio: 'inherit' });
}

const addRemote = async (org, name) => {
    try {
        await spawn('git', ['remote', 'remove', 'origin'], {cwd: dir(), stdio: 'inherit' });
    } catch (e) {
    }
    try {
        await spawn('git', ['remote', 'add', 'template', `git@github.com:state-less/create-react-server.git`], {cwd: dir(), stdio: 'inherit' });
    } catch (e) {

    }
    await spawn('git', ['remote', 'add', 'origin', `git@github.com:${name}.git`], {cwd: dir(), stdio: 'inherit' });
    await spawn('git', ['fetch', 'template'], {cwd: dir(), stdio: 'inherit' });
    await spawn('git', ['reset', '--hard', 'template/template'], {cwd: dir(), stdio: 'inherit' });
    return true;     
}

(async () => {
    logger.info`Initializing git repository.`;

    const { selectOrg } = await prompts([{
        type: 'confirm',
        name: 'createRepo',
        message: 'Do you want to create a repository on github?',
        initial: true,
    },{
        type: prev => prev === true ? 'confirm' : null,
        name: 'selectOrg',
        message: 'Do you want to choose a organization?',
        initial: false
    }]);


    let selectedOrg = '', repos = [];
    if (selectOrg) {
        repos = await getRepos();
        const choices = repos.map(({ login, description }) => ({ title: login, description }));

        const { organization } = await prompts({
            type: 'select',
            name: 'organization',
            message: 'Select an organization',
            choices,
            initial: 0
        });

        selectedOrg = organization;
    }

    const { repo } = await prompts({
        type: 'text',
        name: 'repo',
        message: 'Choose a repository name',
        initial: dirname()
    });

    const fullRepo = `${repos[selectedOrg].login}/${repo}`
    try {
        await makeRepo(fullRepo);
    } catch (e) {
        // process.exit(1);
        logger.error`Error creating repository ${repo}: ${e}`;
        
    }
    try {
        logger.info`Cloning repository ${fullRepo}`;
        await cloneRepo(fullRepo);
    } catch (e) {
        logger.error`Error creating repository ${repo}: ${e}`;
    }

    logger.info`Adding remote repository url '${fullRepo}'.`;
    await addRemote(fullRepo);

    logger.info`Creating environment file from template.`
    renameSync('./.env.template', './.env');
    try {
        logger.warning`Deleting 'README.md'.`
        unlinkSync('./README.md');
    } catch (e) {

    }

    logger.info`Renaming 'BLANK_README.md' => 'README.md'`
    renameSync('./BLANK_README.md', './README.md');

    
    let text = readFileSync('./README.md');
    text = text.toString().replace(/repo_name/g, repo)
    text = text.toString().replace(/repo_org/g, selectedOrg)

    logger.info`Populating placeholders in 'README.md'`
    writeFileSync('./README.md', text);
    // console.log (dirname())
})();