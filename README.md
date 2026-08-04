# King's Gambit — Medieval 3D Chess

A cinematic 3D chess game in the browser. Rival civilisations — a medieval European
**Ivory Kingdom**, a Mesoamerican **Sun Empire** and Napoleonic France's **Grande Armée** —
face each other as sculpted, rigged characters that march, strike, scream and burn away into
dust on a marble-and-basalt board. Either side can muster any of the three armies.

Built with **Vite + React 19 + TypeScript + three.js**, [chess.js](https://github.com/jhlywa/chess.js)
for the rules, and a **Web Worker** search engine for the computer opponent. No backend, no
account, no build-time asset pipeline — it is a static site.

```bash
cd web && bun install && bun run dev
```

---

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
- [Controls](#controls)
- [Interface](#interface)
- [Game modes](#game-modes)
- [Armies](#armies)
- [Battlegrounds](#battlegrounds)
- [Project structure](#project-structure)
- [Architecture](#architecture)
- [The computer opponent](#the-computer-opponent)
- [Graphics presets](#graphics-presets)
- [Character animation](#character-animation)
- [Swapping in your own models](#swapping-in-your-own-models)
- [Audio](#audio)
- [Scripts](#scripts)
- [Browser support](#browser-support)
- [Contributing](#contributing)
- [License](#license)

---

## Features

- **Full chess rules** — castling, en passant, promotion, check, checkmate, stalemate,
  threefold repetition, the fifty-move rule and insufficient material, all via chess.js.
- **Rigged 3D characters, not chess pieces** — eighteen sculpts (six per army), each with
  `idle`, `walk`, `attack` and `death` skeletal clips, plus weapons, shields and a floating
  rank crest.
- **Three army skins, chosen per side** — Ivory Kingdom, Sun Empire or the Grande Armée, each
  with its own six sculpts, clips, weapon family and voices. Swap either side at any time in
  **Settings → Armies**; the choice is remembered between visits.
- **Figures march, they do not slide** — a moved piece turns to face its destination, walks
  the distance on its own legs at the cadence of its rank, and squares up again on arrival.
  Knights keep the leap, running through the air and landing on both feet.
- **Synthesised footsteps on the stride clock** — every footfall is fired by the same clock
  that retimes the walk cycle, so sound, grit puff and foot all land together: scuffs for
  footsoldiers, leather for the clergy, plate for the tower guardians, a slow deliberate
  tread for the crown.
- **Cinematic captures** — the camera punches in, the attacker strikes on the hit frame,
  sparks fly, the screen shakes, and the defender **burns away from the soles upward**
  through a ragged edge of light, shedding motes that drift off (cold soul-light for the
  Kingdom, live embers for the Empire).
- **A blow that scales with rank** — the footsoldier stabs and moves on; the rider cuts on the
  charge and leaves an arc of steel hanging in the air; the tower guardian's hammer sends a
  wave rolling across the stone and the hall keeps shaking afterwards; the crown drops a
  **column of light on the condemned**, rings a bell over it, and executes it in gold. Each
  rank has its own lens punch, hitstop, swing weight and aftershock.
- **Casters kill at range** — the queen and the mage never close the distance. They level the
  staff from their own square, gather fire at the crystal, and throw it down the line: it
  lights the hall as it flies, breaks open on the body, and only once the corpse has burned
  away do they walk the whole distance and take the square. The mage throws **one** bolt; the
  sorceress throws a **volley of three** and leaves a ring of fire burning on the square (cold
  witchfire for the Kingdom, sunfire for the Empire).
- **Eighteen death cries** — one recorded voice per rank per army, panned to where the body is
  on screen, ducking the music for a beat and pitch-jittered so no two deaths sound alike. Each
  army dies in its own language of pain: the Ivory Kingdom roars and groans, the Sun Empire
  shrieks and hisses, and the Grande Armée — being shot rather than struck — has the air punched
  out of it first and the voice second.
- **Four battlegrounds** that relight the whole world — sky, haze, stone colour, tile
  contrast, fires, birds, siege engines and the film grade.
- **2D tactical view** — one key lifts the camera straight overhead and flattens every figure
  into a stamped counter, so nothing can hide a square. Selection and moving keep working.
- **Three engine strengths** running off the main thread, so the render loop never blocks.
- **Showcase / attract mode** — let two engines duel on their own with pace control, pause,
  auto-rematch, and a clean capture view with the entire interface hidden. Three camera
  behaviours: hold one angle, follow the figure on the move and close in on the fight, or
  drift slowly around the board. The showcase also renders crisper than a played game —
  no depth of field, softer grain, vignette and bloom.
- **An interface that stays off the board** — icon-only controls with a themed tooltip on every
  one of them (name, one-line explanation, key cap), the move record folded into a corner
  sigil, and a slim showcase rail that collapses to a single icon. One key strips the whole
  overlay for recording.
- **Auto-detected graphics presets** (Low → Ultra) with an automatic step-down if the
  measured frame rate stays low, plus WebGL context-loss recovery.
- **Chess clocks**, undo, resign, flip board, copyable PGN, captured tray with material score.

## Quick start

Requires **Node 20+**. [Bun](https://bun.sh) is recommended; npm/pnpm work too.

```bash
git clone <your-fork-url>
cd <repo>/web

bun install
bun run dev        # http://localhost:5173
bun run build      # production bundle in web/dist/
bun run preview    # serve the built bundle
```

The build output in `web/dist/` is a plain static site — drop it on GitHub Pages, Netlify,
Cloudflare Pages or any static host. No environment variables are required to run the game.

## Controls

| Action | Input |
| --- | --- |
| Orbit / zoom | Drag, mouse wheel (one-finger drag and pinch on touch) |
| Select a figure | Click it — legal squares glow green, captures red |
| Move | Click a highlighted square (click the figure again to deselect) |
| Promotion | Pick one of the four figures rotating on pedestals |
| Camera & battleground | Camera icon in the top bar — Ivory / Obsidian / Overhead / Cinematic, flip, tactical, and the four arenas |
| What a button does | Hover or focus it (tap it on touch) — every icon carries a tooltip |
| Skip the intro | Click anywhere during the opening sweep |
| Settings | Gear icon — armies, battleground, graphics preset, capture cinematics, board swing, sound |

There is no drag-and-drop: a press that travels more than 8px is read as a camera swing, so
orbiting from a figure never moves it. Selection and moves both resolve on release.

Keyboard shortcuts (ignored while typing in a field):

| Key | Action |
| --- | --- |
| `F` | Flip the camera to the other side |
| `T` | Toggle the 2D tactical view |
| `H` | Open / fold the chronicle (move record and spoils) |
| `C` | Toggle cinema mode (hide the entire interface) |
| `Space` | Pause / resume playback in showcase mode |
| `Esc` | Close the settings panel, camera menu, chronicle or an open tooltip |

## Interface

The board owns the screen; every panel is either short, in a corner, or foldable.

| Region | What lives there |
| --- | --- |
| Top left | Whose turn it is, the thinking pulse, the check banner, the showcase duel counter |
| Top right | Clocks, then the icon rail — take back, resign, new duel, sound, fullscreen, flip, tactical, camera menu, settings |
| Right, under the bar | Spoils: both captured trays and the material score (desktop only; it folds into the chronicle on narrow screens) |
| Bottom left | The chronicle sigil — a corner button with a move counter that unfurls the record on demand (`H`) |
| Bottom right | The showcase rail, only during a showcase duel |

- **Tooltips** (`src/ui/Tooltip.tsx`) replace the browser's native `title`, which appears too
  late to explain an icon. Each bubble carries the control's name, one sentence of
  explanation and a key cap when there is a shortcut. It opens after 110 ms, then **instantly**
  for the rest of a sweep along the rail, picks the screen edge that keeps it in view, flashes
  for 1.8 s on a touch press (touch has no hover), and closes on Escape, blur or scroll. The
  bubble is rendered inside its anchor rather than through a body portal, so it survives
  fullscreen.
- **The showcase rail** is a single 26px row of icons — play/pause, 0.5×–4× pace, the three
  camera behaviours, loop, restart — held at 74% opacity until hovered, and foldable down to
  one clapperboard icon. Pause is shown by a breathing play button instead of a large label.
- **Cinema mode** (`C`) removes the overlay completely and leaves one small restore button, so
  a screen capture is board-only.
- **Nothing here is raised by the engine.** The marksman's rifle shot used to close a full-screen
  sight picture over the whole interface; it was removed along with its extra lens punch-in, so a
  rifle kill is watched in the hall like every other one (see
  [Gunpowder combat](#gunpowder-combat-pistol-rifle-musket-and-field-gun)).

## Game modes

| Mode | What it is |
| --- | --- |
| **Player vs Computer** | Pick your colour, an engine strength and an optional clock |
| **Two players** | Hotseat on one screen; the camera swings round between turns (switchable) |
| **Showcase** | Two engines duel on their own — per-side strength, 0.5×–4× pace, auto-rematch, still / follow / orbit camera, foldable rail |
| **Attract** | Leave the menu alone for 30 seconds and a showcase duel starts behind it |

Clocks: none, 5, 10 or 15 minutes, drawn as draining hourglasses.

## Armies

Each side picks its army independently in **Settings → Armies** (near side / far side). An army
skin is a whole civilisation: six sculpts, their skeletal clips, a procedural weapon family and
a set of death cries.

| Id | Army | King → pawn | Arms |
| --- | --- | --- | --- |
| `ivory` | **Ivory Kingdom** | King, Queen, Mage, Knight, Guardian, Footman | Greatsword, crystal sceptre and staff, warhammer, spear, heater / tower / round shields |
| `sun` | **Sun Empire** | Emperor, Priestess, Serpent Priest, Jaguar Warrior, Temple Guardian, Eagle Warrior | Macuahuitl, sun sceptre, serpent staff, basalt maul, tepoztopilli, feathered chimalli |
| `empire` | **Grande Armée** | Napoléon, Imperial Commander, Marshal-Tirailleur, Cuirassier, Artillery Guard, Line Infantry | Officer's flintlock pistol and dress sabre, a second flintlock over the Marengo sword, rifled long arm with sights and sling, cavalry sabre, empty hands behind a towed field gun, musket with fixed bayonet |

The Grande Armée is navy and gold throughout — red facings, brass imperial eagles, white
breeches, bicornes, shakos and bearskins — with one silhouette per rank: Napoléon's sideways
bicorne and dress sabre, the commander's laurel crown over the Marengo sword, the marshal's plumed hat
and coat tails over the longest barrel on the board, the cuirassier's horsehair-crested helmet
over a steel breastplate, the artillery guard's bearskin behind the field gun he hauls, and the
infantry's musket. **This is the one army that fights with powder** (see [Gunpowder
combat](#gunpowder-combat-pistol-rifle-musket-and-field-gun)): Napoléon settles matters with the
flintlock in his fist, his commander does the same with the Marengo sword still in her left hand,
the marshal waits out the game on one knee and shoots from it with a rifle, the line infantry
fires a volley, and the battery lays and serves the gun it drags along. Only the cuirassier still
closes, sabre first — **nobody in this army casts anything**.

Swapping an army re-downloads its rosters, so the swap waits for any fight on screen to finish,
takes the old figures down and stands the new ones up (a second or two on a cold cache). Give
**both** sides the same army and the far side is re-tinted into dark livery, so the two forces
never become impossible to tell apart.

## Battlegrounds

Switchable at any time from the camera menu or Settings; each one is a complete relight.

| Id | Name | Look |
| --- | --- | --- |
| `jungle` | **Sun Temple** (default) | Rainforest clearing, jade canopy, drifting pollen, two gold-crowned step pyramids |
| `dawn` | **Dawn Court** | Golden morning light, pale sky, warm stone — highest legibility |
| `frost` | **Frostfall** | Overcast snowfield, cold flat light, hardest contrast on the sculpts |
| `dusk` | **Siege at Dusk** | The original torch-lit siege — moodiest, heaviest bloom |

## Project structure

```
.
├── rork.json               workspace manifest (one app: web/)
├── scripts/
│   └── rewrite-commit-messages.sh
└── web/
    ├── index.html
    ├── public/             icon, favicon, robots.txt (drop local .glb models here)
    └── src/
        ├── core/           chess state — never imports three.js
        │   ├── gameController.ts   owns chess.js, clocks, undo, AI turns, snapshots
        │   ├── types.ts            MoveEvent, GameSnapshot, LedgerMove, …
        │   └── emitter.ts          tiny typed event emitter
        ├── ai/
        │   ├── engine.worker.ts    negamax + alpha-beta + quiescence + iterative deepening
        │   └── aiClient.ts         main-thread handle, cancels stale searches
        ├── scene/          three.js only
        │   ├── sceneEngine.ts      renderer, camera, interaction, move animation, cinematics
        │   ├── environment.ts      hall, lighting, torches, particles, PMREM environment
        │   ├── arena.ts            the four battleground looks and their ordering
        │   ├── battlefield.ts      siege props, camps, fires, birds
        │   ├── jungle.ts           canopy, palms, vines, pollen for the Sun Temple
        │   ├── board.ts            tiles, base, engraved labels, highlight pool
        │   ├── pieces.ts           rigged GLB loading, clips, faction materials, mixers
        │   ├── weapons.ts          procedural arms, shields and staves per rank
        │   ├── rankBadges.ts       floating heraldic crests
        │   ├── effects.ts          particle bursts, flashes, dissolve, camera shake
        │   ├── strikes.ts          per-rank blow visuals (slash arc, ground wave, pillar)
        │   ├── spells.ts           fireball orbs, per-army fire, the shared light pool
        │   ├── gunfire.ts          muzzle flashes, rounds in flight, powder smoke banks
        │   ├── ammunition.ts       the four rounds: pistol/musket ball, Minié bullet, iron round shot
        │   ├── postfx.ts           EffectComposer pipeline (bloom, SSAO, DOF, grade, SMAA, clarity)
        │   ├── textures.ts         procedural marble, basalt, bronze, cloth
        │   ├── quality.ts          graphics presets + auto-detection
        │   └── tween.ts            promise-based tween engine
        ├── ui/             React + CSS overlay
        │   ├── GameShell.tsx       phases, settings, attract mode, keyboard shortcuts
        │   ├── MainMenu.tsx        mode / colour / strength / clock selection
        │   ├── Hud.tsx             top bar, spoils, chronicle sigil, showcase rail
        │   ├── Tooltip.tsx         themed tooltip for the icon-only controls
        │   ├── MoveLedger.tsx      the chronicle: move list, PGN, hover preview
        │   ├── SettingsPanel.tsx   armies, arena, graphics, cinematics, sound
        │   ├── Heraldry.tsx        crests, hourglasses, piece glyphs
        │   └── medieval.css        the whole overlay's look
        ├── audio/          Web Audio mixer with layered score stems
        ├── assets/         army skins: model / clip / voice URLs per civilisation
        └── components/ui/  shadcn/ui primitives
```

## Architecture

Rendering is fully decoupled from the rules: **the chess core emits events and the scene
subscribes to them.** Nothing in `src/core` imports three.js, so the game logic is testable
headlessly and the renderer is replaceable.

### Move flow

1. The player (or the worker) produces a move → `GameController.tryMove`.
2. chess.js validates it and the controller builds a `MoveEvent` — captures, the castling
   rook trip, the en passant square, promotion and check flags.
3. The controller **awaits the animator the scene registered**, so the engine never moves
   while a figure is still gliding.
4. React re-renders from the immutable `GameSnapshot` published after every change.

### State

There is exactly one source of truth (`GameController`). React reads it through the
`useGameSnapshot` hook, which subscribes to the emitter and returns the latest snapshot —
no global store, no prop drilling of game state into the scene.

## The computer opponent

| Difficulty | Search | Budget |
| --- | --- | --- |
| **Easy** — *Squire* | Random legal move, prefers captures, always takes a mate in one | instant |
| **Medium** — *Knight* | Depth 3 negamax + alpha-beta, material + piece-square tables | 0.7 s |
| **Hard** — *Warlord* | Depth 5 iterative deepening, MVV-LVA ordering, quiescence on captures | 3.2 s |

All searches run inside `engine.worker.ts`. `aiClient.ts` cancels a stale search whenever the
position changes, so undo and resign are instant.

## Graphics presets

| Preset | Post-processing | Shadow map | Particles |
| --- | --- | --- | --- |
| Low | none (direct render) | off | none |
| Medium | bloom, grade, SMAA | 1024 | light |
| High | + depth of field in cinematics | 2048 | full |
| Ultra | + SSAO | 4096 | dense |

The preset is auto-detected on first load from the GPU string, core count and device memory.
The engine steps down one level automatically if the measured frame rate stays under 40 FPS.
Pixel ratio is capped at 2 (1 on Low), and a lost WebGL context shows a reload prompt instead
of a black screen.

### Black-screen recovery

Some drivers — Mesa's software rasterisers above all, which is what a Linux box without working
hardware acceleration falls back to — draw an all-black scene under a perfectly fine interface.
Three independent causes have been seen: the post-processing composer returning an empty buffer,
the PMREM reflection probe sampling as `NaN` (which poisons every lit surface while emissive
sprites keep drawing), and the shadow maps.

The engine handles all three without being asked:

- **Probe self-test** (`scene/diagnostics.ts`) — at boot, a white sphere lit *only* by the freshly
  built probe is rendered into an 8×8 buffer and read back. Black means the probe is unusable, so
  it is dropped and an ambient skylight of the same colour takes over.
- **Frame watchdog** — the frame is sampled five times over the first eight seconds at five points
  (centre plus quadrants). All five have to come back black before anything is dropped, then each
  failed sample peels off one more layer: post-processing → reflection probe → safe rendering.
- **A notice explains what happened**, and once it falls all the way back to safe rendering the
  choice is remembered in `localStorage` so the next visit starts with a picture.

Manual controls in **Settings → Picture**:

| Control | Effect |
| --- | --- |
| Brightness | Tone-mapping exposure multiplier, 60–180% |
| Safe rendering | No composer, no reflection probe, no shadow maps, +20% exposure |

`?safe=1` in the URL forces safe rendering on from the first frame, and the driver string is
printed to the console (`[scene] gpu: …`) and shown under the graphics presets.

## Character animation

Every figure is a rigged (skinned) character with up to six skeletal clips, declared per rank
in its army's `animated` roster (`ARMY_SKINS` in `src/assets/generated.ts`):

| Clip | When it plays |
| --- | --- |
| `idle` | Looping combat stance, desynced per figure so the army does not breathe in lockstep. The Grande Armée's marshal **stands at the ready**, rifle lowered: he used to hold a kneeling stance for the entire game, which read as a man permanently stuck in cover, so the kneel moved into the one place it is worth something — his `aim` |
| `walk` | Looping in-place stride, retimed to the cadence of the move that is under way. The clip's own stride length is **measured** rather than assumed (`gaitCycle()`), because the generator hands back anything from one cycle (`spear-walk`, 1.13 s) to three (`casual-walk`, 4.23 s). It must still be a *walk*: a 0.5 s sprint cycle stretched across a single square reads as juddering on the spot, which is why the line infantry advances on the musket-across-the-body walk instead of the rifle charge that sits on the same rig |
| `run` | Looping in-place run — the knight charging through its leap (knights only) |
| `attack` | One-shot strike the moment a capture lands — sparks, shake and clash are timed to the hit frame. For the queen and the mage the same clip is the incantation, and its hit frame is the moment the fireball is released; for the Grande Armée's gunpowder ranks it is the **firing drill** (the marshal's is a drop onto one knee), played at its own readable length, and the hit frame is the shot |
| `death` | One-shot fall played by the captured figure before it dissolves into dust |
| `reload` | One-shot drill run after a shot — powder, ball, ramrod. Only the Grande Armée's four gunpowder ranks carry one; the marshal reloads still kneeling, the battery at the muzzle |
| `aim` | Looping **sight picture** held before a shot: the weapon comes up and stays on the body while the shooter settles. Napoléon (pistol levelled), the line infantry (musket into the shoulder, barrel tracking the man) and the marshal (**down onto one knee**, rifle up and scanning) carry one; only the battery has none — laying the gun already *is* its aim |

How it is wired (`src/scene/pieces.ts`):

- The **rigged** GLB is the visual — the plain GLB has no skeleton, so clips bound to it do
  nothing. Each animation GLB contributes one clip, renamed to `idle` / `walk` / `run` /
  `attack` / `death`.
- Every instance is cloned with `SkeletonUtils.clone` (never `Object3D.clone`) and gets its
  own `AnimationMixer`. One-shots use `LoopOnce` + `clampWhenFinished`, and the strike
  crossfades back to the stance on the mixer's `finished` event.
- Clip root motion is stripped on X/Z so a figure never walks off its square; the death clip
  keeps its motion so the fall reads properly. The locomotion clips are **in-place** cycles for
  the same reason — board travel is owned by the container tween, so a clip carrying root
  translation would double the distance.
- The **Low** preset freezes the stance on its first frame (no per-frame mixer cost) — strikes
  and deaths still play, and the figure slides instead of marching (footsteps still sound).
- **Clips load in waves, not in one burst.** Twelve rigs × five or six clips is over seventy GLBs;
  firing them at once made the browser drop requests (`TypeError: Failed to fetch`) and figures
  silently lost their strike, so a capture looked like a piece dying untouched. The rig plus its
  `idle` load first, then `PieceFactory.warmClips()` pulls
  `walk` → `run` → `attack` → `death` → `reload` → `aim` two downloads wide, and every clip that
  lands is bound onto the figures already on the board (`PieceView.installClip`). The **strides**
  are warmed before the strikes on purpose: the first thing any game does is move a piece.
- **No beat plays without its clip.** A capture calls `ensureClip` for the attacker's strike and
  the victim's death, so the fight waits (max 2.4 s) instead of skipping its animation — and
  `glide()` does the same for the stride it is about to march on through `armStride()` (max
  0.6 s). Without that second guard the opening move was staged while the walk clips were still
  in the air, and the figure crossed the square frozen in its stance: the exact symptom of "this
  rank has lost its walk animation".
- If a strike clip is genuinely unavailable, `SceneEngine.lunge()` performs the swing by hand —
  wind-up, twist, lean back, then the blow over the top. The tilt is held through
  `PieceView.setStrikeTilt()` and re-applied after the mixer, which otherwise owns the pose.

### Marching and footsteps

`SceneEngine.glide()` owns one stride clock per move (`src/scene/sceneEngine.ts`):

1. `GAITS[kind]` declares steps per square, cadence, boot timbre and loudness for the rank.
2. `steps = tiles × stepsPerTile`, and the move's duration is `steps / cadence` — a longer
   move takes **more steps**, not a faster slide.
3. `PieceView.startMarch(clip, stepRate)` retimes the walk cycle so one gait cycle equals two
   footfalls at exactly that rate, so the skeleton cannot drift out of the clock. The cycle
   length is **read out of the clip** by autocorrelating a leg bone's swing (`gaitCycle()`,
   cached per clip). Treating the whole clip as one cycle is what cost the heavy ranks their
   march: `casual-walk-inplace` — the king's, the queen's, the tower's and the battery's stride —
   is 4.23 s of *three* cycles, so the time scale asked for was 3-4× and saturated the ceiling.
   The legs then whirred at the same fixed blur regardless of the move, out of step with the
   footfall clock, and the tower in particular read as sliding with no animation at all.
4. `strideEasing()` gives the move a push-off, a constant-speed cruise and a settle. A fully
   eased curve would leave the feet skating at both ends against a fixed cadence.
5. Each whole step crossing fires `audio.footstep()` (panned by screen position, alternating
   feet, pitch-jittered) plus a small grit puff at the contact point.
6. The battery hauls a gun rather than carrying one, so while it marches its carriage pitches on
   the axle once per footfall and rocks wheel to wheel (`rumbleTrain()`, set back down level by
   `settleTrain()`). A field gun gliding beside a walking crew was the other half of the tower
   looking unanimated.

Footsteps are fully synthesised in `src/audio/audioManager.ts` — a low body thump for the
weight, a band-passed noise transient for the sole, and a metallic afterring for armour, one
voice per `FootstepTimbre` (`scuff` / `leather` / `plate` / `regal`). No asset, no latency.

### Strikes by rank

The hand-to-hand beat is one piece of choreography — charge, square up, strike, crumble — but
its weight is read out of `STRIKES[kind]` in `src/scene/sceneEngine.ts`, so the same code carries
a footsoldier's stab and a royal execution. The pawn's line is the original beat and is left
exactly as it was; everything above it is measured against it:

| Rank | What is added on top of the pawn's beat |
| --- | --- |
| Pawn (`p`) | The baseline: 5.5° lens punch, sparks, one camera kick |
| Knight (`n`) | Fastest charge, a crescent of steel through the body (`spawnSlash`), dust torn up along the line of the charge, a light aftershock |
| Bishop (`b`) | Safety net only — the mage fights at range |
| Rook (`r`) | Slowest wind-up, heaviest swing in the mix, a wave rolling out across the stone (`spawnGroundWave`) with a second echo, low-frequency slam, long aftershock |
| Queen (`q`) | Safety net only — the sorceress fights at range |
| King (`k`) | A column of light dropped on the condemned before the blow (`spawnPillar` + `judgementToll`), 11° lens punch, gold arc **and** gold ground wave, the longest hitstop and aftershock |

The supporting visuals live in `src/scene/strikes.ts` (`spawnSlash`, `spawnGroundWave`,
`spawnPillar`). Each one builds a throwaway object, animates it off the caller's tween clock and
disposes itself, so none of them needs a slot in the frame loop; the textures and geometry are
shared module singletons freed by `disposeStrikeAssets()`. The swing, the slam and the bell
(`bladeWhoosh`, `groundSlam`, `judgementToll`) are synthesised in the mixer alongside the
footsteps — no assets.

### Ranged combat (queen and mage)

`RANGED_KINDS` in `src/scene/sceneEngine.ts` routes captures by the queen (`q`) and the mage
(`b`) to `playSpellCinematic()` instead of the melee beat, in this order:

1. Caster and target turn to face each other; the caster does not move off its square.
2. `gatherSpell()` grows a `SpellOrb` (`src/scene/spells.ts`) at the weapon's casting point
   for the length of the strike clip's wind-up, pulling embers inward over a rising charge.
3. `throwFireball()` flies the orb to the target's chest on a flat arc, shedding embers and
   smoke; flight time scales with the distance actually crossed.
4. `spellBurst()` lands it — flash, fire shell, ember cloud, square impact and camera kick.
5. `slay()` then `banish()` run to completion, so the target is **dead and gone** before the
   caster takes a step, and only then does `glide()` march it onto the cleared square.

How much fire is thrown is a profile too — `MAGE_SPELL` versus `QUEEN_SPELL`. The mage holds a
small orb and throws a single bolt. The sorceress gathers roughly half again as long, holds a
much larger ball, and throws a **volley of three**: two smaller leaders that come in off the
shoulder and clap on the body first, then the killing bolt behind them, whose blast is 1.75× the
mage's and rolls a ring of fire out across the square.

The casting point is a marker parented at the head of the main weapon (`focus` in
`src/scene/weapons.ts`), read out of the live pose each frame, so the fire hangs off the
crystal wherever the casting arm swings it. `SPELL_LOOK` gives each army its own fire. The three
spell voices (charge, cast, impact) are synthesised alongside the footsteps — no assets.

**The fire's light comes from a fixed pool.** `SpellLightPool` (`src/scene/spells.ts`) creates
three point lights once with the scene and lends them out per bolt. A light created per fireball
crashed the tab: three.js keys its shader programs on the scene's light counts, so every material
in the hall recompiled mid-fight. Pooled lights are never removed *or hidden* — an invisible
light is dropped from the render state, which changes the count exactly as removing it would —
they are only dimmed to zero and handed back. A fourth simultaneous bolt simply gets no light
instead of a recompile, and the pool is empty on presets without post-processing.

The capture dissolve is a shader injection: a noise field eats the body from the soles up with
a glowing burn edge, while the whole mesh fades and sheds upward-drifting motes.

### Gunpowder combat (pistol, rifle, musket and field gun)

The Grande Armée does not fight with witchfire. `attackStyle(kind, arsenal)` in
`src/scene/sceneEngine.ts` routes captures by **every rank except the cuirassier** to
`playGunCinematic()` — the witchfire beat is unreachable under this arsenal, and the cuirassier
still closes with the sabre. The beat is:

1. Both figures turn to face each other; the shooter never leaves its square. A lock, a ramrod
   or a linstock is heard (`audio.gunLock`) as the barrel comes round — that is the hammer being
   *cocked*, a beat before the trigger is anywhere near it.
2. **Taking aim.** `PieceView.playAim()` loops the sight picture for `GUNS[kind].aim` seconds
   (0.3–0.62 s): the weapon is brought up and *held* on the body. For the marshal this is also the
   drop onto one knee — his hold is the longest on the board so the knee actually reaches the stone
   before the drill starts. A rank with no aim clip leans into the shot by hand instead, so a gunner
   is always visibly aiming before anything is fired.
3. **The drill.** The strike clip is then played at its own readable length —
   `GUNS[kind].drill = { seconds, impact }` — and the shot leaves on the frame the hammer falls
   (`impact`, 0.5–0.64 of the clip) rather than at the swordsman's default 0.42. This matters: at
   the default *length* the marshal's kneel-level-fire drill was over in a third of a second and
   the shot read as a flash appearing out of a stance. His is still the longest beat on the board
   (1.7 s, firing at 0.6) — it was 2.1 s only because it had a full-screen sight picture to fill.
   Because the muzzle marker is read out of the live pose, the kneeling shot leaves the barrel at
   the height the knee put it, not at standing height.
4. **The trigger breaks**, `GUNS[kind].lock` seconds before the charge lights. `audio.triggerPull()`
   plays the sear letting go, the flint raking down the frizzen and the priming charge catching — the
   mechanical half of a shot (see *Lock time*).
5. One lock time later the gun answers: `spawnMuzzleFlash()` detonates the charge at the barrel
   mouth (see *The flash at the bore*), `spawnPowderCloud()` leaves a bank of smoke hanging in front
   of the gun — soot for a smoothbore, pale ash grey for the rifle (see *The powder bank*) —
   `boreTrickle()` keeps the barrel smoking in the man's hands afterwards, and `audio.gunshot()`
   fires the report on the same frame as the flash.
6. `flyShot()` sends the round **flat and fast** — no arc, no easing; the flatness is what
   separates a gun from a lobbed spell — trailing wisps of smoke as it goes. A ball out of a
   *smoothbore* bellies off the line of sight and comes back onto the body (see below); the rifled
   round is the only one that flies a true line.
7. The hit lands: the ball's own arrival first (`audio.ballImpact()` — a ricochet whine cut short
   by a thud into the body), then flash, sparks, tile strike, camera kick, and for the field gun a
   wave rolling out across the stone plus a long aftershock. The body **breaks open** where the round
   went in — a punch ring square to the flight line, a cone of spall thrown back at the shooter and a
   field of tumbling chips made of the victim's own material (see *The moment the round arrives*).
   **Solid shot does not stop in the man**: a second short flight carries the iron a tile and a half
   past him and skips it off the stone, throwing stone chips and a ricochet spark shower.
8. `slay()` runs, then `banish()` and the **reload drill run together**, so the body is gone and
   the barrel is charged again before `glide()` walks the shooter onto the cleared square.

### The ammunition

**Every barrel fires its own round, and each one is a generated sculpt** — `SHOT_MODELS` names one
GLB per round, `src/scene/ammunition.ts` is the fallback foundry, and `GUNS[kind].ammo` says what is
rammed down which barrel. Nothing here is a glowing dot: black powder never fired a tracer, so a
round is read by its *shape*, its *metal* and its *motion*, and only the iron is allowed to glow.

| Round | Barrel | How it is made | How it flies |
| --- | --- | --- | --- |
| **`pistolBall`** | the Emperor, the commander | Cast lead sphere off a two-part mould: raised seam where the halves met, the nipped stub of the sprue, and a surface that is not quite round | Tumbles on the axis it left with; wanders ~0.9 calibres off the line |
| **`musketBall`** | line infantry, cuirassier | The same ball at .69 and visibly softer — twice the mould deformation, because soft lead rammed down a fouled barrel takes a beating | Tumbles; **wanders ~1.6 calibres** — the fattest, least accurate round on the board |
| **`minieBullet`** | the marshal-tirailleur | A lathed profile turned to the real drawing: long ogive nose, bearing body cut by **three grease grooves** (they carried the tallow that kept the fouling soft), and the **hollow base** whose skirt the charge blew out into the rifling | Spins hard about its own nose and stays pointing where it was sent. **Zero wander** — the only true line in the army |
| **`roundShot`** | the battery | Sand-cast iron: an icosphere **pitted** by a stable hash so one vertex in six is a real cavity, with the casting seam still round its middle | Turns slowly, glows out of the bore and **cools across the hall**, drags a bank of air behind it, and carries clean through the body |

Two metals serve the procedural fallbacks, cached and shared: unpolished **lead** (`0xb4bac2`,
`metalness 0.62`, `roughness 0.44`) and **sand-cast iron** (`0x3b3936`, `roughness 0.72`) whose
emissive is animated per shot. Both are deliberately kept *off* full mirror metal and given a floor
of self-lit grey, and `legible()` does the same to every generated sculpt's own materials on load.
The reason is blunt: a near-mirror sphere a few pixels across has nothing to reflect in a torch-lit
hall, so it renders as a black dot and the shot looks like it never happened. A heated round gets
its own material clones (`ownMetal()` for sculpts), so its glow can cool without touching another
shot still in the air.

### Making a shot visible

A true .69 ball is a fiftieth of a man's height and crosses eight squares in about a hundredth of a
second. Rendered honestly it is one pixel for one frame — which is exactly why the gunfire read as
"flash, then a corpse". Three dials fix that, and only these three are allowed to lie:

- **Gauge** (`AMMUNITION[kind].gauge`, 1.7–2.6×) — the round is *drawn* at a legible multiple of the
  bore while its flight path, wander and spin stay on the real numbers. The cannonball needs the
  least help; the Minié bullet the most.
- **Film speed** (`GUNS[kind].speed`, 0.082–0.125 s per tile, clamped to 0.17–0.58 s of flight) —
  slow enough to pick the round up as it clears the bore and follow it into the body. The order
  between barrels stays true: rifled fastest, field gun slowest.
- **Nose blur** (`tracerTexture()` on a tapered cone, `AMMUNITION[kind].streak × NOSE_BLUR`) — a cone
  of blurred metal on the nose of the round, laid along the *travel vector* rather than billboarded,
  lengthening with the round's actual pace (`haste`) and opening from a stub over the first frames,
  because a shot has no blur before it has moved. It rides *with* the round, so it says how fast the
  metal is going and nothing about where it has been — which is why it is now held to half its
  authored length and the path is drawn separately.

On top of that a small **glint** sprite carries caught torchlight so the metal registers against the
dark far wall, and the round now spawns *clear of the bore* (`min(0.42, muzzleFlare(gun) * 0.44)` down
the line of fire) instead of inside its own muzzle flash and powder bank. The orange glow sprite, the
borrowed point light and the dragged-along wake still belong to the iron alone.

### The streak along the flight path

Everything above is pinned to the round, so all of it *travelled with the metal* and none of it said
where the shot had been: you noticed the ball arriving and never saw it cross. `src/scene/tracer.ts`
is the missing half — a short 3D ribbon swept along the path the round **actually flew**, from just
clear of the bore to the body, rebuilt from its own flown samples every frame.

It is geometry, not a billboard, and that buys three things a sprite cannot:

- it **holds its shape from any camera angle** and is occluded by figures and pillars like a real
  object, instead of flipping or swimming as the shot crosses the view axis;
- it **bends where the ball bent**. A smoothbore ball bellies off the line of sight on its `sin(πt)`
  wander and comes back onto the body — that curve used to be hidden inside a straight cone and is
  now the most legible thing about a musket shot;
- it stays **short on purpose** (`StreakLook.span`, 4.2–9 rendered ball diameters ≈ one square). A
  streak reaching all the way from muzzle to victim reads as a laser, which is the one thing black
  powder never was.

The section is a **three-bladed tube** rather than a camera-facing quad: no camera to consult, no
flip, and cheap enough (12–26 rings by preset, `trailRings(captureParticles)`) to run several shots
at once. Two layers are swept along the same spine — a wide faint **sheath** of disturbed air
(`falloff 1.6`) and a thin bright **filament** at 0.42× the width that only lights the few calibres
immediately behind the metal (`falloff 4.2`). One layer alone reads as fog or as a wire; together
they read as speed. Ring radius tapers on `u^0.55` and brightness on `u^falloff`, so the tail
pinches to a needle and dissolves instead of ending on a cut edge.

Two details keep it from looking like a mesh being animated. The ring frame is **carried forward**
from sample to sample (the normal is re-projected square to each new tangent) rather than rebuilt
from a world axis, which is what stops the tube visibly twisting wherever the path turns. And the
tail is trimmed by **sliding the oldest sample along its segment** to keep the arc length exact,
never by dropping samples — popping one makes the tail stutter backwards once per step, sliding it
means the tail dissolves at the same speed the round is travelling. Buffers are allocated once at
full size and drawn through `setDrawRange`, so a streak that has not yet grown to length never
trails stale triangles.

When the round lands, `releaseStreak()` hands the ribbon to a 0.16 s fade of its own
(`(1-t)^1.7`) instead of deleting it on the frame of impact: it dies under the debris and the flash
as the afterimage of something that was moving very fast. Per round —

| Round | Span | Width | Reads as |
| --- | --- | --- | --- |
| **`pistolBall`** | 5 diameters | 0.60 | barely half a square of thin cold air |
| **`musketBall`** | 5.6 | 0.74 | fat, grey, and visibly *curved* |
| **`minieBullet`** | 9 | 0.48 | the longest, thinnest streak in the army — and the only straight one |
| **`roundShot`** | 4.2 | 1.00 | short, wide, hot: scorched air dragged behind glowing iron |

### The flash at the bore

The flame has to be **sized off the round it launches**, which is why `GUNS[kind].flare` is a *ratio*
(4.4–6.0) rather than a width in world units. `muzzleFlare(gun) = ball × AMMUNITION[ammo].gauge ×
flare` is the single source of truth for everything at the muzzle: the flash, the ember shower, the
reach of the borrowed point light, and how far clear of the bore the ball is spawned. When the flash
was authored independently of the ammunition the two drifted apart the moment the rounds became
sculpts drawn 1.7–2.6× the bore — the projectile ended up brighter and wider than the charge that
sent it, which reads as a ball being dropped rather than fired. Tying both to one number means a
change to a round's gauge can never leave its flash behind. Period flame is roughly 4–8 bore
diameters, so the clean-burning rifle sits at the bottom of the range (4.9) and the field gun at the
top (6.0).

The flash is four layers deep, because a single additive sprite is capped at opacity 1 and simply
cannot be made brighter:

1. **The star** — `muzzleFlashTexture()`, billboarded: thirteen ragged petals reaching to the sprite
   edge plus three long primary jets, over a halo that holds **flat white out to a fifth of its
   radius**. That plateau is the point: the bloom pass only takes hold of what already clips at 1, so
   a flash built as a polite gradient blooms on a handful of pixels and reads as a dull spark.
2. **The core** — a small disc of pure white stacked additively over the star's own blown-out centre.
   Additive layering is the only way past opacity 1. It is the last thing to widen and the first to
   die, which is what makes frame one read as a detonation.
3. **The jet** — the smear cone, *not* billboarded, its bright wide end on the bore and its tip
   running out along the aim. The flash therefore grows *along the barrel* instead of only swelling as
   a disc, and it tells the eye which way the round just went.
4. **The lead bloom** — a second, warmer puff a barrel's width down the line of fire.

The envelope carries as much as the size. Powder ignites in one frame, so the whole stack is **held at
full brightness for the first fifth of its life** (`IGNITION`) and only then falls away on a `(1-t)²·¹`
curve — a flash that starts decaying on frame one never registers at 60 fps. The dying beat carries a
flicker (`0.82 + 0.18·|sin|`) because a charge guts out unevenly rather than dimming on a dial, and
the borrowed light burns at `fade × 38 × flame` over a distance that grows with the charge.

The wander is not decoration. A ball rattling down an unrifled barrel leaves it turning, and a
turning sphere curves — which is exactly why a musket could not be trusted at a hundred paces.
`flyShot()` bellies the ball out along a tilted cross-axis on a `sin(πt)` curve, so it peaks
mid-flight and closes back onto the body: visibly not a straight line, still a hit.

All four rounds are flown as **generated sculpts** (`SHOT_MODELS`, each primed by
`primeShotModel()` behind the game). The generator reports every one of them as *directionless* (a
body of revolution has no intrinsic front), so the loader takes each sculpt's **measured long axis**
as the nose instead of guessing a yaw constant, normalises it to one unit nose-to-base and centres
it. Until a GLB lands, that kind is turned procedurally to the same contract: **nose along +Z,
centred, one unit long**, so a shot only ever scales it by its gauge — and the first shot of a game
is never a blank.

### The moment the round arrives

A shot that ends in a warm sprite puff is a spell, not a kill. `src/scene/shatter.ts` replaces that
beat with something that visibly **breaks**, and it is deliberately geometry rather than billboards —
the whole point of the moment is that the body came apart. Four things fire on the same frame, in the
order the eye reads them, and all of it runs inside **two instanced draw calls** on the tween clock:

1. **The punch ring** — a disc of light square to the line of flight (oriented, not billboarded),
   snapped open on the surface it struck and gone within 0.18 s. The only non-physical part; it
   exists to say *where* on the body the round went in.
2. **Sparks** — real stretched geometry, not dots. Each spark is a four-sided sliver pointed along
   its **own velocity**, so it draws a streak that turns as it flies and whose length tracks its
   speed: a long line while it is quick, a dot once it is spent. They leave in a cone thrown *back*
   at the shooter, because spall comes off the struck face; they cool white → orange → dull red on
   their own clocks through per-instance colour; they **gutter** rather than fade; they skitter off
   the flagstones with their run intact and their lift gone; and roughly one in six is given a much
   longer life so the shower never stops like a switch.
3. **Fragments** — chips of whatever the victim is made of: crushed tetrahedra with per-instance
   colour and value scatter, tumbling on their own axes under gravity, bouncing off `BOARD_TOP` with
   material-specific restitution plus tangential friction and a knocked-down tumble, coming to rest
   lying on the stone, then pulled under over the last quarter of their life so the board is never
   left littered.
4. **Dust** — the haze the caller layers on top, tinted by `impactDust(body)` so it is the colour of
   what just broke instead of the colour of the shooter's powder.

**The debris is made of the victim, not of the shot.** `impactBody()` maps army × rank onto a recipe,
because a ball into an obsidian idol cannot spray the same grit as a ball into a wool coat:

| Body | Who | What comes off |
| --- | --- | --- |
| `marble` | Ivory Kingdom ranks | Pale chips and bright dust, moderate sparks |
| `obsidian` | Sun Empire ranks | The most fragments and the widest spread — glass *flakes*, so long razor slivers (3.4× sliver), near-black with a jade fleck and a jade-green spark cool-down |
| `plate` | cuirassier + guardians of any army | Steel spall, few chips, **the brightest spark shower on the board** (30 at power 1, 10.5 m/s), almost no dust |
| `uniform` | Grande Armée coats | Navy wool, buff leather, gilt lace and shako brass; slow, absorbing, lands where it falls (0.16 restitution), barely any sparks |
| `flagstone` | the floor of the hall | Stone chips and a long ricochet shower that skitters away across the tiles |

**How hard it breaks comes from the round**, not from the rank: `AMMUNITION[kind].shatter` scales
count, speed and size together — `0.72` for a pistol ball, `1` for the musket ball, `1.24` for the
Minié (lighter, but arriving far faster and still spinning), `2.5` for six pounds of iron. And
`.through` decides whether there is exit spall as well as entry: soft lead at black-powder velocity
flattens and stops, while the spun conical bullet and the solid shot both come out the other side and
throw a second, wider, slower cone the way they were already going. The round shot's skip off the
stone a tile and a half beyond the body gets its own `flagstone` shatter aimed down into the floor.

Instance counts are capped off `captureParticles`, so the whole effect scales with the graphics
preset, and the hole throws a borrowed point light for a fifth of a second on `postFx` presets only.

**Black powder is recorded, not only synthesised.** `GUN_AUDIO_URLS` holds one take per barrel
(pistol, musket, rifle, cannon) plus the ball's impact; they stream in behind the music like the
death cries, and `GUNS[kind].voice` says which one a rank fires. Nothing is ever silent: the full
synthesised voice plays alone until the take has decoded.

Two things about a generated take cannot be taken on trust, and `analyseTake()` measures both off
the audio at decode time rather than believing the file:

- **Where the shot actually starts.** A generated sound effect is a *clip*, not an event: it opens
  with whatever room tone the model felt like. The first set of barrels was measured at **54 ms of
  silence in front of the Charleville's crack**, and the rifled barrel did not reach its peak until
  **171 ms in**. Played from sample zero on the frame the hammer fell, the report therefore landed
  three to ten frames *after* the muzzle flash — the shot was seen, then heard. Playback now starts
  at the take's own onset, so the transient lands on the requested instant. The onset is found from
  the **loudest** 4 ms window and then walked *backwards* to the foot of the attack; a plain
  threshold crossing is useless here, because it latches onto the room tone and calls a clip whose
  crack is 170 ms deep “aligned at 0 ms”.
- **How loud it happens to be.** Recording levels came back anywhere between 0.18 and 1.55
  full-scale — a 9× spread that swamped the authored per-barrel mix entirely. Every take is now
  normalised to a common peak (clamped, so a hissy one is never boosted into noise), which is what
  makes `volume` mean the same thing whichever barrel is talking.

How much synthesised voice stays underneath is then authored **per barrel** in `SHOT_VOICES`, not
derived from the calibre — “how good is this recording” is not something a bore diameter can
express. The musket's take has the hardest transient of the four and keeps only 34 % of the synth
beneath it; the flintlock's recording is mostly hall, so it keeps 60 % or the shot has no edge on
the frame it happens. A recorded cannon brings its own wall echo, so the synthesised one steps
aside. Per-shot detune is deliberately kept to a couple of per cent: a larger rate change would
drag the transient off the frame the trigger broke on, which is the one thing this must not do.

#### Lock time

A muzzle-loader is **two** sounds, not one. The sear releases, the flint rakes the frizzen, the pan
flashes — and only then does the main charge in the barrel light, 40–70 ms later on a flintlock and
longer on a gun touched off at the vent with a portfire. That gap is lock time, and it is the whole
reason a real shot sounds like a chain of events rather than a single bang.

`GUNS[kind].lock` states it per barrel and the engine plays the two halves apart: `audio.triggerPull()`
— the sear breaking, the flint scrape, then a thin hiss of priming powder running right up to the
report — fires on the frame the trigger is pulled, and `audio.gunshot()` follows one lock time behind
it, on the same frame as the muzzle flash. The marksman's hand-fitted piece is the fastest ignition
on the board (38 ms — a slow lock throws the shot off at the range he is expected to hit at), the
service musket is coarse-primed and slower (58 ms), and the field gun's vent is by far the longest
wait between the order and the boom (120 ms), with a lower, longer fuse hiss instead of a flint
scrape. Without this the report is the only thing the ear ever gets, and the moment the finger moved
is inaudible.

`GUNS[kind]` holds the bore. The Emperor's flintlock is deliberately the quietest kill on the
board — a dry crack, a puff of smoke, no spectacle. The marshal's rifle is the longest held
breath (0.62 s of aim — dropping into the kneel *is* his aim — before a 1.7 s drill) and the
flattest, fastest ball, with less flame than the line's musket: a marksman is one clean crack,
not a volley. The musket is a hard crack over a chest thump and a real bank of white smoke. The
field gun is the loudest thing in the hall, louder than the crown's judgement: a sub-bass slam
with the report coming back off the far wall.

### The powder bank

Smoke is the slowest thing a gun makes. The flash is three frames and the ball is half a second,
but the cloud is still drifting over the square long after both — so `spawnPowderCloud()` is built
as air rather than as a sprite pop. It used to be a handful of billboards that appeared on one
frame, slid outward in a straight line at constant speed and dimmed together, which read as a
single puff switching on and off. A charge actually does three distinct things, and each lobe of
the bank now carries all three on **its own clock**, integrated from its absolute age (a closed
form, so the smoke is identical at any frame rate):

1. **The vent.** Gas leaves the bore over about a tenth of a second, not at once, so the lobes are
   *born in sequence* across `vent` (0.17 s for a smoothbore, 0.10 s for the rifle's tight-patched
   charge) and the earliest gas gets the hardest shove (`push = 1 − order·0.62`). The bank visibly
   grows *out of* the barrel instead of appearing around it, and the cool late gas is left curling
   at the muzzle.
2. **The stall.** That ejection speed is eaten by the air almost immediately — each lobe travels
   `jet/drag · (1 − e^−drag·age)`, i.e. it lunges perhaps a square forward and stops. From there it
   is only buoyancy (which *builds* as `age²`, because powder smoke sags off the barrel before it
   climbs), the hall's own draft, and its own turbulent curl: a per-lobe `sin` swirl so the smoke
   rolls over itself rather than sliding rigidly, with angular drag on the sprite rotation.
3. **The dissolve.** Mass is conserved while volume is not, so opacity carries
   `(seed/width)^1.35` on top of its fade: smoke gets faint **because it is spreading**. Each lobe
   swells on `age^0.55` (fast while the gas is hot, easing off after) and holds its own lifetime,
   with roughly one in six given a longer one — the bank thins into a haze you can read the board
   through and never ends on a single frame.

Two shared touches keep it in the room: `HALL_DRAFT` (a couple of centimetres a second, the same
for both armies) is what finally carries the bank *off* the square rather than letting it dim where
it was made, and `floor` flattens anything that sags to `BOARD_TOP` instead of letting it sink
through the stone. `GUNS[kind].smokeHang` states the linger per barrel — 1.7 s for the Emperor's
flintlock up to 3.8 s for the field gun — and every one of them outlives its own shot.

**The barrel goes on smoking after the crack.** The bank is made once, where the gun was fired, and
left in the air — air does not follow a man around. But a fouled bore keeps venting for a second or
two, and *that* smoke belongs to the weapon, so `boreTrickle()` emits `GUNS[kind].boreSmoke.wisps`
threads on a clock, each one reading `PieceView.muzzleOrigin()` at the moment it is made. The
thread visibly trails the muzzle as the marksman brings his rifle down out of the kneel, and each
wisp is thinner, slower and longer-lived than the last, because the bore is cooling.

**The rifle's smoke is its own.** `GUNS[kind]` carries the character of the powder as well as the
bore (`smokeTint`, `smokeDensity`, `fineSmoke`), because a rifled barrel firing a small,
tight-patched charge burns it almost completely. The marksman's bank uses `fineSmokeTexture()`
instead of the musket's soot blob — a high-key, low-alpha, threadier bloom — tinted a fixed pale
ash grey (`0xdfe4ea`) rather than the faction livery, at **0.74 density**: sheer enough to keep
seeing the target through it. The answer to a rifle making less smoke than a musket was never to
make it *thicker*: there are **more lobes** (12 against the musket's 8), each smaller, faster off
the bore, quicker to stall, lifting harder and expanding further — and it **hangs 3.2 s** with the
bore trickling for 1.5 s after, so the shot can be watched coming apart. The wisps the ball trails
on its way over carry the same pale tint, shorter life and more rise. Every other barrel keeps the
dirty livery-tinted soot (the field gun at 1.15 density and 14 lobes, the Emperor's flintlock at
0.85 — a puff, no spectacle).

The piece is not nudged by its own charge, it is **thrown** (`gunRecoil()` →
`PieceView.setTrainRecoil(back, lift)`): the wheels leave the stone and the muzzle jumps in under
a tenth of a second, the carriage comes down while it is still running back, rolls a little
further, and only then is heaved up to the mark again over most of a second. Dust and grit are
hammered out from under the wheels on the frame it fires, the trail is heard slamming back just
behind the report with the wheels landing after it, and the hall takes the shock of the recoil a
beat *after* the shot rather than with it. Every voice is synthesised by `calibre` in one mixer
method — no assets, so a volley never waits on a download.

**The marksman is watched, not looked through.** The rifle shot used to be staged from behind a
full-screen sight picture (`SceneCallbacks.onScope` → `ScopeOverlay.tsx`, `.mc-scope`): a dark tube
around the body, a brass two-wire reticle tracking it, a per-shot hand tremor rolled from range, a
recoil that threw the picture off the mark — all of it sitting on top of the hardest lens punch-in
on the board (8.5°). All of it is gone, callbacks and CSS included, and his framing is now the
line infantry's (5.5°).

The reason is that the two effects were competing for the same moment. The overlay took the kill
*out* of the hall — you stopped watching a man on a battlefield and started watching an interface
— and the drill had to be stretched to 2.1 s to give the tube something to fill. What reads as a
marksman is far simpler: **he drops onto one knee to take the shot, and only then.** That kneel used
to be his permanent stance (a figure crouched behind cover for an entire game, which is why nothing
about the shot looked like an act of aiming); it now lives in his `aim` clip, so the sequence is
stand → kneel → level → fire → reload on the knee → back on his feet, all of it in world space where
the rest of the hall is.

**The gun goes where the arms go.** A prop parented to a hand bone at a fixed body-space angle
suits a sabre worn point-up, but it leaves a rifle standing straight up through an aiming clip.
Firearms therefore declare `hold` in `src/scene/weapons.ts` and their angle is re-solved against
the live skeleton every frame (`AttachedArms.align()`, called right after the mixer): a `longArm`
takes its barrel line from the vector between the trigger fist and the support fist, so the pose
itself levels the rifle when the marksman kneels to aim and carries it across the body on the
march; a `sidearm` follows the forearm through the wrist, lifted toward the figure's front so a
hanging arm carries the pistol low instead of aiming at its own boot. Roll comes from the barrel
pitched a quarter turn about the lateral axis — trigger guard forward when upright, floorward when
levelled, no flip in between. Carried guns are exempt from the floor-clearance clamp that keeps
grounded shafts out of the board, which is what had the crouching marksman gripping his rifle by
the butt plate.

The shot leaves the gun itself: `muzzle` markers in `src/scene/weapons.ts` are parented at each
barrel mouth (pistol, musket, gun bore) and read out of the live pose each frame, exactly like a
caster's `focus`. The **field gun is a towed prop**, not a held one: it hangs off the sculpt root
in body axes with its own wheels, carriage, trail and imperial eagle, so it travels and turns
with the guard but is untouched by the skeleton — a gun carriage must not crouch when its crew
does. Flash lights are borrowed from the same fixed `SpellLightPool`.

## Swapping in your own models

Every army is one entry in `ARMY_SKINS` (`src/assets/generated.ts`) — label, blurb, rank names,
weapon family, sculpt URLs, clip URLs and voices:

```ts
export const ARMY_SKINS: Record<ArmySkinId, ArmySkin> = {
  ivory: {
    label: "Ivory Kingdom",
    arsenal: "kingdom",   // weapon family in src/scene/weapons.ts
    native: "w",          // the side it was painted for
    still: { k: "…king.glb", q: "…queen.glb", /* … */ },
    animated: { /* rigged GLB + one GLB per clip, per rank */ },
    cries: { /* one voice per rank */ },
  },
  /* sun, empire … */
};
```

A fourth army is that one entry plus a `LOADOUT` row in `src/scene/weapons.ts`; it then shows up
in **Settings → Armies** on its own (the panel renders `ARMY_SKIN_ORDER`).

Drop glTF/GLB characters into `web/public/models/` and point the entries at
`/models/your-king.glb`. Requirements:

- **Orientation** — Y-up, facing +Z, or edit `PIECE_MODEL_ORIENTATION` in the same file; the
  loader derives the correction quaternion from the declared front/up axes.
- **Scale** — any. `PieceFactory.normalize()` measures the model, rescales it to the height in
  `PIECE_HEIGHT` (`src/scene/pieces.ts`), centres it on X/Z and grounds it on Y.
- **Materials** are cloned per instance and tinted per faction in `applyFactionLook()`.

If a rigged model fails to download the loader falls back to the static sculpt, and if that
fails too, to a procedural primitive figure — **the game always stays playable**.

To animate your own characters, fill the army's `animated` roster with a rigged GLB plus one
GLB per clip; any missing clip is simply skipped (no `walk` clip just means that rank slides),
and a clip that fails to download is retried on demand the next time the game needs it.

For shipping, compress the GLBs instead of streaming them from a remote host:

```bash
bunx @gltf-transform/cli optimize king.glb public/models/king.glb \
  --compress draco --texture-compress webp --texture-size 1024
```

## Audio

MP3s are streamed once and decoded into Web Audio buffers: an ambience bed, a score bed and a
tension stem that crossfades in during check and the endgame, plus place, capture, check-horn
and fanfare one-shots. Death cries come from whichever army each side is mustering (`cries` on
its `ARMY_SKINS` entry) and are lazily loaded after the mixer unlocks, since they are only
needed on a capture; each is a real one-second take, panned by the dying figure's screen
position and pitch-jittered per playback. They are cached by URL, so switching armies back and
forth costs nothing.

All three armies have their own set of six, and the sets are written against the way that army
dies. The Grande Armée's are gunshot reactions rather than melee cries — Napoléon bites a grunt
off through his teeth, the commander takes a sharp breath and lets a low gasp fall away, the
marshal is hit on the knee he fires from, the cuirassier's bellow is boxed in by his helmet, the
artillery guard's groan sags with his weight, and the line infantryman's cry is young, thin and
snapped short.

Footsteps, the wooden set-down knock, body falls and UI blips are synthesised with oscillators
and noise buffers — no files. Everything routes through one master gain
for the mute toggle, and playback only starts after the first user gesture (browser autoplay
policy).

> **Note on hosted assets.** Out of the box, the models and audio are streamed from remote
> URLs listed in `src/assets/generated.ts`. If you fork this for production, mirror them into
> `web/public/` and update those constants so your build does not depend on someone else's CDN.

## Scripts

Run from `web/`:

| Script | What it does |
| --- | --- |
| `bun run dev` | Vite dev server with HMR |
| `bun run build` | Type-checked production build into `dist/` |
| `bun run preview` | Serve the production build locally |
| `bun run lint` | ESLint over the whole project |
| `bun run test` | Node unit tests **and** the Playwright-backed browser tests |
| `bun run test:watch` | Vitest in watch mode |
| `bun run test:browser` | Browser-mode Vitest only |

## Browser support

Any browser with **WebGL 2** and **Web Audio**: current Chrome, Edge, Firefox and Safari 16+,
on desktop and tablet. Touch orbit, pinch zoom and tap-to-move are supported; on narrow
screens the move ledger folds into a corner button so the board keeps the whole viewport.

On Linux, check `chrome://gpu` / `about:support` first: without hardware acceleration the browser
falls back to llvmpipe, and the scene is then rendered by the CPU. The game still runs — see
[Black-screen recovery](#black-screen-recovery) — but expect Low preset frame rates.

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for the
workflow, coding conventions and the **English Conventional Commits** message format used in
this repository.

## License

[MIT](LICENSE) © the King's Gambit contributors.

Bundled dependencies keep their own licences: three.js (MIT), chess.js (BSD-2-Clause),
React (MIT), Tailwind CSS (MIT), Radix UI / shadcn/ui (MIT), lucide (ISC).

The 3D characters and audio shipped with the project were generated for it and may be reused
under the same terms; if you replace them, credit the new authors here.
