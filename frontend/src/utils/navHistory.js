export function pushNavState(state) {
  window.history.pushState(state, '');
}

export function replaceNavState(state) {
  window.history.replaceState(state, '');
}

export function goBack() {
  window.history.back();
}
