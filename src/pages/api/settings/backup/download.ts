import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";

function checkAuth(req: NextApiRequest) {
  const token = req.cookies?.accessToken;
  if (!token) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any;
    if (!payload || !payload.userId) return null;

    const role = (payload.role || "").toUpperCase().replace("_", "");
    if (role !== "KEYADMIN" && role !== "ADMIN") return null;

    return payload;
  } catch (e) {
    return null;
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const authorized = checkAuth(req);
  if (!authorized) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { file } = req.query;
  if (!file || typeof file !== "string" || !file.endsWith(".zip")) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  // Backup files are stored in the server's root 'backups' folder (not public) to protect them
  const backupsDir = path.join(process.cwd(), "backups");
  const filePath = path.join(backupsDir, file);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Backup file not found or expired" });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${file}"`);
  res.setHeader("Content-Length", fs.statSync(filePath).size);

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);

  // Optionally delete it after download to save disk space
  stream.on("end", () => {
    try {
      fs.unlinkSync(filePath);
    } catch (e) { }
  });
}
