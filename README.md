# Vietflex Basemap — mapbasic2

WebGIS một khung bản đồ, quản lý các PMTiles như các layer độc lập bằng MapLibre GL JS + PMTiles.

## Storage hiện tại

Các dữ liệu nằm chung bucket Cloudflare R2 `mapbasic2` và dùng cùng public endpoint:

`https://pub-c4fd9d1f887041be97a2542a7664ff95.r2.dev`

Các object đang dùng trực tiếp trên WebGIS:

- `basemap.pmtiles`
- `vietnam_biendong_webgis.pmtiles`
- `VN_Dia_Phan_Tinh_2025.pmtiles` — Mapbasic3
- `VN_Dia_Phan_Xa_2025.pmtiles` — Mapbasic4
- `VN_Vung_Bien_Dong_2026.pmtiles` — Mapbasic5 · Vùng biển

Hai object nguồn MBTiles:

- `VN_Dia_Phan_Tinh_2025.mbtiles`
- `VN_Dia_Phan_Xa_2025.mbtiles`

> Mã ứng dụng hiện tại được giữ nguyên theo pipeline PMTiles v3. Vì MBTiles là SQLite, trình duyệt không đọc trực tiếp hai file `.mbtiles` bằng `pmtiles.Protocol`. Hai file nguồn cần được chuyển 1–1 sang PMTiles trước khi bật Mapbasic3/Mapbasic4.

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

### Mapbasic3 · Địa phận tỉnh 2025
- Nguồn: `VN_Dia_Phan_Tinh_2025.mbtiles`
- Object WebGIS: `VN_Dia_Phan_Tinh_2025.pmtiles`
- Mặc định: tắt
- Opacity mặc định: 85%
- Khi bật, layer được tải theo yêu cầu

### Mapbasic4 · Địa phận xã 2025
- Nguồn: `VN_Dia_Phan_Xa_2025.mbtiles`
- Object WebGIS: `VN_Dia_Phan_Xa_2025.pmtiles`
- Mặc định: tắt
- Opacity mặc định: 90%
- Khi bật, layer được tải theo yêu cầu

### Mapbasic5 · Vùng biển
- Object WebGIS: `VN_Vung_Bien_Dong_2026.pmtiles`
- PMTiles v3, raster PNG nền trong suốt
- Zoom: Z3–Z10
- Mặc định: bật
- Opacity mặc định: 90%
- Chồng trực tiếp lên Mapbasic2

## Chuyển MBTiles → PMTiles

Dùng PMTiles CLI:

```bash
pmtiles convert VN_Dia_Phan_Tinh_2025.mbtiles VN_Dia_Phan_Tinh_2025.pmtiles
pmtiles convert VN_Dia_Phan_Xa_2025.mbtiles VN_Dia_Phan_Xa_2025.pmtiles
```

Kiểm tra trước khi upload lại R2:

```bash
pmtiles show VN_Dia_Phan_Tinh_2025.pmtiles
pmtiles verify VN_Dia_Phan_Tinh_2025.pmtiles

pmtiles show VN_Dia_Phan_Xa_2025.pmtiles
pmtiles verify VN_Dia_Phan_Xa_2025.pmtiles
```

Sau đó upload hai file PMTiles vào cùng bucket `mapbasic2` với đúng tên object ở trên. Không xóa hai MBTiles nguồn nếu vẫn cần lưu bản gốc.

## Cache/version

Vì các PMTiles cũ đã được cập nhật nhưng vẫn giữ nguyên tên object, `config.js` dùng:

`dataVersion: "2026-10-07-2"`

Ứng dụng thêm query version vào URL PMTiles để trình duyệt không trộn byte-range cache của phiên bản cũ với phiên bản mới.

Khi thay nội dung một PMTiles nhưng vẫn giữ nguyên tên file, tăng `dataVersion`.

## CORS

Bucket `mapbasic2` cần cho phép origin GitHub Pages:

- `https://xulytiengviet.github.io`

Có thể giữ thêm `https://base27-cvnss.github.io` nếu muốn trang Base27 truy cập cùng bucket.

Policy mẫu nằm trong `cors-policy.json`.

## GitHub Pages

Trang:

`https://xulytiengviet.github.io/mapbasic2/`

Sau khi deploy, mở DevTools → Network và kiểm tra các request `.pmtiles?v=...`. Request byte-range hợp lệ thường trả `206 Partial Content`.
