import OpenAI from 'openai';
import dotenv from "dotenv";
import path from 'path';
import { convertJsonToXml } from "./jsonToXML";
import { updateJSON } from './updateJSON';
import { addEntryToDatabase } from './manageData';

const fs = require('fs');

dotenv.config(); // create config with API key

// new instance of OpenAI
const openai = new OpenAI({
  apiKey: process.env.API_KEY,
});

/**
 * Creates a title for a given prompt
 * @param prompt to create a title for
 * @returns title
 */
async function createTitle(prompt: string) : Promise<string> {
  const input = '[no prose] [only return title] Find a fitting title for this scenario:' + prompt;
  const params: OpenAI.Chat.ChatCompletionCreateParams = {
    messages: [{ 
      role: 'user', 
      content: input
    }],
    model: 'gpt-4o',
    temperature: 0.0,
  };
  const chatCompletion: OpenAI.Chat.ChatCompletion = await openai.chat.completions.create(params);
  console.log(chatCompletion.choices[0].message.content);

  let title = chatCompletion.choices[0].message.content;
  if(title !== null) title = title.replace(/"/g, '');
  else title = 'Untitled';
  return title;
}

/**
 * Retrieves the custom assistant from OpenAI
 * @returns assistant object
 */
async function retrieveAssistant() {
  
  // Assistants available:
  // - NLP Component and Flow Table Generator: asst_0e2ISidSb3mPC8qDzjRlfKFD
  // - Improvement of NLP Component and Flow Table Generator: asst_iKFRMFdD8LYQdCuqqV5mNtk8
  // - BPMNGen: asst_tfQfgJlllSwY2XhNfDykv6VO (currently in use)
  const assistant = await openai.beta.assistants.retrieve("asst_tfQfgJlllSwY2XhNfDykv6VO");
  return assistant;
}

/**
 * Creates a new chat thread
 * According to https://platform.openai.com/docs/models/how-we-use-your-data threads are kept alive for 60 days
 * @returns thread id
 */
async function createThread(scenario: string): Promise<string>{
  const thread = await openai.beta.threads.create();
  return thread.id;
}

/**
 * Parses JSON from a given string
 * @param inputString the string containing JSON
 * @returns JSON object
 */
function findAndParseJSON(input: string): any {
  try {
    // match the outermost curly braces
    const jsonMatch = input.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      return null;
    }
    const jsonString = jsonMatch[0];
    const jsonData = JSON.parse(jsonString);
    return jsonData;
  } catch (error) {
    return null;
  }
}

/**
 * Creates a run instance for the assistant to run
 * @param thread_id id of the thread
 * @param assistant id of the assistant
 * @param scenario user description of the BPMN diagram
 * @param update false results in a brand new diagram, true results in an updated already existing diagram
 * @returns true if successful, false if error
 */
async function createRun(thread_id: string, assistant: any, scenario: string, update: boolean): Promise<boolean> {
  // create message for from user input
  await openai.beta.threads.messages.create(
    thread_id,
    {
      role: "user",
      content: scenario
    }
  );
  const run = await openai.beta.threads.runs.createAndPoll(
    thread_id,
    { 
      assistant_id: assistant.id
    }
  );
  if (run.status === 'completed') {
    const messages = await openai.beta.threads.messages.list(
      run.thread_id
    );
    // TODO: Continue generating

    // get json message
    let lastMessage = messages.data[0].content[0].type === 'text' ? messages.data[0].content[0].text.value : 'Error';
    console.log(lastMessage);
    // check if generation failed (specified in input prompt for the GPT)
    if(lastMessage === 'Error') {
      console.error('Generation failed with message:', lastMessage);
      return false;
    }
    
    // parse json from message
    // if there is a prose text this removes it
    let json = findAndParseJSON(lastMessage);
    // if there is no JSON return false
    if(json === null) return false;

    if(update) { // case update
      // update the json file
      updateJSON(thread_id, json);
      // update time stamp and add new instructions
      let data = fs.readFileSync('data/database.json', 'utf8');
      let jsonData = JSON.parse(data);
      jsonData.forEach((element: { thread: any; time: string; scenario: string}) => {
        if (element.thread === thread_id) {
          // update time
          element.time = new Date().toISOString();
          // update instructions
          element.scenario = element.scenario + '\n(NEXT)' + scenario;
        }
      });
      fs.writeFileSync('data/database.json', JSON.stringify(jsonData, null, 2), 'utf-8');
      return true; 

    } else { // CASE: Brand new diagram
      
      const filePath = path.resolve(__dirname,'..', 'data', 'json', `${thread_id}.json`);
      // write parsed json to file
      await fs.promises.writeFile(filePath, JSON.stringify(json, null, 2), (err: any) => {
        if (err) console.error('Error writing file:', err);
      });

      console.log('File written');

      // add entry to database
      await addEntryToDatabase(await createTitle(scenario), scenario, thread_id);

      return true;
    }
  } else {
    console.log(run.status);
  }
  return false;
}

/**
 * Use to create a new thread and generate a response from the assistant
 * @param scenario user description of the BPMN diagram
 * @returns ideally a new JSON file containing the BPMN diagram instructions
 */
export async function generateResponse(scenario: string) {
  let result; 
  console.log(scenario);
  const thread_id = await createThread(scenario);
  console.log(thread_id);
  
  if(!await createRun(thread_id, await retrieveAssistant(), scenario, false)) return "Error";
  try {
    result = convertJsonToXml(thread_id); 
  } catch (err) {
    console.error(err);
  }
  return result;
}

/**
 * Use to continue a thread and generate a response from the assistant
 * @param scenario user description of the BPMN diagram
 * @param thread_id id of the thread to continue
 * @returns ideally a new JSON file containing the BPMN diagram instructions
 */
export async function continueThread(scenario: string, thread_id: string) {
  let result;
  if (!await createRun(thread_id, await retrieveAssistant(), scenario, true)){
    console.log("run error");
    return "Error";
  } 
  try {
    console.log("convert");
    result = convertJsonToXml(thread_id); 
  } catch (err) {
    console.error(err);
  }
  return result;
}


