
import { Navigate } from '@solidjs/router';
import { children, ParentProps, Show } from 'solid-js';
import { Toolbar, type Props as ToolbarProps } from '~/components/toolbar/account-toolbar';
import { I18N } from '~/i18n/i18n';
import * as auth from '~/lib/auth';

type Props = ToolbarProps & {
  class?: string;
}

export function Page(props: ParentProps<Props>) {

  const classes: Record<string, boolean> = {
    'account-page': true,
  };

  if (props.class) {
    classes[props.class] = true;
  }

  return <>
      <Show when={auth.loggedIn()} fallback={<Navigate href="/" />}>
        <main classList={classes}>
          <Toolbar title='documents-page.title' account-info/>
          {props.children}          
        </main>
      </Show>
    </>;
}

