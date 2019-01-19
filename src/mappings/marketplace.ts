import {} from '@graphprotocol/graph-ts'

import {
  MarketplaceData as MarketplaceDataEvent,
  AffiliateAdded,
  AffiliateRemoved,
} from '../types/Marketplace/Marketplace'

import {
  User,
  AllowedAffiliate,
  MarketplaceData,
} from '../types/schema'

// NOTE  - not emitted on mainnet yet, so can't test
export function handleMarketplaceData(event: MarketplaceDataEvent): void {
  let id = event.params.ipfsHash.toHex()
  let data = new MarketplaceData(id)
  data.party = event.params.party
  data.save()
}

export function handleAffiliateAdded(event: AffiliateAdded): void {
  let id = "0"
  let allowed = AllowedAffiliate.load(id)
  if (allowed == null) {
    allowed = new AllowedAffiliate(id)
    allowed.affiliates = []
    allowed.ipfsHash = []
  }

  let aa = allowed.affiliates
  aa.push(event.params.party)
  allowed.affiliates = aa

  // DOES NOT WORK
  // allowed.ipfsHash.push(event.params.ipfsHash)
  let ipfsArray = allowed.ipfsHash

  ipfsArray.push(event.params.ipfsHash)
  allowed.ipfsHash = ipfsArray

  allowed.save()
}

// NOTE  - not emitted on mainnet yet, so can't test
export function handleAffiliateRemoved(event: AffiliateRemoved): void {
  let id = "0"
  let allowed = AllowedAffiliate.load(id)
  let aa = allowed.affiliates

  let i = aa.indexOf(event.params.party)
  aa.splice(i, 1)
  allowed.affiliates = aa
  allowed.save()
}