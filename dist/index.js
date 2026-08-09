import { jsx as R } from "react/jsx-runtime";
import { useRef as b, useEffect as h } from "react";
const C = [0.02072, 117.3, -0.0205, 172.8], f = {
  minX: -5661,
  maxX: 6694,
  minY: -4058,
  maxY: 8429
}, y = { minX: -4e3, maxX: 4500, minY: -4e3, maxY: 8e3 }, g = 256, A = Math.PI / 180, X = 180 / Math.PI;
function $(s, t) {
  return [
    Math.min(f.maxX, Math.max(f.minX, s)),
    Math.min(f.maxY, Math.max(f.minY, t))
  ];
}
function l(s, t, o = C) {
  const [e, n] = $(s, t), i = o[0] * e + o[1], r = o[2] * n + o[3], a = i / g * 360 - 180, d = Math.atan(Math.sinh(Math.PI * (1 - 2 * r / g))) * X;
  return [a, d];
}
function z(s, t, o = C) {
  const e = (s + 180) / 360 * g, n = g / 2 * (1 - Math.asinh(Math.tan(t * A)) / Math.PI);
  return [(e - o[1]) / o[0], (n - o[3]) / o[2]];
}
function O(s) {
  return (360 - s % 360 + 360) % 360;
}
const Y = {
  satellite: { label: "Satellit", dark: !0 },
  road: { label: "Straßen", dark: !0 },
  roads2: { label: "Straßen 2", dark: !0 },
  minimap: { label: "Minimap", dark: !0 }
}, P = 0, Z = 5;
function L(s, t = "satellite", o = "#07080f", e) {
  const n = s.replace(/\/+$/, "");
  return {
    version: 8,
    sources: {
      gta: {
        type: "raster",
        tiles: [(e ?? "{base}/tiles/{style}/{z}/{x}/{y}.jpg").replace("{base}", n).replace("{style}", t)],
        tileSize: 256,
        minzoom: P,
        maxzoom: Z,
        attribution: `GTA5 ${Y[t].label}`
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
const T = {
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
function I(s, t) {
  s.style.width = t + "px", s.style.height = t + "px", s.style.cursor = "pointer";
}
function M(s, t) {
  let o = s.children[t];
  for (; !o; )
    s.appendChild(document.createElement("div")), o = s.children[t];
  return o;
}
function E(s, t, o) {
  I(s, 32);
  const e = M(s, 0), n = M(s, 1);
  e.style.cssText = `width:32px;height:32px;border-radius:50%;background:${o}22;border:2px solid ${o};display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 10px ${o}55`;
  const i = t.vehicle ? "🚗" : "👤";
  return e.textContent !== i && (e.textContent = i), e.style.transform = t.heading != null ? `rotate(${O(t.heading)}deg)` : "", n.style.cssText = `position:absolute;top:34px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(7,8,15,.85);border:1px solid ${o}66;border-radius:4px;padding:1px 5px;font-size:9px;font-weight:700;color:#fff;pointer-events:none`, n.textContent !== t.name && (n.textContent = t.name), n.style.display = t.name ? "" : "none", s;
}
function v(s, t) {
  I(s, 30);
  const o = t.color || "#3b82f6", e = T[t.icon ?? "default"] ?? t.icon ?? T.default, n = M(s, 0);
  return n.style.cssText = `width:30px;height:30px;border-radius:50%;background:${o}20;border:2px solid ${o};display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 0 8px ${o}44`, n.textContent !== e && (n.textContent = e), t.label && (s.title = t.label), s;
}
function F(s, t, o, e = 48) {
  const n = [];
  for (let i = 0; i <= e; i++) {
    const r = i / e * Math.PI * 2;
    n.push(l(s + Math.cos(r) * o, t + Math.sin(r) * o));
  }
  return n;
}
function N(s) {
  return {
    type: "FeatureCollection",
    features: s.map((t) => {
      const o = t.color || "#3b82f6";
      return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [t.type === "polygon" && t.points && t.points.length > 2 ? [
          ...t.points.map((n) => l(n.x, n.y)),
          l(t.points[0].x, t.points[0].y)
        ] : F(t.x, t.y, t.radius ?? 50)] },
        properties: {
          id: t.id,
          label: t.label ?? t.id,
          color: o,
          fill: t.fillColor || o,
          opacity: t.opacity ?? 0.2
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
  constructor(t, o, e) {
    this.players = /* @__PURE__ */ new Map(), this.markers = /* @__PURE__ */ new Map(), this.colors = /* @__PURE__ */ new Map(), this.colorIdx = 0, this.follow = null, this.lastZones = null, this.ml = t, this.opts = e;
    const n = e.center ?? { x: 0, y: 0 };
    if (this.map = new t.Map({
      container: o,
      style: L(e.tileBaseUrl, e.style ?? "satellite", e.background, e.tileUrl),
      center: l(n.x, n.y),
      zoom: e.zoom ?? 3,
      minZoom: P,
      maxZoom: e.maxZoom ?? Z + 3,
      attributionControl: e.attribution === !0 ? void 0 : !1,
      // Ein Spielplan hat kein Oben-Links-Nordpfeil-Bedürfnis, und eine gedrehte
      // Karte macht "die Straße geht nach oben" kaputt. Drehen bleibt aus, bis es
      // jemand ausdrücklich einschaltet.
      dragRotate: e.rotate === !0,
      pitchWithRotate: e.rotate === !0,
      touchZoomRotate: !0,
      renderWorldCopies: !1
    }), e.zoom == null) {
      const i = l(y.minX, y.minY), r = l(y.maxX, y.maxY);
      this.map.once("load", () => this.map.fitBounds([i, r], { padding: 12, animate: !1 }));
    }
    e.rotate !== !0 && this.map.touchZoomRotate.disableRotation(), e.zoomControl && this.map.addControl(new t.NavigationControl({ showCompass: !1 }), "bottom-right"), e.onMapClick && this.map.on("click", (i) => {
      const [r, a] = z(i.lngLat.lng, i.lngLat.lat);
      e.onMapClick(r, a);
    });
  }
  /** Die rohe MapLibre-Karte — für alles, was dieses Paket bewusst nicht kann. */
  get raw() {
    return this.map;
  }
  /** Wartet, bis die Karte gezeichnet werden kann. */
  ready() {
    return this.map.loaded() ? Promise.resolve() : new Promise((t) => this.map.once("load", () => t()));
  }
  setStyle(t) {
    this.opts.style = t, this.map.setStyle(L(this.opts.tileBaseUrl, t, this.opts.background, this.opts.tileUrl)), this.map.once("styledata", () => {
      this.lastZones && this.setZones(this.lastZones);
    });
  }
  colorFor(t, o) {
    if (o) return o;
    let e = this.colors.get(t);
    return e || (e = m.PALETTE[this.colorIdx++ % m.PALETTE.length], this.colors.set(t, e)), e;
  }
  /**
   * Spieler setzen. Der VOLLSTÄNDIGE Stand, nicht ein Zusatz — wer fehlt, verschwindet.
   *
   * Vorhandene Punkte werden bewegt statt neu gebaut. Das ist nicht Feinschliff: ein
   * neuer DOM-Knoten je Aktualisierung heißt bei 500 ms Takt, dass die Karte
   * flackert und jeder offene Tooltip zuklappt.
   */
  setPlayers(t) {
    const o = /* @__PURE__ */ new Set();
    for (const e of t) {
      const n = String(e.id);
      o.add(n);
      const i = this.colorFor(n, e.color), r = l(e.x, e.y), a = this.players.get(n);
      if (a)
        a.setLngLat(r), E(a.getElement(), e, i);
      else {
        const d = E(document.createElement("div"), e, i);
        this.opts.onSelect && d.addEventListener("click", (x) => {
          x.stopPropagation(), this.opts.onSelect("player", e.id);
        }), this.players.set(n, new this.ml.Marker({ element: d }).setLngLat(r).addTo(this.map));
      }
    }
    for (const [e, n] of this.players)
      o.has(e) || (n.remove(), this.players.delete(e));
    if (this.follow) {
      const e = t.find((n) => String(n.id) === this.follow);
      e && this.map.easeTo({ center: l(e.x, e.y), duration: 400 });
    }
  }
  setMarkers(t) {
    const o = /* @__PURE__ */ new Set();
    for (const e of t) {
      o.add(e.id);
      const n = l(e.x, e.y), i = this.markers.get(e.id);
      if (i)
        i.setLngLat(n), v(i.getElement(), e);
      else {
        const r = v(document.createElement("div"), e);
        this.opts.onSelect && r.addEventListener("click", (a) => {
          a.stopPropagation(), this.opts.onSelect("marker", e.id);
        }), this.markers.set(e.id, new this.ml.Marker({ element: r }).setLngLat(n).addTo(this.map));
      }
    }
    for (const [e, n] of this.markers)
      o.has(e) || (n.remove(), this.markers.delete(e));
  }
  /** Zonen als GeoJSON — hier sind es Flächen, und Flächen kann MapLibre selbst. */
  setZones(t) {
    this.lastZones = t;
    const o = N(t), e = this.map.getSource("zones");
    if (e) {
      e.setData(o);
      return;
    }
    if (!this.map.isStyleLoaded()) {
      this.map.once("idle", () => this.setZones(t));
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
  flyTo(t, o, e) {
    this.map.flyTo({ center: l(t, o), zoom: e ?? this.map.getZoom(), duration: 700 });
  }
  /** Einem Spieler folgen, `null` beendet es. */
  setFollow(t) {
    this.follow = t == null ? null : String(t);
  }
  resize() {
    this.map.resize();
  }
  destroy() {
    for (const t of this.players.values()) t.remove();
    for (const t of this.markers.values()) t.remove();
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
let w = m;
function j({
  maplibre: s,
  players: t,
  markers: o,
  zones: e,
  follow: n,
  className: i,
  style: r,
  mapStyle: a,
  onReady: d,
  ...x
}) {
  const u = b(null), c = b(null), k = b(!1);
  return h(() => {
    if (!u.current) return;
    const p = new w(s, u.current, { ...x, style: a });
    c.current = p, p.ready().then(() => {
      k.current = !0, d?.(p);
    });
    const S = new ResizeObserver(() => p.resize());
    return S.observe(u.current), () => {
      S.disconnect(), p.destroy(), c.current = null, k.current = !1;
    };
  }, []), h(() => {
    t && c.current?.setPlayers(t);
  }, [t]), h(() => {
    o && c.current?.setMarkers(o);
  }, [o]), h(() => {
    e && c.current?.setZones(e);
  }, [e]), h(() => {
    c.current?.setFollow(n ?? null);
  }, [n]), h(() => {
    a && c.current?.setStyle(a);
  }, [a]), /* @__PURE__ */ R(
    "div",
    {
      ref: u,
      className: i,
      style: { width: "100%", height: "100%", ...r }
    }
  );
}
export {
  C as DEFAULT_TRANSFORM,
  y as GAME_BOUNDS,
  f as GAME_LIMITS,
  w as LiveMap,
  j as LiveMapView,
  T as MARKER_ICONS,
  Z as MAX_ZOOM,
  P as MIN_ZOOM,
  Y as TILE_STYLES,
  $ as clampGame,
  l as gameToLngLat,
  O as headingToBearing,
  z as lngLatToGame,
  L as tileStyle
};
//# sourceMappingURL=index.js.map
