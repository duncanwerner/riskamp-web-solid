
import { Component, createSignal, mergeProps, onMount, ParentProps, Signal } from 'solid-js'

// import using css modules, will scope
import style from "./splitter.module.css";

interface Props {

  /** initial split if you let splitter handle its own split (you are not using bind) */
  initial?: number;

  /** width of the splitter element. we'll draw a line in the middle using --splitter-color */
  'splitter-width': number;

  /** min value */
  min?: number;

  /** max value */
  max?: number;

  /** threshold; above this value we hide the right panel */
  threshold: number;

  /** optionally pass in your own signal pair to control the split */
  bind?: Signal<number>; // ReturnType<typeof createSignal<number>>;

  /** split vertically (the panels are vertically stacked) */
  vertical?: boolean;

}

const default_props: Props = {
  'splitter-width': 31,
  threshold: 100,
};

export const Splitter: Component<ParentProps<Partial<Props>>> = (props) => {

  const resolved = mergeProps(
    default_props, 
    props,
  );

  const [split, setSplit] = props.bind || createSignal(resolved.initial ?? 50);
  const [dragging, setDragging] = createSignal(false);

  let mouse_mask: HTMLDivElement|undefined;
  let container: HTMLDivElement|undefined;

  const computed_style = () => {
    if (props.vertical) {
      if (split() > resolved.threshold) {
        return {
          'grid-template-rows': 
            `1fr 0px 0px`,
        };
      }
      return {
        'grid-template-rows': `calc(${split()}% - ${resolved['splitter-width']/2}px) ${resolved['splitter-width']}px 1fr`,
      };
    }
    else {
      if (split() > resolved.threshold) {
        return {
          'grid-template-columns': 
            `1fr 0px 0px`,
        };
      }
      return {
        'grid-template-columns': `calc(${split()}% - ${resolved['splitter-width']/2}px) ${resolved['splitter-width']}px 1fr`,
      };
    }
  };

  const right_hidden = () => (split() > resolved.threshold);
  const splitter_hidden = () => right_hidden();

  let container_bounds = {
    x: 0, width: 0,
    y: 0, height: 0,
  };

  let delta = 0;

  function StartDrag(event: MouseEvent) {
    if (container) {
      const bounds = container.getBoundingClientRect();
      container_bounds.x = bounds.x;
      container_bounds.y = bounds.y;
      container_bounds.width = bounds.width;
      container_bounds.height = bounds.height;

      const p = props.vertical ? 
        (event.clientY - container_bounds.y) / container_bounds.height :
        (event.clientX - container_bounds.x) / container_bounds.width ;

      delta = split() - (p * 100);
      setDragging(true);

    }
  }

  function EndDrag(event: MouseEvent) {
    setDragging(false);
  }

  function MouseMove(event: MouseEvent) {
    if (dragging()) {    
      if (!event.buttons) {
        EndDrag(event);
      }
      else {
        const p = props.vertical ?
          (event.clientY - container_bounds.y) / container_bounds.height :
          (event.clientX - container_bounds.x) / container_bounds.width ;
        setSplit(Math.min(resolved.max ?? 100, Math.max(resolved.min ?? 0, p * 100 + delta)));
      }
    }
  }

  return <>
    <div classList={{
      [style['splitter-container']]: true,
      [style['right-hidden']]: right_hidden(),
      [style['splitter-hidden']]: splitter_hidden(),
      [style.vertical]: props.vertical,
     }} style={computed_style()} ref={container}>
      {resolved.children}
      <div data-splitter 
          onMouseDown={(event) => StartDrag(event)}
          classList={{
            hot: dragging()
          }}
          >
      </div>
      <div classList={{
        [style['mouse-mask']]: true,
        [style.visible]: dragging(),
       }} 
       onmouseup={EndDrag}
       onmousemove={MouseMove}
       ref={mouse_mask}></div>
    </div>
  </>;
};

