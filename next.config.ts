import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const proxyRules = [
  {
    source: "/api/:path*",
    destination: `${apiUrl}/api/:path*`,
  },
  {
    source: "/uploads/:path*",
    destination: `${apiUrl}/uploads/:path*`,
  },
] as const;

const basePath = "/panel";

const appRoutes = [
  "add-package",
  "login",
  "signup",
  "verify-email",
  "packages",
  "blogs",
  "settings",
  "pages",
  "enquiry",
  "promotions",
  "user-management",
  "suppliers",
];

const nextConfig: NextConfig = {
  basePath,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  async redirects() {
    return [
      // Visiting / (e.g. localhost:3000) should land on the app under basePath
      {
        source: "/",
        destination: basePath,
        permanent: false,
        basePath: false,
      },
      // history.replaceState and typed URLs omit /panel and otherwise 404
      ...appRoutes.flatMap((route) => [
        {
          source: `/${route}`,
          destination: `${basePath}/${route}`,
          permanent: false,
          basePath: false as const,
        },
        {
          source: `/${route}/:path*`,
          destination: `${basePath}/${route}/:path*`,
          permanent: false,
          basePath: false as const,
        },
      ]),
    ];
  },
  async rewrites() {
    return [
      // fetch("/api/...") hits the origin root, not /panel/api/...
      ...proxyRules.map((rule) => ({ ...rule, basePath: false as const })),
      // Keep /panel/api/... working for anything that includes the basePath
      ...proxyRules,
    ];
  },
};

export default nextConfig;
