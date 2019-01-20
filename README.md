# Origin-subgraph
[Origin](https://github.com/OriginProtocol) is a protocol for creating peer-to-peer marketplaces using the Ethereum blockchain and IPFS.

## Events and Contracts

The Origin smart contracts are set up so that the majority of the events are emitted from a single address. The Solidity file that has these events is `Marketplace.sol`.

All events in this subgraph are tracked.

This subgraph can be used for Origin on the mainnet, and all testnets. In order to run it for a 
testnet, the `subgraph.yaml` file will need to have the contract addresses changed to point to the 
correct address for each respective network.

The subgraph takes less than 10 minutes to sync. 

> Note - This subgraph currently only `ipfs cats` about ~20 ipfs files to show full functionality of all the mappings. This is because the ipfs node running alongside The Graph Node get hung 
up on searching for the file for too long. The subgraph should be able to connect to the origin ipfs node via swarm, but we are waiting to coordinate that. You can access all the origin IPFS files
through https at `https://ipfs.originprotocol.com/ipfs/`

## Brief Description of The Graph Node Setup

A Graph Node can run multiple subgraphs. The subgraph ingests event data by calling to Infura through http. It can also connect to any geth node or parity node that accepts RPC calls. Fast synced geth nodes work. To use parity, the `--no-warp` flag must be used. Setting up a local Ethereum node is more reliable and faster, but Infura is the easiest way to get started. 

This subgraph has three types of files which tell the Graph Node to ingest events from specific contracts. They are:
* The subgraph manifest (subgraph.yaml)
* A GraphQL schema      (schema.graphql)
* Mapping scripts       (marketplace.ts) 

This repository has these files created and ready to compile, so a user can start this subgraph on their own. The only thing that needs to be edited is the contract addresses in the `subgraph.yaml` file to change between mainnet and testnets.  

We have provided a quick guide on how to start up the origin-subgraph graph node below. If these steps aren't descriptive enough, the [getting started guide](https://github.com/graphprotocol/graph-node/blob/master/docs/getting-started.md) has in depth details on running a subgraph. 

## Steps to get the Origin-Subgraph Running 
  1. Install IPFS and run `ipfs init` followed by `ipfs daemon`
  2. Install PostgreSQL and run `initdb -D .postgres` followed by `pg_ctl -D .postgres start` and `createdb origin-subgraph-mainnet` (note this db name is used in the commands below for the mainnet examples)
  3. If using Ubuntu, you may need to install additional packages: `sudo apt-get install -y clang libpq-dev libssl-dev pkg-config`
  4. Clone this repository, and run the following:
     * `yarn`
     * `yarn codegen` 
  5. Clone https://github.com/graphprotocol/graph-node from master and `cargo build` (this might take a while)
  6. a) Now that all the dependencies are running, you can run the following command to connect to Infura Mainnet (it may take a few minutes for Rust to compile). PASSWORD might be optional, it depends on your postrgres setup:

```
  cargo run -p graph-node --release -- \
  --postgres-url postgresql://USERNAME:[PASSWORD]@localhost:5432/mainnet-origin-subgraph \
  --ipfs 127.0.0.1:5001 \
  --ethereum-rpc mainnet-infura:https://mainnet.infura.io --debug
```
  6. b) Or Mainnet Local:
```
  cargo run -p graph-node --release -- \
  --postgres-url postgresql://USERNAME:[PASSWORD]@localhost:5432/mainnet-origin-subgraph \
  --ipfs 127.0.0.1:5001 \
  --ethereum-rpc mainnet-local:http://127.0.0.1:8545 
```
  6. c) Or Infura Rinkeby _(NOTE: Infura testnets are not reliable right now, we get inconsistent results returned. If Rinkeby data is needed, it is suggested to run your own Rinkeby node)_
```
    cargo run -p graph-node --release --   
    --postgres-url postgresql://USERNAME:[PASSWORD]@localhost:5432/origin-rinkeby-subgraph 
    --ipfs 127.0.0.1:5001
    --ethereum-rpc rinkeby-infura:https://rinkeby.infura.io 

```

 7. Now create the subgraph on The Graph Node with `yarn create-subgraph`. 
  
 8. Next deploy the origin-subgraph to The Graph Node with `yarn deploy --verbosity debug`. You should see a lot of blocks being skipped in the `graph-node` terminal, and then it will start ingesting events from the moment the contracts were uploaded to the network. 

Now that you have subgraph is running you may open a [Graphiql](https://github.com/graphql/graphiql) browser at `127.0.0.1:8000` and get started with querying.

## Getting started with querying 

Below are a few ways to show how to query the origin-subgraph for data. 

### Querying all possible data that is stored in the subgraph
The query below shows all the information that is possible to query, but is limited to the first 10 instances. There are many other filtering options that can be used, just check out the [querying api](https://github.com/graphprotocol/graph-node/blob/master/docs/graphql-api.md).

This query queries by users. It shows all user listings and offers. Within those listings and offers, all data pertaining to them are included. For example, User A's listing 101, will also include all offers made on that listing, such as Offer 101-1, 101-2, etc. 

```graphql
{
  users(first: 10, skip: 5) {
    listings {
      id
      seller
      blockNumber
      depositManager
      deposit
      ipfsBytesHashes
      ipfsBase58Hashes
      status
      offers {
        id
        listingID
        value
        commission
        refund
        currency
        buyer
        affiliate
        arbitrator
        finalizes
        status
        disputer
        ruling
        review {
          id
          schemaId
          text
          rating
          blockNumber
        }
        ipfsHashesBytes
        ipfsHashesBase58
        ipfsData {
          id
          offerID
          blockNumber
          schemaId
          listingType
          unitsPurchased
          finalizes
          totalPrice {
            amount
            currency
          }
          commission {
            amount
            currency
          }
        }
        offerExtraData {
          id
          offerID
          sender
          ipfsHashBytes
          ipfsHashBase58
        }
        disputer
        ruling
      }
      ipfsData {
        id
        listingID
        blockNumber
        schemaId
        listingType
        category
        description
        subCategory
        language
        title
        price {
          amount
          currency
        }
        unitsTotal
        commission {
          amount
          currency
        }
        commissionPerUnit {
          amount
          currency
        }
        media {
          url
          contentType
        }
      }
      listingExtraData {
        id
        ipfsHashBytes
        ipfsHashBase58
        listingID
        sender
      }
    }
    offers {
      id
      listingID
      value
      commission
      refund
      currency
      buyer
      affiliate
      arbitrator
      finalizes
      status
      disputer
      ruling
      review {
        id
        schemaId
        text
        rating
        blockNumber
      }
      ipfsHashesBytes
      ipfsHashesBase58
      ipfsData {
        id
        offerID
        blockNumber
        schemaId
        listingType
        unitsPurchased
        finalizes
        totalPrice {
          amount
          currency
        }
        commission {
          amount
          currency
        }
      }
    }
  }
}
```
The command above can be copy pasted into the Graphiql interface in your browser at `127.0.0.1:8000`.

