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
