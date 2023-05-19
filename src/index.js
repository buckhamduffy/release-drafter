const github = require('@actions/github')
const core = require('@actions/core')
const {
  getOrCreateDraftRelease,
  findDraftRelease,
  updateDraftReleaseToActualRelease,
  createActualRelease, getLatestRelease
} = require('./api')
const { installCog, getNextRelease, generateChangelogBetween, bumpRelease, generateChangelogAt } = require('./cog')
const { Git } = require('./git')
const commitlintRead = require('@commitlint/read').default

const currentBranch = github.context.ref?.replace('refs/heads/', '') || 'staging'
const masterBranch = core.getInput('master_branch') || 'master'
const stagingBranch = core.getInput('staging_branch') || 'staging'
const action = core.getInput('action') || 'release'

async function run () {
  await installCog()

  if (currentBranch === masterBranch) {
    switch (action) {
      case 'rebase':
        await rebaseStagingOntoMaster()
        break
      case 'release':
      default:
        await generateActualRelease()
        break
    }

    return
  }

  if (currentBranch === stagingBranch) {
    switch (action) {
      case 'release':
      default:
        await generateDraftRelease()
        break
    }

    return
  }

  core.setFailed(`This action can only be run on the ${masterBranch} or ${stagingBranch} branch, but this is ${currentBranch}`)
  process.exit(1)
}

async function generateDraftRelease () {
  await Git.ensureBranchFetched(masterBranch)
  await Git.rebaseOntoBranch(masterBranch)

  const latestRelease = await getLatestRelease()
  const nextRelease = await getNextRelease()

  core.setOutput('version', nextRelease)
  core.debug('Next release: ' + nextRelease)
  core.debug('Last release: ' + latestRelease)

  const changelog = await generateChangelogBetween(latestRelease, 'HEAD')

  core.debug('Upserting draft release')
  await getOrCreateDraftRelease(nextRelease, changelog)
}

async function generateActualRelease () {
  const history = await commitlintRead({ from: 'HEAD~1', to: 'HEAD' })
  const prRe = new RegExp('Merge pull request #\\d+ from \\w+\\/' + stagingBranch)
  const mergeRe = new RegExp('Merge branch \'' + stagingBranch + '\'')
  const isStagingMerge = prRe.test(history[0]) || mergeRe.test(history[0])

  const version = await bumpRelease()
  await Git.pushWithTags(masterBranch)
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

const rebaseStagingOntoMaster = async () => {
  await Git.checkoutBranch(stagingBranch)
  await Git.rebaseOntoBranch(masterBranch)
  await Git.pushWithTags(stagingBranch)
}

run()
