import {
  BigInt,
  Bytes,
  ipfs,
  json,
} from '@graphprotocol/graph-ts'

import {addQm}  from "./origin";

import {
  ListingCreated,
  ListingUpdated,
  ListingWithdrawn,
  ListingArbitrated,
  ListingData as LD,
  Marketplace
} from '../types/Marketplace/Marketplace'

import {
  Listing,
  ListingExtraData,
  User,
  Media,
} from '../types/schema'

export function handleListingCreated(event: ListingCreated): void {
  // Create the Listing
  let id = event.params.listingID.toString()
  let listing = new Listing(id)
  listing.offers = []
  listing.seller = event.params.party
  listing.status = "created"
  listing.blockNumber = event.block.number
  listing.extraDataCount = 0
  listing.schemaId = ''
  listing.listingType = ''
  listing.category = ''
  listing.subCategory = ''
  listing.language = ''
  listing.title = ''
  listing.description = ''
  listing.unitsTotal = BigInt.fromI32(0)

  // Create the user if it doesn't exist
  let user = User.load(event.params.party.toHex())
  if (user == null) {
    user = new User(event.params.party.toHex())
    user.offers = []
    user.listings = []
    user.save()
  }

  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function


  // Direct call the contract for deposit and depositManager
  let smartContract = Marketplace.bind(event.address)
  let storageListing = smartContract.listings(event.params.listingID)
  listing.deposit = storageListing.value1
  listing.depositManager = storageListing.value2

  //////////////// JSON PARSING BELOW /////////////////////////////////////

  // NOTE - holding to 7,090,000 until we can connect to Origin IPFS node through swarm
  if (event.block.number.toI32() < 7100000) {
    let getIPFSData = ipfs.cat(base58Hash)
    let data = json.fromBytes(getIPFSData).toObject()
    listing.schemaId = data.get('schemaId').toString()
    listing.listingType = data.get('listingType').toString()
    listing.category = data.get('category').toString()
    listing.subCategory = data.get('subCategory').toString()
    listing.language = data.get('language').toString()
    listing.title = data.get('title').toString()
    listing.description = data.get('description').toString()
    listing.unitsTotal = data.get('unitsTotal').toBigInt()
    listing.media = []

    let priceObject = data.get('price').toObject()
    listing.price = priceObject.get('amount').toString() // Can't use toBigInt(), since it is already kind STRING. so for now we store it as a string too
    listing.currency = priceObject.get('currency').toString()

    let c = data.get('commission')
    if (c != null) {
      let commissionObject = c.toObject()
      listing.commissionAmount = commissionObject.get('amount').toString()
      listing.commissionCurrency = commissionObject.get('currency').toString()
    }

    let cpu = data.get('commissionPerUnit')
    if (cpu  != null) {
      let cpuObject = cpu.toObject()
      listing.commissionPerUnit = cpuObject.get('amount').toString()
      listing.commissionPerUnitCurrency = cpuObject.get('currency').toString()
    }

    // Creating dappSchemaId, if it exists
    let dappSchemaId = data.get('dappSchemaId')
    if (dappSchemaId != null){
      listing.dappSchemaId = dappSchemaId.toString()
    }

    // Creating the media array, if it exists
    let media = data.get('media')
    if (media != null){
      let mediaArray = media.toArray()
      for (let i = 0; i <mediaArray.length; i++){
        let mediaID = BigInt.fromI32(i).toString().concat('-').concat(base58Hash)
        let mediaEntity = new Media(mediaID)
        mediaEntity.listingID = id
        let url = mediaArray[i].toObject().get('url').toString()
        let contentType = mediaArray[i].toObject().get('contentType').toString()
        mediaEntity.url = url
        mediaEntity.contentType = contentType
        mediaEntity.save()
      }
    }
  }
  listing.save()
}

// This is treated as a full update to the Listing, as we are unable to tell which fields
// were updated based on just on the IPFS hash
export function handleListingUpdated(event: ListingUpdated): void {
  let id = event.params.listingID.toString()
  let listing = Listing.load(id)

  // Direct call the contract for deposit and depositManager
  let smartContract = Marketplace.bind(event.address)
  let storageListing = smartContract.listings(event.params.listingID)
  listing.deposit = storageListing.value1
  listing.status = "updated"

  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function

  //////////////// JSON PARSING BELOW /////////////////////////////////////

  // NOTE - holding to 7,090,000 until we can connect to Origin IPFS node through swarm
  if (event.block.number.toI32() < 7090000) {
    let getIPFSData = ipfs.cat(base58Hash)
    let data = json.fromBytes(getIPFSData).toObject()
    listing.schemaId = data.get('schemaId').toString()
    listing.listingType = data.get('listingType').toString()
    listing.category = data.get('category').toString()
    listing.subCategory = data.get('subCategory').toString()
    listing.language = data.get('language').toString()
    listing.title = data.get('title').toString()
    listing.description = data.get('description').toString()
    listing.unitsTotal = data.get('unitsTotal').toBigInt()
    listing.media = []

    let priceObject = data.get('price').toObject()
    listing.price = priceObject.get('amount').toString() // Can't use toBigInt(), since it is already kind STRING. so for now we store it as a string too
    listing.currency = priceObject.get('currency').toString()

    let c = data.get('commission')
    if (c != null) {
      let commissionObject = c.toObject()
      listing.commissionAmount = commissionObject.get('amount').toString()
      listing.commissionCurrency = commissionObject.get('currency').toString()
    }

    let cpu = data.get('commissionPerUnit')
    if (cpu  != null) {
      let cpuObject = cpu.toObject()
      listing.commissionPerUnit = cpuObject.get('amount').toString()
      listing.commissionPerUnitCurrency = cpuObject.get('currency').toString()
    }

    // Creating dappSchemaId, if it exists
    let dappSchemaId = data.get('dappSchemaId')
    if (dappSchemaId != null){
      listing.dappSchemaId = dappSchemaId.toString()
    }

    // Creating the media array, if it exists
    let media = data.get('media')
    if (media != null){
      let mediaArray = media.toArray()
      for (let i = 0; i <mediaArray.length; i++){
        let mediaID = BigInt.fromI32(i).toString().concat('-').concat(base58Hash)
        let mediaEntity = new Media(mediaID)
        mediaEntity.listingID = id
        let url = mediaArray[i].toObject().get('url').toString()
        let contentType = mediaArray[i].toObject().get('contentType').toString()
        mediaEntity.url = url
        mediaEntity.contentType = contentType
        mediaEntity.save()
      }
    }
  }
  listing.save()
}

export function handleListingWithdrawn(event: ListingWithdrawn): void {
  let id = event.params.listingID.toString()
  let listing = Listing.load(id)
  listing.status = "withdrawn"
  // let hexHash = addQm(event.params.ipfsHash) as Bytes
  // let base58Hash = hexHash.toBase58() // imported crypto function

  // Note - no need to read IPFS hashes, since all they do is indicate withdrawal
  // For Reference, the two common hashes seen are:
        // QmPvzW94qWJKPkgKipRNVpQEDhHBg8SSw4chjF7iadBMvf
        // Qmf4vxsjQypTHZ9yPKXgyqDu2MF5cxcUwYZkfzjYVLHHt9

  listing.save()
}

// Note  - not emitted on mainnet yet, so can't test
// Emitted from function sendDeposit(), which allows depositManger to send deposit
export function handleListingArbitrated(event: ListingArbitrated): void {
  let id = event.params.listingID.toString()
  let listing = Listing.load(id)
  listing.status = "arbitrated"

  // Push to array to store IPFS hash (in base58)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function

  // Direct call the contract for deposit and depositManager
  let smartContract = Marketplace.bind(event.address)
  let storageListing = smartContract.listings(event.params.listingID)
  listing.deposit = storageListing.value1

  // Note - no need to read IPFS hashes, since none exist yet, and it is unclear what the
  // fields would be here, and the naming is not clear on what ListingArbitrated has for a schema

  listing.save()
}

// Extra data that is emitted as an event, not stored on ethereum
// Note - not emitted on mainnet yet, so can't test
export function handleListingData(event: LD): void {
  let id = event.params.listingID.toString()
  let listing = Listing.load(id)

  // conversions required for ASC
  let extraDataID = id.concat('-').concat(BigInt.fromI32(listing.extraDataCount).toString())
  let extraData = new ListingExtraData(extraDataID)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  extraData.ipfsHashBase58 = base58Hash
  extraData.ipfsHashBytes = event.params.ipfsHash
  extraData.sender = event.params.party
  extraData.listingID = id
  extraData.save()

  listing.extraDataCount = listing.extraDataCount + 1
  listing.save()
}