import { eth } from 'decentraland-eth'
import { isOpen, hasStatus } from 'lib/utils'
import { PUBLICATION_STATUS } from 'modules/publication/utils'

// From Mortgage.js on the server
export const MORTGAGE_STATUS = Object.freeze({
  pending: 'pending',
  ongoing: 'ongoing',
  paid: 'paid'
})

export const isPending = mortgage =>
  hasStatus(mortgage, [MORTGAGE_STATUS.pending])
export const isOngoing = mortgage =>
  hasStatus(mortgage, [MORTGAGE_STATUS.ongoing])
export const isPaid = mortgage => hasStatus(mortgage, [MORTGAGE_STATUS.paid])

// Interest in seconds
export function toInterestRate(r) {
  return Math.trunc(10000000 / r) * 360 * 86400
}

export function daysToSeconds(days) {
  return Math.ceil(days) * 24 * 60 * 60
}

export function getLoanMetadata() {
  const mortgageManagerContract = eth.getContract('MortgageManager')
  return `#mortgage #required-cosigner:${mortgageManagerContract.address}`
}

/**
 * Returns mortgages active -> pending status require an open publication
 * @param {array} - mortgages
 * @param  {array} - parcels
 * @returns {array} - mortgages
 */
export function getActiveMortgages(mortgages, parcels) {
  return mortgages.filter(mortgage => {
    const parcel = parcels[mortgage.asset_id]
    return (
      mortgage &&
      parcel &&
      ((isOpen(mortgage, MORTGAGE_STATUS.pending) &&
        isOpen(parcel.publication, PUBLICATION_STATUS.open)) ||
        hasStatus(mortgage, [MORTGAGE_STATUS.ongoing, MORTGAGE_STATUS.paid]))
    )
  })
}

/**
 * filter actibe mortgages by borrower
 * @param {object} - obj with status & tx_status fields
 * @param  {array} - parcels
 * @returns {array} - mortgages
 */
export function getActiveMortgagesByBorrower(mortgages, parcels, borrower) {
  return getActiveMortgages(mortgages, parcels).filter(
    mortgage => mortgage && mortgage.borrower === borrower
  )
}