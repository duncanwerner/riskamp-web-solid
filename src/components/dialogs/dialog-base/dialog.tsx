
import { createEffect, onMount, type Setter, ParentProps, children, JSX, Signal, Show, createSignal, type Accessor } from 'solid-js';
import style from './dialog.module.css';
import { bootstrap_icons } from 's5-icon-lib';
import { OpenExternal } from '~/lib/navigate';

export interface Position {
  x: number;
  y: number;
};

export interface Size {
  width: number;
  height: number;
}

export interface Props<T> {

  open: Accessor<boolean>;
  setOpen: Setter<boolean>;

  // onClose?: () => void;
  setResult?: Setter<T|undefined>;

  modal?: boolean;

  escape?: boolean;
  moveable?: boolean;
  resizeable?: boolean;
  closebox?: boolean;

  /** optional link for help button */
  help?: string;

  /** optional bindable layout (position) */
  bindlayout?: Signal<Position|undefined>;

  /** optional bindable size */
  bindsize?: Signal<Size|undefined>;

  class?: string;

};

const Header = (props: { children: JSX.Element }) => props.children;
const Body = (props: { children: JSX.Element }) => props.children;

export function Dialog<T>(props: ParentProps<Props<T>>) {

  let dialog: HTMLDialogElement|undefined;
  let frame: HTMLDivElement|undefined;
  let mouse_mask: HTMLDivElement|undefined;

  const [dragging, setDragging] = createSignal<'move'|'resize'|false>(false);
  const [layout, setLayout] = props.bindlayout || createSignal<Position|undefined>(undefined);
  const [size, setSize] = props.bindsize || createSignal<Size|undefined>(undefined);

  function HandleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (props.escape) {
        props.setResult?.(undefined);
        props.setOpen(false);
      }
      else {
        event.stopPropagation();
        event.preventDefault();
      }
    }
  }

  createEffect(() => {
    if (props.open()) {
      if (dialog) {
        if (props.modal) {
          dialog.showModal();
        }
        else {
          dialog.show();
        }
        window.addEventListener('keydown', HandleEscape);
      }
    }
    else {
      if (dialog) {
        dialog.close();
        window.removeEventListener('keydown', HandleEscape);
      }
    }
  });

  function onClose() {
    props.setOpen(false);
  };

  onMount(() => {
    if (props.moveable) {
      const header = frame?.querySelector('header');
      if (header instanceof HTMLElement) {
        // hook up
        header.addEventListener('mousedown', StartDrag);
      }
    }
  }); 

  const computed_style = (): JSX.CSSProperties => {

    const style: JSX.CSSProperties = {};

    const pos = layout();
    if (pos) {
      style.position = 'absolute';
      style.margin = '0';
      style.transform = 'translateZ(0)';
      style.top = `${pos.y}px`;
      style.left = `${pos.x}px`;
    }

    const s = size();
    if (s) {
      style.position = 'absolute';
      style.margin = '0';

      // you can set width and height to 0,
      // in which case they'll float. some dialogs
      // may need to resize themselves depending
      // on content

      if (s.width > 0) {
        style.width = `${s.width}px`;
      }
      if (s.height > 0) {
        style.height = `${s.height}px`;
      }

    }

    return style;
  };

  let drag_info = {
    position: { x: 0, y: 0 },
    mouse: { x: 0, y: 0 },
    size: { width: 0, height: 0 },
  };

  function InitDrag(event: MouseEvent) {
    if (frame) {
      const bounds = frame.getBoundingClientRect();
      drag_info.position = {x: bounds.x, y: bounds.y};
      drag_info.mouse = {x: event.clientX, y: event.clientY};
      drag_info.size = {width: bounds.width, height: bounds.height};
      setLayout({...drag_info.position});
      setSize({...drag_info.size});
    }
  }

  function StartResize(event: MouseEvent) {
    InitDrag(event);
    setDragging('resize');
  }
  
  function StartDrag(event: MouseEvent) {
    InitDrag(event);
    setDragging('move');
  }

  function EndDrag(event: MouseEvent) {
    setDragging(false);
  }

  function MouseMove(event: MouseEvent) {
    const drag = dragging();
    if (drag) {    
      if (!event.buttons) {
        EndDrag(event);
      }
      else {
        if (drag === 'move') {
          setLayout({ 
            x: drag_info.position.x + event.clientX - drag_info.mouse.x,
            y: drag_info.position.y + event.clientY - drag_info.mouse.y,
          });
        }
        else if (drag === 'resize') {
          setSize({
            width: drag_info.size.width + event.clientX - drag_info.mouse.x,
            height: drag_info.size.height + event.clientY - drag_info.mouse.y,
          })
        }
      }
    }
  }

  function PropClasses(list?: string) {
    const result: Record<string, boolean> = {};
    if (list) {
      const parts = list.split(/\s+/g);
      for (const part of parts) {
        result[part] = true;
      }
    }
    return result;
  }

  return (
    <>
      <dialog ref={dialog} classList={{
          'riskamp-dialog': true,
          [style['moveable']]: props.moveable,
          [style['resizable']]: props.resizeable,
          ...(PropClasses(props.class))
        }}>

        <div classList={{
            [style.frame]: true,
            frame: true,
          }}
          style={computed_style()}
          ref={frame} 
          onclose={onClose} >
          {props.children}

          {/* close box and help button, both optional */}
          <div classList={{
            [style['dialog-buttons']]: true,
            'dialog-buttons': true,
            }}>
            <Show when={props.help}>
              <button class={style['help-button']} onclick={() => OpenExternal(props.help as string)}
                      ref={(el) => (el.innerHTML = bootstrap_icons.question_circle || '')}/>
            </Show>
            <Show when={props.closebox}>
              <button class={style['close-box']} onclick={() => props.setOpen(false)} 
                      ref={(el) => (el.innerHTML = bootstrap_icons.x_lg || '')}/>
            </Show>
          </div>

          <Show when={props.resizeable}>
            <button class={style['resize-grip']} 
              onmousedown={StartResize} />
          </Show>

        </div>

        <div classList={{
            [style['mouse-mask']]: true,
            [style.visible]: !!dragging(),
            [style.move]: dragging() === 'move',
            [style.resize]: dragging() === 'resize',
          }} 
          onmouseup={EndDrag}
          onmousemove={MouseMove}
          ref={mouse_mask} />

      </dialog>

    </>
  );

}
