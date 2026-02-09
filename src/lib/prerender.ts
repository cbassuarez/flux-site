export const isPrerender = () => typeof window !== "undefined" && window.__PRERENDER__ === true;
