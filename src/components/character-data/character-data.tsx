import React, { ReactElement } from 'react';
import { Character, Maybe } from '../../generated/graphql';
import { TableRow, TableCell } from '@material-ui/core';
import CharacterQuantity from '../character-quantity/character-quantity';

interface Props {
  character: Maybe<Character | null>;
}

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
