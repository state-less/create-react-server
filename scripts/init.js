#!/usr/bin/env node

const prompts = require("prompts");
const util = require("util");
const path = require("path");
const exec = util.promisify(require("child_process").exec);
const { spawn } = require("promisify-child-process");
const logger = require("../src/lib/logger");
const {
  renameSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
  fstat,
  existsSync,
  mkdirSync
} = require("fs");
const commandExists = require("command-exists");


const [,, installDir] = process.argv;
const dir = () => path.resolve(`./${installDir}`);
const dirname = () => path.basename(dir());

const getRepos = async () => {
  try {
    let { stdout, stderr } = await exec("gh api /user");
    let user;

    if (stderr) throw new Error(stderr);
    try {
      user = JSON.parse(stdout);
    } catch (e) {
      throw e;
    }

    ({ stdout, stderr } = await exec("gh api /user/orgs"));

    if (stderr) throw new Error(stderr);
    try {
      const orgs = JSON.parse(stdout);
      return [user, ...orgs];
    } catch (e) {
      throw e;
    }
  } catch (e) {
    logger.error`It appears you don't have 'gh' installed. Please install 'gh' (choco install gh). \n ${e}`;
    throw e;
  }
};

const initRepo = async () => {
  logger.info`Initializing repository`;
  try {
    await spawn("git", ["init"]);
  } catch (e) {
    logger.error`Error initializing repository`;
  }
};

const createRepository = async (name) => {
  return spawn("gh", ["repo", "create", name, "-y"], {
    cwd: dir(),
    stdio: "inherit",
  });
};

const cloneRepo = async (name) => {
  return spawn("gh", ["repo", "clone", name, "."], {
    cwd: dir(),
    stdio: "inherit",
  });
};

const addTemplate = async (org, name) => {
  try {
    try {
      await spawn("git", ["remote", "remove", "clean-code"], {
        cwd: dir(),
        stdio: "inherit",
      });
    } catch (e) {}
    await spawn(
      "git",
      [
        "remote",
        "add",
        "clean-code",
        `git@github.com:state-less/clean-starter.git`,
      ],
      { cwd: dir(), stdio: "inherit" }
    );

    await spawn("git", ["fetch", "--all"], {
      cwd: dir(),
      stdio: "inherit",
    });
    await spawn("git", ["checkout", "clean-code/react-server", "*"], {
      cwd: dir(),
      stdio: "inherit",
    });
    await spawn("git", ["remote", "remove", "clean-code"], {
      cwd: dir(),
      stdio: "inherit",
    });
  } catch (e) {}
};

const addRemoteOrigin = async (name) => {
  await spawn(
    "git",
    ["remote", "add", "origin", `git@github.com:${name}.git`],
    { cwd: dir(), stdio: "inherit" }
  );
  return true;
};

const features = ["gh", "git", "asdqwe"];

const detectFeatures = async () => {
  const result = {};
  for (const key of features) {
    try {
      await commandExists(key);
      result[key] = true;
    } catch (e) {
      result[key] = false;
    }
  }
  return result;
};

let selectedRepo = dirname();
(async () => {
  logger.info`Initializing git repository.`;
  let selectedOrg = "",
    repos;

  try {
    mkdirSync(dirname);
    const features = await detectFeatures();
    if (!features.gh) {
      logger.warning`'gh' is not installed. Skipping repo creation.`;
    } else {
      var { selectOrg, createRepo } = await prompts([
        {
          type: "confirm",
          name: "createRepo",
          message: "Do you want to create a repository on github?",
          initial: true,
        },
        {
          type: (prev) => (prev === true ? "confirm" : null),
          name: "selectOrg",
          message: "Do you want to choose a organization?",
          initial: false,
        },
      ]);
    }

    if (selectOrg) {
      try {
        repos = await getRepos();
      } catch (e) {
        process.exit(1);
      }
      const choices = repos.map(({ login, description }) => ({
        title: login,
        description,
      }));

      const { organization } = await prompts({
        type: "select",
        name: "organization",
        message: "Select an organization",
        choices,
        initial: 0,
      });

      selectedOrg = organization;

      const { repo } = await prompts({
        type: "text",
        name: "repo",
        message: "Choose a repository name",
        initial: dirname(),
      });
      selectedRepo = repo;

      const fullRepo = `${repos[selectedOrg].login}/${repo}`;
      try {
        if (features.gh) await createRepository(fullRepo);
        else logger.warning`gh not installed. Skipping repository creation.`;
      } catch (e) {
        // process.exit(1);
        logger.error`Error creating repository ${repo}: ${e}`;
      }

      try {
        logger.info`Adding remote repository url '${fullRepo}'.`;
        await addTemplate();
        await addRemote(fullRepo);
      } catch (e) {
        logger.error`Error adding remote repository ${repo}: ${e}`;
      }
    } else {
      await initRepo();
      await addTemplate();
    }
    // try {
    //     logger.info`Cloning repository ${fullRepo}`;
    //     await cloneRepo(fullRepo);
    // } catch (e) {
    //     logger.error`Error creating repository ${repo}: ${e}`;
    // }

    logger.info`Creating environment file from template.`;
    if (existsSync("./.env.template")) rename("./.env.template", "./.env");
    try {
      logger.warning`Deleting 'README.md'.`;
      unlinkSync("./README.md");
    } catch (e) {}

    if (existsSync("./BLANK_README.md"))
      rename("./BLANK_README.md", "./README.md");

    if (createRepo || selectOrg) {
      let text = readFileSync("./README.md");

      if (createRepo) text = text.toString().replace(/repo_name/g, repo);
      if (selectOrg) text = text.toString().replace(/repo_org/g, selectedOrg);

      logger.info`Populating placeholders in 'README.md'`;
      writeFileSync("./README.md", text);
    }

    logger.info`Updating name in package.json`;
    const packageJSON = readFileSync("./package.json");
    const json = JSON.parse(packageJSON);
    json.name = selectedRepo;
    writeFileSync("./package.json", JSON.stringify(json));
    logger.info`Project initialized.`;
    logger.info`npm i`;
  } catch (e) {
    logger.error`Error ${e} in main procedure.`;
  }
})();

const rename = (from, to) => {
  logger.info`Renaming '${from}' => '${to}'`;
  renameSync(from, to);
};
