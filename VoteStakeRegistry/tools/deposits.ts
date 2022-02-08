import { VsrClient } from '@blockworks-foundation/voter-stake-registry-client'
import {
  BN,
  EventParser,
} from '@blockworks-foundation/voter-stake-registry-client/node_modules/@project-serum/anchor'
import { simulateTransaction } from '@solana/spl-governance'
import {
  TransactionInstruction,
  PublicKey,
  Transaction,
  Connection,
} from '@solana/web3.js'
import { tryGetMint } from '@utils/tokens'
import {
  getRegistrarPDA,
  getVoterPDA,
  unusedMintPk,
  DepositWithMintAccount,
  LockupType,
} from 'VoteStakeRegistry/sdk/accounts'
import { tryGetVoter, tryGetRegistrar } from 'VoteStakeRegistry/sdk/api'
import { DAYS_PER_MONTH } from './dateTools'
import { MONTHLY } from './types'

export const getDeposits = async ({
  isUsed = true,
  realmPk,
  walletPk,
  communityMintPk,
  client,
  connection,
}: {
  isUsed?: boolean | undefined
  realmPk: PublicKey
  walletPk: PublicKey
  communityMintPk: PublicKey
  client: VsrClient
  connection: Connection
}) => {
  const clientProgramId = client.program.programId
  const { registrar } = await getRegistrarPDA(
    realmPk,
    communityMintPk,
    clientProgramId
  )
  const { voter } = await getVoterPDA(registrar, walletPk, clientProgramId)
  const existingVoter = await tryGetVoter(voter, client)
  const existingRegistrar = await tryGetRegistrar(registrar, client)
  const mintCfgs = existingRegistrar?.votingMints
  const mints = {}
  if (mintCfgs) {
    for (const i of mintCfgs) {
      if (i.mint.toBase58() !== unusedMintPk) {
        const mint = await tryGetMint(connection, i.mint)
        mints[i.mint.toBase58()] = mint
      }
    }
  }
  if (existingVoter) {
    let votingPower = new BN(0)
    let votingPowerFromDeposits = new BN(0)
    let deposits = existingVoter.deposits
      .map(
        (x, idx) =>
          ({
            ...x,
            mint: mints[mintCfgs![x.votingMintConfigIdx].mint.toBase58()],
            index: idx,
          } as DepositWithMintAccount)
      )
      .filter((x) => typeof isUsed === 'undefined' || x.isUsed === isUsed)
    const usedDeposits = deposits.filter((x) => x.isUsed)
    const isThereAnyUsedDeposits = usedDeposits.length
    if (isThereAnyUsedDeposits) {
      const instructions: TransactionInstruction[] = []
      // The wallet can be any existing account for the simulation
      // Note: when running a local validator ensure the account is copied from devnet: --clone ENmcpFCpxN1CqyUjuog9yyUVfdXBKF3LVCwLr7grJZpk -ud
      const walletPk = new PublicKey(
        'ENmcpFCpxN1CqyUjuog9yyUVfdXBKF3LVCwLr7grJZpk'
      )
      const isThereIndexHigherIndexHigherThen16 =
        typeof usedDeposits.find((x) => x.index > 15) !== 'undefined'

      instructions.push(
        client.program.instruction.logVoterInfo(0, {
          accounts: {
            registrar,
            voter,
          },
        })
      )
      if (isThereIndexHigherIndexHigherThen16) {
        instructions.push(
          client.program.instruction.logVoterInfo(16, {
            accounts: {
              registrar,
              voter,
            },
          })
        )
      }

      const transaction = new Transaction({ feePayer: walletPk })
      transaction.add(...instructions)
      const getMoreDepositInfo = await simulateTransaction(
        connection,
        transaction,
        'recent'
      )
      //because we switch wallet in here we can't use rpc from npm module
      //anchor dont allow to switch wallets inside existing client
      //parse events response as anchor do
      const events: any = []
      const parser = new EventParser(
        client.program.programId,
        client.program.coder
      )
      parser.parseLogs(getMoreDepositInfo.value.logs!, (event) => {
        events.push(event)
      })
      const DEPOSIT_EVENT_NAME = 'DepositEntryInfo'
      const VOTER_INFO_EVENT_NAME = 'VoterInfo'
      const depositsInfo = events.filter((x) => x.name === DEPOSIT_EVENT_NAME)
      const votingPowerEntry = events.find(
        (x) => x.name === VOTER_INFO_EVENT_NAME
      )
      deposits = deposits.map((x) => {
        const additionalInfoData = depositsInfo.find(
          (info) => info.data.depositEntryIndex === x.index
        ).data

        x.currentlyLocked = additionalInfoData.locking?.amount || new BN(0)
        x.available = additionalInfoData.unlocked
        x.vestingRate = additionalInfoData.locking?.vesting?.rate || new BN(0)
        return x
      })
      if (
        votingPowerEntry &&
        !votingPowerEntry.data.votingPowerUnlockedOnly.isZero()
      ) {
        votingPowerFromDeposits = votingPowerEntry.data.votingPowerUnlockedOnly
      }
      if (votingPowerEntry && !votingPowerEntry.data.votingPower.isZero()) {
        votingPower = votingPowerEntry.data.votingPower
      }
    }
    return { votingPower, deposits, votingPowerFromDeposits }
  }
  return {
    votingPower: new BN(0),
    deposits: [],
    votingPowerFromDeposits: new BN(0),
  }
}

export const calcMultiplier = ({
  depositScaledFactor,
  lockupScaledFactor,
  lockupSecs,
  lockupSaturationSecs,
}: {
  depositScaledFactor: number
  lockupScaledFactor: number
  lockupSecs: number
  lockupSaturationSecs: number
}) => {
  const calc =
    (depositScaledFactor +
      (lockupScaledFactor * Math.min(lockupSecs, lockupSaturationSecs)) /
        lockupSaturationSecs) /
    depositScaledFactor
  return calc
}

export const getPeriod = (
  lockUpPeriodInDays: number,
  lockupKind: LockupType
) => {
  //in case we do monthly close up we pass months not days.
  const period =
    lockupKind !== MONTHLY
      ? lockUpPeriodInDays
      : lockUpPeriodInDays / DAYS_PER_MONTH
  const maxMonthsNumber = 72
  const daysLimit = 2190
  //additional prevention of lockup being to high in case of monthly lockup 72 months as 6 years
  //in case of other types 2190 days as 6 years
  if (lockupKind === MONTHLY && period > maxMonthsNumber) {
    throw 'lockup period is to hight'
  }
  if (lockupKind !== MONTHLY && period > daysLimit) {
    throw 'lockup period is to hight'
  }
  return period
}
