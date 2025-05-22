if (document.readyState == "complete") {
    init_interact();
}
else {
    window.addEventListener("load", (event) => {
        init_interact();
    });
}

let scale = 2;
function init_interact() {
    addEventListener("wheel", (event) => {
        scale *= Math.pow(1.1, -event.deltaY / 100);
        document.getElementById("view")!.setAttribute("transform", `scale(${scale})`);
    });
}
