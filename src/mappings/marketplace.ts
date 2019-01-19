import {
  BigInt,
  Bytes,
  ipfs,
  json,
  ByteArray,
} from '@graphprotocol/graph-ts'

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
  Marketplace
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
  IPFSListingCurrency,
  IPFSListingCommission,
  IPFSListingCommissionPerUnit,
  Media,
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
  // Create the Listing
  let id = event.params.listingID.toHex()
  let listing = new Listing(id)
  listing.offers = []
  listing.ipfsData = []
  listing.seller = event.params.party
  listing.status = "open"
  listing.blockNumber = event.block.number

  // Create array to store all related IPFS hashes (in hex)
  listing.ipfsBytesHashes = []
  let ipfsArray = listing.ipfsBytesHashes
  ipfsArray.push(event.params.ipfsHash)
  listing.ipfsBytesHashes = ipfsArray

  // Create array to store all related IPFS hashes (in base58)
  listing.ipfsBase58Hashes = []
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  let base58Array = listing.ipfsBase58Hashes
  base58Array.push(base58Hash)
  listing.ipfsBase58Hashes = base58Array

  // Direct call the contract for deposit and depositManager
  let smartContract = Marketplace.bind(event.address)
  let storageListing = smartContract.listings(event.params.listingID)
  listing.deposit = storageListing.value1
  listing.depositManager = storageListing.value2

  //////////////// JSON PARSING BELOW /////////////////////////////////////

  // TODO: Remove eventually - as these are hardcoded files that I have pinned to IPFS, until we can reach their node
  let pinnedHashes = new Array<string>()
  pinnedHashes.push('QmeUWRKoqSKK9qyyzu3VLFVGmjpUmfgLiYpeYnu5jDzHvB')
  pinnedHashes.push('QmPvmW469mYPXaBuvbEHB66MY7JAYGPvBncfESMourCKWW')
  pinnedHashes.push('QmdqtRB69x4KK2j8w5mZkVsZ1y7WShRXwWKS4jSBdQqJnx')
  pinnedHashes.push('QmXRBSQFG6bNYtu6znpMyrFeZ5hGwxov7Kew8v8TvJqkhx')
  pinnedHashes.push('QmVKp9AHksCNdaHQKbMqetNVXUG3KVhFiASabXzogo2xD8')
  pinnedHashes.push('QmQFPod7GFneL7FrmZTxC6jr2P5mKv6RrW8GSQ7fSz2mdi')

  // Only Run ipfs.cat() if it is a hardcoded base58 hash
  let i = pinnedHashes.indexOf(base58Hash)
  if (i != -1) {
    let getIPFSData = ipfs.cat(base58Hash)
    let data = json.fromBytes(getIPFSData).toObject()
    let ipfsListingData = new IPFSListingData(base58Hash)
    ipfsListingData.listingID = id
    ipfsListingData.schemaId = data.get('schemaId').toString()
    ipfsListingData.listingType = data.get('listingType').toString()
    ipfsListingData.category = data.get('category').toString()
    ipfsListingData.subCategory = data.get('subCategory').toString()
    ipfsListingData.language = data.get('language').toString()
    ipfsListingData.title = data.get('title').toString()
    ipfsListingData.description = data.get('description').toString()
    ipfsListingData.unitsTotal = data.get('unitsTotal').toBigInt()
    ipfsListingData.media = []

    // Creating Price
    ipfsListingData.price = base58Hash
    let priceObject = data.get('price').toObject()
    let listingCurrency = new IPFSListingCurrency(base58Hash)
    listingCurrency.amount = priceObject.get('amount').toString() // Can't use toBigInt(), since it is already coming in with kind STRING. so for now we store it as a string too
    listingCurrency.currency = priceObject.get('currency').toString()
    listingCurrency.save()

    // Creating Commission, if it exists
    let c = data.get('commission')
    if (c != null) {
      ipfsListingData.commission = base58Hash
      let commissionObject = c.toObject()
      let commission = new IPFSListingCommission(base58Hash)
      commission.amount = commissionObject.get('amount').toString()
      commission.currency = commissionObject.get('currency').toString()
      commission.save()
    }

    // Creating CommissionPerUnit, if it exists
    let cpu = data.get('commissionPerUnit')
    if (cpu  != null) {
      ipfsListingData.commissionPerUnit = base58Hash
      let cpuObject = cpu.toObject()
      let cpuEntity = new IPFSListingCommissionPerUnit(base58Hash)
      cpuEntity.amount = cpuObject.get('amount').toString()
      cpuEntity.currency = cpuObject.get('currency').toString()
      cpuEntity.save()
    }

    // Creating dappSchemaId, if it exists
    let dappSchemaId = data.get('dappSchemaId')
    if (dappSchemaId != null){
      ipfsListingData.dappSchemaId = dappSchemaId.toString()
    }

    // Creating the media array, if it exists
    let media = data.get('media')
    if (media != null){
      let mediaArray = media.toArray()
      for (let i = 0; i <mediaArray.length; i++){
        let mediaID = BigInt.fromI32(i).toString().concat('-').concat(base58Hash)
        let mediaEntity = new Media(mediaID)
        mediaEntity.listing = base58Hash
        let url = mediaArray[i].toObject().get('url').toString()
        let contentType = mediaArray[i].toObject().get('contentType').toString()
        mediaEntity.url = url
        mediaEntity.contentType = contentType
        mediaEntity.save()
      }
    }

    ipfsListingData.save()
  }

  listing.save()
}


// TODO: delete this amongst all functions, it is wrong
// let ipfsID = createIPFSDataID(id, listing.ipfsBytesHashes.length) // relateing to ipfs hashed, because I dont think you can get length from the derivedFrom length
// let ipfsListingData = new IPFSListingData(ipfsID)
// ipfsListingData.listingID = id
// ipfsListingData.save()

export function handleListingUpdated(event: ListingUpdated): void {
  let id = event.params.listingID.toHex()
  let listing = Listing.load(id)

  let ipfsArray = listing.ipfsBytesHashes
  ipfsArray.push(event.params.ipfsHash)
  listing.ipfsBytesHashes = ipfsArray

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
  let ipfsArray = listing.ipfsBytesHashes
  ipfsArray.push(event.params.ipfsHash)
  listing.ipfsBytesHashes = ipfsArray
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

  let ipfsArray = listing.ipfsBytesHashes
  ipfsArray.push(event.params.ipfsHash)
  listing.ipfsBytesHashes = ipfsArray
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
  let extraDataID = changetype<string>(listing.listingExtraData.length as i32)

  let extraData = new ListingExtraData(extraDataID)
  extraData.ipfsHash = event.params.ipfsHash
  extraData.sender = event.params.party
  extraData.listingID = id


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
  } else if (event.params.ruling == BigInt.fromI32(1)) {
    offer.ruling = "Buyer"
  } else if (event.params.ruling == BigInt.fromI32(2)) {
    offer.ruling = "Com + Seller"
  } else if (event.params.ruling == BigInt.fromI32(3)) {
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
  let extraDataID = offerID.concat(offer.extraOfferCount.toString())
  offer.extraOfferCount = offer.extraOfferCount.plus(BigInt.fromI32(1))
  offer.save()

  let extraData = new OfferExtraData(extraDataID)
  extraData.offerID = offerID
  extraData.ipfsHash = event.params.ipfsHash
  extraData.sender = event.params.party

  extraData.save()
}

// HELPERS


// I DONT THINK THIS IS NEEDED, EACH IPFS DATA CAN JUST USE THE  IPFS HASH AS THE ID...

function createIPFSDataID(entityID: string, ipfsDataLength: number): string {
  // let ipfsID =  changetype<string>(ipfsDataLength as i32)
  let ipfsID = BigInt.fromI32(ipfsDataLength as i32).toString()
  let id = entityID.concat("-").concat(ipfsID)
  return id
}

// Helper for concatenating two byte arrays
function concat(a: ByteArray, b: ByteArray): ByteArray {
  let out = new Uint8Array(a.length + b.length)
  for (let i = 0; i < a.length; i++) {
    out[i] = a[i]
  }
  for (let j = 0; j < b.length; j++) {
    out[a.length + j] = b[j]
  }
  return out as Bytes
}

// Helper adding 0x12 and 0x20 to make the proper ipfs hash
// the returned bytes32 is so [0,31]
function addQm(a: ByteArray): ByteArray {
  let out = new Uint8Array(34)
  out[0] = 0x12
  out[1] = 0x20
  for (let i = 0; i < 32; i++) {
    out[i + 2] = a[i]
  }
  return out as ByteArray
}