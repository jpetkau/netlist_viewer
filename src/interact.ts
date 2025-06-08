if (document.readyState == "complete")
    init_interact();
else
    window.addEventListener("load", (event) => {
        init_interact();
    });

let view = {
    zoom: Math.log(2),
    translate_x: 0,
    translate_y: 0,
}

//zoom in around CX
//left edge at TX



function zoom_around(dzoom: number, clientX: number, clientY: number) {
    // x,y = graph coords of pivot
    let scale = Math.exp(view.zoom);
    let x = (clientX - view.translate_x) / scale;
    let y = (clientY - view.translate_y) / scale;
    view.zoom += dzoom;
    scale = Math.exp(view.zoom);
    view.translate_x = clientX - x * scale;
    view.translate_y = clientY - y * scale;
    document.getElementById("view")!.setAttribute("transform", `translate(${view.translate_x}, ${view.translate_y}) scale(${scale})`);
}

function init_interact() {
    addEventListener("wheel", (event) => {
        let dzoom = -event.deltaY / 100;
        console.log(`wheel clientXY = ${event.clientX} ${event.clientY}`);
        if (dzoom > 0)
            zoom_around(dzoom, event.clientX, event.clientY);
        else {
            let model_el = document.getElementById("model")!;
            let w = model_el.clientWidth;
            let h = model_el.clientHeight;
            console.log(`view wh = ${w} ${h}`);
            zoom_around(dzoom, w / 2, h / 2);
        }
    });
}
