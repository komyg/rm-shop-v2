# Rick and Morty Shop V2

This project is the part two of a three part tutorial about creating a simple shopping cart application using React and Apollo Grapqhl. Links for the other parts are here:

- [Part 1: Creating an App using React and Apollo Graphql.](https://github.com/komyg/rm-shop-v1/blob/master/tutorial.md)
- [Part 2: Use Apollo to manage the app's local state.](https://github.com/komyg/rm-shop-v2/blob/master/tutorial.md)
- [Part 3: Unit Tests with Enzyme and Apollo Graphql](https://github.com/komyg/rm-shop-v3/blob/master/tutorial.md)

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `yarn test`

Launches the test runner in the interactive watch mode.

### `yarn build`

Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes. Your app is ready to be deployed!

### `yarn gen-graphql`

Runs the [Graphql Codegen](https://graphql-code-generator.com/) to generate the *src/config/graphql.tsx* file that contains the Typescript types and classes used in this application. These types and classes are generated based all *.graphql* files that are inside the *src* folder.
