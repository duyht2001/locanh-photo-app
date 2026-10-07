const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const inputImagePath = 'C:/Users/NOVD/.gemini/antigravity/brain/4d24b080-3ff9-46fe-bffe-9d6254de55b5/.user_uploaded/media_1791341911940.png';
  const outPublicPath = path.join(__dirname, '../public/huong-dan-tao-album.png');
  const outBrainPath = 'C:/Users/NOVD/.gemini/antigravity/brain/4d24b080-3ff9-46fe-bffe-9d6254de55b5/huong-dan-tao-album.png';

  const W = 1360;
  const H = 830;
  const modalW = 458;
  const modalH = 588;
  const modalX = 451;
  const modalY = 105;

  // Clean tight crop of the modal card without any dark overlay slivers
  const croppedModal = await sharp(inputImagePath)
    .extract({ left: 26, top: 23, width: modalW, height: modalH })
    .toBuffer();

  // Targets relative to canvas
  const t1 = { x: modalX + 22, y: modalY + 104 };
  const t2 = { x: modalX + 436, y: modalY + 169 };
  const t3 = { x: modalX + 22, y: modalY + 233 };
  const t4 = { x: modalX + 436, y: modalY + 323 };
  const t5 = { x: modalX + 22, y: modalY + 421 };
  const t6 = { x: modalX + 436, y: modalY + 489 };
  const t7 = { x: modalX + 436, y: modalY + 558 };

  // SVG overlay
  const svg = `
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Shadow filters -->
      <filter id="card-shadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.08" />
      </filter>
      <filter id="glow-orange" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#ea580c" flood-opacity="0.65" />
      </filter>

      <!-- Left pointing markers -->
      <marker id="arrow-blue-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 10 1 L 0 5 L 10 9 z" fill="#2563eb" />
      </marker>
      <marker id="arrow-orange-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 10 1 L 0 5 L 10 9 z" fill="#ea580c" />
      </marker>
      <marker id="arrow-indigo-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 10 1 L 0 5 L 10 9 z" fill="#6366f1" />
      </marker>
      <marker id="arrow-emerald-left" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 10 1 L 0 5 L 10 9 z" fill="#10b981" />
      </marker>

      <!-- Right pointing markers -->
      <marker id="arrow-red-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
      </marker>
      <marker id="arrow-purple-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#8b5cf6" />
      </marker>
      <marker id="arrow-cyan-right" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#0891b2" />
      </marker>
    </defs>

    <style>
      .font-sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      .title-top { font-size: 22px; font-weight: 800; fill: #0f172a; letter-spacing: 0.5px; }
      .sub-top { font-size: 13px; font-weight: 500; fill: #64748b; }
      .card-title { font-size: 13.5px; font-weight: 700; }
      .card-desc { font-size: 11.5px; font-weight: 400; fill: #475569; line-height: 16px; }
      .badge-text { font-size: 13px; font-weight: 800; fill: #ffffff; text-anchor: middle; dominant-baseline: central; }
    </style>

    <!-- Top Header Bar Background -->
    <rect x="0" y="0" width="${W}" height="68" fill="#ffffff" />
    <line x1="0" y1="68" x2="${W}" y2="68" stroke="#e2e8f0" stroke-width="1.5" />

    <!-- Studio Header -->
    <g transform="translate(35, 20)">
      <circle cx="16" cy="14" r="14" fill="#0f172a" />
      <text x="16" y="14" font-family="sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" dominant-baseline="central">TO</text>
      <text x="42" y="17" class="font-sans title-top">TO STUDIO • HƯỚNG DẪN TẠO ALBUM MỚI &amp; CÀI ĐẶT GIỚI HẠN</text>
      <text x="910" y="17" class="font-sans sub-top">Hệ thống chọn &amp; lọc ảnh khách hàng chuyên nghiệp</text>
    </g>

    <!-- HIGHLIGHT RECTANGLES ON MODAL -->
    <!-- 1: Tiêu đề album -->
    <rect x="${modalX + 21}" y="${modalY + 87}" width="416" height="34" rx="6" fill="#ef4444" fill-opacity="0.08" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4 2" />
    <!-- 2: Link Google Drive -->
    <rect x="${modalX + 21}" y="${modalY + 152}" width="416" height="34" rx="6" fill="#2563eb" fill-opacity="0.08" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="4 2" />
    <!-- 3: Mật khẩu -->
    <rect x="${modalX + 21}" y="${modalY + 216}" width="202" height="34" rx="6" fill="#8b5cf6" fill-opacity="0.08" stroke="#8b5cf6" stroke-width="1.5" stroke-dasharray="4 2" />
    <!-- 4: Giới hạn ảnh (Max Selections) -->
    <rect x="${modalX + 21}" y="${modalY + 261}" width="416" height="124" rx="8" fill="#ea580c" fill-opacity="0.06" stroke="#ea580c" stroke-width="2.5" filter="url(#glow-orange)" />
    <!-- 5: Checkbox Tải ảnh -->
    <rect x="${modalX + 21}" y="${modalY + 398}" width="416" height="46" rx="8" fill="#0891b2" fill-opacity="0.08" stroke="#0891b2" stroke-width="1.5" stroke-dasharray="4 2" />
    <!-- 6: Banner & Logo -->
    <rect x="${modalX + 236}" y="${modalY + 472}" width="201" height="35" rx="6" fill="#6366f1" fill-opacity="0.08" stroke="#6366f1" stroke-width="1.5" stroke-dasharray="4 2" />
    <!-- 7: Nút Tạo Album -->
    <rect x="${modalX + 353}" y="${modalY + 540}" width="85" height="36" rx="8" fill="#10b981" fill-opacity="0.2" stroke="#10b981" stroke-width="2.5" />


    <!-- ==================== LEFT SIDE CALLOUTS ==================== -->
    
    <!-- CALLOUT 1: Tiêu đề album -->
    <g transform="translate(35, 110)" filter="url(#card-shadow)">
      <rect width="350" height="106" rx="12" fill="#ffffff" stroke="#fee2e2" stroke-width="1.5" />
      <rect width="8" height="106" rx="4" fill="#ef4444" />
      <circle cx="36" cy="30" r="15" fill="#ef4444" />
      <text x="36" y="30" class="font-sans badge-text">1</text>
      <text x="62" y="30" class="font-sans card-title" fill="#b91c1c">TIÊU ĐỀ ALBUM (Bắt buộc)</text>
      <text x="24" y="60" class="font-sans card-desc">
        <tspan x="24" dy="0">• Đặt tên bộ ảnh / sự kiện rõ ràng để dễ quản lý.</tspan>
        <tspan x="24" dy="18">• VD: <tspan font-weight="700">Đám cưới Duy &amp; Trang</tspan>, <tspan font-weight="700">Sinh nhật Bé Bon</tspan>...</tspan>
        <tspan x="24" dy="18">• Tên này sẽ hiển thị trang trọng trên tiêu đề của khách.</tspan>
      </text>
    </g>
    <!-- Arrow 1: From right of Card 1 to t1 -->
    <path d="M 385 160 C 415 160, 420 205, ${t1.x - 8} ${t1.y}" fill="none" stroke="#ef4444" stroke-width="2.5" marker-end="url(#arrow-red-right)" />

    <!-- CALLOUT 3: Mật khẩu & Ngày hết hạn -->
    <g transform="translate(35, 275)" filter="url(#card-shadow)">
      <rect width="350" height="116" rx="12" fill="#ffffff" stroke="#f3e8ff" stroke-width="1.5" />
      <rect width="8" height="116" rx="4" fill="#8b5cf6" />
      <circle cx="36" cy="30" r="15" fill="#8b5cf6" />
      <text x="36" y="30" class="font-sans badge-text">3</text>
      <text x="62" y="30" class="font-sans card-title" fill="#6d28d9">MẬT KHẨU &amp; HẠN DÙNG (Tùy chọn)</text>
      <text x="24" y="60" class="font-sans card-desc">
        <tspan x="24" dy="0">• <tspan font-weight="700">Mật khẩu:</tspan> Cài mã PIN/pass riêng cho khách.</tspan>
        <tspan x="24" dy="18">  (Bỏ trống nếu muốn khách vào xem ngay không cần pass).</tspan>
        <tspan x="24" dy="18">• <tspan font-weight="700">Ngày hết hạn:</tspan> Hạn chót khách được chọn ảnh.</tspan>
        <tspan x="24" dy="18">  (Giúp thúc đẩy khách chốt ảnh sớm đúng tiến độ).</tspan>
      </text>
    </g>
    <!-- Arrow 3: From right of Card 3 to t3 -->
    <path d="M 385 333 C 415 333, 425 338, ${t3.x - 8} ${t3.y}" fill="none" stroke="#8b5cf6" stroke-width="2.5" marker-end="url(#arrow-purple-right)" />

    <!-- CALLOUT 5: Cho phép khách tải ảnh -->
    <g transform="translate(35, 450)" filter="url(#card-shadow)">
      <rect width="350" height="110" rx="12" fill="#ffffff" stroke="#cffafe" stroke-width="1.5" />
      <rect width="8" height="110" rx="4" fill="#0891b2" />
      <circle cx="36" cy="30" r="15" fill="#0891b2" />
      <text x="36" y="30" class="font-sans badge-text">5</text>
      <text x="62" y="30" class="font-sans card-title" fill="#0e7490">CHO PHÉP TẢI ẢNH XUỐNG</text>
      <text x="24" y="60" class="font-sans card-desc">
        <tspan x="24" dy="0">• <tspan font-weight="700">Tích chọn (Mặc định):</tspan> Khách có nút "Tải ảnh" để</tspan>
        <tspan x="24" dy="18">  lưu ảnh xem thử trực tiếp về điện thoại/máy tính.</tspan>
        <tspan x="24" dy="18">• <tspan font-weight="700">Bỏ tích:</tspan> Chỉ cho phép xem &amp; chọn, không cho tải</tspan>
        <tspan x="24" dy="18">  (bảo vệ bản quyền ảnh gốc trước khi thanh toán).</tspan>
      </text>
    </g>
    <!-- Arrow 5: From right of Card 5 to t5 -->
    <path d="M 385 505 C 415 505, 425 526, ${t5.x - 8} ${t5.y}" fill="none" stroke="#0891b2" stroke-width="2.5" marker-end="url(#arrow-cyan-right)" />


    <!-- ==================== RIGHT SIDE CALLOUTS ==================== -->

    <!-- CALLOUT 2: Link Google Drive -->
    <g transform="translate(975, 110)" filter="url(#card-shadow)">
      <rect width="350" height="112" rx="12" fill="#ffffff" stroke="#dbeafe" stroke-width="1.5" />
      <rect x="342" y="0" width="8" height="112" rx="4" fill="#2563eb" />
      <circle cx="30" cy="30" r="15" fill="#2563eb" />
      <text x="30" y="30" class="font-sans badge-text">2</text>
      <text x="56" y="30" class="font-sans card-title" fill="#1d4ed8">LINK THƯ MỤC GOOGLE DRIVE</text>
      <text x="20" y="60" class="font-sans card-desc">
        <tspan x="20" dy="0">• Dán link chia sẻ folder Drive hoặc Folder ID chứa ảnh.</tspan>
        <tspan x="20" dy="18">• <tspan font-weight="700" fill="#dc2626">Lưu ý cực quan trọng:</tspan> Thư mục Drive phải bật quyền</tspan>
        <tspan x="20" dy="18">  <tspan font-weight="700">"Bất kỳ ai có đường liên kết đều có thể xem"</tspan></tspan>
        <tspan x="20" dy="18">  để hệ thống tự động quét và nạp ảnh vào album.</tspan>
      </text>
    </g>
    <!-- Arrow 2: From left of Card 2 to t2 -->
    <path d="M 975 166 C 935 166, 915 274, ${t2.x + 8} ${t2.y}" fill="none" stroke="#2563eb" stroke-width="2.5" marker-end="url(#arrow-blue-left)" />

    <!-- CALLOUT 4: Giới hạn số lượng ảnh khách chọn (MAX SELECTIONS) -->
    <g transform="translate(975, 275)" filter="url(#card-shadow)">
      <rect width="350" height="136" rx="12" fill="#fff7ed" stroke="#fdba74" stroke-width="2" />
      <rect x="342" y="0" width="8" height="136" rx="4" fill="#ea580c" />
      <circle cx="30" cy="30" r="15" fill="#ea580c" />
      <text x="30" y="30" class="font-sans badge-text">4</text>
      <text x="56" y="27" class="font-sans card-title" fill="#c2410c">GIỚI HẠN SỐ ẢNH CHỌN (Max)</text>
      <text x="56" y="44" class="font-sans" font-size="11" font-weight="800" fill="#ea580c">★ QUẢN LÝ GÓI CHỤP CHUẨN XÁC</text>
      <text x="20" y="70" class="font-sans card-desc">
        <tspan x="20" dy="0">• Nhập số ảnh tối đa khách được chọn (VD: <tspan font-weight="700">30</tspan>, <tspan font-weight="700">50</tspan>...).</tspan>
        <tspan x="20" dy="18">• <tspan font-weight="700">Nếu nhập 30:</tspan> Khách chọn đủ 30 ảnh hệ thống sẽ</tspan>
        <tspan x="20" dy="18">  báo đủ và khóa, yêu cầu bỏ bớt nếu muốn chọn thêm.</tspan>
        <tspan x="20" dy="18">• <tspan font-weight="700">Nếu để trống hoặc nhập 0:</tspan> Khách chọn không giới hạn.</tspan>
      </text>
    </g>
    <!-- Arrow 4: From left of Card 4 to t4 -->
    <path d="M 975 342 C 925 342, 915 428, ${t4.x + 8} ${t4.y}" fill="none" stroke="#ea580c" stroke-width="3" marker-end="url(#arrow-orange-left)" />

    <!-- CALLOUT 6: Logo & Banner -->
    <g transform="translate(975, 460)" filter="url(#card-shadow)">
      <rect width="350" height="106" rx="12" fill="#ffffff" stroke="#e0e7ff" stroke-width="1.5" />
      <rect x="342" y="0" width="8" height="106" rx="4" fill="#6366f1" />
      <circle cx="30" cy="30" r="15" fill="#6366f1" />
      <text x="30" y="30" class="font-sans badge-text">6</text>
      <text x="56" y="30" class="font-sans card-title" fill="#4338ca">LOGO &amp; BANNER (Tùy chọn)</text>
      <text x="20" y="60" class="font-sans card-desc">
        <tspan x="20" dy="0">• <tspan font-weight="700">Studio Logo URL:</tspan> Link logo riêng (nếu muốn đổi).</tspan>
        <tspan x="20" dy="18">• <tspan font-weight="700">Banner Cover URL:</tspan> Link ảnh bìa lớn đầu trang</tspan>
        <tspan x="20" dy="18">  giúp album trông sang trọng, chuyên nghiệp hơn.</tspan>
      </text>
    </g>
    <!-- Arrow 6: From left of Card 6 to t6 -->
    <path d="M 975 513 C 935 513, 915 594, ${t6.x + 8} ${t6.y}" fill="none" stroke="#6366f1" stroke-width="2.5" marker-end="url(#arrow-indigo-left)" />

    <!-- CALLOUT 7: Bấm Tạo Album -->
    <g transform="translate(975, 610)" filter="url(#card-shadow)">
      <rect width="350" height="106" rx="12" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="2" />
      <rect x="342" y="0" width="8" height="106" rx="4" fill="#10b981" />
      <circle cx="30" cy="30" r="15" fill="#10b981" />
      <text x="30" y="30" class="font-sans badge-text">7</text>
      <text x="56" y="30" class="font-sans card-title" fill="#047857">BẤM TẠO ALBUM ĐỂ HOÀN TẤT</text>
      <text x="20" y="60" class="font-sans card-desc">
        <tspan x="20" dy="0">• Nhấn nút <tspan font-weight="700">"Tạo Album"</tspan> màu đen để hệ thống bắt</tspan>
        <tspan x="20" dy="18">  đầu quét và đồng bộ ảnh từ Google Drive.</tspan>
        <tspan x="20" dy="18">• Tạo xong sẽ xuất hiện ngay link để gửi cho khách.</tspan>
      </text>
    </g>
    <!-- Arrow 7: From left of Card 7 to t7 -->
    <path d="M 975 663 C 925 663, 915 663, ${t7.x + 8} ${t7.y}" fill="none" stroke="#10b981" stroke-width="3" marker-end="url(#arrow-emerald-left)" />

  </svg>
  `;

  // Base canvas with soft background
  const base = sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: { r: 248, g: 250, b: 252, alpha: 1 }
    }
  });

  const finalImage = await base
    .composite([
      // First: drop shadow behind modal
      {
        input: Buffer.from(`
          <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="modal-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#0f172a" flood-opacity="0.12" />
              </filter>
            </defs>
            <rect x="${modalX}" y="${modalY}" width="${modalW}" height="${modalH}" rx="12" fill="#ffffff" filter="url(#modal-shadow)" />
          </svg>
        `),
        left: 0,
        top: 0
      },
      // Second: clean cropped modal
      {
        input: croppedModal,
        left: modalX,
        top: modalY
      },
      // Third: overlay with badges, text, arrows & highlights
      {
        input: Buffer.from(svg),
        left: 0,
        top: 0
      }
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(outPublicPath, finalImage);
  fs.writeFileSync(outBrainPath, finalImage);
  console.log('Successfully generated polished modal guide image:');
  console.log(' -', outPublicPath);
  console.log(' -', outBrainPath);
}

main().catch(err => {
  console.error('Error generating image:', err);
  process.exit(1);
});
