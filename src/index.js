const github = require('@actions/github')
const core = require('@actions/core')
const {
  getOrCreateDraftRelease,
  findDraftRelease,
  updateDraftReleaseToActualRelease,
  createActualRelease
} = require('./api')
const { installCog, getNextRelease, generateChangelogBetween, bumpRelease, generateChangelogAt } = require('./cog')
const { setupGitUser, pushWithTags, ensureBranchFetched } = require('./git')
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
  await ensureBranchFetched(masterBranch)
  await ensureBranchFetched(stagingBranch)

  const nextRelease = await getNextRelease()

  core.setOutput('version', nextRelease)
  core.debug('Next release: ' + nextRelease)

  const changelog = await generateChangelogBetween(masterBranch, 'HEAD')

  core.debug('Upserting draft release')
  await getOrCreateDraftRelease(nextRelease, changelog)
}

async function generateActualRelease () {
  const history = await commitlintRead({ from: 'HEAD~1', to: 'HEAD' })
  const prRe = new RegExp('Merge pull request #\\d+ from \\w+\\/' + stagingBranch)
  const mergeRe = new RegExp('Merge branch \'' + stagingBranch + '\'')
  const isStagingMerge = prRe.test(history[0]) || mergeRe.test(history[0])

  await setupGitUser()
  const version = await bumpRelease()
  await pushWithTags(masterBranch)
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
