import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tableau de Bord de Gestion de l'École LS_school",
  description: "Système de Gestion Scolaire LS_school",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <body className={inter.className}>
          {children} <ToastContainer position="bottom-right" theme="dark" />{" "}
        </body>
      </html>
    </ClerkProvider>
  );
}
