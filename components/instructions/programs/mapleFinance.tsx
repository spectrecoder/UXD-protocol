import { nu64, struct, u8 } from 'buffer-layout'
import { AccountMetaData } from '@solana/spl-governance'
import { Connection } from '@solana/web3.js'
import { ANCHOR_DISCRIMINATOR_LAYOUT } from '@utils/helpers'
import { fmtBnMintDecimals } from '@tools/sdk/units'
import { SYRUP_ADDRESSES } from '@maplelabs/syrup-sdk'

export const MAPLE_FINANCE_PROGRAM_INSTRUCTIONS = {
  [SYRUP_ADDRESSES.Syrup.toBase58()]: {
    [151]: {
      name: 'Maple Finance - Lender Deposit',
      accounts: [
        { name: 'Lender' },
        { name: 'Lender User' },
        { name: 'Pool' },
        { name: 'Globals' },
        { name: 'Pool Locker' },
        { name: 'Shares Mint' },
        { name: 'Locked Shares' },
        { name: 'Lender Shares' },
        { name: 'Lender Locker' },
        { name: 'System Program' },
        { name: 'Token Program' },
        { name: 'Rent' },
      ],
      getDataUI: async (
        _connection: Connection,
        data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        const dataLayout = struct([
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
          nu64('depositAmount'),
        ])

        const { depositAmount } = dataLayout.decode(Buffer.from(data)) as any

        const uiAmount = fmtBnMintDecimals(
          depositAmount,
          // USDC decimals
          6
        )

        return (
          <div className="flex flex-col">
            <div className="flex">
              <span>Ui amount to deposit:</span>
              <span className="ml-2">{uiAmount}</span>
            </div>
          </div>
        )
      },
    },
  },
}