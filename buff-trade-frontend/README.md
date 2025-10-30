This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

### Environment variables

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Fill in the required values in `.env.local`:
   - `HELIUS_API_KEY` (for server-side usage)
   - `NEXT_PUBLIC_HELIUS_API_KEY` (for client-side usage)
   - `OKX_API_KEY`
   - `OKX_SECRET_KEY`
   - `OKX_API_PASSPHRASE`
   - `OKX_PROJECT_ID`

⚠️ **SECURITY WARNING**:

- Use `.env.local` for actual API keys (automatically ignored by git)
- Never commit real API keys to git repositories
- If a real key was accidentally committed, immediately:
  1. Rotate/regenerate the API key
  2. Purge it from git history
  3. Review commit logs for exposure

## Development Commands

### Network Configuration

This project supports both **Solana Devnet** and **Solana Mainnet** environments:

```bash
# Development with Solana Devnet (for testing)
yarn dev

# Production with Solana Mainnet (for real transactions)
yarn prod
```

### Command Differences

| Command     | Network            | Use Case                 | SOL Cost     |
| ----------- | ------------------ | ------------------------ | ------------ |
| `yarn dev`  | **Solana Devnet**  | Testing, Development     | **Free**     |
| `yarn prod` | **Solana Mainnet** | Production, Real Trading | **Real SOL** |

### Network Connection Details

- **`yarn dev`** → **Solana Devnet**

  - RPC: `https://api.devnet.solana.com` or `https://devnet.helius-rpc.com`
  - Genesis Hash: `EtWTRABZaYq6iMfeYKouRu166VU2xqa1`
  - Free SOL available from faucets
  - Safe for testing all features

- **`yarn prod`** → **Solana Mainnet**
  - RPC: `https://solana-mainnet.g.alchemy.com` or `https://mainnet.helius-rpc.com`
  - Genesis Hash: `5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d`
  - Requires real SOL for transactions
  - Live trading environment

### Getting Started

First, run the development server:

```bash
# For testing (recommended)
yarn dev

# For production
yarn prod
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Testing on Devnet

When using `yarn dev`:

- ✅ **Free SOL**: Get free SOL from Devnet faucets
- ✅ **Test Tokens**: Create and trade tokens without cost
- ✅ **Safe Testing**: No real money involved
- ✅ **Full Features**: All DEX functionality available

### Production on Mainnet

When using `yarn prod`:

- ⚠️ **Real SOL**: Requires actual SOL for transactions
- ⚠️ **Real Tokens**: Creates actual tradeable tokens
- ⚠️ **Real Money**: All transactions cost real SOL

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
