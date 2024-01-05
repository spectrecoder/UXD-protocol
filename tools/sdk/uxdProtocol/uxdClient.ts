import { EndpointTypes } from '@models/types'
import { PublicKey } from '@solana/web3.js'
import { ConnectionContext } from '@utils/connection'
import { UXDClient } from '@uxd-protocol/uxd-client'
import { MercurialVaultDepository } from '@uxd-protocol/uxd-client'
import { CredixLpDepository } from '@uxd-protocol/uxd-client'
import { AlloyxVaultDepository } from '@uxd-protocol/uxd-client'

export const DEPOSITORY_MINTS = {
  devnet: {
    USDC: {
      address: new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'),
      decimals: 6,
    },
  },
  mainnet: {
    USDC: {
      address: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
      decimals: 6,
    },
  },
}

export type DepositoriesRoutingWeightBps = {
  identityDepositoryWeightBps: number
  mercurialVaultDepositoryWeightBps: number
  credixLpDepositoryWeightBps: number
  alloyxVaultDepositoryWeightBps: number
}

export type RouterDepositories = {
  identityDepository: PublicKey
  mercurialVaultDepository: PublicKey
  credixLpDepository: PublicKey
  alloyxVaultDepository: PublicKey
}

export enum DEPOSITORY_TYPES {
  IDENTITY = 'Identity',
  MERCURIAL_VAULT = 'MercurialVault',
  CREDIX_LP = 'CredixLp',
  ALLOYX_VAULT = 'AlloyxVault',
}

export const getDepositoryTypes = (
  includeIdentityType: boolean
): DEPOSITORY_TYPES[] => {
  const types = [
    DEPOSITORY_TYPES.MERCURIAL_VAULT,
    DEPOSITORY_TYPES.CREDIX_LP,
    DEPOSITORY_TYPES.ALLOYX_VAULT,
  ]
  if (includeIdentityType) {
    types.push(DEPOSITORY_TYPES.IDENTITY)
  }
  return types
}

export const getDepositoryMintSymbols = (cluster: EndpointTypes): string[] => [
  ...Object.keys(DEPOSITORY_MINTS[cluster]),
]
export const getDepositoryMintInfo = (
  cluster: EndpointTypes,
  symbol: string
): {
  address: PublicKey
  decimals: number
} => DEPOSITORY_MINTS[cluster][symbol]

export const uxdClient = (programId: PublicKey): UXDClient => {
  return new UXDClient(programId)
}

export const getMercurialVaultDepository = (
  connection: ConnectionContext,
  uxdProgramId: PublicKey,
  depositoryMintName: string
) => {
  const collateralMint = getDepositoryMintInfo(
    connection.cluster,
    depositoryMintName
  )
  return MercurialVaultDepository.initialize({
    connection: connection.current,
    collateralMint: {
      mint: collateralMint.address,
      name: depositoryMintName,
      symbol: depositoryMintName,
      decimals: collateralMint.decimals,
    },
    uxdProgramId,
  })
}

export const getCredixLpDepository = (
  connection: ConnectionContext,
  uxdProgramId: PublicKey,
  depositoryMintName: string
) => {
  const collateralMintAddress = getDepositoryMintInfo(
    connection.cluster,
    depositoryMintName
  ).address
  const credixProgramId =
    connection.cluster == 'devnet'
      ? new PublicKey('CRdXwuY984Au227VnMJ2qvT7gPd83HwARYXcbHfseFKC')
      : new PublicKey('CRDx2YkdtYtGZXGHZ59wNv1EwKHQndnRc1gT4p8i2vPX')
  return CredixLpDepository.initialize({
    connection: connection.current,
    collateralMint: collateralMintAddress,
    collateralSymbol: depositoryMintName,
    uxdProgramId,
    credixProgramId: credixProgramId,
  })
}

export const getAlloyxVaultDepository = (
  connection: ConnectionContext,
  uxdProgramId: PublicKey,
  depositoryMintName: string
) => {
  const collateralMintAddress = getDepositoryMintInfo(
    connection.cluster,
    depositoryMintName
  ).address
  const vaultInfo =
    connection.cluster == 'devnet'
      ? {
          vaultId: 'uxd-debug',
          vaultMint: new PublicKey(
            'CBQcnyoVjdCyPf2nnhPjbMJL18FEtTuPA9nQPrS7wJPF'
          ),
        }
      : {
          vaultId: 'diversified_public_credit',
          vaultMint: new PublicKey(
            'EF6UUehY8YHUiNBp9yp6HVj1nknK1vW2kgTdZwZT2px7'
          ),
        }
  const alloyxProgramId =
    connection.cluster == 'devnet'
      ? new PublicKey('8U29WVwDFLxFud36okhqrngUquaZqVnVL9uE5G8DzX5c')
      : new PublicKey('5fuCN8tquSXRJ97f5TP31cLwViuzHmdkyqiprqtz2DTx')
  return AlloyxVaultDepository.initialize({
    connection: connection.current,
    collateralMint: collateralMintAddress,
    collateralSymbol: depositoryMintName,
    alloyxVaultId: vaultInfo.vaultId,
    alloyxVaultMint: vaultInfo.vaultMint,
    alloyxProgramId: alloyxProgramId,
    uxdProgramId,
  })
}
