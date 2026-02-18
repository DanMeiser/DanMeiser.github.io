```prompt
---
agent: speckit.constitution
---
# Project Constitution

This file outlines the non-negotiable rules, principles, and constraints that must be adhered to throughout the development of the "Flappy Family" game using Spec Kit.

## Core Principles

*   **Technology Stack:** The project must exclusively use **JavaScript (ES6+)** for all game logic and **Canvas API** for rendering.
*   **GitHub Pages Compatible:** The project must run entirely in the browser with no build step required. All assets and code must be statically served.
*   **No External Frameworks:** Do not introduce any additional game engines or complex frameworks beyond vanilla JavaScript and Canvas unless explicitly approved in a separate specification.
*   **File Structure:**
    *   `index.html`: Single-page HTML entry point with meta tags and game container.
    *   `js/game.js`: Main game loop and initialization logic.
    *   `js/bird.js`, `js/pipe.js`, `js/base.js`: Modules to encapsulate game object classes (if modularized).
    *   `css/style.css`: All styling for the game UI.
    *   `assets/`: Directory for all images (`.png`, `.jpg`), sounds (`.wav`, `.mp3`, `.ogg`), and fonts (`.ttf`).
*   **Coding Style:** Adhere to modern JavaScript conventions (ES6+) with clear, readable code. Use meaningful variable and function names.
*   **Modularity:** The code should be modular with clear separation of concerns. Consider using ES6 modules if complexity warrants it, but keep it simple.
*   **Game Assets:** Use image and sound assets located in the `assets/` directory. No external web requests for assets during runtime unless explicitly documented.
*   **User Input:** The spacebar (or click/touch) should be used for the bird's "flap" action and for restarting the game after a game over.
*   **Error Handling:** Implement basic error handling for asset loading to prevent the game from crashing if files are missing.
*   **Responsive Design:** The game should be playable on desktop browsers. Consider mobile responsiveness if specified.
*   **Performance:** Target smooth 60 FPS gameplay. Optimize rendering and physics calculations.
*   **Git Commits:** Every completed task must have its own commit, following the project's defined commit message template.

## Game Logic Constraints

*   **Gravity and Physics:** The game must simulate gravity, making the bird fall automatically unless the player flaps.
*   **Collision Detection:** Collision with pipes or the ground must result in an immediate game over state.
*   **Scoring:** A score counter must be visible on the screen and increment each time the bird successfully passes a pair of pipes.
*   **Randomization:** Pipes should be generated randomly with varying vertical positions but a fixed gap between the top and bottom pipes.
*   **Multiple Characters:** Support for multiple playable characters (at minimum 2) with different visual representations.

## GitHub Pages Deployment

*   The project must be deployable to GitHub Pages with minimal configuration.
*   `index.html` must be in the project root or configured in GitHub Pages settings.
*   All asset paths must be relative and compatible with both local development and GitHub Pages URLs.

Any deviation from this constitution requires explicit documentation and approval. The AI agent will use these rules as the single source of truth for the project's implementation.

```