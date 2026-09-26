import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/playfair-display/400.css";
import "@fontsource/playfair-display/500.css";
import "@fontsource/playfair-display/600.css";
import "@fontsource/playfair-display/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/800.css";
import "@fontsource/noto-sans-georgian/400.css";
import "@fontsource/noto-sans-georgian/500.css";
import "@fontsource/noto-sans-georgian/600.css";
import "@fontsource/noto-sans-georgian/700.css";
import "./globals.css";
import "./onyx-landing.css";
import Pwa from "./pwa";
import { LocaleProvider } from "./i18n";

export const metadata: Metadata = {
  title: {
    default: "Onyx Barbershop — Sharp Style. Simple Luxury.",
    template: "%s | Onyx Barbershop",
  },
  description:
    "Expert barbers. Premium grooming. A modern barbershop built for the modern gentleman.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Onyx",
  },
  icons: { icon: "/onyx-logo.png", apple: "/onyx-logo.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0A09",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka">
      <body>
        <LocaleProvider>
          {children}
          <Pwa />
        </LocaleProvider>
      </body>
    </html>
  );
}
