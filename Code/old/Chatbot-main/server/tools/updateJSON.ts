import path from 'path';
import fs from 'fs';

/**
 * Updates the JSON file with given instructions from GPT
 * @param jsonInput existing JSON input
 * @param updateInstructions GPT generated instructions
 * @returns updated JSON file
 */
export function updateJSON(jsonInput: string, updateInstructions: any) : string {
    const filePath = path.join(__dirname, '..', 'data', 'json', `${jsonInput}.json`);
    const input = fs.readFileSync(filePath, 'utf-8');
    console.log(input);
    const jsonObj = JSON.parse(input);
    console.log(updateInstructions);

    updateInstructions.Content.forEach((instruction: any) => {
        // Add a new item to the JSON object
        // if no parent is mentioned, the item will contain more content within itself 
        // no parent -> top level, ParentPool -> lane, else just place it in lane 
        if (instruction.type === 'CREATE') {
            // Create a new Pool
            if(instruction.item === 'Pool' && instruction.parentPool === '' && instruction.parentLane === '') {
                jsonObj.Pools.push(instruction.content);
            }
            // Create a new Lane within a Pool
            if(instruction.item === 'Lane' && instruction.parentLane === '' && instruction.parentPool !== '') {
                const pool = jsonObj.Pools.find((p: any) => p.ID === instruction.parentPool);
                pool.Lanes.push(instruction.content);
            }
            // Create a new item within a Lane 
            else {
                const pool = jsonObj.Pools.find((p: any) => p.ID === instruction.parentPool);
                const lane = pool.Lanes.find((l: any) => l.ID === instruction.parentLane);
                // differentiate between Flow and Component
                if(instruction.item === 'Flow') lane.Flows.push(instruction.content);
                else lane.Components.push(instruction.content);
            }
        } 
        // Modify an existing item within the diagram 
        else if (instruction.type === 'ALTER') {
            // Modify a Pool
            if(instruction.item === 'Pool') {
                const pool = jsonObj.Pools.find((p: any) => p.ID === instruction.id);
                Object.assign(pool, instruction.changes);
            }
            // Modify a Lane
            if(instruction.item === 'Lane') {
                jsonObj.Pools.forEach((p: any) => { 
                const lane = p.Lanes.find((l: any) => l.ID === instruction.id);
                if(lane) Object.assign(lane, instruction.changes);
                });
            }
            // Modify a Component or Flow
            else {
                jsonObj.Pools.forEach((p: any) => {
                    p.Lanes.forEach((l: any) => {
                        // assuming components and flows do not share the same ID, should be forbidden
                        let item = l.Components.find((i: any) => i.ID === instruction.id);
                        item = l.Flows.find((i: any) => i.ID === instruction.id);
                        if(item) Object.assign(item, instruction.changes);
                    });
                });
            }
        // Remove an existing Pool/Lane/Component/Flow
        } else if(instruction.type === 'DELETE') {
            // Remove a Pool
            // this deletes all children
            if(instruction.item === 'Pool') {
                const poolIndex = jsonObj.Pools.findIndex((p: any) => p.ID === instruction.id);
                jsonObj.splice(poolIndex, 1);
            }
            // Remove a Lane
            if (instruction.item === 'Lane') {
                jsonObj.Pools.forEach((p: any) => {
                    const laneIndex = p.Lanes.findIndex((l: any) => l.ID === instruction.id);
                    p.Lanes.splice(laneIndex, 1);
                });
            }
            // Remove a Component or Flow
            else {
                jsonObj.Pools.forEach((p: any) => {
                    p.Lanes.forEach((l: any) => {
                        const itemIndex = l.Components.findIndex((i: any) => i.ID === instruction.id);
                        if(itemIndex) l.Components.splice(itemIndex, 1);
                        const flowIndex = l.Flows.findIndex((i: any) => i.ID === instruction.id);
                        if(flowIndex) l.Flows.splice(flowIndex, 1);
                    });
                });
            }
        // Move an existing item within the diagram, by changing its parents
        } else if (instruction.type === 'UPDATEPARENT') {
            // Move a lane to a different pool
            if(instruction.item === 'Lane'){
                jsonObj.Pools.forEach((p: any) => {
                    const lane = p.Lanes.find((l: any) => l.ID === instruction.from);
                    if(lane) {
                        const laneIndex = p.Lanes.findIndex((l: any) => l.ID === instruction.id);
                        p.Lanes.splice(laneIndex, 1);
                        const newPool = jsonObj.Pools.find((p: any) => p.ID === instruction.to);
                        newPool.Lanes.push(lane);
                    }
                });
            }
            // Move a component or flow to a different lane
            else {
                jsonObj.Pools.forEach((p: any) => {
                    p.Lanes.forEach((l: any) => {
                        // Find the COMPONENT with the given id and update its placement within the lanes
                        const item = l.Components.find((i: any) => i.ID === instruction.from);
                        if(item) {
                            const itemIndex = l.Components.findIndex((i: any) => i.ID === instruction.id);
                            l.Components.splice(itemIndex, 1);
                            const newLane = p.Lanes.find((l: any) => l.ID === instruction.to);
                            newLane.Components.push(item);
                        }
                        // Find the FLOW with the given id and update its placement within the lanes
                        const flow = l.Flows.find((i: any) => i.ID === instruction.from);
                        if(flow) {
                            const flowIndex = l.Flows.findIndex((i: any) => i.ID === instruction.id);
                            l.Flows.splice(flowIndex, 1);
                            const newLane = p.Lanes.find((l: any) => l.ID === instruction.to);
                            newLane.Flows.push(flow);
                        }
                    });
                });
            }
        }
    });

    // add changes to the json
    fs.writeFileSync(filePath, JSON.stringify(jsonObj, null, 2));
    return JSON.stringify(jsonObj);
}
