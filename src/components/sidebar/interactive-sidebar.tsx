
import type { DependencyList } from 'riskamp-web';
import { onCleanup, onMount, ParentProps } from 'solid-js';
import { HandleInput, HandleFocusIn, HandleKeyDown, Init, UpdateNodes } from '~/lib/interactive-components';
import type { SidebarProps } from './sidebar-main';

type Props = SidebarProps & {
  update?: (dependencies: DependencyList) => void;
  focuschange?: (target?: HTMLElement) => void;
  clear_primary_selection?: boolean;
};

export function InteractiveSidebar(props: ParentProps<Props>) {

  let root_node: HTMLDivElement|undefined;
  let initialized = false;

  onMount(() => {
    /*
    if (props.sheet && root_node) {
      Init(root_node, props.sheet, false);
    }
    */
  });

  onCleanup(() => {
    if (initialized) {
      console.info("cleaning up (panel)");
      props.sheet()?.ExternalEditor(); // flush
      initialized = false;
    }
  });

  function LocalFocusIn(event: FocusEvent) {
    if (event.target instanceof HTMLElement && event.target.hasAttribute('data-selection-target')) {
      // console.info("WIRE UP");
      if (!initialized && root_node && props.sheet) {
        initialized = true;
        Init(root_node, props.sheet(), true, /* update */);
      }
    }
    HandleFocusIn(event);
  }

  function LocalFocusOut(event: FocusEvent) {
    if (initialized) {
      if (!(event.relatedTarget instanceof HTMLElement) ||  
          !event.relatedTarget.hasAttribute('data-selection-target')) {
        props.sheet()?.ExternalEditor(); // flush

        // let's scrub as well
        if (root_node) {
          const editors = Array.from(root_node.querySelectorAll('div[data-selection-target]')) as HTMLDivElement[];
          for (const editor of editors) {
            editor.textContent = editor.textContent;
          }
          initialized = false;
        }
      }
      else {
        // console.info("SWAP");
      }
    }

  }

  return <>
      <div class="display-contents" 
          ref={root_node}
          oninput={e => HandleInput(e, e.currentTarget, props.sheet(), /* props.update */)} 
          onfocusin={LocalFocusIn} 
          onfocusout={LocalFocusOut}
          onkeydown={e => HandleKeyDown(e, e.currentTarget)}>
        {props.children}
      </div>
    </>;

}