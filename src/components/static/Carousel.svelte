<script>
    import { onMount } from "svelte";

    let container;
    let pos = { top: 0, left: 0, x: 0, y: 0, };

    onMount(() => {
        const mouseDownHandler = function (evt) {
            pos = {
                left: container.scrollLeft,
                top: container.scrollTop,

                x: evt.clientY,
                y: evt.clientY,
            }

            container.classList.remove("cursor-grab");
            container.classList.add("cursor-grabbing");
            container.classList.remove("select-all");
            container.classList.add("select-none");

            document.addEventListener("mousemove", mouseMoveHandler);
            document.addEventListener("mouseup", mouseUpHandler);
        }

        const mouseUpHandler = (evt) => {
            container.classList.add("cursor-grab");
            container.classList.remove("cursor-grabbing");
            container.classList.add("select-all");
            container.classList.remove("select-none");

            document.removeEventListener("mousemove", mouseMoveHandler);
            document.removeEventListener("mouseup", mouseUpHandler);
        }

        const mouseMoveHandler = (evt) => {
            const dx = evt.clientX - pos.x;
            const dy = evt.clientY - pos.y;

            container.scrollTop = pos.top - dy;
            container.scrollLeft = pos.left - dx;
        }

        container.addEventListener("mousedown", mouseDownHandler);
    })
</script>

<div bind:this={container} class="cursor-grab w-full h-fit whitespace-nowrap overflow-x-auto fade-in-left-right">
    <slot name="items"/>    
</div>

<style>
    div {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    div::-webkit-scrollbar {
        display: none;
    }

    .fade-in-left-right {
        mask-image: linear-gradient(transparent, black 20%, black 80%, transparent 100%);
        -webkit-mask-image: linear-gradient( to right,transparent, black 20%, black 80%, transparent 100%);
    }
</style>