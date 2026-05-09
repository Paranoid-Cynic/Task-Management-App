# To‑Do List 🎀📝

A cute to‑do list where each task becomes an adorable **bunny holding a sign**.

- **Add** tasks (with optional due date)
- Toggle **Done** to make the bunny **cheer** (🎉🎀)
- **Overdue** tasks look **sleepy/pouty**
- Filter tasks: **All / Active / Done / Overdue**
- Data is saved locally using **localStorage**

## Tech Stack

This project is a simple standalone website:

- **HTML** (`index.html`) – page layout + task template
- **CSS** (`styles.css`) – styling + kawaii bunny visuals + state animations
- **JavaScript** (`script.js`) – task CRUD, filtering, localStorage persistence

No frameworks or build tools are used.

## How It Works

### Task Model
Each task is stored as:
- `id` (unique string)
- `title` (task text)
- `due` (`YYYY-MM-DD` string or `null`)
- `done` (boolean)
- `createdAt` (timestamp for stable ordering)

### Overdue Logic
A task is considered **overdue** when:
- `done === false`, and
- `due` exists, and
- `due` is **strictly earlier than today** (based on the user’s local date).

### UI Rendering
- The UI uses an HTML `<template>` for each task.
- On every change (add/toggle/delete/filter/clear done), the list is re-rendered.
- CSS classes (`isDone`, `isOverdue`) drive the “cheer” and “sleepy” visuals.

## Run Locally

1. Open:
   `kawaii-todo/index.html`
2. You should see the to‑do list immediately.

*(Optional)* In VS Code, you can use **Live Server** to avoid any caching quirks.

## File Structure

- `index.html`
- `styles.css`
- `script.js`
- `README.md`

## Browser Support

Uses standard modern web APIs (`localStorage`, DOM events). Works in current versions of Chrome, Edge, and Firefox.

