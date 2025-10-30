/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SOLANA_NETWORK: "mainnet",
    NEXT_PUBLIC_HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    OKX_API_KEY: process.env.OKX_API_KEY,
    OKX_SECRET_KEY: process.env.OKX_SECRET_KEY,
    OKX_PROJECT_ID: process.env.OKX_PROJECT_ID,
    OKX_API_PASSPHRASE: process.env.OKX_API_PASSPHRASE,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dev-proto-launch.s3.ap-northeast-2.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ipfs.io",
        port: "",
        pathname: "/ipfs/**",
      },
      {
        protocol: "https",
        hostname: "static.buff.trade",
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      use: ["@svgr/webpack"],
    });
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  // Vercel 배포를 위한 설정
  // output: "standalone", // Vercel에서는 이 설정이 필요하지 않음
  experimental: {
    serverComponentsExternalPackages: ["pino-pretty", "lokijs", "encoding"],
  },
  // rewrites: async () => {
  //   return [
  //     {
  //       source: "/api/mint",
  //       destination: "http://localhost:3000/api/address/create",
  //     },
  //     {
  //       source: "/api/mint-with-bond",
  //       destination: "http://localhost:3000/api/address/create-bond",
  //     },
  //     {
  //       source: "/api/confirm",
  //       destination: "http://localhost:3000/api/address/confirm",
  //     },
  //     {
  //       source: "/api/greduate/quote",
  //       destination: "/api/get-quote",
  //     },
  //     {
  //       source: "/api/greduate/instruction",
  //       destination: "/api/get-instruction",
  //     },
  //   ];
  // },
};

export default nextConfig;
