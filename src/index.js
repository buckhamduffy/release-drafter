const github = require('@actions/github');
const core = require('@actions/core');
const {getLatestRelease, getOrCreateDraftRelease} = require("./api");
const {installCog, getNextRelease, generateChangelog} = require("./cog");

// most @actions toolkit packages have async methods
async function run() {
    installCog();

    const latestRelease = await getLatestRelease()
    const nextRelease = await getNextRelease()

    core.debug("Latest release: " + latestRelease)
    core.debug("Next release: " + nextRelease)

    const changelog = await generateChangelog(latestRelease, 'HEAD')

    core.debug("Upserting draft release")
    await getOrCreateDraftRelease(nextRelease, changelog)
}

run();

