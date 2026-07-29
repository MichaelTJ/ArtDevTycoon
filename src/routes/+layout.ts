// Fully static build. There is no server: the game logic and all AI inference run in
// the player's browser, so the app prerenders to plain files and hosts on any CDN.
export const prerender = true;
export const ssr = false;
