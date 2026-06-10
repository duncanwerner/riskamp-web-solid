import { MetaProvider, Title } from "@solidjs/meta";
import { Router, RouteSectionProps } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { onMount, Suspense } from "solid-js";

import "./app.css";
import "./reset.css";
import '~/style/riskamp-dialog.css';
import '~/style/controls.css';
import '~/style/utility.css';
import '~/style/grid-table.css';

import { Spinner } from '~/components/spinner/spinner';
import { useNavigate } from '@solidjs/router';
import { setNavigator } from '~/lib/navigate';
import { InitAppData } from './lib/app-data';



function Root(props: RouteSectionProps) {
  
  setNavigator(useNavigate());

  onMount(() => {
    InitAppData();
  });

  return (
    <MetaProvider>
      <Title>RiskAMP Web</Title>
      <Suspense>{props.children}</Suspense>
      <Spinner />
    </MetaProvider>
  );
}

export default function App() {
  return (
    <Router root={Root}>
      <FileRoutes />
    </Router>
  );
}
