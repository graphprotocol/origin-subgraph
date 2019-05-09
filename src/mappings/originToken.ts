import {Address} from '@graphprotocol/graph-ts'
import {
  Mint,
  Transfer
} from '../types/OriginToken/OriginToken'
import {User} from '../types/schema'

// NOTE - no need to source event Burn, because it also triggers a transfer event no matter what. Burn just emits duplicate info

// minting just disguises a transfer of tokens from address(0) to the TO address. It also emits a transfer
// Therefore, mint should give tokens to the 0 address, and allow transfer to transfer it to the receiver
export function handleMint(event: Mint): void {
  let id = "0x0000000000000000000000000000000000000000"
  let user = User.load(id)
  if (user == null) {
    user = new User(id)
  }
  if (user.originTokenBalance == null) {
    user.originTokenBalance = event.params.amount
  } else {
    user.originTokenBalance = user.originTokenBalance.plus(event.params.amount)
  }
  user.save()
}

export function handleTransfer(event: Transfer): void {
  let userToID = event.params.to.toHex()
  let userTo = User.load(userToID)
  if (userTo == null) {
    userTo = new User(userToID)
  }
  if (userTo.originTokenBalance == null) {
    userTo.originTokenBalance = event.params.value
  } else {
    userTo.originTokenBalance = userTo.originTokenBalance.plus(event.params.value)
  }
  userTo.save()

  let userFromID = event.params.from.toHex()
  let userFrom = User.load(userFromID)

  // UserFrom null check must be done, since a Transfer of (0) is done very early , and causes a failure
  if (userFrom == null){
    userFrom = new User(userFromID)
  }
  userFrom.originTokenBalance = userFrom.originTokenBalance.minus(event.params.value)
  userFrom.save()
}
