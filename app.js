(() => {
  "use strict";

  const cfg = window.VIETFLEX_CONFIG;
  const errorPanel = document.getElementById("errorPanel");
  const errorTitle = document.getElementById("errorTitle");
  const errorMessage = document.getElementById("errorMessage");
  const modeButtons = [...document.querySelectorAll("[data-map-mode]")];

  let map = null;
  let protocol = null;
  let activeModeId = null;

  const archives = new Map();

  function showError(title, message) {
    if (!errorPanel) return;
    if (errorTitle) errorTitle.textContent = title || "Không đọc được bản đồ";
    if (errorMessage) errorMessage.textContent = message || "Không xác định";
    errorPanel.hidden = false;
  }

  function hideError() {
    if (errorPanel) errorPanel.hidden = true;
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

  function getMode(id) {
    return cfg?.modes?.[id] || null;
  }

  function getArchiveUrl(mode) {
    return `${mode.r2BaseUrl.replace(/\/$/, "")}/${mode.pmtilesObject}`;
  }

  function getArchive(id) {
    if (archives.has(id)) return archives.get(id);

    const mode = getMode(id);
    if (!mode) throw new Error(`Không tồn tại chế độ ${id}`);

    const archiveUrl = getArchiveUrl(mode);
    const archive = new pmtiles.PMTiles(archiveUrl);

    protocol.add(archive);

    const entry = { archive, archiveUrl, header: null };
    archives.set(id, entry);
    return entry;
  }

  async function probeMode(id) {
    const mode = getMode(id);
    const entry = getArchive(id);

    if (!entry.header) {
      entry.header = await withTimeout(
        entry.archive.getHeader(),
        cfg.probeTimeoutMs || 8000,
        mode.pmtilesObject
      );
    }

    if (!entry.header || entry.header.specVersion !== 3) {
      throw new Error(`${mode.pmtilesObject} không phải PMTiles v3 hợp lệ.`);
    }

    return entry;
  }

  function styleForMode(id) {
    const mode = getMode(id);
    const entry = getArchive(id);

    return {
      version: 8,
      sources: {
        vietflex: {
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
          id: "vietflex-basemap",
          type: "raster",
          source: "vietflex",
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

  function setButtonsState(id, loading = false) {
    modeButtons.forEach((button) => {
      const isActive = button.dataset.mapMode === id;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.disabled = loading;
    });
  }

  function writeModeToUrl(id) {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", id);
    history.replaceState(null, "", url);
  }

  async function switchMode(id, options = {}) {
    const mode = getMode(id);
    if (!mode) return;

    if (id === activeModeId && !options.force) return;

    hideError();
    setButtonsState(id, true);

    try {
      await probeMode(id);

      if (!map) {
        map = new maplibregl.Map({
          container: "map",
          center: cfg.center,
          zoom: cfg.zoom,
          minZoom: mode.minSourceZoom,
          maxZoom: cfg.mapMaxZoom,
          attributionControl: false,
          renderWorldCopies: false,
          style: styleForMode(id)
        });

        map.addControl(
          new maplibregl.NavigationControl({ visualizePitch: true }),
          "top-right"
        );

        map.addControl(new maplibregl.FullscreenControl(), "top-right");

        map.on("load", () => map.resize());

        map.on("error", (event) => {
          const message =
            event?.error?.message || "Không thể tải tile PMTiles.";
          console.error("Vietflex WebGIS:", event?.error || event);
          showError("Không tải được bản đồ", message);
        });

        window.__VIETFLEX_MAP__ = map;
      } else {
        map.setMinZoom(mode.minSourceZoom);
        map.setStyle(styleForMode(id));
      }

      activeModeId = id;
      setButtonsState(id, false);
      writeModeToUrl(id);

      const entry = getArchive(id);
      window.__VIETFLEX_PMTILES__ = {
        mode: id,
        archive: entry.archive,
        archiveUrl: entry.archiveUrl,
        header: entry.header
      };
    } catch (error) {
      console.error(error);
      setButtonsState(activeModeId || id, false);
      showError(
        `Không đọc được ${mode.pmtilesObject}`,
        error?.message || String(error)
      );
    }
  }

  async function bootstrap() {
    try {
      if (!cfg?.modes) throw new Error("Thiếu cấu hình nguồn bản đồ.");
      if (!window.maplibregl) throw new Error("MapLibre GL JS chưa tải được.");
      if (!window.pmtiles) throw new Error("PMTiles JS chưa tải được.");

      protocol = new pmtiles.Protocol({ metadata: true });
      maplibregl.addProtocol("pmtiles", protocol.tile);

      modeButtons.forEach((button) => {
        button.addEventListener("click", () => {
          switchMode(button.dataset.mapMode);
        });
      });

      const requestedMode =
        new URLSearchParams(location.search).get("mode");

      const initialMode =
        getMode(requestedMode) ? requestedMode : cfg.defaultMode;

      await switchMode(initialMode, { force: true });

      window.addEventListener("beforeunload", () => {
        maplibregl.removeProtocol("pmtiles");
      });
    } catch (error) {
      console.error(error);
      showError(
        "Không khởi tạo được bản đồ",
        error?.message || String(error)
      );
    }
  }

  bootstrap();
})();
