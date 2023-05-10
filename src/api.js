const github = require('@actions/github');
const core = require('@actions/core');

exports.getLatestRelease = async () => {
    const octokit = getOctokit()

    core.debug("Getting latest release")

    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');

    if (!owner || !repo) {
        core.setFailed('Unable to get the owner and repo from GITHUB_REPOSITORY environment variable');
        return;
    }

    const res = await octokit.rest.repos.getLatestRelease({
        owner,
        repo,
    });

    return res.data.tag_name
}

exports.getOrCreateDraftRelease = async (releaseName, changelog) => {
    let draftRelease = await findDraftRelease()

    if (draftRelease) {
        updateDraftRelease(draftRelease, releaseName, changelog)

        return
    }

    createDraftRelease(releaseName, changelog)
}

const updateDraftRelease = async (draftRelease, releaseName, changelog) => {
    const octokit = getOctokit()
    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');

    core.debug("Updating release")

    await octokit.rest.repos.updateRelease({
        owner,
        repo,
        release_id: draftRelease.id,
        name: releaseName,
        body: changelog,
        draft: true,
    })
}

const createDraftRelease = async (releaseName, changelog) => {
    const octokit = getOctokit()
    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');

    core.debug("Creating release")

    await octokit.rest.repos.createRelease({
        owner,
        repo,
        tag_name: releaseName,
        name: releaseName,
        body: changelog,
        draft: true,
    });
}

const findDraftRelease = async () => {
    const octokit = getOctokit()
    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/');

    const releases = await octokit.rest.repos.listReleases({
        owner,
        repo,
    }).data

    return releases.find((release) => {
        return release.draft === true
    })
}

const getOctokit = () => {
    const token = process.env.GITHUB_TOKEN;
    return github.getOctokit(token);
}
