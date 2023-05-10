const fs = require('fs');
const path = require('path');
const tar = require('tar');
const https = require("https");

exports.downloadAndExtract = async (url, targetDir) => {
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir);
    }

    await downloadFile(url, path.join(targetDir, 'file.tar.gz'));

    await extractFile(
        path.join(targetDir, 'file.tar.gz'),
        targetDir
    )
}

const extractFile = async (inputPath, targetDir) => {
    return new Promise(async (resolve, reject) => {
        try {
            await tar.x({
                file: inputPath,
                cwd: targetDir,
            });

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

const downloadFile = async (url, outputPath) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);

        https
            .get(url, (response) => {
                response.pipe(file);
                file.on('finish', () => {
                    file.close(resolve);
                });
            })
            .on('error', (error) => {
                fs.unlink(outputPath, () => {
                });
                reject(error);
            });
    });
}