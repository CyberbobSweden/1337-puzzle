# 1337 / 43 — Mathematical Exploit Puzzle

A hacker-themed math puzzle game

Place number and operator tiles into equation slots so that each equation evaluates to its target value — **1337** or **43**.

## How to play

- Click a tile in the pool to **select** it
- Click an empty slot to **place** it
- Click a filled slot to **pick it up** (back to pool)
- Click a filled slot *while holding a tile* to **swap**
- Number slots accept numbers, operator slots accept `+`, `-`, `*`, `/`

## Levels

| # | Name | Hint |
|---|------|------|
| 01 | INITIATION | Basic addition |
| 02 | BYPASS | Mix of `+` and `/` |
| 03 | INFILTRATE | Only `*` — but what makes 1337? |
| 04 | DECRYPT | Division — which numbers go where? |
| 05 | ROOT_ACCESS | 5-slot equation + one decoy tile 😈 |

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Build

```bash
npm run build
```

## Stack

- React 18
- Vite 5
- Pure inline styles + CSS-in-JS (no extra dependencies)
