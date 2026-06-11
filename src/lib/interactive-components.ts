
/**
 * this is a bridge between treb's "external editors" and local
 * components. we'll typically do this in dialogs or sidebars. 
 */

import type { DependencyList } from '@trebco/treb/treb-grid';
import type { EmbeddedSpreadsheet, EmbeddedSpreadsheetBase } from 'riskamp-web';

export function UpdateDependencies(
      root_node: HTMLElement, 
      sheet?: EmbeddedSpreadsheetBase,
      update?: (dependencies: DependencyList) => void) {

  const editors = Array.from(root_node.querySelectorAll('div[data-selection-target]')) as HTMLDivElement[];
  const references: string[] = [];

  for (const editor of editors) {
    if (editor.dataset.references) {
      try {
        const list = JSON.parse(editor.dataset.references);
        for (const entry of list) {
          if (!references.includes(entry)) {
            references.push(entry);
          }
        }
      }
      catch {
        console.info({ references: editor.dataset.references });
        console.warn('invalid json in dataset references');
      }
    }
  }

  if (sheet) {
    const dependencies = references.map(reference => sheet.Resolve(reference));
    update?.(dependencies);
  }

};

export function HandleFocusIn(event: FocusEvent) {
  if (event.target instanceof HTMLElement && event.target.dataset.selectionTarget !== undefined) {
    const window_selection = window.getSelection();
    if (window_selection) {
      window_selection.selectAllChildren(event.target);
      window_selection.collapseToEnd();
    }
  }
}

export function HandleInput(event: Event, root_node: HTMLElement, sheet?: EmbeddedSpreadsheet, update?: (dependencies: DependencyList) => void) {
  if (event.target instanceof HTMLElement && event.target.dataset.selectionTarget !== undefined) {
    const selection = window.getSelection();
    if (selection?.rangeCount) {
      const range = selection.getRangeAt(0);
      if (range?.endContainer) {
        if (range.endContainer instanceof HTMLElement) {
          range.endContainer.scrollIntoView();
        }
        else if (range.endContainer.parentElement instanceof HTMLElement) {
          range.endContainer.parentElement.scrollIntoView();
        }
      }
    }
    UpdateDependencies(root_node, sheet, update);
  }
};

export function HandleKeyDown(event: KeyboardEvent, root_node: HTMLElement) {

  // FIXME: make this optional so an input _could_, if it wanted,
  // accept returns? would be useful for long let/lambda functions

  if (event.target instanceof HTMLElement && event.target.dataset.selectionTarget !== undefined) {
    if (event.key === 'Enter') {
      event.stopPropagation();
      event.preventDefault();

      // treat like tab, and go to the next input. note we collect these
      // nodes from time to time -- we could theoretically cache them. I'm
      // not sure it's worth it, as we'll prevent GC if the dialog changes.
      // on the other hand, dialogs don't change that often. also we already
      // have an explicit cleanup... FIXME/TODO

      const nodes = Array.from(root_node.querySelectorAll('div[data-selection-target]')) as HTMLDivElement[];
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i] === event.target) {
          if (i < nodes.length - 1) {
            nodes[i+1].focus();
          }
          else {
            nodes[0].focus();
          }
          break;
        }
      }

    }
  }
}

export function Init(root_node: HTMLElement, sheet?: EmbeddedSpreadsheet, clear_primary_selection?: boolean, update?: (dependencies: DependencyList) => void) {

    const original_selection = sheet?.GetSelection();

    // the idea here is to copy the current style, whatever it
    // is, to the dialog. so if you change theme in between 
    // invocations of the dialog, we'll keep current. there are
    // probably more efficient ways to accomplish this.

    const treb_main = document.querySelector('.treb-main');
    if (treb_main) {
      const computed = getComputedStyle(treb_main);
      for (let i = 0; i < 5; i++) {
        const key = `--text-reference-color-${i + 1}`; 
        const value = computed.getPropertyValue(key) || '';
        // console.info({key, value});
        root_node.style.setProperty(key, value);
      }
    }

    if (clear_primary_selection) {
      sheet?.Select(undefined);
    }

    const editors = Array.from(root_node.querySelectorAll('div[data-selection-target]')) as HTMLDivElement[];

    const focus_target = root_node.querySelector('[data-focus]');
    if (focus_target instanceof HTMLInputElement) {
      focus_target.value = original_selection || '';
      requestAnimationFrame(() => {
        focus_target.focus();
      });
    }

    // console.info("Initializing, editors", editors, "sheet", sheet);

    sheet?.ExternalEditor({
      nodes: editors,
    });
    // initialized = true;

    UpdateDependencies(root_node, sheet, update);
      
}

export function UpdateNodes(
      root_node: HTMLElement, 
      sheet?: EmbeddedSpreadsheetBase,
      update?: (dependencies: DependencyList) => void) {
  requestAnimationFrame(() => {
    const nodes = Array.from(root_node.querySelectorAll('div[data-selection-target]')) as HTMLDivElement[];

    sheet?.ExternalEditor({
      nodes,
    });

    // console.info("Update nodes", nodes);

    // initialized = true;
    UpdateDependencies(root_node, sheet, update);
  });
};




