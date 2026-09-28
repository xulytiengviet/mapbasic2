# Vietflex Basemap — mapbasic2

Static WebGIS dùng MapLibre GL JS + PMTiles, chạy trên GitHub Pages và đọc PMTiles trực tiếp từ Cloudflare R2 bằng HTTP Range Request.

## R2

- Base URL: `https://pub-c4fd9d1f887041be97a2542a7664ff95.r2.dev`
- Object: `basemap.pmtiles`
- Public PMTiles URL: `https://pub-c4fd9d1f887041be97a2542a7664ff95.r2.dev/basemap.pmtiles`
- GitHub Pages: `https://xulytiengviet.github.io/mapbasic2/`

Nếu object trên R2 đổi tên, chỉ sửa `pmtilesObject` trong `config.js`.

## CORS Policy

Dán nội dung `cors-policy.json` vào Cloudflare Dashboard → R2 → bucket `mapbasic2` → Settings → CORS Policy.

Origin phải là `https://xulytiengviet.github.io`, không thêm `/mapbasic2/`.

## GitHub Pages

Settings → Pages → Deploy from a branch → `main` → `/ (root)`.

## Kiểm tra

Mở DevTools → Network. Request tới `basemap.pmtiles` phải tải được; các request byte-range thường trả `206 Partial Content`.
