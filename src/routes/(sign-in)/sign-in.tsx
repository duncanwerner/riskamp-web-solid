import { Title } from "@solidjs/meta";
import * as auth from '~/lib/auth';

import style from './sign-in.module.css';
import { goto } from '~/lib/navigate';
import { Show } from 'solid-js';
import { Navigate } from '@solidjs/router';

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
      <main>
        <Title>Sign in</Title>
        <form class={style.form} onsubmit={HandleSubmit}>
          <input name="username" autocomplete='username' type="text" placeholder="username" />
          <input name="password" autocomplete='current-password' type="password" />
          <button type="submit">Sign in</button>
        </form>
      </main>
    </Show>
  );
}


