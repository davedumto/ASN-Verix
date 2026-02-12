# Deploy Test USDC to SKALE Testnet

## Option 1: Quick Deploy with Remix IDE

1. **Open Remix**: https://remix.ethereum.org/
2. **Create new file**: `TestUSDC.sol`
3. **Copy contract code** from `contracts/TestUSDC.sol`
4. **Compile**:
   - Compiler version: 0.8.20+
   - Enable optimization
5. **Add SKALE Testnet to MetaMask**:
   ```
   Network Name: SKALE Chaos Testnet
   RPC URL: https://staging-v3.skalenodes.com/v1/staging-fast-active-bellatrix
   Chain ID: 1351057110
   Currency: sFUEL
   ```
6. **Get sFUEL**:
   - Visit: https://staging-faucet.skale.network/
   - Enter your address
   - Request sFUEL (for gas)
7. **Deploy Contract**:
   - Connect MetaMask to Remix
   - Select "Injected Provider - MetaMask"
   - Click "Deploy"
   - Confirm transaction
8. **Copy Contract Address**:
   - After deployment, copy the contract address
   - Add to `.env.local` as `USDC_CONTRACT_ADDRESS`

## Option 2: Use Hardhat/Foundry (Advanced)

```bash
# Install Hardhat
npm install --save-dev hardhat @openzeppelin/contracts

# Create hardhat config
npx hardhat init

# Deploy script would go here
```

## After Deployment

1. Update `.env.local`:
   ```env
   USDC_CONTRACT_ADDRESS=0x... # Your deployed contract address
   ```

2. Test minting:
   ```javascript
   // In Remix, call the mint function
   mint("0xYourAddress", 1000000000) // Mint 1000 USDC (6 decimals)
   ```

3. Verify coordinator can access it:
   ```bash
   npm run dev
   # Check wallet balance API
   curl http://localhost:3000/api/wallet/balance
   ```
