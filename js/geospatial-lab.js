(function () {
  "use strict";

  const svgNS = "http://www.w3.org/2000/svg";

  const resolutionConfig = {
    1: {
      key: "sparse",
      label: "Sparse (Coarse)",
      step: 52,
      neighborK: 2,
      nodeMult: 0.72,
      effects: { rmse: 0.032, unc: 0.048, stability: -0.060, ppc: -0.033 }
    },
    2: {
      key: "medium",
      label: "Medium",
      step: 36,
      neighborK: 3,
      nodeMult: 1.0,
      effects: { rmse: 0, unc: 0, stability: 0, ppc: 0 }
    },
    3: {
      key: "fine",
      label: "Fine",
      step: 24,
      neighborK: 4,
      nodeMult: 1.42,
      effects: { rmse: -0.019, unc: -0.029, stability: 0.040, ppc: 0.020 }
    }
  };

  const modelEffects = {
    inla: { rmse: -0.010, unc: -0.014, stability: 0.016, ppc: 0.010 },
    spglm: { rmse: 0.010, unc: 0.014, stability: -0.012, ppc: -0.008 }
  };

  const mrEffects = {
    mr1: { rmse: -0.014, unc: -0.025, stability: 0.020, ppc: 0.012 },
    mr0: { rmse: 0.018, unc: 0.032, stability: -0.024, ppc: -0.015 }
  };

  const knownStateProfiles = {
    "Uttar Pradesh": {
      seed: 13,
      color: "#c8522a",
      kmPerPx: 3.25,
      density: 1.02,
      base: { rmse: 0.268, unc: 0.196, stability: 0.670, ppc: 0.890 }
    },
    "Bihar": {
      seed: 19,
      color: "#a1462f",
      kmPerPx: 2.95,
      density: 0.97,
      base: { rmse: 0.281, unc: 0.214, stability: 0.640, ppc: 0.872 }
    },
    "Assam": {
      seed: 29,
      color: "#a85f2a",
      kmPerPx: 2.45,
      density: 0.91,
      base: { rmse: 0.297, unc: 0.236, stability: 0.600, ppc: 0.850 }
    },
    "Maharashtra": {
      seed: 37,
      color: "#be6640",
      kmPerPx: 3.55,
      density: 1.08,
      base: { rmse: 0.245, unc: 0.174, stability: 0.740, ppc: 0.910 }
    },
    "Rajasthan": {
      seed: 43,
      color: "#b85a2f",
      kmPerPx: 4.05,
      density: 1.05,
      base: { rmse: 0.257, unc: 0.183, stability: 0.720, ppc: 0.903 }
    },
    "Nagaland": {
      seed: 53,
      color: "#8f3f2a",
      kmPerPx: 2.05,
      density: 0.84,
      base: { rmse: 0.314, unc: 0.258, stability: 0.550, ppc: 0.830 }
    }
  };

  const baselineInputs = {
    state: "Uttar Pradesh",
    survey: "NFHS5",
    model: "inla",
    mr: "mr1",
    vaccine: "MCV1",
    resolution: 2,
    offset: 0.25,
    cutoff: 0.08
  };

  const stateProfileCache = new Map();
  const rawGeometryCache = new Map();
  let clusterDataPromise = null;

  const el = {
    stateSelect: document.getElementById("stateSelect"),
    surveySelect: document.getElementById("surveySelect"),
    modelSelect: document.getElementById("modelSelect"),
    mrSelect: document.getElementById("mrSelect"),
    vaccineSelect: document.getElementById("vaccineSelect"),
    meshRange: document.getElementById("meshRange"),
    meshLabel: document.getElementById("meshLabel"),
    offsetRange: document.getElementById("offsetRange"),
    offsetLabel: document.getElementById("offsetLabel"),
    cutoffRange: document.getElementById("cutoffRange"),
    cutoffLabel: document.getElementById("cutoffLabel"),
    resetLab: document.getElementById("resetLab"),
    meshSvg: document.getElementById("meshSvg"),
    labCaption: document.getElementById("labCaption"),
    nodesVal: document.getElementById("nodesVal"),
    nodesDelta: document.getElementById("nodesDelta"),
    edgeVal: document.getElementById("edgeVal"),
    edgeDelta: document.getElementById("edgeDelta"),
    rmseVal: document.getElementById("rmseVal"),
    rmseDelta: document.getElementById("rmseDelta"),
    uncVal: document.getElementById("uncVal"),
    uncDelta: document.getElementById("uncDelta"),
    stabilityVal: document.getElementById("stabilityVal"),
    stabilityDelta: document.getElementById("stabilityDelta"),
    ppcVal: document.getElementById("ppcVal"),
    ppcDelta: document.getElementById("ppcDelta"),
    clusterCountVal: document.getElementById("clusterCountVal"),
    childNVal: document.getElementById("childNVal"),
    oneVal: document.getElementById("oneVal"),
    oneShareVal: document.getElementById("oneShareVal"),
    zeroVal: document.getElementById("zeroVal"),
    zeroShareVal: document.getElementById("zeroShareVal"),
    clusterMeanVal: document.getElementById("clusterMeanVal"),
    barSparse: document.getElementById("barSparse"),
    barMedium: document.getElementById("barMedium"),
    barFine: document.getElementById("barFine"),
    barSparseVal: document.getElementById("barSparseVal"),
    barMediumVal: document.getElementById("barMediumVal"),
    barFineVal: document.getElementById("barFineVal"),
    rowSparse: document.getElementById("rowSparse"),
    rowMedium: document.getElementById("rowMedium"),
    rowFine: document.getElementById("rowFine"),
    variationBullets: document.getElementById("variationBullets")
  };

  if (!el.stateSelect || !el.meshSvg) {
    return;
  }

  const baselineMetrics = computeMetrics(baselineInputs, null, getStateProfile(baselineInputs.state));
  let rafToken = null;
  let renderSequence = 0;

  bindEvents();
  resetControls();
  scheduleRender();

  function bindEvents() {
    [
      el.stateSelect,
      el.surveySelect,
      el.modelSelect,
      el.mrSelect,
      el.vaccineSelect,
      el.meshRange,
      el.offsetRange,
      el.cutoffRange
    ].forEach(function (node) {
      if (!node) return;
      node.addEventListener("input", scheduleRender);
      node.addEventListener("change", scheduleRender);
    });

    if (el.resetLab) {
      el.resetLab.addEventListener("click", function () {
        resetControls();
        scheduleRender();
      });
    }
  }

  function resetControls() {
    if (el.surveySelect) {
      el.surveySelect.value = baselineInputs.survey;
    }
    if (el.stateSelect) {
      el.stateSelect.value = baselineInputs.state;
    }
    el.modelSelect.value = baselineInputs.model;
    el.mrSelect.value = baselineInputs.mr;
    if (el.vaccineSelect) {
      el.vaccineSelect.value = baselineInputs.vaccine;
    }
    el.meshRange.value = String(baselineInputs.resolution);
    el.offsetRange.value = baselineInputs.offset.toFixed(2);
    el.cutoffRange.value = baselineInputs.cutoff.toFixed(2);
  }

  function scheduleRender() {
    if (rafToken !== null) {
      cancelAnimationFrame(rafToken);
    }
    rafToken = requestAnimationFrame(function () {
      rafToken = null;
      const thisRender = ++renderSequence;
      render(thisRender).catch(function (error) {
        if (thisRender !== renderSequence) return;
        console.error("Geospatial lab render failed", error);
        if (el.labCaption) {
          el.labCaption.textContent = "Could not load state boundary or cluster data. Serve this page on localhost to allow JSON fetch.";
        }
      });
    });
  }

  async function render(sequenceId) {
    const inputs = readInputs();
    updateControlLabels(inputs);

    if (el.labCaption) {
      el.labCaption.textContent = "Loading state boundary and cluster data...";
    }

    const clusterDataset = await getClusterDataset();
    if (sequenceId !== renderSequence) {
      return;
    }

    const surveyData = getSurveyData(clusterDataset, inputs.survey);
    const activeState = syncStateOptions(surveyData, inputs.state);
    inputs.state = activeState;

    const stateData = (surveyData.states && surveyData.states[activeState])
      ? surveyData.states[activeState]
      : { clusters: [], totals: {}, geo_slug: null };

    const geoSlug = stateData.geo_slug;
    if (!geoSlug) {
      throw new Error("No GeoJSON slug mapped for state: " + activeState);
    }

    const geometry = await getProjectedGeometry(geoSlug, inputs.offset);
    if (sequenceId !== renderSequence) {
      return;
    }

    const profile = getStateProfile(inputs.state);
    const clusterView = buildClusterView(stateData, inputs.vaccine, inputs.mr, geometry.projection);
    const mesh = buildMesh(inputs, geometry, profile);
    const metrics = computeMetrics(inputs, mesh, profile);

    renderMesh(geometry, mesh, profile, inputs, clusterView);
    renderMetrics(metrics);
    renderClusterSummary(clusterView);
    renderBars(inputs, profile);
    renderBullets(inputs, metrics, clusterView);
    renderCaption(inputs, metrics, geometry, clusterView);
  }

  function readInputs() {
    return {
      state: el.stateSelect.value,
      survey: el.surveySelect ? el.surveySelect.value : "NFHS5",
      model: el.modelSelect.value,
      mr: el.mrSelect.value,
      vaccine: el.vaccineSelect ? el.vaccineSelect.value : "MCV1",
      resolution: parseInt(el.meshRange.value, 10),
      offset: parseFloat(el.offsetRange.value),
      cutoff: parseFloat(el.cutoffRange.value)
    };
  }

  function updateControlLabels(inputs) {
    el.meshLabel.textContent = resolutionConfig[inputs.resolution].label;
    el.offsetLabel.textContent = inputs.offset.toFixed(2);
    el.cutoffLabel.textContent = inputs.cutoff.toFixed(2);
  }

  function getSurveyData(clusterDataset, surveyName) {
    if (clusterDataset && clusterDataset.surveys && clusterDataset.surveys[surveyName]) {
      return clusterDataset.surveys[surveyName];
    }
    const fallbackName = clusterDataset && clusterDataset.surveys
      ? Object.keys(clusterDataset.surveys)[0]
      : null;
    return fallbackName ? clusterDataset.surveys[fallbackName] : { states: {} };
  }

  function syncStateOptions(surveyData, preferredState) {
    const stateNames = Object.keys((surveyData && surveyData.states) || {}).sort();
    if (!stateNames.length) {
      return preferredState || "";
    }

    const currentOptions = Array.from(el.stateSelect.options).map(function (opt) { return opt.value; });
    const same = currentOptions.length === stateNames.length &&
      currentOptions.every(function (value, idx) { return value === stateNames[idx]; });

    if (!same) {
      el.stateSelect.innerHTML = "";
      stateNames.forEach(function (name) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        el.stateSelect.appendChild(opt);
      });
    }

    let selected = preferredState;
    if (!selected || stateNames.indexOf(selected) === -1) {
      const existing = el.stateSelect.value;
      selected = stateNames.indexOf(existing) >= 0 ? existing : stateNames[0];
    }

    el.stateSelect.value = selected;
    return selected;
  }

  async function getProjectedGeometry(geoSlug, offset) {
    const raw = await getRawStateGeometry(geoSlug);
    return projectStateGeometry(raw, offset);
  }

  async function getRawStateGeometry(geoSlug) {
    if (rawGeometryCache.has(geoSlug)) {
      return rawGeometryCache.get(geoSlug);
    }

    const url = "../data/india-states/" + geoSlug + ".geojson";
    const pending = fetch(url)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to fetch " + url + " (" + response.status + ")");
        }
        return response.json();
      })
      .then(parseGeoJSONPolygons);

    rawGeometryCache.set(geoSlug, pending);
    return pending;
  }

  function getClusterDataset() {
    if (clusterDataPromise) {
      return clusterDataPromise;
    }

    const url = "../data/cluster-vax-summary.json";
    clusterDataPromise = fetch(url)
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to fetch " + url + " (" + response.status + ")");
        }
        return response.json();
      });

    return clusterDataPromise;
  }

  function parseGeoJSONPolygons(geojson) {
    const polygons = [];
    const bbox = {
      minLon: Infinity,
      maxLon: -Infinity,
      minLat: Infinity,
      maxLat: -Infinity
    };

    const features = geojson.type === "FeatureCollection"
      ? geojson.features
      : [geojson];

    features.forEach(function (entry) {
      const geom = entry.type === "Feature" ? entry.geometry : entry;
      if (!geom || !geom.type || !geom.coordinates) return;

      if (geom.type === "Polygon") {
        const poly = normalizePolygon(geom.coordinates);
        if (poly) polygons.push(poly);
      }

      if (geom.type === "MultiPolygon") {
        geom.coordinates.forEach(function (coords) {
          const poly = normalizePolygon(coords);
          if (poly) polygons.push(poly);
        });
      }
    });

    polygons.forEach(function (poly) {
      [poly.outer].concat(poly.holes).forEach(function (ring) {
        ring.forEach(function (pt) {
          bbox.minLon = Math.min(bbox.minLon, pt.lon);
          bbox.maxLon = Math.max(bbox.maxLon, pt.lon);
          bbox.minLat = Math.min(bbox.minLat, pt.lat);
          bbox.maxLat = Math.max(bbox.maxLat, pt.lat);
        });
      });
    });

    if (!polygons.length || !Number.isFinite(bbox.minLon)) {
      throw new Error("No valid polygons found in GeoJSON");
    }

    return { polygons: polygons, bbox: bbox };
  }

  function normalizePolygon(rings) {
    if (!Array.isArray(rings) || rings.length === 0) {
      return null;
    }

    const mapRing = function (coords) {
      if (!Array.isArray(coords) || coords.length < 3) {
        return [];
      }
      return coords.map(function (pair) {
        return { lon: Number(pair[0]), lat: Number(pair[1]) };
      }).filter(function (pt) {
        return Number.isFinite(pt.lon) && Number.isFinite(pt.lat);
      });
    };

    const outer = mapRing(rings[0]);
    if (outer.length < 3) {
      return null;
    }

    const holes = rings.slice(1)
      .map(mapRing)
      .filter(function (ring) { return ring.length >= 3; });

    return { outer: outer, holes: holes };
  }

  function projectStateGeometry(raw, offset) {
    const viewWidth = 420;
    const viewHeight = 300;
    const margin = 12;
    const innerW = viewWidth - margin * 2;
    const innerH = viewHeight - margin * 2;

    const lonSpan = Math.max(raw.bbox.maxLon - raw.bbox.minLon, 1e-8);
    const latSpan = Math.max(raw.bbox.maxLat - raw.bbox.minLat, 1e-8);
    const scale = Math.min(innerW / lonSpan, innerH / latSpan);

    const fittedW = lonSpan * scale;
    const fittedH = latSpan * scale;
    const xPad = margin + (innerW - fittedW) / 2;
    const yPad = margin + (innerH - fittedH) / 2;

    const projection = {
      minLon: raw.bbox.minLon,
      maxLat: raw.bbox.maxLat,
      scale: scale,
      xPad: xPad,
      yPad: yPad
    };

    const projectPoint = function (pt) {
      return projectLonLat(pt.lon, pt.lat, projection);
    };

    const boundaryPolygons = raw.polygons.map(function (poly) {
      return {
        outer: poly.outer.map(projectPoint),
        holes: poly.holes.map(function (ring) { return ring.map(projectPoint); })
      };
    });

    const center = geometryCentroid(boundaryPolygons);
    const domainFactor = clamp(1 + (offset - baselineInputs.offset) * 0.42, 0.82, 1.30);
    const domainPolygons = scaleGeometry(boundaryPolygons, center, domainFactor);

    return {
      boundaryPolygons: boundaryPolygons,
      domainPolygons: domainPolygons,
      bounds: geometryBounds(domainPolygons),
      projection: projection,
      domainFactor: domainFactor
    };
  }

  function projectLonLat(lon, lat, projection) {
    return {
      x: projection.xPad + (lon - projection.minLon) * projection.scale,
      y: projection.yPad + (projection.maxLat - lat) * projection.scale
    };
  }

  function geometryCentroid(polygons) {
    let sx = 0;
    let sy = 0;
    let n = 0;

    polygons.forEach(function (poly) {
      poly.outer.forEach(function (pt) {
        sx += pt.x;
        sy += pt.y;
        n += 1;
      });
    });

    if (!n) {
      return { x: 210, y: 150 };
    }

    return { x: sx / n, y: sy / n };
  }

  function scaleGeometry(polygons, center, factor) {
    const scaleRing = function (ring) {
      return ring.map(function (pt) {
        return {
          x: clamp(center.x + (pt.x - center.x) * factor, 6, 414),
          y: clamp(center.y + (pt.y - center.y) * factor, 6, 294)
        };
      });
    };

    return polygons.map(function (poly) {
      return {
        outer: scaleRing(poly.outer),
        holes: poly.holes.map(scaleRing)
      };
    });
  }

  function geometryBounds(polygons) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    polygons.forEach(function (poly) {
      [poly.outer].concat(poly.holes).forEach(function (ring) {
        ring.forEach(function (pt) {
          minX = Math.min(minX, pt.x);
          maxX = Math.max(maxX, pt.x);
          minY = Math.min(minY, pt.y);
          maxY = Math.max(maxY, pt.y);
        });
      });
    });

    return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
  }

  function buildClusterView(stateData, vaccine, mrMode, projection) {
    const clusters = Array.isArray(stateData.clusters) ? stateData.clusters : [];
    const mode = mrMode === "mr0" ? "mr0" : "mr1";
    const onesField = mode === "mr0" ? "ones_mr0" : "ones_mr1";
    const zerosField = mode === "mr0" ? "zeros_mr0" : "zeros_mr1";
    const rateField = mode === "mr0" ? "rate_mr0" : "rate_mr1";

    let maxN = 1;
    clusters.forEach(function (c) {
      maxN = Math.max(maxN, Number(c.n || 1));
    });

    const points = [];
    let clusterRateSum = 0;

    clusters.forEach(function (c) {
      const lon = Number(c.lon);
      const lat = Number(c.lat);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        return;
      }

      const projected = projectLonLat(lon, lat, projection);
      if (!Number.isFinite(projected.x) || !Number.isFinite(projected.y)) {
        return;
      }

      const n = Number(c.n || 0);
      const ones = Number((c[onesField] && c[onesField][vaccine]) || 0);
      let zeros = Number((c[zerosField] && c[zerosField][vaccine]) || 0);
      if (!Number.isFinite(zeros) || zeros < 0) {
        zeros = Math.max(n - ones, 0);
      }

      let rate = Number((c[rateField] && c[rateField][vaccine]) || 0);
      if (!Number.isFinite(rate)) {
        rate = n > 0 ? (ones / n) : 0;
      }

      const radius = 1.4 + 3.9 * Math.sqrt(Math.max(n, 1) / maxN);
      const majority = ones >= zeros ? 1 : 0;

      points.push({
        clusterId: c.cluster_id,
        x: projected.x,
        y: projected.y,
        ones: ones,
        zeros: zeros,
        n: n,
        rate: rate,
        radius: radius,
        majority: majority
      });

      clusterRateSum += rate;
    });

    let totals = { n: 0, ones: 0, zeros: 0, rate: 0 };
    if (stateData.totals && stateData.totals[vaccine] && stateData.totals[vaccine][mode]) {
      totals = stateData.totals[vaccine][mode];
    } else {
      points.forEach(function (p) {
        totals.n += p.n;
        totals.ones += p.ones;
        totals.zeros += p.zeros;
      });
      totals.rate = totals.n ? (totals.ones / totals.n) : 0;
    }

    return {
      mode: mode,
      points: points,
      totals: totals,
      clusterMean: points.length ? (clusterRateSum / points.length) : 0
    };
  }

  function buildMesh(inputs, geometry, profile) {
    const cfg = resolutionConfig[inputs.resolution];
    const bounds = geometry.bounds;
    const step = cfg.step;
    const seed = profile.seed + (inputs.model === "inla" ? 11 : 29) + inputs.resolution * 17;
    const jitter = step * 0.34;
    const candidates = [];
    let row = 0;

    for (let y = bounds.minY; y <= bounds.maxY; y += step) {
      const shift = row % 2 === 0 ? 0 : step * 0.5;
      for (let x = bounds.minX; x <= bounds.maxX; x += step) {
        const px = x + shift + (noise(x * 0.11, y * 0.13, seed) - 0.5) * jitter;
        const py = y + (noise(y * 0.09, x * 0.17, seed + 5) - 0.5) * jitter;
        const point = { x: px, y: py };
        if (pointInGeometry(point, geometry.domainPolygons)) {
          candidates.push(point);
        }
      }
      row += 1;
    }

    const minDist = 4.8 + inputs.cutoff * 96;
    const interior = enforceMinDistance(candidates, minDist);
    const boundary = makeBoundaryNodes(geometry.domainPolygons, step, inputs.offset);
    let nodes = mergeNodes(interior, boundary, minDist * 0.65);

    if (nodes.length > 320) {
      nodes = nodes.filter(function (_, index) {
        return index % 2 === 0;
      });
    }

    const edges = connectNodes(nodes, cfg, inputs, step);
    const meanEdgePx = edges.length
      ? edges.reduce(function (acc, edge) { return acc + edge.d; }, 0) / edges.length
      : step;

    return { nodes: nodes, edges: edges, meanEdgePx: meanEdgePx };
  }

  function pointInGeometry(point, polygons) {
    for (let p = 0; p < polygons.length; p += 1) {
      const poly = polygons[p];
      if (!pointInRing(point, poly.outer)) {
        continue;
      }

      let insideHole = false;
      for (let h = 0; h < poly.holes.length; h += 1) {
        if (pointInRing(point, poly.holes[h])) {
          insideHole = true;
          break;
        }
      }

      if (!insideHole) {
        return true;
      }
    }
    return false;
  }

  function pointInRing(point, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i].x;
      const yi = ring[i].y;
      const xj = ring[j].x;
      const yj = ring[j].y;
      const intersects = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function enforceMinDistance(points, minDist) {
    const selected = [];
    const minDist2 = minDist * minDist;

    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      let keep = true;
      for (let j = 0; j < selected.length; j += 1) {
        const q = selected[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        if (dx * dx + dy * dy < minDist2) {
          keep = false;
          break;
        }
      }
      if (keep) {
        selected.push(p);
      }
    }
    return selected;
  }

  function makeBoundaryNodes(polygons, step, offset) {
    const nodes = [];
    const addRingNodes = function (ring) {
      for (let i = 0; i < ring.length; i += 1) {
        const a = ring[i];
        const b = ring[(i + 1) % ring.length];
        const length = distance(a, b);
        const count = Math.max(1, Math.round(length / (step * 0.95) + offset * 2.2));
        for (let s = 0; s <= count; s += 1) {
          const t = s / count;
          nodes.push({
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t
          });
        }
      }
    };

    polygons.forEach(function (poly) {
      addRingNodes(poly.outer);
    });

    return nodes;
  }

  function mergeNodes(primary, extras, minDist) {
    const merged = primary.slice();
    const minDist2 = minDist * minDist;

    for (let i = 0; i < extras.length; i += 1) {
      const p = extras[i];
      let near = false;
      for (let j = 0; j < merged.length; j += 1) {
        const q = merged[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        if (dx * dx + dy * dy < minDist2) {
          near = true;
          break;
        }
      }
      if (!near) {
        merged.push(p);
      }
    }

    return merged;
  }

  function connectNodes(nodes, cfg, inputs, step) {
    const edges = [];
    const edgeSet = new Set();
    const k = cfg.neighborK + (inputs.model === "inla" ? 1 : 0);
    const maxEdge = Math.max(
      step * 1.30,
      step * 2.35 + inputs.offset * 12 - inputs.cutoff * 34 + (inputs.model === "inla" ? 5 : 0)
    );

    for (let i = 0; i < nodes.length; i += 1) {
      const distances = [];
      for (let j = 0; j < nodes.length; j += 1) {
        if (i === j) continue;
        const d = distance(nodes[i], nodes[j]);
        if (d <= maxEdge * 1.45) {
          distances.push({ j: j, d: d });
        }
      }
      distances.sort(function (a, b) { return a.d - b.d; });

      let linked = 0;
      for (let m = 0; m < distances.length; m += 1) {
        const target = distances[m];
        if (target.d > maxEdge) continue;
        const key = i < target.j ? i + "-" + target.j : target.j + "-" + i;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push({ a: i, b: target.j, d: target.d });
        linked += 1;
        if (linked >= k) break;
      }
    }

    if (edges.length < Math.max(8, nodes.length)) {
      for (let i = 0; i < nodes.length; i += 1) {
        let best = null;
        for (let j = 0; j < nodes.length; j += 1) {
          if (i === j) continue;
          const d = distance(nodes[i], nodes[j]);
          if (!best || d < best.d) {
            best = { j: j, d: d };
          }
        }
        if (best) {
          const key = i < best.j ? i + "-" + best.j : best.j + "-" + i;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ a: i, b: best.j, d: best.d });
          }
        }
      }
    }

    return edges;
  }

  function computeMetrics(inputs, mesh, profile) {
    const res = resolutionConfig[inputs.resolution];
    const model = modelEffects[inputs.model];
    const mr = mrEffects[inputs.mr];

    let rmse = profile.base.rmse + res.effects.rmse + model.rmse + mr.rmse;
    let unc = profile.base.unc + res.effects.unc + model.unc + mr.unc;
    let stability = profile.base.stability + res.effects.stability + model.stability + mr.stability;
    let ppc = profile.base.ppc + res.effects.ppc + model.ppc + mr.ppc;

    const offsetDistance = Math.abs(inputs.offset - baselineInputs.offset);
    const cutoffDistance = Math.abs(inputs.cutoff - baselineInputs.cutoff);

    rmse += 0.060 * cutoffDistance + 0.030 * offsetDistance;
    unc += 0.110 * cutoffDistance + 0.070 * offsetDistance;
    stability -= 0.180 * cutoffDistance + 0.080 * offsetDistance;
    ppc -= 0.150 * cutoffDistance + 0.050 * offsetDistance;

    if (inputs.resolution === 3 && inputs.cutoff > 0.12) {
      rmse += 0.012;
      unc += 0.010;
      stability -= 0.015;
    }
    if (inputs.resolution === 1 && inputs.cutoff < 0.05) {
      rmse += 0.006;
      unc += 0.004;
    }
    if (inputs.model === "inla" && inputs.resolution === 3) {
      stability += 0.008;
      ppc += 0.005;
    }

    const nodes = mesh
      ? mesh.nodes.length
      : Math.round(72 * profile.density * res.nodeMult * (1 + inputs.offset * 0.28) * (1 - (inputs.cutoff - 0.08) * 1.2));
    const edgeKm = mesh
      ? mesh.meanEdgePx * profile.kmPerPx
      : res.step * profile.kmPerPx * (0.86 + (inputs.cutoff - 0.08) * 0.8);

    return {
      nodes: clamp(nodes, 12, 420),
      edgeKm: clamp(edgeKm, 12, 220),
      rmse: clamp(rmse, 0.18, 0.45),
      unc: clamp(unc, 0.10, 0.45),
      stability: clamp(stability, 0.35, 0.90),
      ppc: clamp(ppc, 0.70, 0.98)
    };
  }

  function renderMesh(geometry, mesh, profile, inputs, clusterView) {
    while (el.meshSvg.firstChild) {
      el.meshSvg.removeChild(el.meshSvg.firstChild);
    }

    const boundaryPath = createSvg("path", {
      d: polygonsToPath(geometry.boundaryPolygons),
      fill: toRgba(profile.color, 0.12),
      stroke: toRgba(profile.color, 0.85),
      "stroke-width": "1.2",
      "fill-rule": "evenodd"
    });
    el.meshSvg.appendChild(boundaryPath);

    const domainPath = createSvg("path", {
      d: polygonsToPath(geometry.domainPolygons),
      fill: "none",
      stroke: toRgba(profile.color, 0.95),
      "stroke-width": "1.0",
      "stroke-dasharray": "5 3",
      "fill-rule": "evenodd"
    });
    el.meshSvg.appendChild(domainPath);

    const edgeGroup = createSvg("g", {
      stroke: "rgba(18, 18, 18, 0.30)",
      "stroke-width": inputs.resolution === 3 ? "0.60" : "0.76",
      fill: "none"
    });
    mesh.edges.forEach(function (edge) {
      const p1 = mesh.nodes[edge.a];
      const p2 = mesh.nodes[edge.b];
      const line = createSvg("line", {
        x1: p1.x.toFixed(2),
        y1: p1.y.toFixed(2),
        x2: p2.x.toFixed(2),
        y2: p2.y.toFixed(2)
      });
      edgeGroup.appendChild(line);
    });
    el.meshSvg.appendChild(edgeGroup);

    renderClusterLayer(clusterView);

    const nodeGroup = createSvg("g", {
      fill: profile.color,
      stroke: "#fff",
      "stroke-width": "0.55"
    });
    mesh.nodes.forEach(function (node) {
      const circle = createSvg("circle", {
        cx: node.x.toFixed(2),
        cy: node.y.toFixed(2),
        r: inputs.resolution === 3 ? "1.3" : "1.65"
      });
      nodeGroup.appendChild(circle);
    });
    el.meshSvg.appendChild(nodeGroup);

    const badge = createSvg("text", {
      x: "12",
      y: "20",
      fill: "#6c665b",
      "font-size": "11",
      "font-family": "DM Mono, monospace"
    });
    badge.textContent = inputs.state + " | " + inputs.survey + " | " + resolutionConfig[inputs.resolution].label + " | " + inputs.vaccine;
    el.meshSvg.appendChild(badge);
  }

  function renderClusterLayer(clusterView) {
    const group = createSvg("g", { "pointer-events": "all" });

    clusterView.points.forEach(function (point) {
      const fill = interpolateRateColor(point.rate);
      const stroke = point.majority === 1 ? "#1f7f47" : "#9a2f24";
      const circle = createSvg("circle", {
        cx: point.x.toFixed(2),
        cy: point.y.toFixed(2),
        r: point.radius.toFixed(2),
        fill: fill,
        "fill-opacity": "0.62",
        stroke: stroke,
        "stroke-width": "0.8"
      });

      const title = createSvg("title", {});
      title.textContent =
        "Cluster " + point.clusterId +
        " | n=" + point.n +
        " | vaccinated=1: " + point.ones +
        " | unvaccinated (vaccinated=0): " + point.zeros +
        " | coverage=" + (point.rate * 100).toFixed(1) + "%";
      circle.appendChild(title);
      group.appendChild(circle);
    });

    el.meshSvg.appendChild(group);
  }

  function interpolateRateColor(rate) {
    const t = clamp(rate, 0, 1);
    const r = Math.round(176 + (54 - 176) * t);
    const g = Math.round(56 + (153 - 56) * t);
    const b = Math.round(44 + (76 - 44) * t);
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function polygonsToPath(polygons) {
    const rings = [];

    const ringToPath = function (ring) {
      if (!ring.length) return;
      let part = "M " + ring[0].x.toFixed(2) + " " + ring[0].y.toFixed(2);
      for (let i = 1; i < ring.length; i += 1) {
        part += " L " + ring[i].x.toFixed(2) + " " + ring[i].y.toFixed(2);
      }
      part += " Z";
      rings.push(part);
    };

    polygons.forEach(function (poly) {
      ringToPath(poly.outer);
      poly.holes.forEach(ringToPath);
    });

    return rings.join(" ");
  }

  function renderMetrics(metrics) {
    el.nodesVal.textContent = String(Math.round(metrics.nodes));
    el.edgeVal.textContent = metrics.edgeKm.toFixed(1) + " km";
    el.rmseVal.textContent = metrics.rmse.toFixed(3);
    el.uncVal.textContent = metrics.unc.toFixed(3);
    el.stabilityVal.textContent = (metrics.stability * 100).toFixed(1) + "%";
    el.ppcVal.textContent = (metrics.ppc * 100).toFixed(1) + "%";

    renderDelta(el.nodesDelta, metrics.nodes - baselineMetrics.nodes, 0, 0, false);
    renderDelta(el.edgeDelta, metrics.edgeKm - baselineMetrics.edgeKm, 0, 1, false, " km");
    renderDelta(el.rmseDelta, metrics.rmse - baselineMetrics.rmse, -1, 3, false);
    renderDelta(el.uncDelta, metrics.unc - baselineMetrics.unc, -1, 3, false);
    renderDelta(el.stabilityDelta, metrics.stability - baselineMetrics.stability, 1, 1, true);
    renderDelta(el.ppcDelta, metrics.ppc - baselineMetrics.ppc, 1, 1, true);
  }

  function renderClusterSummary(clusterView) {
    if (!el.clusterCountVal) {
      return;
    }

    const totals = clusterView.totals || { n: 0, ones: 0, zeros: 0, rate: 0 };
    const n = Number(totals.n || 0);
    const ones = Number(totals.ones || 0);
    const zeros = Number(totals.zeros || 0);

    el.clusterCountVal.textContent = formatInteger(clusterView.points.length);
    el.childNVal.textContent = formatInteger(n);
    el.oneVal.textContent = formatInteger(ones);
    el.zeroVal.textContent = formatInteger(zeros);
    el.oneShareVal.textContent = n > 0 ? (100 * ones / n).toFixed(1) + "% of children" : "-";
    el.zeroShareVal.textContent = n > 0 ? (100 * zeros / n).toFixed(1) + "% of children" : "-";
    el.clusterMeanVal.textContent = (clusterView.clusterMean * 100).toFixed(1) + "%";
  }

  function renderDelta(node, diff, direction, decimals, percentagePoints, suffix) {
    if (!node) return;
    node.classList.remove("good", "bad", "neutral", "up", "down");
    const tiny = percentagePoints ? 0.0008 : Math.pow(10, -decimals) / 2;

    if (Math.abs(diff) < tiny) {
      node.textContent = "vs baseline: no material change";
      node.classList.add("neutral");
      return;
    }

    const sign = diff > 0 ? "+" : "";
    const diffText = percentagePoints
      ? sign + (diff * 100).toFixed(decimals) + " pp"
      : sign + diff.toFixed(decimals) + (suffix || "");
    node.textContent = "vs baseline: " + diffText;

    if (direction === 0) {
      node.classList.add("neutral");
      return;
    }

    const improved = diff * direction > 0;
    node.classList.add(improved ? "good" : "bad");
  }

  function renderBars(inputs, profile) {
    const sparse = computeMetrics({ state: inputs.state, model: inputs.model, mr: inputs.mr, resolution: 1, offset: inputs.offset, cutoff: inputs.cutoff }, null, profile);
    const medium = computeMetrics({ state: inputs.state, model: inputs.model, mr: inputs.mr, resolution: 2, offset: inputs.offset, cutoff: inputs.cutoff }, null, profile);
    const fine = computeMetrics({ state: inputs.state, model: inputs.model, mr: inputs.mr, resolution: 3, offset: inputs.offset, cutoff: inputs.cutoff }, null, profile);

    const values = [sparse.unc, medium.unc, fine.unc];
    const maxVal = Math.max.apply(null, values);

    updateBar(el.barSparse, el.barSparseVal, sparse.unc, maxVal);
    updateBar(el.barMedium, el.barMediumVal, medium.unc, maxVal);
    updateBar(el.barFine, el.barFineVal, fine.unc, maxVal);

    el.rowSparse.classList.toggle("active", inputs.resolution === 1);
    el.rowMedium.classList.toggle("active", inputs.resolution === 2);
    el.rowFine.classList.toggle("active", inputs.resolution === 3);
  }

  function updateBar(fillNode, labelNode, value, maxVal) {
    if (!fillNode || !labelNode) return;
    const width = maxVal > 0 ? (value / maxVal) * 100 : 0;
    fillNode.style.width = width.toFixed(1) + "%";
    labelNode.textContent = value.toFixed(3);
  }

  function renderBullets(inputs, metrics, clusterView) {
    if (!el.variationBullets) return;

    const profile = getStateProfile(inputs.state);
    const sparse = computeMetrics({ state: inputs.state, model: inputs.model, mr: inputs.mr, resolution: 1, offset: inputs.offset, cutoff: inputs.cutoff }, null, profile);
    const fine = computeMetrics({ state: inputs.state, model: inputs.model, mr: inputs.mr, resolution: 3, offset: inputs.offset, cutoff: inputs.cutoff }, null, profile);
    const altMr = computeMetrics({
      state: inputs.state,
      model: inputs.model,
      mr: inputs.mr === "mr1" ? "mr0" : "mr1",
      resolution: inputs.resolution,
      offset: inputs.offset,
      cutoff: inputs.cutoff
    }, null, profile);

    const uncReduction = ((sparse.unc - fine.unc) / sparse.unc) * 100;
    const mrDiff = metrics.unc - altMr.unc;
    const rmseDiff = metrics.rmse - baselineMetrics.rmse;
    const qualityPhrase = rmseDiff < -0.01 ? "fit improves meaningfully" : (rmseDiff > 0.01 ? "fit degrades versus baseline" : "fit stays close to baseline");

    const totals = clusterView.totals || { n: 0, ones: 0, zeros: 0 };

    const bullets = [
      inputs.state + ": moving from sparse/coarse to fine mesh shifts uncertainty from " + sparse.unc.toFixed(3) + " to " + fine.unc.toFixed(3) + " (" + uncReduction.toFixed(1) + "% change).",
      modelName(inputs.model) + " with " + mrModeLabel(inputs.mr) + " gives RMSE " + metrics.rmse.toFixed(3) + " and PPC95 " + (metrics.ppc * 100).toFixed(1) + "%; " + qualityPhrase + ".",
      "Actual " + inputs.survey + " " + inputs.vaccine + " cluster evidence under " + mrModeLabel(inputs.mr) + ": vaccinated=1 " + formatInteger(totals.ones || 0) + ", unvaccinated (vaccinated=0) " + formatInteger(totals.zeros || 0) + " across " + formatInteger(clusterView.points.length) + " geolocated clusters.",
      "Mesh domain is drawn from actual state GeoJSON boundary; offset " + inputs.offset.toFixed(2) + " expands/contracts domain while cutoff " + inputs.cutoff.toFixed(2) + " changes node spacing near edges."
    ];

    el.variationBullets.innerHTML = "";
    bullets.forEach(function (text) {
      const li = document.createElement("li");
      li.textContent = text;
      el.variationBullets.appendChild(li);
    });
  }

  function renderCaption(inputs, metrics, geometry) {
    if (!el.labCaption) return;
    el.labCaption.textContent =
      "Actual " + inputs.state + " boundary mesh + " + inputs.survey + " " + inputs.vaccine + " cluster layer. " +
      mrModeLabel(inputs.mr) +
      ", " + resolutionConfig[inputs.resolution].label +
      ", " + modelName(inputs.model) +
      ". Domain scale: " + geometry.domainFactor.toFixed(2) +
      "x, nodes: " + Math.round(metrics.nodes) +
      ", mean edge: " + metrics.edgeKm.toFixed(1) +
      " km, uncertainty index U: " + metrics.unc.toFixed(3) +
      ". Note: vaccinated=0 means unvaccinated.";
  }

  function createSvg(tag, attrs) {
    const node = document.createElementNS(svgNS, tag);
    Object.keys(attrs).forEach(function (key) {
      node.setAttribute(key, attrs[key]);
    });
    return node;
  }

  function getStateProfile(stateName) {
    if (knownStateProfiles[stateName]) {
      return knownStateProfiles[stateName];
    }

    if (stateProfileCache.has(stateName)) {
      return stateProfileCache.get(stateName);
    }

    const hash = Math.abs(hashCode(stateName));
    const hue = hash % 360;
    const sat = 56 + (hash % 18);
    const light = 40 + (hash % 12);

    const profile = {
      seed: 11 + (hash % 79),
      color: hslToHex(hue, sat, light),
      kmPerPx: 2.35 + ((hash % 190) / 100),
      density: 0.86 + ((hash % 28) / 100),
      base: {
        rmse: 0.245 + ((hash % 70) / 1000),
        unc: 0.165 + ((hash % 90) / 1000),
        stability: 0.58 + ((hash % 22) / 100),
        ppc: 0.84 + ((hash % 11) / 100)
      }
    };

    // Clamp synthetic defaults into reasonable ranges.
    profile.base.stability = clamp(profile.base.stability, 0.50, 0.82);
    profile.base.ppc = clamp(profile.base.ppc, 0.82, 0.93);

    stateProfileCache.set(stateName, profile);
    return profile;
  }

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return h;
  }

  function hslToHex(h, s, l) {
    const hh = h / 360;
    const ss = s / 100;
    const ll = l / 100;

    const hue2rgb = function (p, q, t) {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };

    let r;
    let g;
    let b;

    if (ss === 0) {
      r = g = b = ll;
    } else {
      const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
      const p = 2 * ll - q;
      r = hue2rgb(p, q, hh + 1 / 3);
      g = hue2rgb(p, q, hh);
      b = hue2rgb(p, q, hh - 1 / 3);
    }

    const toHex = function (x) {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return "#" + toHex(r) + toHex(g) + toHex(b);
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function noise(x, y, seed) {
    const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
    return value - Math.floor(value);
  }

  function toRgba(hex, alpha) {
    const cleaned = hex.replace("#", "");
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function modelName(value) {
    return value === "inla" ? "INLA-SPDE" : "spGLM";
  }

  function mrModeLabel(value) {
    return value === "mr0" ? "MR=0 (card only)" : "MR=1 (card + recall)";
  }

  function formatInteger(n) {
    return Number(n || 0).toLocaleString("en-US");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
