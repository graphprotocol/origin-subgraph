import {IdentityDeleted, IdentityUpdated} from '../types/IdentityEvents/IdentityEvents'
import {Attestation, User, UserProfile,} from '../types/schema'
import {addQm} from "./origin";
import {Bytes, ipfs, json} from "@graphprotocol/graph-ts";

export function handleIdentityUpdated(event: IdentityUpdated): void {
  let id = event.params.account.toHex()
  let user = new User(id)
  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function

  let getIPFSData = ipfs.cat(base58Hash)
  if (getIPFSData == null) {
    user.ipfsCatSuccess = false
  } else {
    user.ipfsCatSuccess = true
    let jsonIdentity = json.fromBytes(getIPFSData).toObject()
    user.schemaId = jsonIdentity.get('schemaId').toString()
    user.save()

    // TODO - WHAT WAS PROFILE V1?
    let jsonProfile = jsonIdentity.get('profile').toObject()
    let profile = new UserProfile(jsonProfile.get('ethAddress').toString())
    profile.firstName = jsonProfile.get('firstName').isNull() ? null : jsonProfile.get('firstName').toString()
    profile.lastName = jsonProfile.get('lastName').isNull() ? null : jsonProfile.get('lastName').toString()
    profile.description = jsonProfile.get('description').isNull() ? null : jsonProfile.get('description').toString()
    profile.avatar = jsonProfile.get('avatar').isNull() ? null : jsonProfile.get('avatar').toString()
    profile.schemaId = jsonProfile.get('schemaId').toString()
    profile.base58Hash = base58Hash
    profile.save()

    let jsonAttestations = jsonIdentity.get('attestations').toArray()

    for (let i = 0; i < jsonAttestations.length; i++) {

      let itererateAttestations = jsonAttestations[i].toObject()
      let attestationSchemaID = itererateAttestations.get('schemaId').toString()

      let data = itererateAttestations.get('data').toObject()
      let issuer = data.get('issuer').toObject()
      let issueDate = data.get('issueDate').toString()

      let issuerName = issuer.get('name').toString()
      let issuerURL = issuer.get('url').toString()
      let issuerAddress = issuer.get('ethAddress').toString()

      if (!data.get('attestation').isNull()) {
        let attestation = data.get('attestation').toObject()
        let attestationMethod = attestation.get('verificationMethod').toObject()
        let verificationMethod: string
        let verified: boolean


        let sms = attestationMethod.get('sms').toString()
        if (sms != null) {
          verificationMethod = 'sms'
          let phone = attestation.get('phone').toObject()
          verified = phone.get('verified').toBool()
        } else {
          let email = attestationMethod.get('email').toString()
          if (email != null) {
            verificationMethod = 'email'
            let checkEmailValidated = attestation.get('email').toObject()
            verified = checkEmailValidated.get('verified').toBool()
          } else {
            let oauth = attestationMethod.get('oauth').toString()
            if (oauth != null) {
              let site = attestation.get('site').toObject()
              verificationMethod = site.get('siteName').toString()
              verified = true
            } else {
              // Right now, there are more options for JSON schema, but they aren't in the origin app, so this won't be emitted
              // It is likely the schema will change before it does
              verificationMethod = 'other'
              verified = false
            }
          }
        }
        let attestationID = issuerName.concat(verificationMethod.concat(id))
        let newAttestation = new Attestation(attestationID)
        newAttestation.schemaId = attestationSchemaID
        newAttestation.issuerName = issuerName
        newAttestation.issuerURL = issuerURL
        newAttestation.issuerAddress = issuerAddress
        newAttestation.issueDate = issueDate
        newAttestation.method = verificationMethod
        newAttestation.verified = verified
        newAttestation.base58Hash = base58Hash

        let signature = itererateAttestations.get('signature').toObject()
        newAttestation.signature = signature.get('bytes').toString()
        newAttestation.signatureVersion = signature.get('version').toString()

        newAttestation.save()
      }
    }
  }
}

export function handleIdentityDeleted(event: IdentityDeleted): void {
  let id = event.params.account.toHex()
  let user = new User(id)

  // TODO - set all the schema fields to zero.

  user.save()
}
