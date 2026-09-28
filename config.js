window.VIETFLEX_CONFIG = Object.freeze({
  layers: Object.freeze({
    mapbasic2: Object.freeze({
      label: "Mapbasic2",
      r2BaseUrl: "https://pub-c4fd9d1f887041be97a2542a7664ff95.r2.dev",
      pmtilesObject: "basemap.pmtiles",
      visible: true,
      opacity: 1,
      order: 0,
      attribution: "Vietflex Mapbasic2"
    }),

    mapbasic: Object.freeze({
      label: "Mapbasic",
      r2BaseUrl: "https://pub-455588dd8bc84c5bab992d0db75a3a93.r2.dev",
      pmtilesObject: "vietnam_biendong_webgis.pmtiles",
      visible: false,
      opacity: 0.7,
      order: 1,
      attribution: "Vietflex Mapbasic"
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

  probeTimeoutMs: 8000
});
