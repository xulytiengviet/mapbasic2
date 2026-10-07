(() => {
  "use strict";

  const cfg = window.VIETFLEX_CONFIG;
  const protocol = new pmtiles.Protocol({ metadata: true });
  const runtime = new Map();
  let map = null;

  const TILE_TYPE_MVT = 1;

  function archiveUrl(layer) {
    const base = cfg.storage.r2BaseUrl.replace(/\/$/, "") + "/";
    const url = new URL(layer.pmtilesObject, base);

    if (cfg.storage.dataVersion) {
      url.searchParams.set("v", cfg.storage.dataVersion);
    }

    return url.href;
  }

  function dataUrl(layer) {
    const url = new URL(layer.dataObject, window.location.href);

    if (cfg.storage.dataVersion) {
      url.searchParams.set("v", cfg.storage.dataVersion);
    }

    return url.href;
  }

  function withTimeout(promise, ms, label) {
    let timer;

    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Hết thời gian chờ ${label}`)),
        ms
      );
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  function sourceId(id) {
    return `pmtiles-source-${id}`;
  }

  function layerId(id) {
    return `pmtiles-layer-${id}`;
  }

  function safeId(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "layer";
  }

  function vectorLayerNames(metadata) {
    let layers = metadata?.vector_layers;

    if (!Array.isArray(layers) && metadata?.json) {
      try {
        const parsed = typeof metadata.json === "string"
          ? JSON.parse(metadata.json)
          : metadata.json;
        layers = parsed?.vector_layers;
      } catch (error) {
        console.warn("Không đọc được metadata.json của vector tiles:", error);
      }
    }

    if (!Array.isArray(layers)) return [];

    return [...new Set(
      layers
        .map((item) => typeof item === "string" ? item : item?.id)
        .filter((name) => typeof name === "string" && name.trim())
    )];
  }

  function layerRow(id) {
    return document.querySelector(`[data-layer-row="${id}"]`);
  }

  function setStatus(id, state, message = "") {
    const row = layerRow(id);
    if (!row) return;

    row.dataset.state = state;

    const status = row.querySelector(".layer-status");
    if (!status) return;

    const text = {
      idle: "Chưa tải",
      loading: "Đang tải…",
      ready: "Sẵn sàng",
      error: "Lỗi nguồn"
    }[state] || "";

    status.textContent = message || text;
    status.title = message || text;
  }

  function checkboxFor(id) {
    return document.querySelector(`[data-layer-toggle="${id}"]`);
  }

  function opacityFor(id) {
    return document.querySelector(`[data-layer-opacity="${id}"]`);
  }

  function setControlsDisabled(id, disabled) {
    const checkbox = checkboxFor(id);
    const opacity = opacityFor(id);

    if (checkbox) checkbox.disabled = disabled;
    if (opacity) opacity.disabled = disabled;
  }

  function friendlyError(id, error) {
    const message = error?.message || String(error);

    if (/failed to fetch/i.test(message)) {
      return "Không thể kết nối nguồn PMTiles. Kiểm tra Public Access, CORS, URL object và HTTP Range.";
    }

    if (/404|bad response code/i.test(message)) {
      return "Không tìm thấy object PMTiles trên R2.";
    }

    return message;
  }

  function firstMapLayerFor(id) {
    const entry = runtime.get(id);
    if (entry?.mapLayerIds?.length) {
      return entry.mapLayerIds[0];
    }

    const fallback = layerId(id);
    return map.getLayer(fallback) ? fallback : undefined;
  }

  function findBeforeLayer(order) {
    const candidates = Object.entries(cfg.layers)
      .filter(([, def]) => def.order > order)
      .sort((a, b) => a[1].order - b[1].order);

    for (const [id] of candidates) {
      const candidateId = firstMapLayerFor(id);
      if (candidateId && map.getLayer(candidateId)) {
        return candidateId;
      }
    }

    return undefined;
  }

  function addRasterLayer(id, def, url, minzoom, maxzoom) {
    const mapLayerIds = [];

    if (!map.getSource(sourceId(id))) {
      map.addSource(sourceId(id), {
        type: "raster",
        url: `pmtiles://${url}`,
        tileSize: 256,
        minzoom,
        maxzoom,
        attribution: def.attribution || def.label
      });
    }

    if (!map.getLayer(layerId(id))) {
      const beforeId = findBeforeLayer(def.order);

      map.addLayer(
        {
          id: layerId(id),
          type: "raster",
          source: sourceId(id),
          minzoom,
          paint: {
            "raster-opacity": def.opacity ?? 1,
            "raster-fade-duration": 0,
            "raster-resampling": "linear"
          },
          layout: {
            visibility: def.visible ? "visible" : "none"
          }
        },
        beforeId
      );
    }

    mapLayerIds.push(layerId(id));
    return mapLayerIds;
  }

  function addVectorLayer(id, def, url, minzoom, maxzoom, sourceLayers) {
    const mapLayerIds = [];
    const beforeId = findBeforeLayer(def.order);
    const opacity = def.opacity ?? 1;

    if (!map.getSource(sourceId(id))) {
      map.addSource(sourceId(id), {
        type: "vector",
        url: `pmtiles://${url}`,
        minzoom,
        maxzoom,
        attribution: def.attribution || def.label
      });
    }

    sourceLayers.forEach((sourceLayer, index) => {
      const suffix = `${index}-${safeId(sourceLayer)}`;
      const fillId = `${layerId(id)}-fill-${suffix}`;
      const lineId = `${layerId(id)}-line-${suffix}`;
      const pointId = `${layerId(id)}-point-${suffix}`;

      if (!map.getLayer(fillId)) {
        map.addLayer({
          id: fillId,
          type: "fill",
          source: sourceId(id),
          "source-layer": sourceLayer,
          minzoom,
          layout: { visibility: def.visible ? "visible" : "none" },
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: {
            "fill-color": "#4f8fd8",
            "fill-opacity": Math.min(0.22, opacity * 0.22),
            "fill-outline-color": "#155aa8"
          }
        }, beforeId);
      }

      if (!map.getLayer(lineId)) {
        map.addLayer({
          id: lineId,
          type: "line",
          source: sourceId(id),
          "source-layer": sourceLayer,
          minzoom,
          layout: { visibility: def.visible ? "visible" : "none" },
          filter: ["==", ["geometry-type"], "LineString"],
          paint: {
            "line-color": "#155aa8",
            "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.7, 8, 1.4, 14, 2.2],
            "line-opacity": opacity
          }
        }, beforeId);
      }

      if (!map.getLayer(pointId)) {
        map.addLayer({
          id: pointId,
          type: "circle",
          source: sourceId(id),
          "source-layer": sourceLayer,
          minzoom,
          layout: { visibility: def.visible ? "visible" : "none" },
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-color": "#155aa8",
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2, 12, 5],
            "circle-opacity": opacity,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 1
          }
        }, beforeId);
      }

      mapLayerIds.push(fillId, lineId, pointId);
    });

    return mapLayerIds;
  }

  function addGeojsonLayer(id, def, url) {
    const beforeId = findBeforeLayer(def.order);
    const mapLayerIds = [];
    const visibility = def.visible ? "visible" : "none";

    if (!map.getSource(sourceId(id))) {
      map.addSource(sourceId(id), {
        type: "geojson",
        data: url,
        attribution: def.attribution || def.label
      });
    }

    const fillId = `${layerId(id)}-fill`;
    const lineId = `${layerId(id)}-line`;
    const pointId = `${layerId(id)}-point`;

    if (!map.getLayer(fillId)) {
      map.addLayer({
        id: fillId,
        type: "fill",
        source: sourceId(id),
        filter: ["==", ["geometry-type"], "Polygon"],
        layout: { visibility },
        paint: {
          "fill-color": [
            "match", ["get", "layer"],
            "lanh_hai_12nm", "#2878b5",
            "tiep_giap_lanh_hai", "#4aa3df",
            "eez_reference_band", "#2ca58d",
            "them_luc_dia_200nm_tham_khao", "#8e63b0",
            "vung_ngoai_200nm_tham_khao", "#8c969d",
            "#5b8db8"
          ],
          "fill-opacity": [
            "match", ["get", "layer"],
            "lanh_hai_12nm", 0.25,
            "tiep_giap_lanh_hai", 0.18,
            "eez_reference_band", 0.12,
            "them_luc_dia_200nm_tham_khao", 0.07,
            "vung_ngoai_200nm_tham_khao", 0.035,
            0.12
          ]
        }
      }, beforeId);
    }

    if (!map.getLayer(lineId)) {
      map.addLayer({
        id: lineId,
        type: "line",
        source: sourceId(id),
        layout: { visibility },
        paint: {
          "line-color": [
            "match", ["get", "layer"],
            "duong_co_so", "#e31a1c",
            "lanh_hai_12nm", "#1f5f99",
            "tiep_giap_lanh_hai", "#247eb5",
            "eez_reference_band", "#13866f",
            "gioi_han_200nm_ky_thuat", "#8b2fb3",
            "them_luc_dia_200nm_tham_khao", "#674087",
            "vung_ngoai_200nm_tham_khao", "#667078",
            "phan_dinh_vinh_bac_bo_2000", "#111111",
            "ranh_ngoai_lanh_hai_bac_luan_2025", "#7a0000",
            "#315f80"
          ],
          "line-width": [
            "match", ["get", "layer"],
            "duong_co_so", 2.6,
            "phan_dinh_vinh_bac_bo_2000", 2.8,
            "ranh_ngoai_lanh_hai_bac_luan_2025", 2.6,
            "gioi_han_200nm_ky_thuat", 2.0,
            1.3
          ],
          "line-opacity": def.opacity ?? 0.9
        }
      }, beforeId);
    }

    if (!map.getLayer(pointId)) {
      map.addLayer({
        id: pointId,
        type: "circle",
        source: sourceId(id),
        filter: ["==", ["geometry-type"], "Point"],
        layout: { visibility },
        paint: {
          "circle-color": "#e31a1c",
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.5, 8, 4.5, 12, 6],
          "circle-opacity": def.opacity ?? 0.9,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.2
        }
      }, beforeId);
    }

    mapLayerIds.push(fillId, lineId, pointId);
    return mapLayerIds;
  }

  async function ensureLayer(id) {
    if (runtime.has(id)) return runtime.get(id);

    const def = cfg.layers[id];
    if (!def) throw new Error(`Không có cấu hình lớp ${id}`);

    setStatus(id, "loading");
    setControlsDisabled(id, true);

    try {
      if (def.sourceKind === "geojson") {
        const url = dataUrl(def);
        const mapLayerIds = addGeojsonLayer(id, def, url);
        const entry = {
          id,
          def,
          url,
          sourceType: "geojson",
          mapLayerIds
        };

        runtime.set(id, entry);
        setStatus(id, "ready", "Sẵn sàng · GeoJSON · Vùng biển");
        setControlsDisabled(id, false);
        return entry;
      }

      const url = archiveUrl(def);
      const archive = new pmtiles.PMTiles(url);

      protocol.add(archive);

      const header = await withTimeout(
        archive.getHeader(),
        cfg.probeTimeoutMs || 8000,
        def.pmtilesObject
      );

      if (!header || header.specVersion !== 3) {
        throw new Error("Archive không phải PMTiles v3 hợp lệ.");
      }

      const minzoom = Number.isFinite(header.minZoom)
        ? header.minZoom
        : cfg.map.minZoom;

      const maxzoom = Number.isFinite(header.maxZoom)
        ? header.maxZoom
        : cfg.map.maxZoom;

      const isVector = header.tileType === TILE_TYPE_MVT;
      let metadata = null;
      let sourceLayers = [];
      let mapLayerIds = [];

      if (isVector) {
        metadata = await withTimeout(
          archive.getMetadata(),
          cfg.probeTimeoutMs || 8000,
          `${def.pmtilesObject} metadata`
        );

        sourceLayers = vectorLayerNames(metadata);

        if (!sourceLayers.length) {
          throw new Error("PMTiles là MVT nhưng metadata không có vector_layers/source-layer để hiển thị.");
        }

        mapLayerIds = addVectorLayer(
          id,
          def,
          url,
          minzoom,
          maxzoom,
          sourceLayers
        );
      } else {
        mapLayerIds = addRasterLayer(id, def, url, minzoom, maxzoom);
      }

      const entry = {
        id,
        def,
        url,
        archive,
        header,
        metadata,
        sourceLayers,
        sourceType: isVector ? "vector" : "raster",
        mapLayerIds
      };
      runtime.set(id, entry);

      const typeLabel = isVector ? `MVT · ${sourceLayers.length} lớp` : "Raster";
      setStatus(id, "ready", `Sẵn sàng · ${typeLabel} · Z${minzoom}–Z${maxzoom}`);
      setControlsDisabled(id, false);

      return entry;
    } catch (error) {
      console.error(`Vietflex layer ${id}:`, error);

      setStatus(id, "error", friendlyError(id, error));
      setControlsDisabled(id, false);

      const checkbox = checkboxFor(id);
      if (checkbox) checkbox.checked = false;

      throw error;
    }
  }

  async function setLayerVisible(id, visible) {
    try {
      const entry = visible ? await ensureLayer(id) : runtime.get(id);
      if (!entry) return;

      entry.mapLayerIds.forEach((mapLayerId) => {
        if (map.getLayer(mapLayerId)) {
          map.setLayoutProperty(
            mapLayerId,
            "visibility",
            visible ? "visible" : "none"
          );
        }
      });
    } catch {
      // Trạng thái lỗi đã được cập nhật trong ensureLayer.
    }
  }

  function setLayerOpacity(id, value) {
    const entry = runtime.get(id);
    if (!entry) return;

    const opacity = Math.max(0, Math.min(1, Number(value)));

    entry.mapLayerIds.forEach((mapLayerId) => {
      const layer = map.getLayer(mapLayerId);
      if (!layer) return;

      if (layer.type === "raster") {
        map.setPaintProperty(mapLayerId, "raster-opacity", opacity);
      } else if (layer.type === "fill") {
        map.setPaintProperty(mapLayerId, "fill-opacity", Math.min(0.22, opacity * 0.22));
      } else if (layer.type === "line") {
        map.setPaintProperty(mapLayerId, "line-opacity", opacity);
      } else if (layer.type === "circle") {
        map.setPaintProperty(mapLayerId, "circle-opacity", opacity);
      }
    });
  }

  function bindLayerPanel() {
    document.querySelectorAll("[data-layer-toggle]").forEach((input) => {
      const id = input.dataset.layerToggle;

      input.addEventListener("change", async () => {
        await setLayerVisible(id, input.checked);
      });
    });

    document.querySelectorAll("[data-layer-opacity]").forEach((input) => {
      const id = input.dataset.layerOpacity;

      input.addEventListener("input", () => {
        setLayerOpacity(id, Number(input.value) / 100);
      });
    });

    const panel = document.getElementById("layerPanel");
    const button = document.getElementById("layerPanelToggle");

    button?.addEventListener("click", () => {
      const collapsed = panel.classList.toggle("is-collapsed");
      button.setAttribute("aria-expanded", collapsed ? "false" : "true");
    });
  }

  async function bootstrap() {
    if (!cfg?.storage?.r2BaseUrl || !cfg?.layers || !cfg?.map) {
      throw new Error("Thiếu cấu hình R2, bản đồ hoặc lớp.");
    }

    if (!window.maplibregl) {
      throw new Error("MapLibre GL JS chưa tải được.");
    }

    if (!window.pmtiles) {
      throw new Error("PMTiles JS chưa tải được.");
    }

    maplibregl.addProtocol("pmtiles", protocol.tile);

    map = new maplibregl.Map({
      container: "map",
      center: cfg.map.center,
      zoom: cfg.map.zoom,
      minZoom: cfg.map.minZoom,
      maxZoom: cfg.map.maxZoom,
      bearing: cfg.map.bearing || 0,
      pitch: cfg.map.pitch || 0,
      renderWorldCopies: cfg.map.renderWorldCopies ?? false,
      attributionControl: false,
      style: {
        version: 8,
        sources: {},
        layers: []
      }
    });

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    map.addControl(new maplibregl.FullscreenControl(), "top-right");

    bindLayerPanel();

    map.on("load", async () => {
      const ordered = Object.entries(cfg.layers)
        .sort((a, b) => a[1].order - b[1].order);

      for (const [id, def] of ordered) {
        const checkbox = checkboxFor(id);
        const opacity = opacityFor(id);

        if (checkbox) checkbox.checked = Boolean(def.visible);
        if (opacity) opacity.value = Math.round((def.opacity ?? 1) * 100);

        setStatus(id, "idle");

        if (def.visible) {
          await setLayerVisible(id, true);
        }
      }

      map.resize();
    });

    map.on("error", (event) => {
      const error = event?.error;
      if (error) console.error("Vietflex MapLibre:", error);
    });

    window.__VIETFLEX_MAP__ = map;
    window.__VIETFLEX_LAYERS__ = runtime;
    window.__VIETFLEX_STORAGE__ = cfg.storage;

    window.addEventListener("beforeunload", () => {
      maplibregl.removeProtocol("pmtiles");
    });
  }

  bootstrap().catch((error) => {
    console.error(error);

    const fatal = document.getElementById("fatalError");
    if (fatal) {
      fatal.hidden = false;
      fatal.textContent = error?.message || String(error);
    }
  });
})();
