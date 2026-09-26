/** The renderer owns shell.html; absence of its required controls is an error. */
export function required<T>(
  value: T | null | undefined,
  context = 'viewer invariant',
): T {
  if (value === null || value === undefined)
    throw new Error(`Missing ${context}`);
  return value;
}
export function element<T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  return required(root.querySelector<T>(selector), selector);
}
export function elements<T extends Element = HTMLElement>(
  selector: string,
): T[] {
  return [...document.querySelectorAll<T>(selector)];
}
export function data(element: HTMLElement | SVGElement, name: string): string {
  return required(element.dataset[name], `data-${name}`);
}
export interface TextLabel extends SVGTextElement {
  compactLayout?: SVGTextElement;
}
