const exec = require('@actions/exec');
const core = require('@actions/core');
const fs = require('fs');
const https = require('https');
const {downloadAndExtract} = require("./installer");

const version = '5.3.1'
const tar = `cocogitto-${version}-x86_64-unknown-linux-musl.tar.gz`
const bin_dir = `${process.env.HOME}/.local/bin`

exports.installCog = async () => {
    await downloadAndExtract(
        `https://github.com/cocogitto/cocogitto/releases/download/${version}/${tar}`,
        bin_dir
    )

    core.addPath(bin_dir)
}

exports.getNextRelease = async () => {
    let release = ''
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

    core.debug("new release output: " + release)

    return release
}

exports.generateChangelog = async (from, to) => {
    await exec.exec(
        `${bin_dir}/cog`,
        [
            'changelog',
            from + '..' + to,
            '>',
            'changelog.tmp'
        ]
    )

    const changelog = fs.readFileSync('changelog.tmp', 'utf8')

    fs.rmSync('changelog.tmp')

    return changelog
}

