const Stellar = require('stellar-sdk')
const rp = require('request-promise')

const fs = require('fs')

const server = new Stellar.Server('https://horizon-testnet.stellar.org')
Stellar.Network.useTestNetwork();

async function main() {
  const [pairA, pairB] = await loadOrGeneratePairs('./keys.json')
  console.log('Before: ')
  const [accountA, accountB] = await loadAccounts(pairA, pairB)

  // NOTE: setInterval doesn't work here
  const startTime = Date.now()

  let elapsed = Date.now() - startTime
  while (elapsed < 20000) {
    console.log('elapsed: ', elapsed)
    console.time()
    const transactionResult = await sendMoney(pairA, pairB, 0.0000001)
    console.timeEnd()

    console.log('After: ')
    elapsed = Date.now() - startTime
    await loadAccounts(pairA, pairB)
  }
}
main()

async function sendMoney(srcKey, destKey, amount, srcAccount) {
  srcAccount = srcAccount || await server.loadAccount(srcKey.publicKey())
  const transaction = new Stellar.TransactionBuilder(srcAccount)
    .addOperation(Stellar.Operation.payment({
      destination: destKey.publicKey(),
      asset: Stellar.Asset.native(),
      amount: amount.toFixed(7),
    }))
    .build()
  transaction.sign(srcKey)
  return await server.submitTransaction(transaction)
}

async function loadOrGeneratePairs(filename) {
  const exists = fs.existsSync(filename)
  let pairA, pairB
  if (exists) {
    console.log('Keys already exist. Loading...')
    const keys = fs.readFileSync(filename, 'utf-8')

    const { _pairA, _pairB } = JSON.parse(keys)
    pairA = Stellar.Keypair.fromSecret(_pairA)
    pairB = Stellar.Keypair.fromSecret(_pairB)
  } else {
    console.log('No keys are saved. Generating and creating accounts...')
    // Dry up later
    pairA = Stellar.Keypair.random()
    pairB = Stellar.Keypair.random()
    fs.writeFileSync(filename, JSON.stringify({
      _pairA: pairA.secret(),
      _pairB: pairB.secret(),
    }))
    await _initKeys(pairA, pairB)
  }
  return [pairA, pairB]
}
async function _initKeys(...keyPairs) {
  return await Promise.all(keyPairs.map(keyPair => rp.get({
    uri: 'https://horizon-testnet.stellar.org/friendbot',
    qs: { addr: keyPair.publicKey() },
    json: true,
  })))
}

async function loadAccounts(...keyPairs) {
  const accounts = await Promise.all(keyPairs.map(keyPair =>
    server.loadAccount(keyPair.publicKey())
  ))
  accounts.forEach(account => {
    account.balances.forEach(balance => {
      console.log('Type:',  balance.asset_type, ', Balance:', balance.balance)  
    })
  })
  return accounts
}

// async buildEscrow(signerA, signerB) {

// }


/*
  Send initial amount into escrow with two signers.
    The "house" is the timer. It expects to be strooped every 30 seconds for
    25 minutes
    Or something, I don't fucking know
 */

// const newKey = Stellar.Keypair.random()
// const transaction = new Stellar.TransactionBuilder(ownerAccount)
//   .addOperation(Stellar.Operation.createAccount({
//     destination: escrowPubKey,
//     startingBalance: '2.5',
//   }))
//   .build()

// let transaction = new Stellar.TransactionBuilder(escrowAccount)
//   .addOperation(Stellar.Operation.setOptions({
//     signer: {
//       ed25519PublicKey: houseKeypair.publicKey(),
//       weight: 1,
//     },
//   }))
//   .addOperation(Stellar.Operation.setOptions({
//     masterWeight: 0,
//     lowThreshold: 2, 
//     medThreshold: 2,
//     highThreshold: 2,
//     signer: {
//       ed25519PublicKey: contractorKeypair.publicKey(),
//       weight: 1,
//     },
//   }))
//   .build()

// transaction.sign(ownerKeypair)



/*
  Okay, here's a new strooper approach.

    


 */