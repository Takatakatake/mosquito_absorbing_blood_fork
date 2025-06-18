# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser-based mosquito game built with vanilla JavaScript, HTML5 Canvas, and CSS. The game is entirely self-contained with no external dependencies or build process.

## Running the Game

Simply open `index.html` in a web browser. No installation or build steps required.

## Architecture

The entire game logic is contained within a single `MosquitoGame` class in `script.js`:

- **Game Loop Pattern**: `gameLoop()` → `update()` → `draw()` using requestAnimationFrame
- **Input Handling**: Both touch and mouse events are supported
- **Stage System**: 10 stages defined in `stageConfigs` array with progressive difficulty
- **Entity Management**: Player, enemies (hands), collectibles (blood), and obstacles (smoke) are managed within the main class

Key game systems:
- Collision detection between player and all interactive elements
- Particle effects for visual feedback
- Score and lives tracking with UI updates
- Stage progression with transition effects

## Development Guidelines

When modifying the game:

1. All game logic modifications should be made in the `MosquitoGame` class in `script.js`
2. Visual styling changes go in `style.css`
3. HTML structure changes in `index.html` (minimal, mostly just container elements)

The game uses Japanese text for UI elements. Main game flow:
- Title screen → Game play → Game over/completion screen

No testing framework or linting is set up. The code follows standard JavaScript conventions with clear method names and logical organization within the single class structure.