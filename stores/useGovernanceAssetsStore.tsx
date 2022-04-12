import create, { State } from 'zustand'
import {
  getNativeTreasuryAddress,
  Governance,
  GovernanceAccountType,
  Realm,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-governance'
import { ProgramAccount } from '@solana/spl-governance'
import {
  DEFAULT_NFT_TREASURY_MINT,
  HIDDEN_GOVERNANCES,
  HIDDEN_TREASURES,
} from '@components/instructions/tools'
import {
  AccountInfoGen,
  getMultipleAccountInfoChunked,
  parseMintAccountData,
  parseTokenAccountData,
  TokenProgramAccount,
} from '@utils/tokens'
import { Connection, ParsedAccountData, PublicKey } from '@solana/web3.js'
import { AccountInfo, MintInfo } from '@solana/spl-token'
import { AccountInfo as AccountInfoGeneric } from '@solana/web3.js'
import { TokenAccountLayout } from '@blockworks-foundation/mango-client'
import tokenService from '@utils/services/token'
import { ConnectionContext } from '@utils/connection'
import axios from 'axios'
import {
  AccountType,
  AccountTypeMint,
  AccountTypeNFT,
  AccountTypeProgram,
  AccountTypeSol,
  AccountTypeToken,
  AssetAccount,
} from '@utils/uiTypes/assets'

const tokenAccountOwnerOffset = 32

interface SolAccInfo {
  governancePk: PublicKey
  acc: any
  nativeSolAddress: PublicKey
}
interface GovernanceAssetsStore extends State {
  governancesArray: ProgramAccount<Governance>[]
  governedTokenAccounts: AssetAccount[]
  assetAccounts: AssetAccount[]
  loadGovernedAccounts: boolean
  setGovernancesArray: (
    connection: ConnectionContext,
    realm: ProgramAccount<Realm>,
    governances: {
      [governance: string]: ProgramAccount<Governance>
    }
  ) => void
  getGovernedAccounts: (
    connection: ConnectionContext,
    realm: ProgramAccount<Realm>
  ) => void
  refetchGovernanceAccounts: (
    connection: ConnectionContext,
    realm: ProgramAccount<Realm>,
    governancePk: PublicKey
  ) => void
}

const defaultState = {
  governancesArray: [],
  assetAccounts: [],
  governedTokenAccounts: [],
  loadGovernedAccounts: false,
}

const useGovernanceAssetsStore = create<GovernanceAssetsStore>((set, _get) => ({
  ...defaultState,
  setGovernancesArray: (connection, realm, governances) => {
    const array = Object.keys(governances)
      .filter((gpk) => !HIDDEN_GOVERNANCES.has(gpk))
      .map((key) => governances[key])
    set((s) => {
      s.governancesArray = array
    })
    _get().getGovernedAccounts(connection, realm)
  },
  getGovernedAccounts: async (connection, realm) => {
    set((s) => {
      s.loadGovernedAccounts = true
      s.governedTokenAccounts = []
      s.assetAccounts = []
    })
    const governancesArray = _get().governancesArray
    const accounts = governancesArray.length
      ? await getAccountsForGovernances(connection, realm, governancesArray)
      : []
    set((s) => {
      s.governancesArray = governancesArray
      s.loadGovernedAccounts = false
      s.governedTokenAccounts = accounts.filter(
        (x) =>
          x.type === AccountType.TOKEN ||
          x.type === AccountType.NFT ||
          x.type === AccountType.SOL
      )
      s.assetAccounts = accounts
    })
  },
  refetchGovernanceAccounts: async (connection, realm, governancePk) => {
    set((s) => {
      s.loadGovernedAccounts = false
    })
    const governancesArray = _get().governancesArray.filter(
      (x) => x.pubkey.toBase58() === governancePk.toBase58()
    )
    const previousAccounts = _get().assetAccounts.filter(
      (x) => x.governance.pubkey.toBase58() !== governancePk.toBase58()
    )
    const accounts = await getAccountsForGovernances(
      connection,
      realm,
      governancesArray
    )
    set((s) => {
      s.loadGovernedAccounts = false
      s.governedTokenAccounts = [
        ...previousAccounts,
        ...accounts.filter(
          (x) =>
            x.type === AccountType.TOKEN ||
            x.type === AccountType.NFT ||
            x.type === AccountType.SOL
        ),
      ]
      s.assetAccounts = [...previousAccounts, ...accounts]
    })
  },
}))
export default useGovernanceAssetsStore

const getAccountsByOwner = (
  connection: Connection,
  programId: PublicKey,
  owner: PublicKey
) => {
  return connection.getTokenAccountsByOwner(owner, {
    programId: programId,
  })
}

const getTokenAccountsObj = async (
  realm: ProgramAccount<Realm>,
  governance: ProgramAccount<Governance>,
  tokenAccount: TokenProgramAccount<AccountInfo>,
  connection: ConnectionContext,
  accounts: AssetAccount[],
  mintAccounts: TokenProgramAccount<MintInfo>[],
  solAccounts: SolAccInfo[]
) => {
  const solAcc = solAccounts.find(
    (x) => x.governancePk.toBase58() === tokenAccount.account.owner.toBase58()
  )

  const isNft =
    tokenAccount.account.mint.toBase58() === DEFAULT_NFT_TREASURY_MINT
  const mint = mintAccounts.find(
    (x) => x.publicKey.toBase58() === tokenAccount.account.mint.toBase58()
  )
  if (solAcc) {
    return await getSolAccount(
      realm,
      governance,
      connection,
      tokenAccount,
      mint!,
      accounts,
      solAcc
    )
  }
  if (isNft) {
    return new AccountTypeNFT(tokenAccount, mint!, governance)
  }

  if (mint?.account.supply && mint?.account.supply.cmpn(1) !== 0) {
    return new AccountTypeToken(tokenAccount, mint!, governance)
  }
}

const getTokenAssetAccounts = async (
  tokenAccounts: {
    publicKey: PublicKey
    account: AccountInfo
  }[],
  governances: ProgramAccount<Governance>[],
  realm: ProgramAccount<Realm>,
  connection: ConnectionContext
) => {
  const accounts: AssetAccount[] = []
  const mintAccounts = tokenAccounts.length
    ? await getMintAccountsInfo(
        connection,
        tokenAccounts.map((x) => x.account.mint)
      )
    : []
  const nativeSolAddresses = await Promise.all(
    governances.map((x) => getNativeTreasuryAddress(realm.owner, x!.pubkey))
  )
  const govNativeSolAddress = nativeSolAddresses.map((x, index) => {
    return {
      governancePk: governances[index].pubkey,
      nativeSolAddress: x,
    }
  })
  const solAccs = await getSolAccounts(connection, govNativeSolAddress)
  for (const tokenAccount of tokenAccounts) {
    const governance = governances.find(
      (x) => x.pubkey.toBase58() === tokenAccount.account.owner.toBase58()
    )
    const account = await getTokenAccountsObj(
      realm,
      governance!,
      tokenAccount,
      connection,
      accounts,
      mintAccounts,
      solAccs
    )
    if (account) {
      accounts.push(account)
    }
  }
  return accounts
}

const getMintAccounts = (
  mintGovernances: ProgramAccount<Governance>[],
  mintGovernancesMintInfo: (AccountInfoGeneric<Buffer> | null)[]
) => {
  const accounts: AccountTypeMint[] = []
  mintGovernancesMintInfo.forEach((mintAccountInfo, index) => {
    const mintGovernnace = mintGovernances[index]
    if (!mintAccountInfo) {
      throw new Error(
        `Missing mintAccountInfo for: ${mintGovernnace?.pubkey.toBase58()}`
      )
    }
    const data = Buffer.from(mintAccountInfo.data)
    const parsedMintInfo = parseMintAccountData(data) as MintInfo
    const account = new AccountTypeMint(mintGovernnace!, parsedMintInfo)
    if (account) {
      accounts.push(account)
    }
  })
  return accounts
}

const getProgramAssetAccounts = (
  programGovernances: ProgramAccount<Governance>[]
) => {
  const accounts: AccountTypeProgram[] = []
  programGovernances.forEach((programGov) => {
    const account = new AccountTypeProgram(programGov!)
    if (account) {
      accounts.push(account)
    }
  })
  return accounts
}

const getGovernancesByAccountTypes = (
  governancesArray: ProgramAccount<Governance>[],
  types: GovernanceAccountType[]
) => {
  const governancesFiltered = governancesArray.filter((gov) =>
    types.some((t) => gov.account?.accountType === t)
  )
  return governancesFiltered
}

const getSolAccount = async (
  realm: ProgramAccount<Realm>,
  governance: ProgramAccount<Governance>,
  connection: ConnectionContext,
  tokenAccount: TokenProgramAccount<AccountInfo>,
  mint: TokenProgramAccount<MintInfo>,
  accounts: AssetAccount[],
  solAcc: SolAccInfo
) => {
  if (solAcc.acc) {
    const accountsByOwnerResp = await getAccountsByOwner(
      connection.current,
      TOKEN_PROGRAM_ID,
      solAcc.nativeSolAddress
    )
    const accountsOwnedBySolAccount = accountsByOwnerResp.value.map((x) => {
      const publicKey = x.pubkey
      const data = Buffer.from(x.account.data)
      const account = parseTokenAccountData(publicKey, data)
      return { publicKey, account }
    })

    const mintAccounts = accountsOwnedBySolAccount.length
      ? await getMintAccountsInfo(
          connection,
          accountsOwnedBySolAccount.map((x) => x.account.mint)
        )
      : []
    for (const acc of accountsOwnedBySolAccount) {
      const account = await getTokenAccountsObj(
        realm,
        governance,
        acc,
        connection,
        accounts,
        mintAccounts,
        []
      )
      if (account) {
        accounts.push(account)
      }
    }
    const mintRentAmount = await connection.current.getMinimumBalanceForRentExemption(
      0
    )
    const solAccount = solAcc.acc as AccountInfoGen<Buffer | ParsedAccountData>
    solAccount.lamports =
      solAccount.lamports !== 0
        ? solAccount.lamports - mintRentAmount
        : solAccount.lamports

    return new AccountTypeSol(
      tokenAccount,
      mint!,
      solAcc.nativeSolAddress,
      solAccount,
      governance
    )
  }
}

const getAccountsForGovernances = async (
  connection: ConnectionContext,
  realm: ProgramAccount<Realm>,
  governancesArray: ProgramAccount<Governance>[]
) => {
  const mintGovernances = getGovernancesByAccountTypes(governancesArray, [
    GovernanceAccountType.MintGovernanceV1,
    GovernanceAccountType.MintGovernanceV2,
  ])
  const programGovernances = getGovernancesByAccountTypes(governancesArray, [
    GovernanceAccountType.ProgramGovernanceV1,
    GovernanceAccountType.ProgramGovernanceV2,
  ])
  const tokenGovernanes = getGovernancesByAccountTypes(governancesArray, [
    GovernanceAccountType.TokenGovernanceV1,
    GovernanceAccountType.TokenGovernanceV2,
  ])
  const mintGovernancesMintInfo = await getMultipleAccountInfoChunked(
    connection.current,
    mintGovernances.map((x) => x.account.governedAccount)
  )
  const mintAccounts = getMintAccounts(mintGovernances, mintGovernancesMintInfo)
  const programAccounts = getProgramAssetAccounts(programGovernances)
  const getOwnedTokenAccounts = await axios.request({
    url: connection.endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: JSON.stringify([
      ...tokenGovernanes.map((x) => {
        return {
          jsonrpc: '2.0',
          id: 1,
          method: 'getProgramAccounts',
          params: [
            TOKEN_PROGRAM_ID.toBase58(),
            {
              commitment: connection.current.commitment,
              encoding: 'base64',
              filters: [
                {
                  dataSize: TokenAccountLayout.span, // number of bytes
                },
                {
                  memcmp: {
                    offset: tokenAccountOwnerOffset, // number of bytes
                    bytes: x.pubkey.toBase58(), // base58 encoded string
                  },
                },
              ],
            },
          ],
        }
      }),
    ]),
  })
  const tokenAccountsJson = getOwnedTokenAccounts.data
  const tokenAccounts = tokenAccountsJson.length
    ? tokenAccountsJson
        .flatMap((x) => x.result)
        .filter((x) => {
          const pubkey =
            typeof x.pubkey === 'string' ? x.pubkey : x.pubkey.toBase58()
          return HIDDEN_TREASURES.findIndex((x) => x === pubkey) === -1
        })
        .map((x) => {
          const publicKey = new PublicKey(x.pubkey)
          const data = Buffer.from(x.account.data[0], 'base64')
          const account = parseTokenAccountData(publicKey, data)
          return { publicKey, account }
        })
    : []
  const tokenAssetAccounts = await getTokenAssetAccounts(
    tokenAccounts,
    tokenGovernanes,
    realm,
    connection
  )
  const governedTokenAccounts = tokenAssetAccounts
  await tokenService.fetchTokenPrices(
    governedTokenAccounts
      .filter((x) => x.extensions.mint?.publicKey)
      .map((x) => x.extensions.mint!.publicKey.toBase58())
  )
  return [...mintAccounts, ...programAccounts, ...governedTokenAccounts]
}

const getMintAccountsInfo = async (
  connection: ConnectionContext,
  pubkeys: PublicKey[]
) => {
  const getMintsAccounts = await axios.request({
    url: connection.endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: JSON.stringify([
      ...pubkeys.map((x) => {
        return {
          jsonrpc: '2.0',
          id: x.toBase58(),
          method: 'getAccountInfo',
          params: [
            x.toBase58(),
            {
              commitment: connection.current.commitment,
              encoding: 'base64',
            },
          ],
        }
      }),
    ]),
  })
  const mintAccountsJson = getMintsAccounts.data
  const mintAccounts = mintAccountsJson?.map((x) => {
    const result = x.result
    const publicKey = new PublicKey(x.id)
    const data = Buffer.from(result.value.data[0], 'base64')
    const account = parseMintAccountData(data)
    return { publicKey, account }
  })
  return mintAccounts
}

const getSolAccounts = async (
  connection: ConnectionContext,
  pubkeys: { governancePk: PublicKey; nativeSolAddress: PublicKey }[]
) => {
  const getSolAccounts = await axios.request({
    url: connection.endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: JSON.stringify([
      ...pubkeys.map((x) => {
        return {
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccountInfo',
          params: [
            x.nativeSolAddress.toBase58(),
            {
              commitment: connection.current.commitment,
              encoding: 'jsonParsed',
            },
          ],
        }
      }),
    ]),
  })
  const solAccounts = getSolAccounts.data
  const accounts = solAccounts?.length
    ? solAccounts
        .flatMap((x, index) => {
          return {
            acc: x.result.value,
            ...pubkeys[index],
          }
        })
        .filter((x) => x.acc)
    : []
  return accounts as SolAccInfo[]
}
