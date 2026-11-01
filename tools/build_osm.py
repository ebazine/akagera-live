"""Download Akagera National Park map data from OpenStreetMap (Overpass API)
and write a compact routing/rendering file to data/osm.json.

Runs in GitHub Actions (.github/workflows/osm.yml). Data (c) OpenStreetMap
contributors, ODbL.
"""
import json, math, sys, time, datetime, urllib.request, urllib.parse

BBOX = (-2.10, 30.38, -1.20, 30.98)          # south, west, north, east
ENDPOINTS = ["https://overpass-api.de/api/interpreter",
             "https://overpass.kumi.systems/api/interpreter",
             "https://overpass.private.coffee/api/interpreter"]
DRIVE = "motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|track|road|living_street|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link"
MAJOR = {"motorway","trunk","primary","secondary","tertiary","motorway_link","trunk_link","primary_link","secondary_link","tertiary_link"}

def overpass(q):
    data = urllib.parse.urlencode({"data": q}).encode()
    last = None
    for ep in ENDPOINTS:
        for attempt in range(2):
            try:
                req = urllib.request.Request(ep, data=data, headers={"User-Agent": "akagera-live-builder/1.0 (github.com/ebazine/akagera-live)"})
                with urllib.request.urlopen(req, timeout=300) as r:
                    return json.loads(r.read().decode())
            except Exception as e:
                last = e; print("overpass error", ep, e, file=sys.stderr); time.sleep(10)
    raise SystemExit(f"Overpass failed: {last}")

s, w, n, e = BBOX
bb = f"({s},{w},{n},{e})"

# ---- park boundary ----
park_q = f"""[out:json][timeout:180];
(relation["name"~"Akagera",i]["boundary"~"protected_area|national_park"];
 relation["name"~"Akagera",i]["leisure"="nature_reserve"];
 way["name"~"Akagera",i]["boundary"~"protected_area|national_park"];
 way["name"~"Akagera",i]["leisure"="nature_reserve"];);
out geom;"""
park_raw = overpass(park_q)

def ring_join(segments):
    """join way geometries (lists of [lon,lat]) into closed rings"""
    segs = [list(sg) for sg in segments if len(sg) > 1]
    rings = []
    while segs:
        ring = segs.pop(0)
        changed = True
        while changed and ring[0] != ring[-1]:
            changed = False
            for i, sg in enumerate(segs):
                if sg[0] == ring[-1]: ring += sg[1:]; segs.pop(i); changed = True; break
                if sg[-1] == ring[-1]: ring += sg[::-1][1:]; segs.pop(i); changed = True; break
                if sg[-1] == ring[0]: ring = sg[:-1] + ring; segs.pop(i); changed = True; break
                if sg[0] == ring[0]: ring = sg[::-1][:-1] + ring; segs.pop(i); changed = True; break
        rings.append(ring)
    return rings

def area(r):
    a = 0
    for i in range(len(r) - 1): a += r[i][0]*r[i+1][1] - r[i+1][0]*r[i][1]
    return abs(a) / 2

park_rings = []
for el in park_raw.get("elements", []):
    if el["type"] == "relation":
        outers = [[[p["lon"], p["lat"]] for p in m["geometry"]] for m in el.get("members", []) if m.get("role") in ("outer", "") and m.get("geometry")]
        park_rings += ring_join(outers)
    elif el["type"] == "way" and el.get("geometry"):
        park_rings.append([[p["lon"], p["lat"]] for p in el["geometry"]])
park_rings = [r for r in park_rings if len(r) > 10]
park_rings.sort(key=area, reverse=True)
park_rings = park_rings[:1]
print("park rings", len(park_rings), [len(r) for r in park_rings])

def inside(pt, ring):
    x, y = pt; c = False
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]; x2, y2 = ring[i+1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1: c = not c
    return c

def near_park(lon, lat, km):
    if not park_rings: return True
    if inside((lon, lat), park_rings[0]): return True
    r = park_rings[0]; best = 1e9
    for i in range(0, len(r), 3):
        d = math.hypot((r[i][0]-lon)*111.3, (r[i][1]-lat)*111.3)
        if d < best: best = d
    return best < km

# ---- roads with topology ----
road_q = f"""[out:json][timeout:240];
way["highway"~"^({DRIVE})$"]{bb};
(._;>;);
out body qt;"""
road_raw = overpass(road_q)
nodes = {el["id"]: (el["lon"], el["lat"]) for el in road_raw["elements"] if el["type"] == "node"}
ways = [el for el in road_raw["elements"] if el["type"] == "way"]
keep = []
for wy in ways:
    t = wy.get("tags", {}); h = t.get("highway")
    # tracks closed to visitors are kept but flagged (drawn, not routed)
    closed = h not in MAJOR and (t.get("access") in ("private", "no") or t.get("motor_vehicle") in ("private", "no") or t.get("motorcar") in ("private", "no"))
    pts = [nodes[i] for i in wy["nodes"] if i in nodes]
    if len(pts) < 2: continue
    mid = pts[len(pts)//2]
    if h in MAJOR or near_park(mid[0], mid[1], 4.0) or near_park(pts[0][0], pts[0][1], 4.0):
        keep.append(wy)
used = {}
out_nodes = []
out_ways = []
for wy in keep:
    t = wy.get("tags", {}); h = t.get("highway")
    closed = h not in MAJOR and (t.get("access") in ("private", "no") or t.get("motor_vehicle") in ("private", "no") or t.get("motorcar") in ("private", "no"))
    idx = []
    for nid in wy["nodes"]:
        if nid not in nodes: continue
        if nid not in used:
            used[nid] = len(out_nodes) // 2
            lon, lat = nodes[nid]; out_nodes += [round(lon, 6), round(lat, 6)]
        idx.append(used[nid])
    t = wy.get("tags", {})
    o = {"n": idx, "h": t.get("highway")}
    if closed: o["a"] = "no"
    for k_src, k_out in (("name", "nm"), ("surface", "s"), ("tracktype", "t"), ("oneway", "o"), ("ref", "r")):
        if t.get(k_src): o[k_out] = t[k_src]
    out_ways.append(o)
print("roads", len(out_ways), "closed", sum(1 for w in out_ways if w.get("a")), "nodes", len(out_nodes)//2)

# ---- water, wetland ----
water_q = f"""[out:json][timeout:240];
(way["natural"="water"]{bb}; relation["natural"="water"]{bb};
 way["natural"="wetland"]{bb}; relation["natural"="wetland"]{bb};
 way["waterway"~"^(river|stream)$"]{bb};);
out geom;"""
water_raw = overpass(water_q)
water, wetland, rivers = [], [], []
for el in water_raw.get("elements", []):
    t = el.get("tags", {})
    if el["type"] == "way" and el.get("geometry"):
        g = [[round(p["lon"], 5), round(p["lat"], 5)] for p in el["geometry"]]
        if not near_park(g[0][0], g[0][1], 3.0) and not near_park(g[len(g)//2][0], g[len(g)//2][1], 3.0): continue
        if t.get("waterway"): rivers.append({"g": g, "nm": t.get("name", "")})
        elif t.get("natural") == "water": water.append({"g": [g], "nm": t.get("name", "")})
        else: wetland.append({"g": [g]})
    elif el["type"] == "relation":
        outers = [[[round(p["lon"], 5), round(p["lat"], 5)] for p in m["geometry"]] for m in el.get("members", []) if m.get("geometry") and m.get("role") in ("outer", "")]
        inners = [[[round(p["lon"], 5), round(p["lat"], 5)] for p in m["geometry"]] for m in el.get("members", []) if m.get("geometry") and m.get("role") == "inner"]
        rings = ring_join(outers) + ring_join(inners)
        rings = [r for r in rings if len(r) > 3]
        if not rings or not near_park(rings[0][0][0], rings[0][0][1], 3.0): continue
        (water if t.get("natural") == "water" else wetland).append({"g": rings, "nm": t.get("name", "")})
print("water", len(water), "wetland", len(wetland), "rivers", len(rivers))

# ---- points of interest ----
poi_q = f"""[out:json][timeout:180];
(nwr["tourism"]{bb}; nwr["amenity"~"^(fuel|ranger_station|parking|toilets|restaurant|shelter|police)$"]{bb};
 nwr["barrier"="gate"]["name"]{bb}; nwr["natural"~"^(peak|viewpoint|hill)$"]["name"]{bb};
 nwr["place"~"^(locality|island|peninsula|plain|hamlet|village)$"]["name"]{bb};
 nwr["leisure"="picnic_table"]{bb}; nwr["historic"]["name"]{bb};
 node["name"~"^[0-9]{{1,3}}$"]{bb}; node["ref"~"^[0-9]{{1,3}}$"][!"highway"][!"name"]{bb};);
out center tags;"""
poi_raw = overpass(poi_q)
pois = []
seen_j = set()
for el in poi_raw.get("elements", []):
    t = el.get("tags", {})
    lat = el.get("lat") or (el.get("center") or {}).get("lat")
    lon = el.get("lon") or (el.get("center") or {}).get("lon")
    if lat is None: continue
    if not near_park(lon, lat, 6.0): continue
    kind = t.get("tourism") or t.get("amenity") or t.get("barrier") or t.get("natural") or t.get("place") or t.get("leisure") or t.get("historic") or "junction"
    nm = t.get("name", "")
    if not nm and t.get("ref", "").isdigit() and len(t["ref"]) <= 3: nm = t["ref"]
    if nm.isdigit():                       # junction stone: inside the park only, once per number
        if not near_park(lon, lat, 1.0) or nm in seen_j: continue
        seen_j.add(nm)
    elif not nm and kind not in ("viewpoint", "picnic_site", "camp_site", "fuel", "ranger_station"): continue
    pois.append({"nm": nm, "k": kind, "lat": round(lat, 6), "lon": round(lon, 6)})
print("pois", len(pois))

out = {"meta": {"generated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"), "bbox": BBOX,
                "source": "OpenStreetMap contributors (ODbL)", "roads": len(out_ways), "nodes": len(out_nodes)//2},
       "park": park_rings, "nodes": out_nodes, "ways": out_ways, "water": water, "wetland": wetland, "rivers": rivers, "pois": pois}
with open("data/osm.json", "w") as f:
    json.dump(out, f, separators=(",", ":"))
print("written data/osm.json")
