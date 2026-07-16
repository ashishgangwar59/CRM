import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function walkDir(dir: string, callback: (path: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

export async function GET() {
  const updatedFiles: string[] = [];
  walkDir('C:/Users/Ashish.Kumar/OneDrive - E2E Research Services PVT.LTD/Desktop/NewWebapp/CRM/src/app', function(filePath) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('KEY_ADMIN')) {
        let newContent = content.replace(/KEY_ADMIN/g, 'KEY_ADMIN');
        fs.writeFileSync(filePath, newContent, 'utf8');
        updatedFiles.push(filePath);
      }
    }
  });

  return NextResponse.json({ updatedFiles });
}
