import { google } from "googleapis";
import https from "https";

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  thumbnailLink?: string;
  width?: number;
  height?: number;
}

// Initialize the Google Drive API client using Service Account credentials
export function getDriveClient() {
  const serviceAccountKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKeyRaw) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable. Please configure it in your .env file."
    );
  }

  try {
    const credentials = JSON.parse(serviceAccountKeyRaw);
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
    }

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    return google.drive({ version: "v3", auth });
  } catch (error: any) {
    throw new Error(`Failed to initialize Google Drive Client: ${error.message}`);
  }
}

// Fetch standard Google Drive folder as secondary fallback
function fetchStandardDriveFolder(folderId: string): Promise<{ folderName: string; files: GoogleDriveFile[] }> {
  return new Promise((resolve, reject) => {
    const url = `https://drive.google.com/drive/folders/${folderId}`;
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (res.headers.location.includes("accounts.google.com")) {
            return reject(
              new Error(
                "Thư mục Google Drive chưa được mở chia sẻ công khai. Vui lòng vào Google Drive > Nhấp chuột phải vào thư mục > Chọn 'Chia sẻ' > Đổi thành 'Bất kỳ ai có đường liên kết đều có thể xem'."
              )
            );
          }
        }

        if (res.statusCode === 404) {
          return reject(new Error("Không tìm thấy thư mục Google Drive. Vui lòng kiểm tra lại đường dẫn hoặc Folder ID."));
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Không thể kết nối thư mục Google Drive (Mã lỗi ${res.statusCode}).`));
        }

        let html = "";
        res.on("data", (chunk) => (html += chunk));
        res.on("end", () => {
          let folderName = "Google Drive Folder";
          const titleMatch = html.match(/<title>(.*?)(?: - Google Drive)?<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            folderName = titleMatch[1].replace(/ - Google Drive$/, "").trim();
          }

          const files: GoogleDriveFile[] = [];
          const match = html.match(/window\['_DRIVE_ivd'\]\s*=\s*'((?:[^'\\]|\\.)*)'/);
          if (match) {
            try {
              const unescaped = match[1]
                .replace(/\\\\/g, "\\")
                .replace(/\\x([0-9A-Fa-f]{2})/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
              const parsed = JSON.parse(unescaped);

              function search(node: any) {
                if (!node) return;
                if (Array.isArray(node)) {
                  if (
                    typeof node[0] === "string" &&
                    typeof node[2] === "string" &&
                    typeof node[3] === "string" &&
                    (node[3].includes("image/") || /\.(jpg|jpeg|png|webp|cr2|cr3|nef|arw|dng)$/i.test(node[2]))
                  ) {
                    const fileId = node[0];
                    const fileName = node[2];
                    const mimeType = node[3];
                    const size =
                      typeof node[13] === "number"
                        ? String(node[13])
                        : typeof node[27] === "number"
                        ? String(node[27])
                        : "0";

                    if (!files.some((f) => f.id === fileId)) {
                      files.push({
                        id: fileId,
                        name: fileName,
                        mimeType: mimeType,
                        size: size,
                        thumbnailLink: `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`,
                      });
                    }
                  }
                  for (const item of node) {
                    search(item);
                  }
                }
              }
              search(parsed);
            } catch (e: any) {
              console.warn("Parse IVD error in drive.ts:", e.message);
            }
          }

          files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
          resolve({ folderName, files });
        });
      }
    );

    req.on("error", (err) => reject(new Error(`Lỗi kết nối mạng tới Google Drive: ${err.message}`)));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Hết thời gian chờ phản hồi từ Google Drive (Timeout)."));
    });
  });
}

// Fetch public Google Drive folder data (supports 300+ items via embeddedfolderview)
function fetchPublicDriveFolder(folderId: string): Promise<{ folderName: string; files: GoogleDriveFile[] }> {
  return new Promise((resolve, reject) => {
    const embeddedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}`;
    const req = https.get(
      embeddedUrl,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (res.headers.location.includes("accounts.google.com")) {
            return reject(
              new Error(
                "Thư mục Google Drive chưa được mở chia sẻ công khai. Vui lòng vào Google Drive > Nhấp chuột phải vào thư mục > Chọn 'Chia sẻ' > Đổi thành 'Bất kỳ ai có đường liên kết đều có thể xem'."
              )
            );
          }
        }

        if (res.statusCode === 200) {
          let html = "";
          res.on("data", (chunk) => (html += chunk));
          res.on("end", () => {
            let folderName = "Google Drive Folder";
            const titleMatch = html.match(/<title>(.*?)(?: - Google Drive)?<\/title>/i);
            if (titleMatch && titleMatch[1]) {
              folderName = titleMatch[1].replace(/ - Google Drive$/, "").trim();
            }

            const files: GoogleDriveFile[] = [];
            // Regex to find all file links: /file/d/ID/view
            const regex = /<a\s+[^>]*href=["']https:\/\/drive\.google\.com\/file\/d\/([-\w]{25,})\/view[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
            let m;
            while ((m = regex.exec(html)) !== null) {
              const fileId = m[1];
              const rawName = m[2].replace(/<[^>]+>/g, "").trim();
              if (rawName && !files.some((f) => f.id === fileId)) {
                let mimeType = "image/jpeg";
                const lower = rawName.toLowerCase();
                if (lower.endsWith(".png")) mimeType = "image/png";
                else if (lower.endsWith(".webp")) mimeType = "image/webp";
                else if (/\.(cr2|cr3|nef|arw|dng|raw)$/i.test(lower)) mimeType = "image/x-raw";

                files.push({
                  id: fileId,
                  name: rawName,
                  mimeType: mimeType,
                  thumbnailLink: `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`,
                });
              }
            }

            if (files.length > 0) {
              files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
              return resolve({ folderName, files });
            }

            fetchStandardDriveFolder(folderId).then(resolve).catch(reject);
          });
          return;
        }

        fetchStandardDriveFolder(folderId).then(resolve).catch(reject);
      }
    );

    req.on("error", (err) => {
      fetchStandardDriveFolder(folderId).then(resolve).catch(() => reject(err));
    });
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Hết thời gian chờ phản hồi từ Google Drive (Timeout)."));
    });
  });
}

// Fetch metadata of a specific folder to verify it exists and get its name
export async function getFolderMetadata(folderId: string) {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const drive = getDriveClient();
      const response = await drive.files.get({
        fileId: folderId,
        fields: "id, name, mimeType",
        supportsAllDrives: true,
      });

      if (response.data.mimeType !== "application/vnd.google-apps.folder") {
        throw new Error("ID được cung cấp không phải là một thư mục Google Drive.");
      }

      return response.data;
    } catch (error: any) {
      console.warn("Service Account folder check failed, trying public fallback:", error.message);
    }
  }

  // Fallback to public folder validation
  const publicData = await fetchPublicDriveFolder(folderId);
  return {
    id: folderId,
    name: publicData.folderName,
    mimeType: "application/vnd.google-apps.folder",
  };
}

// List all images in a Google Drive folder ordered by name
export async function listImagesInFolder(folderId: string): Promise<GoogleDriveFile[]> {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const drive = getDriveClient();
      const files: GoogleDriveFile[] = [];
      let pageToken: string | undefined = undefined;

      do {
        const response: any = await drive.files.list({
          q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
          fields: "nextPageToken, files(id, name, mimeType, size, createdTime, thumbnailLink, imageMediaMetadata)",
          orderBy: "name asc",
          pageSize: 1000,
          pageToken: pageToken,
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        if (response.data.files) {
          for (const file of response.data.files) {
            files.push({
              id: file.id || "",
              name: file.name || "",
              mimeType: file.mimeType || "",
              size: file.size || "0",
              createdTime: file.createdTime || "",
              thumbnailLink: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w600`,
              width: file.imageMediaMetadata?.width || undefined,
              height: file.imageMediaMetadata?.height || undefined,
            });
          }
        }
        pageToken = response.data.nextPageToken;
      } while (pageToken);

      if (files.length > 0) {
        return files;
      }
    } catch (error: any) {
      console.warn("Service Account listImages failed, trying public fallback:", error.message);
    }
  }

  // Fallback: Fetch directly from public folder
  const publicData = await fetchPublicDriveFolder(folderId);
  return publicData.files;
}

// Download/stream a file from Google Drive
export async function getFileStream(fileId: string): Promise<{ stream: any; headers: Record<string, string> }> {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const drive = getDriveClient();
      const response = await drive.files.get(
        { fileId: fileId, alt: "media", supportsAllDrives: true },
        { responseType: "stream" }
      );
      return {
        stream: response.data,
        headers: {
          "content-type": response.headers["content-type"] || "image/jpeg",
          "content-length": response.headers["content-length"] || "",
        },
      };
    } catch (error: any) {
      console.warn("Service account stream failed, falling back to public stream:", error.message);
    }
  }

  // Fallback: Stream directly from Google usercontent
  return new Promise((resolve, reject) => {
    const url = `https://lh3.googleusercontent.com/d/${fileId}=d`;
    https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, (redRes) => {
          resolve({
            stream: redRes,
            headers: {
              "content-type": redRes.headers["content-type"] || "image/jpeg",
              "content-length": redRes.headers["content-length"] || "",
            },
          });
        }).on("error", reject);
        return;
      }

      resolve({
        stream: res,
        headers: {
          "content-type": res.headers["content-type"] || "image/jpeg",
          "content-length": res.headers["content-length"] || "",
        },
      });
    }).on("error", reject);
  });
}

// Create a new subfolder inside a parent folder on Google Drive
export async function createSubfolder(parentFolderId: string, folderName: string): Promise<string> {
  const drive = getDriveClient();
  try {
    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    };
    
    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: "id, name",
      supportsAllDrives: true,
    });
    
    if (!response.data.id) {
      throw new Error("Drive API did not return folder ID.");
    }
    
    return response.data.id;
  } catch (error: any) {
    console.error("Error creating folder on Google Drive:", error);
    throw new Error(`Failed to create subfolder: ${error.message}`);
  }
}

// Copy a file from Google Drive into a new target folder
export async function copyFileToFolder(fileId: string, destinationFolderId: string): Promise<string> {
  const drive = getDriveClient();
  try {
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: "name",
      supportsAllDrives: true,
    });
    
    const response = await drive.files.copy({
      fileId: fileId,
      requestBody: {
        parents: [destinationFolderId],
        name: fileInfo.data.name,
      },
      supportsAllDrives: true,
    });
    
    if (!response.data.id) {
      throw new Error("Drive API did not return copied file ID.");
    }
    
    return response.data.id;
  } catch (error: any) {
    console.error(`Error copying file ${fileId}:`, error);
    throw new Error(`Failed to copy file: ${error.message}`);
  }
}
