
import { onMount, createSignal, Signal, Accessor, Setter } from "solid-js";
import { type EmbeddedSpreadsheet, type MCEmbeddedSpreadsheetOptions, RiskAMPWeb } from 'riskamp-web';
import { type SpreadsheetType } from '~/lib/spreadsheet-type';

interface Props {
  fill?: boolean;

  /** setter */
  setSheet: Setter<SpreadsheetType|undefined>;

  /** callback for the insert function button */
  'function-handler'?: () => void;

}

export function Spreadsheet(props: Props) {

  let container: HTMLDivElement|undefined;
  let sheet: EmbeddedSpreadsheet;

  onMount(() => {
    if (container) {

      const options: MCEmbeddedSpreadsheetOptions & { insert_function_button?: boolean } = {
        container,
        stats: true,
        scale_control: true,
        scale: .95,
        add_tab: true,
        expand: true,
        dnd: true,
        expand_formula_button: true,
        resizable: false,
        persist_scale: true,
        insert_function_button: true,
        local_storage: false, // true, // FIXME
        toolbar: false,
        collapsed: true,
        complex: 'on',
        lhs: true,
        lv: true,
        toll_initial_load: true,
      };

      sheet = RiskAMPWeb.CreateSpreadsheet(options);
      sheet.EnsureChartsLib();

      sheet.ready.then(() => {
        props.setSheet(sheet as SpreadsheetType);
      });

      (self as any).sheet = sheet; // DEV

      // hide sidebar button

      let element = container.querySelector('.treb-toggle-sidebar-button');
      if (element instanceof HTMLElement) {
        element.remove();
      }

      const fx = props['function-handler'];
      if (fx) {
        element = container.querySelector('.treb-insert-function-button');
        if (element instanceof HTMLElement) {
          element.addEventListener('click', fx);
        }
      }

    }
  });

  return (
    <div classList={{
      'spreadsheet-container-fill': !!props.fill,
      'spreadsheet-container': !props.fill,
    }} ref={container}></div>
  );

}

