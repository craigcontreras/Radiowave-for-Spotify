<script>
    export let avgRating;
</script>

<p class="pb-1 text-2xl text-center">{Math.round(avgRating)}</p>
<div class="w-full bg-gray-200 h-1">
    <div class="bg-blue-600 h-1" style="width: {Math.round(avgRating)}%"></div>
</div>

<style>
    
</style>