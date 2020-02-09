import { InMemoryCache } from 'apollo-cache-inmemory';

export const localCache = new InMemoryCache({
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
