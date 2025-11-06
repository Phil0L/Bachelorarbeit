import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export function validateXML(xmlString: string): string {
    const parser = new XMLParser({ ignoreAttributes: false });
    const builder = new XMLBuilder({ ignoreAttributes: false });
    
    // Parse XML to JSON
    const jsonObj = parser.parse(xmlString);
    
    // Move message flows into collaboration
    const updatedJsonObj = moveMessageFlows(jsonObj);

    // Transform events format
    const transformedJsonObj = transformEvents(updatedJsonObj);

    // Convert back to XML
    return builder.build(transformedJsonObj);
}

function moveMessageFlows(jsonObj: any): any {
    const messageFlows: any[] = [];
    
    // Get all processes
    const processes = Array.isArray(jsonObj.definitions.process) 
        ? jsonObj.definitions.process 
        : [jsonObj.definitions.process];
        
    // Collect and remove message flows from processes
    processes.forEach((process: any) => {
        if (process.messageFlow) {
            const flows = Array.isArray(process.messageFlow) 
                ? process.messageFlow 
                : [process.messageFlow];
            messageFlows.push(...flows);
            delete process.messageFlow;
        }
    });

    // Add collected flows to collaboration
    if (messageFlows.length > 0) {
        if (!jsonObj.definitions.collaboration) {
            jsonObj.definitions.collaboration = {};
        }
        jsonObj.definitions.collaboration.messageFlow = messageFlows;
    }

    return jsonObj;
}

/*BPMN XML format for each event type.
<!-- Start Event -->
<startEvent id="start1" name="Start">
    <outgoing>flow1</outgoing>
</startEvent>

<!-- End Event -->
<endEvent id="end1" name="End">
    <incoming>flow1</incoming>
</endEvent>

<!-- Message Start Event -->
<startEvent id="messageStart1" name="Message Start">
    <outgoing>flow1</outgoing>
    <messageEventDefinition />
</startEvent>

<!-- Message End Event -->
<endEvent id="messageEnd1" name="Message End">
    <incoming>flow1</incoming>
    <messageEventDefinition />
</endEvent>

<!-- Intermediate Catch Event -->
<intermediateCatchEvent id="catch1" name="Catch">
    <incoming>flow1</incoming>
    <outgoing>flow2</outgoing>
</intermediateCatchEvent>

<!-- Intermediate Throw Event -->
<intermediateThrowEvent id="throw1" name="Throw">
    <incoming>flow1</incoming>
    <outgoing>flow2</outgoing>
</intermediateThrowEvent>

<!-- Message Catch Event -->
<intermediateCatchEvent id="messageCatch1" name="Message Catch">
    <incoming>flow1</incoming>
    <outgoing>flow2</outgoing>
    <messageEventDefinition />
</intermediateCatchEvent>

<!-- Message Throw Event -->
<intermediateThrowEvent id="messageThrow1" name="Message Throw">
    <incoming>flow1</incoming>
    <outgoing>flow2</outgoing>
    <messageEventDefinition />
</intermediateThrowEvent>

<!-- Timer Start Event -->
<startEvent id="timerStart1" name="Timer Start">
    <outgoing>flow1</outgoing>
    <timerEventDefinition>
        <timeDate>2024-12-31T23:59:59</timeDate>
        <!-- or -->
        <timeDuration>P2D</timeDuration>
        <!-- or -->
        <timeCycle>R3/PT10H</timeCycle>
    </timerEventDefinition>
</startEvent>

<!-- Timer Intermediate Catch Event -->
<intermediateCatchEvent id="timerCatch1" name="Timer Catch">
    <incoming>flow1</incoming>
    <outgoing>flow2</outgoing>
    <timerEventDefinition>
        <timeDate>2024-12-31T23:59:59</timeDate>
        <!-- or -->
        <timeDuration>P2D</timeDuration>
        <!-- or -->
        <timeCycle>R3/PT10H</timeCycle>
    </timerEventDefinition>
</intermediateCatchEvent>
*/
function transformEvents(jsonObj: any): any {
    // Define event types that need transformation
    const eventTransformations = {
        messageStartEvent: {
            targetName: 'startEvent',
            needsMessageDef: true
        },
        messageEndEvent: {
            targetName: 'endEvent', 
            needsMessageDef: true
        },
        messageCatchEvent: {
            targetName: 'intermediateCatchEvent',
            needsMessageDef: true
        },
        messageThrowEvent: {
            targetName: 'intermediateThrowEvent',
            needsMessageDef: true
        },
        timerStartEvent: {
            targetName: 'startEvent',
            needsTimerDef: true
        },
        timerIntermediateEvent: {
            targetName: 'intermediateCatchEvent',
            needsTimerDef: true
        }
    };

    function transformEventType(process: any, sourceType: string, config: any) {
        if (process[sourceType]) {
            const events = Array.isArray(process[sourceType])
                ? process[sourceType]
                : [process[sourceType]];

            const transformedEvents = events.map((event: any) => {
                // Create new event with correct structure
                const newEvent: {
                    '@_id': any;
                    '@_name': any;
                    incoming?: any;
                    outgoing?: any;
                    messageEventDefinition?: any;
                    timerEventDefinition?: any;
                } = {
                    '@_id': event['@_id'],
                    '@_name': event['@_name']
                };

                if (event.incoming) newEvent.incoming = event.incoming;
                if (event.outgoing) newEvent.outgoing = event.outgoing;

                if (config.needsMessageDef) {
                    newEvent.messageEventDefinition = {};
                }

                if (config.needsTimerDef) {
                    newEvent.timerEventDefinition = event.timerEventDefinition || {};
                }

                return newEvent;
            });

            if (!Array.isArray(process[config.targetName])) {
                process[config.targetName] = process[config.targetName] ? [process[config.targetName]] : [];
            }
            process[config.targetName].push(...transformedEvents);
            delete process[sourceType];
        }
    }

    // Get all processes
    const processes = Array.isArray(jsonObj.definitions.process)
        ? jsonObj.definitions.process
        : [jsonObj.definitions.process];

    // Transform events in each process
    processes.forEach((process: any) => {
        Object.entries(eventTransformations).forEach(([sourceType, config]) => {
            transformEventType(process, sourceType, config);
        });
    });

    return jsonObj;
}