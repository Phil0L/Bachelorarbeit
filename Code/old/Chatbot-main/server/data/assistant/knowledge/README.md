# Creating an assistant
To create the same assistant as used in this project, head to:

https://platform.openai.com/assistants/

## Settings:

Instructions: check out [instructions.txt](https://github.com/zhe96/Chatbot/blob/main/server/data/assistant/knowledge/instructions.txt)


Model: gpt-4o (for best results)

File search: On 
(add [Component_Identifiying.txt](https://github.com/zhe96/Chatbot/blob/main/server/data/assistant/knowledge/Component_Identifying.txt) 
and  [BPMN 2.0 Specification Document](https://www.omg.org/spec/BPMN/2.0/PDF))

Code interpreter: On

Temperature: 0.01

Top P: 1

API Version: Lastest

(all other settings: leave on default)

Note:
As the complexity of instructions increases or as more files are uploaded, the total token count can exceed model limitations (e.g., 30,000 tokens), potentially leading to generation errors. Excessively large chunks may exceed token limits, while overly small chunks may disrupt contextual understanding. A personal recommendation is chunk sizes between 200-400 tokens with 50-100 overlap.
