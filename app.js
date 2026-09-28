(() => {
  "use strict";

  const cfg = window.VIETFLEX_CONFIG;
  const protocol = new pmtiles.Protocol({ metadata: true });
  const runtime = new Map();
  let map = null;

  function archiveUrl(layer) {
    return `${layer.r2BaseUrl.replace(/\/$/, "")}/${layer.pmtilesObject}`;
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

  async function ensureLayer(id) {
    if (runtime.has(id)) return runtime.get(id);

    const def = cfg.layers[id];
    if (!def) throw new Error(`Không có cấu hình lớp ${id}`);

    setStatus(id, "loading");
    setControlsDisabled(id, true);

    try {
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

      const entry = { id, def, url, archive, header };
      runtime.set(id, entry);

      setStatus(id, "ready");
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

  function findBeforeLayer(order) {
    const candidates = Object.entries(cfg.layers)
      .filter(([, def]) => def.order > order)
      .sort((a, b) => a[1].order - b[1].order);

    for (const [id] of candidates) {
      if (map.getLayer(layerId(id))) {
        return layerId(id);
      }
    }

    return undefined;
  }

  async function setLayerVisible(id, visible) {
    try {
      if (visible) {
        await ensureLayer(id);
      }

      if (map.getLayer(layerId(id))) {
        map.setLayoutProperty(
          layerId(id),
          "visibility",
          visible ? "visible" : "none"
        );
      }
    } catch {
      // Trạng thái lỗi đã được cập nhật trong ensureLayer.
    }
  }

  function setLayerOpacity(id, value) {
    if (!map.getLayer(layerId(id))) return;

    map.setPaintProperty(
      layerId(id),
      "raster-opacity",
      Math.max(0, Math.min(1, Number(value)))
    );
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
    if (!cfg?.layers || !cfg?.map) {
      throw new Error("Thiếu cấu hình bản đồ/lớp.");
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
