export interface Album {
  id: string;
  slug: string;
  title: string;
  driveFolderId: string;
  password?: string | null;
  expiresAt?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Selection {
  id: string;
  albumId: string;
  clientSessionId: string;
  photoId: string;
  photoName: string;
  isFavorite: boolean;
  isTicked: boolean;
  colorFlag: string | null; // "red" | "yellow" | "green" | "blue" | null
  createdAt: string;
  updatedAt: string;
}

export interface Photo {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  thumbnailLink?: string;
  width?: number;
  height?: number;
  // Selection state joined on the frontend
  isFavorite?: boolean;
  isTicked?: boolean;
  colorFlag?: string | null;
}

export interface AlbumWithSelections extends Album {
  selections: Selection[];
}
