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

## Creating local queries

Now we can create a new query that will return the `shoppingCart` object. To do this, create a new file called: *graphql/get-shopping-cart.query.graphql` and paste the contents below:

```graphql
query GetShoppingCart {
  shoppingCart @client {
    id
    __typename
    totalPrice
    numActionFigures
  }
}
```

Now run the `yarn gen-graphql` command to generate its types. Notice that we can get the `shoppingCart` without having to create a resolver, because the `shoppingCart` object is a direct child of the root query.

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

Finally, let's also create a fragment that will be useful for us to retrieve a single character directly from the cache. In Graphql fragment is a pice of code that can be reused in queries and mutations. It can also be used to retrieve and update data directly in the Apollo cache without having to go through the root query.

This means that through our fragment below, we can get a single character using its `__typename` and `id`. Note: we could also have used the `character(id: ID)` query that is available from the graphql server.

Create the *graphq/character-data.fragment.graphql* file:

```graphql
fragment characterData on Character {
  id
  __typename
  name
  unitPrice @client
  chosenQuantity @client
}
```

Now run the Graphql Code Gen command to update our generated files: `yarn gen-graphql`. Then update the *config/apollo-local-cache.ts* with the fragment matcher:

```ts
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import introspectionQueryResultData from '../generated/fragment-matcher.json';

export const localCache = new InMemoryCache({
  fragmentMatcher: new IntrospectionFragmentMatcher({ introspectionQueryResultData }),
  freezeResults: true,
});

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

Once it ran, let's create the resolvers themselves.

First create the *resolvers/increase-chosen-quantity.resolver.ts*:

```ts
import ApolloClient from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import {
  CharacterDataFragment,
  CharacterDataFragmentDoc,
  IncreaseChosenQuantityMutationVariables,
  GetShoppingCartQuery,
  GetShoppingCartDocument,
} from '../generated/graphql';

export default function increaseChosenQuantity(
  root: any,
  variables: IncreaseChosenQuantityMutationVariables,
  context: { cache: InMemoryCache; getCacheKey: any; client: ApolloClient<any> },
  info: any
) {
  const character = getCharacterFromCache(variables.input.id, context.cache, context.getCacheKey);
  if (!character) {
    return false;
  }

  updateCharacter(character, context.cache, context.getCacheKey);
  updateShoppingCart(character, context.cache);

  return true;
}

function getCharacterFromCache(id: string, cache: InMemoryCache, getCacheKey: any) {
  return cache.readFragment<CharacterDataFragment>({
    fragment: CharacterDataFragmentDoc,
    id: getCacheKey({ id, __typename: 'Character' }),
  });
}

function updateCharacter(character: CharacterDataFragment, cache: InMemoryCache, getCacheKey: any) {
  cache.writeFragment<CharacterDataFragment>({
    fragment: CharacterDataFragmentDoc,
    id: getCacheKey({ id: character.id, __typename: 'Character' }),
    data: {
      ...character,
      chosenQuantity: character.chosenQuantity + 1,
    },
  });
}

function updateShoppingCart(character: CharacterDataFragment, cache: InMemoryCache) {
  const shoppingCart = getShoppingCart(cache);
  if (!shoppingCart) {
    return false;
  }

  cache.writeQuery<GetShoppingCartQuery>({
    query: GetShoppingCartDocument,
    data: {
      shoppingCart: {
        ...shoppingCart,
        numActionFigures: shoppingCart.numActionFigures + 1,
        totalPrice: shoppingCart.totalPrice + character.unitPrice,
      },
    },
  });
}

function getShoppingCart(cache: InMemoryCache) {
  const query = cache.readQuery<GetShoppingCartQuery>({
    query: GetShoppingCartDocument,
  });

  return query?.shoppingCart;
}
```

There is quite a bit happening in this resolver:

- First we have the `getCharacterFromCache` function that retrieves a character from the cache using the `CharacterData` fragment. This way we can retrieve the character directly.
- Then we have the `updateCharacter` function that increases the chosen quantity for this character by one. Notice that we are using the same `CharacterData` fragment to update the Apollo cache and that we are not updating the character directly, instead we are using the spread operator to update the Apollo cache with a copy of the original character object. This is because we decided to use immutable objects.
- Then we update the shopping cart, by using the `GetShoppingCartQuery` to get the current state of the shopping cart and update the number of chosen action figures and the total price. Here we can use a query to retrieve the shopping cart, because it is a child of the root query, so we can get it directly.
- When using fragments, we use the `getCacheKey` function to get and object's cache key. By default, the Apollo client stores the data in a de-normalized fashion, so that we can use fragments and the cache key to access any object directly. Usually each cache key is composed as `__typename:id`, but it is a good practice to use the `getCacheKey` function in case you want to use a custom function to create the cache keys.
- Notice that we are using the `readQuery` function to retrieve the current state of the shopping cart. We can do this, because we have set the initial state for the shopping cart, however if we had not set it, then this function would throw an exception the first time it ran, because the shopping cart would be `undefined`. If you do not want to set a definite state for a cache object, then it is good to set its initial state as `null`, instead of leaving it as undefined. This way, when you execute the `readQuery` function it will not throw an exception.
- It is also worth mentioning, that we could use the `client.query` function instead of the `cache.readQuery`, this way we would not have to have had set the initial state for the shopping cart, because the `client.query` function does not throw an error if the object it wants to retrieve is `undefined`. However I think that the `cache.readQuery` is faster and it is also synchronous (which is useful in this context).

Now we will create a new resolver to decrease the chosen quantity. Please create the file: *resolvers/decrease-chosen-quantity.resolver.ts* and copy and paste the contents below:

```ts
import ApolloClient from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import {
  CharacterDataFragment,
  CharacterDataFragmentDoc,
  IncreaseChosenQuantityMutationVariables,
  GetShoppingCartQuery,
  GetShoppingCartDocument,
} from '../generated/graphql';

export default function decreaseChosenQuantity(
  root: any,
  variables: IncreaseChosenQuantityMutationVariables,
  context: { cache: InMemoryCache; getCacheKey: any; client: ApolloClient<any> },
  info: any
) {
  const character = getCharacterFromCache(variables.input.id, context.cache, context.getCacheKey);
  if (!character) {
    return false;
  }

  updateCharacter(character, context.cache, context.getCacheKey);
  updateShoppingCart(character, context.cache);

  return true;
}

function getCharacterFromCache(id: string, cache: InMemoryCache, getCacheKey: any) {
  return cache.readFragment<CharacterDataFragment>({
    fragment: CharacterDataFragmentDoc,
    id: getCacheKey({ id, __typename: 'Character' }),
  });
}

function updateCharacter(character: CharacterDataFragment, cache: InMemoryCache, getCacheKey: any) {
  let quantity = character.chosenQuantity - 1;
  if (quantity < 0) {
    quantity = 0;
  }

  cache.writeFragment<CharacterDataFragment>({
    fragment: CharacterDataFragmentDoc,
    id: getCacheKey({ id: character.id, __typename: 'Character' }),
    data: {
      ...character,
      chosenQuantity: quantity,
    },
  });
}

function updateShoppingCart(character: CharacterDataFragment, cache: InMemoryCache) {
  const shoppingCart = getShoppingCart(cache);
  if (!shoppingCart) {
    return false;
  }

  let quantity = shoppingCart.numActionFigures - 1;
  if (quantity < 0) {
    quantity = 0;
  }

  let price = shoppingCart.totalPrice - character.unitPrice;
  if (price < 0) {
    price = 0;
  }

  cache.writeQuery<GetShoppingCartQuery>({
    query: GetShoppingCartDocument,
    data: {
      shoppingCart: {
        ...shoppingCart,
        numActionFigures: quantity,
        totalPrice: price,
      },
    },
  });
}

function getShoppingCart(cache: InMemoryCache) {
  const query = cache.readQuery<GetShoppingCartQuery>({
    query: GetShoppingCartDocument,
  });

  return query?.shoppingCart;
}
```

This resolver is very similar to the other one, with the exception that we do not allow the quantities and the total price to be less than 0.

Finally let's connect these two resolvers to the Apollo client, by updating the *config/apollo-resolvers.ts* file:

```ts
import setUnitPrice from '../resolvers/set-unit-price.resolver';
import increaseChosenQuantity from '../resolvers/increase-chosen-quantity.resolver';
import decreaseChosenQuantity from '../resolvers/decrease-chosen-quantity.resolver';

export const localResolvers = {
  Mutations: {
    increaseChosenQuantity,
    decreaseChosenQuantity,
  },
  Character: {
    chosenQuantity: () => 0,
    unitPrice: setUnitPrice,
  },
};
```

# Query resolvers

Technically we won't be needing any query resolvers for this app, but I think that it might be useful to do an example. We are going to create a resolver that will return the data available for a character. Please note that on the real world we should use the `character(id: ID)` query that is already available from the server instead of creating a new query.

To begin, update the `Query` type in our local schema:

```graphql
type Query {
  shoppingCart: ShoppingCart!
  getCharacter(id: ID!): Character
}
```

Now, create a new file called: *graphql/get-character.query.graphql* and paste the contents below:

```graphql
query GetCharacter($id: ID!) {
  getCharacter(id: $id) @client {
    ...characterFullData
  }
}
```

And another file called: *graphql/character-full-data.fragment.graphql:

```graphql
fragment characterFullData on Character {
  id
  __typename
  name
  status
  species
  type
  gender
  image
  created
  unitPrice @client
  chosenQuantity @client
}
```

Now run this command: `yarn gen-graphql` to update our generated files.

For the resolver itself, create a new file called: *resolvers/get-character.resolver.ts*:

```ts
import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import {
  CharacterDataFragmentDoc,
  CharacterFullDataFragment,
  GetCharacterQueryVariables,
} from '../generated/graphql';

export default function getCharacter(
  root: any,
  variables: GetCharacterQueryVariables,
  context: { cache: InMemoryCache; getCacheKey: any; client: ApolloClient<any> },
  info: any
) {
  return context.cache.readFragment<CharacterFullDataFragment>({
    fragment: CharacterDataFragmentDoc,
    id: context.getCacheKey({ id: variables.id, __typename: 'Character' }),
  });
}
```

Finally let's connect this new resolver to the Apollo client. To this, update the *config/apollo-resolvers.ts* file:

```ts
import setUnitPrice from '../resolvers/set-unit-price.resolver';
import increaseChosenQuantity from '../resolvers/increase-chosen-quantity.resolver';
import decreaseChosenQuantity from '../resolvers/decrease-chosen-quantity.resolver';
import getCharacter from '../resolvers/get-character.resolver';

export const localResolvers = {
  Query: {
    getCharacter,
  },
  Mutations: {
    increaseChosenQuantity,
    decreaseChosenQuantity,
  },
  Character: {
    chosenQuantity: () => 0,
    unitPrice: setUnitPrice,
  },
};
```