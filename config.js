window.VIETFLEX_CONFIG = Object.freeze({
  defaultMode: "mapbasic2",

  modes: Object.freeze({
    mapbasic: Object.freeze({
      label: "Mapbasic",
      r2BaseUrl: "https://pub-40df081e07ea4052aeb0ac2c33ae3fb4.r2.dev",
      pmtilesObject: "vietnam_biendong_webgis.pmtiles",
      minSourceZoom: 3,
      maxSourceZoom: 11,
      attribution: "Vietflex Mapbasic"
    }),

    mapbasic2: Object.freeze({
      label: "Mapbasic2",
      r2BaseUrl: "https://pub-c4fd9d1f887041be97a2542a7664ff95.r2.dev",
      pmtilesObject: "basemap.pmtiles",
      minSourceZoom: 3,
      maxSourceZoom: 11,
      attribution: "Vietflex Mapbasic2"
    })
  }),

  mapMaxZoom: 18,
  center: [108.2, 15.7],
  zoom: 4.7,
  bounds: [92.0, -2.0, 126.0, 26.0],
  probeTimeoutMs: 8000
});
