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

const name = process.argv[2];

if (!name) {
  logger.error`No foldername was provided`
  process.exit(0);
}

const dir = () => path.resolve(`./${name}`);
const baseName = () => path.basename(dir());

if (!existsSync(dir())) {
  mkdirSync(dir());
}

logger.info`Creating new project in folder '${dir()}'`

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
    await spawn("git", ["init"], {
      cwd: dir(),
      stdio: "inherit",
    });
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

let selectedRepo = baseName();
(async () => {
  logger.info`Initializing git repository.`;
  let selectedOrg = "",
    repos;

  try {
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
        initial: baseName(),
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
    if (existsSync(`${dir()}/.env.template`)) rename(`${dir()}/.env.template`, `${dir()}/.env`);
    try {
      logger.warning`Deleting 'README.md'.`;
      unlinkSync(`${dir()}/README.md`);
    } catch (e) {}

    if (existsSync(`${dir()}/BLANK_README.md`))
      rename(`${dir()}/BLANK_README.md`, `${dir()}/README.md`);

    if (createRepo || selectOrg) {
      let text = readFileSync(`${dir()}/README.md`);

      if (createRepo) text = text.toString().replace(/repo_name/g, repo);
      if (selectOrg) text = text.toString().replace(/repo_org/g, selectedOrg);

      logger.info`Populating placeholders in 'README.md'`;
      writeFileSync(`${dir()}/README.md`, text);
    }

    
    updatePackage();
    logger.info`Project initialized. Installing dependencies.`;
    
    console.log ("dir");
    await spawn(
      "npm",
      ["install"],
      { cwd: dir(), stdio: "inherit", shell: true }
    );

    logger.info`Dependencies installed. You can start the server now.`
    logger.info`
Success! Created backend at ${dir()}
Inside that directory, you can run several commands:

  npm start
    Starts the development server.

  npm run build
    Builds the app..

We suggest that you begin by typing:

  cd frontend
  npm start

Happy hacking!
`

  } catch (e) {
    logger.error`Error ${e} in main procedure.`;
  }
})();

const updatePackage = () => {
  logger.info`Updating name in package.json`;
  const packageJSON = readFileSync(`./${name}/package.json`);

  const json = JSON.parse(packageJSON);
  json.name = selectedRepo;

  writeFileSync("./package.json", JSON.stringify(json));
}

const rename = (from, to) => {
  logger.info`Renaming '${from}' => '${to}'`;
  renameSync(from, to);
};
