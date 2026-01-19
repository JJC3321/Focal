import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost:3000",
    "172.25.17.90:3000",
    "172.25.17.90",
  ],
};

export default nextConfig;
