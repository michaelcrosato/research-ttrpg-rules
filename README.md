# TTRPG & Board Game Rules Registry (Systems Indexer)

This repository contains an exhaustive, highly searchable master registry of Tabletop Roleplaying Games (TTRPGs) and Board Games, designed to let users instantly query which rulesets feature dedicated, explicit mechanics governing specific types of gameplay.

## 🗃️ Database Registry Structure

The database resides in [registry.json](file:///C:/dev/research-ttrpg-rules/registry.json). The registry normalizes game mechanics using a strict key-value serialization schema containing:
1. `game_id`: A unique, lowercase snake_case identifier (e.g., `dnd_5e`, `twilight_imperium_4e`).
2. `title`: The official full name of the ruleset.
3. `year`: Original publication year.
4. `medium`: Format category (`ttrpg` or `board_game`).
5. `primary_genre`: The overarching thematic classification.
6. `subgenres`: An array of auxiliary subgenres.
7. `governed_vectors`: A comprehensive, unbounded array of namespaced strings identifying every distinct gameplay element that has explicit mechanical governance, mathematical loops, or dedicated rules.
8. `vector_explanations`: A mapping of each namespace vector to its explicit implementation rules within that game.

### 🏷️ Taxonomy Notation
To ensure programmatic parsing, vectors use a rigid `domain.subsystem.focus` notation. For example:
- `combat.melee.tactical`
- `stealth.detection.noise_radius`
- `economy.trading.barter`
- `simulation.environment.weather`
- `logistics.survival.rations`
- `politics.factions.loyalty`

---

## 💻 Rules Explorer Web Application

We have built a premium, responsive, dark-mode search interface that allows quick, high-fidelity querying of these rules. The application files are located in this workspace:
- **[index.html](file:///C:/dev/research-ttrpg-rules/index.html)**: Semantic layout, dashboard cards, grid areas, details modal, and form selectors.
- **[styles.css](file:///C:/dev/research-ttrpg-rules/styles.css)**: Glassmorphic panel designs, glow highlights, grid positioning, custom scrollbars, and card micro-animations.
- **[app.js](file:///C:/dev/research-ttrpg-rules/app.js)**: Local data load, omni-search matching, autocomplete, dynamic Venn comparison sets, dictionary indexing, and database editor.

### 🌟 Key Features

1. **Dashboard Overview**: Tracks total indexed games, TTRPGs, board games, and unique governed vectors.
2. **Omni-Search Explorer Grid**: Filters the database by title, genre, subgenres, or vector tags. Drag sliders or type years to narrow down publication eras. Hovering over a card reveals preview tags, and clicking opens a detailed drawer mapping all mechanical rules.
3. **Vector Search Engine**: Search for a specific gameplay vector (with autocompleting recommendations). It immediately list every ruleset governing that mechanic, detailing *how* the rule is structured in each game.
4. **Venn Comparison Tool**: Choose any two games (e.g., *Pathfinder 2e* vs *D&D 5e* or *Gloomhaven* vs *Mage Knight*) to run a set-intersection analysis. Displays:
   - **Shared Systems**: Mechanics governed by both games.
   - **Exclusive to Game A / B**: Mechanics unique to each ruleset.
   - *Hovering over any vector lists the rules explanation from that game.*
5. **Vector Dictionary**: Browsable index of all vectors, categorized by domain (e.g., `combat`, `stealth`, `logistics`, `simulation`, `social`, etc.). Clicking on an entry reveals which games implement it.
6. **Database Editor**: Add new games directly into the registry. Select existing vectors or input custom ones, write mechanical explanations, compile the updated JSON in real-time, and download the updated `registry.json` database.

---

## 🚀 How to Run the App

Since the app is built using client-side vanilla JavaScript, you can run it immediately without complex servers.

### Method 1: Double-Click
Simply open **[index.html](file:///C:/dev/research-ttrpg-rules/index.html)** in any modern web browser.

### Method 2: Local HTTP Server (Recommended)
To run with standard browser resource requests, start a local development server using `http-server` (Node) or Python:

#### Using Node:
```powershell
npx http-server C:\dev\research-ttrpg-rules
```

#### Using Python:
```powershell
python -m http.server 8000 --directory C:\dev\research-ttrpg-rules
```
Then navigate to `http://localhost:8000` or `http://localhost:8080`.
