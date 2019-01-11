import {BigInt} from '@graphprotocol/graph-ts'
import {
  MarketplaceData as MarketplaceDataEvent,
  AffiliateAdded,
  AffiliateRemoved,
  ListingCreated,
  ListingUpdated,
  ListingWithdrawn,
  ListingArbitrated,
  ListingData,
  OfferCreated,
  OfferAccepted,
  OfferFundsAdded,
  OfferDisputed,
  OfferRuling,
  OfferData,
} from '../types/Marketplace/Marketplace'

import {
  Listing,
  Offer,
  IPFSListingData,
  ListingExtraData,
  OfferExtraData,
  IPFSOfferData,
  User,
  AllowedAffiliates,
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
  let allowed = AllowedAffiliates.load(id)
  if (allowed == null) {
    allowed = new AllowedAffiliates(id)
    allowed.affiliates = []
    allowed.ipfsHash = []
  }

  let aa = allowed.affiliates
  aa.push(event.params.party)
  allowed.affiliates = aa

  allowed.ipfsHash.push(event.params.ipfsHash)

  allowed.save()
}

// NOTE  - not emitted on mainnet yet, so can't test
export function handleAffiliateRemoved(event: AffiliateRemoved): void {
  let id = "0"
  let allowed = AllowedAffiliates.load(id)
  let aa = allowed.affiliates

  let i = aa.indexOf(event.params.party)
  aa.splice(i, 1)
  allowed.affiliates = aa
  allowed.save()
}

export function handleListingCreated(event: ListingCreated): void {
  let id = event.params.listingID.toHex()
  let listing = new Listing(id)
  listing.ipfsHashes = [event.params.ipfsHash]
  listing.offers = []
  listing.ipfsData = []
  listing.seller = event.params.party
  listing.status = "open"

  //TODO direct call teh contract for deposit and depositManager, if those arent available in the IPFS data
  //TODO read the IPFS data


  listing.save()

}

export function handleListingUpdated(event: ListingUpdated): void {
  let id = event.params.listingID.toHex()
  let listing = Listing.load(id)

  listing.ipfsHashes.push(event.params.ipfsHash) // todo - make sure this works


  //TODO direct call the contract for deposit
  // todo - read the ipfs data

  listing.save()

}

export function handleListingWithdrawn(event: ListingWithdrawn): void {
  let id = event.params.listingID.toHex()
  let listing = Listing.load(id)
  listing.ipfsHashes.push(event.params.ipfsHash) // todo - make sure this works
  listing.status = "withdrawn"

  //TODO direct call the contract for deposit
  // todo - read the ipfs data
  listing.save()

}

// NOTE  - not emitted on mainnet yet, so can't test
// TODO - what does arbitrated mean, seems like it is just withdrawing money from the listing, but not closing it out
export function handleListingArbitrated(event: ListingArbitrated): void {
  let id = event.params.listingID.toHex()
  let listing = Listing.load(id)

  listing.ipfsHashes.push(event.params.ipfsHash) // todo - make sure this works
  listing.status = "arbitrated"

  //TODO direct call the contract for deposit
  // todo - read the ipfs data
  listing.save()

}

export function handleListingData(event: ListingData): void {
  let id = event.params.listingID.toHex()
  let listing = Listing.load(id)
  let extraDataID = listing.listingExtraData.length.toString()

  let extraData = new ListingExtraData(extraDataID)
  extraData.ipfsHash = event.params.ipfsHash
  extraData.sender = event.params.party
  extraData.listingID = event.params.listingID

  extraData.save()
}

export function handleOfferCreated(event: OfferCreated): void {
  let id = event.params.offerID.toHex() // TODO - concatenate the offer id
  let offer = new Offer(id)
  offer.buyer = event.params.party
  offer.ipfsHashes = [event.params.ipfsHash]
  offer.eventStatus = "open"

  //tODO direct call contract
  // todo - read ipfs data

  offer.save()

}

export function handleOfferAccepted(event: OfferAccepted): void {
  let id = event.params.offerID.toHex()
  let offer = Offer.load(id)
  offer.ipfsHashes.push(event.params.ipfsHash)
  offer.eventStatus = "accepted"

  //tODO direct call contract
  // todo - read ipfs data

  offer.save()

}

// NOTE  - not emitted on mainnet yet, so can't test
export function handleOfferFundsAdded(event: OfferFundsAdded): void {
  let id = event.params.offerID.toHex()
  let offer = Offer.load(id)
  offer.ipfsHashes.push(event.params.ipfsHash)

  //tODO direct call contract
  // todo - read ipfs data

  offer.save()

}

export function handleOfferDisputed(event: OfferDisputed): void {
  let id = event.params.offerID.toHex()
  let offer = Offer.load(id)
  offer.ipfsHashes.push(event.params.ipfsHash)

  if (event.params.party == offer.buyer) {
    offer.disputer = "buyer"
  } else {
    offer.disputer = "seller"
  }

  //tODO direct call contract
  // todo - read ipfs data

  offer.save()
}

export function handleOfferRuling(event: OfferRuling): void {
  let id = event.params.offerID.toHex()
  let offer = Offer.load(id)
  offer.ipfsHashes.push(event.params.ipfsHash)

  if (event.params.ruling == BigInt.fromI32(0)) {
    offer.ruling = "Seller"
  } else if (event.params.ruling == BigInt.fromI32(1)){
    offer.ruling = "Buyer"
  } else if (event.params.ruling == BigInt.fromI32(2)){
    offer.ruling = "Com + Seller"
  } else if (event.params.ruling == BigInt.fromI32(3)){
    offer.ruling = "Com + Buyer"
  }


  //tODO direct call contract
  // todo - read ipfs data

  offer.save()

}

export function handleOfferData(event: OfferData): void {
  let id = event.params.listingID.toHex()
  let offer = Offer.load(id)
  let extraDataID = offer.offerExtraData.length.toString()

  let extraData = new OfferExtraData(extraDataID)
  extraData.ipfsHash = event.params.ipfsHash
  extraData.sender = event.params.party

  extraData.save()
}