window.VIETFLEX_CONFIG = Object.freeze({
  storage: Object.freeze({
    r2BaseUrl: "https://pub-c4fd9d1f887041be97a2542a7664ff95.r2.dev",
    dataVersion: "2026-10-07-2"
  }),

  layers: Object.freeze({
    mapbasic2: Object.freeze({
      label: "Mapbasic2",
      pmtilesObject: "basemap.pmtiles",
      visible: true,
      opacity: 1,
      order: 0,
      attribution: "Vietflex Mapbasic2"
    }),

    mapbasic: Object.freeze({
      label: "Mapbasic",
      pmtilesObject: "vietnam_biendong_webgis.pmtiles",
      visible: false,
      opacity: 0.7,
      order: 1,
      attribution: "Vietflex Mapbasic"
    }),

    mapbasic3: Object.freeze({
      label: "Mapbasic3 · Địa phận tỉnh 2025",
      pmtilesObject: "VN_Dia_Phan_Tinh_2025.pmtiles",
      sourceMbtilesObject: "VN_Dia_Phan_Tinh_2025.mbtiles",
      visible: false,
      opacity: 0.85,
      order: 2,
      attribution: "Vietflex Mapbasic3 · Địa phận tỉnh 2025"
    }),

    mapbasic4: Object.freeze({
      label: "Mapbasic4 · Địa phận xã 2025",
      pmtilesObject: "VN_Dia_Phan_Xa_2025.pmtiles",
      sourceMbtilesObject: "VN_Dia_Phan_Xa_2025.mbtiles",
      visible: false,
      opacity: 0.9,
      order: 3,
      attribution: "Vietflex Mapbasic4 · Địa phận xã 2025"
    }),

    mapbasic5: Object.freeze({
      label: "Mapbasic5 · Vùng biển",
      pmtilesObject: "VN_Vung_Bien_Dong_2026.pmtiles",
      visible: true,
      opacity: 0.9,
      order: 4,
      attribution: "Vietflex Mapbasic5 · Vùng biển Đông 2026"
    })
  }),

  map: Object.freeze({
    center: [108.2, 15.7],
    zoom: 4.7,
    minZoom: 3,
    maxZoom: 18,
    bearing: 0,
    pitch: 0,
    renderWorldCopies: false
  }),

  probeTimeoutMs: 10000
});
