import { createRequire } from 'module'
import * as github from '@actions/github'
import * as core from '@actions/core'
import {
  getOrCreateDraftRelease,
  findDraftRelease,
  updateDraftReleaseToActualRelease,
  createActualRelease, getLatestRelease
} from './api.js'
import { installCog, getNextRelease, generateChangelogBetween, bumpRelease, generateChangelogAt } from './cog.js'
import { Git } from './git.js'
import commitlintRead from '@commitlint/read'

// ncc's ESM output leaves some external builtins using bare require.
globalThis.require = createRequire(import.meta.url)

const ref = github.context.payload?.workflow_run?.head_branch || process.env.GITHUB_REF || github.context.ref || ''
const currentBranch = ref.replace('refs/heads/', '')
const masterBranch = core.getInput('master_branch') || 'master'
const stagingBranch = core.getInput('staging_branch') || 'staging'
const action = core.getInput('action') || 'release'

async function run () {
  await installCog()

  if (!currentBranch) {
    core.setFailed('Could not determine current branch')
    process.exit(1)
  }

  core.debug('context: ' + JSON.stringify(github.context, null, 2))

  if (currentBranch === masterBranch) {
    core.info('Current branch is master [' + currentBranch + ']')

    switch (action) {
      case 'rebase':
        core.info('Rebasing staging onto master')
        await rebaseStagingOntoMaster()
        break
      case 'release':
      default:
        core.info('Generating actual release')
        await generateActualRelease()
        break
    }

    return
  }

  if (currentBranch === stagingBranch) {
    core.info('Current branch is staging [' + currentBranch + ']')

    switch (action) {
      case 'release':
      default:
        core.info('Generating draft release')
        await generateDraftRelease()
        break
    }

    return
  }

  core.setFailed(`This action can only be run on the ${masterBranch} or ${stagingBranch} branch, but this is ${currentBranch}`)
  process.exit(1)
}

async function generateDraftRelease () {
  await Git.checkoutBranch(stagingBranch)
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
  await Git.setupGitUser()

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
