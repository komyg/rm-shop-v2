import React, { ReactElement } from 'react';
import { Character, Maybe } from '../../generated/graphql';
import {
  TableRow,
  TableCell,
  makeStyles,
  Theme,
  createStyles,
  Box,
  Typography,
} from '@material-ui/core';
import CharacterQuantity from '../character-quantity/character-quantity';

interface Props {
  character: Maybe<Character | null>;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    nameTableCell: {
      display: 'flex',
      alignItems: 'center',
    },
    characterImg: {
      maxHeight: '3rem',
      width: 'auto',
      borderRadius: '50%',
    },
    characterName: {
      paddingLeft: theme.spacing(2),
    },
  })
);

export default function CharacterData(props: Props): ReactElement {
  const classes = useStyles();

  return (
    <TableRow>
      <TableCell className={classes.nameTableCell}>
        <Box>
          <img src={props.character?.image!} alt='' className={classes.characterImg} />
        </Box>
        <Typography variant='body2' className={classes.characterName}>
          {props.character?.name}
        </Typography>
      </TableCell>
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
