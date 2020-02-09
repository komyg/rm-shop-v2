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
