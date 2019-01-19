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
  ListingData,
  Marketplace
} from '../types/Marketplace/Marketplace'

import {
  Listing,
  IPFSListingData,
  ListingExtraData,
  User,
  IPFSListingCurrency,
  IPFSListingCommission,
  IPFSListingCommissionPerUnit,
  Media,
} from '../types/schema'

export function handleListingCreated(event: ListingCreated): void {
  // Create the Listing
  let id = event.params.listingID.toString()
  let listing = new Listing(id)
  listing.offers = []
  listing.ipfsData = []
  listing.seller = event.params.party
  listing.status = "created"
  listing.blockNumber = event.block.number
  listing.extraDataCount = 0

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

  // These are the initial Listings of the pinned Updated Listings
  pinnedHashes.push('QmVAJ8U3QKrBzYdbBJBJnwYGeiVrYtjcMT8CqA4z4csKMK')
  pinnedHashes.push('QmY8JXrf87hVufey9Rd1168iiLdrjmPK62yS6P86Foqf45')
  pinnedHashes.push('QmZt5fi7Jfijz9EPRoxJSXtuBzadXtXskRSV7wch4DiU3X')



  // Only Run ipfs.cat() if it is a hardcoded base58 hash
  let i = pinnedHashes.indexOf(base58Hash)
  if (i != -1) {
    let getIPFSData = ipfs.cat(base58Hash)
    let data = json.fromBytes(getIPFSData).toObject()
    let ipfsListingData = new IPFSListingData(base58Hash)
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

  // Push to array to store IPFS hash (in bytes)
  let ipfsArray = listing.ipfsBytesHashes
  ipfsArray.push(event.params.ipfsHash)
  listing.ipfsBytesHashes = ipfsArray

  // Push to array to store IPFS hash (in base58)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  let base58Array = listing.ipfsBase58Hashes
  base58Array.push(base58Hash)
  listing.ipfsBase58Hashes = base58Array

  //////////////// JSON PARSING BELOW /////////////////////////////////////

  // TODO: Remove eventually - as these are hardcoded files that I have pinned to IPFS, until we can reach their node
  // Note, these are three hand picked hashes of ListingUpdates. The top ones
  // are the original listing hashes, and get pinned in ListingCreated
  let pinnedHashes = new Array<string>()
  // pinnedHashes.push('QmVAJ8U3QKrBzYdbBJBJnwYGeiVrYtjcMT8CqA4z4csKMK')
  pinnedHashes.push('QmYtWo8rBaYWK2xqWzrJvQv7mp949pM7aC2hz1YLTPtkKK')

  // pinnedHashes.push('QmY8JXrf87hVufey9Rd1168iiLdrjmPK62yS6P86Foqf45')
  pinnedHashes.push('QmXE1c445bqvSQo2p1S9w74QB7hJhEqvpzgpVmKDs6bg79')

  // Note - this QmzT is stored in two different listings, and is overwritten in our db
  // but that is okay since it is the exact same file
  // pinnedHashes.push('QmZt5fi7Jfijz9EPRoxJSXtuBzadXtXskRSV7wch4DiU3X')
  pinnedHashes.push('QmV7Qd8zDZv1pTtgmQgqKv8yfe8tHtKvqoc4uSMZ16dZgg')

  // Only Run ipfs.cat() if it is a hardcoded base58 hash
  let i = pinnedHashes.indexOf(base58Hash)
  if (i != -1) {
    let getIPFSData = ipfs.cat(base58Hash)
    let data = json.fromBytes(getIPFSData).toObject()
    let ipfsListingData = new IPFSListingData(base58Hash)
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

export function handleListingWithdrawn(event: ListingWithdrawn): void {
  let id = event.params.listingID.toString()
  let listing = Listing.load(id)
  listing.status = "withdrawn"

  // Push to array to store IPFS hash (in bytes)
  let ipfsArray = listing.ipfsBytesHashes
  ipfsArray.push(event.params.ipfsHash)
  listing.ipfsBytesHashes = ipfsArray

  // Push to array to store IPFS hash (in base58)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  let base58Array = listing.ipfsBase58Hashes
  base58Array.push(base58Hash)
  listing.ipfsBase58Hashes = base58Array

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

  // Push to array to store IPFS hash (in bytes)
  let ipfsArray = listing.ipfsBytesHashes
  ipfsArray.push(event.params.ipfsHash)
  listing.ipfsBytesHashes = ipfsArray

  // Push to array to store IPFS hash (in base58)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function
  let base58Array = listing.ipfsBase58Hashes
  base58Array.push(base58Hash)
  listing.ipfsBase58Hashes = base58Array

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
export function handleListingData(event: ListingData): void {
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