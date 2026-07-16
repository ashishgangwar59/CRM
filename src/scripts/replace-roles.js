const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const replaceInFiles = (dir) => {
  walkDir(dir, function(filePath) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('Super Admin')) {
        let newContent = content.replace(/Super Admin/g, 'KEY_ADMIN');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Updated', filePath);
      }
    }
  });
};

replaceInFiles('C:/Users/Ashish.Kumar/OneDrive - E2E Research Services PVT.LTD/Desktop/NewWebapp/CRM/src/app');
