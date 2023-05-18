const exec = require('@actions/exec')
const core = require('@actions/core')

const setupGitUser = async () => {
  core.debug('Setting up git user')
  await exec.exec('git', ['config', 'user.name', 'github-actions'])
  await exec.exec('git', ['config', 'user.email', 'github-actions@github.com'])
  await exec.exec('git', ['config', '--global', 'user.email', 'github-actions@github.com'])
  await exec.exec('git', ['config', '--global', 'user.name', 'github-actions'])
}

const pushWithTags = async (branch) => {
  await setupGitUser()

  core.debug('Pushing branch with tags')
  await exec.exec('git', ['push', '--tags'])
  await exec.exec('git', ['push', 'origin', branch])
}

const ensureBranchFetched = async (branch) => {
  await exec.exec('git', ['fetch', 'origin', branch + ':' + branch])
}

const rebase = async (branch) => {
  await setupGitUser()

  await exec.exec('git', ['rebase', '-Xtheirs', 'origin/' + branch])
}

exports.setupGitUser = setupGitUser
exports.pushWithTags = pushWithTags
exports.ensureBranchFetched = ensureBranchFetched
exports.rebase = rebase
