"use strict";
/*
Model:

  Cell represent a box on the diagram somewhere. Cells have some mutable data
  (or an int id which indexes mutable data, depending on circumstances). Cells

  Placeholder cells represent where space is reserved for a wire to go past.

  Wires only connect one level to the next.
*/
const GRID_SIZE = 5;
const BLOCK_WIDTH = GRID_SIZE * 9;
const LAYER_WIDTH = 100 + BLOCK_WIDTH;
class Graph {
    constructor() {
        this.cells = [];
        this.links = [];
    }
    /// Check all the invariants a graph should have.
    validate() {
        let ilinks = new Set();
        let olinks = new Set();
        for (let i = 0; i < this.cells.length; ++i) {
            let cell = this.cells[i];
            if (cell.id != i) {
                throw new Error(`Cell ID mismatch: ${cell.id} != ${i}`);
            }
            for (let i = 0; i < cell.in_links.length; ++i) {
                let link = cell.in_links[i];
                ilinks.add(link);
                if (link.dst != cell)
                    throw new Error(`In link destination mismatch: ${link.dst.id} != ${cell.id}`);
                if (link.dst_port != i)
                    throw new Error(`In link port mismatch: ${link.dst_port} != ${i}`);
            }
            for (let i = 0; i < cell.out_links.length; ++i) {
                let link = cell.out_links[i];
                olinks.add(link);
                if (link.src != cell)
                    throw new Error(`Out link source mismatch: ${link.src.id} != ${cell.id}`);
                if (link.src_port != i)
                    throw new Error(`Out link port mismatch: ${link.src_port} != ${i}`);
            }
        }
        // make sure set of found links are consistent
        for (let link of this.links) {
            if (!ilinks.has(link) || !olinks.has(link)) {
                throw new Error(`Stray link in graph.links: ${link.src.id} -> ${link.dst.id}`);
            }
            ilinks.delete(link);
            olinks.delete(link);
        }
        if (ilinks.size != 0 || olinks.size != 0) {
            throw new Error(`Links missing from graph.links`);
        }
    }
    update_depth() {
        let ready = [];
        let needed = [];
        for (let cell of this.cells) {
            needed[cell.id] = cell.in_links.length;
            cell.depth = -1;
            if (cell.in_links.length == 0) {
                cell.depth = 0;
                ready.push(cell);
            }
        }
        for (let i = 0; i < ready.length; i++) {
            let cell = ready[i];
            for (let link of cell.out_links) {
                let dst = link.dst;
                if (dst.depth != -1)
                    throw new Error(`Cycle detected: ${i} -> ${dst.id}`);
                if (--needed[dst.id] == 0) {
                    dst.depth = cell.depth + 1;
                    ready.push(dst);
                }
            }
        }
    }
    insert_dummy_cells() {
        let next_id = this.cells.length;
        for (let link of [...this.links]) {
            while (link.src.depth + 1 < link.dst.depth) {
                let dummy = this.insert_empty_cell(null, "wire");
                dummy.depth = link.src.depth + 1;
                let link1 = {
                    src: link.src,
                    dst: dummy,
                    src_port: link.src_port,
                    dst_port: 0,
                    el: null
                };
                dummy.in_links.push(link1);
                link1.src.out_links[link1.src_port] = link1;
                dummy.out_links.push(link);
                link.src = dummy;
                link.src_port = 0;
                this.links.push(link1);
            }
        }
    }
    update_xy() {
        var _a;
        let height = [];
        for (let cell of this.cells) {
            let y = (_a = height[cell.depth]) !== null && _a !== void 0 ? _a : 0;
            cell.x = cell.depth * LAYER_WIDTH;
            cell.y = y;
            height[cell.depth] = y + (Math.max(cell.in_links.length, cell.out_links.length) + 1) * GRID_SIZE;
        }
    }
    /// insert a new link into the graph, creating a new port on both ends
    insert_link(src, dst) {
        if (this.cells[src.id] !== src) {
            throw new Error(`Source cell not in graph`);
        }
        if (this.cells[dst.id] !== dst) {
            throw new Error(`Dest cell not in graph`);
        }
        let link = {
            src,
            dst,
            src_port: src.out_links.length,
            dst_port: dst.in_links.length,
            el: null
        };
        src.out_links.push(link);
        dst.in_links.push(link);
        this.links.push(link);
    }
    /// insert a new empty cell into the graph
    insert_empty_cell(name, op) {
        let c = {
            name,
            op,
            id: this.cells.length,
            el: null,
            depth: -1,
            x: 0,
            y: 0,
            in_links: [],
            out_links: [],
        };
        this.cells.push(c);
        return c;
    }
}
function cell_html(cell) {
    let img = "nand";
    let h = Math.max(cell.in_links.length, cell.out_links.length);
    return `
<g class="block" transform="translate(${cell.x}, ${cell.y})">
  <rect class="block-box" width="${BLOCK_WIDTH}" height="${h * GRID_SIZE}" />
</g>`;
    // <image class="block-icon" href="block_icon_svgs/${img}" x="10" y="10" width="25" height="25" />
    //<text class="block-name" y="${BLOCK_WIDTH + 10}">${img}</text>
}
// Return the SVG path for a link from (x0,y0) to (x1,y1)
function link_svg_path(link) {
    let x0 = link.src.x + BLOCK_WIDTH;
    let y0 = link.src.y + (link.src_port + 0.5) * GRID_SIZE;
    let x1 = link.dst.x;
    let y1 = link.dst.y + (link.dst_port + 0.5) * GRID_SIZE;
    if (link.dst.name !== null) {
        // normal cell
        return `<path class="link" d="M${x0} ${y0} L${x1} ${y1}"/>`;
    }
    else {
        // draw wire through dummy cell, just draw as a wire
        return `<path class="link" d="M${x0} ${y0} L${x1} ${y1} H${x1 + BLOCK_WIDTH}"/>`;
    }
}
// Add SVG for a link between two nodes.
function add_graph_svg(graph) {
    let blocks_g = document.getElementById("blocks");
    if (!blocks_g)
        throw ReferenceError("blocks element not found");
    let links_g = document.getElementById("links");
    if (!links_g)
        throw ReferenceError("links element not found");
    for (let cell of graph.cells) {
        if (cell.name !== null) {
            blocks_g.insertAdjacentHTML("beforeend", cell_html(cell));
            cell.el = blocks_g.lastChild;
        }
    }
    for (let link of graph.links) {
        links_g.insertAdjacentHTML("beforeend", link_svg_path(link));
    }
}
function make_small_test_graph() {
    var _a, _b;
    let linkdata = [
        [0, 10], [0, 11], [0, 12],
        [1, 10], [1, 12], [1, 24],
    ];
    let c = []; // cells indexed by linkdata
    let graph = new Graph();
    for (let [src, dst] of linkdata) {
        let src_cell = c[src] = (_a = c[src]) !== null && _a !== void 0 ? _a : graph.insert_empty_cell("box", "nand");
        let dst_cell = c[dst] = (_b = c[dst]) !== null && _b !== void 0 ? _b : graph.insert_empty_cell("box", "nand");
        graph.insert_link(src_cell, dst_cell);
    }
    return graph;
}
function randint(n) {
    return Math.floor(Math.random() * n);
}
function make_big_test_graph() {
    const N_LAYERS = 5;
    const CELLS_PER_LAYER = 10;
    const N_LINKS = N_LAYERS * CELLS_PER_LAYER * 4;
    let layers = [];
    let graph = new Graph();
    for (let i = 0; i < N_LAYERS; ++i) {
        let layer = [];
        for (let j = 0; j < CELLS_PER_LAYER; ++j) {
            let c = graph.insert_empty_cell("box", "nand");
            c.depth = i; // set depth for use layer in this function
            layer.push(c);
        }
        layers.push(layer);
    }
    // make random links
    for (let i = 0; i < N_LINKS; ++i) {
        let c1 = graph.cells[randint(graph.cells.length)];
        let c2 = graph.cells[randint(graph.cells.length)];
        if (c1.depth == c2.depth) {
            continue;
        }
        if (c1.depth > c2.depth) {
            [c1, c2] = [c2, c1];
        }
        graph.insert_link(c1, c2);
    }
    return graph;
}
var graph;
function show_graph(graph) {
    console.log("Showing graph");
    graph.validate();
    graph.update_depth();
    console.log("Depth updated");
    graph.validate();
    graph.insert_dummy_cells();
    console.log("Dummy cells inserted");
    graph.validate();
    graph.update_xy();
    console.log("xy updated");
    graph.validate();
    add_graph_svg(graph);
    console.log("svg added");
}
async function init() {
    let netlist = await load_netlist("design_dump.txt");
    graph = to_graph(netlist);
    show_graph(graph);
}
//# sourceMappingURL=netlist.js.map