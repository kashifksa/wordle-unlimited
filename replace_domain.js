const fs = require('fs');
const path = require('path');

const directory = './';
const searchRegex = /wordleunlimited\.info/g;
const replaceString = 'wordle-unlimited.app';

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.match(searchRegex)) {
        content = content.replace(searchRegex, replaceString);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function traverseDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== '.git') {
                traverseDirectory(fullPath);
            }
        } else {
            if (fullPath.endsWith('.html') || fullPath.endsWith('.xml') || fullPath.endsWith('.txt') || fullPath.endsWith('.js') || fullPath.endsWith('.json')) {
                replaceInFile(fullPath);
            }
        }
    }
}

traverseDirectory(directory);
console.log('Done.');
