import { create } from 'xmlbuilder2';
import fs from 'fs';
import path from 'path';
import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import { validateXML } from './XMLValidator';
import { XMLBuilder as FastXMLBuilder, XMLParser } from 'fast-xml-parser';
/**
 * Converts the GPT generated JSON string into a bpmn-js readable format
 * @param jsonInput path to the JSON file
 * @returns BPMN XML string
 */
export function convertJsonToXml(threadID: string): string {
    const filePath = path.join(__dirname, '..', 'data', 'json', `${threadID}.json`);
    const input = fs.readFileSync(filePath, 'utf-8');
    const jsonObj = JSON.parse(input);

    const root = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('definitions', {
            'xmlns': 'http://www.omg.org/spec/BPMN/20100524/MODEL',
            'xmlns:bpmndi': 'http://www.omg.org/spec/BPMN/20100524/DI',
            'xmlns:omgdi': 'http://www.omg.org/spec/DD/20100524/DI',
            'xmlns:omgdc': 'http://www.omg.org/spec/DD/20100524/DC',
            'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            'id': 'sid-38422fae-e03e-43a3-bef4-bd33b32041b2',
            'targetNamespace': 'http://bpmn.io/bpmn',
            'exporter': 'bpmn-js (https://demo.bpmn.io)',
            'exporterVersion': '17.6.2'
        });
    const collaborationID = generateRandomId();
    const collaboration = root.ele('collaboration', { 'id': 'Collaboration_' + collaborationID });
    // create processes
    jsonObj.Pools.forEach((pool: any) => {
        const processID = generateRandomId();
        collaboration.ele('participant', {
            'id': pool.ID,
            'name': pool.Name,
            'processRef': 'Process_' + processID
        });
        const process = root.ele('process', {
            'id': 'Process_' + processID,
            'isExecutable': 'false'
        });
        let laneSet: XMLBuilder;
        if (pool.Lanes.length > 1) laneSet = process.ele('laneSet', { id: 'LaneSet_' + generateRandomId() });
        // Process each lane
        pool.Lanes.forEach((lane: any) => {
            if (pool.Lanes.length <= 1) {
                processLaneComponents(lane, root, process);
            } else {
                // Check if Pools array is not empty
                if (lane.Components && lane.Components.length > 0) {
                    if (laneSet) {
                        const laneElement = laneSet.ele('lane', { 'id': lane.ID, 'name': lane.Name });
                        processLaneComponents(lane, root, process, laneElement);
                    }
                }
            }
        });
        pool.Lanes.forEach((lane: any) => {
            processLaneFlows(lane, root, process);
        });
    });
    // Create diagram
    const diagram = root.ele('bpmndi:BPMNDiagram', {
        'id': 'GPTBPMNDiagram_1'
    })
        .ele('bpmndi:BPMNPlane', {
            'id': 'BpmnPlane_' + collaborationID,
            'bpmnElement': 'Collaboration_' + collaborationID
        });
    // Process each pool
    jsonObj.Pools.forEach((pool: any) => {
        // add pool shapes to diagram
        const poolShape = diagram.ele('bpmndi:BPMNShape', {
            'id': pool.ID + '_di',
            'bpmnElement': pool.ID
        });
        
        resetPoolsize(pool);
        poolShape.ele('omgdc:Bounds', {
            'x': pool.XY[0],
            'y': pool.XY[1],
            'width': pool.width,
            'height': pool.height
        });
        pool.Lanes.forEach((lane: any) => {
            // add lane shapes to diagram
            const laneShape = diagram.ele('bpmndi:BPMNShape', {
                'id': lane.ID + '_di',
                'bpmnElement': lane.ID
            });
            laneShape.ele('omgdc:Bounds', {
                'x': lane.XY[0] + 30, // adjusting for Pool header
                'y': lane.XY[1],
                // adjusting for lane width conresponding to pool width
                'width': pool.width - 30,
                // lane height should be the same as original pool height defined in the json
                'height': lane.height
            });
        });
        // Process each lane
        pool.Lanes.forEach((lane: any) => {
            addComponentsToDiagram(lane, diagram);
        });
        pool.Lanes.forEach((lane: any) => {
            addFLowsToDiagram(lane, diagram, jsonObj);
        });
    });

    const xml = root.end({ prettyPrint: true });
    const xmlPath = path.join(__dirname, '..', 'data', 'xml', `${threadID}.xml`);
    
    console.log('created file ' + threadID + '.xml');

    // Validate the XML
    let validXML = validateXML(xml);

    // Format the validated XML
    const builder = new FastXMLBuilder({ 
        ignoreAttributes: false,
        format: true,
        indentBy: '    ', // 4 spaces indentation
        suppressEmptyNode: true
    });
    const parser = new XMLParser({ ignoreAttributes: false });

    // Parse and rebuild to apply formatting
    const jsonObjvalidXML = parser.parse(validXML);
    const formattedXML = builder.build(jsonObjvalidXML);
    const finalXML = formattedXML;

    fs.writeFileSync(xmlPath, finalXML);
    return finalXML;
    
}

// find the maximum x and y values of the components in the pool to adjust the pool size
function resetPoolsize(pool: any): void {
    let maxX = 0, maxY = 0;
    pool.Lanes.forEach((lane: any) => {
        lane.Components.forEach((component: any) => {
            if (component.x > maxX) maxX = component.x;
            if (component.y > maxY) maxY = component.y;
        });
    });
    pool.width = maxX + 200;
    //pool.height = maxY + 200;
}

/**
 * Process every lane component (assigns incoming and outgoing flows)
 * @param lane contains components
 * @param root 
 * @param process 
 * @param laneElement if not present lane is not within a pool, and lane items can be disregarded
 */
function processLaneComponents(lane: any, root: any, process: any, laneElement?: any): void {
    // Process each component in the lane
    lane.Components.forEach((component: { Type: string; ID: any; Name: any; Incoming: string[]; Outgoing: string[]; x: any; y: any; }) => {

        const task = process.ele(component.Type, {
            'id': component.ID,
            'name': component.Name
        });
        // Add incoming flows
        component.Incoming.forEach((incomingId: string) => {
            task.ele('incoming').txt(incomingId);
        });

        // Add outgoing flows
        component.Outgoing.forEach((outgoingId: string) => {
            task.ele('outgoing').txt(outgoingId);
        });

        // Add flowNodeRef to lane
        if (laneElement) laneElement.ele('flowNodeRef').txt(component.ID);
    });
}

/**
 * Process every lane flow
 * @param lane contains flows
 * @param root 
 * @param process 
 */
function processLaneFlows(lane: any, root: any, process: any): void {
    // Process each flow in the lane
    lane.Flows.forEach((flow: { ID: any; Descriptor: any; Start: any; Target: any; Type: any; StartXY: any; TargetXY: any }) => {
        if (flow.Descriptor === undefined) flow.Descriptor = '';
        const item = process.ele(flow.Type, {
            'id': flow.ID,
            'name': flow.Descriptor,
            'sourceRef': flow.Start,
            'targetRef': flow.Target
        });
    });
}

/**
 * Add components to the visible diagram lane by lane
 * @param lane contains components
 * @param diagram 
 */
function addComponentsToDiagram(lane: any, diagram: any): void {
    // Process each component in the lane
    lane.Components.forEach((component: { Type: string; ID: any; Name: any; Incoming: string[]; Outgoing: string[]; x: any; y: any; }) => {
        const taskType = component.Type;
        // Set position data in bpmndi:BPMNDiagram
        const shape = diagram.ele('bpmndi:BPMNShape', {
            'id': `${component.ID}_di`,
            'bpmnElement': component.ID
        });
        if (taskType.toLowerCase().includes('event')) {
            shape.ele('omgdc:Bounds', {
                'x': component.x,
                // icon offset 20 = (80-40)/2 (80 is the height of the task icon, 40 is the height of the event icon)
                'y': component.y + 20,
                'width': '40',
                'height': '40'
            });
        } else if (taskType.toLowerCase().includes('task')) {
            shape.ele('omgdc:Bounds', {
                'x': component.x,
                'y': component.y,
                'width': '100',
                'height': '80'
            });
        } else if (taskType.toLowerCase().includes('gateway')) {
            shape.ele('omgdc:Bounds', {
                'x': component.x,
                // icon offset 15 = (80-50)/2 (80 is the height of the task icon, 50 is the height of the gateway icon)
                'y': component.y + 15,
                'width': '50',
                'height': '50'
            });
        } else {
            shape.ele('omgdc:Bounds', {
                'x': component.x,
                'y': component.y,
                'width': '80',
                'height': '80'
            });
        }
    });
}

/**
 * Add flows to the visible diagram lane by lane
 * @param lane contains flows
 * @param diagram 
 */
function addFLowsToDiagram(lane: any, diagram: any, json: any): void {
    // Process each flow in the lane
    lane.Flows.forEach((flow: { ID: any; Name: any; Start: any; Target: any; Type: any; StartXY: any; TargetXY: any }) => {
        const item = diagram.ele('bpmndi:BPMNEdge', {
            'id': flow.ID + '_di',
            'bpmnElement': flow.ID
        });
        // find components to adjust flow start and end coordinates
        const { foundComponent: start, foundInLane: startLane } = findComponentById(json, flow.Start);
        const { foundComponent: target, foundInLane: targetLane } = findComponentById(json, flow.Target);

        // in case of missing start or target component
        // error prevention
        if (!start || !target) {
            console.log("\n" + flow.ID);
            console.log('start or target not found');
            return;
        }
        if (!startLane || !targetLane) {
            console.log("\n" + flow.ID);
            console.log('start- or targetlane not found');
            return;
        }

        // check if start and target are in diagonal directions to adjust the flow
        // check if the middle points of start and target are in the same direction 
        // because the flow may not be purely diagonal considering the offset for different shapes 
        const startTemp: { x: number; y: number } = { x: start.x, y: start.y };
        const targetTemp: { x: number; y: number } = { x: target.x, y: target.y };
        //------- find middle point of start --------------------------------
        // if start is an event shape
        if (start.Type.toLowerCase().includes('event')) {
            startTemp.x = start.x + 20;
            startTemp.y = start.y + 20 + 20;
            //console.log('startTemp:', startTemp);
        }
        // if start is a task shape
        if (start.Type.toLowerCase().includes('task')) {
            startTemp.x = start.x + 50;
            startTemp.y = start.y + 40;
            //console.log('startTemp:', startTemp);
        }
        // if start is a gateway shape
        if (start.Type.toLowerCase().includes('gateway')) {
            startTemp.x = start.x + 25;
            startTemp.y = start.y + 15 + 25;
            //console.log('startTemp:', startTemp);
        }
        //------- find middle point of target --------------------------------
        // if end is an event shape
        if (target.Type.toLowerCase().includes('event')) {
            targetTemp.x = target.x + 20;
            targetTemp.y = target.y + 20 + 20;
            //console.log('targetTemp:', targetTemp);
        }
        // if end is a task shape
        if (target.Type.toLowerCase().includes('task')) {
            targetTemp.x = target.x + 50;
            targetTemp.y = target.y + 40;
            //console.log('targetTemp:', targetTemp);
        }
        // if end is a gateway shape
        if (target.Type.toLowerCase().includes('gateway')) {
            targetTemp.x = target.x + 25;
            targetTemp.y = target.y + 15 + 25;
            //console.log('targetTemp:', targetTemp);
        }
        const isDiagonal = !(startTemp.x == targetTemp.x || startTemp.y == targetTemp.y);

        // vertical first
        //const turnPoint1 = { x: start.x, y: target.y };
        // horizontal first
        //const turnPoint2 = { x: target.x, y: start.y };

        // Set position data in bpmndi:BPMNDiagram
        if (isDiagonal) {
            //console.log(flow.Name + ' is diagonal');
            //item.remove();
            
            // Add waypoints for diagonal flow
            // because the movement is not purely horizontal or vertical, a turn point is needed. set it to the x of start and y of target temporarily, late modify it with offset
            const turnPoint = { x: startTemp.x, y: targetTemp.y };
            //console.log('turnPoint:', turnPoint);
            addDiagonalFlow(item, start, target, startTemp, targetTemp, turnPoint);
        } else {
            //console.log(flow.Name + ' is vertical or horizontal');
            // add vertical or horizontal flows
            addVerticalHorizontalFlow(item, start, target);
        }
    });
}

// function to add vertical or horizontal flows
function addVerticalHorizontalFlow(item: any, start: any, target: any): void {
    const up = (start.y - target.y) > 0;
    const down = (target.y - start.y) > 0;
    const right = (target.x - start.x) > 0;
    const left = (start.x - target.x) > 0;
    {
        if (up) {
            // flow is going up
            //console.log('flow is going up');
            //------- Start adjustments ------------------------------
            // if start is an event shape
            if (start.Type.toLowerCase().includes('event')) {
                item.ele('omgdi:waypoint', {
                    'x': start.x + 20,
                    'y': start.y + 20
                });
            }
            // if start is a task shape
            if (start.Type.toLowerCase().includes('task')) {
                item.ele('omgdi:waypoint', {
                    'x': start.x + 50,
                    'y': start.y
                });
            }
            // if start is a gateway shape
            if (start.Type.toLowerCase().includes('gateway')) {
                item.ele('omgdi:waypoint', {
                    'x': start.x + 25,
                    'y': start.y + 15
                });
            }
            //------- End adjustments --------------------------------
            // if end is an event shape
            if (target.Type.toLowerCase().includes('event')) {
                item.ele('omgdi:waypoint', {
                    'x': target.x + 20,
                    'y': target.y + 60
                });
            }
            // if end is a task shape
            if (target.Type.toLowerCase().includes('task')) {
                item.ele('omgdi:waypoint', {
                    'x': target.x + 50,
                    'y': target.y + 80
                });
            }
            // if end is a gateway shape
            if (target.Type.toLowerCase().includes('gateway')) {
                item.ele('omgdi:waypoint', {
                    'x': target.x + 25,
                    'y': target.y + 65
                });
            }

        }
        if (down) {
            // flow is going down
            //console.log('flow is going down');
            //------- Start adjustments ------------------------------
            if (start.Type.toLowerCase().includes('event')) {
                item.ele('omgdi:waypoint', {
                    'x': start.x + 20,
                    'y': start.y + 60
                });
            }
            if (start.Type.toLowerCase().includes('task')) {
                item.ele('omgdi:waypoint', {
                    'x': start.x + 50,
                    'y': start.y + 80
                });
            }
            if (start.Type.toLowerCase().includes('gateway')) {
                item.ele('omgdi:waypoint', {
                    'x': start.x + 25,
                    'y': start.y + 65
                });
            }
            //------- End adjustments --------------------------------
            if (target.Type.toLowerCase().includes('event')) {
                item.ele('omgdi:waypoint', {
                    'x': target.x + 20,
                    'y': target.y + 20
                });
            }
            if (target.Type.toLowerCase().includes('task')) {
                item.ele('omgdi:waypoint', {
                    'x': target.x + 50,
                    'y': target.y
                });
            }

            if (target.Type.toLowerCase().includes('gateway')) {
                item.ele('omgdi:waypoint', {
                    'x': target.x + 25,
                    'y': target.y + 15
                });
            }
        }
        if (right) {
            // flow is going right
            //console.log('flow is going right');
            //------- Start adjustments ------------------------------
            // if start is an event shape
            if (start.Type.toLowerCase().includes('event')) {
                item.ele('omgdi:waypoint', {
                    'x': start.x + 40,
                    'y': start.y + 20 + 20
                });
            }
            // if start is a task shape
            if (start.Type.toLowerCase().includes('task')) {
                item.ele('omgdi:waypoint', {
                    'x': start.x + 100,
                    'y': start.y + 40
                });
            }
            // if start is a gateway shape
            if (start.Type.toLowerCase().includes('gateway')) {
                item.ele('omgdi:waypoint', {
                    'x': start.x + 50,
                    'y': start.y + 15 + 25
                });
            }
            //------- End adjustments --------------------------------
            // if end is an event shape
            if (target.Type.toLowerCase().includes('event')) {
                item.ele('omgdi:waypoint', {
                    'x': target.x + 0,
                    'y': target.y + 20 + 20
                });
            }
            // if end is a task shape
            if (target.Type.toLowerCase().includes('task')) {
                item.ele('omgdi:waypoint', {
                    'x': target.x + 0,
                    'y': target.y + 40
                });
            }
            // if end is a gateway shape
            if (target.Type.toLowerCase().includes('gateway')) {
                item.ele('omgdi:waypoint', {
                    'x': target.x,
                    'y': target.y + 15 + 25
                });
            }

        }
        if (left) {
            // flow is going left
            //console.log('flow is going left');
            //------- Start adjustments ------------------------------
            if (start.Type.toLowerCase().includes('event')) {
                item.ele('omgdi:waypoint', {
                    'x': start.x + 0,
                    'y': start.y + 20 + 20
                });
            }
            if (start.Type.toLowerCase().includes('task')) {
                item.ele('omgdi:waypoint', {
                    'x': start.x + 0,
                    'y': start.y + 40
                });
            }
            if (start.Type.toLowerCase().includes('gateway')) {
                item.ele('omgdi:waypoint', {
                    'x': start.x,
                    'y': start.y + 15 + 25
                });
            }
            //------- End adjustments --------------------------------
            if (target.Type.toLowerCase().includes('event')) {
                item.ele('omgdi:waypoint', {
                    'x': target.x + 40,
                    'y': target.y + 20 + 20
                });
            }
            if (target.Type.toLowerCase().includes('task')) {
                item.ele('omgdi:waypoint', {
                    'x': target.x + 100,
                    'y': target.y + 40
                });
            }
            if (target.Type.toLowerCase().includes('gateway')) {
                item.ele('omgdi:waypoint', {
                    'x': target.x + 50,
                    'y': target.y + 15 + 25
                });
            }
        }
    }
}
// function to add diagonal flows
function addDiagonalFlow(item: any, start: any, target: any, startTemp: any, targetTemp: any, turnPoint: any): void {
    /* const up = (start.y - target.y) > 0;
    const down = (target.y - start.y) > 0;
    const right = (target.x - start.x) > 0;
    const left = (start.x - target.x) > 0; */
    const up = (startTemp.y - targetTemp.y) > 0;
    const down = (targetTemp.y - startTemp.y) > 0;
    const right = (targetTemp.x - startTemp.x) > 0;
    const left = (startTemp.x - targetTemp.x) > 0;
    {
        if (up && right) {
            //------- Start adjustments ------------------------------
            if (start.Type.toLowerCase().includes('event')) {
                turnPoint.x = start.x + 20;
                item.ele('omgdi:waypoint', {
                    'x': start.x + 20,
                    'y': start.y + 20
                });
            }
            if (start.Type.toLowerCase().includes('task')) {
                if (target.Type.toLowerCase().includes('gateway')) {
                    turnPoint.x = start.x + 100;
                    turnPoint.y = start.y + 40;
                    item.ele('omgdi:waypoint', {
                        'x': start.x + 100,
                        'y': start.y + 40
                    });
                } else {
                    turnPoint.x = start.x + 50;
                    item.ele('omgdi:waypoint', {
                        'x': start.x + 50,
                        'y': start.y
                    });
                }
            }
            if (start.Type.toLowerCase().includes('gateway')) {
                turnPoint.x = start.x + 25;
                item.ele('omgdi:waypoint', {
                    'x': start.x + 25,
                    'y': start.y + 15
                });
            }

            //------- End adjustments --------------------------------
            if (target.Type.toLowerCase().includes('event')) {
                turnPoint.y = target.y + 20 + 20;
                item.ele('omgdi:waypoint', turnPoint);
                item.ele('omgdi:waypoint', {
                    'x': target.x + 0,
                    'y': target.y + 20 + 20
                });
            }
            if (target.Type.toLowerCase().includes('task')) {
                turnPoint.y = target.y + 40;
                item.ele('omgdi:waypoint', turnPoint);
                item.ele('omgdi:waypoint', {
                    'x': target.x + 0,
                    'y': target.y + 40
                });
            }
            if (target.Type.toLowerCase().includes('gateway')) {
                if (start.Type.toLowerCase().includes('task')) {
                    turnPoint.x = target.x + 25;
                    item.ele('omgdi:waypoint', turnPoint);
                    item.ele('omgdi:waypoint', {
                        'x': target.x + 25,
                        'y': target.y + 15 +25 +25
                    });
                }
                else {
                    turnPoint.y = target.y + 15 + 25;
                    item.ele('omgdi:waypoint', turnPoint);
                    item.ele('omgdi:waypoint', {
                        'x': target.x,
                        'y': target.y + 15 + 25
                    });
                }
            }
        }
        if (down && right) {
            //------- Start adjustments ------------------------------
            if (start.Type.toLowerCase().includes('event')) {
                turnPoint.x =start.x + 20;
                item.ele('omgdi:waypoint', {
                    'x': start.x + 20,
                    'y': start.y + 60
                });
            }
            if (start.Type.toLowerCase().includes('task')) {
                if (target.Type.toLowerCase().includes('gateway')) {
                    turnPoint.x = start.x + 100;
                    turnPoint.y = start.y + 40;
                    item.ele('omgdi:waypoint', {
                        'x': start.x + 100,
                        'y': start.y + 40
                    });
                } else {
                    turnPoint.x = start.x + 50;
                    item.ele('omgdi:waypoint', {
                        'x': start.x + 50,
                        'y': start.y + 80
                    });
                }
            }
            if (start.Type.toLowerCase().includes('gateway')) {
                turnPoint.x =start.x + 25;
                item.ele('omgdi:waypoint', {
                    'x': start.x + 25,
                    'y': start.y + 65
                });
            }

            //------- End adjustments --------------------------------
            if (target.Type.toLowerCase().includes('event')) {
                turnPoint.y = target.y + 20 + 20;
                item.ele('omgdi:waypoint', turnPoint);
                item.ele('omgdi:waypoint', {
                    'x': target.x + 0,
                    'y': target.y + 20 + 20
                });
            }
            if (target.Type.toLowerCase().includes('task')) {
                turnPoint.y = target.y + 40;
                item.ele('omgdi:waypoint', turnPoint);
                item.ele('omgdi:waypoint', {
                    'x': target.x + 0,
                    'y': target.y + 40
                });
            }
            if (target.Type.toLowerCase().includes('gateway')) {
                if (start.Type.toLowerCase().includes('task')) {
                    turnPoint.x = target.x + 25;
                    item.ele('omgdi:waypoint', turnPoint);
                    item.ele('omgdi:waypoint', {
                        'x': target.x + 25,
                        'y': target.y + 15
                    });
                }
                else {
                    turnPoint.y = target.y + 15 + 25;
                    item.ele('omgdi:waypoint', turnPoint);
                    item.ele('omgdi:waypoint', {
                        'x': target.x,
                        'y': target.y + 15 + 25
                    });
                }
            }

        }
        if (up && left) {
            //------- Start adjustments ------------------------------
            if (start.Type.toLowerCase().includes('event')) {
                turnPoint.x = start.x + 20;
                item.ele('omgdi:waypoint', {
                    'x': start.x + 20,
                    'y': start.y + 20
                });
            }
            if (start.Type.toLowerCase().includes('task')) {
                turnPoint.x = start.x + 50;
                item.ele('omgdi:waypoint', {
                    'x': start.x + 50,
                    'y': start.y
                });
            }
            if (start.Type.toLowerCase().includes('gateway')) {
                turnPoint.x = start.x + 25;
                item.ele('omgdi:waypoint', {
                    'x': start.x + 25,
                    'y': start.y + 15
                });
            }


            //------- End adjustments --------------------------------
            if (target.Type.toLowerCase().includes('event')) {
                turnPoint.y = target.y + 20 + 20;
                item.ele('omgdi:waypoint', turnPoint);
                item.ele('omgdi:waypoint', {
                    'x': target.x + 40,
                    'y': target.y + 20 + 20
                });
            }
            if (target.Type.toLowerCase().includes('task')) {
                turnPoint.y = target.y + 40;
                item.ele('omgdi:waypoint', turnPoint);
                item.ele('omgdi:waypoint', {
                    'x': target.x + 100,
                    'y': target.y + 40
                });
            }
            if (target.Type.toLowerCase().includes('gateway')) {
                turnPoint.y = target.y + 15 + 25;
                item.ele('omgdi:waypoint', turnPoint);
                item.ele('omgdi:waypoint', {
                    'x': target.x + 50,
                    'y': target.y + 15 + 25
                });
            }
        }
        if (down && left) {
            //------- Start adjustments ------------------------------
            if (start.Type.toLowerCase().includes('event')) {
                turnPoint.x =start.x + 20;
                item.ele('omgdi:waypoint', {
                    'x': start.x + 20,
                    'y': start.y + 60
                });
            }
            if (start.Type.toLowerCase().includes('task')) {
                turnPoint.x =start.x + 50;
                item.ele('omgdi:waypoint', {
                    'x': start.x + 50,
                    'y': start.y + 80
                });
            }
            if (start.Type.toLowerCase().includes('gateway')) {
                turnPoint.x =start.x + 25;
                item.ele('omgdi:waypoint', {
                    'x': start.x + 25,
                    'y': start.y + 65
                });
            }

            //------- End adjustments --------------------------------
            if (target.Type.toLowerCase().includes('event')) {
                turnPoint.y = target.y + 20 + 20;
                item.ele('omgdi:waypoint', turnPoint);
                item.ele('omgdi:waypoint', {
                    'x': target.x + 40,
                    'y': target.y + 20 + 20
                });
            }
            if (target.Type.toLowerCase().includes('task')) {
                turnPoint.y = target.y + 40;
                item.ele('omgdi:waypoint', turnPoint);
                item.ele('omgdi:waypoint', {
                    'x': target.x + 100,
                    'y': target.y + 40
                });
            }
            if (target.Type.toLowerCase().includes('gateway')) {
                turnPoint.y = target.y + 15 + 25;
                item.ele('omgdi:waypoint', turnPoint);
                item.ele('omgdi:waypoint', {
                    'x': target.x + 50,
                    'y': target.y + 15 + 25
                });
            }
        }
    }
}

function generateRandomId(length = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Find a component by its ID
 * @param json entire JSON object
 * @param id ID of the component
 * @returns component with the id
 */
function findComponentById(json: any, id: string): any {
    let foundComponent: any;
    let foundInLane: any;
    json.Pools.forEach((pool: any) => {
        pool.Lanes.forEach((lane: any) => {
            lane.Components.forEach((component: any) => {
                if (component.ID == id) {
                    foundComponent = component;
                    foundInLane = lane;
                }
            });
        });
    });
    return { foundComponent, foundInLane };
}
