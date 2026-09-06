// Used by `ng build --configuration docker` (angular.json → fileReplacements).
//
// An empty apiUrl makes core/api.ts emit same-origin paths — `/api/projects`
// rather than `http://host:5080/api/projects`. nginx in the same container
// forwards /api/ to the api container, so the browser only ever sees one
// origin and no CORS entry is needed for the Docker stack.
export const environment = {
  production: true,
  apiUrl: ''
};
