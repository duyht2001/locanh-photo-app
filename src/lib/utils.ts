// Simple class merge helper
export function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

// Convert string to URL-friendly slug
export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove Vietnamese accents
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start
    .replace(/-+$/, ""); // Trim - from end
}

// Format Date to local string
export function formatDate(date: Date | string | null): string {
  if (!date) return "No expiration";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Export photo selection data
export interface SelectionExportItem {
  fileName: string;
  fileId: string;
  status: "Favorite" | "Ticked" | "Flagged" | "Unselected";
  details: string;
}

export function generateCSV(items: SelectionExportItem[]): string {
  const headers = ["File Name", "File ID", "Status", "Details"];
  const rows = items.map((item) => [
    `"${item.fileName.replace(/"/g, '""')}"`,
    `"${item.fileId}"`,
    `"${item.status}"`,
    `"${item.details}"`,
  ]);
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function generateTXT(items: SelectionExportItem[]): string {
  const favorites = items.filter((i) => i.status === "Favorite").map((i) => i.fileName);
  const ticked = items.filter((i) => i.status === "Ticked").map((i) => i.fileName);
  const flagged = items.filter((i) => i.status === "Flagged").map((i) => `${i.fileName} (${i.details})`);
  
  let output = "=== DANH SÁCH CHỌN ẢNH ===\n\n";
  
  output += `TỔNG SỐ ẢNH ĐÃ CHỌN: ${items.length}\n\n`;
  
  if (favorites.length > 0) {
    output += `--- ẢNH YÊU THÍCH (HEART) [${favorites.length}] ---\n`;
    output += favorites.join("\n") + "\n\n";
  }
  
  if (ticked.length > 0) {
    output += `--- ẢNH ĐỒNG Ý (TICK) [${ticked.length}] ---\n`;
    output += ticked.join("\n") + "\n\n";
  }

  if (flagged.length > 0) {
    output += `--- ẢNH GẮN CỜ (FLAG) [${flagged.length}] ---\n`;
    output += flagged.join("\n") + "\n\n";
  }
  
  return output;
}

export function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
