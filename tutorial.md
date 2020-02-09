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

type Mutation {
  increaseChosenQuantity(input: ChangeProductQuantity!): Boolean
  decreaseChosenQuantity(input: ChangeProductQuantity!): Boolean
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

input ChangeProductQuantity {
  id: ID!
}
```

As with all Graphql schemas we have the two basic types: `Query` and `Mutation`.

Inside the `Query` type we added a `shoppingCart` query that will return a `ShoppingCart` object that is stored locally on the Apollo In Memory Cache.

We also added two mutations: `increaseChosenQuantity` and `decreaseChosenQuantity`, that will change the quantity the user has chosen for an action figure and update the shopping cart.

We extended the `Character` type from the Rick and Morty API to add two extra fields: `chosenQuantity` and `unitPrice` that will only exist in our local state.

We created an `input` type called `ChangeProductQuantity` that will be used inside the mutations. Please note that we could send the characterId directly to the mutation, but we created the `input` type to illustrate its use. Also, a query or mutation can only accept `input` as its arguments. They do not support regular `types`.

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

## Creating an initial state

When our application loads, we need to initialize the In Memory Cache with an initial state based on our local schema. To do this, let's add a function to the *config/apollo-local-cache.ts* file:

```ts
export function initLocalCache() {
  localCache.writeData({
    data: {
      shoppingCart: {
        __typename: 'ShoppingCart',
        id: btoa('ShoppingCart:1'),
        totalPrice: 0,
        numActionFigures: 0,
      },
    },
  });
}
```

Here we are initializing the `ShoppingCart` objet with default values. Also note that we using an ID pattern of `[Typename]:[ID]` encoded in base 64, to guarantee that we will always have unique IDs in our cache.

Also note that it if we chose not to initialize the `ShoppingCart` object, it would be better to set it as `null` instead of leaving it as `undefied` (`localCache.writeData({ data: { shoppingCart: null } })`). This is to avoid errors when running the `readQuery` function on the Apollo Cache. If the object we are querying is `undefined`, then the `readQuery` will throw an error, but if it is `null`, then it will return `null` without throwing an exception.

Now lets call the `initLocalCache` function after the Apollo Client has been initialized in the *config/apollo-client.ts* file:

```ts
export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, httpLink]),
  connectToDevTools: process.env.NODE_ENV !== 'production',
  cache: localCache,
  assumeImmutableResults: true,
});

initLocalCache();
```

# Creating resolvers

The resolvers are functions that will manage our in memory cache, by reading data from it and writing data to it. If you are accustomed to Redux, the resolvers would be similar to the reducer functions, even though they are not required to be synchronous nor are the changes to the In Memory Cache required to be immutable, although we chose to use immutability in the part 1 in return for performance improvements.

## Object resolvers

The object resolvers are used to initialize the local fields of a remote type. In our case, we have extended the `Character` type with the `chosenQuantity` and `unitPrice` fields.

To start, create the *src/resolvers* folder. Then create the *set-unit-price.resolver.ts* file and copy the contents below:

```ts
import ApolloClient from 'apollo-client';
import { Character } from '../generated/graphql';
import { InMemoryCache } from 'apollo-cache-inmemory';

export function setChosenQuantity(
  root: Character,
  variables: any,
  context: { cache: InMemoryCache; getCacheKey: any; client: ApolloClient<any> },
  info: any
) {
  switch (root.name) {
    case 'Rick Sanchez':
      return 10;

    case 'Morty Smith':
      return 10;

    default:
      return 5;
  }
}
```

This resolver will receive each character from the backend and assign a unit price based on the character name.

Then, lets connect this resolver our client. To do this, create the file: *config/resolvers.ts* and paste the contents below:

```ts
import setUnitPrice from '../resolvers/set-unit-price.resolver';

export const localResolvers = {
  Character: {
    chosenQuantity: () => 0,
    unitPrice: setUnitPrice,
  },
};

```

Since the initial value for the `chosenQuantity` will always be 0, then we will just create a function that returns 0.

Then, add the `localResolvers` to our client config in: *config/apollo-client.ts*.

```ts
import { ApolloClient } from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { httpLink } from './apollo-http-link';
import { errorLink } from './apollo-error-lnk';
import { localCache, initLocalCache } from './apollo-local-cache';
import { localResolvers } from './apollo-resolvers';

export const apolloClient = new ApolloClient({
  link: ApolloLink.from([errorLink, httpLink]),
  connectToDevTools: process.env.NODE_ENV !== 'production',
  cache: localCache,
  assumeImmutableResults: true,
  resolvers: localResolvers,
});

initLocalCache();
```

## Mutation resolvers

Now we are going to create mutations that will handle increasing and decreasing the quantity of a Character. First we should create a graphql file that will describe the mutation. Create the file: *graphql/increase-chosen-quantity.mutation.graphql* and paste the contents below:

```graphql
mutation IncreaseChosenQuantity($input: ChangeProductQuantity!) {
  increaseChosenQuantity(input: $input) @client
}
```

Not that we are using the `@client` annotation here, to indicate that this mutation should be ran locally on our In Memory Cache.

Also create another file: *graphql/decrease-chosen-quatity.mutation.graphql* and paste the contents below:

```graphql
mutation DecreaseChosenQuantity($input: ChangeProductQuantity!) {
  decreaseChosenQuantity(input: $input) @client
}
```

Now run the Graphql Code Gen command to update our generated file: `yarn gen-graphql`.
