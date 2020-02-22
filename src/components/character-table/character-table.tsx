import {
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import React, { ReactElement } from 'react';
import { useGetCharactersQuery } from '../../generated/graphql';
import CharacterData from '../character-data/character-data';

interface Props {}

export default function CharacterTable(props: Props): ReactElement {
  // Use hook to retrieve data from the backend
  const { data, loading, error } = useGetCharactersQuery();

  // Query state management
  if (loading) {
    return <CircularProgress />;
  } else if (error) {
    console.error(error);
    return (
      <Typography variant='h5'>
        Error retrieving data, please reload the page to try again.
      </Typography>
    );
  } else if (!data || !data.characters || !data.characters.results) {
    return (
      <Typography variant='h5'>No data available, please reload the page to try again.</Typography>
    );
  }

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
}
