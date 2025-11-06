# NLP-BPMN-GPT

Create and alter BPMN diagrams with just your chat prompts.
Bachelor thesis by @nik-weidl at Ulm University.

Further improvement of chatbots.
Bachelor thesis by @zhe-shi at Ulm University.

## System Roadmap
- Custom GPT (prompt to diagram) :white_check_mark:
- OpenAI API Usage :white_check_mark:
- JSON to XML Conversion :white_check_mark:
- Database setup :white_check_mark:
- bpmn-js setup :white_check_mark:
- Complex event type support :white_check_mark:
- Enhanced XML generation and validation :white_check_mark:
- Automatic diagram validation :white_check_mark:
- Diagram organization and management :white_check_mark:
- Updating diagrams via prompt :heavy_check_mark:
- Flow routing with horizontal/vertical alignment :heavy_check_mark:

## Future Work
- User interface improvements
- Collaborative editing features
- Enhanced user guidance
- Interactive chat-like interface
- Modular handling of large diagrams

## bpmn-js-client

Uses AngularJS and bpmn-js.

The following commands are available for the client:

-`npm run start` to start the client

-`npm run build` to build the client

## Server

Uses Express and the OpenAI API for ChatGPT interaction.
Make sure to add your OpenAI SK to `.env`.

The following commands are available for the server:

-`npm run start` to start the server

-`npm run dev` for development

-`npm run test` for testing the server via jest
