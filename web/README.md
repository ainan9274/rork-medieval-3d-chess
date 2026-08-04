# King's Gambit — the app

This folder holds the game itself. For the project overview, features, architecture notes and
contribution guide, read the [root README](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).

A cinematic 3D chess game: sculpted medieval, Mesoamerican and Napoleonic figures fighting on a
marble-and-basalt board. Built with Vite + React + TypeScript + three.js, with chess.js for
the rules and a Web Worker search engine for the computer opponent.

## Setup

```bash
bun install   # or npm install
bun run dev   # or npm run dev  → http://localhost:5173
bun run build # production bundle in dist/
bun run preview
```

## Controls

| Action | Input |
| --- | --- |
| Orbit / zoom | Drag, mouse wheel (pinch on touch) |
| Playing on a phone | Nothing to set — the framing is solved for the screen, see [Screen framing](#screen-framing) |
| Select a figure | Click it (legal squares glow green, captures red) |
| Move | Click a highlighted square (click the figure again to deselect) |
| Promotion | Pick one of the four rotating figures on pedestals |
| Camera & battleground | Camera icon in the top bar (presets, flip, tactical, the four arenas) |
| What a button does | Hover, focus or tap it — every icon carries a tooltip |
| Skip the intro | Click anywhere during the opening sweep |
| Settings | Gear icon (armies, battleground, graphics preset, capture cinematics, board swing, sound) |

There is no drag-and-drop; both selecting and moving resolve on pointer release, and a press
that travels more than 8px (16px for a finger) counts as a camera swing instead.

| Key | Action |
| --- | --- |
| `F` | Flip the camera to the other side |
| `T` | Toggle the 2D tactical view |
| `H` | Open / fold the chronicle |
| `C` | Cinema mode — hide the whole overlay |
| `Space` | Pause / resume a showcase duel |
| `Esc` | Close the settings panel, camera menu, chronicle or tooltip |

## Screen framing

`scene/viewport.ts`. A perspective camera's `fov` is its **vertical** angle, and every shot in
the engine was authored on a wide desktop window — so the narrower the screen, the less of the
board's *width* fits in frame. Pulling straight back is not the answer either: the colonnade
stands at radius 12.5, so a shot dragged out past it puts the hall in front of the board.

`frameShot()` therefore solves each authored shot for the live viewport: it works out the
distance and lens that fit the board's reach on the narrow axis, then takes the extra distance
as **height** (`groundedPhi`) so the camera climbs over the colonnade. A phone in portrait ends
up at 68° / radius 14.5 / ground reach 10.6; a desktop window keeps its authored 46° shot
untouched.

- `confineCamera()` runs every frame and converts any ground reach past radius 11 into height,
  because orbit controls can only cap angle and distance independently. The intro fly-in is
  exempt — it comes in from outside the walls on purpose.
- `orbitLimits()` gives handheld screens a steeper elevation cap, a longer minimum pinch
  distance, a slower rotate speed and a fatter tap tolerance.
- `lensFov` holds the framing currently in force; battle-beat punch-ins are scaled against it
  (`lensPunch`) and read it live, so a rotation mid-fight can never restore the wrong lens.
- The tactical map is solved through the same path, so its overhead lens opens up in portrait
  instead of cropping the outer files.
- `readViewport()` decides "handheld" from a coarse pointer on a hand-sized screen — a capability
  test, not a user-agent string.

## Overlay

`GameShell.tsx` owns the phases (loading → menu → playing), the settings, attract mode and the
keyboard shortcuts; `Hud.tsx` is everything on screen during a game. The board keeps the
viewport: the turn slate and the icon rail sit in the top corners, the spoils panel is desktop-only,
phones get 34px buttons and drop the two redundant icons (flip lives in the camera menu,
fullscreen is ignored by iOS),
the move record lives behind a corner sigil (`H`), and the showcase transport is a slim
bottom-right rail that folds down to a single icon.

`Tooltip.tsx` explains the icon-only controls — name, one sentence, and a key cap when there is a
shortcut. It opens after 110 ms, then instantly for the rest of a sweep along the rail, aligns to
whichever screen edge keeps it visible, flashes for 1.8 s on a touch press, and closes on Escape,
blur or scroll. It renders inside its anchor rather than a body portal so it survives fullscreen.

Nothing on this layer is raised by the engine any more. The marksman's rifle shot used to close a
full-screen sight picture over the interface — a dark tube, a brass reticle, a rolled hand tremor,
a recoil that threw the picture off the mark (`SceneCallbacks.onScope` → `ScopeOverlay.tsx`,
`.mc-scope`). It is gone, along with the 8.5° lens punch-in it was paced against: the shot is now
watched in the hall like every other kill, and what sells it is the man dropping onto one knee in
frame rather than an effect wrapped around him.

## Architecture

Rendering is fully decoupled from the rules: the chess core emits events and the scene
subscribes to them. Nothing in `src/core` imports three.js.

```
src/
  core/            chess state, no rendering
    gameController.ts  owns chess.js, clocks, undo, AI turns, snapshots
    types.ts           shared game types (MoveEvent, GameSnapshot, …)
    emitter.ts         tiny typed event emitter
  ai/
    engine.worker.ts   negamax + alpha-beta + quiescence + iterative deepening
    aiClient.ts        main-thread handle, cancels stale searches
  scene/             three.js only
    sceneEngine.ts     renderer, camera, interaction, marching, combat choreography
    environment.ts     hall, lighting, torches, particles, PMREM environment
    arena.ts           the four battleground looks
    battlefield.ts     siege props, camps, fires, birds
    jungle.ts          canopy, palms, vines, pollen for the Sun Temple
    board.ts           tiles, base, engraved labels, highlight pool
    pieces.ts          rigged GLB loading, skeletal clips, faction materials, mixers
    weapons.ts         procedural arms, shields and staves per rank
    rankBadges.ts      floating heraldic crests
    effects.ts         particle bursts, flashes, dissolve, camera shake
    strikes.ts         per-rank blow visuals (slash arc, ground wave, pillar)
    spells.ts          fireball orbs, per-army fire, the shared light pool
    gunfire.ts         muzzle flashes, rounds in flight, powder smoke banks
    ammunition.ts      the four rounds: pistol/musket ball, Minié bullet, iron round shot
    tracer.ts          the short 3D streak swept along the path a round actually flew
    postfx.ts          EffectComposer pipeline (bloom, SSAO, DOF, grade, SMAA, clarity)
    textures.ts        procedural marble, basalt, bronze, cloth
    quality.ts         graphics presets + auto-detection
    viewport.ts        solves the framing (distance, elevation, lens) for the live screen
    tween.ts           promise-based tween engine
  ui/                plain React + CSS overlay
    GameShell.tsx      phases, settings, attract mode, shortcuts
    Hud.tsx            top bar, spoils, chronicle sigil, showcase rail
    Tooltip.tsx        themed tooltip for the icon-only controls
    MainMenu.tsx / MoveLedger.tsx / SettingsPanel.tsx / GameOverModal.tsx / Heraldry.tsx
    medieval.css       the whole overlay's look
  audio/             Web Audio mixer with layered score stems
  assets/generated.ts  army skins (sculpts, clips, arms, voices per civilisation) + audio URLs
```

### Move flow

1. The player (or the worker) produces a move → `GameController.tryMove`.
2. chess.js validates it and the controller builds a `MoveEvent` (captures, castling
   rook trip, en passant square, promotion, check flags).
3. The controller awaits the animator the scene registered, so the AI never moves while
   a figure is still gliding.
4. React re-renders from the immutable snapshot published after every change.

### The computer opponent

- **Easy** — random legal move, prefers captures, always takes a mate in one.
- **Medium** — depth 3 negamax with alpha-beta, material + piece-square tables, 0.7s budget.
- **Hard** — depth 5 iterative deepening with alpha-beta, MVV-LVA ordering and quiescence
  on captures, 3.2s budget.

All searches run in `engine.worker.ts`, so the render loop never blocks.

## Graphics presets

| Preset | Post-processing | Shadows | Particles |
| --- | --- | --- | --- |
| Low | none (direct render) | off | none |
| Medium | bloom, grade, SMAA | 1024 | light |
| High | + depth of field in cinematics | 2048 | full |
| Ultra | + SSAO | 4096 | dense |

The preset is auto-detected on first load from the GPU string, core count and memory, and
the engine steps down once automatically if the measured frame rate stays under 40 FPS.
Pixel ratio is capped at 2 (1 on Low), and WebGL context loss shows a reload prompt.

### Black-screen recovery

Drivers that render an all-black scene under a working interface (Mesa's software rasterisers on
Linux above all) are handled in three places:

- `scene/diagnostics.ts` — `probeGpu` names the driver, `reflectionProbeWorks` renders a white
  sphere lit only by the freshly built PMREM probe into an 8×8 buffer and reads it back. Black or
  `NaN` means the probe is unusable, so `SceneEngine.applyEnvironment` drops it and turns up an
  ambient skylight of the same colour instead.
- `SceneEngine.guardAgainstBlackFrames` — samples the frame at five points (centre plus quadrants)
  five times over the first eight seconds. All five points must read black before anything is
  dropped; each failed sample peels off one more layer: composer → reflection probe → safe mode.
- **Settings → Picture** — a brightness slider (exposure ×0.6–1.8) and a `Safe rendering` toggle
  (`SceneEngine.setSafeMode`: no composer, no probe, no shadow maps, +20% exposure). Both are
  persisted in `localStorage` under `kg.render`, and `?safe=1` forces safe rendering from boot.

A showcase duel adds a **clarity grade** on top of the preset (`Postfx.setClarity`): no depth of
field, grain ×0.3, vignette ×0.5 and bloom ×0.62 at a higher threshold, because a duel that is
watched rather than played needs the sculpts and the squares to read.

## Armies

Three army skins, chosen per side in **Settings → Armies** and remembered in `localStorage`
under `kg.armies`:

| Id | Army | Arms (`ArsenalId`) |
| --- | --- | --- |
| `ivory` | Ivory Kingdom — King, Queen, Mage, Knight, Guardian, Footman | `kingdom` |
| `sun` | Sun Empire — Emperor, Priestess, Serpent Priest, Jaguar Warrior, Temple Guardian, Eagle Warrior | `sun` |
| `empire` | Grande Armée — Napoléon, Imperial Commander (flintlock + Marengo sword), Marshal-Tirailleur, Cuirassier, Artillery Guard, Line Infantry | `empire` |

One skin (`ARMY_SKINS` in `src/assets/generated.ts`) carries its own six sculpts, five or six
clips per rank, weapon family (`LOADOUT` in `weapons.ts`), rank names and its own six death
cries (`DEATH_CRIES`) — no skin borrows another's voices, and the Grande Armée's are gunshot
reactions (punched-out air, then the voice) rather than melee cries.
`SceneEngine.setArmySkins` runs the swap in the background: it waits for any move animation to
finish, marks the factory stale and rebuilds (taking the old figures down before their shared
geometry is freed), reloads the rosters, stands the new army up and repoints the mixer's voices.
With the same skin on both sides only the skin's `native` faction keeps its painted textures;
the other side falls through `applyFactionLook()` and is tinted into dark livery.

## Character animation

Every figure is a rigged (skinned) character with up to six skeletal clips, listed per kind in
its army's `animated` roster (`ARMY_SKINS`, `src/assets/generated.ts`):

| Clip | When it plays |
| --- | --- |
| `idle` | Looping combat stance, desynced per figure so the army does not breathe in lockstep. The Grande Armée's marshal stands at the ready with the rifle lowered — he used to wait out the *whole game* on one knee, which read as a man permanently in cover; the kneel is worth something only as the thing he does to take a shot |
| `walk` | Looping in-place stride, retimed to the cadence of the move under way. The stride length inside the clip is **measured** (`gaitCycle()`): the generator returns anything from one cycle (`spear-walk`, 1.13 s) to three (`casual-walk`, 4.23 s). It must still be a walk — a sprint cycle stretched over one square judders instead of marching, which is why the line infantry advances on the musket-across-the-body walk rather than the rifle charge on the same rig |
| `run` | Looping in-place run — the knight charging through its leap (knights only) |
| `attack` | One-shot strike the moment the attacker lands a capture (sparks, shake and clash sound are timed to the hit frame). For the queen and the mage the same clip is the incantation, and its hit frame releases the fire — except under the `empire` arsenal, where the commander draws and shoots instead; for the Grande Armée's gunpowder ranks it is the **firing drill** — the marshal's is a drop onto one knee with the rifle levelled — played at its own readable length (`GUNS[kind].drill`), and the hit frame is the shot |
| `death` | One-shot fall played by the captured figure before it dissolves into dust |
| `reload` | One-shot drill run after a shot (powder, ball, ramrod). Only the Grande Armée carries one — the bishop's is a kneeling reload, the rook's is served at the muzzle, the king's and the commander's are done standing |
| `aim` | Looping sight picture held *before* the shot: the weapon comes up and stays on the body while the shooter settles (`PieceView.playAim()`). Napoléon (pistol levelled), the Imperial Commander, the line infantry (musket into the shoulder) and the marshal (**down onto one knee**, rifle up and scanning) all carry one; only the battery has none — laying the gun already is its aim |

How it is wired (`src/scene/pieces.ts`):

- The **rigged** GLB is the visual — the plain GLB has no skeleton, so clips bound to it do
  nothing. Each animation GLB contributes one clip, renamed to `idle` / `walk` / `run` /
  `attack` / `death`.
- Every instance is cloned with `SkeletonUtils.clone` (never `Object3D.clone`) and gets its
  own `AnimationMixer`; one-shots use `LoopOnce` + `clampWhenFinished`, and the strike
  crossfades back to the stance on the mixer's `finished` event.
- Clip root motion is stripped on X/Z so a figure never walks off its square; the death clip
  keeps its motion so the fall reads properly. Locomotion clips are **in-place** cycles — board
  travel belongs to the container tween, so a clip carrying root translation would double it.
- The **Low** preset freezes the stance on its first frame (no per-frame mixer cost); strikes,
  deaths and footstep sounds still play, and the figure slides instead of marching.
- **Clips load in waves.** Over seventy GLBs fired at once made the browser drop requests
  (`TypeError: Failed to fetch`), which cost figures their strike — a capture then looked like a
  piece dying untouched. The rig plus its `idle` load first, then `PieceFactory.warmClips()`
  fetches `walk` → `run` → `attack` → `death` → `reload` → `aim` two downloads wide and binds
  each clip onto the figures already on the board (`PieceView.installClip`). **Strides go first**
  because the opening move is made seconds after the board stands up.
- **Every beat arms itself.** A capture calls `ensureClip` for the attacker's strike and the
  victim's death (waiting up to 2.4 s rather than skipping the beat), and `glide()` calls
  `armStride()` for the walk or run it is about to play (up to 0.6 s). Without the latter the
  first move of a game was staged before its stride had landed and the figure slid on its
  stance — which read as that rank having lost its walk animation.
- With no strike clip at all, `SceneEngine.lunge()` swings by hand (wind-up, twist, lean back,
  blow over the top); the tilt is held by `PieceView.setStrikeTilt()` so the mixer cannot wipe it.

### Marching and footsteps

`SceneEngine.glide()` runs one stride clock per move. `GAITS[kind]` declares steps per square,
cadence, boot timbre and loudness, so `steps = tiles × stepsPerTile` and the duration is
`steps / cadence` — a longer move takes **more steps**, not a faster slide.
`PieceView.startMarch(clip, stepRate)` retimes the walk cycle so one gait cycle is exactly two
footfalls at that rate — measuring that cycle with `gaitCycle()`, which autocorrelates a leg
bone's swing and caches the answer per clip. Assuming the whole clip was one cycle is what cost
the heavy ranks their march: `casual-walk-inplace` (king, queen, tower, battery) is 4.23 s of
three cycles, so the time scale asked for saturated its ceiling and the legs blurred at one fixed
rate whatever the move — the tower read as sliding with no animation. `strideEasing()` gives a
push-off, a cruise and a settle (a fully eased curve would leave the feet skating), every whole
step fires `audio.footstep()` plus a grit puff at the contact point, and the battery's hauled gun
pitches on its axle once per footfall (`rumbleTrain()`) instead of gliding along beside the crew. The four timbres (`scuff` / `leather` / `plate` / `regal`) are
synthesised in `src/audio/audioManager.ts` — body thump, band-passed sole transient, metallic
afterring — panned by screen position and pitch-jittered.

### Strike weight by rank

The hand-to-hand beat is one piece of choreography, but its weight comes from `STRIKES[kind]`
in `src/scene/sceneEngine.ts`. The pawn's line is the original beat and is unchanged; each rank
above it adds something: the knight a crescent of steel and a dust wake on the charge, the rook a
wave rolling across the stone with a low slam and a long aftershock, the king a column of light
dropped on the condemned, a bell, and a gold arc plus gold ground wave. Ranged captures follow
the same idea — `MAGE_SPELL` throws one bolt, `QUEEN_SPELL` gathers longer and throws a volley of
three that leaves fire burning on the square. Visuals live in `src/scene/strikes.ts`, and the
swing / slam / bell voices are synthesised in the mixer.

### Ranged captures

`RANGED_KINDS` routes the queen (`q`) and the mage (`b`) to `playSpellCinematic()`: both sides turn
to face each other, fire gathers at the staff crystal through the strike clip's wind-up, the bolt
flies to the target's chest and breaks open — and the victim **dies and is cleared away before the
caster takes a single step** onto the square.

The Grande Armée's ranks fight the same distance with powder instead (`playGunCinematic()`). That
beat is **aim → drill → trigger → shot**: the `aim` clip is held for `GUNS[kind].aim` seconds so the barrel is
seen coming up on the body, then the firing clip runs at its own length with the report on its own
frame (`GUNS[kind].drill = { seconds, impact }` — the marshal's is 1.7 s firing at 0.6, where the
swordsman default made the whole kneel-level-fire drill flash past in a third of a second). The
marshal's kneel lives in his `aim` clip, so the drop onto the knee is the first beat of the shot and
the strike grows out of the pose; his reload is served from the same knee and the stance brings him
back to his feet afterwards. Every barrel is framed the same way — a modest lens punch-in held over
the beat — since the rifle's sight-picture overlay and its extra zoom were removed.

**Each barrel fires its own round** (`SHOT_MODELS` for the sculpts, `src/scene/ammunition.ts` for the
procedural fallbacks, chosen by `GUNS[kind].ammo`). Every round is a real mesh normalised
nose-along-travel, one unit nose-to-base, so a shot only scales it by its gauge:

| Round | Barrel | Built from | In flight |
| --- | --- | --- | --- |
| `pistolBall` | king, commander | cast lead sphere, mould seam + sprue stub | tumbles, wanders ~0.9 calibres |
| `musketBall` | line infantry, cuirassier | the same ball, fatter and dented by the ramrod | tumbles, wanders ~1.6 calibres |
| `minieBullet` | marshal-tirailleur | lathed ogive, three grease grooves, hollow base skirt | spins about its nose, dead straight |
| `roundShot` | battery | pitted sand-cast iron ball with casting seam | glows out of the bore and cools; passes through |

Two materials serve the fallbacks: cast lead (`0xb4bac2`, `metalness 0.62`, `roughness 0.44`) and
sand-cast iron (`0x3b3936`) with an emissive animated per shot. Both stay *off* full mirror metal with
a floor of self-lit grey, and `legible()` applies the same treatment to every sculpt's own materials
on load — a near-mirror sphere a few pixels wide has nothing to reflect in a dark hall and renders as
a black dot. **No round is a tracer**: black powder never fired one.

**Why a shot is visible at all.** True to scale a ball is one pixel for one frame, so three dials are
deliberately cinematic while the physics stays honest: `AMMUNITION[kind].gauge` (1.7–2.6× the bore)
for how large the round is *drawn*; `GUNS[kind].speed` (0.082–0.125 s per tile, clamped to
0.17–0.58 s) for a flight the eye can follow; and a **nose blur** — `tracerTexture()` on a tapered
cone laid along the travel vector (not billboarded), lengthening with the round's actual pace and
opening from a stub over the first frames, now held to half its authored length (`NOSE_BLUR`). A small
glint sprite carries torchlight on the metal, and the round spawns clear of the bore rather than
inside its own muzzle flash. The orange glow, the borrowed light and the dragged-along wake still
belong to the iron alone.

**The path itself is drawn** (`src/scene/tracer.ts`). Everything above rides *with* the round, so none
of it said where the shot had been. `TracerStreak` sweeps a short 3D ribbon along the round's own
flown samples — real geometry, so it holds up from any camera angle, is occluded like an object, and
**bends where a smoothbore ball wandered**. Section is a three-bladed tube (12–26 rings by preset via
`trailRings()`), in two layers on one spine: a wide faint sheath of disturbed air and a thin bright
filament that only lights the calibres right behind the metal. Radius tapers on `u^0.55` and
brightness on `u^falloff`, so the tail pinches to a needle; the arc is held to `StreakLook.span`
(4.2–9 ball diameters ≈ one square, never muzzle-to-target, or it reads as a laser) by *sliding* the
oldest sample along its segment rather than dropping it, which is what keeps the tail from stuttering
backwards. On impact `releaseStreak()` fades it over 0.16 s under the debris instead of cutting it.

**The flash is sized off the round it launches.** `GUNS[kind].flare` is a *ratio* (4.4–6.0), not a
width: `muzzleFlare(gun) = ball × AMMUNITION[ammo].gauge × flare` drives the flash, the ember shower,
the reach of the borrowed light and the spawn offset alike, so a change to a round's gauge can never
leave its flash behind — which is exactly what had happened once the rounds became sculpts drawn
1.7–2.6× the bore and started out-shining the charge that fired them. Period flame is 4–8 bore
diameters, so the clean-burning rifle sits lowest (4.9) and the field gun highest (6.0).

`spawnMuzzleFlash()` stacks four layers, because one additive sprite is capped at opacity 1 and cannot
be made brighter: the billboarded **star** (`muzzleFlashTexture()` — thirteen petals, three long
primary jets, and a halo holding flat white out to a fifth of its radius, since the bloom pass only
grips what already clips); a small pure-white **core** stacked over it; a **jet** cone laid along the
aim (*not* billboarded, so the flame grows down the barrel and shows which way the round went); and
the warmer **lead bloom** a barrel's width out. All four are **held at full brightness for the first
fifth of the life** (`IGNITION`) before falling off on `(1-t)²·¹` with a flicker — powder ignites in one
frame, and a flash that starts decaying on frame one never registers at 60 fps.

All four are flown as *generated* sculpts (`SHOT_MODELS`, primed by `primeShotModel()`); each sculpt
is reported *directionless*, so its measured long axis is taken as the nose. A kind whose GLB has not
landed yet is forged procedurally instead, so gunfire never waits on a download.

Each barrel also fires a recorded take (`GUN_AUDIO_URLS` + `GUNS[kind].voice`) with a per-barrel
amount of synthesised voice left underneath it for weight (`SHOT_VOICES` — 34 % under the musket's
hard transient, 60 % under the flintlock's much more diffuse one), and the ball's arrival has its own
whine-into-thud (`audio.ballImpact()`). Anything not yet decoded falls back to the synth.

**Every take is aligned and levelled off the audio itself**, because a generated sound effect is a
clip rather than an event. `analyseTake()` finds each shot's true onset — from the loudest 4 ms window
walked *backwards* to the foot of the attack, since a threshold crossing just latches onto the room
tone — and playback starts there, so the report lands on the frame it is asked for. The first set of
barrels measured 54 ms of silence in front of the musket's crack and did not peak until 171 ms in on
the rifle: the shot was seen, then heard. Levels are normalised to a common peak as well, since
recordings came back across a 9× spread that swamped the authored mix.

**The trigger is its own sound.** `GUNS[kind].lock` is real lock time — the 38–120 ms a muzzle-loader
takes to get from the sear releasing to the charge in the barrel lighting. `audio.triggerPull()`
(sear break, flint on the frizzen, priming hiss) fires on the frame the trigger is pulled and
`audio.gunshot()` follows one lock time later, on the same frame as the muzzle flash. The marksman's
hand-fitted piece has the fastest ignition on the board; the field gun's vent has the slowest, with a
longer, lower fuse hiss in place of the flint scrape.

**The arrival breaks the body open** (`src/scene/shatter.ts`, `spawnImpactShatter()`). The far end of
a shot used to be the same warm sprite burst as a sword blow, which reads as magic rather than as
impact, so it is now built from geometry in two instanced draw calls:

- **A punch ring** square to the line of flight (not billboarded), snapped open and gone inside
  0.18 s — it exists only to say *where* the round went in.
- **Sparks** as stretched four-sided slivers oriented along their own velocity, so each one draws a
  streak that turns as it flies and its length tracks its speed. They leave in a cone thrown *back*
  at the shooter (spall comes off the struck face), cool white → orange → dull red on their own
  clocks via per-instance colour, gutter rather than fade, skitter off the flagstones, and a few
  always outlive the rest so the shower does not stop like a switch.
- **Fragments** — crushed tetrahedra with per-instance colour, tumbling on their own axes under
  gravity, bouncing off `BOARD_TOP` with material-specific restitution and tangential friction,
  coming to rest and then pulled under in the last quarter of their life.

What comes off is read off the **victim**, not the shooter: `impactBody()` maps army × rank onto
`marble` (kingdom stone), `obsidian` (Sun Empire glass — long flake slivers, jade fleck),
`uniform` (navy wool, buff leather, gilt braid, brass), `plate` (steel spall and the brightest spark
shower on the board, for the cuirassier and the guardians) or `flagstone` for the round shot's
ricochet. How hard it breaks comes from the round: `AMMUNITION[kind].shatter` (0.72 pistol → 2.5
round shot) and `.through`, which decides whether there is exit spall as well as entry. The dust the
caller layers over the top is tinted by `impactDust(body)`, and the instance count is capped by
`captureParticles`, so the whole thing scales down with the graphics preset.

**The powder bank is built as air, not as a sprite pop.** Each lobe of `spawnPowderCloud()` runs on
its own clock, integrated from its absolute age (closed form, so it looks identical at any frame
rate) through three phases: lobes are **born in sequence** across the vent (0.17 s smoothbore,
0.10 s rifle) with the first gas shoved hardest, that speed is then eaten by the air
(`jet/drag · (1 − e^−drag·age)` — a lunge of about a square, then a stall), and from there only
buoyancy (building as `age²`, so smoke sags off the barrel before it climbs), `HALL_DRAFT` and a
per-lobe `sin` curl move it. It dissolves because it **spreads**: opacity carries
`(seed/width)^1.35` on top of its fade, lifetimes vary per lobe, and `floor` flattens anything that
sags to `BOARD_TOP` instead of sinking through the stone. `GUNS[kind].smokeHang` states the linger
(1.7 s flintlock → 3.8 s field gun) and `boreTrickle()` keeps emitting wisps at the **live**
`muzzleOrigin()` afterwards, so the thread of smoke follows the barrel as the weapon comes down.

`GUNS[kind]` also carries the character of the *smoke* as well as the bore. The marksman's rifled
barrel fires a small, tight-patched charge that burns almost completely, so its bank is built from
`fineSmokeTexture()` — a pale, threadier bloom — tinted a fixed ash grey (`0xdfe4ea`) instead of
the faction livery, at 0.74 density. Less smoke than a musket is answered with **more, smaller
lobes** (12 against 8) that leave faster, stall sooner and lift harder — hanging 3.2 s with the bore
trickling 1.5 s after — rather than with a thicker cloud. Every other barrel keeps the dirty
livery-tinted bank.

**A held firearm has no rest angle.** Blades and staves are parented to a hand bone at a fixed
body-space angle, which is fine for a sabre worn point-up but leaves a rifle standing upright
through an aiming clip. Firearms declare `hold` in `weapons.ts` instead and are re-solved against
the live skeleton every frame (`AttachedArms.align()`, called right after the mixer):

- `"longArm"` (marksman's rifle, line musket) takes the barrel line straight from the pose — the
  vector from the trigger fist to the support fist. Whatever the clip does, the two hands agree on
  where the gun points, so a kneeling aim levels the barrel, a march carries it across the body and
  the muzzle marker follows. A clip whose fists are together, or whose support hand is *behind* the
  trigger hand, is ignored and the upright carry is kept.
- `"sidearm"` (the officer's flintlock) follows the forearm through the wrist, lifted toward the
  figure's front so an arm hanging at rest carries the pistol low rather than aiming at its own boot.

Roll is taken from the barrel pitched a quarter turn about the figure's lateral axis — the one rule
that holds at both ends of the swing (trigger guard forward when upright, floorward when levelled)
without flipping in between; projecting the body's front, as the blades do, collapses the moment a
gun points where the figure is looking. Carried guns are also exempt from the floor-clearance clamp
that slides grounded shafts up through the fist — that clamp is what had the crouching marksman
holding his rifle by the butt plate.

The fire's light comes from `SpellLightPool` (`src/scene/spells.ts`): three point lights created
once with the scene and lent out per bolt. A light per fireball crashed the tab — three.js keys
its shader programs on the scene's light counts, so the whole hall recompiled mid-fight. Pooled
lights are never removed *or hidden* (an invisible light leaves the render state, which changes
the count just as removing it would); they are dimmed to zero and handed back, and a fourth
simultaneous bolt simply gets no light.

## Swapping in different character models

The static fallback sculpts are the `still` roster of each army in `src/assets/generated.ts`:

```ts
export const ARMY_SKINS: Record<ArmySkinId, ArmySkin> = {
  ivory: {
    arsenal: "kingdom",
    native: "w",
    still: { k: "…king.glb", q: "…queen.glb", /* … */ },
    animated: { /* rigged GLB + one GLB per clip */ },
    cries: { /* one voice per rank */ },
  },
  /* sun, empire … */
};
```

Drop higher-quality glTF/GLB characters into `public/models/` and point the entries at
`/models/your-king.glb`. Requirements:

- Y-up, facing +Z (or edit `PIECE_MODEL_ORIENTATION` in the same file — the loader derives
  the correction quaternion from the declared front/up axes).
- Any scale: `PieceFactory.normalize()` measures the model and rescales it to the height in
  `PIECE_HEIGHT` (`src/scene/pieces.ts`), then centres it on X/Z and grounds it on Y.
- Materials are cloned per instance and tinted per faction in `applyFactionLook()`.

If a rigged model fails to download the loader falls back to the static sculpt, and if that
fails too, to a procedural primitive figure — the game always stays playable.

To animate your own characters, fill that army's `animated` roster with a rigged GLB plus a GLB
per clip; any missing clip is simply skipped, and a clip whose download failed is retried on
demand the next time the game needs it. A new army is one `ARMY_SKINS` entry plus a `LOADOUT`
row in `weapons.ts` — the settings panel renders `ARMY_SKIN_ORDER`, so it appears on its own.

For shipping, compress the GLBs instead of streaming them from a remote host:

```bash
bunx @gltf-transform/cli optimize king.glb public/models/king.glb \
  --compress draco --texture-compress webp --texture-size 1024
```

## Audio

Generated MP3s are streamed once and decoded into Web Audio buffers: an ambience bed, a
score bed and a tension stem that crossfades in during check and the endgame, plus piece,
clash, horn and fanfare one-shots. UI blips are synthesised with oscillators. Everything
routes through one master gain for the mute toggle, and playback only starts after the
first user gesture (browser autoplay policy).
