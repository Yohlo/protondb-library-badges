# ProtonDB Library Badges for Millennium

A Millennium plugin that puts ProtonDB rankings at a glance in your Steam library

## Features

- A **ProtonDB** stat on every game's page on the play bar, clicking it will open the game's ProtonDB report
- A small colored dot beside every game in the library sidebar
- A **ProtonDB rating** section inside the Library Filters panel, allows for filtering library list and can be saved to dynamic collections
- A toggle button in the row of icons beside the search box to quickly hide or show the sidebar dots
- Ratings are cached for a week, cache can be cleared from within plugins setting page

## Prerequisites

- **[Millennium](https://steambrew.app/)** installed and working

### Images

<!--screenshots-->

---

## Installation Guide

### Method 1: Download a release

1. Grab the latest `protondb-library-badges-X.Y.Z.zip` from the Releases page
2. Close Steam completely
3. Extract the zip into your Millennium plugins folder. It already contains a `protondb-library-badges` folder, so you should see:
   - Windows: `C:\Program Files (x86)\Steam\plugins\protondb-library-badges`
   - Linux: `~/.local/share/millennium/plugins/protondb-library-badges`
4. Start Steam, go to **Millennium** → **Plugins**, enable **ProtonDB Library Badges**
5. Restart Steam

### Method 2: Build from source

#### Step 1: Clone into the plugins folder

```bash
# Linux
git clone https://github.com/Yohlo/protondb-library-badges ~/.local/share/millennium/plugins/protondb-library-badges
cd ~/.local/share/millennium/plugins/protondb-library-badges
```

```bash
# Windows
git clone https://github.com/Yohlo/protondb-library-badges "C:\Program Files (x86)\Steam\plugins\protondb-library-badges"
cd "C:\Program Files (x86)\Steam\plugins\protondb-library-badges"
```

#### Step 2: Install dependencies

```bash
npm install
```

#### Step 3: Build

**For development:**

```bash
npm run dev
```

**For production:**

```bash
npm run build
```

Built file outputs to `.millennium/Dist/index.js`

#### Step 4: Enable the plugin

1. Close Steam completely
2. Start Steam
3. Go to **Millennium** → **Plugins**
4. Enable **ProtonDB Library Badges**
5. Restart Steam once more
