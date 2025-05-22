"use strict";
function split_port_path(path) {
    let i = path.lastIndexOf("/");
    if (i == -1) {
        throw new Error(`Invalid port path: ${path}`);
    }
    return [path.substring(0, i), path.substring(i + 1)];
}
function parse_line(netlist, line) {
    let parts = line.split(" ");
    if (parts.length == 0 || parts[0].startsWith("#") || parts[0] == "") {
        return;
    }
    if (parts[0] == "reg") {
        netlist.cells.set(parts[2], { kind: "reg", op: parts[1], name: parts[2] });
    }
    else if (parts[0] == "comb") {
        netlist.cells.set(parts[2], { kind: "comb", op: parts[1], name: parts[2] });
    }
    else if (parts[0] == "net") {
        let net = { ports: [] };
        for (let i = 1; i < parts.length; ++i) {
            let [cell_name, port] = split_port_path(parts[i]);
            let cell = netlist.cells.get(cell_name);
            if (!cell) {
                throw new Error(`Unknown cell: ${cell_name}`);
            }
            net.ports.push({ cell, port });
        }
        netlist.nets.push(net);
    }
    else {
        throw new Error(`Unknown line format: ${line}`);
    }
}
async function load_netlist(url) {
    var _a;
    let netlist = { cells: new Map(), nets: [] };
    let response = await fetch(url);
    let body = await response.body;
    if (!body) {
        throw new Error(`No response body from ${url}`);
    }
    let reader = body.getReader();
    let text = "";
    let decoder = new TextDecoder("utf-8");
    for (;;) {
        let { done, value } = await reader.read();
        if (done) {
            parse_line(netlist, text);
            break;
        }
        text += decoder.decode(value);
        let lines = text.split("\n");
        text = (_a = lines.pop()) !== null && _a !== void 0 ? _a : "";
        for (let line of lines) {
            parse_line(netlist, line);
        }
    }
    console.log("Netlist loaded");
    return netlist;
}
function to_graph(netlist) {
    let graph = new Graph();
    let name_to_cell_l = new Map();
    let name_to_cell_r = new Map();
    for (let pcell of netlist.cells.values()) {
        if (pcell.kind == "reg") {
            // registers correspond to two cells, rendered at left
            // and right edges of graph.
            let cell1 = graph.insert_empty_cell(pcell.name, pcell.op);
            name_to_cell_l.set(pcell.name, cell1);
            let cell2 = graph.insert_empty_cell(pcell.name, pcell.op);
            name_to_cell_r.set(pcell.name, cell2);
        }
        else {
            let cell = graph.insert_empty_cell(pcell.name, pcell.op);
            name_to_cell_l.set(pcell.name, cell);
            name_to_cell_r.set(pcell.name, cell);
        }
    }
    for (let net of netlist.nets) {
        let src = name_to_cell_l.get(net.ports[0].cell.name);
        for (let i = 1; i < net.ports.length; ++i) {
            let dst = name_to_cell_r.get(net.ports[i].cell.name);
            graph.insert_link(src, dst);
        }
    }
    return graph;
}
//# sourceMappingURL=parse.js.map