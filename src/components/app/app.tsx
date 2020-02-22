import React, { ReactElement } from 'react';
import { Container, Box, Theme, makeStyles, createStyles } from '@material-ui/core';
import CharacterTable from '../character-table/character-table';
import ShoppingCartBtn from '../shopping-cart-btn/shopping-cart-btn';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      paddingTop: theme.spacing(2),
      paddingBottom: theme.spacing(2),
    },
  })
);

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
