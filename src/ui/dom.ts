export function byId<T extends Element = HTMLElement>(id: string): T {
  return document.querySelector<T>('#' + id)!;
}

export function setText(element: Element, value: string) {
  if (element.textContent !== value) element.textContent = value;
}

export function setOptions(select: HTMLSelectElement, choices: readonly { id: string; name: string }[]) {
  if (select.options.length === choices.length &&
      choices.every(({ id, name }, index) => select.options[index].value === id && select.options[index].text === name)) return;
  const previous = select.value;
  select.replaceChildren(...choices.map(choice => new Option(choice.name, choice.id)));
  if (choices.some(choice => choice.id === previous)) select.value = previous;
}

const currency = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' });
export const money = (cents: number) => currency.format(cents / 100);
