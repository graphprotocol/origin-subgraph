import {
  handleListingCreated,
  handleListingUpdated,
  handleListingWithdrawn,
  handleListingArbitrated,
  handleListingData,
} from "./listings";

import {
  handleMarketplaceData,
  handleAffiliateAdded,
  handleAffiliateRemoved,
} from "./marketplace";

import {
  handleOfferCreated,
  handleOfferAccepted,
  handleOfferFinalized,
  handleOfferWithdrawn,
  handleOfferFundsAdded,
  handleOfferDisputed,
  handleOfferRuling,
  handleOfferData,
} from "./offers";

export {
  handleListingCreated,
  handleListingUpdated,
  handleListingWithdrawn,
  handleListingArbitrated,
  handleListingData,

  handleMarketplaceData,
  handleAffiliateAdded,
  handleAffiliateRemoved,

  handleOfferCreated,
  handleOfferAccepted,
  handleOfferFinalized,
  handleOfferWithdrawn,
  handleOfferFundsAdded,
  handleOfferDisputed,
  handleOfferRuling,
  handleOfferData,
}


//////////// HELPERS /////////////////////////

import {ByteArray} from '@graphprotocol/graph-ts'

// Helper adding 0x12 and 0x20 to make the proper ipfs hash
// the returned bytes32 is so [0,31]
export function addQm(a: ByteArray): ByteArray {
  let out = new Uint8Array(34)
  out[0] = 0x12
  out[1] = 0x20
  for (let i = 0; i < 32; i++) {
    out[i + 2] = a[i]
  }
  return out as ByteArray
}

// changetype comes from assembly script, and is recognized by the ASC
export function numberToString(num: number): string {
  return changetype<string>(num as i32)
}