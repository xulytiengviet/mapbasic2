# Vietflex Basemap — mapbasic2

WebGIS một khung bản đồ, quản lý nhiều nguồn PMTiles theo lớp (layer) bằng MapLibre GL JS.

## Các lớp

### Mapbasic2
- R2: `https://pub-c4fd9d1f887041be97a2542a7664ff95.r2.dev`
- Object: `basemap.pmtiles`
- Mặc định: bật, opacity 100%

### Mapbasic
- R2: `https://pub-40df081e07ea4052aeb0ac2c33ae3fb4.r2.dev`
- Object: `vietnam_biendong_webgis.pmtiles`
- Mặc định: tắt, tải theo yêu cầu khi người dùng bật layer

## CORS bắt buộc cho Mapbasic

Nếu Mapbasic báo `Failed to fetch`, code frontend không thể vượt qua CORS của trình duyệt.

Trên bucket R2 chứa `vietnam_biendong_webgis.pmtiles`, đặt CORS bằng nội dung `cors-policy.json`.

Hai origin cần được cho phép:

- `https://base27-cvnss.github.io`
- `https://xulytiengviet.github.io`

Không thêm đường dẫn `/mapbase/` hoặc `/mapbasic2/` vào Origin.

## GitHub Pages

Trang:

`https://xulytiengviet.github.io/mapbasic2/`

Mở DevTools → Network để kiểm tra request PMTiles. Byte-range hợp lệ thường trả `206 Partial Content`.
