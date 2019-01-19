import {
  BigInt,
  Bytes,
  ipfs,
  json,
  ByteArray,
} from '@graphprotocol/graph-ts'

import {

  OfferCreated,
  OfferAccepted,
  OfferFundsAdded,
  OfferDisputed,
  OfferRuling,
  OfferData,
} from '../types/Marketplace/Marketplace'

import {
  Offer,
  OfferExtraData,
  IPFSOfferData,
  User,
} from '../types/schema'

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