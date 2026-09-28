# Vietflex Basemap — mapbasic2

WebGIS một khung bản đồ, quản lý hai PMTiles như các layer độc lập bằng MapLibre GL JS + PMTiles.

## Storage hiện tại

Cả hai PMTiles nằm chung bucket Cloudflare R2 `mapbasic2` và dùng cùng public endpoint:

`https://pub-c4fd9d1f887041be97a2542a7664ff95.r2.dev`

Các object:

- `basemap.pmtiles`
- `vietnam_biendong_webgis.pmtiles`

## Các layer

### Mapbasic2
- Object: `basemap.pmtiles`
- Mặc định: bật
- Opacity mặc định: 100%

### Mapbasic
- Object: `vietnam_biendong_webgis.pmtiles`
- Mặc định: tắt
- Opacity mặc định: 70%
- Khi bật, layer được tải theo yêu cầu

## Cache/version

Vì hai PMTiles đã được cập nhật nhưng vẫn giữ nguyên tên object, `config.js` dùng:

`dataVersion: "2026-09-28-2"`

Ứng dụng thêm query version vào URL PMTiles để trình duyệt không trộn byte-range cache của phiên bản cũ với phiên bản mới.

Khi thay PMTiles lần sau nhưng vẫn giữ nguyên tên file, chỉ cần tăng `dataVersion`.

## CORS

Bucket `mapbasic2` cần cho phép origin GitHub Pages:

- `https://xulytiengviet.github.io`

Có thể giữ thêm `https://base27-cvnss.github.io` nếu muốn trang Base27 truy cập cùng bucket.

Policy mẫu nằm trong `cors-policy.json`.

## GitHub Pages

Trang:

`https://xulytiengviet.github.io/mapbasic2/`

Sau khi deploy, mở DevTools → Network và kiểm tra các request `.pmtiles?v=...`. Request byte-range hợp lệ thường trả `206 Partial Content`.
