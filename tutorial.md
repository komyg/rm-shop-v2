# Part 2: Managing the Local State with Apollo

This is a three part tutorial series in which we will build a simple shopping cart app using React and [Apollo Graphql](https://www.apollographql.com/):

- Part 1: Retrieve and display data from a remote server.
- Part 2: Use Apollo to manage the app's local state.
- Part 3: Add unit tests.

On this second part we will create and manage the local application state using the Apollo In Memory Cache. Our objective is to allow the user to choose how many action figures from the Rick and Morty show he wants to buy and display a checkout screen with the total price and the summary of the chosen items.

# Creating a local schema

First we will create a local schema to extend the properties that we have on the Rick and Morty API and create new ones. To do this, create a new file called: *local-schema.graphql* inside the *src* folder and paste the code below:

```graphql
type Query {
  shoppingCart: ShoppingCart!
}

type Mutations {
  increaseChosenQuantity: Boolean
  decreaseChosenQuantity: Boolean
}

extend type Character {
  chosenQuantity: Int!
  unitPrice: Int!
}

type ShoppingCart {
  id: ID!
  totalPrice: Int!
  numActionFigures: Int!
}
```

As with all Graphql schemas we have the two basic types: `Query` and `Mutation`.

Inside the `Query` type we added a `shoppingCart` query that will return a `ShoppingCart` object that is stored locally on the Apollo In Memory Cache.

We also added two mutations: `increaseChosenQuantity` and `decreaseChosenQuantity`, that will change the quantity the user has chosen for an action figure and update the shopping cart.

Finally we've extended the `Character` type from the Rick and Morty API to add two extra fields: `chosenQuantity` and `unitPrice` that will only exist in our local state.

>Note: the exclamation mark (`!`) at the end of the types, indicates that they are obligatory, therefore they cannot be either null or undefined.

## Updating the Grapqhql Codegen config file

Update the *codegen.yml* file to include the local schema we just created. We are also going to add the fragment matcher generator, so that we can use fragments on our queries and mutations.

```yml
overwrite: true
schema: "https://rickandmortyapi.com/graphql"
documents: "src/**/*.graphql"
generates:
  src/generated/graphql.tsx:
    schema: "./src/local-schema.graphql" # Local Schema
    plugins:
      - "typescript"
      - "typescript-operations"
      - "typescript-react-apollo"
      - "fragment-matcher"

    # Add this to use hooks:
    config:
      withHooks: true

  # Fragment Matcher
  src/common/generated/fragment-matcher.json:
    schema: "./src/local-schema.graphql"
    plugins:
      - "fragment-matcher"
```