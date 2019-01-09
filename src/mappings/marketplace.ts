import {} from '@graphprotocol/graph-ts'
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

export function handleMarketplaceData(event: MarketplaceDataEvent): void {

}

export function handleAffiliateAdded(event: AffiliateAdded): void {

}

export function handleAffiliateRemoved(event: AffiliateRemoved): void {

}

export function handleListingCreated(event: ListingCreated): void {

}

export function handleListingUpdated(event: ListingUpdated): void {

}

export function handleListingWithdrawn(event: ListingWithdrawn): void {

}

export function handleListingarbitrated(event: ListingArbitrated): void {

}

export function handleListingData(event: ListingData): void {

}

export function handleOfferCreated(event: OfferCreated): void {

}

export function handleOfferAccepted(event: OfferAccepted): void {

}

export function handleOfferFundsAdded(event: OfferFundsAdded): void {

}

export function handleOfferDisputed(event: OfferDisputed): void {

}

export function handleOfferRuling(event: OfferRuling): void {

}

export function handleOfferData(event: OfferData): void {

}