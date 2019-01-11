import {BigInt, Value, Bytes} from '@graphprotocol/graph-ts'
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

export function handleListingCreated(event: ListingCreated): void {
  let id = event.params.listingID.toHex()
  let listing = new Listing(id)
  listing.ipfsHashes = new Array<Bytes>()
  listing.offers = []
  listing.ipfsData = []
  listing.seller = event.params.party
  listing.status = "open"

  let ipfsArray = listing.ipfsHashes
  ipfsArray.push(event.params.ipfsHash)
  listing.ipfsHashes = ipfsArray

  //TODO direct call teh contract for deposit and depositManager, if those arent available in the IPFS data
  //TODO read the IPFS data

  listing.save()


  let ipfsID = createIPFSDataID(id, listing.ipfsHashes.length) // relateing to ipfs hashed, because I dont think you can get length from the derivedFrom length
  let ipfsListingData = new IPFSListingData(ipfsID)
  ipfsListingData.listingID = id
  ipfsListingData.save()


}



export function handleListingUpdated(event: ListingUpdated): void {
  let id = event.params.listingID.toHex()
  let listing = Listing.load(id)

  let ipfsArray = listing.ipfsHashes
  ipfsArray.push(event.params.ipfsHash)
  listing.ipfsHashes = ipfsArray

  //TODO direct call the contract for deposit
  // todo - read the ipfs data

  listing.save()

  let ipfsID = createIPFSDataID(id, listing.ipfsData.length)
  let ipfsListingData = new IPFSListingData(ipfsID)
  ipfsListingData.listingID = id
  ipfsListingData.save()

}

export function handleListingWithdrawn(event: ListingWithdrawn): void {
  let id = event.params.listingID.toHex()
  let listing = Listing.load(id)
  let ipfsArray = listing.ipfsHashes
  ipfsArray.push(event.params.ipfsHash)
  listing.ipfsHashes = ipfsArray
  listing.status = "withdrawn"

  //TODO direct call the contract for deposit
  // todo - read the ipfs data
  listing.save()

  let ipfsID = createIPFSDataID(id, listing.ipfsData.length)
  let ipfsListingData = new IPFSListingData(ipfsID)
  ipfsListingData.listingID = id
  ipfsListingData.save()

}

// NOTE  - not emitted on mainnet yet, so can't test
// TODO - what does arbitrated mean, seems like it is just withdrawing money from the listing, but not closing it out
export function handleListingArbitrated(event: ListingArbitrated): void {
  let id = event.params.listingID.toHex()
  let listing = Listing.load(id)

  let ipfsArray = listing.ipfsHashes
  ipfsArray.push(event.params.ipfsHash)
  listing.ipfsHashes = ipfsArray
  listing.status = "arbitrated"

  //TODO direct call the contract for deposit
  // todo - read the ipfs data
  listing.save()

  let ipfsID = createIPFSDataID(id, listing.ipfsData.length)
  let ipfsListingData = new IPFSListingData(ipfsID)
  ipfsListingData.listingID = id
  ipfsListingData.save()

}

export function handleListingData(event: ListingData): void {
  let id = event.params.listingID.toHex()
  let listing = Listing.load(id)

  // changetype comes from assembly script, and is recognized by the ASC
  let extraDataID =  changetype<string>(listing.listingExtraData.length as i32)

  let extraData = new ListingExtraData(extraDataID)
  extraData.ipfsHash = event.params.ipfsHash
  extraData.sender = event.params.party
  extraData.listingID =  id


  extraData.save()
}

export function handleOfferCreated(event: OfferCreated): void {
  let id = event.params.offerID.toHex()
  let offerID = event.params.listingID.toHex().concat("-".concat(id))
  let offer = new Offer(offerID)
  offer.listingID = event.params.listingID.toHex()
  offer.buyer = event.params.party
  offer.ipfsHashes = new Array<Bytes>()
  offer.offerExtraData = []
  offer.ipfsData = []
  offer.extraOfferCount = BigInt.fromI32(0)
  offer.eventStatus = "open"

  let ipfsArray = offer.ipfsHashes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashes = ipfsArray
  //tODO direct call contract
  // todo - read ipfs data

  offer.save()

  let ipfsID = createIPFSDataID(offerID, offer.ipfsHashes.length)
  let ipfsOfferData = new IPFSOfferData(ipfsID)
  ipfsOfferData.offerID = offerID
  ipfsOfferData.save()




}

export function handleOfferAccepted(event: OfferAccepted): void {
  let id = event.params.offerID.toHex()
  let offerID = event.params.listingID.toHex().concat("-".concat(id))
  let offer = Offer.load(offerID)
  let ipfsArray = offer.ipfsHashes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashes = ipfsArray
  offer.eventStatus = "accepted"

  //tODO direct call contract
  // todo - read ipfs data

  offer.save()

  let ipfsID = createIPFSDataID(offerID, offer.ipfsData.length)
  let ipfsOfferData = new IPFSOfferData(ipfsID)
  ipfsOfferData.offerID = offerID
  ipfsOfferData.save()
}

// NOTE  - not emitted on mainnet yet, so can't test
export function handleOfferFundsAdded(event: OfferFundsAdded): void {
  let id = event.params.offerID.toHex()
  let offerID = event.params.listingID.toHex().concat("-".concat(id))
  let offer = Offer.load(offerID)
  let ipfsArray = offer.ipfsHashes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashes = ipfsArray

  //tODO direct call contract
  // todo - read ipfs data

  offer.save()

  let ipfsID = createIPFSDataID(offerID, offer.ipfsData.length)
  let ipfsOfferData = new IPFSOfferData(ipfsID)
  ipfsOfferData.offerID = offerID
  ipfsOfferData.save()
}

export function handleOfferDisputed(event: OfferDisputed): void {
  let id = event.params.offerID.toHex()
  let offerID = event.params.listingID.toHex().concat("-".concat(id))
  let offer = Offer.load(offerID)
  let ipfsArray = offer.ipfsHashes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashes = ipfsArray

  if (event.params.party == offer.buyer) {
    offer.disputer = "buyer"
  } else {
    offer.disputer = "seller"
  }

  //tODO direct call contract
  // todo - read ipfs data

  offer.save()

  let ipfsID = createIPFSDataID(offerID, offer.ipfsData.length)
  let ipfsOfferData = new IPFSOfferData(ipfsID)
  ipfsOfferData.offerID = offerID
  ipfsOfferData.save()
}

export function handleOfferRuling(event: OfferRuling): void {
  let id = event.params.offerID.toHex()
  let offerID = event.params.listingID.toHex().concat("-".concat(id))
  let offer = Offer.load(offerID)

  let ipfsArray = offer.ipfsHashes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashes = ipfsArray

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

  let ipfsID = createIPFSDataID(offerID, offer.ipfsData.length)
  let ipfsOfferData = new IPFSOfferData(ipfsID)
  ipfsOfferData.offerID = offerID
  ipfsOfferData.save()

}

export function handleOfferData(event: OfferData): void {
  let id = event.params.offerID.toHex()
  let offerID = event.params.listingID.toHex().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Odd that this is needed. You can make OfferData before an OfferCreated
  if (offer == null) {
    offer = new Offer(offerID)
    offer.ipfsHashes = new Array<Bytes>()
    offer.offerExtraData = []
    offer.ipfsData = []
    offer.eventStatus = "open"
    offer.extraOfferCount = BigInt.fromI32(0)
    offer.save()
  }

  // changetype comes from assembly script, and is recognized by the ASC
  let extraDataID =  offerID.concat(offer.extraOfferCount.toString())
  offer.extraOfferCount = offer.extraOfferCount.plus(BigInt.fromI32(1))
  offer.save()

  let extraData = new OfferExtraData(extraDataID)
  extraData.offerID = offerID
  extraData.ipfsHash = event.params.ipfsHash
  extraData.sender = event.params.party

  extraData.save()
}

// HELPERS

function createIPFSDataID(entityID: string, ipfsDataLength: number):  string{
  // let ipfsID =  changetype<string>(ipfsDataLength as i32)
  let ipfsID = BigInt.fromI32(ipfsDataLength as i32).toString()
  let id = entityID.concat("-").concat(ipfsID)
  return id
}