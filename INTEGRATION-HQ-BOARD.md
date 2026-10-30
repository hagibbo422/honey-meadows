# Headquarters board — how it's wired in Honey Meadows

- `headquarters-board.js` / `headquarters-board.css` are the Option 2 component files, unchanged. The CSS is loaded in `<head>`; a small `<script type="module">` imports the module and exposes `window.HMBoard`.
- `etsy-hq.js` keeps the password lock and the Etsy Sales sheet pipeline. After unlocking, `renderBoard()` mounts the board into the Headquarters panel and `boardData()` maps `state.summary` to the data contract (totalSales = unique orders, totalRevenue = Price × Quantity, recentOrders = 8 newest, updatedAt = last successful sheet load).
- `onRefresh` runs the existing sheet refresh; the 5-minute auto-refresh also updates the board. `onLock` = the existing lock (`lockNow`).
- Navigation: Dashboard = top; Orders = scroll to Recent orders; Products = Books catalog; Settings = game Settings panel; Analytics / Messages = Etsy stats / messages pages in a new tab.
- If the module can't load (some browsers block modules when index.html is opened straight from a file), Headquarters falls back to the previous card layout automatically.
- Local overrides (in index.html, scoped to `#stationView.hqBoard`): full-window board, fixed table column widths, phone overflow fix, full-screen on phones.

---

# Honey Meadows — Headquarters: Cottage Bulletin Board (Option 2)

This is a **working coded UI**, not a PNG or flattened illustration. The amounts, shop name, order rows, timestamps, labels, and buttons are actual HTML elements that can be updated at runtime.

## Package

- `headquarters-board.css` — self-contained, responsive bulletin-board styling, scoped to `.hm-board`.
- `headquarters-board.js` — dependency-free ES module; DOM dashboard creation, dynamic updates, button callbacks.
- `index.html` — standalone visual preview and test with a **Simulate a new order** button.
- `sample-sales.json` — example data shape.
- `INTEGRATION.md` — this integration guide.

No framework, npm packages, image sprites, canvas drawing, or external API access is required to render the dashboard.

## Fastest integration into Honey Meadows

1. Copy `headquarters-board.css` and `headquarters-board.js` into the same directory as the existing `index.html` (or adjust the relative paths below).
2. Load the CSS **once** in your HTML `<head>`:

```html
<link rel="stylesheet" href="./headquarters-board.css">
```

3. Add a target container inside your Headquarters dashboard panel:

```html
<div id="etsy-headquarters-board"></div>
```

4. Mount it with an ES module (the existing game can use its own JS normally):

```html
<script type="module">
  import {mountHeadquartersBoard} from './headquarters-board.js';

  const board = mountHeadquartersBoard({
    target: '#etsy-headquarters-board',
    data: window.honeyMeadowsSalesData || {},
    onRefresh: async () => {
      const response = await fetch('/api/etsy-sales');
      if (!response.ok) throw new Error('Could not refresh Etsy sales');
      return await response.json();
    },
    onNavigate: section => {
      // IMPORTANT: connect these to the existing Honey Meadows navigation:
      // 'dashboard' | 'orders' | 'products' | 'analytics' | 'messages' | 'settings'
      console.log('Open section:', section);
    },
    onLock: () => {
      // Connect to your current account lock / authentication workflow.
      console.log('Lock dashboard');
    }
  });

  // Optionally expose a safe update hook to the existing nonmodule game script:
  window.updateHoneyMeadowsSales = nextData => board.update(nextData);
</script>
```

**Example external update** once mounted:

```js
window.updateHoneyMeadowsSales({totalSales: 4, totalRevenue: 97.73, updatedAt: new Date().toISOString()});
```

The `update()` call merges the supplied top-level fields with existing state; passing `recentOrders` replaces the table's current rows.

## Public API

```js
const board = mountHeadquartersBoard({
  target,       // element or CSS selector (required)
  data,         // sales object (optional)
  onRefresh,    // async () => Promise<newSalesObject>
  onNavigate,   // (sectionId) => void
  onLock,       // () => void
  locale,       // default 'en-US'
  currency      // default 'USD'
});

board.update(partialSalesObject);
board.setLoading(true);
board.setError('Sync failed.');
board.getData();
board.destroy();
```

## Data contract

```js
{
  shopName: "Annie’s Etsy shop",
  subtitle: "Sales command center",
  totalSales: 3,                  // number
  totalRevenue: 77.74,           // number, not preformatted currency
  salesNote: "3 items sold",     // optional
  revenueNote: "before Etsy fees",// optional
  updatedAt: "2026-10-30T11:41:00", // ISO timestamp, optional
  recentOrders: [
    { id: "order-1", date: "2026-10-23", title: "Nail set", total: 27.84 }
  ]
}
```

There is deliberately **no hard-coded Etsy API key or sheet URL** in the component. Claude should connect the existing sales-sheet fetch logic and pass its parsed data into `board.update()` or return it from `onRefresh`. The code performs no network requests without the host app providing `onRefresh`.

## Integration prompts for Claude

> Use the provided `headquarters-board.js` and `headquarters-board.css` in the existing Honey Meadows project to replace only the Headquarters Etsy sales panel UI. Preserve the current town map, movement, doors, animated basketball, interior artwork, authenticated data fetch, and existing navigation. Mount the board when the sales panel opens, unmount on close (or keep one instance and hide it). Map the existing Etsy Sales sheet response to the supplied data contract. Feed updates to `board.update()`, call the original refresh function from `onRefresh`, and map navigation and lock events to the existing handlers. Do not replace the current game `index.html` wholesale.

## Visual details and technical limits

- Option 2 aesthetics: dark wood-plank walls, pinned parchment cards, flowers, wooden navigation, warm brass borders, and a cottage shop atmosphere.
- Decorative elements are CSS, Unicode symbols, and text: **no flat image containing data**.
- The layout is responsive and scoped under `.hm-board`, minimizing conflicts with the game CSS.
- The example date shown in sample data is intentionally static for fidelity to the supplied screenshot. Real data should override it with the actual fetch timestamp.
- Preview locally using any static server if your browser blocks ES modules from `file://` URLs. Example: `python3 -m http.server 8000` in this folder, then visit `http://localhost:8000/`.
