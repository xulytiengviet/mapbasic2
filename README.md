# Vietflex Basemap — mapbasic2

Static WebGIS dùng MapLibre GL JS + PMTiles, chạy trên GitHub Pages và đọc PMTiles trực tiếp từ Cloudflare R2 bằng HTTP Range Request.

## R2

- Base URL: `https://pub-c4fd9d1f887041be97a2542a7664ff95.r2.dev`
- Object mặc định: `vietnam_biendong_webgis.pmtiles`
- GitHub Pages: `https://xulytiengviet.github.io/mapbasic2/`

Nếu object trên R2 có tên khác, chỉ sửa `pmtilesObject` trong `config.js`.

## CORS Policy

Dán nội dung `cors-policy.json` vào Cloudflare Dashboard → R2 → bucket → Settings → CORS Policy.

Lưu ý: Origin phải là `https://xulytiengviet.github.io`, không thêm `/mapbasic2/`.

## GitHub Pages

Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## Kiểm tra

Mở DevTools → Network. Request tới file `.pmtiles` phải tải được; các request byte-range thường trả `206 Partial Content`.
