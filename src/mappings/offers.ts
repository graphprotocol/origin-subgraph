import {
  BigInt,
  Bytes,
  ipfs,
  json,
} from '@graphprotocol/graph-ts'

import {
  addQm,
  numberToString
} from "./origin";

import {
  OfferCreated,
  OfferAccepted,
  OfferFundsAdded,
  OfferDisputed,
  OfferRuling,
  OfferData, Marketplace,
} from '../types/Marketplace/Marketplace'

import {
  Offer,
  OfferExtraData,
  IPFSOfferData,
  User,
  IPFSOfferTotalPrice, IPFSOfferCommission, Listing,
} from '../types/schema'

export function handleOfferCreated(event: OfferCreated): void {
  // Create the offering
  let id = event.params.offerID.toHex()
  let offerID = event.params.listingID.toHex().concat("-".concat(id))
  let offer = new Offer(offerID)
  offer.listingID = event.params.listingID.toHex()
  offer.buyer = event.params.party
  offer.ipfsHashesBytes = []
  offer.offerExtraData = []
  offer.ipfsData = []
  offer.eventStatus = "open"

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
  let id = event.params.offerID.toHex()
  let offerID = event.params.listingID.toHex().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Push to array to store IPFS hash (in bytes)
  let ipfsArray = offer.ipfsHashesBytes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashesBytes = ipfsArray
  offer.eventStatus = "accepted"

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
  let listingID = event.params.listingID.toHex()
  let listing = Listing.load(listingID)
  let storageListing = smartContract.listings(event.params.listingID)
  listing.deposit = storageListing.value1
  listing.save()
}

// NOTE  - not emitted on mainnet yet, so can't test
export function handleOfferFundsAdded(event: OfferFundsAdded): void {
  let id = event.params.offerID.toHex()
  let offerID = event.params.listingID.toHex().concat("-".concat(id))
  let offer = Offer.load(offerID)
  let ipfsArray = offer.ipfsHashesBytes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashesBytes = ipfsArray

  //tODO direct call contract
  // todo - read ipfs data

  offer.save()
}

export function handleOfferDisputed(event: OfferDisputed): void {
  let id = event.params.offerID.toHex()
  let offerID = event.params.listingID.toHex().concat("-".concat(id))
  let offer = Offer.load(offerID)
  let ipfsArray = offer.ipfsHashesBytes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashesBytes = ipfsArray

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
  let offerID = event.params.listingID.toHex().concat("-".concat(id))
  let offer = Offer.load(offerID)

  let ipfsArray = offer.ipfsHashesBytes
  ipfsArray.push(event.params.ipfsHash)
  offer.ipfsHashesBytes = ipfsArray

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
}

export function handleOfferData(event: OfferData): void {
  let id = event.params.offerID.toHex()
  let offerID = event.params.listingID.toHex().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Odd that this is needed. You can make OfferData before an OfferCreated
  if (offer == null) {
    offer = new Offer(offerID)
    offer.ipfsHashesBytes = new Array<Bytes>()
    offer.offerExtraData = []
    offer.ipfsData = []
    offer.eventStatus = "open"
    offer.save()
  }

  let extraDataID = numberToString(offer.offerExtraData.length) // TODO - THIS WONT WORK, BEACUASE THERE IS NO REAL LENGHT ON THE DERIVED FROM FIELD. MUST MAKE AN EXTRA COUNT LENGTH
  let extraData = new OfferExtraData(extraDataID)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  extraData.ipfsHashBase58 = base58Hash
  extraData.ipfsHashBytes = event.params.ipfsHash
  extraData.sender = event.params.party
  extraData.offerID = offerID

  extraData.save()
}