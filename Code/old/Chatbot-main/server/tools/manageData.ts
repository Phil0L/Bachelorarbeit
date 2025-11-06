import fs from 'fs';

// format for JSON "Database"
interface JsonEntry {
    thread: string;
    title: string;
    scenario: string;
    time: string;
    path: string;
  }

/**
 * Updates the database with a new entry for a thread
 * @param title title of the BPMN diagram
 * @param scenario user description of the BPMN diagram
 * @param threadID id of the thread
 */
export async function addEntryToDatabase(title: string, scenario: string, threadID: string): Promise<void> {
    // database saving
    const newData = {
        thread: threadID,
        title: title,
        scenario: scenario,
        time: new Date().toISOString(),
        path: "data/xml/" + threadID + ".xml"
    };
    // Read the existing data from the file
    fs.readFile('data/database.json', 'utf8', (err: any, data: string) => {
        if (err) {
        console.error('Error reading file:', err);
        return;
        }
    let jsonData = [];
    // Only parse the data if it's not an empty string
    if (data.trim() !== '') {
        try {
        jsonData = JSON.parse(data);
        } catch (error) {
        console.error('Error parsing JSON:', error);
        return;
        }

        // If jsonData is not an array, initialize it as an empty array
        if (!Array.isArray(jsonData)) {
        jsonData = [];
        }
    }
        // Add the new data to the existing data
        jsonData.push(newData);

        // Write the updated data back to the file
        fs.writeFile('data/database.json', JSON.stringify(jsonData, null, 2), (err: any) => {
        if (err) console.error('Error writing file:', err);
        });
    });
}

/**
 * Deletes an entry from the database by thread id
 * @param threadValue id of the thread to delete
 */
export async function deleteEntryByThread(threadValue: string): Promise<void> {
  const xmlFilePath = `data/xml/${threadValue}.xml`;
  const jsonFilePath = `data/json/${threadValue}.json`;

  try {
      // Delete the XML file
      try {
        await fs.promises.unlink(xmlFilePath);
        console.log('XML file deleted');
    } catch (err) {
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            console.log('XML file not found, skipping deletion');
        } else {
            throw err;
        }
    }
    // Delete the JSON file
    try {
        await fs.promises.unlink(jsonFilePath);
        console.log('JSON file deleted');
    } catch (err) {
        if (err instanceof Error && 'code' in err && err.code === 'ENOENT') {
            console.log('JSON file not found, skipping deletion');
        } else {
            throw err;
        }
    }

      // Load the JSON data from the file
      const rawData = fs.readFileSync('data/database.json', 'utf-8');
      let data: JsonEntry[];
      try {
        data = JSON.parse(rawData);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        return;
      }

      // Find and remove the entry with the matching thread
      const updatedData = data.filter(entry => entry.thread !== threadValue);

      // Save the updated JSON data back to the file
      await fs.promises.writeFile('data/database.json', JSON.stringify(updatedData, null, 4), 'utf-8');
      console.log(`Entry with thread '${threadValue}' has been deleted.`);
  } catch (error) {
      console.error({error});
  }
}