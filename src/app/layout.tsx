import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ThemeStyle from "@/components/ThemeStyle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tableau de Bord de Gestion de l'École LS_school",
  description: "Système de Gestion Scolaire LS_school",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ThemeStyle />
        <main>
          {children}
          <ToastContainer position="bottom-right" theme="dark" />
        </main>
      </body>
    </html>
  );
}
