
import { HandleInput, HandleFocusIn, HandleKeyDown, Init, UpdateNodes, UpdateDependencies } from '~/lib/interactive-components';
import { Dialog, Props as DialogProps } from '~/components/dialog-base/dialog';
import { createContext, createEffect, on, ParentProps, type Signal, splitProps, Show, onMount, useContext, onCleanup, createSignal, createRenderEffect } from 'solid-js';
import { SpreadsheetType } from '~/lib/spreadsheet-type';
import type { DependencyList } from 'riskamp-web';

import { bootstrap_icons } from 's5-icon-lib';
import style from './interactive-dialog.module.css';

export interface Props extends DialogProps<boolean> {
  clear_primary_selection?: boolean;
  sheet: () => SpreadsheetType|undefined;
  update?: (dependencies: DependencyList) => void;
}

/**
 * base parameter type. you can extend with any other data.
 */
export interface ParameterType {

  element?: HTMLDivElement;
  validate?: (value: string) => boolean;

  // now required
  valid: () => boolean;
  setValid: (value: boolean) => void;

  // new, value as string
  value: () => string;
  setValue: (value: string) => void;

  // initial value
  initialValue: () => string;
  setInitialValue: (value: string) => void;

}

/**
 * dialog context for managing parameters, which will be created by 
 * the implementing dialog.
 */
type DialogContextType = {
  register?: (parameter: ParameterType) => void;
  unregister?: (parameter: ParameterType) => void;
}

/**
 * dialog context for managing parameters, which will be created by 
 * the implementing dialog.
 */
const DialogContext = createContext<DialogContextType>({});

/**
 * render a parameter. connects with the interactive dialog via the
 * context to watch for changes (either typed in or via selection).
 * 
 * optionally include a validation marker (X or check)
 */
export function Parameter(props: {parameter: ParameterType, 'show-validation'?: boolean }) {

  const context = useContext(DialogContext);

  onMount(() => context.register?.(props.parameter));
  onCleanup(() => context.unregister?.(props.parameter));

  function ValidationIcon(props: {valid: boolean}) {
    return <div classList={{
        [style['validation-icon']]: true,
        [style.valid]: props.valid,
      }}
      innerHTML={props.valid ? bootstrap_icons.check_lg : bootstrap_icons.x_lg} />
  }

  const initial_value = props.parameter.initialValue() || '';

  return <>
    <div class="flex-row">
      <div class="reference-editor tc flex-grow" 
            data-selection-target 
            tabindex="0"
            role="textbox" 
            spellcheck="false"
            contenteditable="true"
            ref={props.parameter.element}>{initial_value}</div>
      <Show when={props['show-validation']}>
        <ValidationIcon valid={props.parameter.valid()} />
      </Show>
    </div>
  </>;

}

/**
 * utility to create parameters, atm just adds signal for valid
 * @param source 
 * @returns 
 */
export function CreateParameters<T = unknown>(source: T[]): (T & ParameterType)[] {
  return source.map(entry => {

    const [valid, setValid] = createSignal<boolean>(false);
    const [value, setValue] = createSignal<string>('');
    const [initialValue, setInitialValue] = createSignal<string>('');

    const composite: T & ParameterType = {
      valid, setValid, 
      value, setValue,
      initialValue, setInitialValue,
      ...entry,
    };

    return composite;

  });
}

export function InteractiveDialog(props: ParentProps<Props>) {

  let root_node: HTMLDivElement|undefined;

  const [local, base_props] = splitProps(props, ['children', 'sheet', 'update', 'clear_primary_selection']);

  let observer: MutationObserver|undefined;
  let registry: ParameterType[] = [];

  let microtask_lock = false;
  function CompositeMircotask() {
    if (microtask_lock) {
      return;
    }
    microtask_lock = true;
    queueMicrotask(() => {
      microtask_lock = false;
      if (root_node) {
        UpdateNodes(root_node, props.sheet());
      }
    });
  }

  function RegisterParameter(parameter: ParameterType) {
    registry.push(parameter);

    createEffect(on(parameter.initialValue, value => {
      if (parameter.element) {
        parameter.element.textContent = value;
        parameter.setValue(value);
        CompositeMircotask();
      }
    }));

    if (parameter.validate) {
      createEffect(on(parameter.value, value => {
        parameter.setValid(parameter.validate?.(value) || false);
      }));
    }

  }

  function UnregisterParameter(parameter: ParameterType) {
    registry = registry.filter(test => test !== parameter);
  }
  
  function DetachObserver() {
    if (observer) {
      observer.disconnect();
      observer = undefined;
    }
  }

  function AttachObserver() {

    if (observer) {
      observer.disconnect();
      observer = undefined;
    }

    const targets = root_node?.querySelectorAll('[contenteditable]');
    if (targets?.length) {

      const callback = (mutationsList: MutationRecord[]): void => {
        for (const mutation of mutationsList) {
          if (mutation.type === 'characterData' || mutation.type === 'childList') {
            let target: Node|null = mutation.target;
            while (target) {
              if (target instanceof HTMLElement && target.hasAttribute('contenteditable')) {
                // props['editor-change']?.(target);

                for (const parameter of registry) {
                  if (parameter.element === target) {
                    const text = target.textContent || '';
                    parameter.setValue(text);
                    // parameter.setValid(parameter.validate?.(text) || false);
                    break;
                  }
                }

                break;
              }
              target = target.parentElement;
            }
          }
        }
      };

      observer = new MutationObserver(callback);

      const config = { 
          characterData: true, // Watch for changes to the text content itself
          childList: true,     // Watch for additions/removals of child nodes (like <div> or <br>)
          subtree: true        // Watch all descendent nodes, not just the top level
      };

      for (const element of targets) {
        if (element instanceof HTMLElement) {
          observer.observe(element, config);
        }
      }

    }

  }

 
  let initialized = false;
  createEffect(on(props.open, (value) => {
    if (value) {
      if (root_node) {
        Init(root_node, local.sheet(), local.clear_primary_selection, local.update);
        AttachObserver();
        initialized = true;
      }
    }
    else {
      if (initialized) {
        local.sheet()?.ExternalEditor(); // flush
        DetachObserver();
        initialized = false;
      }
    }
  }, { defer: true }));

  return <>
    <DialogContext.Provider value={{ 
      register: RegisterParameter,
      unregister: UnregisterParameter,
     }}>
      <Dialog {...base_props}>
        <div ref={root_node} 
              oninput={e => HandleInput(e, root_node as HTMLElement, local.sheet(), local.update)} 
              onfocusin={HandleFocusIn} 
              onkeydown={e => HandleKeyDown(e, root_node as HTMLElement)} 
              class="display-contents">

          {local.children}

        </div>
      </Dialog>
    </DialogContext.Provider>
  </>;

}
