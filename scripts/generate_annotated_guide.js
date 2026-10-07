const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const width = 1024;
const height = 825;

const svgOverlay = Buffer.from(`
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Arrow marker definition -->
    <marker id="arrow-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ef4444" />
    </marker>
    <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2563eb" />
    </marker>
    <marker id="arrow-amber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#d97706" />
    </marker>
    <marker id="arrow-emerald" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
    </marker>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#7c3aed" />
    </marker>

    <!-- Drop shadow filter -->
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <style>
    .label-box { rx: 8px; filter: url(#shadow); }
    .badge-num { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 900; font-size: 13px; fill: #ffffff; text-anchor: middle; dominant-baseline: central; }
    .title-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 800; font-size: 12px; fill: #ffffff; }
    .desc-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-weight: 500; font-size: 10.5px; fill: #f8fafc; }
    .arrow-line { stroke-width: 3; stroke-linecap: round; fill: none; }
  </style>

  <!-- ================= 1. NÚT TẠO ALBUM ================= -->
  <!-- Target: (265, 134) -->
  <line x1="220" y1="78" x2="255" y2="122" stroke="#ef4444" class="arrow-line" marker-end="url(#arrow-red)" />
  <g transform="translate(65, 30)">
    <rect x="0" y="0" width="220" height="46" class="label-box" fill="#dc2626" />
    <circle cx="22" cy="23" r="13" fill="#991b1b" />
    <text x="22" y="23" class="badge-num">1</text>
    <text x="44" y="19" class="title-text">BẤM TẠO ALBUM MỚI</text>
    <text x="44" y="34" class="desc-text">Dán link Drive &amp; đặt giới hạn ảnh</text>
  </g>

  <!-- ================= 2. LINK GỬI CHO KHÁCH ================= -->
  <!-- Target: (505, 165) -->
  <line x1="430" y1="108" x2="480" y2="152" stroke="#2563eb" class="arrow-line" marker-end="url(#arrow-blue)" />
  <g transform="translate(320, 56)">
    <rect x="0" y="0" width="230" height="46" class="label-box" fill="#2563eb" />
    <circle cx="22" cy="23" r="13" fill="#1e40af" />
    <text x="22" y="23" class="badge-num">2</text>
    <text x="44" y="19" class="title-text">LINK GỬI CHO KHÁCH HÀNG</text>
    <text x="44" y="34" class="desc-text">Copy link gửi Zalo/FB để khách chọn</text>
  </g>

  <!-- ================= 3. GIỚI HẠN SỐ LƯỢNG ẢNH ================= -->
  <!-- Target: (925, 150) -->
  <line x1="835" y1="105" x2="890" y2="140" stroke="#d97706" class="arrow-line" marker-end="url(#arrow-amber)" />
  <g transform="translate(730, 52)">
    <rect x="0" y="0" width="225" height="46" class="label-box" fill="#d97706" />
    <circle cx="22" cy="23" r="13" fill="#92400e" />
    <text x="22" y="23" class="badge-num">3</text>
    <text x="44" y="19" class="title-text">GIỚI HẠN SỐ ẢNH CHỌN</text>
    <text x="44" y="34" class="desc-text">Số ảnh tối đa khách được phép chọn</text>
  </g>

  <!-- ================= 4. DANH SÁCH ALBUM BÊN TRÁI ================= -->
  <!-- Target: box 'viet' (30, 528) to (305, 630) -->
  <rect x="28" y="526" width="280" height="106" rx="10" fill="none" stroke="#7c3aed" stroke-width="3" stroke-dasharray="6,4" />
  <line x1="168" y1="636" x2="168" y2="656" stroke="#7c3aed" class="arrow-line" marker-end="url(#arrow-purple)" />
  <g transform="translate(35, 664)">
    <rect x="0" y="0" width="230" height="46" class="label-box" fill="#7c3aed" />
    <circle cx="22" cy="23" r="13" fill="#5b21b6" />
    <text x="22" y="23" class="badge-num">4</text>
    <text x="44" y="19" class="title-text">DANH SÁCH CÁC ALBUM</text>
    <text x="44" y="34" class="desc-text">Bấm vào album để xem chi tiết</text>
  </g>

  <!-- ================= 5. NÚT XUẤT CSV, TXT & LƯU VÀO DRIVE ================= -->
  <!-- Target: (925, 305) -->
  <line x1="800" y1="262" x2="870" y2="298" stroke="#059669" class="arrow-line" marker-end="url(#arrow-emerald)" />
  <g transform="translate(660, 212)">
    <rect x="0" y="0" width="295" height="46" class="label-box" fill="#059669" />
    <circle cx="22" cy="23" r="13" fill="#065f46" />
    <text x="22" y="23" class="badge-num">5</text>
    <text x="44" y="19" class="title-text">XUẤT DANH SÁCH / LƯU VÀO DRIVE</text>
    <text x="44" y="34" class="desc-text">Xuất CSV/TXT cho Lightroom hoặc tạo folder Drive</text>
  </g>

  <!-- ================= 6. ẢNH KHÁCH ĐÃ CHỌN ================= -->
  <!-- Target: (430, 485) -->
  <line x1="560" y1="485" x2="480" y2="485" stroke="#ef4444" class="arrow-line" marker-end="url(#arrow-red)" />
  <g transform="translate(565, 462)">
    <rect x="0" y="0" width="240" height="46" class="label-box" fill="#dc2626" />
    <circle cx="22" cy="23" r="13" fill="#991b1b" />
    <text x="22" y="23" class="badge-num">6</text>
    <text x="44" y="19" class="title-text">HÌNH ẢNH KHÁCH ĐÃ CHỌN</text>
    <text x="44" y="34" class="desc-text">Xem chi tiết ảnh tim, tick, cờ màu</text>
  </g>

  <!-- ================= 7. CÔNG CỤ TỰ ĐỘNG CHÉP FILE MÁY TÍNH ================= -->
  <!-- Target: Thư mục nguồn (515, 760) và Thư mục đích (820, 760) -->
  <line x1="515" y1="695" x2="515" y2="728" stroke="#0284c7" class="arrow-line" marker-end="url(#arrow-blue)" />
  <g transform="translate(365, 646)">
    <rect x="0" y="0" width="370" height="46" class="label-box" fill="#0284c7" />
    <circle cx="22" cy="23" r="13" fill="#0369a1" />
    <text x="22" y="23" class="badge-num">7</text>
    <text x="44" y="19" class="title-text">CÔNG CỤ TỰ ĐỘNG CHÉP ẢNH TRÊN MÁY TÍNH</text>
    <text x="44" y="34" class="desc-text">Chọn Thư mục Gốc &amp; Thư mục Đích để lọc file RAW/JPEG</text>
  </g>

</svg>
`);

const inputPath = 'C:/Users/NOVD/.gemini/antigravity/brain/4d24b080-3ff9-46fe-bffe-9d6254de55b5/.user_uploaded/media_1791341663582.png';
const outputPath = 'public/huong-dan-admin.png';
const artifactPath = 'C:/Users/NOVD/.gemini/antigravity/brain/4d24b080-3ff9-46fe-bffe-9d6254de55b5/huong-dan-admin.png';

sharp(inputPath)
  .composite([{ input: svgOverlay }])
  .png()
  .toFile(outputPath)
  .then(() => {
    console.log('SUCCESS: public/huong-dan-admin.png created!');
    fs.copyFileSync(outputPath, artifactPath);
    console.log('Copied to artifact path:', artifactPath);
  })
  .catch(err => {
    console.error('Error generating annotated image:', err);
    process.exit(1);
  });
