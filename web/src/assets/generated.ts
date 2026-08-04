/**
 * URLs of the AI-generated assets used by the game.
 * Models are loaded straight from R2 by GLTFLoader; audio is decoded by the
 * Web Audio mixer. Swapping in higher-quality glTF characters is a one-line
 * change per entry (see README).
 */

import type { Faction, PieceKind } from "../core/types";

const MODEL_BASE = "https://r2-pub.rork.com/generated-3d-models/g9111r67kl6tq85g540sd";

/**
 * One army's sculpts. Every skin is a whole civilisation with its own roster of
 * six figures; a missing entry falls back to the other side's sculpt and then to
 * a procedural figure, so the board always fills.
 */
type Roster<T> = Partial<Record<PieceKind, T>>;

/**
 * Which procedural weapon family arms a skin's figures. The sculpts themselves
 * are unarmed (held props break auto-rigging), so the arms are built in
 * `scene/weapons.ts` and parented to the hand bones.
 */
export type ArsenalId = "kingdom" | "sun" | "empire";

/** Selectable army skins. Either side of the board can wear any of them. */
export type ArmySkinId = "ivory" | "sun" | "empire";

/** Static (unrigged) sculpt per kind — the fallback when a rig fails to load. */
const STILL_MODELS: Record<ArmySkinId, Roster<string>> = {
  ivory: {
    k: `${MODEL_BASE}/704a772c-4a50-4619-b5ad-6e2bbf9703b8.glb`,
    q: `${MODEL_BASE}/13928f19-23a3-46ba-9879-aacca58f2886.glb`,
    b: `${MODEL_BASE}/6c99342a-e9a5-4959-a59b-c207e15a5c72.glb`,
    n: `${MODEL_BASE}/43f08150-5463-4112-9949-2e1a9a9a6bd2.glb`,
    r: `${MODEL_BASE}/211b0ba5-2c7f-44ff-8143-b625bca41df1.glb`,
    p: `${MODEL_BASE}/36d8c7d4-2f42-4672-8908-e9298fce9b69.glb`,
  },
  // Sun Empire: emperor, high priestess, serpent priest, jaguar warrior,
  // temple guardian and eagle footsoldier.
  sun: {
    k: `${MODEL_BASE}/ad5cfb3c-4fbc-4952-a1f1-b1d4a684b2e7.glb`,
    q: `${MODEL_BASE}/d39273ce-17e5-41df-a7f5-634f944e3467.glb`,
    b: `${MODEL_BASE}/7066c2da-f466-438b-ab74-f2a45b2a0ddb.glb`,
    n: `${MODEL_BASE}/a5ff70a9-b2e7-40e0-b7bc-ea4fe0ba6d5c.glb`,
    r: `${MODEL_BASE}/c044d8e8-28fd-4aa9-af00-d58ca49fedee.glb`,
    p: `${MODEL_BASE}/2cd10f02-711f-4e51-8b32-1d6603e7cc3f.glb`,
  },
  // Grande Armée: Napoléon, an imperial commander, marshals of the Empire,
  // cuirassier champions, artillery guards and line infantry.
  empire: {
    k: `${MODEL_BASE}/b533d4ac-cac7-47f2-887d-8b90ee8626a8.glb`,
    q: `${MODEL_BASE}/a152280e-7af7-4e3e-846e-b20e8f8c2952.glb`,
    b: `${MODEL_BASE}/779c54d4-67b3-4e69-948a-fdcc8c58ae5c.glb`,
    n: `${MODEL_BASE}/ebbe76e7-dbc7-4961-bf10-035acee68ee1.glb`,
    r: `${MODEL_BASE}/044ccbd8-c9d3-452e-8524-4a47034b8fe2.glb`,
    p: `${MODEL_BASE}/29b4a2e7-eba2-4ca7-a9f3-e22278c8df9e.glb`,
  },
};

/**
 * Rigged (skinned) sculpts plus their skeletal clips. The plain GLBs above have
 * no skeleton, so an animated piece must render the rigged variant and play the
 * clips on a mixer bound to it. Kinds missing here fall back to the static GLB
 * with procedural idle motion.
 */
export interface PieceAnimationSet {
  /** Rigged GLB — the visual for animated pieces. */
  rigged: string;
  /** Looping combat stance. */
  idle?: string;
  /** One-shot strike played when this figure captures. */
  attack?: string;
  /** One-shot death played when this figure is captured. */
  death?: string;
  /**
   * Looping in-place stride played while the figure marches to its square.
   * In-place variants only: the board move is driven by the container tween,
   * so a clip carrying root translation would double the travel.
   */
  walk?: string;
  /** Looping in-place run — the knight's charge through its leap. */
  run?: string;
  /**
   * One-shot drill played after a shot: powder, ball, ramrod. Only the
   * gunpowder army carries one — a swordsman has nothing to reload.
   */
  reload?: string;
}

const ANIMATED_MODELS: Record<ArmySkinId, Roster<PieceAnimationSet>> = {
  ivory: {
  // The crown stands at full height and judges rather than brawls.
  k: {
    rigged: `${MODEL_BASE}/704a772c-4a50-4619-b5ad-6e2bbf9703b8-rigged.glb`,
    idle: `${MODEL_BASE}/704a772c-4a50-4619-b5ad-6e2bbf9703b8-anim-idle.glb`,
    attack: `${MODEL_BASE}/704a772c-4a50-4619-b5ad-6e2bbf9703b8-anim-sword-judgment.glb`,
    death: `${MODEL_BASE}/704a772c-4a50-4619-b5ad-6e2bbf9703b8-anim-dead.glb`,
    // A plain, upright stride: the catwalk strut read as a swagger on a king,
    // so the crown now walks normally and the slow cadence in GAITS supplies the
    // gravitas. Alternative on the same rig:
    // `...-anim-spear-walk-inplace.glb` (weapon-forward march).
    walk: `${MODEL_BASE}/704a772c-4a50-4619-b5ad-6e2bbf9703b8-anim-casual-walk-inplace.glb`,
  },
  q: {
    rigged: `${MODEL_BASE}/13928f19-23a3-46ba-9879-aacca58f2886-rigged.glb`,
    idle: `${MODEL_BASE}/13928f19-23a3-46ba-9879-aacca58f2886-anim-idle.glb`,
    attack: `${MODEL_BASE}/13928f19-23a3-46ba-9879-aacca58f2886-anim-charged-spell-cast.glb`,
    death: `${MODEL_BASE}/13928f19-23a3-46ba-9879-aacca58f2886-anim-dying-backwards.glb`,
    // Natural stride instead of the old red-carpet walk, whose crossed steps and
    // hip sway looked wrong under a battle gown.
    // Alternative: `...-anim-spear-walk-inplace.glb`.
    walk: `${MODEL_BASE}/13928f19-23a3-46ba-9879-aacca58f2886-anim-casual-walk-inplace.glb`,
  },
  b: {
    rigged: `${MODEL_BASE}/6c99342a-e9a5-4959-a59b-c207e15a5c72-rigged.glb`,
    idle: `${MODEL_BASE}/6c99342a-e9a5-4959-a59b-c207e15a5c72-anim-combat-stance.glb`,
    attack: `${MODEL_BASE}/6c99342a-e9a5-4959-a59b-c207e15a5c72-anim-sword-judgment.glb`,
    death: `${MODEL_BASE}/6c99342a-e9a5-4959-a59b-c207e15a5c72-anim-dead.glb`,
    walk: `${MODEL_BASE}/6c99342a-e9a5-4959-a59b-c207e15a5c72-anim-spear-walk-inplace.glb`,
  },
  n: {
    rigged: `${MODEL_BASE}/43f08150-5463-4112-9949-2e1a9a9a6bd2-rigged.glb`,
    idle: `${MODEL_BASE}/43f08150-5463-4112-9949-2e1a9a9a6bd2-anim-combat-stance.glb`,
    attack: `${MODEL_BASE}/43f08150-5463-4112-9949-2e1a9a9a6bd2-anim-charged-slash.glb`,
    death: `${MODEL_BASE}/43f08150-5463-4112-9949-2e1a9a9a6bd2-anim-dying-backwards.glb`,
    walk: `${MODEL_BASE}/43f08150-5463-4112-9949-2e1a9a9a6bd2-anim-confident-strut-inplace.glb`,
    // Carried through the leap, so the rider is charging rather than floating.
    run: `${MODEL_BASE}/43f08150-5463-4112-9949-2e1a9a9a6bd2-anim-standard-forward-charge-inplace.glb`,
  },
  r: {
    rigged: `${MODEL_BASE}/211b0ba5-2c7f-44ff-8143-b625bca41df1-rigged.glb`,
    idle: `${MODEL_BASE}/211b0ba5-2c7f-44ff-8143-b625bca41df1-anim-combat-stance.glb`,
    attack: `${MODEL_BASE}/211b0ba5-2c7f-44ff-8143-b625bca41df1-anim-heavy-hammer-swing.glb`,
    death: `${MODEL_BASE}/211b0ba5-2c7f-44ff-8143-b625bca41df1-anim-knock-down.glb`,
    // Full plate: an ordinary stride played at the guardian's slow cadence reads
    // as a heavy tread, where the hunched orc walk read as a monster.
    // Alternative: `...-anim-carry-heavy-object-walk-inplace.glb` (laden trudge).
    walk: `${MODEL_BASE}/211b0ba5-2c7f-44ff-8143-b625bca41df1-anim-casual-walk-inplace.glb`,
  },
  p: {
    rigged: `${MODEL_BASE}/36d8c7d4-2f42-4672-8908-e9298fce9b69-rigged.glb`,
    idle: `${MODEL_BASE}/36d8c7d4-2f42-4672-8908-e9298fce9b69-anim-combat-stance.glb`,
    attack: `${MODEL_BASE}/36d8c7d4-2f42-4672-8908-e9298fce9b69-anim-thrust-slash.glb`,
    death: `${MODEL_BASE}/36d8c7d4-2f42-4672-8908-e9298fce9b69-anim-knock-down.glb`,
    walk: `${MODEL_BASE}/36d8c7d4-2f42-4672-8908-e9298fce9b69-anim-spear-walk-inplace.glb`,
  },
  },
  sun: {
    k: {
      rigged: `${MODEL_BASE}/ad5cfb3c-4fbc-4952-a1f1-b1d4a684b2e7-rigged.glb`,
      idle: `${MODEL_BASE}/ad5cfb3c-4fbc-4952-a1f1-b1d4a684b2e7-anim-idle.glb`,
      attack: `${MODEL_BASE}/ad5cfb3c-4fbc-4952-a1f1-b1d4a684b2e7-anim-sword-judgment.glb`,
      death: `${MODEL_BASE}/ad5cfb3c-4fbc-4952-a1f1-b1d4a684b2e7-anim-dead.glb`,
      // As with the ivory king: upright natural stride, no catwalk sway.
      // Alternative: `...-anim-spear-walk-inplace.glb`.
      walk: `${MODEL_BASE}/ad5cfb3c-4fbc-4952-a1f1-b1d4a684b2e7-anim-casual-walk-inplace.glb`,
    },
    q: {
      rigged: `${MODEL_BASE}/d39273ce-17e5-41df-a7f5-634f944e3467-rigged.glb`,
      idle: `${MODEL_BASE}/d39273ce-17e5-41df-a7f5-634f944e3467-anim-idle.glb`,
      attack: `${MODEL_BASE}/d39273ce-17e5-41df-a7f5-634f944e3467-anim-charged-spell-cast.glb`,
      death: `${MODEL_BASE}/d39273ce-17e5-41df-a7f5-634f944e3467-anim-dying-backwards.glb`,
      // Alternative: `...-anim-spear-walk-inplace.glb`.
      walk: `${MODEL_BASE}/d39273ce-17e5-41df-a7f5-634f944e3467-anim-casual-walk-inplace.glb`,
    },
    b: {
      rigged: `${MODEL_BASE}/7066c2da-f466-438b-ab74-f2a45b2a0ddb-rigged.glb`,
      idle: `${MODEL_BASE}/7066c2da-f466-438b-ab74-f2a45b2a0ddb-anim-combat-stance.glb`,
      attack: `${MODEL_BASE}/7066c2da-f466-438b-ab74-f2a45b2a0ddb-anim-sword-judgment.glb`,
      death: `${MODEL_BASE}/7066c2da-f466-438b-ab74-f2a45b2a0ddb-anim-dead.glb`,
      walk: `${MODEL_BASE}/7066c2da-f466-438b-ab74-f2a45b2a0ddb-anim-spear-walk-inplace.glb`,
    },
    n: {
      rigged: `${MODEL_BASE}/a5ff70a9-b2e7-40e0-b7bc-ea4fe0ba6d5c-rigged.glb`,
      idle: `${MODEL_BASE}/a5ff70a9-b2e7-40e0-b7bc-ea4fe0ba6d5c-anim-combat-stance.glb`,
      attack: `${MODEL_BASE}/a5ff70a9-b2e7-40e0-b7bc-ea4fe0ba6d5c-anim-charged-slash.glb`,
      death: `${MODEL_BASE}/a5ff70a9-b2e7-40e0-b7bc-ea4fe0ba6d5c-anim-dying-backwards.glb`,
      // The jaguar warrior prowls where the ivory knight marches.
      walk: `${MODEL_BASE}/a5ff70a9-b2e7-40e0-b7bc-ea4fe0ba6d5c-anim-sneaky-walk-inplace.glb`,
      run: `${MODEL_BASE}/a5ff70a9-b2e7-40e0-b7bc-ea4fe0ba6d5c-anim-standard-forward-charge-inplace.glb`,
    },
    r: {
      rigged: `${MODEL_BASE}/c044d8e8-28fd-4aa9-af00-d58ca49fedee-rigged.glb`,
      idle: `${MODEL_BASE}/c044d8e8-28fd-4aa9-af00-d58ca49fedee-anim-combat-stance.glb`,
      attack: `${MODEL_BASE}/c044d8e8-28fd-4aa9-af00-d58ca49fedee-anim-heavy-hammer-swing.glb`,
      death: `${MODEL_BASE}/c044d8e8-28fd-4aa9-af00-d58ca49fedee-anim-knock-down.glb`,
      // Alternative: `...-anim-carry-heavy-object-walk-inplace.glb`.
      walk: `${MODEL_BASE}/c044d8e8-28fd-4aa9-af00-d58ca49fedee-anim-casual-walk-inplace.glb`,
    },
    p: {
      rigged: `${MODEL_BASE}/2cd10f02-711f-4e51-8b32-1d6603e7cc3f-rigged.glb`,
      idle: `${MODEL_BASE}/2cd10f02-711f-4e51-8b32-1d6603e7cc3f-anim-combat-stance.glb`,
      attack: `${MODEL_BASE}/2cd10f02-711f-4e51-8b32-1d6603e7cc3f-anim-thrust-slash.glb`,
      death: `${MODEL_BASE}/2cd10f02-711f-4e51-8b32-1d6603e7cc3f-anim-knock-down.glb`,
      walk: `${MODEL_BASE}/2cd10f02-711f-4e51-8b32-1d6603e7cc3f-anim-spear-walk-inplace.glb`,
    },
  },
  empire: {
    // The Emperor never brawls and never closes: the coat comes open, the
    // flintlock comes up and the matter is settled from where he stands.
    // Alternative on the same rig: `...-anim-sword-judgment.glb` (dress sabre).
    k: {
      rigged: `${MODEL_BASE}/b533d4ac-cac7-47f2-887d-8b90ee8626a8-rigged.glb`,
      idle: `${MODEL_BASE}/b533d4ac-cac7-47f2-887d-8b90ee8626a8-anim-idle.glb`,
      attack: `${MODEL_BASE}/b533d4ac-cac7-47f2-887d-8b90ee8626a8-anim-cowboy-quick-draw-shooting.glb`,
      death: `${MODEL_BASE}/b533d4ac-cac7-47f2-887d-8b90ee8626a8-anim-dead.glb`,
      walk: `${MODEL_BASE}/b533d4ac-cac7-47f2-887d-8b90ee8626a8-anim-casual-walk-inplace.glb`,
      reload: `${MODEL_BASE}/b533d4ac-cac7-47f2-887d-8b90ee8626a8-anim-standing-reload.glb`,
    },
    // The commander fights at range: her cast is the artillery order.
    q: {
      rigged: `${MODEL_BASE}/a152280e-7af7-4e3e-846e-b20e8f8c2952-rigged.glb`,
      idle: `${MODEL_BASE}/a152280e-7af7-4e3e-846e-b20e8f8c2952-anim-idle.glb`,
      attack: `${MODEL_BASE}/a152280e-7af7-4e3e-846e-b20e8f8c2952-anim-charged-spell-cast.glb`,
      death: `${MODEL_BASE}/a152280e-7af7-4e3e-846e-b20e8f8c2952-anim-dying-backwards.glb`,
      walk: `${MODEL_BASE}/a152280e-7af7-4e3e-846e-b20e8f8c2952-anim-casual-walk-inplace.glb`,
    },
    b: {
      rigged: `${MODEL_BASE}/779c54d4-67b3-4e69-948a-fdcc8c58ae5c-rigged.glb`,
      idle: `${MODEL_BASE}/779c54d4-67b3-4e69-948a-fdcc8c58ae5c-anim-combat-stance.glb`,
      attack: `${MODEL_BASE}/779c54d4-67b3-4e69-948a-fdcc8c58ae5c-anim-charged-spell-cast-1.glb`,
      death: `${MODEL_BASE}/779c54d4-67b3-4e69-948a-fdcc8c58ae5c-anim-dead.glb`,
      walk: `${MODEL_BASE}/779c54d4-67b3-4e69-948a-fdcc8c58ae5c-anim-spear-walk-inplace.glb`,
    },
    n: {
      rigged: `${MODEL_BASE}/ebbe76e7-dbc7-4961-bf10-035acee68ee1-rigged.glb`,
      idle: `${MODEL_BASE}/ebbe76e7-dbc7-4961-bf10-035acee68ee1-anim-combat-stance.glb`,
      attack: `${MODEL_BASE}/ebbe76e7-dbc7-4961-bf10-035acee68ee1-anim-charged-slash.glb`,
      death: `${MODEL_BASE}/ebbe76e7-dbc7-4961-bf10-035acee68ee1-anim-dying-backwards.glb`,
      // A cavalryman on foot still swaggers.
      walk: `${MODEL_BASE}/ebbe76e7-dbc7-4961-bf10-035acee68ee1-anim-confident-strut-inplace.glb`,
      run: `${MODEL_BASE}/ebbe76e7-dbc7-4961-bf10-035acee68ee1-anim-standard-forward-charge-inplace.glb`,
    },
    // The battery: the crew lays the gun it hauls, then serves it. Its "strike"
    // is the step in to the trail and the shove on the lanyard.
    // Alternative: `...-anim-heavy-hammer-swing.glb` (rammer swung as a maul).
    r: {
      rigged: `${MODEL_BASE}/044ccbd8-c9d3-452e-8524-4a47034b8fe2-rigged.glb`,
      idle: `${MODEL_BASE}/044ccbd8-c9d3-452e-8524-4a47034b8fe2-anim-combat-stance.glb`,
      attack: `${MODEL_BASE}/044ccbd8-c9d3-452e-8524-4a47034b8fe2-anim-step-forward-and-push.glb`,
      death: `${MODEL_BASE}/044ccbd8-c9d3-452e-8524-4a47034b8fe2-anim-knock-down.glb`,
      // The gun crew's laden trudge — the heaviest tread on the board.
      walk: `${MODEL_BASE}/044ccbd8-c9d3-452e-8524-4a47034b8fe2-anim-carry-heavy-cannon-forward-inplace.glb`,
      // Kneeling at the muzzle with powder and shot once the piece has spoken.
      reload: `${MODEL_BASE}/044ccbd8-c9d3-452e-8524-4a47034b8fe2-anim-kneeling-reload.glb`,
    },
    // Line infantry fires a volley rather than closing with the bayonet.
    // Alternative: `...-anim-thrust-slash.glb` (bayonet thrust).
    p: {
      rigged: `${MODEL_BASE}/29b4a2e7-eba2-4ca7-a9f3-e22278c8df9e-rigged.glb`,
      idle: `${MODEL_BASE}/29b4a2e7-eba2-4ca7-a9f3-e22278c8df9e-anim-combat-stance.glb`,
      attack: `${MODEL_BASE}/29b4a2e7-eba2-4ca7-a9f3-e22278c8df9e-anim-draw-and-shoot-from-back.glb`,
      death: `${MODEL_BASE}/29b4a2e7-eba2-4ca7-a9f3-e22278c8df9e-anim-knock-down.glb`,
      // Musket held across the body at the ready — the line advances, it does
      // not stroll. Alternative: `...-anim-spear-walk-inplace.glb`.
      walk: `${MODEL_BASE}/29b4a2e7-eba2-4ca7-a9f3-e22278c8df9e-anim-rifle-charge-inplace.glb`,
      reload: `${MODEL_BASE}/29b4a2e7-eba2-4ca7-a9f3-e22278c8df9e-anim-standing-reload.glb`,
    },
  },
};

/**
 * Orientation verdict reported by the generator for every sculpt:
 * hasIntrinsicFront = true, front = +Z, up = +Y.
 */
export const PIECE_MODEL_ORIENTATION = {
  localFrontAxis: "positiveZ",
  localUpAxis: "positiveY",
} as const;

const CRY_BASE = "https://r2-pub.rork.com/generated-audio/g9111r67kl6tq85g540sd";

/**
 * One death cry per figure per army. They are voiced in character — the ivory
 * kingdom dies like medieval Europeans, the Sun Empire like jaguar/eagle
 * warriors — so the ear can tell what just fell without looking at the board.
 * The two queens are the exception: soft breathy sighs instead of shrieks.
 * Every clip is generated at a true one-second length, so the mixer plays them
 * back at their natural pitch instead of speeding a longer take up.
 * Loaded lazily after the mixer unlocks (they are only needed on a capture).
 */
const DEATH_CRIES: Record<ArmySkinId, Record<PieceKind, string>> = {
  ivory: {
    k: `${CRY_BASE}/c4d801f3-b8e7-42bb-b046-6b21e9ec40a5.mp3`,
    q: `${CRY_BASE}/e01a2d0f-2b13-426b-89b4-d40e67d4b16f.mp3`,
    b: `${CRY_BASE}/4ca6a216-52fc-4882-b51a-9a44d188edac.mp3`,
    n: `${CRY_BASE}/ebb33bba-cf2b-481f-aec6-4465a6a35253.mp3`,
    r: `${CRY_BASE}/f9d84835-112f-46de-951b-052f867814da.mp3`,
    p: `${CRY_BASE}/e4caca0d-8f61-4228-b349-025ae499cde5.mp3`,
  },
  sun: {
    k: `${CRY_BASE}/7efd7eb4-936a-4488-83ae-e0ebea314601.mp3`,
    // Young female voice — a plain drawn-out "ahhhh" scream cut by a gasp.
    q: `${CRY_BASE}/6fe2ac5d-b4e4-4655-9354-cfbb117bc7f5.mp3`,
    b: `${CRY_BASE}/6ae51ccd-12c2-4002-875d-ec4c1d907227.mp3`,
    n: `${CRY_BASE}/a66374c2-9253-4f07-8202-1001ccf6ba69.mp3`,
    r: `${CRY_BASE}/6107aca9-aa81-45ff-a3d5-eda9d457fc3b.mp3`,
    // Deep male voice — a rising shout cut short by the death gasp.
    p: `${CRY_BASE}/ffa27c35-53ff-4f3a-a71e-285aff8a2a4b.mp3`,
  },
  // The Grande Armée borrows the European voices: same language of pain, and
  // the queen's breathy sigh already fits an imperial commander.
  empire: {
    k: `${CRY_BASE}/c4d801f3-b8e7-42bb-b046-6b21e9ec40a5.mp3`,
    q: `${CRY_BASE}/e01a2d0f-2b13-426b-89b4-d40e67d4b16f.mp3`,
    b: `${CRY_BASE}/4ca6a216-52fc-4882-b51a-9a44d188edac.mp3`,
    n: `${CRY_BASE}/ebb33bba-cf2b-481f-aec6-4465a6a35253.mp3`,
    r: `${CRY_BASE}/f9d84835-112f-46de-951b-052f867814da.mp3`,
    p: `${CRY_BASE}/e4caca0d-8f61-4228-b349-025ae499cde5.mp3`,
  },
};

/** One selectable civilisation: sculpts, clips, arms, names and voices. */
export interface ArmySkin {
  id: ArmySkinId;
  /** Army name, as shown in the settings panel. */
  label: string;
  /** One line of flavour under the name. */
  blurb: string;
  /** Rank names, longest to shortest silhouette — used by the crests. */
  ranks: Record<PieceKind, string>;
  /** Procedural weapon family the figures are armed from. */
  arsenal: ArsenalId;
  /**
   * The side this army was painted for. When both sides wear the same skin the
   * native one keeps its own textures and the other is re-tinted into livery,
   * so the two armies never become indistinguishable.
   */
  native: Faction;
  still: Roster<string>;
  animated: Roster<PieceAnimationSet>;
  cries: Record<PieceKind, string>;
}

export const ARMY_SKINS: Record<ArmySkinId, ArmySkin> = {
  ivory: {
    id: "ivory",
    label: "Ivory Kingdom",
    blurb: "Medieval Europe — plate, heater shields and witchfire.",
    ranks: { k: "King", q: "Queen", b: "Mage", n: "Knight", r: "Guardian", p: "Footman" },
    arsenal: "kingdom",
    native: "w",
    still: STILL_MODELS.ivory,
    animated: ANIMATED_MODELS.ivory,
    cries: DEATH_CRIES.ivory,
  },
  sun: {
    id: "sun",
    label: "Sun Empire",
    blurb: "Obsidian, jade and quetzal plumes under a stepped sun.",
    ranks: { k: "Emperor", q: "Priestess", b: "Serpent Priest", n: "Jaguar Warrior", r: "Temple Guardian", p: "Eagle Warrior" },
    arsenal: "sun",
    native: "b",
    still: STILL_MODELS.sun,
    animated: ANIMATED_MODELS.sun,
    cries: DEATH_CRIES.sun,
  },
  empire: {
    id: "empire",
    label: "Grande Armée",
    blurb: "Napoleonic France — navy and gold, sabres, muskets and cannon.",
    ranks: {
      k: "Napoléon",
      q: "Imperial Commander",
      b: "Marshal",
      n: "Cuirassier",
      r: "Artillery Guard",
      p: "Line Infantry",
    },
    arsenal: "empire",
    native: "b",
    still: STILL_MODELS.empire,
    animated: ANIMATED_MODELS.empire,
    cries: DEATH_CRIES.empire,
  },
};

/** Presentation order of the skins in the settings panel. */
export const ARMY_SKIN_ORDER: ArmySkinId[] = ["ivory", "sun", "empire"];

/** Which army each side musters until the player says otherwise. */
export const DEFAULT_ARMY_SKINS: Record<Faction, ArmySkinId> = { w: "ivory", b: "sun" };

export const AUDIO_URLS = {
  ambience: "https://r2-pub.rork.com/generated-audio/g9111r67kl6tq85g540sd/e62d5bb9-8c84-4464-8696-dbcf975f938b.mp3",
  score: "https://r2-pub.rork.com/generated-audio/g9111r67kl6tq85g540sd/3fbe58de-9d38-4d91-a002-794d0e979eb0.mp3",
  tension: "https://r2-pub.rork.com/generated-audio/g9111r67kl6tq85g540sd/00baae5a-fde3-478a-8190-b1ad14d2e96d.mp3",
  place: "https://r2-pub.rork.com/generated-audio/g9111r67kl6tq85g540sd/73f19d09-0275-4c4b-87cd-eeeed26a616b.mp3",
  capture: "https://r2-pub.rork.com/generated-audio/g9111r67kl6tq85g540sd/64ee8170-b796-413f-8249-f1deb7803393.mp3",
  check: "https://r2-pub.rork.com/generated-audio/g9111r67kl6tq85g540sd/20ebb41c-0b20-4b4b-8c75-5f78541722d3.mp3",
  fanfare: "https://r2-pub.rork.com/generated-audio/g9111r67kl6tq85g540sd/c89fa5ef-7904-4a5f-899e-e1973b13b30f.mp3",
} as const;
