import {
  BigInt,
  Bytes,
  ipfs,
  json,
} from '@graphprotocol/graph-ts'

import {addQm} from "./origin";

import {
  OfferCreated,
  OfferAccepted,
  OfferFinalized,
  OfferWithdrawn,
  OfferFundsAdded,
  OfferDisputed,
  OfferRuling,
  OfferData, Marketplace,
} from '../types/Marketplace/Marketplace'

import {
  Offer,
  OfferExtraData,
  Review,
  IPFSOfferData,
  User,
  IPFSOfferTotalPrice, IPFSOfferCommission, Listing, IPFSListingData,
} from '../types/schema'

export function handleOfferCreated(event: OfferCreated): void {
  // Create the offering
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = new Offer(offerID)
  offer.listingID = event.params.listingID.toString()
  offer.blockNumber = event.block.number
  offer.buyer = event.params.party
  offer.ipfsHashesBytes = []
  offer.offerExtraData = []
  offer.ipfsData = []
  offer.extraDataCount = 0

  // Create array to store all related IPFS hashes (in hex)
  let ipfsArray = offer.ipfsHashesBytes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashesBytes = ipfsArray

  // Create array to store all related IPFS hashes (in base58)
  offer.ipfsHashesBase58 = []
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  let base58Array = offer.ipfsHashesBase58
  base58Array.push(base58Hash)
  offer.ipfsHashesBase58 = base58Array

  // Direct call the contract for Offer storage values
  let smartContract = Marketplace.bind(event.address)
  let storageOffer = smartContract.offers(event.params.listingID, event.params.offerID)
  offer.value = storageOffer.value0
  offer.commission = storageOffer.value1
  offer.refund = storageOffer.value2
  offer.currency = storageOffer.value3
  offer.buyer = storageOffer.value4
  offer.affiliate = storageOffer.value5
  offer.arbitrator = storageOffer.value6
  offer.finalizes = storageOffer.value7
  offer.status = storageOffer.value8

  //////////////// JSON PARSING BELOW /////////////////////////////////////

  // TODO: Remove eventually - as these are hardcoded files that I have pinned to IPFS, until we can reach their node
  let pinnedHashes = new Array<string>()
  pinnedHashes.push('QmNrHAWLraUujzGz1adSZYLShDbhPJ4kDryd64GsX2xXGq')
  pinnedHashes.push('QmPZxJPiCtXuTH7ecmMsR9f4mSR6onvo141q8JKZRCBidZ')
  pinnedHashes.push('QmViFco482NKAAhSE5WLbHYh3ES9eoSDTTTbQjgRvzkLQS')
  pinnedHashes.push('QmVbAv2C4XVsE4xwSgsryyGGSPKgR96TAusUSYDR4zqffo')
  pinnedHashes.push('QmYVUZWMaf43svg24f3gdE3yJRpLKtekzst3BuEXxkqKnM')

  // Only Run ipfs.cat() if it is a hardcoded base58 hash
  let i = pinnedHashes.indexOf(base58Hash)
  if (i != -1) {
    let getIPFSData = ipfs.cat(base58Hash)
    let data = json.fromBytes(getIPFSData).toObject()
    let ipfsOfferData = new IPFSOfferData(base58Hash)
    ipfsOfferData.offerID = offerID
    ipfsOfferData.blockNumber = event.block.number

    ipfsOfferData.schemaId = data.get('schemaId').toString()
    ipfsOfferData.listingType = data.get('listingType').toString()
    ipfsOfferData.unitsPurchased = data.get('unitsPurchased').toBigInt()

    // Creating listingId, if it exists
    let listingId = data.get('listingId')
    if (listingId != null){
      ipfsOfferData.listingId = listingId.toString()
    }

    // Creating finalizes, if it exists
    let finalizes = data.get('finalizes')
    if (finalizes != null){
      ipfsOfferData.finalizes = finalizes.toBigInt()
    }

    ipfsOfferData.totalPrice = base58Hash
    let totalPriceObject = data.get('totalPrice').toObject()
    let totalPrice = new IPFSOfferTotalPrice(base58Hash)
    totalPrice.currency = totalPriceObject.get('currency').toString()
    totalPrice.amount = totalPriceObject.get('amount').toString()
    totalPrice.save()


    ipfsOfferData.commission = base58Hash
    let commissionObject =  data.get('commission').toObject()
    let commission = new IPFSOfferCommission(base58Hash)
    commission.currency = commissionObject.get('currency').toString()
    commission.amount = commissionObject.get('amount').toString()
    commission.save()

    ipfsOfferData.save()
  }
  offer.save()
}

export function handleOfferAccepted(event: OfferAccepted): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Push to array to store IPFS hash (in bytes)
  let ipfsArray = offer.ipfsHashesBytes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashesBytes = ipfsArray

  // Push to array to store IPFS hash (in base58)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  let base58Array = offer.ipfsHashesBase58
  base58Array.push(base58Hash)
  offer.ipfsHashesBase58 = base58Array

  // Note - no need to read IPFS hashes, since all they do is indicate acceptance, and it is
  // always the same hash
  // For Reference, the common hash seen is:
      // Qmf71bRMJtYEQpPUq8KvrBtBHFxmMneMTME2HCiqvKBrEU

  // Direct call the contract for offer finalizes and offer status
  let smartContract = Marketplace.bind(event.address)
  let storageOffer = smartContract.offers(event.params.listingID, event.params.offerID)
  offer.finalizes = storageOffer.value7
  offer.status = storageOffer.value8
  offer.save()

  // Direct call the contract to update listing deposit
  let listingID = event.params.listingID.toString()
  let listing = Listing.load(listingID)
  let storageListing = smartContract.listings(event.params.listingID)
  listing.deposit = storageListing.value1
  listing.save()
}

// Note - if handler runs, the offer gets deleted off the blockchain
// but we choose not to delete it
export function handleOfferFinalized(event: OfferFinalized): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Push to array to store IPFS hash (in bytes)
  let ipfsArray = offer.ipfsHashesBytes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashesBytes = ipfsArray
  offer.status = 4 // we set to 4,  a custom value to indicate offer is finalized

  // Push to array to store IPFS hash (in base58)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  let base58Array = offer.ipfsHashesBase58
  base58Array.push(base58Hash)
  offer.ipfsHashesBase58 = base58Array

  //////////////// JSON PARSING BELOW /////////////////////////////////////

  // TODO: Remove eventually - as these are hardcoded files that I have pinned to IPFS, until we can reach their node
  let pinnedHashes = new Array<string>()
  pinnedHashes.push('QmWquyKYE9qL31McDrSas2uZCzbp711u3rBTr1YqbuGfGw')
  pinnedHashes.push('QmPdDMCvZGF47MTMAaurqbwj9XLi5dKx8rNM4vfVg5r6ir')
  pinnedHashes.push('QmU5BGjyX7QcWjz5VFDzsFLTLLo9b5ivyXiCN4WKJUuWoh')

  // Only Run ipfs.cat() if it is a hardcoded base58 hash
  let i = pinnedHashes.indexOf(base58Hash)
  if (i != -1) {
    let getIPFSData = ipfs.cat(base58Hash)
    let data = json.fromBytes(getIPFSData).toObject()
    let review = new Review(base58Hash)
    review.blockNumber = event.block.number
    review.schemaId = data.get('schemaId').toString()
    review.rating = data.get('rating').toBigInt().toI32()
    review.text = data.get('text').toString()
    review.save()

    offer.review = base58Hash
  }
  offer.save()
}

// Note - if handler runs, the offer gets deleted off the blockchain
// but we choose not to delete it
export function handleOfferWithdrawn(event: OfferWithdrawn): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Push to array to store IPFS hash (in bytes)
  let ipfsArray = offer.ipfsHashesBytes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashesBytes = ipfsArray
  offer.status = 5// we set to 5,  a custom value to indicate offer is withdrawn

  // Push to array to store IPFS hash (in base58)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  let base58Array = offer.ipfsHashesBase58
  base58Array.push(base58Hash)
  offer.ipfsHashesBase58 = base58Array

  // Note - no need to read IPFS hashes, since all they do is indicate finalization.
  // The common hashes are:
    // QmPVPouaHjCtbZF5bpLaHVjyFgds8ohegwHTxuLuqwviD2
    // QmcTeo1NTZPyydseLg5AQF3rU59Tqgc6vxUMw1Yd8UCyLW

  offer.save()
}

// NOTE  - not emitted on mainnet yet, so can't test
export function handleOfferFundsAdded(event: OfferFundsAdded): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Push to array to store IPFS hash (in bytes)
  let ipfsArray = offer.ipfsHashesBytes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashesBytes = ipfsArray

  // Push to array to store IPFS hash (in base58)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  let base58Array = offer.ipfsHashesBase58
  base58Array.push(base58Hash)
  offer.ipfsHashesBase58 = base58Array

  // Direct call the contract for offer finalizes and offer status
  let smartContract = Marketplace.bind(event.address)
  let storageOffer = smartContract.offers(event.params.listingID, event.params.offerID)
  offer.value = storageOffer.value0
  offer.save()

  // Note - no need to read IPFS hashes, since all they do is indicate funds added
  // and it is probably always the same hash. But this event has never been emitted on
  // mainnet, so no way to see what the typical hash is
}

export function handleOfferDisputed(event: OfferDisputed): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Push to array to store IPFS hash (in bytes)
  let ipfsArray = offer.ipfsHashesBytes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashesBytes = ipfsArray
  offer.status = 3 // we can just set three, instead of calling contract directly

  // Push to array to store IPFS hash (in base58)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  let base58Array = offer.ipfsHashesBase58
  base58Array.push(base58Hash)
  offer.ipfsHashesBase58 = base58Array

  if (event.params.party == offer.buyer) {
    offer.disputer = "buyer"
  } else {
    offer.disputer = "seller"
  }
  // Note - no need to read IPFS hashes, since all they do is indicate a dispute, and these
  // all share the same hashes, which are:
      // QmNbryRJbJpYPj2VAihcUD9cdLUv1o1DtG7BCcxVaBeUqf
      // QmPuYJbNjauKLysq2gnAMAoHxn5AHfcBFRQSktG2ARvAYs

  offer.save()
}

// Note - if handler runs, the offer gets deleted off the blockchain
// but we choose not to delete it
export function handleOfferRuling(event: OfferRuling): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Push to array to store IPFS hash (in bytes)
  let ipfsArray = offer.ipfsHashesBytes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashesBytes = ipfsArray
  offer.ruling = event.params.ruling

  // Push to array to store IPFS hash (in base58)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  let base58Array = offer.ipfsHashesBase58
  base58Array.push(base58Hash)
  offer.ipfsHashesBase58 = base58Array

  // Direct call the contract for offer finalizes and offer status
  let smartContract = Marketplace.bind(event.address)
  let storageOffer = smartContract.offers(event.params.listingID, event.params.offerID)
  offer.refund = storageOffer.value2
  offer.save()

  let storageListing = smartContract.listings(event.params.listingID)
  let listing = Listing.load(event.params.listingID.toString())
  listing.deposit = storageListing.value1
  listing.save()

  // Note - no need to read IPFS hashes, since all they do is indicate a ruling, and these
  // all share the same hashes, which are:
      // QmXMNjzcp6JBT3oaXLCWJp4xXfWg2Egifc5bWLJbPY377t
      // QmaWYrgrQCgSesPb5y8bPpNFCazipFYtWfK4HuA3WAGZVa
}

export function handleOfferData(event: OfferData): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Odd that this is needed. You can make OfferData before an OfferCreated
  if (offer == null) {
    offer = new Offer(offerID)
    offer.ipfsHashesBytes = new Array<Bytes>()
    offer.blockNumber = event.block.number
    offer.offerExtraData = []
    offer.ipfsData = []
    offer.extraDataCount = 0
    offer.save()
  }

  // conversions required for ASC
  let extraDataID = offerID.concat('-').concat(BigInt.fromI32(offer.extraDataCount).toString())
  let extraData = new OfferExtraData(extraDataID)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  extraData.ipfsHashBase58 = base58Hash
  extraData.ipfsHashBytes = event.params.ipfsHash
  extraData.sender = event.params.party
  extraData.offerID = offerID
  extraData.save()

  offer.extraDataCount = offer.extraDataCount + 1
  offer.save()
}