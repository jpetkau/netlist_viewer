flat version:

    instance name type [inputs] [outputs]
    wire name // short for instance name wire [i] [o]

some built-in shapes for rendering:

    tuple - zero-width module for arranging wires
    wire - special rendering, just assigns a name
    not - inverter triangle-bubble
    and, or, xor, nand, nor, xnor

    other stuff rendered as a box

inverter:

    link input output : 8 - single bit
    link:8 input output - n bits wide

links:

    net inst1.port1 inst2.port2 [type=whatever]

prim name=FDRE in=[D,CE,R] out=[Q] clk=C
prim name=FDSE in=[D,CE,S] out=[Q] clk=C
prim name=LUT1 in=[I0] out=[O]
prim name=LUT3 in=[I0, I1, I2] out=[O]
prim name=LUT4 in=[I0, I1, I2, I3] out=[O]
prim name=LUT6 in=[I0, I1, I2, I3, I4, I5] out=[O5, O6]

inst name=reg0 type=FDRE
inst name=reg1 type=FDRE
inst name=reg2 type=FDRE
inst name=reg3 type=FDRE

inst name=lut1 type=LUT4
inst name=or1 type=OR

net [reg0.Q reg1.D lut1.I0]
net [reg1.Q reg2.D lut1.I1]
net [reg2.Q reg3.D lut1.I2]
net [reg3.Q OR.i0]
net [reg1.Q OR.i1]
net [or1.o reg0.D]


```ts
type PrimName = string & { readonly __tag: unique symbol };
type InstanceName = string & { readonly __tag: unique symbol };
type PortName = string & { readonly __tag: unique symbol };
type PortId = Number & { readonly __tag: unique symbol };

type Prim = {
    name: PrimName,
    in_ports: Array<PortName>,
    out_ports: Array<PortName>,
    clk_port: PortName | null,
}

type Instance = {
    name: InstanceName,
    prim: PrimName,
}

type PortInstance = {
    instance: InstanceName,
    port: PortName
}

type Net = {
    ports: Array<PortInstance>
}

type RawInput = {
    prims: Map<PrimName, Prim>;     // from library
    instances: Map<InstanceName, Instance>;
    nets: Array<Net>;
}

type Circuit = RawInput & {
    downstream: Map<PortId, Array<PortId>>;
    upstream: Map<PortId, PortId>;
    steps: Array<Array<InstanceName>>;
}

// Create a node for each instances, assign them each a depth
//
// Port indexing within a layer:
//   (i >> 16) gives the node index
//   (i & 0xffff) gives the port index within that node
function initial_layout(v: RawInput) {
    let nodes = Node[][];

    // links: for each layer, for each node, array of port index to next layer
    let out_links = number[][];

    // For each node_id, array of inputs to that node
    let in_links = number[][];

    // assign layers to nodes:
    // - scan through all the unassigned nodes
    // - if all inputs of a node are assigned, assign it to the next layer


    let depth = 0;
}
```
