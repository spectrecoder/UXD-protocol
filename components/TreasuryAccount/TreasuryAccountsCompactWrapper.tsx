import TreasuryAccountsItems from './TreasuryAccountsItems'
import HoldTokensTotalPrice from './HoldTokensTotalPrice'
import useInstructions from '@hooks/useInstructions'

const TreasuryAccountsCompactWrapper = () => {
  const { governedTokenAccounts } = useInstructions()
  console.log(governedTokenAccounts)
  return governedTokenAccounts.length ? (
    <div className="bg-bkg-2 p-4 md:p-6 rounded-lg mt-5">
      <h3 className="mb-4">Treasury</h3>
      <HoldTokensTotalPrice />
      <div className="max-h-full overflow-y-auto">
        <TreasuryAccountsItems />
      </div>
    </div>
  ) : null
}

export default TreasuryAccountsCompactWrapper
