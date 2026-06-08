
import { InteractiveDialog, type Props as InteractiveDialogProps } from '~/components/dialogs/interactive-dialog/interactive-dialog';
import style from './test-dialog.module.css';

export function TestDialog(props: InteractiveDialogProps) {
  return <>
    <InteractiveDialog {...props} help="feeny">

      <header>
        Insert function
      </header>

      <section>
        <div class={style.grid}>
          
          <span>hale</span>
          <div class="reference-editor tc" 
                          data-selection-target 
                          tabindex="0"
                          role="textbox" 
                          spellcheck="false"
                          contenteditable="true">"bort"</div>

          <span>bopp</span>
          <div class="reference-editor tc" 
                          data-selection-target 
                          tabindex="0"
                          role="textbox" 
                          spellcheck="false"
                          contenteditable="true"></div>

        </div>
      </section>

      <footer>
        JIMS
      </footer>

    </InteractiveDialog>
  </>;
}
