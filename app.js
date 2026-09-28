(() => {
  "use strict";

  const cfg = window.VIETFLEX_CONFIG;
  const protocol = new pmtiles.Protocol({ metadata: true });
  const maps = {};
  const archives = {};
  let syncing = false;

  function withTimeout(promise, ms, label) {
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Hết thời gian chờ ${label}`)),
        ms
      );
    });

    return Promise.race([promise, timeout])
      .finally(() => clearTimeout(timer));
  }

  function archiveUrl(mode) {
    return `${mode.r2BaseUrl.replace(/\/$/, "")}/${mode.pmtilesObject}`;
  }

  function paneError(id, title, message) {
    const panel = document.querySelector(`[data-error-for="${id}"]`);
    if (!panel) return;

    const titleEl = panel.querySelector(".pane-error-title");
    const messageEl = panel.querySelector(".pane-error-message");

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    panel.hidden = false;
  }

  function clearPaneError(id) {
    const panel = document.querySelector(`[data-error-for="${id}"]`);
    if (panel) panel.hidden = true;
  }

  async function prepareArchive(id, mode) {
    const url = archiveUrl(mode);
    const archive = new pmtiles.PMTiles(url);

    protocol.add(archive);

    const header = await withTimeout(
      archive.getHeader(),
      cfg.probeTimeoutMs || 8000,
      mode.pmtilesObject
    );

    if (!header || header.specVersion !== 3) {
      throw new Error(`${mode.pmtilesObject} không phải PMTiles v3 hợp lệ.`);
    }

    archives[id] = { archive, archiveUrl: url, header };
    return archives[id];
  }

  function makeStyle(id, mode) {
    const entry = archives[id];

    return {
      version: 8,
      sources: {
        [id]: {
          type: "raster",
          url: `pmtiles://${entry.archiveUrl}`,
          tileSize: 256,
          minzoom: mode.minSourceZoom,
          maxzoom: mode.maxSourceZoom,
          attribution: mode.attribution
        }
      },
      layers: [
        {
          id: `${id}-raster`,
          type: "raster",
          source: id,
          minzoom: mode.minSourceZoom,
          paint: {
            "raster-opacity": 1,
            "raster-fade-duration": 0,
            "raster-resampling": "linear"
          }
        }
      ]
    };
  }

  function createMap(id, mode) {
    const map = new maplibregl.Map({
      container: mode.container,
      center: cfg.center,
      zoom: cfg.zoom,
      bearing: cfg.bearing || 0,
      pitch: cfg.pitch || 0,
      minZoom: mode.minSourceZoom,
      maxZoom: cfg.mapMaxZoom,
      attributionControl: false,
      renderWorldCopies: false,
      style: makeStyle(id, mode)
    });

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    map.on("load", () => {
      map.resize();
      clearPaneError(id);
    });

    map.on("error", (event) => {
      const message =
        event?.error?.message || "Không thể tải tile PMTiles.";
      console.error(`Vietflex ${id}:`, event?.error || event);
      paneError(id, `Không tải được ${mode.label}`, message);
    });

    maps[id] = map;
    return map;
  }

  function cameraOf(map) {
    const center = map.getCenter();

    return {
      center: [center.lng, center.lat],
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch()
    };
  }

  function syncMap(sourceId, targetId) {
    const source = maps[sourceId];
    const target = maps[targetId];

    if (!source || !target || syncing) return;

    syncing = true;
    target.jumpTo(cameraOf(source));

    requestAnimationFrame(() => {
      syncing = false;
    });
  }

  function enableSync() {
    maps.mapbasic.on("move", () => {
      syncMap("mapbasic", "mapbasic2");
    });

    maps.mapbasic2.on("move", () => {
      syncMap("mapbasic2", "mapbasic");
    });
  }

  async function startPane(id, mode) {
    try {
      clearPaneError(id);
      await prepareArchive(id, mode);
      createMap(id, mode);
      return true;
    } catch (error) {
      console.error(error);
      paneError(
        id,
        `Không đọc được ${mode.label}`,
        error?.message || String(error)
      );
      return false;
    }
  }

  async function bootstrap() {
    try {
      if (!cfg?.maps) {
        throw new Error("Thiếu cấu hình hai bản đồ.");
      }

      if (!window.maplibregl) {
        throw new Error("MapLibre GL JS chưa tải được.");
      }

      if (!window.pmtiles) {
        throw new Error("PMTiles JS chưa tải được.");
      }

      maplibregl.addProtocol("pmtiles", protocol.tile);

      const [leftOk, rightOk] = await Promise.all([
        startPane("mapbasic", cfg.maps.mapbasic),
        startPane("mapbasic2", cfg.maps.mapbasic2)
      ]);

      if (leftOk && rightOk) {
        enableSync();
      }

      window.__VIETFLEX_MAPS__ = maps;
      window.__VIETFLEX_PMTILES__ = archives;

      window.addEventListener("resize", () => {
        Object.values(maps).forEach((map) => map.resize());
      });

      window.addEventListener("beforeunload", () => {
        maplibregl.removeProtocol("pmtiles");
      });
    } catch (error) {
      console.error(error);

      Object.keys(cfg?.maps || {}).forEach((id) => {
        paneError(
          id,
          "Không khởi tạo được bản đồ",
          error?.message || String(error)
        );
      });
    }
  }

  bootstrap();
})();
