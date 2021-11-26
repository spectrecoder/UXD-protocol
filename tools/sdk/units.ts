import { BN } from '@project-serum/anchor'
import { MintInfo } from '@solana/spl-token'
import { BigNumber } from 'bignumber.js'

const SECONDS_PER_DAY = 86400

export function getDaysFromTimestamp(unixTimestamp: number) {
  return unixTimestamp / SECONDS_PER_DAY
}

export function getTimestampFromDays(days: number) {
  return days * SECONDS_PER_DAY
}

/// Formats mint amount (natural units) as a decimal string
export function fmtMintAmount(mint: MintInfo | undefined, mintAmount: BN) {
  return mint
    ? getMintDecimalAmount(mint, mintAmount).toFormat()
    : new BigNumber(mintAmount.toString()).toFormat()
}

// Converts mint amount (natural units) to decimals
export function getMintDecimalAmount(mint: MintInfo, mintAmount: BN) {
  return new BigNumber(mintAmount.toString()).shiftedBy(-mint.decimals)
}
export function getBigNumberAmount(amount: BN | number) {
  return typeof amount === 'number'
    ? new BigNumber(amount)
    : new BigNumber(amount.toString())
}

// Parses input string in decimals to mint amount (natural units)
// If the input is already a number then converts it to mint natural amount
export function parseMintNaturalAmountFromDecimal(
  decimalAmount: string | number,
  mintDecimals: number
) {
  if (typeof decimalAmount === 'number') {
    return getMintNaturalAmountFromDecimal(decimalAmount, mintDecimals)
  }

  if (mintDecimals === 0) {
    return parseInt(decimalAmount)
  }

  const floatAmount = parseFloat(decimalAmount)
  return getMintNaturalAmountFromDecimal(floatAmount, mintDecimals)
}

// Converts amount in decimals to mint amount (natural units)
export function getMintNaturalAmountFromDecimal(
  decimalAmount: number,
  decimals: number
) {
  return new BigNumber(decimalAmount).shiftedBy(decimals).toNumber()
}

// Calculates mint min amount as decimal
export function getMintMinAmountAsDecimal(mint: MintInfo) {
  return new BigNumber(1).shiftedBy(-mint.decimals).toNumber()
}

export function formatMintNaturalAmountAsDecimal(
  mint: MintInfo,
  naturalAmount: BN
) {
  return getMintDecimalAmountFromNatural(mint, naturalAmount).toFormat()
}

export function getMintDecimalAmountFromNatural(
  mint: MintInfo,
  naturalAmount: BN
) {
  return new BigNumber(naturalAmount.toString()).shiftedBy(-mint.decimals)
}
