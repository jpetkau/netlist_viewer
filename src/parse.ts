/*
# comment

# reg TYPE name
reg FDRE toysoc/soc_bram_writer_req_fifo/data1_reg_reg[74]

# comb TYPE name
comb LUT6 toysoc/soc_bram_writer_req_fifo/data0_reg[112]_i_1__6

# net oport iport iport ...
# ports are cell-name/port-name
net toysoc/soc_dm_dmi_req_fifo/D_OUT[28]_i_2/O toysoc/soc_dm_dmi_req_fifo/D_OUT[28]_i_1__1/I0
*/
type PCell = {
    kind: "reg" | "comb";
    op: string;
    name: string;
}

type PortRef = {
    cell: PCell;
    port: string;
}

type Net = {
    /// ports[0] is upstream, rest are downstream. Last path component of
    /// a port name is the port number.
    ports: PortRef[];
}

type Netlist = {
    cells: Map<string, PCell>;
    nets: Net[];
}

function split_port_path(path: string): [string, string] {
    let i = path.lastIndexOf("/");
    if (i == -1) {
        throw new Error(`Invalid port path: ${path}`);
    }
    return [path.substring(0, i), path.substring(i + 1)];
}

function parse_line(netlist: Netlist, line: string) {
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
        let net: Net = { ports: [] };
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

async function load_netlist(url: string): Promise<Netlist> {
    let netlist: Netlist = { cells: new Map<string, PCell>(), nets: [] };

    let response = await fetch(url);
    let body = await response.body;
    if (!body) {
        throw new Error(`No response body from ${url}`);
    }
    let reader = body.getReader();
    let text = "";
    let decoder = new TextDecoder("utf-8");

    for (; ;) {
        let { done, value } = await reader.read();
        if (done) {
            parse_line(netlist, text);
            break;
        }
        text += decoder.decode(value);
        let lines = text.split("\n");
        text = lines.pop() ?? "";
        for (let line of lines) {
            parse_line(netlist, line);
        }
    }
    console.log("Netlist loaded");
    return netlist;
}

function to_graph(netlist: Netlist) {
    let graph = new Graph();
    let name_to_cell_l = new Map<string, Cell>();
    let name_to_cell_r = new Map<string, Cell>();

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
        let src = name_to_cell_l.get(net.ports[0].cell.name)!;
        for (let i = 1; i < net.ports.length; ++i) {
            let dst = name_to_cell_r.get(net.ports[i].cell.name)!;
            graph.insert_link(src, dst);
        }
    }
    return graph;
}
