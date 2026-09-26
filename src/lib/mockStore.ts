import fs from "fs";
import path from "path";

// Persistent selection store for offline/local development when DB is not connected
export interface LocalSelection {
  id?: string;
  albumId?: string;
  clientSessionId?: string;
  photoId: string;
  photoName: string;
  isFavorite: boolean;
  isTicked: boolean;
  colorFlag: string | null;
  updatedAt?: string;
}

const SELECTIONS_FILE = path.join(process.cwd(), "prisma", "local-selections.json");
const CUSTOM_ALBUMS_FILE = path.join(process.cwd(), "prisma", "custom-albums.json");

let memorySelectionsStore: Record<string, Record<string, Record<string, LocalSelection>>> | null = null;

function loadSelectionsStore(): Record<string, Record<string, Record<string, LocalSelection>>> {
  if (memorySelectionsStore !== null) {
    return memorySelectionsStore;
  }
  try {
    if (fs.existsSync(SELECTIONS_FILE)) {
      let content = fs.readFileSync(SELECTIONS_FILE, "utf-8");
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
      }
      memorySelectionsStore = JSON.parse(content);
      return memorySelectionsStore || {};
    }
  } catch (err) {
    // Ignore read errors
  }
  memorySelectionsStore = {};
  return memorySelectionsStore;
}

function saveSelectionsStore(data: Record<string, Record<string, Record<string, LocalSelection>>>) {
  memorySelectionsStore = data;
  try {
    fs.writeFileSync(SELECTIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    // Gracefully ignore EROFS in serverless environments like Vercel
  }
}

export function getLocalSelections(slug: string, sessionId: string): LocalSelection[] {
  const store = loadSelectionsStore();
  if (!store[slug] || !store[slug][sessionId]) return [];
  return Object.values(store[slug][sessionId]);
}

export function getAllSelectionsForAlbum(slug: string): LocalSelection[] {
  const store = loadSelectionsStore();
  if (!store[slug]) return [];
  const all: LocalSelection[] = [];
  for (const sess of Object.keys(store[slug])) {
    all.push(...Object.values(store[slug][sess]));
  }
  return all;
}

export function getGroupedSelectionsForAlbum(slug: string, albumId?: string): {
  selections: LocalSelection[];
  groupedSelections: Record<string, LocalSelection[]>;
} {
  const store = loadSelectionsStore();
  const selections: LocalSelection[] = [];
  const groupedSelections: Record<string, LocalSelection[]> = {};

  if (store[slug]) {
    for (const [sessId, sessionMap] of Object.entries(store[slug])) {
      groupedSelections[sessId] = [];
      for (const sel of Object.values(sessionMap)) {
        const enriched: LocalSelection = {
          ...sel,
          id: sel.id || `sel_${sel.photoId}`,
          albumId: albumId || slug,
          clientSessionId: sessId,
          updatedAt: sel.updatedAt || new Date().toISOString(),
        };
        selections.push(enriched);
        groupedSelections[sessId].push(enriched);
      }
    }
  }

  return { selections, groupedSelections };
}

export function updateLocalSelection(
  slug: string,
  sessionId: string,
  photoId: string,
  photoName: string,
  action: "favorite" | "tick" | "flag",
  value: any,
  maxSelections?: number | null
): { success: boolean; error?: string; selection?: LocalSelection | null } {
  const store = loadSelectionsStore();
  if (!store[slug]) store[slug] = {};
  if (!store[slug][sessionId]) store[slug][sessionId] = {};

  const current = store[slug][sessionId][photoId] || {
    id: `sel_${photoId}`,
    clientSessionId: sessionId,
    photoId,
    photoName,
    isFavorite: false,
    isTicked: false,
    colorFlag: null,
    updatedAt: new Date().toISOString(),
  };

  const wasSelected = current.isFavorite || current.isTicked || !!current.colorFlag;

  const next = { ...current, updatedAt: new Date().toISOString() };
  if (action === "favorite") next.isFavorite = !!value;
  if (action === "tick") next.isTicked = !!value;
  if (action === "flag") next.colorFlag = typeof value === "string" ? value : null;

  const willBeSelected = next.isFavorite || next.isTicked || !!next.colorFlag;

  // Check limit if activating new photo
  if (!wasSelected && willBeSelected && maxSelections && maxSelections > 0) {
    const activeCount = Object.values(store[slug][sessionId]).filter(
      (s) => s.photoId !== photoId && (s.isFavorite || s.isTicked || !!s.colorFlag)
    ).length;

    if (activeCount >= maxSelections) {
      return {
        success: false,
        error: `Đã đạt giới hạn tối đa ${maxSelections} ảnh được chọn cho album này.`,
      };
    }
  }

  if (!willBeSelected) {
    delete store[slug][sessionId][photoId];
    saveSelectionsStore(store);
    return { success: true, selection: null };
  } else {
    store[slug][sessionId][photoId] = next;
    saveSelectionsStore(store);
    return { success: true, selection: next };
  }
}

export function getSampleAlbumData(slug?: string) {
  try {
    const sampleFilePath = path.join(process.cwd(), "prisma", "duyen-sample.json");
    if (fs.existsSync(sampleFilePath)) {
      let content = fs.readFileSync(sampleFilePath, "utf-8");
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
      }
      const parsed = JSON.parse(content);
      if (!slug || slug === "duyen" || parsed.album?.slug === slug || parsed.album?.id === slug) {
        return parsed;
      }
    }
  } catch (err) {
    console.error("Failed to load sample album data:", err);
  }
  return null;
}

let memoryCustomAlbums: any[] | null = null;

export function getCustomAlbums(): any[] {
  if (memoryCustomAlbums !== null) {
    return memoryCustomAlbums;
  }
  try {
    if (fs.existsSync(CUSTOM_ALBUMS_FILE)) {
      let content = fs.readFileSync(CUSTOM_ALBUMS_FILE, "utf-8");
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
      }
      memoryCustomAlbums = JSON.parse(content);
      return memoryCustomAlbums || [];
    }
  } catch (err) {
    // Ignore read errors
  }
  memoryCustomAlbums = [];
  return memoryCustomAlbums;
}

export function saveCustomAlbum(albumData: any): any {
  const albums = getCustomAlbums();
  const existingIdx = albums.findIndex((a) => a.id === albumData.id || a.slug === albumData.slug);
  let saved: any;
  if (existingIdx >= 0) {
    albums[existingIdx] = { ...albums[existingIdx], ...albumData, updatedAt: new Date().toISOString() };
    saved = albums[existingIdx];
  } else {
    const newAlbum = {
      id: albumData.id || `album_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...albumData,
    };
    albums.unshift(newAlbum);
    saved = newAlbum;
  }
  memoryCustomAlbums = albums;
  try {
    fs.writeFileSync(CUSTOM_ALBUMS_FILE, JSON.stringify(albums, null, 2), "utf-8");
  } catch (err) {
    // Gracefully ignore EROFS in serverless environments like Vercel
  }
  return saved;
}

export function updateCustomAlbum(id: string, updates: any): any | null {
  const albums = getCustomAlbums();
  const idx = albums.findIndex((a) => a.id === id);
  if (idx >= 0) {
    albums[idx] = {
      ...albums[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    memoryCustomAlbums = albums;
    try {
      fs.writeFileSync(CUSTOM_ALBUMS_FILE, JSON.stringify(albums, null, 2), "utf-8");
    } catch (err) {
      // Gracefully ignore EROFS in serverless environments
    }
    return albums[idx];
  }
  return null;
}

export function deleteCustomAlbum(id: string): boolean {
  const albums = getCustomAlbums();
  const filtered = albums.filter((a) => a.id !== id);
  if (filtered.length !== albums.length) {
    memoryCustomAlbums = filtered;
    try {
      fs.writeFileSync(CUSTOM_ALBUMS_FILE, JSON.stringify(filtered, null, 2), "utf-8");
    } catch (err) {
      // Gracefully ignore EROFS in serverless environments
    }
    return true;
  }
  return false;
}

export function getAlbumBySlugOrId(identifier: string): any | null {
  const custom = getCustomAlbums().find((a) => a.slug === identifier || a.id === identifier);
  if (custom) return custom;

  const sample = getSampleAlbumData(identifier);
  if (sample && (sample.album?.slug === identifier || sample.album?.id === identifier)) {
    return sample.album;
  }
  return null;
}
