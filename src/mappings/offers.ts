import {
  BigInt,
  Bytes,
  ipfs,
  json,
  Address
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
  OfferData as OD,
  Marketplace,
} from '../types/Marketplace/Marketplace'

import {
  Offer,
  OfferExtraData,
  Review,
  User,
  Listing,
} from '../types/schema'


export function handleOfferCreated(event: OfferCreated): void {
  // Create the offering
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = new Offer(offerID)
  offer.listingID = event.params.listingID.toString()
  offer.blockNumber = event.block.number
  offer.buyer = event.params.party
  offer.offerExtraData = []
  offer.extraDataCount = 0
  offer.schemaId = ''
  offer.listingType = ''
  offer.unitsPurchased = BigInt.fromI32(0)
  offer.reviews = []

  // Create user if it doesn't exist
  let user = User.load(event.params.party.toHex())
  if (user == null) {
    user = new User(event.params.party.toHex())
    user.offers = []
    user.listings = []
    user.save()
  }

  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function

  // Direct call the contract for Offer storage values
  let smartContract = Marketplace.bind(event.address)
  let storageOffer = smartContract.offers(event.params.listingID, event.params.offerID)
  offer.value = storageOffer.value0
  offer.commission = storageOffer.value1
  offer.refund = storageOffer.value2
  offer.buyer = storageOffer.value4
  offer.affiliate = storageOffer.value5
  offer.arbitrator = storageOffer.value6
  offer.status = storageOffer.value8

  //////////////// JSON PARSING BELOW /////////////////////////////////////

  // NOTE - holding to 7,100,000 until we can connect to Origin IPFS node through swarm
  if (event.block.number.toI32() < 7100000) {
    let getIPFSData = ipfs.cat(base58Hash)
    let data = json.fromBytes(getIPFSData).toObject()
    offer.schemaId = data.get('schemaId').toString()
    offer.listingType = data.get('listingType').toString()
    offer.unitsPurchased = data.get('unitsPurchased').toBigInt()

    // Creating finalizes, if it exists
    let finalizes = data.get('finalizes')
    if (finalizes != null){
      offer.finalizes = finalizes.toBigInt()
    }

    let totalPriceObject = data.get('totalPrice').toObject()
    offer.currency = totalPriceObject.get('currency').toString()
    offer.price = totalPriceObject.get('amount').toString()


    let commissionObject =  data.get('commission').toObject()
    offer.commissionCurrency = commissionObject.get('currency').toString()
    offer.commissionPrice = commissionObject.get('amount').toString()
  }
  offer.save()
}

export function handleOfferAccepted(event: OfferAccepted): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Note - no need to read IPFS hashes, since all they do is indicate acceptance, and it is always the same hash
  // For Reference, the common hash seen is Qmf71bRMJtYEQpPUq8KvrBtBHFxmMneMTME2HCiqvKBrEU
  // let hexHash = addQm(event.params.ipfsHash) as Bytes
  // let base58Hash = hexHash.toBase58() // imported crypto function

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
  offer.status = 4 // we set to 4,  a custom value to indicate offer is finalized

  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function

  //////////////// JSON PARSING BELOW /////////////////////////////////////

  // NOTE - holding to 7,090,000 until we can connect to Origin IPFS node through swarm
  if (event.block.number.toI32() < 7100000) {
    let getIPFSData = ipfs.cat(base58Hash)
    let data = json.fromBytes(getIPFSData).toObject()
    let review = new Review(base58Hash)
    review.blockNumber = event.block.number
    review.offerID = id
    review.schemaId = data.get('schemaId').toString()
    review.rating = data.get('rating').toBigInt().toI32()
    review.text = data.get('text').toString()
    review.save()
  }
  offer.save()
}

// Note - if handler runs, the offer gets deleted off the blockchain
// but we choose not to delete it
export function handleOfferWithdrawn(event: OfferWithdrawn): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Note - no need to read IPFS hashes, since all they do is indicate finalization.
  // The common hashes are:
  // QmPVPouaHjCtbZF5bpLaHVjyFgds8ohegwHTxuLuqwviD2
  // QmcTeo1NTZPyydseLg5AQF3rU59Tqgc6vxUMw1Yd8UCyLW
  // let hexHash = addQm(event.params.ipfsHash) as Bytes
  // let base58Hash = hexHash.toBase58() // imported crypto function

  offer.status = 5// we set to 5,  a custom value to indicate offer is withdrawn
  offer.save()
}

// NOTE  - not emitted on mainnet yet, so can't test
export function handleOfferFundsAdded(event: OfferFundsAdded): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Direct call the contract for offer finalizes and offer status
  let smartContract = Marketplace.bind(event.address)
  let storageOffer = smartContract.offers(event.params.listingID, event.params.offerID)
  offer.value = storageOffer.value0
  offer.save()

  // Note - no need to read IPFS hashes, since all they do is indicate funds added
  // and it is probably always the same hash. But this event has never been emitted on
  // mainnet, so no way to see what the typical hash is
  // Push to array to store IPFS hash (in base58)
  // let hexHash = addQm(event.params.ipfsHash) as Bytes
  // let base58Hash = hexHash.toBase58() // imported crypto function
}

export function handleOfferDisputed(event: OfferDisputed): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)
  offer.status = 3 // we can just set three, instead of calling contract directly

  if (event.params.party == offer.buyer) {
    offer.disputer = "buyer"
  } else {
    offer.disputer = "seller"
  }
  // Note - no need to read IPFS hashes, since all they do is indicate a dispute, and these
  // all share the same hashes, which are:
      // QmNbryRJbJpYPj2VAihcUD9cdLUv1o1DtG7BCcxVaBeUqf
      // QmPuYJbNjauKLysq2gnAMAoHxn5AHfcBFRQSktG2ARvAYs
  // Push to array to store IPFS hash (in base58)
  // let hexHash = addQm(event.params.ipfsHash) as Bytes
  // let base58Hash = hexHash.toBase58() // imported crypto function

  offer.save()
}

// Note - if handler runs, the offer gets deleted off the blockchain
// but we choose not to delete it
export function handleOfferRuling(event: OfferRuling): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)
  offer.ruling = event.params.ruling

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
  // Push to array to store IPFS hash (in base58)
  // let hexHash = addQm(event.params.ipfsHash) as Bytes
  // let base58Hash = hexHash.toBase58() // imported crypto function
}

export function handleOfferData(event: OD): void {
  let id = event.params.offerID.toString()
  let offerID = event.params.listingID.toString().concat("-".concat(id))
  let offer = Offer.load(offerID)

  // Odd that this is needed. You can make OfferData before an OfferCreated
  if (offer == null) {
    offer = new Offer(offerID)
    offer.listingID = event.params.listingID.toString()
    offer.blockNumber = event.block.number
    offer.value = BigInt.fromI32(0)
    offer.commission = BigInt.fromI32(0)
    offer.refund = BigInt.fromI32(0)
    offer.buyer = Address.fromString("0x0000000000000000000000000000000000000000")
    offer.affiliate = Address.fromString("0x0000000000000000000000000000000000000000")
    offer.arbitrator = Address.fromString("0x0000000000000000000000000000000000000000")
    offer.offerExtraData = []
    offer.extraDataCount = 0
    offer.schemaId = ''
    offer.listingType = ''
    offer.unitsPurchased = BigInt.fromI32(0)
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