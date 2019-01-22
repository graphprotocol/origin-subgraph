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
  ListingData,
  ListingExtraData,
  User,
  ListingCurrency,
  ListingCommission,
  ListingCommissionPerUnit,
  Media,
} from '../types/schema'

export function handleListingCreated(event: ListingCreated): void {
  // Create the Listing
  let id = event.params.listingID.toString()
  let listing = new Listing(id)
  listing.offers = []
  listing.data = []
  listing.seller = event.params.party
  listing.status = "created"
  listing.blockNumber = event.block.number
  listing.extraDataCount = 0

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
    let ipfsListingData = new ListingData(base58Hash)
    ipfsListingData.listingID = id
    ipfsListingData.blockNumber = event.block.number
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
    let listingCurrency = new ListingCurrency(base58Hash)
    listingCurrency.amount = priceObject.get('amount').toString() // Can't use toBigInt(), since it is already coming in with kind STRING. so for now we store it as a string too
    listingCurrency.currency = priceObject.get('currency').toString()
    listingCurrency.save()

    // Creating Commission, if it exists
    let c = data.get('commission')
    if (c != null) {
      ipfsListingData.commission = base58Hash
      let commissionObject = c.toObject()
      let commission = new ListingCommission(base58Hash)
      commission.amount = commissionObject.get('amount').toString()
      commission.currency = commissionObject.get('currency').toString()
      commission.save()
    }

    // Creating CommissionPerUnit, if it exists
    let cpu = data.get('commissionPerUnit')
    if (cpu  != null) {
      ipfsListingData.commissionPerUnit = base58Hash
      let cpuObject = cpu.toObject()
      let cpuEntity = new ListingCommissionPerUnit(base58Hash)
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
        mediaEntity.ipfsHash = base58Hash
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
    let ipfsListingData = new ListingData(base58Hash)
    ipfsListingData.listingID = id
    ipfsListingData.blockNumber = event.block.number
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
    let listingCurrency = new ListingCurrency(base58Hash)
    listingCurrency.amount = priceObject.get('amount').toString() // Can't use toBigInt(), since it is already coming in with kind STRING. so for now we store it as a string too
    listingCurrency.currency = priceObject.get('currency').toString()
    listingCurrency.save()

    // Creating Commission, if it exists
    let c = data.get('commission')
    if (c != null) {
      ipfsListingData.commission = base58Hash
      let commissionObject = c.toObject()
      let commission = new ListingCommission(base58Hash)
      commission.amount = commissionObject.get('amount').toString()
      commission.currency = commissionObject.get('currency').toString()
      commission.save()
    }

    // Creating CommissionPerUnit, if it exists
    let cpu = data.get('commissionPerUnit')
    if (cpu  != null) {
      ipfsListingData.commissionPerUnit = base58Hash
      let cpuObject = cpu.toObject()
      let cpuEntity = new ListingCommissionPerUnit(base58Hash)
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
        mediaEntity.ipfsHash = base58Hash
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