import {
  PublicKey,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js'
import { GOVERNANCE_SCHEMA } from './serialisation'
import { serialize } from 'borsh'
import { GovernanceConfig } from './accounts'
import { CreateProgramGovernanceArgs } from './instructions'
import { BPF_UPGRADE_LOADER_ID } from '@utils/tokens'
import { SYSTEM_PROGRAM_ID } from './core/api'

export const withCreateProgramGovernance = async (
  instructions: TransactionInstruction[],
  programId: PublicKey,
  realm: PublicKey,
  governedProgram: PublicKey,
  config: GovernanceConfig,
  transferUpgradeAuthority: boolean,
  programUpgradeAuthority: PublicKey,
  tokenOwnerRecord: PublicKey,
  payer: PublicKey,
  governanceAuthority: PublicKey
): Promise<{ governanceAddress: PublicKey }> => {
  const systemId = SYSTEM_PROGRAM_ID
  const args = new CreateProgramGovernanceArgs({
    config,
    transferUpgradeAuthority,
  })
  const data = Buffer.from(serialize(GOVERNANCE_SCHEMA, args))

  const [governanceAddress] = await PublicKey.findProgramAddress(
    [
      Buffer.from('program-governance'),
      realm.toBuffer(),
      governedProgram.toBuffer(),
    ],
    programId
  )

  const [programDataAddress] = await PublicKey.findProgramAddress(
    [governedProgram.toBuffer()],
    BPF_UPGRADE_LOADER_ID
  )

  const keys = [
    {
      pubkey: realm,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: governanceAddress,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: governedProgram,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: programDataAddress,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: programUpgradeAuthority,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: tokenOwnerRecord,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: payer,
      isWritable: false,
      isSigner: true,
    },
    {
      pubkey: BPF_UPGRADE_LOADER_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: systemId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: governanceAuthority,
      isWritable: false,
      isSigner: true,
    },
  ]

  instructions.push(
    new TransactionInstruction({
      keys,
      programId,
      data,
    })
  )

  return { governanceAddress }
}
