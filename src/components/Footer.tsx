export const Footer = () => (
  <footer className="text-center text-sm text-slate-500 py-6">
    Game Asset Vault · v{import.meta.env.VITE_APP_VERSION ?? "0.1.0"}
  </footer>
);
