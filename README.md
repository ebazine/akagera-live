# Akagera Live

Live animal sightings, road conditions and GPS turn-by-turn navigation for Akagera National Park, Rwanda.
Open it on a phone at **https://ebazine.github.io/akagera-live/** and use *Add to Home screen* so it works like an app.

## What it does

- **GPS navigation on the park's tracks.** Pick a lodge, lake, gate, junction stone or a sighting and the app plans a route on the OpenStreetMap road network, using roads inside the park only, then guides you with a heading-up 3D view, turn arrows, distances, spoken directions and automatic rerouting.
- **Route preview.** Step through every turn on the map before you drive, or press play for a guided fly-through.
- **Find animals.** Tick the animals you want to see; the app takes the freshest sighting of each and plans the quickest route through all of them, with arrival times.
- **Speed warning.** Above 40 km/h inside the park the speed badge turns red, you get a spoken reminder (can be switched off in Settings).
- **Report in three or four taps.** Animals: species, how many, which way they are moving (relative to your car). Road problems: type and severity. Your GPS position is used automatically.
- **Timestamps everywhere.** Every sighting shows the clock time it was seen and how long ago. *Animals* lists the latest sightings and the last time each species was seen (up to 7 days).
- **Road reports expire with the weather.** Mud, flooding and slippery climbs last a base time plus extra hours per millimetre of rain (Open-Meteo data for the north, centre and south of the park), and longer if it rains again. Other problems have fixed lifetimes (fallen tree 3 days, closure 7 days, potholes 14 days, stuck vehicle 6 h, animals on the road 1 h). Anyone can mark a report *still there* or *gone*.
- **Routes avoid trouble.** Impassable reports block the road for routing, 4x4-only and caution reports weigh it down, and after heavy rain the router prefers main roads over tracks.
- **Animal guide.** 34 animals of Akagera with photos, where to find them, and what to do next to your car: warning signs, do's and never's, plus 10 rules for driving among animals.
- **Score sheet.** Every animal you report is ticked off. Points by rarity, badges (Big Five, Rhino double, Lake life, Antelope ace and more) and levels from Rookie to Akagera Legend.
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
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['votes','lastSeen','note','act','rdist'])
        && request.resource.data.note is string && request.resource.data.note.size() <= 200;
      allow delete: if false;
    }

    // visible pass: other drivers can see it only while it is active (the app hides it outside the dates);
    // any signed-in phone may delete a pass once it has ended
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
  }
}
```

The Firebase web config is not a secret; the rules above decide what visitors can write.

## Trip passes and chat

A **trip pass** is a temporary driver profile: a name or nickname, the vehicle (model and colour), who is in the car and a sign (an animal emoji). There is no password or email; the phone gets an anonymous Firebase sign-in. The driver picks the arrival and leaving dates (1 to 7 days, up to 30 days ahead). Chat and the driver list work only on those days. After the last day the pass disappears for other drivers and the trip details (name, vehicle, dates) are kept for 30 days in a private record only the driver can read, so the next trip can reuse them; the person running the app can also see them in the Firebase console. The driver can add a day, edit, or end the trip at once, which deletes everything including the 30-day record.

- **Park chat** for everyone with a pass who opted in. Messages last 24 hours. Quick replies ("Still there?", "On my way") and one-tap sharing of a sighting as a card others can open or navigate to.
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
| `tools/build_osm.py` | Builds `data/osm.json` |

Prepared by Elies Bazine, November 2026.
