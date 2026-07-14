/** @type {import('next').NextConfig} */
const nextConfig = {
  // W13 — @react-pdf/renderer est utilisé CÔTÉ SERVEUR (renderToBuffer pour
  // les pièces jointes email). Son reconciler exige le build React complet :
  // externalisé pour être requis par Node (condition par défaut) et non
  // bundlé dans la couche RSC (condition react-server → crash interne).
  serverExternalPackages: ["@react-pdf/renderer"],
  images: {
    remotePatterns: [
      { hostname: "images.pexels.com" },
      { hostname: "res.cloudinary.com" },
      { hostname: "http://www.w3.org/2000/svg"}
    ],
  },
};

export default nextConfig;
