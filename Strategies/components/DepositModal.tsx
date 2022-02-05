import Modal from '@components/Modal'
import Deposit from './DepositComponent'
import ModalHeader from './ModalHeader'
import ModalLeftSide from './ModalLeftSide'
import ModalRightSide from './ModalRightSide'

const DepositModal = ({
  onClose,
  isOpen,
  handledMint,
  liquidity,
  apy,
  protocolName,
  protocolLogoSrc,
  handledTokenName,
  strategyName,
  strategyDescription,
  currentPosition,
  createProposalFcn,
}) => {
  return (
    <Modal sizeClassName="max-w-6xl" onClose={onClose} isOpen={isOpen}>
      <ModalHeader
        protocolLogoURI={protocolLogoSrc}
        protocolName={protocolName}
        TokenName={handledTokenName}
        strategy={strategyName}
      ></ModalHeader>
      <div className="flex flex-items">
        <ModalLeftSide
          strategy={strategyName}
          liquidity={liquidity}
          projectedYield={apy}
        >
          <div>{strategyDescription}</div>
        </ModalLeftSide>
        <ModalRightSide>
          <Deposit
            handledMint={handledMint}
            currentPosition={currentPosition}
            createProposalFcn={createProposalFcn}
          ></Deposit>
        </ModalRightSide>
      </div>
    </Modal>
  )
}

export default DepositModal
