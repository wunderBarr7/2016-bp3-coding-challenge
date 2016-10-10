/**
 * BP3 Coding Challenge 2016
 *
 * NOTE: It was assumed that both the initial node list and output node list are NOT SORTED by ID and that the ID
 * does not directly correspond to the index of the array it is in. It is also assumed that any unaccounted node
 * types are non-human tasks.
 *
 * Run in Node.js with the command line (both parameters are optional):
 * node BP3CodingChallenge2016.js <FILE_PATH> -t
 *
 *
 * <FILE_PATH> - filepath for json diagram, defaults to "./diagram.json"
 * -t - Include unit tests **Note this requires the two testing files provided in the repository
 *
 */

var fs = require('fs');

var DEFAULT_FILE_PATH = "./diagram.json";
var nodeType = {
    start: "Start",
    human: "HumanTask",
    service: "ServiceTask",
    gateway: "Gateway",
    end: "End"
};

// Checks the flags in the order of, include tests no filename, filename, tests as 2nd arg
var includeTests = process.argv[2] === "-t";
var filename = includeTests ? DEFAULT_FILE_PATH : process.argv[2] || DEFAULT_FILE_PATH;
if (!includeTests) includeTests = process.argv[3] === "-t";

var finishedDiagram = filterHumanTasks(JSON.parse(fs.readFileSync(filename)));
console.log(JSON.stringify(finishedDiagram, null, 2));

if(includeTests) runTests();

/**
 * Filters out all Non-Human tasks
 *
 * @param diagram Diagram to filter
 * @returns {{nodes: Array, edges: Array}} Diagram in same format without any non-human Tasks
 */
function filterHumanTasks(diagram) {
    // Cache the nodes based on ID for quicker searching
    var cachedNodes = {};
    var cachedEdges = {};
    var outputDiagram = { nodes: [], edges: [] };

    // Iterate through the edges, this way we don't have to worry about branches from gateways,
    // all that needs to be checked is if the "to" is a ServiceTask or not
    for(var i = 0; i < diagram.edges.length; i++) {
        var nodes = { from: null, to: null };

        // Check if initial edge is cached, if not: cache and add it if is a valid node
        for(var property in diagram.edges[i]) {
            // Use hasOwnProperty to ensure it isn't iterating over prototype properties
            if(diagram.edges[i].hasOwnProperty(property)) {
                if(!cachedNodes[diagram.edges[i][property] + ""]) {
                    cachedNodes[diagram.edges[i][property] + ""] = findNode(diagram.edges[i][property], diagram);
                    if(nodeIsValid(cachedNodes[diagram.edges[i][property] + ""])) {
                        outputDiagram.nodes.push(cachedNodes[diagram.edges[i][property] + ""]);
                    }
                }
            }
        }

        nodes["from"] = cachedNodes[diagram.edges[i].from];
        nodes["to"] = cachedNodes[diagram.edges[i].to];

        // Continue if edge is not from a valid node
        if(!nodeIsValid(nodes["from"])) continue;

        // Find next "to" id
        var toId = nodes["to"].type === nodeType.service
            ? idNextValidNode(nodes["to"].id, diagram, cachedNodes)
            : nodes["to"].id;

        // Add new edge
        var newEdge = {
            from: nodes["from"].id,
            to: toId
        };

        // Check if edge exists already, continue loop if it does
        if(!cachedEdges["to"+newEdge.to+"from"+newEdge.from]){
            outputDiagram.edges.push(newEdge);
            cachedEdges["to"+newEdge.to+"from"+newEdge.from] = true;
        }

        // Check if the new toId is cached, otherwise cache and add it
        if(!cachedNodes[toId + ""]) {
            cachedNodes[toId + ""] = findNode(toId, diagram);
            if(cachedNodes[toId + ""].type !== nodeType.service) {
                outputDiagram.nodes.push(cachedNodes[toId + ""]);
            }
        }
    }

    return outputDiagram;
}

/**
 * Run each test and print results to console.
 */
function runTests() {
    var testingDiagrams = JSON.parse(fs.readFileSync("./tests.json"));
    var testingDiagramsSuccess = JSON.parse(fs.readFileSync("./testSolutions.json"));

    console.log("\n~~~~~~~~~~~~~~~~~~~~\nBegin Unit Testing\n~~~~~~~~~~~~~~~~~~~~\n");
    var successes = 0;
    var total = 0;

    // Valid Node Tests
    successes += nodeIsValid({
        "id": 0,
        "name": "Start",
        "type": "Start"
    }) ? 1 : 0;
    successes += nodeIsValid({
        "id": 1,
        "name": "A",
        "type": "HumanTask"
    }) ? 1 : 0;
    successes += nodeIsValid({
        "id": 3,
        "name": "G1",
        "type": "Gateway"
    }) ? 1 : 0;
    successes += nodeIsValid({
        "id": 8,
        "name": "End",
        "type": "End"
    }) ? 1 : 0;
    successes += nodeIsValid({
        "id": 2,
        "name": "B",
        "type": "ServiceTask"
    }) ? 0 : 1;
    successes += nodeIsValid({
        "id": 2,
        "name": "B",
        "type": "Test Type"
    }) ? 0 : 1;
    total += 6;

    // Next Node id from given id (edgeToIDWithFromID)
    successes += (edgeToIDWithFromID(2, testingDiagrams[0]) === 3) ? 1 : 0;
    total++;

    // Next valid Node id from given ID (non cached)
    // ** The function idNextValidNode is only called with nodes that are not valid
    successes += (idNextValidNode(1, testingDiagrams[0]) === 3) ? 1 : 0;
    successes += (idNextValidNode(1, testingDiagrams[2]) === 4) ? 1 : 0;
    successes += (idNextValidNode(4, testingDiagrams[3]) === 6) ? 1 : 0;
    successes += (idNextValidNode(5, testingDiagrams[3]) === 6) ? 1 : 0;
    total += 4;

    // Next valid Node id from given ID (cached)
    var cachedObj = {};
    for(var i = 0; i < testingDiagrams[0].nodes; i++) {
        cachedObj[testingDiagrams[0].nodes[i].id + ""] = testingDiagrams[0].nodes[i];
    }

    successes += (idNextValidNode(1, testingDiagrams[0], cachedObj) === 3) ? 1 : 0;
    total++;

    // Find Node (Ordered)
    successes += compareObject(findNode(1, testingDiagrams[0]), {
        id: 1,
        name: "A",
        type: "HumanTask"
    }) ? 1 : 0;
    successes += compareObject(findNode(20, testingDiagrams[0]), null);
    total += 2;

    // Find Node (Un-ordered)
    successes += compareObject(findNode(6, {nodes: [
        {
            id: 4,
            name: "Start",
            type: "Start"
        },
        {
            id: 5,
            name: "A",
            type: "HumanTask"
        },
        {
            id: 6,
            name: "B",
            type: "ServiceTask"
        },
        {
            id: 7,
            name: "End",
            type: "End"
        }
    ], edges: null}), {
        id: 6,
        name: "B",
        type: "ServiceTask"
    }) ? 1 : 0;
    total++;

    // Diagram tests
    successes += assertDiagramEquals(filterHumanTasks(testingDiagrams[0]), testingDiagramsSuccess[0]) ? 1 : 0;
    successes += assertDiagramEquals(filterHumanTasks(testingDiagrams[1]), testingDiagramsSuccess[1]) ? 1 : 0;
    successes += assertDiagramEquals(filterHumanTasks(testingDiagrams[2]), testingDiagramsSuccess[2]) ? 1 : 0;
    successes += assertDiagramEquals(filterHumanTasks(testingDiagrams[3]), testingDiagramsSuccess[3]) ? 1 : 0;
    total += 4;

    console.log("\nTests Passed: " + successes + "/" + total + "\n"+ ((successes/total) * 100) + "% of tests passed.");
}

// Generalized helper Functions //

/**
 * Checks if node is either a Start, HumanTask, Gateway, or End
 *
 * @param node Node to validate
 * @returns {boolean} False if Non-human task
 */
function nodeIsValid(node) {
    // Condense long boolean conditional to cases
    switch(node.type) {
        case nodeType.human:
        case nodeType.gateway:
        case nodeType.start:
        case nodeType.end:
            return true;

        default:
            return false;
    }
}

/**
 * Return index of the next non-service node from index given a NON-GATEWAY id.
 *
 * @param id ID of node to begin
 * @param diagram Diagram with edges to search
 * @param cached Optional, an object of nodes whose property is the ID
 */
function idNextValidNode(id, diagram, cached) {
    var nextId = edgeToIDWithFromID(id, diagram);
    while(nextId >= 0) {
        if ((cached && cached[nextId] && nodeIsValid(cached[nextId])) || nodeIsValid(findNode(nextId, diagram))) {
            return nextId;
        }

        nextId = edgeToIDWithFromID(nextId, diagram);
    }

    // If this is called, there was either an error reading the edges, or a path of edges does not lead to an "End" node
    console.log("Incomplete path error occurred: No end node in path. Starting ID: " + id);
}

/**
 * Looks for the first edge where the "from" property is equal to the id given and returns the "to" property.
 *
 * @param id Starting node ID
 * @param diagram Diagram with edges to follow
 * @returns {*} ID of next valid node, -1 if none are found
 */
function edgeToIDWithFromID(id, diagram) {
    // Can't guarantee that the next edge is after the current one
    for(var i = 0; i < diagram.edges.length; i++) {
        if(diagram.edges[i].from === id) {
            return diagram.edges[i].to;
        }
    }

    // If nothing is returned, find the id of the "End" node
    return -1;
}

/**
 * Searches for the node in case the id does not correspond to the array id
 *
 * @param id ID of the node to find
 * @param diagram Diagram to search
 * @returns {*} Node from ID
 */
function findNode(id, diagram) {
    if (!diagram.nodes[id] || diagram.nodes[id].id !== id) {
        // If the diagrams become large, consider writing more efficient search.
        for (var i = 0; i < diagram.nodes.length; i++) {
            if (diagram.nodes[i].id === id) return diagram.nodes[i];
        }
    } else {
        return diagram.nodes[id];
    }

    // Return coalesce-able value in the case that the node doesn't exist
    return null;
}

/**
 * Testing function to compare two diagrams.
 *
 * @param computedDiagram Diagram to check
 * @param successDiagram What diagram should be
 * @returns {boolean} True if computedDiagram is equal to successDiagram
 */
function assertDiagramEquals(computedDiagram, successDiagram) {
    if(computedDiagram.nodes.length !== successDiagram.nodes.length || computedDiagram.edges.length !== successDiagram.edges.length) return false;

    checkNodes:
    for(var i = 0; i < successDiagram.nodes.length; i++) {
        for(var j = 0; j < computedDiagram.nodes.length; j++) {
            if (compareObject(computedDiagram.nodes[j], successDiagram.nodes[i]))
                continue checkNodes;
        }
        return false;
    }

    checkEdges:
    for(i = 0; i < successDiagram.edges.length; i++) {
        for(j = 0; j < computedDiagram.edges.length; j++) {
            if(compareObject(computedDiagram.edges[j], successDiagram.edges[i]))
                continue checkEdges;
        }
        return false;
    }

    return true;
}

/**
 * Helper function for assertDiagramEquals to compare objects.
 *
 * @param obj1
 * @param obj2
 * @returns {boolean} True if similar objects.
 */
function compareObject(obj1, obj2) {
    if(!obj1 && !obj2) return true;
    else if (!obj1 || !obj2) return false;

    for(var property in obj1) {
        if(obj1.hasOwnProperty(property) && obj2.hasOwnProperty(property)) {
            if(obj1[property] !== obj2[property]) return false;
        }
    }

    return true;
}