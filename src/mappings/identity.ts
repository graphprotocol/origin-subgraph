import {IdentityDeleted, IdentityUpdated} from '../types/IdentityEvents/IdentityEvents'
import {Attestation, Media, User, UserProfile,} from '../types/schema'
import {addQm} from "./origin";
import {Bytes, ipfs, json} from "@graphprotocol/graph-ts";

export function handleIdentityUpdated(event: IdentityUpdated): void {
  let id = event.params.account.toHex()
  let user = new User(id)

  // TODO - figure out the schema and insert the whole thing in here

  let hexHash = addQm(event.params.ipfsHash) as Bytes
  let base58Hash = hexHash.toBase58() // imported crypto function

  //////////////// JSON PARSING BELOW /////////////////////////////////////
  let getIPFSData = ipfs.cat(base58Hash)
  if (getIPFSData == null) {
    user.ipfsCatSuccess = false
  } else {
    user.ipfsCatSuccess = true
    let jsonIdentity = json.fromBytes(getIPFSData).toObject()
    user.schemaId = jsonIdentity.get('schemaId').toString()

    let jsonProfile = jsonIdentity.get('profile').toObject()
    let profile = new UserProfile(jsonProfile.get('ethAddress').toString())
    profile.firstName = jsonProfile.get('firstName').toString()
    profile.lastName = jsonProfile.get('lastName').toString()
    profile.description = jsonProfile.get('description').toString()
    profile.avatar = jsonProfile.get('avatar').toString()
    profile.schemaId = jsonProfile.get('schemaID').toString()

    let jsonAttestations = jsonIdentity.get('attestations').toObject()
    let attestationSchemaID = jsonAttestations.get('schemaId').toString()

    let data = jsonAttestations.get('data').toObject()
    let issuer = data.get('issuer').toObject()
    let attestation = data.get('attestation').toObject()
    let issueDate = data.get('issueDate').toString()

    let issuerName = issuer.get('name').toString()
    let issuerURL = issuer.get('url').toString()
    let issuerAdress = issuer.get('ethAddress').toString()

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
        }
      }
    }

    let attestationID = issuerName.concat(verificationMethod.concat(id))
    let newAttestation = new Attestation(attestationID)
    newAttestation.schemaId = attestationSchemaID
    newAttestation.issuerName = issuerName
    newAttestation.issuerURL = issuerURL
    newAttestation.issuerAddress = issuerAdress
    newAttestation.issueDate = issueDate
    newAttestation.method = verificationMethod
    newAttestation.verified = verified

    let signature = jsonAttestations.get('signature').toObject()
    newAttestation.signature = signature.get('bytes').toString()
    newAttestation.signatureVersion = signature.get('version').toString()

    newAttestation.save()
    profile.save()
    user.save()
  }
}

export function handleIdentityDeleted(event: IdentityDeleted): void {
  let id = event.params.account.toHex()
  let user = new User(id)

  // TODO - set all the schema fields to zero.

  user.save()
}
