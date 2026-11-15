import { byId, setOptions, setText } from './dom';

export function createTourEditor(onChange: () => void) {
  const list = byId<HTMLOListElement>('tour-stops');
  const choices = byId<HTMLSelectElement>('tour-district');
  const add = byId<HTMLButtonElement>('tour-add');
  const status = byId('reorder-status');
  const rows = new Map<string, HTMLLIElement>();
  let ids: string[] = [];
  let options: readonly { id: string; name: string }[] = [];

  function updateChoices() {
    setOptions(choices, options.filter(({ id }) => !ids.includes(id)));
    add.disabled = choices.options.length === 0;
  }

  function publishOrder(focus?: HTMLElement) {
    ids.forEach((id, index) => {
      const row = rows.get(id)!;
      const at = list.children[index] ?? null;
      if (at !== row) {
        if (typeof list.moveBefore === 'function' && row.parentElement === list) {
          list.moveBefore(row, at);
        } else {
          list.insertBefore(row, at);
        }
      }
      row.querySelector('[data-offset="-1"]')!.setAttribute('aria-disabled', String(index === 0));
      row.querySelector('[data-offset="1"]')!.setAttribute('aria-disabled', String(index === ids.length - 1));
    });
    if (focus && document.activeElement !== focus) focus.focus();
    updateChoices();
    onChange();
  }

  function createRow(id: string) {
    const name = options.find(option => option.id === id)?.name ?? id;
    const row = document.createElement('li');
    const title = document.createElement('span');
    title.textContent = name;
    const controls = document.createElement('div');
    controls.className = 'tour-actions';
    for (const [offset, label, icon] of [[-1, 'nach oben', '↑'], [1, 'nach unten', '↓']] as const) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = icon;
      button.setAttribute('aria-label', name + ' ' + label);
      button.dataset.offset = String(offset);
      controls.append(button);
      button.addEventListener('click', () => {
        const from = ids.indexOf(id);
        const to = from + offset;
        if (to < 0 || to >= ids.length) return;
        [ids[from], ids[to]] = [ids[to], ids[from]];
        publishOrder(button);
        setText(status, `${name}: Halt ${to + 1} von ${ids.length}.`);
      });
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', name + ' entfernen');
    remove.addEventListener('click', () => {
      const next = row.nextElementSibling ?? row.previousElementSibling;
      ids = ids.filter(candidate => candidate !== id);
      rows.delete(id);
      row.remove();
      publishOrder();
      (next?.querySelector('button') ?? add).focus();
      setText(status, name + ' entfernt.');
    });
    controls.append(remove);
    row.append(title, controls);
    return row;
  }

  add.addEventListener('click', () => {
    if (!choices.value) return;
    const id = choices.value;
    ids.push(id);
    const row = createRow(id);
    rows.set(id, row);
    publishOrder();
    if (add.disabled) row.querySelector('button')?.focus();
    setText(status, `${options.find(option => option.id === id)?.name}: Halt ${ids.length} hinzugefügt.`);
  });

  return {
    read: () => [...ids],
    updateOptions(next: typeof options) {
      options = next;
      updateChoices();
    },
    load(next: readonly string[]) {
      rows.clear();
      list.replaceChildren();
      ids = [...next];
      for (const id of ids) rows.set(id, createRow(id));
      setText(status, '');
      publishOrder();
    },
  };
}
