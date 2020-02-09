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
