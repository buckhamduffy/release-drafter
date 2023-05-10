const exec = require('@actions/exec');
const core = require('@actions/core');
const {downloadAndExtract} = require("./installer");
const {c} = require("tar");

const version = '5.3.1'
const tar = `cocogitto-${version}-x86_64-unknown-linux-musl.tar.gz`
const bin_dir = `${process.env.HOME}/.local/bin`

exports.installCog = async () => {
    try {
        await downloadAndExtract(
            `https://github.com/cocogitto/cocogitto/releases/download/${version}/${tar}`,
            bin_dir
        )
    } catch (e) {
        core.setFailed(e.message)
    }

    core.addPath(bin_dir)
}

exports.getNextRelease = async () => {
    let release = ''

    try {
        await exec.exec(
            `${bin_dir}/cog`,
            ['bump', '--dry-run', '--auto'],
            {
                listeners: {
                    stdout: (data) => {
                        release = data.toString()
                    }
                }
            }
        )
    } catch (e) {
        core.setFailed(e.message)
    }

    core.debug("new release output: " + release)

    return release
}

exports.generateChangelog = async (from, to) => {
    let changelog = 'test'

    try {
        await exec.exec(
            `${bin_dir}/cog`,
            [
                'changelog',
                from + '..' + to,
            ],
            {
                listeners: {
                    stdout: (data) => {
                        changelog += data.toString()
                    },
                    stderr: (data) => {
                        core.debug(data.toString())
                    }
                }
            }
        )
    } catch (e) {
        core.setFailed(e.message)
    }

    return changelog
}

