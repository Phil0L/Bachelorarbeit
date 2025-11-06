import {generateResponse, continueThread} from "./tools/useGPT";
import {deleteEntryByThread} from "./tools/manageData";
import bodyParser from "body-parser";

const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const cors = require('cors');
export default app;

app.use(cors())

app.use(cors({
  origin: 'http://localhost:4200'
}));

// check for existing file folders
const foldersToCheck = [
    path.join(__dirname, 'data/json'),
    path.join(__dirname, 'data/xml'),
  ];
foldersToCheck.forEach(folderPath => {
    try {
        fs.statSync(folderPath);
    } catch (error) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log('First time setup: Created file folder.');
    }
});

//check for existing database
const databasePath = path.join(__dirname, 'data', 'database.json');
try {
    fs.statSync(databasePath);
} catch (error) {
    fs.writeFileSync(databasePath, '[]');
    console.log('First time setup: Created new database file');
}  


interface JsonEntry {
    thread: string;
    title: string;
    scenario: string;
    time: string;
    path: string;
  }

app.use(bodyParser.json());

// Endpoint to get the content of a specific file
app.get('/data/xml/:filename', (req: { params: { filename: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; send: { (arg0: string): void; new(): any; }; }; }) => {
    // Restrict the file path to the data/xml directory
    const baseDirectory = path.join(__dirname, 'data', 'xml');
    const filePath = path.join(baseDirectory, req.params.filename);

    // Ensure the resolved filePath starts with the baseDirectory path
    if (!filePath.startsWith(baseDirectory + path.sep)) {
        return res.status(403).send('Access denied');
    }
    fs.readFile(filePath, 'utf8', (err: { code: string; message: string; }, data: any) => {
        if (err) {
            if (err.code === 'ENOENT') {
                console.log('File not found');
                res.status(404).send('File not found');
            } else {
                console.log('Error reading the file: ' + err.message);
                res.status(500).send('Error reading the file: ' + err.message);
            }
        } else {
            res.status(200).send(data);
        }
    });
});

// Endpoint to receive database
app.get('/database', (req: any, res: { status: (arg0: number) => { (): any; new(): any; send: { (arg0: string): void; new(): any; }; }; }) => {
    let data = fs.readFileSync('data/database.json', 'utf8');
    res.status(200).send(data);
});


// Endpoint to receive and process a string to create BPMN via OpenAI API
// TODO: Error handling
app.post('/create', async (req: { body: { inputString: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; send: { (arg0: string): any; new(): any; }; json: { (arg0: {}): void; new(): any; }; }; }) => {
    const { inputString } = req.body;
    
    // Check if the input string is provided and is not too long
    if (!inputString || inputString.length > 3000) {
        console.log('Invalid string. Please provide a string of up to 3000 characters.');
        return res.status(400).send('Invalid string. Please provide a string of up to 3000 characters.');
    }
    console.log('Begin process');
    const response = await generateResponse(inputString);
    if (response === 'Error') {
        console.log('Error generating response');
        res.status(500).send('Error generating response');
    }
    else res.status(200).json({ response });
});

// Endpoint to alter a BPMN diagram via OpenAI API
// TODO: Error handling
app.post('/update', async (req: { body: { id: any; inputString: any; }; }, res: { status: (arg0: number) => {
    [x: string]: any; (): any; new(): any; json: { (arg0: { response: string | void; }): void; new(): any; }; 
}; }) => {
    const { id, inputString } = req.body;
    // Check if the id and inputString are provided and not empty
    if (!id || !inputString) {
        console.log('Invalid request. Please provide the id and inputString.');
        return res.status(400).json({ response: 'Invalid request. Please provide the id and inputString.' });
    }
    
    const response = await continueThread(inputString, id);
    if (response === 'Error') {
        console.log('Error generating response');
        res.status(500).send('Error generating response');
    }
    else res.status(200).json({ response });
});

// Endpoint to delete all files in the data/xml and data/json directories and clear the database.json file
app.delete('/delete-database', (req: any, res: { status: (arg0: number) => { (): any; new(): any; send: { (arg0: string): void; new(): any; }; }; }) => {
    // Delete all files in the data/xml directory
    const baseXmlDirectory = path.join(__dirname, 'data', 'xml');
    fs.readdir(baseXmlDirectory, (err: { code: string; message: string; }, xmlFiles: string[]) => {
        if (err) {
            console.log('Error deleting XML files: ' + err.message);
            return res.status(500).send('Error deleting XML files: ' + err.message);
        }
        xmlFiles.forEach((file) => {
            const filePath = path.join(baseXmlDirectory, file);
            fs.unlink(filePath, (err: { code: string; message: string; }) => {
                if (err) {
                    console.log('Error deleting XML file: ' + filePath);
                }
            });
        });
    });

    // Delete all files in the data/json directory
    const baseJsonDirectory = path.join(__dirname, 'data', 'json');
    fs.readdir(baseJsonDirectory, (err: { code: string; message: string; }, jsonFiles: string[]) => {
        if (err) {
            console.log('Error deleting JSON files: ' + err.message);
            return res.status(500).send('Error deleting JSON files: ' + err.message);
        }
        jsonFiles.forEach((file) => {
            const filePath = path.join(baseJsonDirectory, file);
            fs.unlink(filePath, (err: { code: string; message: string; }) => {
                if (err) {
                    console.log('Error deleting JSON file: ' + filePath);
                }
            });
        });
    });

    // Clear the database.json file
    fs.writeFile('data/database.json', '', (err: { code: string; message: string; }) => {
        if (err) {
            console.log('Error clearing database: ' + err.message);
            return res.status(500).send('Error clearing database: ' + err.message);
        }
        console.log('Database cleared');
        res.status(200).send('Database cleared');
    });
});

// Endpoint to delete a specific file
app.post('/delete', async (req: { body: { id: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; send: { (arg0: string): void; new(): any; }; }; }) => {
    const { id } = req.body;
    if(id === undefined) {
        console.log('No id provided');
        res.status(400).send('No id provided');
    }
    await deleteEntryByThread(id).then(() => {
        console.log('File deleted');
        res.status(200).send('File deleted');
    });
});

// Endpoint to save the content of a file
app.post('/save', (req: { body: { id: any, xml: any;}; }, res: { status: (arg0: number) => { (): any; new(): any; send: { (arg0: string): void; new(): any; }; }; }) => {
    const { id, xml } = req.body;
    const xmlFilePath = 'data/xml/' + id + '.xml';
    // update time in database
    let data = fs.readFileSync('data/database.json', 'utf8');
    let jsonData = JSON.parse(data);
    jsonData.forEach((element: { thread: any; time: string; }) => {
        if (element.thread === id) {
            element.time = new Date().toISOString();
        }
    });
    fs.writeFile('data/database.json', JSON.stringify(jsonData, null, 2), (err: any) => {
        if (err) {
            console.log('Error writing in database: ' + err.message);
            res.status(500).send('Error writing in database: ' + err.message);
        }
    });
    // overwrite file content
    fs.writeFile(xmlFilePath, xml, (err: any) => {
        if (err) {
            console.log('Error saving file: ' + err.message);
            return res.status(500).send('Error saving file: ' + err.message);
        }
        console.log('File saved');
        res.status(200).send('File saved');
    });
});

// default response
app.get('/', (req: any, res: { status: (arg0: number) => { (): any; new(): any; send: { (arg0: string): void; new(): any; }; }; }) => {
    console.log('Welcome to the BPMN Creator API');
    res.status(200).send('Welcome to the BPMN Creator API');
});