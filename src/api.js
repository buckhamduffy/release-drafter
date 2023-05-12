const github = require('@actions/github')
const core = require('@actions/core')

const getLatestRelease = async () => {
  const octokit = getOctokit()

  core.debug('Getting latest release')

  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')

  if (!owner || !repo) {
    core.setFailed('Unable to get the owner and repo from GITHUB_REPOSITORY environment variable')
    return
  }

  const res = await octokit.rest.repos.getLatestRelease({
    owner,
    repo
  })

  return res.data.tag_name
}

const getOrCreateDraftRelease = async (releaseName, changelog) => {
  const draftRelease = await findDraftRelease()

  if (draftRelease) {
    updateDraftRelease(draftRelease, releaseName, changelog)

    return
  }

  createDraftRelease(releaseName, changelog)
}

const updateDraftRelease = async (draftRelease, releaseName, changelog) => {
  const octokit = getOctokit()
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')

  core.debug('Updating release')

  await octokit.rest.repos.updateRelease({
    owner,
    repo,
    release_id: draftRelease.id,
    name: releaseName,
    body: changelog,
    draft: true,
    make_latest: true
  })
}

const updateDraftReleaseToActualRelease = async (draftRelease, releaseName, changelog) => {
  const octokit = getOctokit()
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')

  core.debug('Updating release')

  await octokit.rest.repos.updateRelease({
    owner,
    repo,
    release_id: draftRelease.id,
    name: releaseName,
    tag_name: releaseName,
    body: changelog,
    draft: false
  })
}

const createDraftRelease = async (releaseName, changelog) => {
  const octokit = getOctokit()
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')

  core.debug('Creating release')

  await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: releaseName,
    name: releaseName,
    body: changelog,
    draft: true
  })
}

const createActualRelease = async (releaseName, changelog) => {
  const octokit = getOctokit()
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')

  core.debug('Creating release')

  await octokit.rest.repos.createRelease({
    owner,
    repo,
    tag_name: releaseName,
    name: releaseName,
    body: changelog,
    draft: false
  })
}

const findDraftRelease = async () => {
  const octokit = getOctokit()
  const [owner, repo] = (process.env.GITHUB_REPOSITORY || '').split('/')

  const releases = await octokit.rest.repos.listReleases({
    owner,
    repo
  })

  return releases.data.find((release) => {
    return release.draft === true
  })
}

const getOctokit = () => {
  const token = core.getInput('token') || process.env.GITHUB_TOKEN
  return github.getOctokit(token)
}

exports.getLatestRelease = getLatestRelease
exports.getOrCreateDraftRelease = getOrCreateDraftRelease
exports.findDraftRelease = findDraftRelease
exports.createDraftRelease = createDraftRelease
exports.updateDraftRelease = updateDraftRelease
exports.updateDraftReleaseToActualRelease = updateDraftReleaseToActualRelease
exports.createActualRelease = createActualRelease
