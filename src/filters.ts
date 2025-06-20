function show_upstream_cells(graph: Graph, cell: Cell) {
    let open = new Set<Cell>([cell]);
    while (open.size > 0) {
        let current = open.values().next().value!;
        graph.make_visible(current);
        open.delete(current);
        for (let link of current.in_links) {
            open.add(link.dst);
        }
    }
}

function show_downstream_cells(graph: Graph, cell: Cell) {
    let open = new Set<Cell>([cell]);
    while (open.size > 0) {
        let current = open.values().next().value!;
        graph.make_visible(current);
        open.delete(current);
        for (let link of current.out_links) {
            open.add(link.dst);
        }
    }
}

function show_path(graph: Graph, path: Cell[]) {
    for (let cell of path) {
        show_upstream_cells(graph, cell);
        show_downstream_cells(graph, cell);
    }
}
