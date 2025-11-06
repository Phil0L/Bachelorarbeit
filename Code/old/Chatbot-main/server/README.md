# Backend README

This backend provides accessibility to a custom OPENAI Assistant designed to generate BPMN Diagrams from a prompt. These Diagrams will be stored in a database.

## Used software

- Node.js
- Express.js
- TypeScript
- File System Module
- OPEN AI API

## Prerequisites

- Node.js
- npm

## Installation

Install the dependencies: `npm install`

## Configuration

Before running the backend, make sure to set up a openai secret key variable in a `.env` file.
``` API_KEY = sk-****************************** ```
You can generate a personal secret key at `https://platform.openai.com/api-keys`.

## Usage

To start the backend, run the following command:

```bash
npm start
```

This will start the backend server and make it accessible at `http://localhost:1207`.

## API Documentation

### Endpoints

#### Get Database Content

- **URL**: `/database`
- **Method**: `GET`
- **Description**: Retrieves the entire content of the database stored in JSON format.
- **Auth Required**: No
- **Permissions Required**: None
- **Query Parameters**: None
- **Success Response**:
  - **Code**: 200 OK
  - **Content**: The entire JSON content of the database.
- **Error Responses**:
  - **Code**: 500 Internal Server Error
  - **Content**: `Error reading the database file`

#### Fetch Diagram Content

- **URL**: `/data/xml/:filename`
- **Method**: `GET`
- **Description**: Fetches the content of a specific diagram file.
- **Auth Required**: No
- **Permissions Required**: None
- **URL Parameters**:
  - `filename`: The name of the diagram file to fetch.
- **Success Response**:
  - **Code**: 200 OK
  - **Content**: The content of the requested diagram file.
- **Error Responses**:
  - **Code**: 403 Forbidden
  - **Content**: `Access denied` (If the requested file is outside the allowed directory)
  - **Code**: 404 Not Found
  - **Content**: `File not found` (If the requested file does not exist)

#### Create Diagram

- **URL**: `/create`
- **Method**: `POST`
- **Description**: Creates a new BPMN diagram based on the provided input string.
- **Auth Required**: No
- **Permissions Required**: None
- **Request Body**:
  - `inputString`: The string input to generate the BPMN diagram.
- **Success Response**:
  - **Code**: 200 OK
  - **Content**: `{ "response": "<Generated XML Content>" }`
- **Error Responses**:
  - **Code**: 500 Internal Server Error
  - **Content**: `Error message if something goes wrong during the diagram generation process.`

#### Update Diagram

- **URL**: `/update`
- **Method**: `POST`
- **Description**: Alters an existing BPMN diagram using the OpenAI API based on the provided input string and diagram ID.
- **Auth Required**: No
- **Permissions Required**: None
- **Request Body**:
  - `id`: The ID of the diagram to be updated.
  - `inputString`: The string input to update the BPMN diagram.
- **Success Response**:
  - **Code**: 200 OK
  - **Content**: `{ "response": "<Updated XML Content or Response>" }`
- **Error Responses**:
  - **Code**: 400 Bad Request
  - **Content**: `{ "response": "Invalid request. Please provide the id and inputString." }`
  - **Code**: 500 Internal Server Error
  - **Content**: `Error message if something goes wrong during the update process.`

#### Delete Diagram

- **URL**: `/delete`
- **Method**: `DELETE`
- **Description**: Deletes an existing BPMN diagram based on the provided diagram ID.
- **Auth Required**: No
- **Permissions Required**: None
- **Request Body**:
  - `id`: The ID of the diagram to be deleted.
- **Success Response**:
  - **Code**: 200 OK
  - **Content**: `"Deleted"`
- **Error Responses**:
  - **Code**: 500 Internal Server Error
  - **Content**: `Error message if something goes wrong during the deletion process.`

#### Notes

- The `/create` and `/update` endpoints are asynchronous and may take some time to process the request, depending on the complexity of the input string and the load on the OpenAI API.
- It's important to implement proper error handling for these endpoints to manage any potential failures gracefully.
- The database content is returned as a JSON string. It is the client's responsibility to parse this JSON string into an object or array as needed.
- Ensure that the database file exists and is correctly formatted as JSON to avoid errors.

### Security

Please note that this API does not implement authentication or authorization. It is recommended to add appropriate security measures for production environments.

### CORS

Cross-Origin Resource Sharing (CORS) is configured to allow requests from `http://localhost:4200`. This is specifically configured for access from the frontend.
