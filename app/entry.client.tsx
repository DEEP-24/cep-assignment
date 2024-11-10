import { ClientProvider } from "@mantine/remix";
import { RemixBrowser } from "@remix-run/react";
import { startTransition } from "react";
import { hydrateRoot } from "react-dom/client";

startTransition(() => {
  hydrateRoot(
    document,
    <ClientProvider>
      <RemixBrowser />
    </ClientProvider>
  );
});
