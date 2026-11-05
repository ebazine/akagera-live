# Reba · Akagera

*Reba* means "look!" in Kinyarwanda. An unofficial community guide to Akagera National Park (not run by or affiliated with African Parks or the Rwanda Development Board).

Live animal sightings, road conditions and GPS turn-by-turn navigation for Akagera National Park, Rwanda.
Open it on a phone at **https://ebazine.github.io/akagera-live/** and use *Add to Home screen* so it works like an app.

## What it does

- **GPS navigation on the park's tracks.** Pick a lodge, lake, gate, junction stone or a sighting and the app plans a route on the OpenStreetMap road network, using roads inside the park only, then guides you with a heading-up 3D view (your vehicle is drawn in 3D, upright on the tilted map), turn arrows, distances, spoken directions and automatic rerouting.
- **Route preview.** Step through every turn on the map before you drive, or press play for a guided fly-through.
- **Find animals.** Tick the animals you want to see; they are added to your trip as animal stops, which always use the freshest sighting of each species (and update when someone reports a newer one). Mix them freely with lodges, lakes and junction stones.
- **Speed warning.** Above 40 km/h inside the park the speed badge turns red, you get a spoken reminder (can be switched off in Settings).
- **Report with one tap.** Report → tap the animal, and it is sent with your GPS position. A small card then lets you add, if you like, how many, which way they are moving (relative to your car), which rhino, and more details (what they are doing, distance, a note). If the same animal was reported within 300 m in the last 30 minutes, your tap confirms that sighting instead of adding a second one. Road problems: type and severity.
- **Timestamps everywhere.** Every sighting shows the clock time it was seen and how long ago. *Animals* lists the latest sightings and the last time each species was seen (up to 7 days).
- **Road reports expire with the weather.** Mud, flooding and slippery climbs last a base time plus extra hours per millimetre of rain (Open-Meteo data for the north, centre and south of the park), and longer if it rains again. Other problems have fixed lifetimes (fallen tree 3 days, closure 7 days, potholes 14 days, stuck vehicle 6 h, animals on the road 1 h). Anyone can mark a report *still there* or *gone*.
- **Verify sightings on the spot.** Within 400 m of another driver's sighting, with a live GPS fix (accurate to 100 m or better), you can tap *I see it*. The sighting gets a green tick, its time is refreshed, the verifier's name and vehicle (from the trip pass) and distance are shown, the animal is ticked on your list and you earn 5 points. *Not there any more* also needs you to be near (the reporter can always remove their own). The app alerts you, by voice and vibration, when you come within 400 m of a sighting, with *I see it* / *Not here* buttons. This works while the app is open on screen (a web app cannot alert in the background). Turn it off in Settings.
- **Your vehicle on the map.** Instead of a dot, your position shows as a top-down vehicle that turns with your heading: 4x4/SUV, open safari vehicle, pop-top van, pickup, car or minibus, in your colour, with an optional plate or name tag. An avatar floats above it: an animal or person emoji, your initials, or a photo (kept on the phone only). Choose *Driving* or *Being driven*: passengers can type in the chat while moving, and speed alerts then talk about the vehicle. Open it from Settings or by tapping your vehicle; it can also update the vehicle on your trip pass.
- **Leaderboard.** Under Animals → 🏆 Board. Join with a nickname and an animal avatar; choose whether to appear on the park-wide board. Points: ticked animals (5–40 by rarity), badges, +5 per sighting you verify on the spot, +3 when another driver verifies yours. Views for *Today*, *This week* and *Overall* (Rwanda time), a podium, rank changes since your last visit, 👑 for the week's leader, 🔥 for days in a row, "points to pass" the next driver and a toast when you move up. Your groups (see below) get their own board, and there is a shareable score-card picture. Only the nickname, avatar, level and points are shared; entries untouched for 90 days are removed.
- **Trip mode.** Go → *Plan a trip*: the map switches to trip mode with a bar at the bottom showing the stops, distance, time and arrival. Tap anything on the map (a junction stone, lodge, sighting or any point on a road) and press **＋ Add as stop**, or press **＋ Add** for lists of animals, places, junction stones and sightings. Tap a stop's pin to change the stay time, move it earlier or later, or remove it. ▶ *Start* navigates through all stops; ☰ *Details* opens the full planner.
- **Trip planner.** The full view behind ☰ *Details*, also reached with *＋ Add as a stop in my trip* on any place or sighting. Tap places, junction stones or sightings on the map (or pick them from lists) to add up to 12 stops, set how long you stay at each, reorder them or let the app find the quickest order, and finish at the last stop, back at the start or at a gate. Choose *Leave at* (now or a time today or tomorrow) or *Arrive by*: the app gives the departure time and, for every stop, an arrival range that allows for animals on the road, photo stops and tracks, at a Direct, Game-drive or Slow pace. Warnings for park hours, sunset, storms on the way and closed tracks; sightings near the route. Save plans (they work offline), share them as text, preview step by step or start navigation through all stops.
- **Works without signal.** Tap the sharing pill (Live / No signal) or Settings → *Offline use and downloads*: one tap saves the app, the park and OpenStreetMap data, the official park map, animal photos and the 7-day forecast (about 5 MB) and asks the phone to protect it from clean-up. A checklist shows what is saved. *Offline mode* uses only saved data (saves data and battery): reports, verifications and chat wait on the phone and send when it is switched off. With weak signal the app starts from the saved copy after 3 seconds instead of waiting. Satellite images cannot be downloaded in advance (only areas you have viewed are kept).
- **Buy me a coffee.** Settings → *Support the app* links to https://buymeacoffee.com/eliesbazine (opens in the browser; nothing is shared with the app).
- **Weather.** Open-Meteo forecast for the north, centre and south of the park: now, the next 12 hours, 7 days, sunrise and sunset, tips for game viewing, and track wetness. Storm and heavy-rain warnings for the next 3 hours (with lightning advice for open or hard-top vehicles), rain and sunset notes in route plans, and routes that avoid tracks more when heavy rain is coming. The last forecast is kept for offline use.
- **Official park map.** The park's own A3 map (2020) is in the app: open it full page from *Layers* (pinch to zoom, download the PDF), or lay it over the live map as a layer with adjustable opacity, fitted to the junction stones, lakes and landmarks (typical offset 0.3–0.5 km). *Keep the official map for offline use* saves it on the phone. Data from it (`data/official.json`): tracks that OpenStreetMap marks closed but the official map shows as roads (Rhino Boma Road, Kajumbura Road, Rurama Loop) are drawn amber dashed and used for routes with a reminder to check at reception (switch off in Settings); the Magashi Peninsula is a no-through road (private concession); ruins and old park buildings are marked; junction stones 25, 56 and 57 use the official map's positions.
- **Map layers.** The layers button on the right shows or hides sightings, road reports, junction stones, lodges and camps, gates and ranger posts, names, closed tracks, rivers and wetlands, and example reports, with *Clean*, *Animals only* and *Everything* presets.
- **Routes avoid trouble.** Impassable reports block the road for routing, 4x4-only and caution reports weigh it down, and after heavy rain the router prefers main roads over tracks.
- **Animal guide.** 34 animals of Akagera with photos, where to find them, and what to do next to your car: warning signs, do's and never's, plus 10 rules for driving among animals.
- **Score sheet.** Every animal you report is ticked off. Points by rarity, badges (Big Five, Rhino double, Lake life, Antelope ace and more) and levels from Newcomer to Head Ranger.
- **Works offline.** The app, map data and your reports are cached on the phone. Reports queue and send when you are back in coverage.

## Data

- Roads, lakes and wetlands: © OpenStreetMap contributors (ODbL), refreshed every Monday by `.github/workflows/osm.yml` into `data/osm.json`. Run the workflow by hand from the *Actions* tab to refresh now.
- Tracks that are on the park board but missing from OpenStreetMap are listed under `links` in `data/board.json` (junction stone to junction stone, for example 74–72, 72–73, 72–70 and 70–71). They are drawn dashed brown, routed at 15 km/h with a note in the route plan, and dropped automatically once OpenStreetMap maps them (open or closed).
- Tracks that OpenStreetMap marks as closed to visitors (`access=no`, for example Rhino Boma Road through junctions 74, 72 and 70, and Rurama Loop) are drawn red dashed. Routes avoid them unless *Allow routes on tracks marked closed* is switched on in Settings; the route plan then warns which closed track it uses.
- Junction stones, ranger posts and fence houses: traced from the park entrance board (`data/board.json`), accurate to about 1 km.
- Weather: [Open-Meteo](https://open-meteo.com/). Satellite background: Esri World Imagery.
- Animal photos: loaded from each species' Wikipedia article (Wikimedia Commons contributors, licences on the linked pages) and cached for offline use. Animal texts are general guidance; always follow ranger instructions.

## Turn on shared reports (Firebase, about 10 minutes)

Without this, reports stay on the phone that made them.

1. Go to https://console.firebase.google.com, sign in with a Google account, **Create a project** (name it `akagera-live`; Analytics not needed).
2. In the project: **Build > Firestore Database > Create database**. Choose location `eur3` (or nearest) and start in **production mode**.
3. Open the **Rules** tab, replace everything with the rules below and **Publish**.
4. **Project settings** (gear icon) **> General > Your apps > Web (`</>`)**. Register an app called `akagera-live` (no hosting). Copy the `firebaseConfig` object.
5. Paste it into `config.js` as `window.AKAGERA_FIREBASE = { ... };` and commit, or send it to the person maintaining the app.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    // a pass counts only between its first and last day
    function hasPass() {
      return signedIn()
        && get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.startsAt <= request.time
        && get(/databases/$(database)/documents/profiles/$(request.auth.uid)).data.expiresAt > request.time;
    }

    match /reports/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasOnly(['kind','type','lat','lon','at','lastSeen','by','votes','count','heading','act','rdist','sev','note','uid'])
        && request.resource.data.kind in ['animal','road']
        && request.resource.data.type is string && request.resource.data.type.size() < 20
        && request.resource.data.lat is number && request.resource.data.lat > -2.3 && request.resource.data.lat < -1.0
        && request.resource.data.lon is number && request.resource.data.lon > 30.2 && request.resource.data.lon < 31.2
        && request.resource.data.at is number
        && request.resource.data.note is string && request.resource.data.note.size() <= 200
        && (!('uid' in request.resource.data) || (signedIn() && request.resource.data.uid == request.auth.uid));
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['votes','lastSeen','note','act','rdist','ver','count','heading','type'])
        && request.resource.data.note is string && request.resource.data.note.size() <= 200
        && (!('ver' in request.resource.data) || (request.resource.data.ver is map && request.resource.data.ver.size() <= 100))
        // how many, which way and which rhino can be added while the sighting is fresh (30 minutes after it was last seen)
        && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['count','heading','type'])
            || (resource.data.kind == 'animal' && request.time.toMillis() < resource.data.lastSeen + 1800000))
        && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['type'])
            || (resource.data.type == 'rhino' && request.resource.data.type in ['rhino_b','rhino_w']))
        && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['count'])
            || request.resource.data.count in ['1','2–5','6–20','20+'])
        && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['heading'])
            || (request.resource.data.heading is int && request.resource.data.heading >= -1 && request.resource.data.heading <= 7));
      allow delete: if false;
    }

    // visible pass: other drivers can see it only while it is active (the app hides it outside the dates);
    // any signed-in phone may delete a pass once it has ended
    // leaderboard: one entry per phone with a nickname, an animal and points only
    match /board/{uid} {
      allow read: if signedIn();
      allow create, update: if signedIn() && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['name','emoji','pub','groups','pts','pDay','day','pWk','wk','stk','n','ver','sc','badges','lv','rare','updatedAt'])
        && request.resource.data.name is string && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 24
        && request.resource.data.pub is bool
        && request.resource.data.groups is list && request.resource.data.groups.size() <= 5
        && request.resource.data.badges is list && request.resource.data.badges.size() <= 12
        && request.resource.data.pts is int && request.resource.data.pts >= 0 && request.resource.data.pts <= 5000
        && request.resource.data.pDay is int && request.resource.data.pDay >= 0 && request.resource.data.pDay <= request.resource.data.pts
        && request.resource.data.pWk is int && request.resource.data.pWk >= 0 && request.resource.data.pWk <= request.resource.data.pts
        && request.resource.data.updatedAt == request.time;
      allow delete: if signedIn() && (request.auth.uid == uid || resource.data.updatedAt < request.time - duration.value(90, 'd'));
    }
    // private leaderboard groups, joined with a 6-character code
    match /lbgroups/{code} {
      allow read: if signedIn();
      allow create: if signedIn() && code.matches('^[A-Z2-9]{6}$')
        && request.resource.data.keys().hasOnly(['name','by','createdAt'])
        && request.resource.data.name is string && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 40
        && request.resource.data.by == request.auth.uid && request.resource.data.createdAt == request.time;
      allow delete: if signedIn() && resource.data.by == request.auth.uid;
    }

    match /profiles/{uid} {
      allow read: if signedIn();
      allow create, update: if signedIn() && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['name','vehicle','color','party','emoji','chat','createdAt','startsAt','expiresAt','lastSeen'])
        && request.resource.data.name is string && request.resource.data.name.size() >= 2 && request.resource.data.name.size() <= 30
        && request.resource.data.vehicle is string && request.resource.data.vehicle.size() <= 40
        && request.resource.data.party is string && request.resource.data.party.size() <= 40
        && request.resource.data.startsAt is timestamp && request.resource.data.expiresAt is timestamp
        && request.resource.data.startsAt <= request.resource.data.expiresAt
        && request.resource.data.expiresAt < request.resource.data.startsAt + duration.value(8, 'd')
        && request.resource.data.startsAt < request.time + duration.value(31, 'd');
      allow delete: if signedIn() && (request.auth.uid == uid || resource.data.expiresAt < request.time);
    }

    // private trip record, kept 30 days after the last day; only its owner can read it
    match /trips/{uid} {
      allow read: if signedIn() && request.auth.uid == uid;
      allow create, update: if signedIn() && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['name','vehicle','color','party','startsAt','endsAt','retainUntil','createdAt'])
        && request.resource.data.retainUntil is timestamp
        && request.resource.data.retainUntil < request.time + duration.value(75, 'd');
      allow delete: if signedIn() && (request.auth.uid == uid || resource.data.retainUntil < request.time);
    }

    match /chat/{id} {
      allow read: if hasPass();
      allow create: if hasPass() && request.resource.data.uid == request.auth.uid
        && request.resource.data.keys().hasOnly(['uid','name','emoji','vehicle','text','at','expiresAt','kind','rep'])
        && request.resource.data.text is string && request.resource.data.text.size() <= 500
        && request.resource.data.expiresAt is timestamp
        && request.resource.data.expiresAt < request.time + duration.value(2, 'd');
      allow delete: if signedIn() && (resource.data.uid == request.auth.uid || resource.data.expiresAt < request.time);
    }

    match /dms/{pair} {
      allow read: if signedIn() && request.auth.uid in resource.data.members;
      allow create: if hasPass() && request.auth.uid in request.resource.data.members
        && request.resource.data.members.size() == 2
        && pair == request.resource.data.members[0] + '_' + request.resource.data.members[1];
      allow update: if signedIn() && request.auth.uid in resource.data.members
        && request.resource.data.members == resource.data.members;
      allow delete: if signedIn() && request.auth.uid in resource.data.members;
      match /msgs/{id} {
        allow read: if signedIn() && request.auth.uid in get(/databases/$(database)/documents/dms/$(pair)).data.members;
        allow create: if hasPass() && request.resource.data.uid == request.auth.uid
          && request.auth.uid in get(/databases/$(database)/documents/dms/$(pair)).data.members
          && request.resource.data.text is string && request.resource.data.text.size() <= 500
          && request.resource.data.expiresAt is timestamp;
        allow delete: if signedIn() && request.auth.uid in get(/databases/$(database)/documents/dms/$(pair)).data.members;
      }
    }
    // Groups with chat (members join with a 6-character invite code)
    function isMember(code) { return signedIn() && request.auth.uid in get(/databases/$(database)/documents/groups/$(code)).data.members; }
    match /groups/{code} {
      allow get: if signedIn();
      allow list: if signedIn() && request.auth.uid in resource.data.members;
      allow create: if signedIn() && code.matches('^[A-Z2-9]{6}$')
        && request.resource.data.keys().hasOnly(['name','by','createdAt','members','people'])
        && request.resource.data.name is string && request.resource.data.name.size() > 0 && request.resource.data.name.size() <= 40
        && request.resource.data.by == request.auth.uid
        && request.resource.data.members == [request.auth.uid]
        && request.resource.data.people.keys().hasOnly([request.auth.uid])
        && request.resource.data.createdAt == request.time;
      allow update: if signedIn()
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['members','people'])
        && request.resource.data.members.size() <= 60
        && (request.resource.data.members.toSet() == resource.data.members.toSet().union([request.auth.uid].toSet())
            || request.resource.data.members.toSet() == resource.data.members.toSet().difference([request.auth.uid].toSet()))
        && request.resource.data.people.diff(resource.data.people).affectedKeys().hasOnly([request.auth.uid]);
      allow delete: if signedIn() && resource.data.by == request.auth.uid;
      match /msgs/{id} {
        allow read: if isMember(code);
        allow create: if isMember(code) && request.resource.data.uid == request.auth.uid
          && request.resource.data.keys().hasOnly(['uid','name','emoji','vehicle','text','at','expiresAt','kind','rep'])
          && request.resource.data.text is string && request.resource.data.text.size() <= 1500
          && request.resource.data.expiresAt is timestamp && request.resource.data.expiresAt < request.time + duration.value(31, 'd');
        allow delete: if signedIn() && (resource.data.uid == request.auth.uid || resource.data.expiresAt < request.time);
      }
      // Live positions shared with the group (one document per member, overwritten, kept 30 minutes)
      match /pos/{uid} {
        allow read: if isMember(code);
        allow create, update: if isMember(code) && uid == request.auth.uid
          && request.resource.data.keys().hasOnly(['name','emoji','vehicle','type','color','lat','lon','hd','sp','acc','at','expiresAt'])
          && request.resource.data.lat is number && request.resource.data.lat > -2.3 && request.resource.data.lat < -1.2
          && request.resource.data.lon is number && request.resource.data.lon > 30.3 && request.resource.data.lon < 31.0
          && request.resource.data.expiresAt is timestamp && request.resource.data.expiresAt < request.time + duration.value(1, 'h');
        allow delete: if signedIn() && (uid == request.auth.uid || resource.data.expiresAt < request.time);
      }
    }
    // Anonymous traffic for oncoming-vehicle warnings (separate daily sign-in, no names, kept 5 minutes)
    match /traffic/{id} {
      allow read: if signedIn();
      allow create, update: if signedIn() && id == request.auth.uid
        && request.resource.data.keys().hasOnly(['c','lat','lon','hd','sp','at','expiresAt'])
        && request.resource.data.c is string && request.resource.data.c.size() <= 16
        && request.resource.data.lat is number && request.resource.data.lat > -2.3 && request.resource.data.lat < -1.2
        && request.resource.data.lon is number && request.resource.data.lon > 30.3 && request.resource.data.lon < 31.0
        && request.resource.data.expiresAt is timestamp && request.resource.data.expiresAt < request.time + duration.value(10, 'm');
      allow delete: if signedIn() && (id == request.auth.uid || resource.data.expiresAt < request.time);
    }
  }
}
```

The Firebase web config is not a secret; the rules above decide what visitors can write.

## Trip passes and chat

A **trip pass** is a temporary driver profile: a name or nickname, the vehicle (model and colour), who is in the car and a sign (an animal emoji). There is no password or email; the phone gets an anonymous Firebase sign-in. The driver picks the arrival and leaving dates (1 to 7 days, up to 30 days ahead). Chat and the driver list work only on those days. After the last day the pass disappears for other drivers and the trip details (name, vehicle, dates) are kept for 30 days in a private record only the driver can read, so the next trip can reuse them; the person running the app can also see them in the Firebase console. The driver can add a day, edit, or end the trip at once, which deletes everything including the 30-day record.

- **Park chat** for everyone with a pass who opted in. Messages last 24 hours. Quick replies ("Still there?", "On my way") and one-tap sharing of a sighting as a card others can open or navigate to.
- **Groups with chat.** Chat → *Groups* → *＋ New group*: give it a name and you get a 6-character code, a QR code and an invite link (`?join=CODE`) to share by WhatsApp, SMS or any app. Opening the link (or scanning the QR code) joins the group in one tap. Each group has its own chat (messages last 30 days), its own leaderboard, and one-tap sharing of a sighting or your whole trip plan. Up to 8 groups per phone, 60 members per group. Old leaderboard group codes keep working.
- **Live positions and traffic.** Settings → *Live positions and traffic* (or 📡 in a group chat). *Share with a group*: members see your vehicle, avatar and name on the map and while driving, and can tap it to drive to you or message you. *Traffic*: share anonymously while moving and get a spoken warning when another Reba vehicle is coming towards you on your road (on your route when navigating), on all roads or narrow tracks only. Positions are kept a few minutes with no history; sharing stops at 19:00 (or 2 hours after turning it on in the evening), pauses outside the park and when the app is not on screen; traffic uses a separate anonymous sign-in renewed daily. Optional: in the Firebase console add TTL policies on `expiresAt` for the `pos` and `traffic` collections so old entries are removed automatically.
- **Private messages** between two drivers, deleted after 4 days. Any driver can be blocked on your phone.
- **Driving lock:** typing is paused above 10 km/h unless you confirm you are a passenger. Quick replies still work.
- Reports show "Reported by Elies · White Toyota Prado" while the pass is active (can be switched off); afterwards the name disappears.

Firebase setup for this (once):

1. **Authentication > Get started > Sign-in method > Anonymous > Enable > Save.**
2. **Firestore Database > Rules:** publish the rules above.
3. Cleanup needs no billing: any phone with the app open deletes expired passes and messages (`janitor()` in `app.js`). Trip records (`trips`) are removed by their owner's phone after 30 days. A record whose owner never opens the app again stays until deleted by hand in the console, or by a Firestore TTL policy on `retainUntil` if you ever enable billing.

## Emergency help

The red **SOS** button opens a screen that works offline: one-tap calls to 112 (emergency), 912 (ambulance), the park line and nearby hospital; the exact position (coordinates, nearest junction stone, GPS accuracy) as a ready-made message to share by WhatsApp, SMS, any app or copy; a button that puts a red "Needs help" pin on every driver's map and in the park chat; a checklist for waiting safely; and the driver's own emergency contacts (saved on the phone only). It cannot contact rescue services by itself. Numbers are in `emergency.js`, checked November 2026.

## Files

| File | Purpose |
| --- | --- |
| `index.html`, `app.css`, `app.js` | The app |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and home-screen install |
| `config.js` | Firebase settings for shared reports |
| `species.js` | Animal guide, safety advice, badges and levels |
| `emergency.js` | Emergency numbers, problem types and the waiting checklist |
| `firestore.rules` | The Firestore security rules (paste into the Firebase console) |
| `data/board.json` | Map traced from the park entrance board |
| `data/osm.json` | OpenStreetMap roads and lakes (built by GitHub Actions) |
| `data/official.json` | Data from the park's official map (2020): its roads, the Magashi no-through area, ruins |
| `data/official/` | The official map: PDF, full-page image and map tiles (zoom 10–14) |
| `tools/build_osm.py` | Builds `data/osm.json` |
| `lib/qrcode.js` | QR codes for group invites ([qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator), MIT licence) |

Prepared by Elies Bazine, November 2026.
