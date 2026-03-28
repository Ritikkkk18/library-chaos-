# 📚 Library Chaos – Game Design Document

## 🎮 Core Concept
A chaotic survival game inspired by Vampire Survivors where you play as a librarian trying to maintain order while increasingly rowdy kids create chaos by pulling books off shelves.

---

# 🔁 Core Gameplay Loop
1. Move through the library
2. Pick up books automatically when near them
3. Return books automatically when near correct shelves
4. Gain XP from returning books and interacting with kids
5. Chaos increases as books remain on the floor
6. Level up → choose upgrades
7. Survive escalating chaos for 30 minutes

---

# 📚 Book System

## Book Types
- **Normal Books** – standard cleanup
- **Heavy Books** – slow player movement
- **Rare Books** – give bonus XP but increase chaos faster when dropped
- **Misplaced Books** – must go to specific shelves
- **Cursed Books** – continuously increase chaos until returned

## Dynamic Book Behavior
- Books can be dropped:
  - Near shelves
  - Far from shelves (carried by kids)
- Over time, more books become available to be pulled from shelves
- Later stages = more total active books in the system

---

# 👶 Kid (NPC) Behavior System

## Core Behavior
- Kids roam the library and interact with shelves
- They can:
  - Knock books off near shelves
  - Carry books far away before dropping them

## New Interaction Mechanic
- Kids visibly carry books
- Player can intercept and retrieve books before they are dropped

## Repulsion System (Core Mechanic)
- Kids are repelled by the librarian
- When player approaches:
  - Kids run away
  - Creates a **herding/corralling mechanic**
  - Enables chase sequences when kids carry books

## Kid Types
- **Runner Kid** – fast, carries books far away
- **Thrower Kid** – throws books across map
- **Climber Kid** – pulls rare books
- **Tantrum Kid** – creates AoE chaos bursts
- **Sneaky Kid** – steals and hides books

---

# 📊 Chaos System

## Chaos Meter (0–100%)

### Increases from:
- Books on the ground
- Kids actively making mess
- Special events (tantrums, hazards)

### Decreases from:
- Returning books
- Upgrades and abilities

## Chaos Threshold Effects
- **25%** → faster kid activity
- **50%** → shelves start dropping books
- **75%** → reduced visibility / environmental effects
- **90%** → panic mode (extreme speed + chaos)

---

# 🧠 Player Progression & Leveling

## XP Sources
- Returning books
- Intercepting kids
- Combo cleanups

## Level Scaling
- Each level requires more XP than the previous
- Difficulty increases alongside player level

## Upgrade Categories

### Cleaning
- Larger pickup radius
- Faster shelving
- Carry multiple books

### Mobility
- Movement speed
- Dash ability
- Teleport between shelves

### Control
- Repel radius increase
- Slow kids
- Area control abilities

### Intelligence
- Highlight correct shelves
- Reduce chaos gain
- Predict kid movement

---

# ⚡ Power-Ups (Temporary Effects)

- **Librarian Rage** → instant area cleanup
- **Story Time** → kids freeze temporarily
- **Book Magnet** → pull all books toward player
- **Auto-Shelver Drone** → passive cleanup
- **Time Freeze** → pause chaos increase
- **Strict Mode** → slows kids globally

---

# 🏁 Win & Lose Conditions

## Win
- Survive for 30 minutes

## Lose
- Chaos reaches 100%

---

# 📈 Difficulty Scaling

## Time-Based
- More kids spawn
- New kid types appear
- Increased activity frequency

## System Scaling
- More books become interactable over time
- Kids carry books further distances
- Chaos grows faster at higher levels

## Player-Level Scaling
- Higher level = harder progression
- XP requirements increase per level

---

# 🎯 Strategic Gameplay Elements

## Key Decisions
- Clean nearby vs chase kids
- Carry more books vs stay mobile
- Control chaos vs maximize XP

## Risk/Reward
- Intercepting kids prevents chaos spikes
- Ignoring distant mess leads to exponential difficulty

---

# 🔥 Events & Chaos Spikes

- **School Trip Wave** → large kid spawn
- **Book Avalanche** → shelves dump books
- **Tantrum Event** → multiple AoE disruptions

---

# 🌍 Environment Systems

- Spilled liquids → slippery movement
- Broken shelves → constant book drops
- Lighting effects → reduced visibility

---

# 🔁 Meta Progression

## Unlockables
- New librarian characters (speed, control, tank)
- Permanent upgrades
- New maps/themes

---

# 🎮 Summary of Core Experience
The player balances cleaning efficiency, crowd control, and movement to survive an escalating chaos system driven by increasingly disruptive kids and growing environmental pressure. The repulsion mechanic creates unique emergent gameplay, allowing players to herd, chase, and strategically manage chaos sources rather than simply reacting to them.
