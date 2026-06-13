import { Title } from "@solidjs/meta";
import * as auth from '~/lib/auth';

import style from './sign-in.module.css';
import { goto } from '~/lib/navigate';
import { Show } from 'solid-js';
import { Navigate } from '@solidjs/router';

import { Toolbar } from '~/components/toolbar/account-toolbar';
import { t } from '~/i18n/i18n';

export default function SignIn() {

  const HandleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    
    if (data.username && data.password) {
      auth.Login(data.username as string, data.password as string).then(result => {
        console.info("result", result);
        if (result) {
          goto('/');
        }
      });
    }

  };

  return (
    <Show when={!auth.loggedIn()} fallback={<Navigate href="/" />}>
      <main class="fixed">
        <Toolbar title='sign-in.page.title' />
        <Title>{t('sign-in.page.title')}</Title>

        <div class={style.layout}>

          <form class={style.form} onsubmit={HandleSubmit}>
            <input class="input" 
                  name="username" 
                  autocomplete='username' 
                  type="text" 
                  placeholder={t('sign-in.form.username.placeholder')} />
            <input class="input" 
                  name="password" 
                  autocomplete='current-password' 
                  type="password" 
                  placeholder={t('sign-in.form.password.placeholder')} />
            <button class="control-button" type="submit">Sign in</button>
          </form>

          <hr/>

          <div>
            <ul>
              <li>Forgot password</li>
              <li>Create account</li>
            </ul>
          </div>

        </div>

      </main>
    </Show>
  );
}


