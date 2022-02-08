import { VsrClient } from '@blockworks-foundation/voter-stake-registry-client'
import { BN, Provider, Wallet } from '@project-serum/anchor'
import { AccountMetaData } from '@solana/spl-governance'
import { Connection, Keypair } from '@solana/web3.js'
import { fmtMintAmount } from '@tools/sdk/units'
import tokenService from '@utils/services/token'
import { tryGetMint } from '@utils/tokens'
import { tryGetRegistrar, tryGetVoter } from 'VoteStakeRegistry/sdk/api'
import { DAYS_PER_MONTH, SECS_PER_DAY } from 'VoteStakeRegistry/tools/dateTools'

export const VOTE_STAKE_REGISTRY_INSTRUCTIONS = {
  '4Q6WW2ouZ6V3iaNm56MTd5n2tnTm4C5fiH8miFHnAFHo': {
    111: {
      name: 'Clawback',
      accounts: [
        { name: 'Registrar' },
        { name: 'Realm authority' },
        { name: 'Voter' },
        { name: 'Token owner record' },
        { name: 'Vault' },
        { name: 'Destination' },
      ],
      getDataUI: async (
        connection: Connection,
        data: Uint8Array,
        accounts: AccountMetaData[]
      ) => {
        try {
          const options = Provider.defaultOptions()
          const provider = new Provider(
            connection,
            new Wallet(Keypair.generate()),
            options
          )
          const vsrClient = await VsrClient.connect(provider)
          const decodedInstruction = vsrClient.program.coder.instruction.decode(
            Buffer.from(data)
          )
          const existingVoter = await tryGetVoter(accounts[2].pubkey, vsrClient)
          const deposit =
            //@ts-ignore
            existingVoter?.deposits[decodedInstruction?.data.depositEntryIndex]
          const existingRegistrar = await tryGetRegistrar(
            accounts[0].pubkey,
            vsrClient
          )
          const mintPk =
            existingRegistrar?.votingMints[deposit!.votingMintConfigIdx].mint
          const mint = await tryGetMint(connection, mintPk!)

          return (
            <div className="space-y-3">
              <div>Wallet: {existingVoter?.voterAuthority.toBase58()}</div>
              <div>
                Clawback amount:{' '}
                {fmtMintAmount(mint?.account, deposit!.amountDepositedNative)}
              </div>
            </div>
          )
        } catch (e) {
          console.log(e)
          return <div>{JSON.stringify(data)}</div>
        }
      },
    },
    145: {
      name: 'Grant',
      accounts: [
        { name: 'Registrar' },
        { name: 'Voter' },
        { name: 'Voter Authority' },
        { name: 'Voter Weight Record' },
        { name: 'Vault' },
        { name: 'Deposit Token' },
        { name: 'Token Authority' },
        { name: 'Grant Authority' },
        { name: 'Payer' },
        { name: 'Deposit Mint' },
      ],
      getDataUI: async (
        connection: Connection,
        data: Uint8Array,
        accounts: AccountMetaData[]
      ) => {
        try {
          const options = Provider.defaultOptions()
          const provider = new Provider(
            connection,
            new Wallet(Keypair.generate()),
            options
          )
          const vsrClient = await VsrClient.connect(provider)
          const decodedInstruction = vsrClient.program.coder.instruction.decode(
            Buffer.from(data)
          )
          const mintPk = accounts[9].pubkey
          const mint = await tryGetMint(connection, mintPk!)
          // @ts-ignore
          const lockupKind = Object.keys(decodedInstruction.data.kind)[0]
          // @ts-ignore
          const periods = decodedInstruction.data.periods
          const logoUrl = tokenService.getTokenInfo(mintPk.toBase58())?.logoURI
          return (
            <>
              {decodedInstruction ? (
                <div className="space-y-3">
                  <div>Grant to: {accounts[8].pubkey.toBase58()}</div>
                  <div>Lock type: {lockupKind}</div>
                  <div>
                    Amount:{' '}
                    {fmtMintAmount(
                      mint!.account,
                      // @ts-ignore
                      decodedInstruction.data.amount
                    )}
                  </div>
                  {lockupKind === 'monthly' && (
                    <div>
                      Vested:{' '}
                      {fmtMintAmount(
                        mint!.account,
                        // @ts-ignore
                        decodedInstruction.data.amount.div(new BN(periods))
                      )}{' '}
                      p/m
                    </div>
                  )}
                  {logoUrl && (
                    <div>
                      <img className="w-5 h-5" src={logoUrl}></img>
                    </div>
                  )}
                  <div>
                    Start date:{' '}
                    {new Date(
                      // @ts-ignore
                      decodedInstruction.data.startTs.toNumber() * 1000
                    ).toDateString()}
                  </div>
                  <div>
                    End date:{' '}
                    {new Date(
                      //   @ts-ignore
                      decodedInstruction.data.startTs.toNumber() * 1000 +
                        (lockupKind === 'monthly'
                          ? periods * DAYS_PER_MONTH * SECS_PER_DAY * 1000
                          : periods * SECS_PER_DAY * 1000)
                    ).toDateString()}
                  </div>
                  <div>
                    Dao can clawback: {/* @ts-ignore */}
                    {decodedInstruction.data.allowClawback ? 'Yes' : 'No'}
                  </div>
                  <div>Only grantee can execute instruction</div>
                </div>
              ) : (
                <div>{JSON.stringify(data)}</div>
              )}
            </>
          )
        } catch (e) {
          console.log(e)
          return <div>{JSON.stringify(data)}</div>
        }
      },
    },
  },
}
