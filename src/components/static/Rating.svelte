<script>
    export let avgRating;
    export let ratingColor = "";
    export let textSize = "text-2xl";

    if (avgRating >= 0 && avgRating < 50) {
        ratingColor = "bg-red-600";
    } else if (avgRating >= 50 && avgRating < 70) {
        ratingColor = "bg-yellow-400";
    } else if (avgRating >= 70 && avgRating <= 100) {
        ratingColor = "bg-green-600";
    }
</script>

<p class="pb-1 {textSize} text-center">{Math.round(avgRating)}</p>
<div class="w-full bg-gray-200 h-1">
    <div class="h-1 {ratingColor}" style="width: {Math.round(avgRating)}%"></div>
</div>

<style>
    
</style>