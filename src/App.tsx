import { useEffect } from "react";
import { StoreProvider, useStore } from "./store";
import { Layout } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Quotes from "./pages/Quotes";
import EditorPage from "./pages/Editor";
import PreviewPage from "./pages/Preview";
import Clients from "./pages/Clients";
import Library from "./pages/Library";
import Templates from "./pages/Templates";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/Settings";

function Router() {
  const { route } = useStore();
  const key = route.page + (route.id ?? "") + (route.templateId ?? "") + (route.q ?? "");
  switch (route.page) {
    case "quotes":
      return <Quotes key={key} />;
    case "editor":
      return <EditorPage key={key} />;
    case "preview":
      return <PreviewPage key={key} />;
    case "clients":
      return <Clients key={key} />;
    case "library":
      return <Library key={key} />;
    case "templates":
      return <Templates key={key} />;
    case "reports":
      return <Reports key={key} />;
    case "settings":
      return <SettingsPage key={key} />;
    default:
      return <Dashboard key={key} />;
  }
}

function Shell() {
  useEffect(() => {
    if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          /* offline-first é progressivo — falha silenciosa */
        });
      });
    }
  }, []);

  return (
    <Layout>
      <Router />
    </Layout>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
