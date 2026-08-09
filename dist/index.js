import { jsx as I } from "react/jsx-runtime";
import { useRef as x, useEffect as d } from "react";
const E = [0.02072, 117.3, -0.0205, 172.8], f = {
  minX: -5661,
  maxX: 6694,
  minY: -4058,
  maxY: 8429
}, g = { minX: -4e3, maxX: 4500, minY: -4e3, maxY: 8e3 }, y = 256, z = Math.PI / 180, R = 180 / Math.PI;
function V(n, t) {
  return [
    Math.min(f.maxX, Math.max(f.minX, n)),
    Math.min(f.maxY, Math.max(f.minY, t))
  ];
}
function l(n, t, a = E) {
  const [e, o] = V(n, t), r = a[0] * e + a[1], i = a[2] * o + a[3], s = r / y * 360 - 180, h = Math.atan(Math.sinh(Math.PI * (1 - 2 * i / y))) * R;
  return [s, h];
}
function O(n, t, a = E) {
  const e = (n + 180) / 360 * y, o = y / 2 * (1 - Math.asinh(Math.tan(t * z)) / Math.PI);
  return [(e - a[1]) / a[0], (o - a[3]) / a[2]];
}
function X(n) {
  return (360 - n % 360 + 360) % 360;
}
const N = {
  satellite: { label: "Satellit", dark: !0 },
  road: { label: "Straßen", dark: !0 },
  roads2: { label: "Straßen 2", dark: !0 },
  minimap: { label: "Minimap", dark: !0 }
}, C = 0, H = 5;
function L(n, t = "satellite", a = "#07080f", e) {
  const o = n.replace(/\/+$/, "");
  return {
    version: 8,
    sources: {
      gta: {
        type: "raster",
        tiles: [(e ?? "{base}/tiles/{style}/{z}/{x}/{y}.jpg").replace("{base}", o).replace("{style}", t)],
        tileSize: 256,
        minzoom: C,
        maxzoom: H,
        attribution: `GTA5 ${N[t].label}`
      }
    },
    layers: [
      // Der Hintergrund ist nicht Deko: außerhalb der Kacheln (Meer, Ränder)
      // wäre sonst das Nichts zu sehen, und das flackert beim Ziehen.
      { id: "bg", type: "background", paint: { "background-color": a } },
      { id: "gta", type: "raster", source: "gta", paint: { "raster-fade-duration": 120 } }
    ]
    // Kein `glyphs`: MapLibre prueft den Style und lehnt einen Schluessel mit
    // `undefined` ab ("string expected, undefined found"). Weglassen heisst
    // weglassen — und Schrift braucht eine reine Rasterkarte nicht.
  };
}
const S = {
  package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/>',
  "traffic-cone": '<path d="M16.05 10.966a5 2.5 0 0 1-8.1 0"/><path d="m16.923 14.049 4.48 2.04a1 1 0 0 1 .001 1.831l-8.574 3.9a2 2 0 0 1-1.66 0l-8.574-3.91a1 1 0 0 1 0-1.83l4.484-2.04"/><path d="M16.949 14.14a5 2.5 0 1 1-9.9 0L10.063 3.5a2 2 0 0 1 3.874 0z"/><path d="M9.194 6.57a5 2.5 0 0 0 5.61 0"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  "heart-pulse": '<path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/><path d="M3.22 13H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  "cloud-lightning": '<path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/>',
  "user-search": '<circle cx="10" cy="7" r="4"/><path d="M10.3 15H7a4 4 0 0 0-4 4v2"/><circle cx="17" cy="17" r="3"/><path d="m21 21-1.9-1.9"/>',
  flame: '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>',
  ambulance: '<path d="M10 10H6"/><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 16.382 8H14"/><path d="M8 8v4"/><path d="M9 18h6"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  "map-pin": '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  "circle-dot": '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  tent: '<path d="M3.5 21 14 3"/><path d="M20.5 21 10 3"/><path d="M15.5 21 12 15l-3.5 6"/><path d="M2 21h20"/>',
  "lamp-ceiling": '<path d="M12 2v5"/><path d="M14.829 15.998a3 3 0 1 1-5.658 0"/><path d="M20.92 14.606A1 1 0 0 1 20 16H4a1 1 0 0 1-.92-1.394l3-7A1 1 0 0 1 7 7h10a1 1 0 0 1 .92.606z"/>',
  siren: '<path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/>',
  "triangle-alert": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  "building-2": '<path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>',
  pin: '<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>'
};
function P(n, t = 16, a = 2) {
  const e = S[n] ?? S["map-pin"];
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + t + '" height="' + t + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + a + '" stroke-linecap="round" stroke-linejoin="round">' + e + "</svg>";
}
const Y = {
  box: "package",
  cone: "traffic-cone",
  barrier: "shield",
  tent: "tent",
  lamp: "lamp-ceiling",
  blip: "circle-dot",
  fire: "flame",
  medic: "ambulance",
  police: "shield",
  tow: "truck",
  default: "map-pin",
  // Die Themen der Warnungen-App im Handy, damit beide dieselben Symbole zeigen.
  general: "siren",
  health: "heart-pulse",
  weather: "cloud-lightning",
  traffic: "traffic-cone",
  missing: "user-search",
  alert: "triangle-alert"
};
function Z(n, t) {
  n.style.width = t + "px", n.style.height = t + "px", n.style.cursor = "pointer";
}
function b(n, t) {
  let a = n.children[t];
  for (; !a; )
    n.appendChild(document.createElement("div")), a = n.children[t];
  return a;
}
function T(n, t, a) {
  Z(n, 32);
  const e = b(n, 0), o = b(n, 1);
  e.style.cssText = `width:28px;height:28px;margin:2px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;background:${a};box-shadow:0 0 0 1.5px rgba(255,255,255,.55), 0 0 0 3.5px rgba(7,8,15,.65), 0 2px 6px rgba(0,0,0,.5)`;
  const r = t.vehicle ? "car" : "user";
  return e.dataset.icon !== r && (e.dataset.icon = r, e.innerHTML = P(r, 14, 2.3)), e.style.transform = t.heading != null ? `rotate(${X(t.heading)}deg)` : "", o.style.cssText = `position:absolute;top:33px;left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(7,8,15,.92);border-radius:4px;padding:1px 5px;border-bottom:2px solid ${a};font-size:9.5px;font-weight:700;color:#fff;letter-spacing:.01em;text-shadow:0 1px 2px rgba(0,0,0,.6);pointer-events:none`, o.textContent !== t.name && (o.textContent = t.name), o.style.display = t.name ? "" : "none", n;
}
function A(n, t) {
  Z(n, 30);
  const a = t.color || "#3b82f6", e = Y[t.icon ?? "default"] ?? t.icon ?? "map-pin", o = b(n, 0);
  return o.style.cssText = `width:26px;height:26px;margin:2px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;background:${a};box-shadow:0 0 0 1.5px rgba(255,255,255,.5), 0 0 0 3px rgba(7,8,15,.6), 0 2px 5px rgba(0,0,0,.45)`, o.dataset.icon !== e && (o.dataset.icon = e, o.innerHTML = P(e, 14, 2.3)), t.label && (n.title = t.label), n;
}
function F(n, t, a, e = 48) {
  const o = [];
  for (let r = 0; r <= e; r++) {
    const i = r / e * Math.PI * 2;
    o.push(l(n + Math.cos(i) * a, t + Math.sin(i) * a));
  }
  return o;
}
function G(n) {
  return {
    type: "FeatureCollection",
    features: n.map((t) => {
      const a = t.color || "#3b82f6";
      return {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [t.type === "polygon" && t.points && t.points.length > 2 ? [
          ...t.points.map((o) => l(o.x, o.y)),
          l(t.points[0].x, t.points[0].y)
        ] : F(t.x, t.y, t.radius ?? 50)] },
        properties: {
          id: t.id,
          label: t.label ?? t.id,
          color: a,
          fill: t.fillColor || a,
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
  constructor(t, a, e) {
    this.players = /* @__PURE__ */ new Map(), this.markers = /* @__PURE__ */ new Map(), this.colors = /* @__PURE__ */ new Map(), this.colorIdx = 0, this.follow = null, this.lastZones = null, this.ml = t, this.opts = e;
    const o = e.center ?? { x: 0, y: 0 };
    if (this.map = new t.Map({
      container: a,
      style: L(e.tileBaseUrl, e.style ?? "satellite", e.background, e.tileUrl),
      center: l(o.x, o.y),
      zoom: e.zoom ?? 3,
      minZoom: C,
      maxZoom: e.maxZoom ?? H + 3,
      attributionControl: e.attribution === !0 ? void 0 : !1,
      // Ein Spielplan hat kein Oben-Links-Nordpfeil-Bedürfnis, und eine gedrehte
      // Karte macht "die Straße geht nach oben" kaputt. Drehen bleibt aus, bis es
      // jemand ausdrücklich einschaltet.
      dragRotate: e.rotate === !0,
      pitchWithRotate: e.rotate === !0,
      touchZoomRotate: !0,
      renderWorldCopies: !1
    }), e.zoom == null) {
      const r = l(g.minX, g.minY), i = l(g.maxX, g.maxY);
      this.map.once("load", () => this.map.fitBounds([r, i], { padding: 12, animate: !1 }));
    }
    e.rotate !== !0 && this.map.touchZoomRotate.disableRotation(), e.zoomControl && this.map.addControl(new t.NavigationControl({ showCompass: !1 }), "bottom-right"), e.onMapClick && this.map.on("click", (r) => {
      const [i, s] = O(r.lngLat.lng, r.lngLat.lat);
      e.onMapClick(i, s);
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
  colorFor(t, a) {
    if (a) return a;
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
    const a = /* @__PURE__ */ new Set();
    for (const e of t) {
      const o = String(e.id);
      a.add(o);
      const r = this.colorFor(o, e.color), i = l(e.x, e.y), s = this.players.get(o);
      if (s)
        s.setLngLat(i), T(s.getElement(), e, r);
      else {
        const h = T(document.createElement("div"), e, r);
        this.opts.onSelect && h.addEventListener("click", (M) => {
          M.stopPropagation(), this.opts.onSelect("player", e.id);
        }), this.players.set(o, new this.ml.Marker({ element: h }).setLngLat(i).addTo(this.map));
      }
    }
    for (const [e, o] of this.players)
      a.has(e) || (o.remove(), this.players.delete(e));
    if (this.follow) {
      const e = t.find((o) => String(o.id) === this.follow);
      e && this.map.easeTo({ center: l(e.x, e.y), duration: 400 });
    }
  }
  setMarkers(t) {
    const a = /* @__PURE__ */ new Set();
    for (const e of t) {
      a.add(e.id);
      const o = l(e.x, e.y), r = this.markers.get(e.id);
      if (r)
        r.setLngLat(o), A(r.getElement(), e);
      else {
        const i = A(document.createElement("div"), e);
        this.opts.onSelect && i.addEventListener("click", (s) => {
          s.stopPropagation(), this.opts.onSelect("marker", e.id);
        }), this.markers.set(e.id, new this.ml.Marker({ element: i }).setLngLat(o).addTo(this.map));
      }
    }
    for (const [e, o] of this.markers)
      a.has(e) || (o.remove(), this.markers.delete(e));
  }
  /** Zonen als GeoJSON — hier sind es Flächen, und Flächen kann MapLibre selbst. */
  setZones(t) {
    this.lastZones = t;
    const a = G(t), e = this.map.getSource("zones");
    if (e) {
      e.setData(a);
      return;
    }
    if (!this.map.isStyleLoaded()) {
      this.map.once("idle", () => this.setZones(t));
      return;
    }
    this.map.addSource("zones", { type: "geojson", data: a }), this.map.addLayer({
      id: "zones-fill",
      type: "fill",
      source: "zones",
      paint: { "fill-color": ["get", "fill"], "fill-opacity": ["get", "opacity"] }
    }), this.map.addLayer({
      id: "zones-line",
      type: "line",
      source: "zones",
      paint: { "line-color": ["get", "color"], "line-width": 2, "line-opacity": 0.8 }
    }), this.opts.onSelect && this.map.on("click", "zones-fill", (o) => {
      const r = o.features?.[0]?.properties?.id;
      r != null && this.opts.onSelect("zone", String(r));
    });
  }
  /** Hinfliegen. `zoom` weglassen heißt: Zoomstufe behalten. */
  flyTo(t, a, e) {
    this.map.flyTo({ center: l(t, a), zoom: e ?? this.map.getZoom(), duration: 700 });
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
let v = m;
function U({
  maplibre: n,
  players: t,
  markers: a,
  zones: e,
  follow: o,
  className: r,
  style: i,
  mapStyle: s,
  onReady: h,
  ...M
}) {
  const u = x(null), c = x(null), w = x(!1);
  return d(() => {
    if (!u.current) return;
    const p = new v(n, u.current, { ...M, style: s });
    c.current = p, p.ready().then(() => {
      w.current = !0, h?.(p);
    });
    const k = new ResizeObserver(() => p.resize());
    return k.observe(u.current), () => {
      k.disconnect(), p.destroy(), c.current = null, w.current = !1;
    };
  }, []), d(() => {
    t && c.current?.setPlayers(t);
  }, [t]), d(() => {
    a && c.current?.setMarkers(a);
  }, [a]), d(() => {
    e && c.current?.setZones(e);
  }, [e]), d(() => {
    c.current?.setFollow(o ?? null);
  }, [o]), d(() => {
    s && c.current?.setStyle(s);
  }, [s]), /* @__PURE__ */ I(
    "div",
    {
      ref: u,
      className: r,
      style: { width: "100%", height: "100%", ...i }
    }
  );
}
export {
  E as DEFAULT_TRANSFORM,
  g as GAME_BOUNDS,
  f as GAME_LIMITS,
  S as ICON_SVG,
  v as LiveMap,
  U as LiveMapView,
  Y as MARKER_ICONS,
  H as MAX_ZOOM,
  C as MIN_ZOOM,
  N as TILE_STYLES,
  V as clampGame,
  l as gameToLngLat,
  X as headingToBearing,
  P as iconSvg,
  O as lngLatToGame,
  L as tileStyle
};
//# sourceMappingURL=index.js.map
