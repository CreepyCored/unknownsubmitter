# unknownsubmitter — Islamic Knowledge Bot

A Discord bot for sharing structured Islamic knowledge across categories and parts.

---

## Setup

```bash
npm install
cp .env.example .env
# Fill in DISCORD_TOKEN and BOT_OWNER_ID in .env
node index.js
```

---

## Commands

### Browsing Content

| Command | Description |
|---|---|
| `/tawheed` | List all Tawheed parts |
| `/tawheed [part]` | Read a specific part |
| `/aqeedah` | List all Aqeedah parts |
| `/rulings`, `/pillarsofislam`, `/pillarsofiman` | Same pattern |
| `/listcategories` | Show all categories |
| `/listparts [category]` | Paginated list of parts |

Any dynamic category you create gets its own `/categoryname` command automatically.

---

### Admin — Category Management

> Requires Administrator permission or Bot Owner ID.

| Command | Description |
|---|---|
| `/createcategory [name] [display] [description] [emoji]` | Create a new category |
| `/deletecategory [name]` | Delete a dynamic category (static ones are protected) |
| `/renamecategory [old] [new]` | Rename the display name of a category |

---

### Admin — Part Management

| Command | Description |
|---|---|
| `/addpart [category] [number] [title] [content]` | Add a new part |
| `/editpart [category] [number]` | Edit via modal (supports up to 4000 chars) |
| `/deletepart [category] [number]` | Remove a part |
| `/insertpart [category] [number] [title] [content]` | Insert at position (shifts others up) |
| `/movepart [category] [from] [to]` | Move/swap parts |

---

## Data Storage

All data is persisted in `data.json` in the bot's directory. Back this file up regularly.

## Static Categories

These are pre-seeded and cannot be deleted, but their parts can be managed:
- `tawheed` — Tawheed (38 parts by default placeholder)
- `aqeedah` — Aqeedah
- `rulings` — Rulings
- `pillarsofislam` — Pillars of Islam
- `pillarsofiman` — Pillars of Iman
