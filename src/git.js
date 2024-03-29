const exec = require('@actions/exec')
const core = require('@actions/core')
const { c } = require('tar')

class Git {
  isUserSetup = false

  async setupGitUser () {
    if (this.isUserSetup) {
      return
    }

    core.debug('Setting up git user')
    await exec.exec('git', ['config', 'user.name', 'BuckhamDuffyBot'])
    await exec.exec('git', ['config', 'user.email', 'buckhamduffybot+69223181@users.noreply.github.com'])
    await exec.exec('git', ['config', '--global', 'user.email', 'buckhamduffybot+69223181@users.noreply.github.com'])
    await exec.exec('git', ['config', '--global', 'user.name', 'BuckhamDuffyBot'])

    this.isUserSetup = true
  }

  async pushWithTags (branch) {
    await this.setupGitUser()

    core.debug('Pushing branch with tags')
    await exec.exec('git', ['push', '--tags'])
    await exec.exec('git', ['push', 'origin', branch])
  }

  async ensureBranchFetched (branch) {
    try {
      await exec.exec('git', ['fetch', '--all'])
      await exec.exec('git', ['fetch', 'origin', branch + ':' + branch])
    } catch (e) {
      console.log(e)
    }
  }

  async rebaseOntoBranch (branch) {
    await this.setupGitUser()
    await this.ensureBranchFetched(branch)

    await exec.exec('git', ['rebase', '-Xtheirs', 'origin/' + branch])
  }

  async checkoutBranch (branch) {
    await this.setupGitUser()

    try {
      await exec.exec('git', ['checkout', '-b', branch, 'origin/' + branch])
    } catch (e) {
      console.log(e)
    }

    try {
      await exec.exec('git', ['checkout', branch])
    } catch (e) {
      console.log(e)
    }
  }
}

exports.Git = new Git()
