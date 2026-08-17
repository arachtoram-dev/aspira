# V36 — Role Labels & Notifications Responsive Fix

Based directly on the uploaded ASPIRA-V35-logo-all-pages-fix archive.

## Role labels
Developer account cards now render role-specific classes:
- `role-pengurus`
- `role-ketua`
- `role-developer`

The labels are intentionally smaller, compact, and less visually dominant.

## Notifications
On narrow screens the notification dropdown is switched to `position: fixed` so it is positioned relative to the viewport rather than the narrow header container.

It now:
- stays inside the viewport
- never uses the previous `right:-44px` offset
- has a viewport-aware width
- has a viewport-aware maximum height
- allows long report titles/department names to wrap instead of being clipped
- keeps the notification list independently scrollable

Desktop behavior remains unchanged.
