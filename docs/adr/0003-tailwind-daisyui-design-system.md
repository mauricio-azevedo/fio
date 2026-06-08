# ADR 0003: Use Tailwind and daisyUI with a custom Fio theme

## Status

Accepted

## Decision

Fio uses Tailwind CSS and daisyUI for styling infrastructure, but the visible product identity is a custom theme named `fio`.

## Consequences

The app can move quickly without inheriting a generic template look. Product components should prefer restrained typography, calm contrast, and low visual noise. daisyUI components are acceptable only when they preserve that tone.
