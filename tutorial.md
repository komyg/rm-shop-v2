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
  Mutation: {
    increaseChosenQuantity,
    decreaseChosenQuantity,
  },
  Character: {
    chosenQuantity: () => 0,
    unitPrice: setUnitPrice,
  },
};
```

# Updating our components

Now that we have created our mutations and resolvers we will update our components to use them. First let's update our `GetCharactersQuery` to include our new local fields. Open the *graphql/get-characters.query.graphql* file and paste the contents below:

```graphql
query GetCharacters {
  characters {
    results {
      id
      __typename
      name
      species
      chosenQuantity @client
      unitPrice @client
      origin {
        id
        __typename
        name
      }
      location {
        id
        __typename
        name
      }
    }
  }
}
```

Notice that we added the `chosenQuantity` and `unitPrice` fields with the `@client` annotation indicating Apollo that these fields are used only on the client.

Don't forget to regenerate our graphql types by running the `yarn gen-graphql` command on your console.

Now let's update our table to add these new fields. First open the *components/character-table/charcater-table.tsx* file and add two more columns to our table, one for the unit price and the other for the chosen quantity.

```tsx
// Display the data
return (
  <TableContainer component={Paper}>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Species</TableCell>
          <TableCell>Origin</TableCell>
          <TableCell>Location</TableCell>
          <TableCell>Price</TableCell>
          <TableCell>Quantity</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data.characters.results.map(character => (
          <CharacterData character={character} key={character?.id!} />
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);
```

Now we are going to create a new component to handle the customer choices. First add the Material UI Icons package that will be used on the next component: `yarn add @material-ui/icons`. Then create the file: *components/character-quantity/character-quantity.tsx* and paste the contents below:

```tsx
import React, { ReactElement, useCallback } from 'react';
import { Box, IconButton, Typography } from '@material-ui/core';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import {
  useIncreaseChosenQuantityMutation,
  useDecreaseChosenQuantityMutation,
} from '../../generated/graphql';

interface Props {
  characterId: string;
  chosenQuantity: number;
}

export default function CharacterQuantity(props: Props): ReactElement {
  // Mutation Hooks
  const [increaseQty] = useIncreaseChosenQuantityMutation({
    variables: { input: { id: props.characterId } },
  });
  const [decreaseQty] = useDecreaseChosenQuantityMutation();

  // Callbacks
  const onIncreaseQty = useCallback(() => {
    increaseQty();
  }, [increaseQty]);
  const onDecreaseQty = useCallback(() => {
    decreaseQty({ variables: { input: { id: props.characterId } } });
  }, [props.characterId, decreaseQty]);

  return (
    <Box display='flex' alignItems='center'>
      <IconButton color='primary' disabled={props.chosenQuantity <= 0} onClick={onDecreaseQty}>
        <ChevronLeftIcon />
      </IconButton>
      <Typography>{props.chosenQuantity}</Typography>
      <IconButton color='primary' onClick={onIncreaseQty}>
        <ChevronRightIcon />
      </IconButton>
    </Box>
  );
}
```

In this component we are using two hooks to instantiate our mutations and then we are using two callbacks to call them whenever the user clicks on the increase or decrease quantity buttons.

You will notice that we've defined the input for the `IncreaseChosenQuantityMutation` when it was first intatiated and we've defined the input for the `decreaseChosenQuantityMutation` on the callback. Both options will work in this context, but it is worth saying that the input defined first option is static, and the input defined on the second option is dynamic. So, if we were working with a form for example, then you should go with the second option, otherwise your mutation will always be called with your form's initial values.

Also there is no need to call another query here to get the character's chosen quantity, because this value already comes from the query we made in the `CharacterTable` component and it will be automatically updated by Apollo and passed down to this component when we fire the mutations.

Now open the file: *compoents/character-data/character-data.tsx* and include our new fields:

```tsx
export default function CharacterData(props: Props): ReactElement {
  return (
    <TableRow>
      <TableCell>{props.character?.name}</TableCell>
      <TableCell>{props.character?.species}</TableCell>
      <TableCell>{props.character?.origin?.name}</TableCell>
      <TableCell>{props.character?.location?.name}</TableCell>
      <TableCell>{props.character?.unitPrice}</TableCell>
      <TableCell>
        <CharacterQuantity
          characterId={props.character?.id!}
          chosenQuantity={props.character?.chosenQuantity!}
        />
      </TableCell>
    </TableRow>
  );
}
```

Now run our project using the `yarn start` command. You should see the unit price we set for each character (Rick and Mory should have a higher price than the others) and you should be able to increase and decrease each character's chosen quantity.

# The Shopping Cart

Now let's add a shopping cart button that will show the total price and the total number of action figures that were chosen by the user. To do this, create a new component: *components/shopping-cart-btn/shopping-cart-btn.tsx* and past the content below:

```tsx
import React, { ReactElement } from 'react';
import { Fab, Box, makeStyles, createStyles, Theme, Typography } from '@material-ui/core';
import { useGetShoppingCartQuery } from '../../generated/graphql';
import ShoppingCartIcon from '@material-ui/icons/ShoppingCart';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      position: 'fixed',
      bottom: theme.spacing(4),
    },
    quantityText: {
      position: 'absolute',
      top: '4px',
      left: '50px',
      color: 'white',
    },
    btnElement: {
      padding: theme.spacing(1),
    },
  })
);

export default function ShoppingCartBtn(): ReactElement {
  const classes = useStyles();
  const { data } = useGetShoppingCartQuery();

  if (!data || data.shoppingCart.numActionFigures <= 0) {
    return <Box className={classes.root} />;
  }

  return (
    <Box className={classes.root}>
      <Fab variant='extended' color='primary'>
        <Box>
          <ShoppingCartIcon className={classes.btnElement} />
          <Typography variant='caption' className={classes.quantityText}>
            {data.shoppingCart.numActionFigures}
          </Typography>
        </Box>

        <Typography className={classes.btnElement}>
          {formatPrice(data.shoppingCart.totalPrice)}
        </Typography>
      </Fab>
    </Box>
  );
}

function formatPrice(price: number) {
  return `US$ ${price.toFixed(2)}`;
}
```

In this component we are using the `GetShoppingCart` query hook to get the number of action figures that the user selected and their total price. The state of the shopping cart is handled on the Apollo In Memory Cache and is updated whenever we increase or decrease the action figure's quantities by their respective reslvers.

Notice that we didn't needed to create a resolver to get the shopping cart's state. That is because the shopping cart's state is available as a directy child of the root Query, therefore we can get it more easily.

>Note: in the real world, this button would take the user to somekind of checkout screen in which he could review and place his order.

Finally let's update our app component to contain our new shopping cart button. To do this, open the *components/app/app.tsx* file and add the `ShoppingCartBtn` component:

```tsx
export default function App(): ReactElement {
  const classes = useStyles();

  return (
    <Container className={classes.root}>
      <Box display='flex' justifyContent='center' alignContent='center'>
        <CharacterTable />
        <ShoppingCartBtn />
      </Box>
    </Container>
  );
}
```
