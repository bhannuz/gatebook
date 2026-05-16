# 🏢 Flat Payments Tracker

A clean, responsive, block-wise flat payments and expense tracking web page — no backend, no dependencies (other than Tabler Icons CDN). Drop it into any web server or GitHub Pages and it works.

---

## Features

- **Block-wise tabs** — Switch between Block A, B, C (easily extendable)
- **Flat cards** — Each flat shows owner, amount paid, progress bar, and status
- **Click-to-inspect** — Opens a detail panel with full expense history and balance
- **Add payment / expense** — Log payments per flat with category, amount, date, and status
- **Summary bar** — Total due, collected, outstanding, and flat counts at a glance
- **Filter & search** — Filter by payment status or search by flat number / owner name
- **Dark mode** — Automatically adapts to system preference
- **Responsive** — Works on mobile and desktop

---

## File structure

```
flat-payments-tracker/
├── index.html   ← Page structure
├── style.css    ← All styles (light + dark mode)
├── app.js       ← Data + all logic
└── README.md
```

---

## Quick start

### Option 1 — Open directly
Just double-click `index.html` in your browser. Everything runs locally — no server needed.

### Option 2 — GitHub Pages
1. Push this folder to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to **main branch / root**
4. Your tracker will be live at `https://<your-username>.github.io/<repo-name>/`

### Option 3 — Any web server
Copy the three files to your server's public folder. No build step, no npm, no config.

---

## How to customize

### Add / edit flats
Open `app.js` and find the `BLOCKS` object at the top:

```js
const BLOCKS = {
  A: {
    color: '#185FA5',        // Block accent color
    flats: [
      {
        id: 'A-101',         // Flat number (shown on card)
        owner: 'Owner Name', // Owner name
        paid: 4500,          // Amount paid so far (₹)
        due: 5000,           // Total due this month (₹)
        expenses: [          // Expense history (can be empty [])
          { cat: 'Maintenance', date: '01 May', amt: 3000, note: '' },
        ],
      },
      // ... more flats
    ],
  },
  // ... more blocks
};
```

### Add a new block
```js
D: {
  color: '#7F77DD',   // Pick any color
  flats: [
    { id: 'D-101', owner: 'New Owner', paid: 0, due: 5000, expenses: [] },
  ],
},
```

### Change monthly due amount
Update the `due` field on each flat, or add a global default and reference it:
```js
const MONTHLY_DUE = 6000; // ₹ per flat per month
```
Then replace `due: 5000` with `due: MONTHLY_DUE` across all flat entries.

### Change currency symbol
Search for `fmtINR` in `app.js` and update the `₹` symbol:
```js
function fmtINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN');
}
```

---

## Expense categories

The default categories are:
`Maintenance · Water · Electricity · Parking · Lift · Security · Cleaning · Other`

To add more, edit the `<select id="fCat">` options in `index.html`.

---

## Browser support
Chrome, Firefox, Safari, Edge — all modern browsers. No IE support.

---

## License
MIT — free to use and modify.
