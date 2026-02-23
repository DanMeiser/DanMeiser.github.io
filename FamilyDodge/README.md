# Family Dodge – Godot 4 Game

A **Dodge the Creeps**-style game featuring the Family characters.
Pick **Calvin**, **Bailey**, or **Lilly** as your player — the other two become relentless homing creeps!

---

## Setup

### 1. Install Godot 4
Download [Godot 4.3+](https://godotengine.org/) (standard, not .NET/Mono).

### 2. Copy character assets
The game needs the character PNG files from the shared assets folder.
Copy (or create a symlink) into `FamilyDodge/assets/`:

| File | Source |
|------|--------|
| `calvin1.png` `calvin2.png` `calvin3.png` | `../assets/` |
| `calvin_preview.png` | `../assets/` |
| `bailey1.png` `bailey2.png` `bailey3.png` | `../assets/` |
| `bailey_preview.png` | `../assets/` |
| `lilly1.png` `lilly2.png` `lilly3.png` | `../assets/` |
| `lilly-preview.png` | `../assets/` |

**Quick copy (PowerShell from repo root):**
```powershell
Copy-Item assets\calvin*.png FamilyDodge\assets\
Copy-Item assets\bailey*.png FamilyDodge\assets\
Copy-Item assets\lilly*.png  FamilyDodge\assets\
```

### 3. Open in Godot
1. Launch Godot 4
2. **Project → Import** → browse to `FamilyDodge/project.godot`
3. Let Godot finish importing assets
4. Press **F5** (or the Play button) to run

---

## How to Play

| Key | Action |
|-----|--------|
| `W` / `↑` | Move up |
| `S` / `↓` | Move down |
| `A` / `←` | Move left |
| `D` / `→` | Move right |

Survive as long as possible. The creeps home in on you and speed up with your score.

---

## Project Structure

```
FamilyDodge/
├── project.godot            Godot 4 project config (480×720, gl_compatibility)
├── global.gd                Autoload: selected character + score persistence
├── character_select.tscn    Character picker screen (entry point)
├── character_select.gd
├── main.tscn                Main game scene
├── main.gd                  Spawner, timers, game flow
├── player.tscn              Player Area2D scene
├── player.gd                WASD movement, sprite setup, hit detection
├── creep.tscn               Creep RigidBody2D scene
├── creep.gd                 Homing AI, random character skin
├── hud.tscn                 HUD CanvasLayer (score, messages, buttons)
├── hud.gd
└── assets/                  ← Copy PNGs here (see Setup above)
```

## Gameplay Details

- **Score** counts seconds survived
- **Difficulty** ramps continuously — spawn rate and creep speed increase
- **Creep AI** softly steers toward the player each physics step (homing)
- **High scores** saved per-character to `user://family_dodge_scores.cfg`
- After game over: **Start!** replays with same character; **Select Character** returns to picker
