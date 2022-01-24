import { MintInfo } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import useRealm from '@hooks/useRealm'
import { Proposal } from '@solana/spl-governance'
import useWalletStore from '../../../stores/useWalletStore'
import { Option } from '@tools/core/option'
import { GoverningTokenType } from '@solana/spl-governance'
import { fmtMintAmount } from '@tools/sdk/units'
import { getMintMetadata } from '@components/instructions/programs/splToken'
import { ArrowsExpandIcon } from '@heroicons/react/outline'
import Link from 'next/link'
import useQueryContext from '@hooks/useQueryContext'
import DepositCommunityTokensBtn from './DepositCommunityTokensBtn'
import WithDrawCommunityTokens from './WithdrawCommunityTokensBtn'
import useDepositStore from 'VoteStakeRegistry/stores/useDepositStore'
import VotingPowerBox from './VotingPowerBox'

const LockPluginTokenBalanceCard = ({
  proposal,
}: {
  proposal?: Option<Proposal>
}) => {
  const { fmtUrlWithCluster } = useQueryContext()
  const { councilMint, mint, realm, symbol } = useRealm()
  const isDepositVisible = (
    depositMint: MintInfo | undefined,
    realmMint: PublicKey | undefined
  ) =>
    depositMint &&
    (!proposal ||
      (proposal.isSome() &&
        proposal.value.governingTokenMint.toBase58() === realmMint?.toBase58()))

  const communityDepositVisible =
    // If there is no council then community deposit is the only option to show
    !realm?.account.config.councilMint ||
    isDepositVisible(mint, realm?.account.communityMint)

  const councilDepositVisible = isDepositVisible(
    councilMint,
    realm?.account.config.councilMint
  )

  const hasLoaded = mint || councilMint
  const backLink = fmtUrlWithCluster(`/dao/${symbol}/account`)
    ? fmtUrlWithCluster(`/dao/${symbol}/account`)
    : ''
  return (
    <div className="bg-bkg-2 p-4 md:p-6 rounded-lg">
      <h3 className="mb-4 flex">
        Account
        <Link href={backLink}>
          <a className="text-fgd-3 flex-shrink-0 h-5 w-5 ml-auto cursor-pointer">
            <ArrowsExpandIcon></ArrowsExpandIcon>
          </a>
        </Link>
      </h3>
      {hasLoaded ? (
        <>
          {communityDepositVisible && (
            <TokenDeposit
              mint={mint}
              tokenType={GoverningTokenType.Community}
              councilVote={false}
            />
          )}
          {councilDepositVisible && (
            <div className="mt-4">
              <TokenDeposit
                mint={councilMint}
                tokenType={GoverningTokenType.Council}
                councilVote={true}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <div className="animate-pulse bg-bkg-3 h-12 mb-4 rounded-lg" />
          <div className="animate-pulse bg-bkg-3 h-10 rounded-lg" />
        </>
      )}
    </div>
  )
}

const TokenDeposit = ({
  mint,
  tokenType,
}: {
  mint: MintInfo | undefined
  tokenType: GoverningTokenType
  councilVote?: boolean
}) => {
  const { realm, realmTokenAccount, councilTokenAccount } = useRealm()
  const connected = useWalletStore((s) => s.connected)
  const deposits = useDepositStore((s) => s.state.deposits)
  const votingPower = useDepositStore((s) => s.state.votingPower)
  const votingPowerFromDeposits = useDepositStore(
    (s) => s.state.votingPowerFromDeposits
  )
  const lockedTokensAmount = deposits
    .filter(
      (x) =>
        typeof x.lockup.kind['none'] === 'undefined' &&
        x.mint.publicKey.toBase58() === realm?.account.communityMint.toBase58()
    )
    .reduce((curr, next) => curr.add(next.currentlyLocked), new BN(0))

  const depositRecord = deposits.find(
    (x) =>
      x.mint.publicKey.toBase58() === realm!.account.communityMint.toBase58() &&
      x.lockup.kind.none
  )
  // Do not show deposits for mints with zero supply because nobody can deposit anyway
  if (!mint || mint.supply.isZero()) {
    return null
  }

  const depositTokenAccount =
    tokenType === GoverningTokenType.Community
      ? realmTokenAccount
      : councilTokenAccount

  const depositMint =
    tokenType === GoverningTokenType.Community
      ? realm?.account.communityMint
      : realm?.account.config.councilMint

  const tokenName = getMintMetadata(depositMint)?.name ?? realm?.account.name

  const depositTokenName = `${tokenName} ${
    tokenType === GoverningTokenType.Community ? '' : 'Council'
  }`

  const hasTokensInWallet =
    depositTokenAccount && depositTokenAccount.account.amount.gt(new BN(0))

  const hasTokensDeposited =
    depositRecord && depositRecord.amountDepositedNative.gt(new BN(0))

  const lockTokensFmt =
    lockedTokensAmount && mint ? fmtMintAmount(mint, lockedTokensAmount) : '0'

  const availableTokens =
    depositRecord && mint
      ? fmtMintAmount(mint, depositRecord.amountDepositedNative)
      : '0'

  const canShowAvailableTokensMessage =
    !hasTokensDeposited && hasTokensInWallet && connected
  const canExecuteAction = !hasTokensDeposited ? 'deposit' : 'withdraw'
  const canDepositToken = !hasTokensDeposited && hasTokensInWallet
  const tokensToShow =
    canDepositToken && depositTokenAccount
      ? fmtMintAmount(mint, depositTokenAccount.account.amount)
      : canDepositToken
      ? availableTokens
      : 0

  return (
    <>
      <div className="flex space-x-4 items-center mt-8">
        <VotingPowerBox
          votingPower={votingPower}
          mint={mint}
          votingPowerFromDeposits={votingPowerFromDeposits}
          className="w-full px-4 py-2"
        ></VotingPowerBox>
      </div>
      <p className="flex flex-row mt-2 items-center">
        <span className="text-xs">{depositTokenName} Deposited:</span>
        <span className="ml-auto">{availableTokens}</span>
      </p>
      <p className="flex flex-row mt-2 items-center">
        <span className="text-xs">{depositTokenName} Locked:</span>
        <span className="ml-auto">{lockTokensFmt}</span>
      </p>
      <p
        className={`mt-2 opacity-70 mb-4 text-xs ${
          canShowAvailableTokensMessage ? 'block' : 'hidden'
        }`}
      >
        You have {tokensToShow} tokens available to {canExecuteAction}.
      </p>

      <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0 mt-4">
        <DepositCommunityTokensBtn></DepositCommunityTokensBtn>
        <WithDrawCommunityTokens></WithDrawCommunityTokens>
      </div>
    </>
  )
}

export default LockPluginTokenBalanceCard
