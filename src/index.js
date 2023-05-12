const github = require('@actions/github')
const core = require('@actions/core')
const {
  getLatestRelease, getOrCreateDraftRelease, findDraftRelease,
  updateDraftReleaseToActualRelease, createActualRelease
} = require('./api')
const { installCog, getNextRelease, generateChangelogBetween, bumpRelease, generateChangelogAt } = require('./cog')
const { setupGitUser, pushWithTags } = require('./git')
const commitlintRead = require('@commitlint/read').default

const currentBranch = github.context.ref?.replace('refs/heads/', '') || 'staging'
const masterBranch = core.getInput('master_branch') || 'master'
const stagingBranch = core.getInput('staging_branch') || 'staging'

async function run () {
  await installCog()

  if (currentBranch === masterBranch) {
    await generateActualRelease()
  } else if (currentBranch === stagingBranch) {
    await generateDraftRelease()
  } else {
    core.setFailed(`This action can only be run on the ${masterBranch} or ${stagingBranch} branch, but this is ${currentBranch}`)
    process.exit(1)
  }
}

async function generateDraftRelease () {
  const latestRelease = await getLatestRelease() || 'master'
  const nextRelease = await getNextRelease()

  core.setOutput('version', nextRelease)
  core.debug('Latest release: ' + latestRelease)
  core.debug('Next release: ' + nextRelease)

  const changelog = await generateChangelogBetween(latestRelease, 'HEAD')

  core.debug('Upserting draft release')
  await getOrCreateDraftRelease(nextRelease, changelog)
}

async function generateActualRelease () {
  const history = await commitlintRead({ from: 'HEAD~1', to: 'HEAD' })
  const re = new RegExp('Merge pull request #\\d+ from \\w+\\/' + stagingBranch)
  const isStagingMerge = re.test(history[0])

  await setupGitUser()
  const version = await bumpRelease()
  await pushWithTags()
  const changelog = await generateChangelogAt(version)

  core.setOutput('version', version)

  if (isStagingMerge) {
    const draftRelease = await findDraftRelease()
    if (draftRelease) {
      await updateDraftReleaseToActualRelease(draftRelease, version, changelog)

      return
    }
  }

  await createActualRelease(version, changelog)
}

run()
