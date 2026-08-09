import { jsx as P } from "react/jsx-runtime";
import { useRef as x, useEffect as h } from "react";
const T = [0.02072, 117.3, -0.0205, 172.8], f = {
  minX: -5661,
  maxX: 6694,
  minY: -4058,
  maxY: 8429
}, G = { minX: -4096, maxX: 4096, minY: -4058, maxY: 4096 }, g = 256, Z = Math.PI / 180, I = 180 / Math.PI;
function R(s, e) {
  return [
    Math.min(f.maxX, Math.max(f.minX, s)),
    Math.min(f.maxY, Math.max(f.minY, e))
  ];
}
function l(s, e, o = T) {
  const [t, n] = R(s, e), i = o[0] * t + o[1], r = o[2] * n + o[3], a = i / g * 360 - 180, d = Math.atan(Math.sinh(Math.PI * (1 - 2 * r / g))) * I;
  return [a, d];
}
function $(s, e, o = T) {
  const t = (s + 180) / 360 * g, n = g / 2 * (1 - Math.asinh(Math.tan(e * Z)) / Math.PI);
  return [(t - o[1]) / o[0], (n - o[3]) / o[2]];
}
function A(s) {
  return (360 - s % 360 + 360) % 360;
}
const O = {
  satellite: { label: "Satellit", dark: !0 },
  road: { label: "Straßen", dark: !0 },
  roads2: { label: "Straßen 2", dark: !0 },
  minimap: { label: "Minimap", dark: !0 }
}, v = 0, C = 5;
function k(s, e = "satellite", o = "#07080f") {
  return {
    version: 8,
    sources: {
      gta: {
        type: "raster",
        tiles: [`${s.replace(/\/+$/, "")}/tiles/${e}/{z}/{x}/{y}.jpg`],
        tileSize: 256,
        minzoom: v,
        maxzoom: C,
        attribution: `GTA5 ${O[e].label}`
      }
    },
    layers: [
      // Der Hintergrund ist nicht Deko: außerhalb der Kacheln (Meer, Ränder)
      // wäre sonst das Nichts zu sehen, und das flackert beim Ziehen.
      { id: "bg", type: "background", paint: { "background-color": o } },
      { id: "gta", type: "raster", source: "gta", paint: { "raster-fade-duration": 120 } }
    ]
    // Kein `glyphs`: MapLibre prueft den Style und lehnt einen Schluessel mit
    // `undefined` ab ("string expected, undefined found"). Weglassen heisst
    // weglassen — und Schrift braucht eine reine Rasterkarte nicht.
  };
}
const S = {
  box: "📦",
  cone: "🚧",
  barrier: "🚔",
  tent: "⛺",
  lamp: "💡",
  blip: "⭕",
  fire: "🔥",
  medic: "🚑",
  police: "👮",
  tow: "🛻",
  default: "📍"
};
function E(s, e, o) {
  s.style.cssText = "width:32px;height:32px;cursor:pointer;will-change:transform";
  let t = s.firstElementChild;
  if (!t) {
    t = document.createElement("div"), s.appendChild(t);
    const r = document.createElement("div");
    s.appendChild(r);
  }
  const n = s.lastElementChild;
  t.style.cssText = `width:32px;height:32px;border-radius:50%;background:${o}22;border:2px solid ${o};display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 10px ${o}55`;
  const i = e.vehicle ? "🚗" : "👤";
  return t.textContent !== i && (t.textContent = i), t.style.transform = e.heading != null ? `rotate(${A(e.heading)}deg)` : "", n.style.cssText = `position:absolute;top:34px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(7,8,15,.85);border:1px solid ${o}66;border-radius:4px;padding:1px 5px;font-size:9px;font-weight:700;color:#fff;pointer-events:none`, n.textContent !== e.name && (n.textContent = e.name), n.style.display = e.name ? "" : "none", s;
}
function L(s, e) {
  const o = e.color || "#3b82f6", t = S[e.icon ?? "default"] ?? e.icon ?? S.default;
  return s.style.cssText = `width:30px;height:30px;border-radius:50%;background:${o}20;border:2px solid ${o};display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 8px ${o}44;cursor:pointer`, s.textContent !== t && (s.textContent = t), e.label && (s.title = e.label), s;
}
function z(s, e, o, t = 48) {
  const n = [];
  for (let i = 0; i <= t; i++) {
    const r = i / t * Math.PI * 2;
    n.push(l(s + Math.cos(r) * o, e + Math.sin(r) * o));
  }
  return n;
}
function F(s) {
  return {
    type: "FeatureCollection",
    features: s.map((e) => {
      const o = e.color || "#3b82f6";
      return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [e.type === "polygon" && e.points && e.points.length > 2 ? [
          ...e.points.map((n) => l(n.x, n.y)),
          l(e.points[0].x, e.points[0].y)
        ] : z(e.x, e.y, e.radius ?? 50)] },
        properties: {
          id: e.id,
          label: e.label ?? e.id,
          color: o,
          fill: e.fillColor || o,
          opacity: e.opacity ?? 0.2
        }
      };
    })
  };
}
const m = class m {
  /**
   * @param ml   die maplibre-gl-Instanz des Aufrufers. Sie wird hereingereicht und
   *             nicht importiert: zwei Kopien auf einer Seite teilen sich keine
   *             Klassen, und dann schlägt jedes `instanceof` still fehl.
   */
  constructor(e, o, t) {
    this.players = /* @__PURE__ */ new Map(), this.markers = /* @__PURE__ */ new Map(), this.colors = /* @__PURE__ */ new Map(), this.colorIdx = 0, this.follow = null, this.lastZones = null, this.ml = e, this.opts = t;
    const n = t.center ?? { x: 0, y: 0 };
    this.map = new e.Map({
      container: o,
      style: k(t.tileBaseUrl, t.style ?? "satellite", t.background),
      center: l(n.x, n.y),
      zoom: t.zoom ?? 3,
      minZoom: v,
      maxZoom: t.maxZoom ?? C + 3,
      attributionControl: t.attribution === !0 ? void 0 : !1,
      // Ein Spielplan hat kein Oben-Links-Nordpfeil-Bedürfnis, und eine gedrehte
      // Karte macht "die Straße geht nach oben" kaputt. Drehen bleibt aus, bis es
      // jemand ausdrücklich einschaltet.
      dragRotate: t.rotate === !0,
      pitchWithRotate: t.rotate === !0,
      touchZoomRotate: !0,
      renderWorldCopies: !1
    }), t.rotate !== !0 && this.map.touchZoomRotate.disableRotation(), t.zoomControl && this.map.addControl(new e.NavigationControl({ showCompass: !1 }), "bottom-right"), t.onMapClick && this.map.on("click", (i) => {
      const [r, a] = $(i.lngLat.lng, i.lngLat.lat);
      t.onMapClick(r, a);
    });
  }
  /** Die rohe MapLibre-Karte — für alles, was dieses Paket bewusst nicht kann. */
  get raw() {
    return this.map;
  }
  /** Wartet, bis die Karte gezeichnet werden kann. */
  ready() {
    return this.map.loaded() ? Promise.resolve() : new Promise((e) => this.map.once("load", () => e()));
  }
  setStyle(e) {
    this.opts.style = e, this.map.setStyle(k(this.opts.tileBaseUrl, e, this.opts.background)), this.map.once("styledata", () => {
      this.lastZones && this.setZones(this.lastZones);
    });
  }
  colorFor(e, o) {
    if (o) return o;
    let t = this.colors.get(e);
    return t || (t = m.PALETTE[this.colorIdx++ % m.PALETTE.length], this.colors.set(e, t)), t;
  }
  /**
   * Spieler setzen. Der VOLLSTÄNDIGE Stand, nicht ein Zusatz — wer fehlt, verschwindet.
   *
   * Vorhandene Punkte werden bewegt statt neu gebaut. Das ist nicht Feinschliff: ein
   * neuer DOM-Knoten je Aktualisierung heißt bei 500 ms Takt, dass die Karte
   * flackert und jeder offene Tooltip zuklappt.
   */
  setPlayers(e) {
    const o = /* @__PURE__ */ new Set();
    for (const t of e) {
      const n = String(t.id);
      o.add(n);
      const i = this.colorFor(n, t.color), r = l(t.x, t.y), a = this.players.get(n);
      if (a)
        a.setLngLat(r), E(a.getElement(), t, i);
      else {
        const d = E(document.createElement("div"), t, i);
        this.opts.onSelect && d.addEventListener("click", (y) => {
          y.stopPropagation(), this.opts.onSelect("player", t.id);
        }), this.players.set(n, new this.ml.Marker({ element: d }).setLngLat(r).addTo(this.map));
      }
    }
    for (const [t, n] of this.players)
      o.has(t) || (n.remove(), this.players.delete(t));
    if (this.follow) {
      const t = e.find((n) => String(n.id) === this.follow);
      t && this.map.easeTo({ center: l(t.x, t.y), duration: 400 });
    }
  }
  setMarkers(e) {
    const o = /* @__PURE__ */ new Set();
    for (const t of e) {
      o.add(t.id);
      const n = l(t.x, t.y), i = this.markers.get(t.id);
      if (i)
        i.setLngLat(n), L(i.getElement(), t);
      else {
        const r = L(document.createElement("div"), t);
        this.opts.onSelect && r.addEventListener("click", (a) => {
          a.stopPropagation(), this.opts.onSelect("marker", t.id);
        }), this.markers.set(t.id, new this.ml.Marker({ element: r }).setLngLat(n).addTo(this.map));
      }
    }
    for (const [t, n] of this.markers)
      o.has(t) || (n.remove(), this.markers.delete(t));
  }
  /** Zonen als GeoJSON — hier sind es Flächen, und Flächen kann MapLibre selbst. */
  setZones(e) {
    this.lastZones = e;
    const o = F(e), t = this.map.getSource("zones");
    if (t) {
      t.setData(o);
      return;
    }
    if (!this.map.isStyleLoaded()) {
      this.map.once("idle", () => this.setZones(e));
      return;
    }
    this.map.addSource("zones", { type: "geojson", data: o }), this.map.addLayer({
      id: "zones-fill",
      type: "fill",
      source: "zones",
      paint: { "fill-color": ["get", "fill"], "fill-opacity": ["get", "opacity"] }
    }), this.map.addLayer({
      id: "zones-line",
      type: "line",
      source: "zones",
      paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.8 }
    }), this.opts.onSelect && this.map.on("click", "zones-fill", (n) => {
      const i = n.features?.[0]?.properties?.id;
      i != null && this.opts.onSelect("zone", String(i));
    });
  }
  /** Hinfliegen. `zoom` weglassen heißt: Zoomstufe behalten. */
  flyTo(e, o, t) {
    this.map.flyTo({ center: l(e, o), zoom: t ?? this.map.getZoom(), duration: 700 });
  }
  /** Einem Spieler folgen, `null` beendet es. */
  setFollow(e) {
    this.follow = e == null ? null : String(e);
  }
  resize() {
    this.map.resize();
  }
  destroy() {
    for (const e of this.players.values()) e.remove();
    for (const e of this.markers.values()) e.remove();
    this.players.clear(), this.markers.clear(), this.map.remove();
  }
};
m.PALETTE = [
  "#00d4aa",
  "#60a5fa",
  "#a78bfa",
  "#f59e0b",
  "#22c55e",
  "#f43f5e",
  "#06b6d4",
  "#ec4899"
];
let b = m;
function Y({
  maplibre: s,
  players: e,
  markers: o,
  zones: t,
  follow: n,
  className: i,
  style: r,
  mapStyle: a,
  onReady: d,
  ...y
}) {
  const u = x(null), c = x(null), M = x(!1);
  return h(() => {
    if (!u.current) return;
    const p = new b(s, u.current, { ...y, style: a });
    c.current = p, p.ready().then(() => {
      M.current = !0, d?.(p);
    });
    const w = new ResizeObserver(() => p.resize());
    return w.observe(u.current), () => {
      w.disconnect(), p.destroy(), c.current = null, M.current = !1;
    };
  }, []), h(() => {
    e && c.current?.setPlayers(e);
  }, [e]), h(() => {
    o && c.current?.setMarkers(o);
  }, [o]), h(() => {
    t && c.current?.setZones(t);
  }, [t]), h(() => {
    c.current?.setFollow(n ?? null);
  }, [n]), h(() => {
    a && c.current?.setStyle(a);
  }, [a]), /* @__PURE__ */ P(
    "div",
    {
      ref: u,
      className: i,
      style: { width: "100%", height: "100%", ...r }
    }
  );
}
export {
  T as DEFAULT_TRANSFORM,
  G as GAME_BOUNDS,
  f as GAME_LIMITS,
  b as LiveMap,
  Y as LiveMapView,
  S as MARKER_ICONS,
  C as MAX_ZOOM,
  v as MIN_ZOOM,
  O as TILE_STYLES,
  R as clampGame,
  l as gameToLngLat,
  A as headingToBearing,
  $ as lngLatToGame,
  k as tileStyle
};
//# sourceMappingURL=index.js.map
