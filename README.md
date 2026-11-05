# HELIOS ARENA V9 — TACTICAL COMBAT OVERHAUL

**A two-player local split-screen space dogfighting game built with the PlayCanvas Engine.**

This is a complete static web project: upload these files to the root of a GitHub repository and deploy using GitHub Pages. No build pipeline, database or paid service is required. It replaces the V8 Shattered Worlds release.

## What has changed

### The Shattered Frontier — one huge map

- A colossal fictional gas giant **Aether Prime**, plus four large destructible moons: **Ember**, **Glacier**, **Bastion** and **Cinder**. Original world maps and credited reference imagery remain in the asset pipeline; positions and scale are fictional for game balance.
- Breakable asteroid population and four large destructible scientific relay structures.
- The central planet is far larger than V8's planets. Destruction produces persistent moving collision fragments, constrained to keep the frame rate manageable. There are no orbit-guide lines or invisible arena boundaries.
- Single open battlefield with gameplay-scale sizes and distances. It is **not** an orbital simulator.

### Ship flight and targeting

- **Spectre / Interceptor:** fastest, most agile, light armour.
- **Vanguard / Assault:** balanced hull, speed, turn rate and weapons.
- **Titan / Dreadnought:** toughest, largest damage per hit, slower manoeuvring.
- Slower capped combat speeds, finite reverse-thrust braking, inertia and angular damping.
- Third-person chase view **or** distinct modeled first-person cockpit for every ship class. A dedicated rendering layer isolates each cockpit to its pilot.
- Automatic enemy acquisition near the ship's forward view. Manual target cycling and a toggle to target worlds instead.
- Screen-space enemy brackets, distance, hull/shields, relative speed, offscreen arrows and a **predictive energy-bolt lead indicator**. Adjustable *limited* aim assistance: it does not guarantee hits.
- Missiles need an uninterrupted heat lock in a 14-degree cone, with HUD progress and acoustic indication. Their guidance is turn-rate limited; world targets use unguided shots.
- Heat-seeking missile flight uses a boost phase, engine glow, distinct 3D mesh and trail. Flares can divert approaching missiles; atmospheric bodies and relays can block their line of sight.
- Twin hardpoint plasma bolts with energy trails, heat accumulation, cooldown and shield/hull hit flashes.

### Battle modes

- **2v2:** Two local human pilots together versus two bots. One-human mode adds a bot teammate.
- **Free for all:** Four competing ships with no allies.
- Three AI settings: Rookie / Standard / Veteran.
- Last living team or last living pilot wins. Friendly fire on teammates is disabled.

## Local Windows launch

1. Extract the ZIP.
2. Double-click `run-local.bat` (requires Python 3) or run `python -m http.server 8000` in this directory.
3. Open `http://localhost:8000` in a WebGL2-capable browser with internet access (PlayCanvas Engine is loaded from jsDelivr).
4. Choose the battle mode, player count and ship classes. Press **LAUNCH SKIRMISH**.
5. Click the game view to capture the mouse; `Esc` releases it / pauses the match.

Do not open `index.html` directly as a local file; ES modules should run through a web server.

## GitHub Pages

1. Create or open a GitHub repository (e.g., `helios-arena`).
2. Upload the **contents** of this directory to the repository root, so `index.html`, `style.css`, `src/` and `assets/` sit at the top level.
3. Under **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
4. Your game will be at `https://YOUR-USERNAME.github.io/helios-arena/` once GitHub Pages publishes it.
5. Use a hard refresh after replacing V8 files.

### Controls

| Action | Player 1 (keyboard/mouse) | Player 2 (keyboard) |
|---|---|---|
| Thrust / reverse | `W / S` | `I / K` |
| Strafe left/right | `A / D` | `J / L` |
| Pitch / yaw | Mouse | Arrow keys |
| Roll | `Q / E` | `[ / ]` |
| Vertical thrust | `Space / C` | `, / .` |
| Boost | Left `Shift` | Right `Shift` |
| Brake | `X` | `Backspace` |
| Fire plasma | Left click or `F` | `N` |
| Fire guided missile | Right click or `R` | `M` |
| Cycle target | `Tab` | `Enter` |
| Switch enemy/world targeting | `T` | `Y` |
| Third person / cockpit | `V` | `O` |
| Launch countermeasure flares | `G` | `U` |
| Pause or resume | `P` / `Esc` | — |

**Controller:** One standard Xbox-style controller is supported for player 2 (or player 1 in solo mode). Left stick: thrust/strafe; right stick: yaw/pitch; right trigger/A: plasma; left trigger/B: missile; LB: brake; RB: boost; X: flare; Y: cycle; right-stick press: view.

For guided missiles, select an enemy, turn toward it and **hold the enemy in the central aiming cone until TARGET LOCKED**. Only then will the missile fire. Flares have limited stock and cooldowns.

## Structure

```
index.html            # Lobby, split-screen HUD, rendering canvas
style.css             # Responsive hangar and combat instruments
src/main.js           # Inputs, menu, SFX, gamepads, projection and HUD
src/combat.js         # Vessel flight, bots, missiles, hit detection, aiming and camera
src/world.js          # Giant-planet battlefield and destructible objects
src/graphics.js       # Ship classes, isolated 3D cockpits and projectile meshes
src/rules.js          # Pure team, collision, lock, guidance and intercept math
src/data.js           # Single arena body manifest
src/atlas.js          # Optional remote source maps with local JPG fallbacks
src/music.js          # Original browser-synthesized score
assets/               # Original local fallback planetary surfaces

tests/                # Node tests for targeting/math, match rules, structure
```

## Testing status and limitations

- Automated Node tests check team assignment, ship statistics, collision intersections, damage, last-team/last-player wins, lead prediction, missile lock timing and source references.
- JavaScript modules have been syntax checked, and project paths verified. **The full interactive WebGL gameplay could not be run in the authoring environment** because browser navigation and the external PlayCanvas CDN are restricted; it requires an actual desktop browser QA pass after deployment.
- This project does **not** include online networking, matchmaking, exact planetary elevation or true gravitational n-body mechanics.
- Planet destruction is stylized destruction geometry: large moving mesh fragments, not scientifically simulated planet breakup or voxel-perfect fracturing.
- Effects are built from PlayCanvas meshes and locally generated textures, not imported professional VFX or AAA spaceship models.
- Controllers differ in layout by platform; keyboard controls are included for two local players even without a controller.

## License and acknowledgements

See `LICENSE` (project source) and `CREDITS.md` (PlayCanvas and map attribution). Third-party planetary imagery is credited and used under its stated license when available; original local fallback textures are included. The score and weapon SFX are generated in the browser, with no copyrighted music recordings.
