import { initApp } from "../ui/app.ts";

const root = document.querySelector("#app");
if (root instanceof HTMLElement) {
  initApp(root);
}
