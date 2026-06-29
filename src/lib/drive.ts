import { google } from "googleapis";

// Initialize the Google Drive API client using Service Account credentials
export function getDriveClient() {
  const serviceAccountKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKeyRaw) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable. Please configure it in your .env file."
    );
  }

  try {
    // Parse key JSON from env. It can be a single line string or formatted JSON.
    const credentials = JSON.parse(serviceAccountKeyRaw);
    
    // Google private key might need newline replacements if passed as a single line string
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
    }

    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"]
    });

    return google.drive({ version: "v3", auth });
  } catch (error: any) {
    throw new Error(`Failed to initialize Google Drive Client: ${error.message}`);
  }
}

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

// List all images in a Google Drive folder ordered by name
export async function listImagesInFolder(folderId: string): Promise<GoogleDriveFile[]> {
  const drive = getDriveClient();
  const files: GoogleDriveFile[] = [];
  let pageToken: string | undefined = undefined;

  try {
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
            thumbnailLink: file.thumbnailLink || "",
            width: file.imageMediaMetadata?.width || undefined,
            height: file.imageMediaMetadata?.height || undefined,
          });
        }
      }
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    return files;
  } catch (error: any) {
    console.error("Error listing files from Google Drive:", error);
    throw new Error(`Google Drive API error: ${error.message}`);
  }
}

// Fetch metadata of a specific folder to verify it exists and get its name
export async function getFolderMetadata(folderId: string) {
  const drive = getDriveClient();
  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: "id, name, mimeType",
      supportsAllDrives: true,
    });

    if (response.data.mimeType !== "application/vnd.google-apps.folder") {
      throw new Error("Provided ID is not a Google Drive folder.");
    }

    return response.data;
  } catch (error: any) {
    console.error("Error fetching folder metadata:", error);
    throw new Error(`Failed to fetch Google Drive folder: ${error.message}`);
  }
}

// Download/stream a file from Google Drive
export async function getFileStream(fileId: string) {
  const drive = getDriveClient();
  try {
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
    console.error("Error getting file stream:", error);
    throw new Error(`Failed to stream file from Google Drive: ${error.message}`);
  }
}
