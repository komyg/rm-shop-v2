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
  const [increaseQty] = useIncreaseChosenQuantityMutation({
    variables: { input: { id: props.characterId } },
  });
  const [decreaseQty] = useDecreaseChosenQuantityMutation();

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
