import { Connection } from '@solana/web3.js'
import { struct, u8, nu64, Layout, u16 } from 'buffer-layout'
import { AccountMetaData } from '@solana/spl-governance'
import { bool, u128, u64, publicKey } from '@project-serum/borsh'
import { nativeToUi, UXD_DECIMALS } from '@uxd-protocol/uxd-client'
import { nativeAmountToFormattedUiAmount } from '@tools/sdk/units'
import { BN } from '@project-serum/anchor'
import { ANCHOR_DISCRIMINATOR_LAYOUT } from '@utils/helpers'
import { getSplTokenNameByMint } from '@utils/splTokens'

export const UXD_PROGRAM_INSTRUCTIONS = {
  UXD8m9cvwk4RcSxnX2HZ9VudQCEeDH6fRnB4CAP57Dr: {
    // HtBAjXoadvKg8KBAtcUL1BjgxM55itScsZYe9LHt3NiP: {
    122: {
      name: 'UXD - Edit Identity Depository',
      accounts: ['Authority', 'Controller', 'Depository'],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        let redeemableAmountUnderManagementCapOption = false
        let mintingDisabledOption = false

        // Check if options are used or not
        if (data[8] == 1) {
          redeemableAmountUnderManagementCapOption = true
        }

        if (
          data[9 + (redeemableAmountUnderManagementCapOption ? 16 : 0)] == 1
        ) {
          mintingDisabledOption = true
        }

        const layout: Layout<any>[] = [
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
        ]

        layout.push(u8('redeemableAmountUnderManagementCapOption'))
        if (redeemableAmountUnderManagementCapOption) {
          layout.push(u128('redeemableAmountUnderManagementCap'))
        }

        layout.push(u8('mintingDisabledOption'))
        if (mintingDisabledOption) {
          layout.push(u8('mintingDisabled'))
        }

        const dataLayout = struct(layout)

        const {
          redeemableAmountUnderManagementCap,
          mintingDisabled,
        } = dataLayout.decode(Buffer.from(data)) as any

        return (
          <>
            <p>{`Native redeemable amount under management supply cap: ${
              redeemableAmountUnderManagementCapOption
                ? redeemableAmountUnderManagementCap.toString()
                : 'Not used'
            }`}</p>
            <p>{`Minting disabled: ${
              mintingDisabledOption
                ? mintingDisabled
                  ? 'Minting is disabled'
                  : 'Minting is enabled'
                : 'Not used'
            }`}</p>
          </>
        )
      },
    },
    98: {
      name: 'UXD - Mint with Identity Depository',
      accounts: [
        'User',
        'Payer',
        'Controller',
        'Depository',
        'Collateral Vault',
        'Redeemable Mint',
        'User Collateral',
        'User Redeemable',
        'System Program',
        'Token Program',
      ],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        const dataLayout = struct([
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
          nu64('collateralAmount'),
        ])

        const { collateralAmount } = dataLayout.decode(Buffer.from(data)) as any

        return (
          <>
            <p>{`Collateral amount: ${nativeToUi(
              collateralAmount,
              6
            ).toLocaleString()}`}</p>
            <p>Collateral mint: USDC</p>
          </>
        )
      },
    },
    42: {
      name: 'UXD - Redeem with Identity Depository',
      accounts: [
        'User',
        'Payer',
        'Controller',
        'Depository',
        'Collateral Vault',
        'Redeemable Mint',
        'User Collateral',
        'User Redeemable',
        'System Program',
        'Token Program',
      ],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        const dataLayout = struct([
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
          nu64('redeemableAmount'),
        ])

        const { redeemableAmount } = dataLayout.decode(Buffer.from(data)) as any

        return (
          <>
            <p>{`Redeemable amount: ${nativeToUi(
              redeemableAmount,
              6
            ).toLocaleString()}`}</p>
            <p>Collateral mint: USDC</p>
          </>
        )
      },
    },
    228: {
      name: 'UXD - Mint with Mercurial Vault Depository',
      accounts: [
        'User',
        'Payer',
        'Controller',
        'Depository',
        'Redeemable mint',
        'User redeemable',
        'Collateral mint',
        'User collateral',
        'Depository LP token vault',
        'Mercurial vault',
        'Mercurial vault lp mint',
        'Mercurial vault collateral token_safe',
        'Mercurial vault program',
        'System program',
        'Token program',
      ],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        accounts: AccountMetaData[]
      ) => {
        const dataLayout = struct([
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
          nu64('collateralAmount'),
        ])

        const { collateralAmount } = dataLayout.decode(Buffer.from(data)) as any

        const collateralMintName = getSplTokenNameByMint(accounts[6].pubkey)

        return (
          <>
            <p>{`Collateral amount: ${nativeToUi(
              collateralAmount,
              6
            ).toLocaleString()}`}</p>
            <p>Collateral mint: {collateralMintName}</p>
          </>
        )
      },
    },
    136: {
      name: 'UXD - Disable Depository Regular Minting',
      accounts: ['Authority', 'Controller', 'Depository'],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        const dataLayout = struct([
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
          bool('disable'),
        ])

        const { disable } = dataLayout.decode(Buffer.from(data)) as any

        return (
          <>
            <p>{`disable: ${disable}`}</p>
          </>
        )
      },
    },
    137: {
      name: 'UXD - Initialize Controller',
      accounts: [
        'Authority',
        'Payer',
        'Controller',
        'Redeemable Mint',
        'System Program',
        'Token Program',
        'Rent',
      ],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        console.log('data', data)

        const dataLayout = struct([
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
          u8('redeemableMintDecimals'),
        ])

        const { redeemableMintDecimals } = dataLayout.decode(
          Buffer.from(data)
        ) as any

        return (
          <p>{`redeemable mint decimals: ${redeemableMintDecimals.toString()}`}</p>
        )
      },
    },
    45: {
      name: 'UXD - Set Redeemable Global Supply Cap',
      accounts: ['Authority', 'Controller'],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        const dataLayout = struct([
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
          u128('redeemableGlobalSupplyCap'),
        ])

        const args = dataLayout.decode(Buffer.from(data)) as any

        return (
          <p>{`Redeemable Global Supply Cap: ${nativeAmountToFormattedUiAmount(
            new BN(args.redeemableGlobalSupplyCap.toString()),
            UXD_DECIMALS
          )}`}</p>
        )
      },
    },
    21: {
      name: 'UXD - Register Mercurial Vault Depository',
      accounts: [
        'Authority',
        'Payer',
        'Controller',
        'Depository',
        'Collateral Mint',
        'Mercurial Vault',
        'Mercurial Vault LP Mint',
        'Depository LP Token Vault',
        'System Program',
        'Token Program',
        'Rent',
      ],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        const dataLayout = struct([
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
          u8('mintingFeeInBps'),
          u8('redeemingFeeInBps'),
          u128('redeemableAmountUnderManagementCap'),
        ])
        const {
          mintingFeeInBps,
          redeemingFeeInBps,
          redeemableAmountUnderManagementCap,
        } = dataLayout.decode(Buffer.from(data)) as any

        return (
          <>
            <p>{`Minting fee in bps: ${mintingFeeInBps.toString()}`}</p>
            <p>{`Redeeming fee in bps: ${redeemingFeeInBps.toString()}`}</p>
            <p>{`Native redeemable amount under management cap: ${redeemableAmountUnderManagementCap.toString()}`}</p>
          </>
        )
      },
    },
    29: {
      name: 'UXD - Edit Mercurial Vault Depository',
      accounts: ['Authority', 'Controller', 'Depository'],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        let redeemableAmountUnderManagementCapOption = false
        let mintingFeeInBpsOption = false
        let redeemingFeeInBpsOption = false
        let mintingDisabledOption = false
        let profitsBeneficiaryCollateralOption = false

        // Check if options are used or not
        if (data[8] == 1) {
          redeemableAmountUnderManagementCapOption = true
        }

        if (
          data[9 + (redeemableAmountUnderManagementCapOption ? 16 : 0)] == 1
        ) {
          mintingFeeInBpsOption = true
        }

        if (
          data[
            10 +
              (redeemableAmountUnderManagementCapOption ? 16 : 0) +
              (mintingFeeInBpsOption ? 1 : 0)
          ] == 1
        ) {
          redeemingFeeInBpsOption = true
        }

        if (
          data[
            11 +
              (redeemableAmountUnderManagementCapOption ? 16 : 0) +
              (mintingFeeInBpsOption ? 1 : 0) +
              (redeemingFeeInBpsOption ? 1 : 0)
          ] == 1
        ) {
          mintingDisabledOption = true
        }

        if (
          data[
            12 +
              (redeemableAmountUnderManagementCapOption ? 16 : 0) +
              (mintingFeeInBpsOption ? 1 : 0) +
              (redeemingFeeInBpsOption ? 1 : 0) +
              (mintingDisabledOption ? 1 : 0)
          ] == 1
        ) {
          profitsBeneficiaryCollateralOption = true
        }

        const layout: Layout<any>[] = [
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
        ]

        layout.push(u8('redeemableAmountUnderManagementCapOption'))
        if (redeemableAmountUnderManagementCapOption) {
          layout.push(u128('redeemableAmountUnderManagementCap'))
        }

        layout.push(u8('mintingFeeInBpsOption'))
        if (mintingFeeInBpsOption) {
          layout.push(u8('mintingFeeInBps'))
        }

        layout.push(u8('redeemingFeeInBpsOption'))
        if (redeemingFeeInBpsOption) {
          layout.push(u8('redeemingFeeInBps'))
        }

        layout.push(u8('mintingDisabledOption'))
        if (mintingDisabledOption) {
          layout.push(bool('mintingDisabled'))
        }

        layout.push(u8('profitsBeneficiaryCollateralOption'))
        if (profitsBeneficiaryCollateralOption) {
          layout.push(publicKey('profitsBeneficiaryCollateral'))
        }

        const dataLayout = struct(layout)

        const {
          redeemableAmountUnderManagementCap,
          mintingFeeInBps,
          redeemingFeeInBps,
          mintingDisabled,
          profitsBeneficiaryCollateral,
        } = dataLayout.decode(Buffer.from(data)) as any

        return (
          <>
            <p>{`Native redeemable depository supply cap: ${
              redeemableAmountUnderManagementCapOption
                ? redeemableAmountUnderManagementCap.toString()
                : 'Not used'
            }`}</p>
            <p>{`Minting fee in bps: ${
              mintingFeeInBpsOption ? mintingFeeInBps.toString() : 'Not used'
            }`}</p>
            <p>{`Redeeming fee in bps: ${
              redeemingFeeInBpsOption
                ? redeemingFeeInBps.toString()
                : 'Not used'
            }`}</p>
            <p>{`Minting disabled: ${
              mintingDisabledOption ? mintingDisabled.toString() : 'Not used'
            }`}</p>
            <p>{`Profits beneficiary collateral: ${
              profitsBeneficiaryCollateralOption
                ? profitsBeneficiaryCollateral.toString()
                : 'Not used'
            }`}</p>
          </>
        )
      },
    },
    132: {
      name: 'UXD - Edit Controller',
      accounts: ['Authority', 'Controller'],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        let redeemableGlobalSupplyCapOption = false
        let depositoriesRoutingWeightBpsOption = false
        let routerDepositoriesOption = false

        // Check if options are used or not
        if (data[8] == 1) {
          redeemableGlobalSupplyCapOption = true
        }

        if (data[9 + (redeemableGlobalSupplyCapOption ? 8 : 0)] == 1) {
          depositoriesRoutingWeightBpsOption = true
        }

        if (
          data[
            10 +
              (redeemableGlobalSupplyCapOption ? 8 : 0) +
              (depositoriesRoutingWeightBpsOption ? 2 * 3 : 0)
          ] == 1
        ) {
          routerDepositoriesOption = true
        }

        const layout: Layout<any>[] = [
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
        ]

        layout.push(u8('redeemableGlobalSupplyCapOption'))
        if (redeemableGlobalSupplyCapOption) {
          layout.push(u64('redeemableGlobalSupplyCap'))
        }

        layout.push(u8('depositoriesRoutingWeightBpsOption'))
        if (depositoriesRoutingWeightBpsOption) {
          layout.push(u16('identityDepositoryWeightBps'))
          layout.push(u16('mercurialVaultDepositoryWeightBps'))
          layout.push(u16('credixLpDepositoryWeightBps'))
        }

        layout.push(u8('routerDepositoriesOption'))
        if (routerDepositoriesOption) {
          layout.push(publicKey('identityDepository'))
          layout.push(publicKey('mercurialVaultDepository'))
          layout.push(publicKey('credixLpDepository'))
        }

        const dataLayout = struct(layout)

        const {
          redeemableGlobalSupplyCap,
          identityDepositoryWeightBps,
          mercurialVaultDepositoryWeightBps,
          credixLpDepositoryWeightBps,
          identityDepository,
          mercurialVaultDepository,
          credixLpDepository,
        } = dataLayout.decode(Buffer.from(data)) as any

        return (
          <>
            <p>{`Redeemable global supply cap: ${
              redeemableGlobalSupplyCap
                ? redeemableGlobalSupplyCap.toString()
                : 'Not used'
            }`}</p>
            <p>{`Identity depository weight (bps): ${
              identityDepositoryWeightBps
                ? identityDepositoryWeightBps.toString()
                : 'Not used'
            }`}</p>
            <p>{`Mercurial vault depository weight (bps): ${
              mercurialVaultDepositoryWeightBps
                ? mercurialVaultDepositoryWeightBps.toString()
                : 'Not used'
            }`}</p>
            <p>{`Credix lp depository weight (bps): ${
              credixLpDepositoryWeightBps
                ? credixLpDepositoryWeightBps.toString()
                : 'Not used'
            }`}</p>
            <p>{`Identity depository: ${
              identityDepository ? identityDepository.toString() : 'Not used'
            }`}</p>
            <p>{`Mercurial vault depository: ${
              mercurialVaultDepository
                ? mercurialVaultDepository.toString()
                : 'Not used'
            }`}</p>
            <p>{`Credix Lp depository: ${
              credixLpDepository ? credixLpDepository.toString() : 'Not used'
            }`}</p>
          </>
        )
      },
    },

    179: {
      name: 'UXD - Register Credix Lp Depository',
      accounts: [
        'Authority',
        'Payer',
        'Controller',
        'Depository',
        'Collateral Mint',
        'Depository Collateral',
        'Depository Shares',
        'Credix Program State',
        'Credix Global Market State',
        'Credix Signing Authority',
        'Credix Liquidity Collateral',
        'Credix Shares Mint',
        'System Program',
        'Token Program',
        'Associated Token Program',
        'Rent',
      ],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        const dataLayout = struct([
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
          u8('mintingFeeInBps'),
          u8('redeemingFeeInBps'),
          u128('redeemableAmountUnderManagementCap'),
        ])
        const {
          mintingFeeInBps,
          redeemingFeeInBps,
          redeemableAmountUnderManagementCap,
        } = dataLayout.decode(Buffer.from(data)) as any
        return (
          <>
            <p>{`Minting fee in bps: ${mintingFeeInBps.toString()}`}</p>
            <p>{`Redeeming fee in bps: ${redeemingFeeInBps.toString()}`}</p>
            <p>{`Native redeemable amount under management cap: ${redeemableAmountUnderManagementCap.toString()}`}</p>
          </>
        )
      },
    },

    153: {
      name: 'UXD - Mint with Credix Lp Depository',
      accounts: [
        'User',
        'Payer',
        'Controller',
        'Depository',
        'Redeemable Mint',
        'Collateral Mint',
        'User Redeemable',
        'User Collateral',
        'Depository Collateral',
        'Depository Shares',
        'Credix Global Market State',
        'Credix Signing Authority',
        'Credix Liquidity Collateral',
        'Credix Shares Mint',
        'Credix Pass',
        'System Program',
        'Token Program',
        'Associated Token Program',
        'Credix Program',
        'Rent',
      ],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        accounts: AccountMetaData[]
      ) => {
        const dataLayout = struct([
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
          nu64('collateralAmount'),
        ])
        const { collateralAmount } = dataLayout.decode(Buffer.from(data)) as any
        const collateralMintName = getSplTokenNameByMint(accounts[5].pubkey)
        return (
          <>
            <p>{`Collateral amount: ${nativeToUi(
              collateralAmount,
              6
            ).toLocaleString()}`}</p>
            <p>Collateral mint: {collateralMintName}</p>
          </>
        )
      },
    },

    103: {
      name: 'UXD - Edit Credix Lp Depository',
      accounts: ['Authority', 'Controller', 'Depository'],
      getDataUI: (
        _connection: Connection,
        data: Uint8Array,
        _accounts: AccountMetaData[]
      ) => {
        let redeemableAmountUnderManagementCapOption = false
        let mintingFeeInBpsOption = false
        let redeemingFeeInBpsOption = false
        let mintingDisabledOption = false
        let profitsBeneficiaryCollateralOption = false

        // Check if options are used or not
        if (data[8] == 1) {
          redeemableAmountUnderManagementCapOption = true
        }

        if (
          data[9 + (redeemableAmountUnderManagementCapOption ? 16 : 0)] == 1
        ) {
          mintingFeeInBpsOption = true
        }

        if (
          data[
            10 +
              (redeemableAmountUnderManagementCapOption ? 16 : 0) +
              (mintingFeeInBpsOption ? 1 : 0)
          ] == 1
        ) {
          redeemingFeeInBpsOption = true
        }

        if (
          data[
            11 +
              (redeemableAmountUnderManagementCapOption ? 16 : 0) +
              (mintingFeeInBpsOption ? 1 : 0) +
              (redeemingFeeInBpsOption ? 1 : 0)
          ] == 1
        ) {
          mintingDisabledOption = true
        }

        if (
          data[
            12 +
              (redeemableAmountUnderManagementCapOption ? 16 : 0) +
              (mintingFeeInBpsOption ? 1 : 0) +
              (redeemingFeeInBpsOption ? 1 : 0) +
              (mintingDisabledOption ? 1 : 0)
          ] == 1
        ) {
          profitsBeneficiaryCollateralOption = true
        }

        const layout: Layout<any>[] = [
          u8('instruction'),
          ...ANCHOR_DISCRIMINATOR_LAYOUT,
        ]

        layout.push(u8('redeemableAmountUnderManagementCapOption'))
        if (redeemableAmountUnderManagementCapOption) {
          layout.push(u128('redeemableAmountUnderManagementCap'))
        }

        layout.push(u8('mintingFeeInBpsOption'))
        if (mintingFeeInBpsOption) {
          layout.push(u8('mintingFeeInBps'))
        }

        layout.push(u8('redeemingFeeInBpsOption'))
        if (redeemingFeeInBpsOption) {
          layout.push(u8('redeemingFeeInBps'))
        }

        layout.push(u8('mintingDisabledOption'))
        if (mintingDisabledOption) {
          layout.push(bool('mintingDisabled'))
        }

        layout.push(u8('profitsBeneficiaryCollateralOption'))
        if (profitsBeneficiaryCollateralOption) {
          layout.push(publicKey('profitsBeneficiaryCollateral'))
        }

        const dataLayout = struct(layout)

        const {
          redeemableAmountUnderManagementCap,
          mintingFeeInBps,
          redeemingFeeInBps,
          mintingDisabled,
          profitsBeneficiaryCollateral,
        } = dataLayout.decode(Buffer.from(data)) as any

        return (
          <>
            <p>{`Native redeemable depository supply cap: ${
              redeemableAmountUnderManagementCapOption
                ? redeemableAmountUnderManagementCap.toString()
                : 'Not used'
            }`}</p>
            <p>{`Minting fee in bps: ${
              mintingFeeInBpsOption ? mintingFeeInBps.toString() : 'Not used'
            }`}</p>
            <p>{`Redeeming fee in bps: ${
              redeemingFeeInBpsOption
                ? redeemingFeeInBps.toString()
                : 'Not used'
            }`}</p>
            <p>{`Minting disabled: ${
              mintingDisabledOption ? mintingDisabled.toString() : 'Not used'
            }`}</p>
            <p>{`Profits beneficiary collateral: ${
              profitsBeneficiaryCollateralOption
                ? profitsBeneficiaryCollateral.toString()
                : 'Not used'
            }`}</p>
          </>
        )
      },
    },
  },
}
